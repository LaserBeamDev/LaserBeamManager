import { useState, useMemo } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { Loader2, Truck, MapPin, Package, Calendar, Check, Edit3, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MEDIOS_ENVIO } from '@/lib/crm-types';
import type { CrmTransaction } from '@/lib/crm-types';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(amount * 100) / 100);

function getDeliveryStatus(dateStr?: string | null) {
  if (!dateStr) return { color: 'border-slate-200', badge: 'bg-slate-100 text-slate-400', text: 'Sin fecha de entrega' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const delivery = new Date(dateStr);
  const diff = delivery.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { color: 'border-rose-300 bg-rose-50/40', badge: 'bg-rose-100 text-rose-700', text: `Vencido ${Math.abs(days)}d` };
  if (days === 0) return { color: 'border-rose-300 bg-rose-50/20', badge: 'bg-rose-100 text-rose-700', text: '¡Vence Hoy!' };
  if (days <= 2) return { color: 'border-amber-300 bg-amber-50/20', badge: 'bg-amber-100 text-amber-700', text: `Faltan ${days}d` };
  return { color: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: `Faltan ${days}d` };
}

function LogisticsCard({ tx, onEdit, onComplete }: { tx: CrmTransaction; onEdit: (tx: CrmTransaction) => void; onComplete: (tx: CrmTransaction) => void }) {
  const status = getDeliveryStatus(tx.fecha_entrega);
  const items = tx.items && tx.items.length > 0 ? tx.items : [{ sku: tx.sku, unidades: tx.unidades }];

  return (
    <div className={`bg-white rounded-3xl border-2 ${status.color} p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase">{tx.numero_orden}</p>
          <p className="text-base font-bold text-slate-800">{tx.cliente}</p>
          {(tx as any).telefono_cliente && (
            <p className="text-xs text-slate-400 font-mono">{(tx as any).telefono_cliente}</p>
          )}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${status.badge}`}>
          {status.text}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {items.map((item: any, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
            <Package className="h-2.5 w-2.5" /> {item.sku}×{item.unidades}
          </span>
        ))}
      </div>

      <div className="space-y-1.5 mb-4 text-xs">
        {tx.medio_envio && (
          <div className="flex items-center gap-2 text-slate-500">
            <Truck className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold">{tx.medio_envio}</span>
          </div>
        )}
        {tx.tracking_number && (
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono font-bold">{tx.tracking_number}</span>
          </div>
        )}
        {tx.fecha_entrega && (
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            <span>Entrega: <strong>{tx.fecha_entrega}</strong></span>
          </div>
        )}
        {tx.fecha_despacho && (
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <span>Despacho: <strong>{tx.fecha_despacho}</strong></span>
          </div>
        )}
        <div className="text-slate-400">
          Monto: <span className="font-mono font-bold text-emerald-600">${formatCurrency(Number(tx.total))}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(tx)}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" /> Editar Envío
        </button>
        <button
          onClick={() => onComplete(tx)}
          className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Check className="h-3.5 w-3.5" /> Completar
        </button>
      </div>
    </div>
  );
}

export default function CrmLogisticaPage() {
  const { transactions, loading, updateTransaction } = useCrm();
  const { toast } = useToast();
  const [editingTx, setEditingTx] = useState<CrmTransaction | null>(null);
  const [search, setSearch] = useState('');

  const logisticsTxs = useMemo(() => {
    return transactions
      .filter(tx => tx.tipo === 'Ingreso' && tx.estado !== 'Cancelado' && tx.etapa === 'Logística')
      .sort((a, b) => {
        if (a.fecha_entrega && b.fecha_entrega) return new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime();
        if (a.fecha_entrega) return -1;
        return 1;
      });
  }, [transactions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logisticsTxs;
    const s = search.toLowerCase();
    return logisticsTxs.filter(tx =>
      tx.cliente.toLowerCase().includes(s) ||
      tx.numero_orden.toLowerCase().includes(s) ||
      ((tx as any).telefono_cliente || '').toLowerCase().includes(s) ||
      (tx.tracking_number || '').toLowerCase().includes(s) ||
      tx.sku.toLowerCase().includes(s)
    );
  }, [logisticsTxs, search]);

  const fabricaTxs = useMemo(() => filtered.filter(tx => tx.imputable === 'Venta Fábrica'), [filtered]);
  const personalizadosTxs = useMemo(() => filtered.filter(tx => tx.imputable !== 'Venta Fábrica'), [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTx) return;
    const f = new FormData(e.currentTarget);
    await updateTransaction(editingTx.id, {
      fecha_entrega: (f.get('fechaEntrega') as string) || null,
      medio_envio: f.get('medioEnvio') as string,
      tracking_number: f.get('trackingNumber') as string,
      fecha_despacho: (f.get('fechaDespacho') as string) || editingTx.fecha_despacho || new Date().toISOString().split('T')[0],
    } as any);
    toast({ title: 'Logística actualizada' });
  };

  const handleComplete = async (tx: CrmTransaction) => {
    await updateTransaction(tx.id, { etapa: 'Completado', estado: 'Completado' } as any);
    toast({ title: 'Pedido completado' });
  };

  const renderColumn = (title: string, txs: CrmTransaction[], emptyText: string, colorClass: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{title}</h2>
        <span className="text-xs font-bold text-slate-400">({txs.length})</span>
      </div>
      {txs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm text-center">
          <Truck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400 text-xs">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {txs.map(tx => (
            <LogisticsCard key={tx.id} tx={tx} onEdit={setEditingTx} onComplete={handleComplete} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Logística</h1>
            <p className="text-xs text-slate-400 font-semibold">{logisticsTxs.length} envíos en curso</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, OT, teléfono, tracking..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {renderColumn('Personalizados', personalizadosTxs, 'Sin envíos personalizados', 'bg-indigo-500')}
        {renderColumn('Fábrica', fabricaTxs, 'Sin envíos de fábrica', 'bg-emerald-500')}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Datos de Envío</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-xs text-slate-400">{editingTx.cliente} — {editingTx.numero_orden}</p>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Entrega</label>
                <input name="fechaEntrega" type="date" defaultValue={editingTx.fecha_entrega || ''} className="crm-input mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medio de Envío</label>
                <select name="medioEnvio" defaultValue={editingTx.medio_envio || ''} className="crm-input mt-1">
                  <option value="">Seleccionar...</option>
                  {MEDIOS_ENVIO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nro de Seguimiento</label>
                <input name="trackingNumber" defaultValue={editingTx.tracking_number || ''} className="crm-input mt-1" placeholder="Opcional" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Despacho</label>
                <input name="fechaDespacho" type="date" defaultValue={editingTx.fecha_despacho || new Date().toISOString().split('T')[0]} className="crm-input mt-1" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
                Guardar Envío
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
