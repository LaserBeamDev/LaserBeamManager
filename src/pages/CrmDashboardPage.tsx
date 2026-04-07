import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2,
  CreditCard, ExternalLink, Clock, CheckCircle2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(amount * 100) / 100);

interface CobrosQuickData {
  total_cobrado: number;
  total_egresos: number;
  count_approved: number;
  count_pending: number;
  count_egresos: number;
  synced_at: string;
  error?: string;
}

export default function CrmDashboardPage() {
  const { stats, transactions, loading } = useCrm();
  const { accounts, callMpApi } = useMercadoPago();
  const [cobrosPerAccount, setCobrosPerAccount] = useState<Record<string, CobrosQuickData>>({});
  const [cobrosLoading, setCobrosLoading] = useState(false);

  const fetchAllAccountsCobros = useCallback(async () => {
    if (accounts.length === 0) return;
    setCobrosLoading(true);
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);

    const results: Record<string, CobrosQuickData> = {};
    await Promise.all(accounts.map(async (acc) => {
      try {
        const result: any = await callMpApi(acc.id, 'cobros', {
          date_from: from.toISOString().slice(0, 10),
          date_to: now.toISOString().slice(0, 10),
        });
        results[acc.id] = {
          total_cobrado: result.summary?.total_cobrado || 0,
          total_egresos: result.summary?.total_egresos || 0,
          count_approved: result.summary?.count_approved || 0,
          count_pending: result.summary?.count_pending || 0,
          count_egresos: result.summary?.count_egresos || 0,
          synced_at: result.synced_at,
        };
      } catch (err: any) {
        console.error(`Dashboard cobros error (${acc.nombre}):`, err);
        results[acc.id] = { total_cobrado: 0, total_egresos: 0, count_approved: 0, count_pending: 0, count_egresos: 0, synced_at: '', error: err.message };
      }
    }));
    setCobrosPerAccount(results);
    setCobrosLoading(false);
  }, [accounts, callMpApi]);

  useEffect(() => {
    if (accounts.length > 0) fetchAllAccountsCobros();
  }, [accounts.length]);

  const pendingProductionBalance = useMemo(() => {
    const orderMap = new Map<string, { totalOrden: number; totalAbonado: number }>();
    const activeIngresos = transactions.filter(
      t => t.tipo === 'Ingreso' && t.estado !== 'Cancelado' && t.etapa && t.etapa !== 'Completado'
    );
    activeIngresos.forEach(tx => {
      const key = tx.numero_orden || tx.id;
      const existing = orderMap.get(key);
      if (existing) {
        existing.totalAbonado += Number(tx.total);
      } else {
        orderMap.set(key, { totalOrden: Number(tx.total_orden) || 0, totalAbonado: Number(tx.total) });
      }
    });
    let totalPending = 0;
    let orderCount = 0;
    orderMap.forEach(({ totalOrden, totalAbonado }) => {
      const diff = totalOrden - totalAbonado;
      if (diff > 0) { totalPending += diff; orderCount++; }
    });
    return { totalPending: Math.round(totalPending * 100) / 100, orderCount };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const recentTxs = transactions.slice(0, 8);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<TrendingUp className="h-6 w-6" />} iconBg="bg-emerald-100 text-emerald-600" label="Ingresos (7 días)" value={`$${formatCurrency(stats.weeklyIncome)}`} valueColor="text-emerald-600" />
        <StatCard icon={<TrendingDown className="h-6 w-6" />} iconBg="bg-rose-100 text-rose-600" label="Egresos (7 días)" value={`$${formatCurrency(stats.weeklyExpense)}`} valueColor="text-rose-600" />
        <StatCard icon={<DollarSign className="h-6 w-6" />} iconBg="bg-blue-100 text-blue-600" label="Utilidad (7 días)" value={`$${formatCurrency(stats.weeklyBalance)}`} valueColor={stats.weeklyBalance >= 0 ? 'text-blue-600' : 'text-rose-600'} sub={`${stats.margin.toFixed(1)}% margen`} />
        <StatCard icon={<AlertTriangle className="h-6 w-6" />} iconBg="bg-rose-100 text-rose-600" label="Bajo Stock" value={String(stats.lowStockItems.length)} valueColor="text-rose-600" />
      </div>

      {/* Saldo Pendiente Producción + Cobros por cuenta */}
      <div className={`grid grid-cols-1 ${accounts.length > 0 ? 'md:grid-cols-' + Math.min(accounts.length + 1, 3) : ''} gap-5`}>
        {/* Saldo Pendiente Producción */}
        <div className="bg-white rounded-3xl border border-amber-200/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Saldo Pendiente Producción</p>
                <p className="text-2xl font-black font-mono text-amber-700">${formatCurrency(pendingProductionBalance.totalPending)}</p>
              </div>
            </div>
            <Link to="/crm/produccion" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Ver Kanban <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingProductionBalance.orderCount > 0
              ? `${pendingProductionBalance.orderCount} orden${pendingProductionBalance.orderCount > 1 ? 'es' : ''} con saldo pendiente de cobro`
              : 'No hay órdenes con saldo pendiente'}
          </p>
        </div>

        {/* Per-account Cobros MP cards */}
        {accounts.map(acc => {
          const d = cobrosPerAccount[acc.id];
          return (
            <div key={acc.id} className="bg-white rounded-3xl border border-emerald-200/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider truncate max-w-[180px]">{acc.nombre}</p>
                    {cobrosLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                    ) : d?.error ? (
                      <p className="text-sm text-muted-foreground mt-1">No disponible</p>
                    ) : d ? (
                      <p className="text-2xl font-black font-mono text-emerald-700">${formatCurrency(d.total_cobrado)}</p>
                    ) : null}
                  </div>
                </div>
                <Link to="/crm/cobros" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Ver detalle <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {d && !d.error && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {d.count_approved} cobros
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" /> {d.count_pending} pendientes
                  </span>
                  {d.total_egresos > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-rose-500" /> ${formatCurrency(d.total_egresos)} egresos
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PeriodCard title="Mes Actual" income={stats.monthlyIncome} expense={stats.monthlyExpense} />
        <PeriodCard title="Últimos 30 días" income={stats.last30Income} expense={stats.last30Expense} />
        <PeriodCard title="Total Histórico" income={stats.totalIncome} expense={stats.totalExpense} />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Ventas (Últimos 7 Días)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.last7Days} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(val: number) => `$${formatCurrency(val || 0)}`} />
              <Bar dataKey="income" name="Ingresos" fill="#34d399" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" name="Egresos" fill="#fb7185" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Últimos Movimientos</h3>
        {recentTxs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No hay movimientos recientes
          </div>
        ) : (
          <div className="space-y-1">
            {recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tx.tipo === 'Ingreso' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {tx.tipo === 'Ingreso' ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-rose-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{tx.detalle || tx.imputable || '—'}</p>
                    <p className="text-xs text-slate-400">{tx.fecha} • {tx.cliente || tx.proveedor || 'Varios'}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold font-mono ${tx.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.tipo === 'Ingreso' ? '+' : '-'}${formatCurrency(Number(tx.total))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock */}
      {stats.lowStockItems.length > 0 && (
        <div className="bg-rose-50/50 rounded-3xl border border-rose-200/60 p-6">
          <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Alertas de Stock
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.lowStockItems.map(item => (
              <span key={item.sku} className="px-3 py-1.5 bg-white/80 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {item.nombre}: {item.cantidad}/{item.minStock}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, valueColor, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; valueColor: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-black font-mono ${valueColor}`}>{value}</p>
          {sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ title, income, expense }: { title: string; income: number; expense: number }) {
  const balance = income - expense;
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{title}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-semibold">Ingresos</span>
          <span className="font-mono text-sm font-bold text-emerald-600">+${formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-semibold">Egresos</span>
          <span className="font-mono text-sm font-bold text-rose-600">-${formatCurrency(expense)}</span>
        </div>
        <div className="h-px bg-slate-100 my-1" />
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-600">Utilidad</span>
          <span className={`font-mono text-sm font-black ${balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>${formatCurrency(balance)}</span>
        </div>
      </div>
    </div>
  );
}
