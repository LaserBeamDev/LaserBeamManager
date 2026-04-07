import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '@/hooks/useCrm';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Edit3, MessageSquare, Package, Plus, X, DollarSign, Info, Trash2, Pencil, FileText, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ETAPAS_PRODUCCION, MEDIOS_ENVIO, COLORES_PRODUCTO } from '@/lib/crm-types';
import ItemColorPicker from '@/components/ItemColorPicker';
import type { EtapaProduccion, CrmTransaction, ConceptoType, EstadoType } from '@/lib/crm-types';
import { toast } from 'sonner';
import ClientMatcher, { formatPhoneStandard } from '@/components/ClientMatcher';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(amount * 100) / 100);

function getDeliveryStatus(dateStr?: string | null) {
  if (!dateStr) return { color: 'border-slate-100', text: 'Sin fecha', urgency: 'none' as const };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(dateStr);
  const diff = delivery.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { color: 'border-rose-600 bg-rose-50/40', text: `Vencido ${Math.abs(days)}d`, urgency: 'high' as const };
  if (days === 0) return { color: 'border-rose-500 bg-rose-50/20', text: '¡Vence Hoy!', urgency: 'high' as const };
  if (days <= 2) return { color: 'border-amber-500 bg-amber-50/20', text: `Faltan ${days}d`, urgency: 'medium' as const };
  return { color: 'border-blue-500', text: `Faltan ${days}d`, urgency: 'low' as const };
}

const urgencyBadge: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
  none: 'bg-slate-100 text-slate-400',
};

/** Represents a grouped order: primary tx + all related payments */
interface OrderGroup {
  primary: CrmTransaction;
  payments: CrmTransaction[];
  totalAbonado: number;
}

/** Extract presupuesto number from detalle field */
function extractPresupuestoRef(detalle?: string): { num: string; id: string | null } | null {
  if (!detalle) return null;
  const match = detalle.match(/Presupuesto\s*#(\d+)/i);
  if (!match) return null;
  const idMatch = detalle.match(/\[pid:([^\]]+)\]/);
  return { num: match[1], id: idMatch ? idMatch[1] : null };
}

export default function CrmKanbanPage() {
  const navigate = useNavigate();
  const { transactions, products, config, loading, updateTransactionEtapa, addTransaction, updateTransaction, deleteTransaction, generateOrderNumber } = useCrm();
  const [notingTx, setNotingTx] = useState<CrmTransaction | null>(null);
  const [localNotes, setLocalNotes] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickClient, setQuickClient] = useState({ nombre: '', telefono: '' });
  const [quickItems, setQuickItems] = useState<{ sku: string; unidades: number; color: string }[]>([{ sku: '', unidades: 1, color: 'Negro' }]);
  const [quickImputable, setQuickImputable] = useState('Ventas LaserBeam');
  const [quickTotalOrden, setQuickTotalOrden] = useState(0);
  const [quickSena, setQuickSena] = useState({ enabled: false, total: 0, medio_pago: '' });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderGroup | null>(null);
  const [editForm, setEditForm] = useState<Partial<CrmTransaction>>({});
  const [editItems, setEditItems] = useState<{ sku: string; unidades: number; color: string }[]>([{ sku: '', unidades: 1, color: 'Negro' }]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ total: 0, concepto: 'Saldo' as ConceptoType, medio_pago: '' });
  const [editingPayment, setEditingPayment] = useState<{ id: string; total: number; concepto: ConceptoType; medio_pago: string } | null>(null);
  const [infoOrder, setInfoOrder] = useState<OrderGroup | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ group: OrderGroup; targetEtapa: EtapaProduccion } | null>(null);
  const [confirmForm, setConfirmForm] = useState({ total_orden: 0, total: 0, concepto: 'Seña' as ConceptoType, medio_pago: '', telefono_cliente: '' });
  // Separators: map of etapa -> array of { position (slot index), label, color }
  // position 0 = above first card, 1 = between card 0 and 1, etc.
  const SEPARATOR_COLORS = [
    { bg: 'bg-red-600', text: 'text-white', name: 'Rojo' },
    { bg: 'bg-yellow-600', text: 'text-white', name: 'Amarillo' },
    { bg: 'bg-green-600', text: 'text-white', name: 'Verde' },
    { bg: 'bg-purple-600', text: 'text-white', name: 'Violeta' },
    { bg: 'bg-blue-600', text: 'text-white', name: 'Azul' },
    { bg: 'bg-slate-700', text: 'text-white', name: 'Gris' },
  ];
  interface ColumnSeparator { position: number; label: string; colorIdx: number }
  const [columnSeparators, setColumnSeparators] = useState<Record<string, ColumnSeparator[]>>({});
  const [editingSeparator, setEditingSeparator] = useState<{ etapa: string; position: number } | null>(null);
  const [sepLabel, setSepLabel] = useState('');
  const [sepColorIdx, setSepColorIdx] = useState(0);
  const [draggingSep, setDraggingSep] = useState<{ etapa: string; position: number } | null>(null);
  const [kanbanSearch, setKanbanSearch] = useState('');

  // Group transactions by numero_orden for the Kanban
  const orderGroups = useMemo(() => {
    const productionTxs = transactions
      .filter(tx => tx.tipo === 'Ingreso' && tx.estado !== 'Cancelado' && !tx.imputable?.toLowerCase().includes('ajuste'));

    const groups = new Map<string, CrmTransaction[]>();
    for (const tx of productionTxs) {
      const key = tx.numero_orden || tx.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    const result: OrderGroup[] = [];
    for (const [, txs] of groups) {
      txs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const primary = txs[0];
      const totalAbonado = txs.reduce((sum, t) => sum + Number(t.total), 0);
      result.push({ primary, payments: txs, totalAbonado });
    }

    result.sort((a, b) => (a.primary.prioridad || 0) - (b.primary.prioridad || 0));
    return result;
  }, [transactions]);

  const filteredGroups = useMemo(() => {
    if (!kanbanSearch.trim()) return orderGroups;
    const q = kanbanSearch.toLowerCase();
    return orderGroups.filter(g => {
      const tx = g.primary;
      const items = tx.items || [];
      return (
        tx.numero_orden?.toLowerCase().includes(q) ||
        tx.cliente?.toLowerCase().includes(q) ||
        tx.telefono_cliente?.toLowerCase().includes(q) ||
        tx.sku?.toLowerCase().includes(q) ||
        tx.detalle?.toLowerCase().includes(q) ||
        tx.notas_produccion?.toLowerCase().includes(q) ||
        items.some((it: any) => it.sku?.toLowerCase().includes(q))
      );
    });
  }, [orderGroups, kanbanSearch]);

  const getByEtapa = (etapa: EtapaProduccion) =>
    filteredGroups.filter(g => (g.primary.etapa || 'Pedido Confirmado') === etapa);

  const handleMove = async (id: string, etapa: EtapaProduccion) => {
    // When moving to Completado, also set estado to Completado for all related txs
    if (etapa === 'Completado') {
      const group = orderGroups.find(g => g.primary.id === id);
      if (group) {
        for (const tx of group.payments) {
          await updateTransaction(tx.id, { etapa, estado: 'Completado', prioridad: Date.now() } as any);
        }
      } else {
        await updateTransaction(id, { etapa, estado: 'Completado', prioridad: Date.now() } as any);
      }
    } else {
      await updateTransactionEtapa(id, etapa);
    }
    toast.success(`Movido a ${etapa}`);
  };

  const handleAdvance = async (group: OrderGroup, idx: number) => {
    if (idx < ETAPAS_PRODUCCION.length - 1) {
      const targetEtapa = ETAPAS_PRODUCCION[idx + 1];
      const currentEtapa = ETAPAS_PRODUCCION[idx];
      // If moving from Potencial to Confirmado, open sale dialog
      if (currentEtapa === 'Pedido Potencial' && targetEtapa === 'Pedido Confirmado') {
        setConfirmDialog({ group, targetEtapa });
        setConfirmForm({ total_orden: Number(group.primary.total_orden) || 0, total: 0, concepto: 'Seña', medio_pago: '', telefono_cliente: group.primary.telefono_cliente || '' });
        return;
      }
      await handleMove(group.primary.id, targetEtapa);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetEtapa: EtapaProduccion) => {
    e.preventDefault();
    if (draggedId) {
      // Check if moving from Potencial to Confirmado
      const group = orderGroups.find(g => g.primary.id === draggedId);
      if (group && (group.primary.etapa || 'Pedido Confirmado') === 'Pedido Potencial' && targetEtapa === 'Pedido Confirmado') {
        setConfirmDialog({ group, targetEtapa });
        setConfirmForm({ total_orden: Number(group.primary.total_orden) || 0, total: 0, concepto: 'Seña', medio_pago: '', telefono_cliente: group.primary.telefono_cliente || '' });
        setDraggedId(null);
        return;
      }
      handleMove(draggedId, targetEtapa);
      setDraggedId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (notingTx) {
      await updateTransaction(notingTx.id, { notas_produccion: localNotes } as any);
      toast.success('Notas guardadas');
      setNotingTx(null);
    }
  };

  const openEdit = (group: OrderGroup) => {
    const tx = group.primary;
    setEditingOrder(group);
    setShowAddPayment(false);
    setNewPayment({ total: 0, concepto: 'Saldo', medio_pago: '' });
    const fallbackColor = tx.color_producto || 'Negro';
    const txItems = tx.items && tx.items.length > 0
      ? tx.items.map(i => ({ sku: i.sku, unidades: i.unidades, color: (i as any).color || fallbackColor }))
      : [{ sku: tx.sku, unidades: tx.unidades, color: fallbackColor }];
    setEditItems(txItems);
    setEditForm({
      cliente: tx.cliente,
      numero_orden: tx.numero_orden,
      fecha: tx.fecha,
      fecha_entrega: tx.fecha_entrega,
      total: tx.total,
      total_orden: tx.total_orden || 0,
      concepto: tx.concepto,
      estado: tx.estado,
      etapa: tx.etapa,
      medio_pago: tx.medio_pago,
      vendedor: tx.vendedor,
      detalle: tx.detalle,
      notas_produccion: tx.notas_produccion,
      medio_envio: tx.medio_envio,
      tracking_number: tx.tracking_number,
      proveedor: tx.proveedor,
      telefono_cliente: tx.telefono_cliente || '',
      color_producto: tx.color_producto || 'Negro',
    });
  };

  const handleSaveEdit = async () => {
    if (editingOrder) {
      const validItems = editItems.filter(i => i.sku && i.unidades > 0);
      const primarySku = validItems[0]?.sku || '';
      const totalUnidades = validItems.reduce((a, i) => a + i.unidades, 0) || 1;
      // CRITICAL: Exclude payment fields (total, concepto, medio_pago) from the save
      // as they are managed by the payment system and would overwrite payment changes
      const { total, concepto, medio_pago, ...safeEditForm } = editForm;
      await updateTransaction(editingOrder.primary.id, {
        ...safeEditForm,
        sku: primarySku,
        unidades: totalUnidades,
        items: validItems.length > 0 ? validItems : undefined,
      } as any);
      toast.success('Pedido actualizado');
    }
  };

  const handleCancelOrder = async () => {
    if (editingOrder) {
      for (const tx of editingOrder.payments) {
        await updateTransaction(tx.id, { estado: 'Cancelado' } as any);
      }
      toast.success('Pedido cancelado');
      setEditingOrder(null);
    }
  };

  const handleAddPayment = async () => {
    if (!editingOrder || newPayment.total <= 0) return;
    const primary = editingOrder.primary;
    const isPlaceholder =
      Number(primary.total) === 0 &&
      primary.medio_pago === 'Pendiente Cobro' &&
      editingOrder.payments.length === 1;

    if (isPlaceholder) {
      const updatedTotal = newPayment.total;
      const updatedConcepto = newPayment.concepto;
      const updatedMedio = newPayment.medio_pago || 'Efectivo';
      const updatedTotalOrden = editForm.total_orden || primary.total_orden || 0;

      await updateTransaction(primary.id, {
        total: updatedTotal,
        concepto: updatedConcepto,
        medio_pago: updatedMedio,
        total_orden: updatedTotalOrden,
      } as any);

      // Update local editingOrder state
      const updatedPrimary = { ...primary, total: updatedTotal, concepto: updatedConcepto, medio_pago: updatedMedio, total_orden: updatedTotalOrden };
      setEditingOrder({
        ...editingOrder,
        primary: updatedPrimary,
        payments: [updatedPrimary],
        totalAbonado: updatedTotal,
      });
    } else {
      // Instead of creating a new transaction, update the primary with the accumulated payment
      const newTotal = Number(primary.total) + newPayment.total;
      const totalOrden = editForm.total_orden || primary.total_orden || 0;
      const isPaidInFull = totalOrden > 0 && newTotal >= totalOrden;
      const updatedConcepto = isPaidInFull ? 'Total' as ConceptoType : newPayment.concepto;
      const updatedMedio = newPayment.medio_pago || primary.medio_pago;

      await updateTransaction(primary.id, {
        total: newTotal,
        concepto: updatedConcepto,
        medio_pago: updatedMedio,
        total_orden: totalOrden,
        estado: isPaidInFull ? 'Completado' as EstadoType : primary.estado,
      } as any);

      // Update local editingOrder state
      const updatedPrimary = {
        ...primary,
        total: newTotal,
        concepto: updatedConcepto,
        medio_pago: updatedMedio,
        total_orden: totalOrden,
        estado: isPaidInFull ? 'Completado' as EstadoType : primary.estado,
      };
      setEditingOrder({
        ...editingOrder,
        primary: updatedPrimary,
        payments: editingOrder.payments.map(p => p.id === primary.id ? updatedPrimary : p),
        totalAbonado: newTotal,
      });
    }
    toast.success('Pago registrado');
    setShowAddPayment(false);
    setNewPayment({ total: 0, concepto: 'Saldo', medio_pago: '' });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!editingOrder) return;
    // Don't allow deleting the primary (first) transaction — it anchors the card
    if (paymentId === editingOrder.primary.id) return;
    await deleteTransaction(paymentId);
    const remaining = editingOrder.payments.filter(p => p.id !== paymentId);
    const newAbonado = remaining.reduce((s, t) => s + Number(t.total), 0);
    setEditingOrder({ ...editingOrder, payments: remaining, totalAbonado: newAbonado });
    toast.success('Pago eliminado');
  };

  const handleSavePaymentEdit = async () => {
    if (!editingPayment) return;
    await updateTransaction(editingPayment.id, {
      total: editingPayment.total,
      concepto: editingPayment.concepto,
      medio_pago: editingPayment.medio_pago,
    } as any);
    // Update local editingOrder state to reflect changes
    if (editingOrder) {
      const updatedPayments = editingOrder.payments.map(p =>
        p.id === editingPayment.id ? { ...p, total: editingPayment.total, concepto: editingPayment.concepto, medio_pago: editingPayment.medio_pago } : p
      );
      const newAbonado = updatedPayments.reduce((s, t) => s + Number(t.total), 0);
      setEditingOrder({ ...editingOrder, payments: updatedPayments as CrmTransaction[], totalAbonado: newAbonado });
    }
    toast.success('Pago actualizado');
    setEditingPayment(null);
  };

  const handleQuickSena = () => {
    const totalOrden = editForm.total_orden || editingOrder?.primary.total_orden || 0;
    if (totalOrden > 0) {
      setNewPayment({ total: Math.round(totalOrden * 50) / 100, concepto: 'Seña', medio_pago: '' });
      setShowAddPayment(true);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const validItems = quickItems.filter(i => i.sku && i.unidades > 0);
    const totalUnidades = validItems.reduce((a, i) => a + i.unidades, 0);
    const primarySku = validItems[0]?.sku || 'VARIOS';
    const hasPayment = quickSena.enabled && quickSena.total > 0 && quickSena.medio_pago;
    await addTransaction({
      tipo: 'Ingreso',
      fecha: new Date().toISOString().slice(0, 10),
      fecha_entrega: (f.get('fechaEntrega') as string) || null,
      cuenta: 'Ventas',
      imputable: quickImputable,
      sku: primarySku,
      total: hasPayment ? quickSena.total : 0,
      total_orden: quickTotalOrden,
      concepto: hasPayment ? 'Seña' as ConceptoType : 'Seña' as ConceptoType,
      medio_pago: hasPayment ? quickSena.medio_pago : 'Pendiente Cobro',
      unidades: totalUnidades || 1,
      items: validItems.length > 0 ? validItems : [{ sku: primarySku, unidades: 1, color: 'Negro' }],
      cliente: quickClient.nombre,
      telefono_cliente: quickClient.telefono,
      vendedor: config?.vendors?.[0] || '',
      detalle: f.get('detalle') as string,
      numero_orden: generateOrderNumber(),
      etapa: 'Diseño Solicitado' as EtapaProduccion,
    });
    toast.success('Pedido creado');
    setQuickItems([{ sku: '', unidades: 1, color: 'Negro' }]);
    setQuickClient({ nombre: '', telefono: '' });
    setQuickImputable('Ventas LaserBeam');
    setQuickTotalOrden(0);
    setQuickSena({ enabled: false, total: 0, medio_pago: '' });
    setIsQuickAddOpen(false);
  };

  const handleConfirmSale = async () => {
    if (!confirmDialog) return;
    const { group, targetEtapa } = confirmDialog;
    const primary = group.primary;

    // Update total_orden and telefono if provided
    const updates: any = { total_orden: confirmForm.total_orden, telefono_cliente: confirmForm.telefono_cliente };
    if (confirmForm.total > 0 && confirmForm.medio_pago) {
      // If it's a placeholder, update in place
      const isPlaceholder = Number(primary.total) === 0 && primary.medio_pago === 'Pendiente Cobro';
      if (isPlaceholder) {
        updates.total = confirmForm.total;
        updates.concepto = confirmForm.concepto;
        updates.medio_pago = confirmForm.medio_pago;
      } else {
        // Add a new payment transaction
        await addTransaction({
          tipo: 'Ingreso',
          fecha: new Date().toISOString().slice(0, 10),
          cuenta: primary.cuenta || 'Ventas',
          imputable: primary.imputable || 'Ventas LaserBeam',
          sku: primary.sku,
          total: confirmForm.total,
          total_orden: confirmForm.total_orden,
          concepto: confirmForm.concepto,
          medio_pago: confirmForm.medio_pago,
          unidades: 0,
          items: [],
          cliente: primary.cliente,
          vendedor: primary.vendedor,
          detalle: `Pago vinculado a ${primary.numero_orden}`,
          numero_orden: primary.numero_orden,
          etapa: targetEtapa,
        });
      }
    }
    await updateTransaction(primary.id, updates);
    await updateTransactionEtapa(primary.id, targetEtapa);
    toast.success('Pedido confirmado');
    setConfirmDialog(null);
  };

  const addSeparator = (etapa: string, position: number) => {
    setColumnSeparators(prev => {
      const list = [...(prev[etapa] || [])];
      if (list.find(s => s.position === position)) return prev;
      list.push({ position, label: 'CATEGORÍA', colorIdx: 0 });
      return { ...prev, [etapa]: list };
    });
  };

  const removeSeparator = (etapa: string, position: number) => {
    setColumnSeparators(prev => {
      const list = (prev[etapa] || []).filter(s => s.position !== position);
      return { ...prev, [etapa]: list };
    });
  };

  const updateSeparator = (etapa: string, position: number, label: string, colorIdx: number) => {
    setColumnSeparators(prev => {
      const list = (prev[etapa] || []).map(s => s.position === position ? { ...s, label, colorIdx } : s);
      return { ...prev, [etapa]: list };
    });
  };

  const getSeparator = (etapa: string, position: number) =>
    (columnSeparators[etapa] || []).find(s => s.position === position);

  const moveSeparator = (etapa: string, fromPos: number, toPos: number) => {
    if (fromPos === toPos) return;
    setColumnSeparators(prev => {
      const list = (prev[etapa] || []).map(s => s.position === fromPos ? { ...s, position: toPos } : s);
      // If target already has a separator, remove the old one at target
      const filtered = list.filter((s, i) => {
        const dupes = list.filter(x => x.position === s.position);
        if (dupes.length > 1) return i === list.indexOf(dupes[dupes.length - 1]); // keep the moved one
        return true;
      });
      return { ...prev, [etapa]: filtered };
    });
    toast.success('Separador movido');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3">
        <h1 className="text-xl font-black text-slate-800 shrink-0">Producción</h1>
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por OT, cliente, teléfono, SKU..."
            value={kanbanSearch}
            onChange={e => setKanbanSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> Pedido Rápido
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
        {ETAPAS_PRODUCCION.map((etapa, etapaIdx) => {
          const cards = getByEtapa(etapa);
          return (
            <div
              key={etapa}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa)}
              className="flex-shrink-0 w-[340px] flex flex-col gap-4 bg-slate-100/40 p-5 rounded-[2.2rem] border border-slate-200/60"
              style={{ maxHeight: '100%' }}
            >
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{etapa}</h3>
                <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {cards.map((group, cardIdx) => {
                  const tx = group.primary;
                  const status = getDeliveryStatus(tx.fecha_entrega);
                  const items = tx.items && tx.items.length > 0
                    ? tx.items
                    : [{ sku: tx.sku, unidades: tx.unidades }];
                  const totalOrden = tx.total_orden || group.totalAbonado;
                  const paymentsCount = group.payments.length;

                  const renderSepSlot = (pos: number) => {
                    const sep = getSeparator(etapa, pos);
                    if (sep) {
                      return (
                        <div
                          className="flex items-center gap-1 -my-0.5"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingSep({ etapa, position: pos });
                            e.dataTransfer.setData('text/plain', `sep:${pos}`);
                          }}
                          onDragEnd={() => setDraggingSep(null)}
                        >
                          <button
                            onClick={() => {
                              setEditingSeparator({ etapa, position: pos });
                              setSepLabel(sep.label);
                              setSepColorIdx(sep.colorIdx);
                            }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wide text-center cursor-grab active:cursor-grabbing transition-all ${SEPARATOR_COLORS[sep.colorIdx].bg} ${SEPARATOR_COLORS[sep.colorIdx].text}`}
                          >
                            ⠿ {sep.label}
                          </button>
                          <button
                            onClick={() => removeSeparator(etapa, pos)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div
                        className="flex items-center -my-1 group/sep"
                        onDragOver={(e) => {
                          if (draggingSep) { e.preventDefault(); e.currentTarget.classList.add('bg-indigo-100', 'rounded-lg'); }
                        }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('bg-indigo-100', 'rounded-lg'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-indigo-100', 'rounded-lg');
                          if (draggingSep && draggingSep.etapa === etapa) {
                            moveSeparator(etapa, draggingSep.position, pos);
                            setDraggingSep(null);
                          }
                        }}
                      >
                        <button
                          onClick={() => addSeparator(etapa, pos)}
                          className="flex-1 flex items-center justify-center gap-1 py-0.5 rounded-lg text-[9px] font-bold opacity-0 group-hover/sep:opacity-60 hover:!opacity-100 text-slate-400 transition-all"
                        >
                          <Plus className="h-3 w-3" /> Separador
                        </button>
                      </div>
                    );
                  };

                  return (
                    <React.Fragment key={tx.id}>
                      {renderSepSlot(cardIdx)}
                    <div
                      key={tx.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tx.id)}
                      className={`bg-white p-4 rounded-3xl shadow-sm border-l-[5px] ${status.color} ${
                        draggedId === tx.id ? 'opacity-40 scale-95' : 'opacity-100'
                      } hover:shadow-lg transition-all group relative cursor-grab active:cursor-grabbing`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-black text-indigo-500 uppercase">{tx.numero_orden}</p>
                            {(() => { const pRef = extractPresupuestoRef(tx.detalle); return pRef ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/presupuestos/${pRef.id || pRef.num}`); }}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded-full transition-colors"
                                title={`Abrir Presupuesto #${pRef.num}`}
                              >
                                <FileText className="h-2.5 w-2.5" />P#{pRef.num}
                              </button>
                            ) : null; })()}
                          </div>
                          <p className="text-sm font-bold text-slate-800">{tx.cliente}</p>
                          {tx.telefono_cliente && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" />{tx.telefono_cliente}
                            </p>
                          )}
                        </div>
                        {/* Payment summary badge */}
                        <div className="text-right">
                          {totalOrden > 0 && (
                            <p className="text-xs font-black text-slate-700">${formatCurrency(totalOrden)}</p>
                          )}
                          {(() => {
                            const onlyHasSena = group.payments.every(p => p.concepto === 'Seña');
                            const hasAnySena = group.payments.some(p => p.concepto === 'Seña');
                            if (totalOrden > 0 && group.totalAbonado >= totalOrden && !onlyHasSena) {
                              return <p className="text-[10px] font-bold text-emerald-600">100% cobrado</p>;
                            }
                            if (totalOrden > 0) {
                              const pct = Math.round((group.totalAbonado / totalOrden) * 100);
                              return (
                                <>
                                  <p className="text-[10px] font-bold text-amber-600">{pct}% cobrado</p>
                                  <p className="text-[9px] font-bold text-rose-500">Saldo: ${formatCurrency(totalOrden - group.totalAbonado)}</p>
                                </>
                              );
                            }
                            if (hasAnySena && group.totalAbonado > 0) {
                              return (
                                <>
                                  <p className="text-[10px] font-bold text-amber-600">Seña: ${formatCurrency(group.totalAbonado)}</p>
                                  <p className="text-[9px] font-bold text-rose-500">Saldo pendiente</p>
                                </>
                              );
                            }
                            return <p className="text-[10px] font-bold text-amber-600">{group.totalAbonado > 0 ? `$${formatCurrency(group.totalAbonado)}` : '$0'}</p>;
                          })()}
                        </div>
                      </div>

                      {/* Delivery */}
                      {tx.fecha_entrega && (
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${urgencyBadge[status.urgency]}`}>
                            {status.text}
                          </span>
                          <span className="text-[10px] text-slate-400">{tx.fecha_entrega}</span>
                        </div>
                      )}

                      {/* Items with per-item color dots */}
                      <div className="flex flex-wrap gap-1 mb-2 items-center">
                        {items.slice(0, 4).map((item, i) => {
                          const itemColor = (item as any).color || tx.color_producto || 'Negro';
                          const colorDef = COLORES_PRODUCTO.find(c => c.value === itemColor);
                          return (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                              {itemColor !== 'Negro' && (
                                <span className={`w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 ${colorDef?.border ? 'border border-slate-300' : ''}`} style={{ backgroundColor: colorDef?.hex || '#888' }} />
                              )}
                              <Package className="h-2.5 w-2.5" />
                              {item.sku}×{item.unidades}
                            </span>
                          );
                        })}
                        {items.length > 4 && (
                          <span className="px-2 py-0.5 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-500">
                            +{items.length - 4} más
                          </span>
                        )}
                      </div>

                      {/* Payment chips */}
                      {paymentsCount > 1 && (
                        <div className="flex items-center gap-1 mb-2">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-500">{paymentsCount} pagos registrados</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {etapaIdx > 0 && (
                            <button
                              onClick={() => handleMove(tx.id, ETAPAS_PRODUCCION[etapaIdx - 1])}
                              className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 transition-colors"
                              title="Retroceder"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => { setNotingTx(tx); setLocalNotes(tx.notas_produccion || ''); }}
                            className={`p-2 rounded-xl border transition-colors ${
                              tx.notas_produccion
                                ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                                : 'text-slate-400 border-slate-100 bg-white hover:text-indigo-600'
                            }`}
                            title="Notas"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => openEdit(group)}
                            className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                            title="Editar pedido"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setInfoOrder(group)}
                            className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                            title="Info"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </div>

                        {etapaIdx < ETAPAS_PRODUCCION.length - 1 && (
                          <button
                            onClick={() => handleAdvance(group, etapaIdx)}
                            className={`px-3 py-2 rounded-xl text-white text-[9px] font-black uppercase flex items-center gap-1 ${
                              etapa === 'Pedido Potencial'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            Sig <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes Dialog */}
      <Dialog open={!!notingTx} onOpenChange={(open) => { if (!open) setNotingTx(null); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Notas de Producción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">{notingTx?.cliente} — {notingTx?.numero_orden}</p>
            <textarea
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              rows={4}
              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Instrucciones de producción, materiales especiales..."
            />
            <button
              onClick={handleSaveNotes}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Guardar Notas
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => { if (!open) setEditingOrder(null); }}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Editar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ClientMatcher
              phone={editForm.telefono_cliente || ''}
              clientName={editForm.cliente || ''}
              onPhoneChange={tel => setEditForm(f => ({ ...f, telefono_cliente: tel }))}
              onClientSelect={({ nombre, telefono }) => setEditForm(f => ({ ...f, cliente: nombre, telefono_cliente: telefono }))}
              onClientNameChange={nombre => setEditForm(f => ({ ...f, cliente: nombre }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nro Orden</label>
                <input value={editForm.numero_orden || ''} onChange={e => setEditForm(f => ({ ...f, numero_orden: e.target.value }))} className="crm-input mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</label>
                <input type="date" value={editForm.fecha || ''} onChange={e => setEditForm(f => ({ ...f, fecha: e.target.value }))} className="crm-input mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Entrega</label>
                <input type="date" value={editForm.fecha_entrega || ''} onChange={e => setEditForm(f => ({ ...f, fecha_entrega: e.target.value || null }))} className="crm-input mt-1" />
              </div>
            </div>

            {/* Multi-item SKU editor */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Productos</label>
              <div className="space-y-2 mt-1">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <ItemColorPicker
                      value={item.color}
                      onChange={c => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], color: c };
                        setEditItems(updated);
                      }}
                    />
                    <select
                      value={item.sku}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], sku: e.target.value };
                        setEditItems(updated);
                      }}
                      className="crm-input flex-1 min-w-0"
                    >
                      <option value="">SKU...</option>
                      {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.nombre}</option>)}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.unidades}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], unidades: Number(e.target.value) };
                        setEditItems(updated);
                      }}
                      className="crm-input !w-20 !px-2"
                    />
                    {editItems.length > 1 && (
                      <button type="button" onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 text-lg font-bold">×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditItems([...editItems, { sku: '', unidades: 1, color: 'Negro' }])}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-bold"
                >
                  + Agregar SKU
                </button>
              </div>
            </div>

            {/* Total Orden + Payments section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orden $</label>
                  <input
                    type="number"
                    value={editForm.total_orden ?? 0}
                    onChange={e => setEditForm(f => ({ ...f, total_orden: Number(e.target.value) }))}
                    className="crm-input mt-1 !bg-white font-bold"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Valor total del pedido</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Abonado</label>
                  <div className="crm-input mt-1 !bg-slate-100 font-bold text-emerald-700 flex items-center">
                    ${formatCurrency(editingOrder?.totalAbonado || 0)}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">Suma de todos los pagos</p>
                </div>
              </div>
              {/* Saldo pendiente */}
              {(editForm.total_orden || 0) > 0 && (editForm.total_orden || 0) > (editingOrder?.totalAbonado || 0) && (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Saldo Pendiente</span>
                  <span className="text-sm font-black text-rose-700">${formatCurrency((editForm.total_orden || 0) - (editingOrder?.totalAbonado || 0))}</span>
                </div>
              )}

              {/* Payment history */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Historial de Pagos</label>
                <div className="space-y-1">
                  {editingOrder?.payments.map((p) => (
                    editingPayment?.id === p.id ? (
                      <div key={p.id} className="bg-white rounded-xl px-3 py-2 border border-indigo-200 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Monto $</label>
                            <input type="number" value={editingPayment.total || ''} onChange={e => setEditingPayment(ep => ep ? { ...ep, total: Number(e.target.value) } : ep)} className="crm-input mt-0.5 text-sm" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Concepto</label>
                            <select value={editingPayment.concepto} onChange={e => setEditingPayment(ep => ep ? { ...ep, concepto: e.target.value as ConceptoType } : ep)} className="crm-input mt-0.5 text-sm">
                              <option value="Seña">Seña</option>
                              <option value="Saldo">Saldo</option>
                              <option value="Total">Total</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Medio</label>
                            <select value={editingPayment.medio_pago} onChange={e => setEditingPayment(ep => ep ? { ...ep, medio_pago: e.target.value } : ep)} className="crm-input mt-0.5 text-sm">
                              <option value="">—</option>
                              {(config?.payment_methods || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingPayment(null)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                          <button onClick={handleSavePaymentEdit} className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-100 group/pay">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            p.concepto === 'Seña' ? 'bg-amber-100 text-amber-700'
                              : p.concepto === 'Saldo' ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>{p.concepto}</span>
                          <span className="text-[10px] text-slate-400">{p.medio_pago}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">${formatCurrency(Number(p.total))}</span>
                          <div className="flex gap-1 opacity-0 group-hover/pay:opacity-100 transition-opacity">
                            <button onClick={() => setEditingPayment({ id: p.id, total: Number(p.total), concepto: p.concepto, medio_pago: p.medio_pago })} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar pago">
                              <Pencil className="h-3 w-3" />
                            </button>
                            {p.id !== editingOrder?.primary.id && (
                              <button onClick={() => handleDeletePayment(p.id)} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Eliminar pago">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Add payment buttons */}
                {!showAddPayment ? (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const totalOrd = editForm.total_orden || editingOrder?.primary.total_orden || 0;
                        const abonado = editingOrder?.totalAbonado || 0;
                        const saldoPendiente = Math.max(0, totalOrd - abonado);
                        setNewPayment({ total: saldoPendiente > 0 ? Math.round(saldoPendiente * 100) / 100 : 0, concepto: 'Saldo', medio_pago: '' });
                        setShowAddPayment(true);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1 justify-center"
                    >
                      <Plus className="h-3 w-3" /> Agregar Pago
                    </button>
                    {(editForm.total_orden || editingOrder?.primary.total_orden || 0) > 0 && (
                      <button
                        onClick={handleQuickSena}
                        className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <DollarSign className="h-3 w-3" /> Seña 50%
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Monto $</label>
                        <input type="number" value={newPayment.total || ''} onChange={e => setNewPayment(p => ({ ...p, total: Number(e.target.value) }))} className="crm-input mt-0.5 text-sm" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Concepto</label>
                        <select value={newPayment.concepto} onChange={e => setNewPayment(p => ({ ...p, concepto: e.target.value as ConceptoType }))} className="crm-input mt-0.5 text-sm">
                          <option value="Seña">Seña</option>
                          <option value="Saldo">Saldo</option>
                          <option value="Total">Total</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Medio</label>
                        <select value={newPayment.medio_pago} onChange={e => setNewPayment(p => ({ ...p, medio_pago: e.target.value }))} className="crm-input mt-0.5 text-sm">
                          <option value="">—</option>
                          {(config?.payment_methods || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddPayment(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                      <button onClick={handleAddPayment} disabled={newPayment.total <= 0} className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors">Registrar Pago</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                <select value={editForm.estado || 'Pendiente'} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value as EstadoType }))} className="crm-input mt-1">
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa</label>
                <select value={editForm.etapa || ''} onChange={e => setEditForm(f => ({ ...f, etapa: e.target.value as EtapaProduccion }))} className="crm-input mt-1">
                  {ETAPAS_PRODUCCION.map(et => <option key={et} value={et}>{et}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</label>
                <select value={editForm.vendedor || ''} onChange={e => setEditForm(f => ({ ...f, vendedor: e.target.value }))} className="crm-input mt-1">
                  <option value="">—</option>
                  {(config?.vendors || []).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medio Envío</label>
                <select value={editForm.medio_envio || ''} onChange={e => setEditForm(f => ({ ...f, medio_envio: e.target.value }))} className="crm-input mt-1">
                  <option value="">—</option>
                  {MEDIOS_ENVIO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracking</label>
                <input value={editForm.tracking_number || ''} onChange={e => setEditForm(f => ({ ...f, tracking_number: e.target.value }))} className="crm-input mt-1" placeholder="Nro seguimiento" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalle</label>
              <textarea value={editForm.detalle || ''} onChange={e => setEditForm(f => ({ ...f, detalle: e.target.value }))} rows={2} className="crm-input mt-1 resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas de Producción</label>
              <textarea value={editForm.notas_produccion || ''} onChange={e => setEditForm(f => ({ ...f, notas_produccion: e.target.value }))} rows={2} className="crm-input mt-1 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelOrder}
                className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors border border-rose-200"
              >
                Cancelar Pedido
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={(open) => { setIsQuickAddOpen(open); if (!open) { setQuickItems([{ sku: '', unidades: 1, color: 'Negro' }]); setQuickClient({ nombre: '', telefono: '' }); setQuickImputable('Ventas LaserBeam'); setQuickTotalOrden(0); setQuickSena({ enabled: false, total: 0, medio_pago: '' }); } }}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Pedido Rápido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <ClientMatcher
              phone={quickClient.telefono}
              clientName={quickClient.nombre}
              onPhoneChange={tel => setQuickClient(c => ({ ...c, telefono: tel }))}
              onClientSelect={({ nombre, telefono }) => setQuickClient({ nombre, telefono })}
              onClientNameChange={nombre => setQuickClient(c => ({ ...c, nombre }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Venta</label>
                <select value={quickImputable} onChange={e => setQuickImputable(e.target.value)} className="crm-input mt-1">
                  {(config?.imputables_ingresos || ['Ventas LaserBeam', 'Venta Fábrica']).map(imp => (
                    <option key={imp} value={imp}>{imp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrega Pactada</label>
                <input name="fechaEntrega" type="date" className="crm-input mt-1" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Productos</label>
              <div className="space-y-2">
                {quickItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <ItemColorPicker
                      value={item.color}
                      onChange={c => setQuickItems(prev => prev.map((it, i) => i === idx ? { ...it, color: c } : it))}
                    />
                    <select
                      value={item.sku}
                      onChange={e => setQuickItems(prev => prev.map((it, i) => i === idx ? { ...it, sku: e.target.value } : it))}
                      className="crm-input min-w-0 flex-1"
                    >
                      <option value="">Seleccionar SKU...</option>
                      {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.nombre}</option>)}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.unidades}
                      onChange={e => setQuickItems(prev => prev.map((it, i) => i === idx ? { ...it, unidades: Number(e.target.value) } : it))}
                      className="crm-input !w-20 !px-2 text-center flex-none"
                    />
                    {quickItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuickItems(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-400 hover:text-rose-600 flex-none"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQuickItems(prev => [...prev, { sku: '', unidades: 1, color: 'Negro' }])}
                className="mt-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Agregar producto
              </button>
            </div>

            {/* Precio y Seña */}
            <div className="bg-slate-50 rounded-2xl p-3 space-y-3 border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio Total del Pedido $</label>
                <input type="number" value={quickTotalOrden || ''} onChange={e => setQuickTotalOrden(Number(e.target.value))} className="crm-input mt-1" placeholder="0" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="quickSenaEnabled"
                  checked={quickSena.enabled}
                  onChange={e => setQuickSena(s => ({ ...s, enabled: e.target.checked, total: e.target.checked && quickTotalOrden > 0 ? Math.round(quickTotalOrden * 50) / 100 : s.total }))}
                  className="rounded border-slate-300"
                />
                <label htmlFor="quickSenaEnabled" className="text-xs font-bold text-slate-600">Registrar seña</label>
              </div>
              {quickSena.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Monto Seña $</label>
                    <input type="number" value={quickSena.total || ''} onChange={e => setQuickSena(s => ({ ...s, total: Number(e.target.value) }))} className="crm-input mt-0.5 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Medio de Pago</label>
                    <select value={quickSena.medio_pago} onChange={e => setQuickSena(s => ({ ...s, medio_pago: e.target.value }))} className="crm-input mt-0.5 text-sm">
                      <option value="">Seleccionar...</option>
                      {(config?.payment_methods || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {quickTotalOrden > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuickSena(s => ({ ...s, total: Math.round(quickTotalOrden * 50) / 100 }))}
                      className="col-span-2 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1 justify-center"
                    >
                      <DollarSign className="h-3 w-3" /> Seña 50% (${formatCurrency(Math.round(quickTotalOrden * 50) / 100)})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas</label>
              <textarea name="detalle" rows={2} className="crm-input mt-1 resize-none" placeholder="Instrucciones..." />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              Crear Pedido
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={!!infoOrder} onOpenChange={(open) => { if (!open) setInfoOrder(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Resumen del Pedido</DialogTitle>
          </DialogHeader>
          {infoOrder && (() => {
            const tx = infoOrder.primary;
            const items = tx.items && tx.items.length > 0 ? tx.items : [{ sku: tx.sku, unidades: tx.unidades }];
            const totalOrden = tx.total_orden || infoOrder.totalAbonado;
            const status = getDeliveryStatus(tx.fecha_entrega);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nro Orden</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-indigo-600">{tx.numero_orden}</p>
                      {(() => { const pRef = extractPresupuestoRef(tx.detalle); return pRef ? (
                        <button
                          onClick={() => { setInfoOrder(null); navigate(`/presupuestos/${pRef.id || pRef.num}`); }}
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded-full transition-colors"
                        >
                          <FileText className="h-2.5 w-2.5" />P#{pRef.num}
                        </button>
                      ) : null; })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                    <p className="font-bold text-slate-800">{tx.cliente}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Etapa</p>
                    <p className="font-semibold text-slate-700">{tx.etapa || 'Sin etapa'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Vendedor</p>
                    <p className="font-semibold text-slate-700">{tx.vendedor || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha Creación</p>
                    <p className="text-slate-600">{tx.fecha}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha Entrega</p>
                    <p className={`font-semibold ${status.urgency === 'high' ? 'text-rose-600' : status.urgency === 'medium' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {tx.fecha_entrega || '—'} {tx.fecha_entrega && <span className="text-[10px]">({status.text})</span>}
                    </p>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Productos</p>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                        <span className="font-semibold text-slate-700">{item.sku}</span>
                        <span className="text-slate-500">×{item.unidades}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financials */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Total Orden</span>
                    <span className="font-black text-slate-800">${formatCurrency(totalOrden)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Total Abonado</span>
                    <span className="font-black text-emerald-600">${formatCurrency(infoOrder.totalAbonado)}</span>
                  </div>
                  {totalOrden > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (infoOrder.totalAbonado / totalOrden) * 100)}%` }} />
                    </div>
                  )}
                  {totalOrden > 0 && infoOrder.totalAbonado < totalOrden && (
                    <div className="flex justify-between text-sm">
                      <span className="text-rose-500 font-bold">Saldo Pendiente</span>
                      <span className="font-black text-rose-600">${formatCurrency(totalOrden - infoOrder.totalAbonado)}</span>
                    </div>
                  )}
                  <div className="space-y-1 pt-1">
                    {infoOrder.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                            p.concepto === 'Seña' ? 'bg-amber-100 text-amber-700'
                              : p.concepto === 'Saldo' ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>{p.concepto}</span>
                          <span className="text-slate-400">{p.medio_pago}</span>
                        </div>
                        <span className="font-bold text-slate-700">${formatCurrency(Number(p.total))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {tx.notas_produccion && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Notas de Producción</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{tx.notas_produccion}</p>
                  </div>
                )}

                {/* Shipping */}
                {(tx.medio_envio || tx.tracking_number) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {tx.medio_envio && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Medio Envío</p>
                        <p className="text-slate-700">{tx.medio_envio}</p>
                      </div>
                    )}
                    {tx.tracking_number && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tracking</p>
                        <p className="text-slate-700">{tx.tracking_number}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Sale Dialog (Potencial → Confirmado) */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-black">Confirmar Venta</DialogTitle>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Estás confirmando el pedido <span className="font-bold text-indigo-600">{confirmDialog.group.primary.numero_orden}</span> de <span className="font-bold text-slate-700">{confirmDialog.group.primary.cliente}</span>.
              </p>
              <ClientMatcher
                phone={confirmForm.telefono_cliente}
                clientName={confirmDialog.group.primary.cliente}
                onPhoneChange={tel => setConfirmForm(f => ({ ...f, telefono_cliente: tel }))}
                onClientSelect={({ telefono }) => setConfirmForm(f => ({ ...f, telefono_cliente: telefono }))}
                showNameField={false}
              />
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orden $</label>
                <input type="number" value={confirmForm.total_orden || ''} onChange={e => setConfirmForm(f => ({ ...f, total_orden: Number(e.target.value) }))} className="crm-input mt-1" placeholder="Monto total del pedido" />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-3">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Registrar Pago (opcional)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Monto $</label>
                    <input type="number" value={confirmForm.total || ''} onChange={e => setConfirmForm(f => ({ ...f, total: Number(e.target.value) }))} className="crm-input mt-0.5 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Concepto</label>
                    <select value={confirmForm.concepto} onChange={e => setConfirmForm(f => ({ ...f, concepto: e.target.value as ConceptoType }))} className="crm-input mt-0.5 text-sm">
                      <option value="Seña">Seña</option>
                      <option value="Saldo">Saldo</option>
                      <option value="Total">Total</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Medio</label>
                    <select value={confirmForm.medio_pago} onChange={e => setConfirmForm(f => ({ ...f, medio_pago: e.target.value }))} className="crm-input mt-0.5 text-sm">
                      <option value="">—</option>
                      {(config?.payment_methods || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                {confirmForm.total_orden > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmForm(f => ({ ...f, total: Math.round(f.total_orden * 50) / 100, concepto: 'Seña' }))}
                    className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <DollarSign className="h-3 w-3" /> Seña 50%
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button onClick={handleConfirmSale} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
                  Confirmar Pedido
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Separator Edit Dialog */}
      <Dialog open={!!editingSeparator} onOpenChange={(o) => { if (!o) setEditingSeparator(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Separador</DialogTitle>
          </DialogHeader>
          {editingSeparator && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nombre</label>
                <input
                  value={sepLabel}
                  onChange={e => setSepLabel(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  placeholder="Ej: PRIORIDAD DEL DÍA"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Color</label>
                <div className="flex gap-2">
                  {SEPARATOR_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSepColorIdx(i)}
                      className={`w-8 h-8 rounded-full ${c.bg} ${sepColorIdx === i ? 'ring-2 ring-offset-2 ring-slate-400' : ''} transition-all`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Vista previa</label>
                <div className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wide text-center ${SEPARATOR_COLORS[sepColorIdx].bg} ${SEPARATOR_COLORS[sepColorIdx].text}`}>
                  {sepLabel || 'CATEGORÍA'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSeparator(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    updateSeparator(editingSeparator.etapa, editingSeparator.position, sepLabel || 'CATEGORÍA', sepColorIdx);
                    setEditingSeparator(null);
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
