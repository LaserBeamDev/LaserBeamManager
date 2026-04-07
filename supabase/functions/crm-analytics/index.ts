import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transactions, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sos un analista financiero experto para un negocio de grabado láser (LaserBeam). 
Analizás datos de transacciones (ingresos y egresos) y das insights accionables.

REGLAS:
- Respondé siempre en español argentino
- Usá formato de moneda argentina ($XXX.XXX)
- Sé conciso pero útil
- Cuando des proyecciones, explicá la metodología brevemente
- Si detectás anomalías o tendencias preocupantes, resaltalas con ⚠️
- Si hay tendencias positivas, resaltalas con ✅
- Usá emojis moderadamente para hacer el análisis más visual
- Formateá con markdown (headers, listas, negritas)
- Si no hay datos suficientes para una proyección confiable, decilo

DATOS DISPONIBLES: Las transacciones incluyen: fecha, tipo (Ingreso/Egreso), total, cliente, imputable, medio_pago, sku, unidades, estado, etapa, concepto (Seña/Saldo/Total).

Las transacciones con imputable que incluya "Ajuste" son transferencias internas y no deben contarse como ventas ni gastos reales.`;

    const dataContext = `Datos de transacciones (últimos registros):\n${JSON.stringify(transactions)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${dataContext}\n\nPregunta del usuario: ${question}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
