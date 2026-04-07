import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  CrmProduct, CrmProductStock, CrmTransaction, CrmConfig,
  TransactionType, ConceptoType, EstadoType, EtapaProduccion,
  TransactionItem,
} from '@/lib/crm-types';

const CONFIRMED_STAGES: EtapaProduccion[] = ['Pedido Confirmado', 'Máquina/Producción', 'Logística', 'Completado'];

function isConfirmed(etapa?: EtapaProduccion | null) {
  if (!etapa) return true;
  return CONFIRMED_STAGES.includes(etapa);
}

function isInternalTransfer(imputable: string) {
  return imputable?.toLowerCase().includes('ajuste');
}

export function useCrm() {
  const { user } = useAuth();
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [stocks, setStocks] = useState<CrmProductStock[]>([]);
  const [transactions, setTransactions] = useState<CrmTransaction[]>([]);
  const [config, setConfig] = useState<CrmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const SEED_PRODUCTS = [
    { sku: 'VF1000CC', nombre: 'Vaso de aluminio de 1000cc litro', controla_stock: true },
    { sku: 'VF700CC', nombre: 'Vaso de aluminio de 700cc litro', controla_stock: true },
    { sku: 'VF500CC', nombre: 'Vaso de aluminio de 500cc litro', controla_stock: true },
    { sku: 'VT550CC', nombre: 'Vaso de aluminio de 550cc litro', controla_stock: true },
    { sku: 'MATS', nombre: 'Mate tipo Stanley', controla_stock: true },
    { sku: 'MATV', nombre: 'Mate tipo Vasito', controla_stock: true },
    { sku: 'BOMB01', nombre: 'Bombilla plana', controla_stock: true },
    { sku: 'LLAV01', nombre: 'Llavero destapador de aluminio', controla_stock: true },
    { sku: 'CVF1000', nombre: 'Caja Vaso fernetero 1000cc', controla_stock: false },
    { sku: 'CVF700', nombre: 'Caja Vaso fernetero 700cc', controla_stock: false },
    { sku: 'SERVICIO', nombre: 'Servicio de Grabado/Corte', controla_stock: false },
    { sku: 'OTROS', nombre: 'Otro Producto', controla_stock: false },
  ];

  const SEED_STOCKS = [
    { sku: 'VF1000CC', cantidad: 0, min_stock: 10 },
    { sku: 'VF700CC', cantidad: 0, min_stock: 10 },
    { sku: 'VF500CC', cantidad: 0, min_stock: 10 },
    { sku: 'VT550CC', cantidad: 0, min_stock: 10 },
    { sku: 'MATS', cantidad: 0, min_stock: 10 },
    { sku: 'MATV', cantidad: 0, min_stock: 10 },
    { sku: 'BOMB01', cantidad: 0, min_stock: 10 },
    { sku: 'LLAV01', cantidad: 0, min_stock: 10 },
  ];

  const seedInitialData = useCallback(async (userId: string) => {
    // Seed products
    const prodPayloads = SEED_PRODUCTS.map(p => ({ ...p, user_id: userId }));
    const { data: newProds } = await supabase.from('crm_products').insert(prodPayloads as any[]).select();

    // Seed stocks
    const stockPayloads = SEED_STOCKS.map(s => ({ ...s, user_id: userId }));
    const { data: newStocks } = await supabase.from('crm_product_stocks').insert(stockPayloads as any[]).select();

    // Seed config
    const { data: newCfg } = await supabase
      .from('crm_config')
      .upsert({ user_id: userId } as any, { onConflict: 'user_id' })
      .select()
      .single();

    return {
      products: (newProds || []) as unknown as CrmProduct[],
      stocks: (newStocks || []) as unknown as CrmProductStock[],
      config: newCfg as unknown as CrmConfig | null,
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [prodRes, stockRes, txRes, cfgRes] = await Promise.all([
        supabase.from('crm_products').select('*').order('sku'),
        supabase.from('crm_product_stocks').select('*'),
        supabase.from('crm_transactions').select('*').order('fecha', { ascending: false }),
        supabase.from('crm_config').select('*').limit(1).single(),
      ]);

      const hasProducts = prodRes.data && prodRes.data.length > 0;

      if (!hasProducts) {
        // First time — seed initial data (only one user seeds, others read via RLS)
        const seeded = await seedInitialData(user.id);
        setProducts(seeded.products);
        setStocks(seeded.stocks);
        setTransactions([]);
        if (seeded.config) setConfig(seeded.config);
      } else {
        // Deduplicate products by SKU (keep first occurrence)
        const uniqueProds: CrmProduct[] = [];
        const seenSkus = new Set<string>();
        for (const p of (prodRes.data as unknown as CrmProduct[])) {
          if (!seenSkus.has(p.sku)) {
            seenSkus.add(p.sku);
            uniqueProds.push(p);
          }
        }
        setProducts(uniqueProds);
        // Deduplicate stocks by SKU
        if (stockRes.data) {
          const uniqueStocks: CrmProductStock[] = [];
          const seenStockSkus = new Set<string>();
          for (const s of (stockRes.data as unknown as CrmProductStock[])) {
            if (!seenStockSkus.has(s.sku)) {
              seenStockSkus.add(s.sku);
              uniqueStocks.push(s);
            }
          }
          setStocks(uniqueStocks);
        }
        if (txRes.data) setTransactions(txRes.data as unknown as CrmTransaction[]);
        if (cfgRes.data) setConfig(cfgRes.data as unknown as CrmConfig);
      }
    } finally {
      setLoading(false);
    }
  }, [user, seedInitialData]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .limit(1);

      if (!active) return;

      if (error) {
        console.error('Role check error:', error.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin((data?.length ?? 0) > 0);
    };

    loadRole();
    return () => {
      active = false;
    };
  }, [user]);

  // Ensure config exists
  const ensureConfig = useCallback(async () => {
    if (!user || config) return config;
    const { data } = await supabase
      .from('crm_config')
      .upsert({ user_id: user.id } as any, { onConflict: 'user_id' })
      .select()
      .single();
    if (data) {
      const c = data as unknown as CrmConfig;
      setConfig(c);
      return c;
    }
    return null;
  }, [user, config]);

  // Products
  const addProduct = useCallback(async (sku: string, nombre: string, controlaStock: boolean) => {
    if (!user) return;
    const { data } = await supabase
      .from('crm_products')
      .insert({ user_id: user.id, sku, nombre, controla_stock: controlaStock } as any)
      .select()
      .single();
    if (data) {
      setProducts(prev => [...prev, data as unknown as CrmProduct]);
      if (controlaStock) {
        const { data: stockData } = await supabase
          .from('crm_product_stocks')
          .insert({ user_id: user.id, sku, cantidad: 0, min_stock: 10 } as any)
          .select()
          .single();
        if (stockData) setStocks(prev => [...prev, stockData as unknown as CrmProductStock]);
      }
    }
  }, [user]);

  const updateProduct = useCallback(async (id: string, updates: { sku?: string; nombre?: string; controla_stock?: boolean }) => {
    if (!user) return;
    const { data } = await supabase
      .from('crm_products')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (data) {
      setProducts(prev => prev.map(p => p.id === id ? data as unknown as CrmProduct : p));
    }
  }, [user]);

  // Stock update
  const updateStock = useCallback(async (sku: string, cantidad: number, minStock: number) => {
    if (!user) return;
    const { data } = await supabase
      .from('crm_product_stocks')
      .upsert({ user_id: user.id, sku, cantidad, min_stock: minStock } as any, { onConflict: 'user_id,sku' })
      .select()
      .single();
    if (data) {
      setStocks(prev => {
        const exists = prev.find(s => s.sku === sku);
        if (exists) return prev.map(s => s.sku === sku ? data as unknown as CrmProductStock : s);
        return [...prev, data as unknown as CrmProductStock];
      });
    }
  }, [user]);

  // Transactions
  const addTransaction = useCallback(async (tx: Partial<CrmTransaction>) => {
    if (!user) return;
    const payload = {
      ...tx,
      user_id: user.id,
      prioridad: tx.prioridad || Date.now(),
      etapa: tx.etapa || (tx.tipo === 'Ingreso' && !isInternalTransfer(tx.imputable || '')
        ? (tx.imputable === 'Venta Fábrica' ? 'Logística' : 'Pedido Confirmado')
        : null),
      numero_orden: tx.tipo === 'Egreso' ? '' : (tx.numero_orden || ''),
    };
    const { data } = await supabase
      .from('crm_transactions')
      .insert(payload as any)
      .select()
      .single();
    if (data) setTransactions(prev => [data as unknown as CrmTransaction, ...prev]);
  }, [user]);

  // Transfer between accounts (auto egreso + ingreso)
  const addTransfer = useCallback(async (params: {
    fecha: string;
    total: number;
    cuentaOrigen: string;
    vendedor?: string;
    detalle?: string;
  }) => {
    if (!user) return;
    const now = Date.now();
    const nota = `De ${params.cuentaOrigen} a Efectivo${params.detalle ? ' – ' + params.detalle : ''}`;

    const egresoPayload = {
      user_id: user.id,
      tipo: 'Egreso' as const,
      fecha: params.fecha,
      cuenta: 'Costos No Operativos',
      imputable: 'Ajuste Cuentas',
      total: params.total,
      concepto: 'Total' as const,
      medio_pago: params.cuentaOrigen,
      cliente: 'Transferencia Interna',
      vendedor: params.vendedor || '',
      detalle: nota,
      numero_orden: '',
      estado: 'Completado' as const,
      etapa: null,
      prioridad: now,
      sku: '',
      unidades: 1,
      total_orden: params.total,
    };
    const ingresoPayload = {
      user_id: user.id,
      tipo: 'Ingreso' as const,
      fecha: params.fecha,
      cuenta: 'Otros Ingresos',
      imputable: 'Ajuste Cuentas',
      total: params.total,
      concepto: 'Total' as const,
      medio_pago: 'Efectivo',
      cliente: 'Transferencia Interna',
      vendedor: params.vendedor || '',
      detalle: nota,
      numero_orden: '',
      estado: 'Completado' as const,
      etapa: null,
      prioridad: now + 1,
      sku: '',
      unidades: 1,
      total_orden: params.total,
    };

    const { data: d1 } = await supabase.from('crm_transactions').insert(egresoPayload as any).select().single();
    const { data: d2 } = await supabase.from('crm_transactions').insert(ingresoPayload as any).select().single();

    setTransactions(prev => {
      const next = [...prev];
      if (d2) next.unshift(d2 as unknown as CrmTransaction);
      if (d1) next.unshift(d1 as unknown as CrmTransaction);
      return next;
    });
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<CrmTransaction>) => {
    const { data } = await supabase
      .from('crm_transactions')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (data) setTransactions(prev => prev.map(t => t.id === id ? data as unknown as CrmTransaction : t));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await supabase.from('crm_transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const purgeCrmData = useCallback(async () => {
    if (!user) return { ok: false, error: 'No hay sesión activa.' };
    if (!isAdmin) return { ok: false, error: 'Solo administradores pueden borrar la base.' };

    const [txRes, stockRes, prodRes, cfgRes] = await Promise.all([
      supabase.from('crm_transactions').delete().eq('user_id', user.id),
      supabase.from('crm_product_stocks').delete().eq('user_id', user.id),
      supabase.from('crm_products').delete().eq('user_id', user.id),
      supabase.from('crm_config').delete().eq('user_id', user.id),
    ]);

    const error = txRes.error || stockRes.error || prodRes.error || cfgRes.error;
    if (error) {
      console.error('Purge CRM error:', error.message);
      return { ok: false, error: error.message };
    }

    setTransactions([]);
    setStocks([]);
    setProducts([]);
    setConfig(null);
    return { ok: true };
  }, [user, isAdmin]);

  // Config update
  const updateConfig = useCallback(async (updates: Partial<CrmConfig>) => {
    if (!user || !config) return;
    const { data } = await supabase
      .from('crm_config')
      .update(updates as any)
      .eq('id', config.id)
      .select()
      .single();
    if (data) setConfig(data as unknown as CrmConfig);
  }, [user, config]);

  // Bulk import transactions - insert in batches to avoid payload limits
  const importTransactions = useCallback(async (txs: Partial<CrmTransaction>[]) => {
    if (!user) return 0;
    let totalInserted = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
      const batch = txs.slice(i, i + BATCH_SIZE);
      const payloads = batch.map(tx => ({
        ...tx,
        user_id: user.id,
        prioridad: tx.prioridad || Date.now() + i,
        // Ensure required fields have valid values
        tipo: tx.tipo || 'Ingreso',
        // Clean up null/empty dates that would fail DB validation
        fecha_entrega: tx.fecha_entrega || null,
        fecha_despacho: tx.fecha_despacho || null,
      }));

      const { data, error } = await supabase
        .from('crm_transactions')
        .insert(payloads as any[])
        .select();

      if (error) {
        console.error('Import batch error:', error.message, 'Batch:', i, 'Sample payload:', payloads[0]);
      }
      if (data) {
        setTransactions(prev => [...(data as unknown as CrmTransaction[]), ...prev]);
        totalInserted += data.length;
      }
    }
    return totalInserted;
  }, [user]);

  const updateTransactionEtapa = useCallback(async (id: string, etapa: EtapaProduccion) => {
    await updateTransaction(id, { etapa, prioridad: Date.now() } as any);
  }, [updateTransaction]);

  // Computed stocks (base stock - confirmed sales)
  const currentStocks = useMemo(() => {
    const stockMap = new Map<string, { cantidad: number; minStock: number }>();

    stocks.forEach(s => stockMap.set(s.sku, { cantidad: s.cantidad, minStock: s.min_stock }));

    products.filter(p => p.controla_stock).forEach(p => {
      if (!stockMap.has(p.sku)) stockMap.set(p.sku, { cantidad: 0, minStock: 10 });
    });

    transactions.forEach(tx => {
      if (tx.tipo === 'Ingreso' && tx.estado !== 'Cancelado' && isConfirmed(tx.etapa)) {
        const items: TransactionItem[] = tx.items && tx.items.length > 0
          ? tx.items
          : [{ sku: tx.sku, unidades: tx.unidades }];
        items.forEach(item => {
          const cur = stockMap.get(item.sku);
          if (cur) stockMap.set(item.sku, { ...cur, cantidad: cur.cantidad - (item.unidades || 0) });
        });
      }
    });

    return Array.from(stockMap.entries()).map(([sku, data]) => ({
      sku,
      nombre: products.find(p => p.sku === sku)?.nombre || sku,
      cantidad: data.cantidad,
      minStock: data.minStock,
    })).filter(s => products.find(p => p.sku === s.sku && p.controla_stock));
  }, [transactions, stocks, products]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const validTxs = transactions.filter(t => t.estado !== 'Cancelado');

    const incomes = validTxs.filter(t => t.tipo === 'Ingreso' && isConfirmed(t.etapa) && !isInternalTransfer(t.imputable));
    const expenses = validTxs.filter(t => t.tipo === 'Egreso' && !isInternalTransfer(t.imputable));

    // For 7-day chart: exclude "Pendiente Cobro" payment method
    const incomesForChart = incomes.filter(t => t.medio_pago !== 'Pendiente Cobro');
    const expensesForChart = expenses.filter(t => t.medio_pago !== 'Pendiente Cobro');

    const sumTotal = (txs: CrmTransaction[]) => txs.reduce((acc, t) => acc + Number(t.total), 0);

    const isInPeriod = (fecha: string, days: number) => {
      // Parse as local date to avoid timezone shifts (e.g. "2025-04-01" → UTC = March 31 in UTC-3)
      const parts = fecha.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return (todayLocal.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= days;
    };

    const isCurrentMonth = (fecha: string) => {
      // Parse YYYY-MM-DD directly to avoid timezone issues
      const parts = fecha.split('-');
      const month = Number(parts[1]) - 1;
      const year = Number(parts[0]);
      return month === currentMonth && year === currentYear;
    };

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - (6 - i));
      // Build YYYY-MM-DD from local date to avoid timezone shift
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return {
        name: days[d.getDay()],
        date: dateStr,
        income: Math.round(sumTotal(incomesForChart.filter(t => t.fecha === dateStr)) * 100) / 100,
        expense: Math.round(sumTotal(expensesForChart.filter(t => t.fecha === dateStr)) * 100) / 100,
      };
    });

    const weeklyIncome = last7Days.reduce((a, d) => a + d.income, 0);
    const weeklyExpense = last7Days.reduce((a, d) => a + d.expense, 0);
    const monthlyIncome = Math.round(sumTotal(incomes.filter(t => isCurrentMonth(t.fecha))) * 100) / 100;
    const monthlyExpense = Math.round(sumTotal(expenses.filter(t => isCurrentMonth(t.fecha))) * 100) / 100;
    const last30Income = Math.round(sumTotal(incomes.filter(t => isInPeriod(t.fecha, 30))) * 100) / 100;
    const last30Expense = Math.round(sumTotal(expenses.filter(t => isInPeriod(t.fecha, 30))) * 100) / 100;

    return {
      weeklyIncome: Math.round(weeklyIncome * 100) / 100,
      weeklyExpense: Math.round(weeklyExpense * 100) / 100,
      weeklyBalance: Math.round((weeklyIncome - weeklyExpense) * 100) / 100,
      monthlyIncome,
      monthlyExpense,
      monthlyBalance: Math.round((monthlyIncome - monthlyExpense) * 100) / 100,
      last30Income,
      last30Expense,
      last30Balance: Math.round((last30Income - last30Expense) * 100) / 100,
      totalIncome: Math.round(sumTotal(incomes) * 100) / 100,
      totalExpense: Math.round(sumTotal(expenses) * 100) / 100,
      margin: weeklyIncome > 0 ? Math.round(((weeklyIncome - weeklyExpense) / weeklyIncome) * 10000) / 100 : 0,
      lowStockItems: currentStocks.filter(s => s.cantidad <= s.minStock),
      last7Days,
    };
  }, [transactions, currentStocks]);

  const generateOrderNumber = useCallback(() => {
    let maxNum = 0;
    for (const tx of transactions) {
      const match = tx.numero_orden?.match(/^OT-(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `OT-${String(next).padStart(5, '0')}`;
  }, [transactions]);

  return {
    products, stocks, transactions, config, loading, currentStocks, stats,
    isAdmin,
    fetchAll, ensureConfig,
    addProduct, updateProduct, updateStock,
    addTransaction, addTransfer, updateTransaction, deleteTransaction, updateTransactionEtapa,
    purgeCrmData,
    updateConfig, importTransactions,
    generateOrderNumber,
  };
}
