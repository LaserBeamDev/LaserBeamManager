import { useState, useCallback, useEffect } from 'react';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  DollarSign, CheckCircle2, Clock, XCircle, RefreshCw, Download,
  AlertTriangle, ExternalLink, CreditCard, Loader2, Info, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MpPayment {
  id: number;
  date_created: string;
  date_approved: string | null;
  money_release_date: string | null;
  status: string;
  status_detail: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  currency: string;
  description: string;
  external_reference: string;
  payment_method: string;
  payment_type: string;
  payer_email: string;
  payer_name: string;
  installments: number;
  is_released: boolean;
  is_ingreso?: boolean;
}

interface CobrosData {
  user: { id: number; nickname: string; email: string } | null;
  summary: {
    total_cobrado: number;
    total_neto: number;
    total_comisiones: number;
    total_liberado: number;
    total_pendiente_liberacion: number;
    total_egresos: number;
    liberado_disponible: boolean;
    count_approved: number;
    count_pending: number;
    count_rejected: number;
    count_egresos: number;
    total_payments: number;
  };
  payments: MpPayment[];
  synced_at: string;
}

type DatePreset = 'today' | '7days' | '30days' | 'this_month' | 'custom';
type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';
type TipoFilter = 'all' | 'cobros' | 'egresos';

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);
  switch (preset) {
    case 'today': return { from: today, to: today };
    case '7days': { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: fmt(d), to: today }; }
    case '30days': { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: fmt(d), to: today }; }
    case 'this_month': { const first = new Date(now.getFullYear(), now.getMonth(), 1); return { from: fmt(first), to: today }; }
    default: return { from: '', to: '' };
  }
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  in_process: { label: 'En proceso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  authorized: { label: 'Autorizado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info },
  rejected: { label: 'Rechazado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
  refunded: { label: 'Devuelto', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: XCircle },
  charged_back: { label: 'Contracargo', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function extractPresupuestoRef(ref: string): string | null {
  if (!ref) return null;
  const match = ref.match(/P#(\d+)/i) || ref.match(/presupuesto[- ]?(\d+)/i);
  return match ? match[1] : null;
}

const INGRESO_DESCRIPTIONS = [
  "transferencia recibida",
  "rendimientos",
  "liquidación de dinero",
  "devolución de dinero",
];

function isCobro(p: MpPayment) {
  if (p.is_ingreso !== undefined) return p.is_ingreso;
  if (p.payment_type === 'bank_transfer') return true;
  const descLower = (p.description || '').toLowerCase();
  if (INGRESO_DESCRIPTIONS.some(d => descLower.includes(d))) return true;
  if (p.amount > 0 && (descLower.includes('cobro') || descLower.includes('acreditación') || descLower.includes('ingreso'))) return true;
  return false;
}

function exportToCsv(payments: MpPayment[]) {
  const headers = ['Fecha', 'Tipo', 'Estado', 'Monto', 'Neto', 'Comisión', 'Descripción', 'Referencia', 'ID Pago', 'Medio', 'Pagador'];
  const rows = payments.map(p => [
    formatDate(p.date_created),
    isCobro(p) ? 'Cobro' : 'Egreso',
    STATUS_MAP[p.status]?.label || p.status,
    p.amount, p.net_amount, p.fee_amount,
    `"${p.description.replace(/"/g, '""')}"`,
    p.external_reference, p.id, p.payment_method,
    p.payer_email || p.payer_name,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cobros-mp-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrmCobrosPage() {
  const { accounts, loading: accountsLoading, callMpApi } = useMercadoPago();
  const { toast } = useToast();

  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<CobrosData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const fetchCobros = useCallback(async () => {
    if (!selectedAccount) return;
    setFetching(true);
    setError(null);
    try {
      const range = datePreset === 'custom'
        ? { from: customFrom, to: customTo }
        : getDateRange(datePreset);
      const result = await callMpApi(selectedAccount, 'cobros', {
        date_from: range.from || undefined,
        date_to: range.to || undefined,
        status: statusFilter,
      });
      setData(result as CobrosData);
    } catch (err: any) {
      console.error('Error fetching cobros:', err);
      setError(err.message || 'Error al consultar cobros');
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }, [selectedAccount, datePreset, statusFilter, customFrom, customTo, callMpApi, toast]);

  useEffect(() => {
    if (selectedAccount && datePreset !== 'custom') {
      fetchCobros();
    }
  }, [selectedAccount, datePreset, statusFilter]);

  const selectedAccountName = accounts.find(a => a.id === selectedAccount)?.nombre || '';

  // Apply tipo filter on payments for table
  const filteredPayments = data?.payments?.filter(p => {
    if (tipoFilter === 'cobros') return isCobro(p);
    if (tipoFilter === 'egresos') return !isCobro(p);
    return true;
  }) || [];

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">No hay cuentas de Mercado Pago</h2>
        <p className="text-sm text-muted-foreground">
          Configurá una cuenta en{' '}
          <Link to="/crm/configuracion" className="text-primary underline">Configuración</Link>{' '}
          para ver los cobros.
        </p>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Cobros Mercado Pago</h1>
            <p className="text-xs text-muted-foreground">
              {selectedAccountName && <span className="font-semibold">{selectedAccountName}</span>}
              {data?.synced_at && <> · Última sync: {formatDate(data.synced_at)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => filteredPayments.length && exportToCsv(filteredPayments)} disabled={!filteredPayments.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={fetchCobros} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${fetching ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Cuenta MP</label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Seleccionar cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Período</label>
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="custom">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {datePreset === 'custom' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Desde</label>
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Hasta</label>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
            </div>
            <Button size="sm" onClick={fetchCobros} disabled={fetching}>Buscar</Button>
          </>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Estado</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cobros">Cobros</SelectItem>
              <SelectItem value="egresos">Egresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Error al consultar cobros</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {fetching && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Summary Cards */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="border-emerald-200/60 bg-emerald-50/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-emerald-600 mb-1">Cobrado</p>
              <p className="text-lg font-black text-emerald-700">{formatCurrency(s.total_cobrado)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Neto: {formatCurrency(s.total_neto)}</p>
            </CardContent>
          </Card>

          <Card className="border-rose-200/60 bg-rose-50/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-rose-600 mb-1">Egresos</p>
              <p className="text-lg font-black text-rose-700">{formatCurrency(s.total_egresos || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.count_egresos || 0} movimientos</p>
            </CardContent>
          </Card>

          <Card className={`${s.liberado_disponible ? 'border-blue-200/60 bg-blue-50/30' : 'border-slate-200/60 bg-slate-50/30'}`}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-blue-600 mb-1">Liberado</p>
              <p className="text-lg font-black text-blue-700">{formatCurrency(s.total_liberado)}</p>
              {!s.liberado_disponible && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><Info className="h-3 w-3" /> Estimado</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200/60 bg-amber-50/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-amber-600 mb-1">Pend. liberar</p>
              <p className="text-lg font-black text-amber-700">{formatCurrency(s.total_pendiente_liberacion)}</p>
              {!s.liberado_disponible && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><Info className="h-3 w-3" /> Estimado</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-emerald-600 mb-1">Aprobados</p>
              <p className="text-2xl font-black text-emerald-700">{s.count_approved}</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-amber-600 mb-1">Pendientes</p>
              <p className="text-2xl font-black text-amber-700">{s.count_pending}</p>
            </CardContent>
          </Card>

          <Card className="border-rose-200/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-rose-600 mb-1">Rechazados</p>
              <p className="text-2xl font-black text-rose-700">{s.count_rejected}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {s && s.total_comisiones > 0 && (
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="h-3.5 w-3.5" /> Comisiones MP: {formatCurrency(s.total_comisiones)}
        </div>
      )}

      {s && !s.liberado_disponible && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            El monto liberado es una <strong>estimación</strong> basada en la fecha de liberación de cada pago.
            Solo se consideran <strong>transferencias bancarias</strong> como cobros (ingresos). El resto se clasifica como egresos de la cuenta.
          </span>
        </div>
      )}

      {/* Payments Table */}
      {data && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[60vh]" style={{ scrollbarGutter: 'stable' }}>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Neto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="whitespace-nowrap">ID Pago</TableHead>
                    <TableHead>Medio</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>Liberado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                        No se encontraron pagos para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map(p => {
                      const st = STATUS_MAP[p.status] || { label: p.status, color: 'bg-muted text-muted-foreground', icon: Info };
                      const presupuestoNum = extractPresupuestoRef(p.external_reference);
                      const esCobro = isCobro(p);

                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] border ${esCobro ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                              {esCobro ? <><ArrowDownLeft className="h-3 w-3 mr-1" />Cobro</> : <><ArrowUpRight className="h-3 w-3 mr-1" />Egreso</>}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(p.date_created)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${st.color} border`}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold text-sm whitespace-nowrap ${esCobro ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {esCobro ? '+' : '-'}{formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(p.net_amount)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{p.description || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {presupuestoNum ? (
                              <Link to={`/presupuestos/${presupuestoNum}`} className="text-primary hover:underline flex items-center gap-1">
                                P#{presupuestoNum} <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">{p.external_reference || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{p.id}</TableCell>
                          <TableCell className="text-xs capitalize">{p.payment_method?.replace(/_/g, ' ') || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{p.payer_name || p.payer_email || '-'}</TableCell>
                          <TableCell>
                            {p.is_released ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Sí</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
