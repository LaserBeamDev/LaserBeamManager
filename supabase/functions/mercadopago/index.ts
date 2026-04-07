import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_API = "https://api.mercadopago.com";

async function getAccountAndAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Unauthorized" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
  if (userError || !authUser) {
    throw { status: 401, message: "Unauthorized" };
  }

  return { userId: authUser.id, supabaseUrl, serviceRoleKey };
}

async function getAccount(supabaseUrl: string, serviceRoleKey: string, accountId: string, userId: string) {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: account, error } = await adminClient
    .from("crm_mp_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (error || !account) {
    throw { status: 404, message: "Cuenta no encontrada" };
  }
  if (!account.access_token) {
    throw { status: 400, message: "Access token no configurado" };
  }
  return { account, adminClient };
}

async function mpFetch(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options?.headers },
  });
  const data = await res.json();
  return { res, data };
}

// Fetch all payments with pagination (up to 200 for cobros)
async function fetchAllPayments(token: string, params: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  limit?: number;
}) {
  const { dateFrom, dateTo, status, limit = 200 } = params;
  const allResults: any[] = [];
  let offset = 0;
  const batchSize = 50;

  while (allResults.length < limit) {
    const searchParams = new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      offset: String(offset),
      limit: String(Math.min(batchSize, limit - allResults.length)),
    });
    if (dateFrom) searchParams.set("begin_date", `${dateFrom}T00:00:00.000-03:00`);
    if (dateTo) searchParams.set("end_date", `${dateTo}T23:59:59.999-03:00`);
    if (status && status !== "all") searchParams.set("status", status);

    const { res, data } = await mpFetch(
      `${MP_API}/v1/payments/search?${searchParams.toString()}`,
      token
    );

    if (!res.ok) {
      console.error(`Payments search error: ${res.status}`, JSON.stringify(data));
      break;
    }

    const results = data.results || [];
    allResults.push(...results);

    if (results.length < batchSize || allResults.length >= (data.paging?.total || 0)) {
      break;
    }
    offset += batchSize;
  }

  return allResults;
}

// Try to fetch released/settled money
async function fetchReleasedMoney(token: string, userId: number, dateFrom?: string, dateTo?: string) {
  // Try settlement reports endpoint
  const endpoints = [
    `${MP_API}/v1/payments/search?status=approved&release_status=released&sort=money_release_date&criteria=desc&limit=50`,
  ];

  if (dateFrom) {
    endpoints[0] += `&begin_date=${dateFrom}T00:00:00.000-03:00`;
  }
  if (dateTo) {
    endpoints[0] += `&end_date=${dateTo}T23:59:59.999-03:00`;
  }

  for (const url of endpoints) {
    try {
      const { res, data } = await mpFetch(url, token);
      if (res.ok && data.results) {
        return { available: true, results: data.results };
      }
    } catch (e) {
      console.log(`Released money endpoint failed: ${e}`);
    }
  }

  return { available: false, results: [] };
}

const INGRESO_DESCRIPTIONS = [
  "transferencia recibida",
  "rendimientos",
  "liquidación de dinero",
  "devolución de dinero",
];

const EGRESO_OPERATION_TYPES = [
  "money_transfer_out",
  "payout",
];

function isIngreso(p: {
  payment_type: string;
  description: string;
  amount: number;
  operation_type: string;
  collector_id: number | null;
  payer_id: number | null;
  mp_user_id: number | null;
}) {
  // Explicit egreso operation types
  if (EGRESO_OPERATION_TYPES.includes(p.operation_type)) return false;

  // Bank transfers received are always ingresos
  if (p.payment_type === "bank_transfer") return true;

  // Check description keywords for known ingresos
  const descLower = (p.description || "").toLowerCase();
  if (INGRESO_DESCRIPTIONS.some(d => descLower.includes(d))) return true;

  // For money_transfer: if WE are the payer, it's egreso; otherwise ingreso
  if (p.operation_type === "money_transfer") {
    if (p.mp_user_id) {
      // If payer is us → egreso (we sent money)
      if (p.payer_id === p.mp_user_id) return false;
      // If collector is us → ingreso
      if (p.collector_id === p.mp_user_id) return true;
    }
    // If payer is not us (null or different), assume ingreso (someone sent us money)
    // Because if WE were paying, our ID would appear as payer_id
    if (p.payer_id && p.mp_user_id && p.payer_id !== p.mp_user_id) return true;
    // Fallback for null payer + null collector: check if it's credit_card type (likely incoming)
    if (!p.payer_id && !p.collector_id) return true;
    return false;
  }

  // If we know the MP user, check if we are the collector (receiver)
  if (p.mp_user_id && p.collector_id) {
    if (p.collector_id === p.mp_user_id) return true;
    return false;
  }

  // operation_type: regular_payment where collector is not us = egreso (we paid someone)
  if (p.operation_type === "regular_payment") {
    if (p.mp_user_id && p.collector_id && p.collector_id !== p.mp_user_id) return false;
    // If no collector info but payer is us → egreso
    if (p.mp_user_id && p.payer_id === p.mp_user_id) return false;
    return true;
  }

  // Heuristic: positive amount with credit-like descriptions
  if (p.amount > 0 && (descLower.includes("cobro") || descLower.includes("acreditación") || descLower.includes("ingreso"))) return true;

  return false;
}

function mapPayment(p: any, mpUserId?: number | null) {
  const payerId = p.payer?.id || null;
  const mapped = {
    id: p.id,
    date_created: p.date_created,
    date_approved: p.date_approved,
    money_release_date: p.money_release_date,
    status: p.status,
    status_detail: p.status_detail,
    amount: p.transaction_amount || 0,
    net_amount: p.transaction_details?.net_received_amount || p.transaction_amount || 0,
    fee_amount: p.fee_details?.reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0,
    currency: p.currency_id || "ARS",
    description: p.description || p.additional_info?.items?.[0]?.title || "",
    external_reference: p.external_reference || "",
    payment_method: p.payment_method_id || "",
    payment_type: p.payment_type_id || "",
    operation_type: p.operation_type || "",
    payer_email: p.payer?.email || "",
    payer_name: p.payer?.first_name ? `${p.payer.first_name} ${p.payer.last_name || ""}`.trim() : "",
    payer_id: payerId,
    collector_id: p.collector?.id || null,
    installments: p.installments || 1,
    is_released: p.money_release_date ? true : false,
    is_ingreso: false,
  };
  mapped.is_ingreso = isIngreso({
    ...mapped,
    mp_user_id: mpUserId || null,
  });

  // Debug log with more data
  console.log(`Payment ${mapped.id}: type=${mapped.payment_type}, op=${mapped.operation_type}, desc="${mapped.description}", amount=${mapped.amount}, payer=${payerId}, collector=${mapped.collector_id}, mpUser=${mpUserId}, ref="${mapped.external_reference}", => ${mapped.is_ingreso ? 'INGRESO' : 'EGRESO'}`);

  return mapped;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supabaseUrl, serviceRoleKey } = await getAccountAndAuth(req);
    const body = await req.json();
    const { action, account_id, params } = body;

    const { account, adminClient } = await getAccount(supabaseUrl, serviceRoleKey, account_id, userId);
    const token = account.access_token;

    let result: any;

    switch (action) {
      case "cobros": {
        const { date_from, date_to, status: filterStatus } = params || {};

        // 1. Get user info
        const { res: userRes, data: userData } = await mpFetch(`${MP_API}/users/me`, token);
        const mpUser = userRes.ok ? { id: userData.id, nickname: userData.nickname, email: userData.email } : null;

        // 2. Fetch all payments (no status filter to get all for summary)
        const allPayments = await fetchAllPayments(token, {
          dateFrom: date_from,
          dateTo: date_to,
          limit: 200,
        });

        // 3. Try released money
        const released = await fetchReleasedMoney(token, mpUser?.id || 0, date_from, date_to);

        // 4. Calculate summaries
        const mapped = allPayments.map(p => mapPayment(p, mpUser?.id));

        // Classify using extended ingreso detection
        const cobros = mapped.filter(p => p.is_ingreso);
        const egresos = mapped.filter(p => !p.is_ingreso);

        const approvedCobros = cobros.filter(p => p.status === "approved");
        const pendingCobros = cobros.filter(p => p.status === "in_process" || p.status === "pending" || p.status === "authorized");
        const rejectedCobros = cobros.filter(p => p.status === "rejected" || p.status === "cancelled" || p.status === "refunded" || p.status === "charged_back");

        const approvedEgresos = egresos.filter(p => p.status === "approved");

        const totalCobrado = approvedCobros.reduce((s, p) => s + p.amount, 0);
        const totalNet = approvedCobros.reduce((s, p) => s + p.net_amount, 0);
        const totalFees = approvedCobros.reduce((s, p) => s + p.fee_amount, 0);
        const totalEgresos = approvedEgresos.reduce((s, p) => s + p.amount, 0);

        // Released calculation (only for cobros)
        let totalLiberado = 0;
        let totalPendienteLiberacion = 0;
        let liberadoDisponible = false;

        if (released.available && released.results.length > 0) {
          liberadoDisponible = true;
          const releasedPayments = released.results.map(p => mapPayment(p, mpUser?.id));
          const releasedCobros = releasedPayments.filter(p => p.is_ingreso);
          totalLiberado = releasedCobros.reduce((s, p) => s + p.net_amount, 0);
          totalPendienteLiberacion = totalNet - totalLiberado;
        } else {
          const releasedOnes = approvedCobros.filter(p => p.is_released);
          const pendingRelease = approvedCobros.filter(p => !p.is_released);
          totalLiberado = releasedOnes.reduce((s, p) => s + p.net_amount, 0);
          totalPendienteLiberacion = pendingRelease.reduce((s, p) => s + p.net_amount, 0);
          liberadoDisponible = false;
        }

        // 5. Filter for table display
        let tablePayments = mapped;
        if (filterStatus && filterStatus !== "all") {
          if (filterStatus === "approved") {
            tablePayments = mapped.filter(p => p.status === "approved");
          } else if (filterStatus === "pending") {
            tablePayments = mapped.filter(p => p.status === "in_process" || p.status === "pending" || p.status === "authorized");
          } else if (filterStatus === "rejected") {
            tablePayments = mapped.filter(p => p.status === "rejected" || p.status === "cancelled" || p.status === "refunded" || p.status === "charged_back");
          }
        }

        result = {
          user: mpUser,
          summary: {
            total_cobrado: totalCobrado,
            total_neto: totalNet,
            total_comisiones: totalFees,
            total_liberado: totalLiberado,
            total_pendiente_liberacion: totalPendienteLiberacion,
            total_egresos: totalEgresos,
            liberado_disponible: liberadoDisponible,
            count_approved: approvedCobros.length,
            count_pending: pendingCobros.length,
            count_rejected: rejectedCobros.length,
            count_egresos: approvedEgresos.length,
            total_payments: mapped.length,
          },
          payments: tablePayments,
          synced_at: new Date().toISOString(),
        };
        break;
      }

      case "verify": {
        const { res, data } = await mpFetch(`${MP_API}/users/me`, token);
        result = {
          valid: res.ok,
          user: res.ok ? { id: data.id, nickname: data.nickname, email: data.email } : null,
        };
        break;
      }

      case "transactions": {
        const { date_from, date_to, offset = 0, limit = 50 } = params || {};
        const searchParams = new URLSearchParams({
          sort: "date_created",
          criteria: "desc",
          offset: String(offset),
          limit: String(Math.min(limit, 50)),
        });
        if (date_from) searchParams.set("begin_date", date_from);
        if (date_to) searchParams.set("end_date", date_to);

        const { res, data } = await mpFetch(
          `${MP_API}/v1/payments/search?${searchParams.toString()}`,
          token
        );
        if (!res.ok) throw new Error(`MP API error: ${JSON.stringify(data)}`);
        result = data;
        break;
      }

      case "movements": {
        const { date_from, date_to, offset = 0, limit = 50 } = params || {};
        const searchParams = new URLSearchParams({
          offset: String(offset),
          limit: String(Math.min(limit, 50)),
        });
        if (date_from) searchParams.set("begin_date", `${date_from}T00:00:00.000-03:00`);
        if (date_to) searchParams.set("end_date", `${date_to}T23:59:59.999-03:00`);

        const { res, data } = await mpFetch(
          `${MP_API}/mercadopago_account/movements/search?${searchParams.toString()}`,
          token
        );
        if (!res.ok) throw new Error(`MP API error: ${JSON.stringify(data)}`);
        result = data;
        break;
      }

      case "create_preference": {
        const { title, quantity, unit_price, description, external_reference } = params || {};
        const { res, data } = await mpFetch(`${MP_API}/checkout/preferences`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{
              title: title || "Producto",
              quantity: quantity || 1,
              unit_price: unit_price || 0,
              description: description || "",
              currency_id: "ARS",
            }],
            external_reference: external_reference || "",
            back_urls: {
              success: params?.success_url || "",
              failure: params?.failure_url || "",
              pending: params?.pending_url || "",
            },
          }),
        });
        if (!res.ok) throw new Error(`MP API error: ${JSON.stringify(data)}`);
        result = data;
        break;
      }

      case "balance": {
        // Get user info first
        const { res: userRes, data: userData } = await mpFetch(`${MP_API}/users/me`, token);
        if (!userRes.ok) throw new Error(`MP API error: ${JSON.stringify(userData)}`);

        // Log all top-level keys from /users/me to discover balance fields
        console.log(`/users/me keys: ${Object.keys(userData).join(', ')}`);
        // Log specific fields that might contain balance
        const balanceFields = ['balance', 'available_balance', 'money', 'account_balance', 'status'];
        for (const field of balanceFields) {
          if (userData[field] !== undefined) {
            console.log(`/users/me.${field}: ${JSON.stringify(userData[field])}`);
          }
        }

        const mpUser = { id: userData.id, nickname: userData.nickname, email: userData.email };

        // Try multiple balance endpoints in order of preference
        let balanceResult: any = null;
        let balanceSource = "unavailable";

        // 1. Try /users/me - sometimes has balance directly
        if (userData.balance !== undefined) {
          console.log(`Balance from /users/me:`, JSON.stringify(userData.balance));
          balanceResult = {
            available_balance: userData.balance?.available_balance ?? userData.balance ?? 0,
            unavailable_balance: userData.balance?.unavailable_balance ?? 0,
            total_amount: userData.balance?.total ?? userData.balance?.available_balance ?? userData.balance ?? 0,
          };
          balanceSource = "users_me";
        }

        // 2. Try /v1/account/balance
        if (!balanceResult) {
          const { res: balRes, data: balData } = await mpFetch(`${MP_API}/v1/account/balance`, token);
          console.log(`/v1/account/balance status=${balRes.status}`, JSON.stringify(balData));
          if (balRes.ok) {
            balanceResult = {
              available_balance: balData.available_balance ?? 0,
              unavailable_balance: balData.unavailable_balance ?? 0,
              total_amount: balData.total_amount ?? (balData.available_balance + (balData.unavailable_balance || 0)),
            };
            balanceSource = "account_balance";
          }
        }

        // 3. Try /mercadopago_account/balance
        if (!balanceResult) {
          const { res: balRes2, data: balData2 } = await mpFetch(`${MP_API}/mercadopago_account/balance`, token);
          console.log(`/mercadopago_account/balance status=${balRes2.status}`, JSON.stringify(balData2));
          if (balRes2.ok) {
            balanceResult = {
              available_balance: balData2.available_balance ?? balData2.balance ?? 0,
              unavailable_balance: balData2.unavailable_balance ?? 0,
              total_amount: balData2.total_amount ?? balData2.balance ?? 0,
            };
            balanceSource = "mercadopago_account_balance";
          }
        }

        // 4. Fallback: calculate from recent movements
        if (!balanceResult) {
          console.log("All balance endpoints failed, trying movements...");
          // Try to get account movements which show actual balance
          // movements requires date range - use last 90 days
          const movDateTo = new Date();
          const movDateFrom = new Date();
          movDateFrom.setDate(movDateFrom.getDate() - 90);
          const movParams = new URLSearchParams({
            limit: "1",
            offset: "0",
            begin_date: `${movDateFrom.toISOString().slice(0, 10)}T00:00:00.000-03:00`,
            end_date: `${movDateTo.toISOString().slice(0, 10)}T23:59:59.999-03:00`,
          });
          const { res: movRes, data: movData } = await mpFetch(
            `${MP_API}/mercadopago_account/movements/search?${movParams.toString()}`,
            token
          );
          console.log(`/movements/search status=${movRes.status}`, JSON.stringify(movData).slice(0, 1000));
          
          if (movRes.ok && movData.results?.length > 0) {
            // The most recent movement should have a balance field showing current balance
            const latestMovement = movData.results[0];
            console.log(`Latest movement keys: ${Object.keys(latestMovement).join(', ')}`);
            console.log(`Latest movement full: ${JSON.stringify(latestMovement).slice(0, 500)}`);
            if (latestMovement.balance !== undefined && latestMovement.balance !== null) {
              balanceResult = {
                available_balance: latestMovement.balance,
                unavailable_balance: 0,
                total_amount: latestMovement.balance,
              };
              balanceSource = "latest_movement_balance";
            }
          }
        }

        // 5. Last resort: calculate from payments
        if (!balanceResult) {
          const payments = await fetchAllPayments(token, { status: "approved", limit: 50 });
          const mapped = payments.map(p => mapPayment(p, userData.id));
          const avail = mapped.filter(p => p.is_released).reduce((s, p) => s + p.net_amount, 0);
          const unavail = mapped.filter(p => !p.is_released).reduce((s, p) => s + p.net_amount, 0);
          balanceResult = {
            available_balance: avail,
            unavailable_balance: unavail,
            total_amount: avail + unavail,
          };
          balanceSource = "calculated_from_payments";
        }

        result = {
          user: mpUser,
          balance: { ...balanceResult, source: balanceSource },
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update last_sync_at
    await adminClient
      .from("crm_mp_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account_id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("MercadoPago edge function error:", error);
    const status = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : (error as any)?.message || "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
