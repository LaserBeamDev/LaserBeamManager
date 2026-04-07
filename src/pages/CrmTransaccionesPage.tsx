import { useState, useEffect } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, TrendingUp, TrendingDown, Download, Database, ArrowLeftRight, Pencil, CheckSquare, Square, XSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TransactionType, ConceptoType, CrmTransaction } from '@/lib/crm-types';
import { COLORES_PRODUCTO } from '@/lib/crm-types';
import ItemColorPicker from '@/components/ItemColorPicker';
import MercadoPagoImporter from '@/components/MercadoPagoImporter';
import ExcelImporter from '@/components/ExcelImporter';
import ClientMatcher from '@/components/ClientMatcher';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(amount * 100) / 100);

function formatDisplayDate(fecha: string) {
  if (!fecha) return '';
  const raw = String(fecha).trim().split('T')[0].split(' ')[0];
  const parts = raw.split(/[-/]/);
  if (parts.length !== 3) return raw;
  let d: number, m: number, y: number;
  const v0 = Number.parseInt(parts[0], 10);
  const v1 = Number.parseInt(parts[1], 10);
  const v2 = Number.parseInt(parts[2], 10);
  if (parts[0].length === 4) { y = v0; m = v1; d = v2; }
  else {
    y = v2 < 100 ? 2000 + v2 : v2;
    if (v0 > 12) { d = v0; m = v1; }
    else if (v1 > 12) { m = v0; d = v1; }
    else { m = v0; d = v1; }
  }
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return raw;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

// Account → Imputable mapping
const ACCOUNT_IMPUTABLE_MAP: Record<string, string[]> = {
  'Ventas': ['Venta Fábrica', 'Ventas LaserBeam'],
  'Otros Ingresos': ['Otros Ingresos'],
  'Costos Operativos': ['Materia Prima LaserBeam', 'Materia Prima Fábrica', 'Sueldos', 'Publicidad', 'Consumibles', 'Logística', 'Infra Estructura'],
  'Costos No Operativos': ['Reserva Taller', 'Viáticos', 'Ajuste Cuentas', 'Otros Egresos'],
  'Servicios': ['Servicios/Suscrip.', 'Tienda Online'],
  'Impuestos': ['Monotributo Julian', 'Monotributo Carla', 'Monotributo Edith', 'Impuestos Municipales'],
};

export default function CrmTransaccionesPage() {
  const { transactions, products, config, loading, ensureConfig, addTransaction, addTransfer, updateTransaction, deleteTransaction, importTransactions, isAdmin, purgeCrmData, generateOrderNumber } = useCrm();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [mpImporterOpen, setMpImporterOpen] = useState(false);
  const [excelImporterOpen, setExcelImporterOpen] = useState(false);

  // Edit dialog
  const [editingTx, setEditingTx] = useState<CrmTransaction | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editItems, setEditItems] = useState<{ sku: string; unidades: number; color: string }[]>([]);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // Transfer form state
  const [trFecha, setTrFecha] = useState(new Date().toISOString().slice(0, 10));
  const [trTotal, setTrTotal] = useState(0);
  const [trCuentaOrigen, setTrCuentaOrigen] = useState('');
  const [trVendedor, setTrVendedor] = useState('');
  const [trDetalle, setTrDetalle] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'Todos' | TransactionType>('Todos');
  const [filterVendedor, setFilterVendedor] = useState('Todos');
  const [filterProveedor, setFilterProveedor] = useState('Todos');
  const [sortBy, setSortBy] = useState<'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc'>('fecha_desc');

  // New form
  const [tipo, setTipo] = useState<TransactionType>('Ingreso');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [imputable, setImputable] = useState('');
  const [total, setTotal] = useState(0);
  const [totalOrden, setTotalOrden] = useState(0);
  const [concepto, setConcepto] = useState<ConceptoType>('Total');
  const [medioPago, setMedioPago] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [detalle, setDetalle] = useState('');
  const [estado, setEstado] = useState<'Pendiente' | 'Completado'>('Completado');
  const [formItems, setFormItems] = useState<{ sku: string; unidades: number; color: string }[]>([{ sku: '', unidades: 1, color: 'Negro' }]);

  useEffect(() => { ensureConfig(); }, [ensureConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accounts = tipo === 'Ingreso'
    ? ['Ventas', 'Otros Ingresos']
    : ['Costos Operativos', 'Costos No Operativos', 'Servicios', 'Impuestos'];

  const filteredImputables = cuenta ? (ACCOUNT_IMPUTABLE_MAP[cuenta] || []) : [];
  const showProveedor = tipo === 'Egreso';
  const showServiciosProveedor = cuenta === 'Servicios' || cuenta === 'Impuestos';

  const resetForm = () => {
    setTipo('Ingreso'); setFecha(new Date().toISOString().slice(0, 10)); setFechaEntrega('');
    setCuenta(''); setImputable(''); setTotal(0); setTotalOrden(0); setConcepto('Total');
    setMedioPago(''); setCliente(''); setTelefonoCliente(''); setVendedor(''); setDetalle('');
    setEstado('Completado'); setFormItems([{ sku: '', unidades: 1, color: 'Negro' }]);
  };

  const handleChangeTipo = (t: TransactionType) => { setTipo(t); setCuenta(''); setImputable(''); };
  const handleChangeCuenta = (c: string) => { setCuenta(c); setImputable(''); };

  const handleAdd = async () => {
    if (!cliente) {
      toast({ title: 'Error', description: 'Cliente/Proveedor es obligatorio', variant: 'destructive' });
      return;
    }
    const validItems = formItems.filter(i => i.sku && i.unidades > 0);
    const primarySku = validItems[0]?.sku || '';
    const totalUnidades = validItems.reduce((a, i) => a + i.unidades, 0) || 1;
    await addTransaction({
      tipo, fecha, fecha_entrega: fechaEntrega || null, cuenta, imputable,
      sku: primarySku, total, concepto, medio_pago: medioPago, unidades: totalUnidades, cliente, vendedor, detalle,
      numero_orden: tipo === 'Ingreso' ? generateOrderNumber() : '',
      estado,
      total_orden: concepto === 'Seña' ? totalOrden : total,
      items: validItems.length > 0 ? validItems : undefined,
      proveedor: showProveedor ? cliente : undefined,
      telefono_cliente: telefonoCliente || undefined,
    });
    toast({ title: 'Movimiento registrado' });
    resetForm();
    // Dialog stays open — user closes manually
  };

  const handleTransfer = async () => {
    if (!trCuentaOrigen || trTotal <= 0) {
      toast({ title: 'Error', description: 'Seleccioná cuenta origen y monto', variant: 'destructive' });
      return;
    }
    await addTransfer({ fecha: trFecha, total: trTotal, cuentaOrigen: trCuentaOrigen, vendedor: trVendedor, detalle: trDetalle });
    toast({ title: 'Transferencia registrada', description: `Se crearon el egreso y el ingreso por $${trTotal}` });
    setTrFecha(new Date().toISOString().slice(0, 10)); setTrTotal(0); setTrCuentaOrigen(''); setTrVendedor(''); setTrDetalle('');
    // Dialog stays open
  };

  const handleToggleEstado = async (tx: CrmTransaction) => {
    const next = tx.estado === 'Pendiente' ? 'Completado' : 'Pendiente';
    await updateTransaction(tx.id, { estado: next } as any);
  };

  // ---- Edit ----
  const openEdit = (tx: CrmTransaction) => {
    setEditingTx(tx);
    const fallbackColor = tx.color_producto || 'Negro';
    const txItems = tx.items && tx.items.length > 0
      ? tx.items.map((i: any) => ({ sku: i.sku, unidades: i.unidades, color: i.color || fallbackColor }))
      : [{ sku: tx.sku, unidades: tx.unidades, color: fallbackColor }];
    setEditItems(txItems);
    setEditForm({
      tipo: tx.tipo,
      fecha: tx.fecha,
      fecha_entrega: tx.fecha_entrega || '',
      cuenta: tx.cuenta,
      imputable: tx.imputable,
      total: tx.total,
      concepto: tx.concepto,
      medio_pago: tx.medio_pago,
      cliente: tx.cliente,
      vendedor: tx.vendedor,
      detalle: tx.detalle || '',
      estado: tx.estado,
      proveedor: tx.proveedor || '',
      total_orden: tx.total_orden || 0,
      color_producto: tx.color_producto || 'Negro',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const validItems = editItems.filter(i => i.sku && i.unidades > 0);
    const primarySku = validItems[0]?.sku || '';
    const totalUnidades = validItems.reduce((a, i) => a + i.unidades, 0) || 1;
    await updateTransaction(editingTx.id, {
      ...editForm,
      sku: primarySku,
      unidades: totalUnidades,
      items: validItems.length > 0 ? validItems : undefined,
      fecha_entrega: editForm.fecha_entrega || null,
    } as any);
    toast({ title: 'Movimiento actualizado' });
    // Dialog stays open — user closes manually
  };

  const editAccounts = editForm.tipo === 'Ingreso'
    ? ['Ventas', 'Otros Ingresos']
    : ['Costos Operativos', 'Costos No Operativos', 'Servicios', 'Impuestos'];
  const editImputables = editForm.cuenta ? (ACCOUNT_IMPUTABLE_MAP[editForm.cuenta] || []) : [];

  // ---- Batch ----
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sortedTxs.map(t => t.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`¿Eliminar ${selectedIds.size} movimiento(s)?`);
    if (!confirmed) return;
    for (const id of selectedIds) {
      await deleteTransaction(id);
    }
    toast({ title: `${selectedIds.size} movimiento(s) eliminados` });
    setSelectedIds(new Set());
  };

  const handleBatchStatus = async (newStatus: 'Completado' | 'Pendiente') => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await updateTransaction(id, { estado: newStatus } as any);
    }
    toast({ title: `${selectedIds.size} movimiento(s) → ${newStatus}` });
    setSelectedIds(new Set());
  };

  // Filter & sort
  const filteredTxs = transactions.filter(tx => {
    if (filterTipo !== 'Todos' && tx.tipo !== filterTipo) return false;
    if (filterVendedor !== 'Todos' && tx.vendedor !== filterVendedor) return false;
    if (filterProveedor !== 'Todos' && tx.proveedor !== filterProveedor) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const itemSkus = String(tx.items?.map((i: any) => i.sku).join(' ') || tx.sku || '');
      return [tx.id, tx.numero_orden, tx.cliente, tx.proveedor, tx.detalle, tx.imputable, tx.cuenta, itemSkus]
        .some(field => (field || '').toLowerCase().includes(s));
    }
    return true;
  });

  const sortedTxs = [...filteredTxs].sort((a, b) => {
    const timeA = new Date(`${String(a.fecha || '').split('T')[0]}T00:00:00`).getTime() || 0;
    const timeB = new Date(`${String(b.fecha || '').split('T')[0]}T00:00:00`).getTime() || 0;
    switch (sortBy) {
      case 'fecha_asc': return timeA - timeB;
      case 'monto_desc': return (Number(b.total) || 0) - (Number(a.total) || 0);
      case 'monto_asc': return (Number(a.total) || 0) - (Number(b.total) || 0);
      default: return timeB - timeA;
    }
  });

  const handleMpImport = async (txs: Partial<CrmTransaction>[]) => {
    const count = await importTransactions(txs);
    toast({ title: `${count} movimientos importados de Mercado Pago` });
    setMpImporterOpen(false);
  };

  const handleExcelImport = async (txs: Partial<CrmTransaction>[]) => {
    const count = await importTransactions(txs);
    toast({ title: `${count} movimientos importados` });
    setExcelImporterOpen(false);
  };

  const handlePurgeDatabase = async () => {
    if (!isAdmin) { toast({ title: 'Acceso denegado', description: 'Solo administradores pueden borrar la base.', variant: 'destructive' }); return; }
    if (!window.confirm('Vas a borrar todos los datos del CRM. ¿Querés continuar?')) return;
    if (!window.confirm('Confirmación final: esta acción es irreversible. ¿Borrar ahora?')) return;
    setIsPurging(true);
    const result = await purgeCrmData();
    setIsPurging(false);
    if (!result.ok) { toast({ title: 'No se pudo borrar', description: result.error, variant: 'destructive' }); return; }
    toast({ title: 'Base borrada', description: 'Se eliminaron todos los datos del CRM.' });
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-foreground">Movimientos</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMpImporterOpen(true)} className="px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-primary/20 transition-colors">
            <Download className="h-4 w-4" /> Importar MP
          </button>
          <button onClick={() => setExcelImporterOpen(true)} className="px-4 py-2.5 bg-muted border border-border text-muted-foreground rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-accent transition-colors">
            <Database className="h-4 w-4" /> Importar Excel
          </button>
          {isAdmin && (
            <button onClick={handlePurgeDatabase} disabled={isPurging} className="px-4 py-2.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-destructive/20 disabled:opacity-60 transition-colors">
              {isPurging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Borrar Base
            </button>
          )}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <button className="px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors">
                <ArrowLeftRight className="h-4 w-4" /> Transferencia
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md border-t-4 border-t-amber-500">
              <DialogHeader>
                <DialogTitle className="text-foreground font-black text-lg">Transferencia entre cuentas</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">Retiro de cuenta digital a Efectivo. Se crean un Egreso y un Ingreso automáticamente.</p>
              <div className="space-y-4 mt-2">
                <FormField label="Fecha"><input type="date" value={trFecha} onChange={e => setTrFecha(e.target.value)} className="crm-input" /></FormField>
                <FormField label="Cuenta Origen">
                  <select value={trCuentaOrigen} onChange={e => setTrCuentaOrigen(e.target.value)} className="crm-input">
                    <option value="">Seleccionar cuenta...</option>
                    {(config?.payment_methods || []).filter(m => m !== 'Efectivo').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>
                <FormField label="Monto ($)"><input type="number" min={0} step="0.01" value={trTotal || ''} onChange={e => setTrTotal(Number(e.target.value))} className="crm-input" /></FormField>
                <FormField label="Vendedor">
                  <select value={trVendedor} onChange={e => setTrVendedor(e.target.value)} className="crm-input">
                    <option value="">Seleccionar...</option>
                    {(config?.vendors || []).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FormField>
                <FormField label="Detalle (opcional)"><textarea value={trDetalle} onChange={e => setTrDetalle(e.target.value)} placeholder="Observaciones..." rows={2} className="crm-input resize-none" /></FormField>
                <button onClick={handleTransfer} className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors">Registrar Transferencia</button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <button className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                <Plus className="h-4 w-4" /> Nuevo Movimiento
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-xl max-h-[85vh] overflow-y-auto border-t-4" style={{ borderTopColor: tipo === 'Ingreso' ? '#059669' : '#e11d48' }}>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-foreground font-black text-lg">Nueva Operación</DialogTitle>
                  <div className="flex gap-1 bg-muted rounded-xl p-1">
                    {(['Ingreso', 'Egreso'] as TransactionType[]).map(t => (
                      <button key={t} onClick={() => handleChangeTipo(t)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tipo === t ? (t === 'Ingreso' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm') : 'text-muted-foreground hover:text-foreground'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </DialogHeader>
               <TransactionForm
                tipo={tipo} fecha={fecha} fechaEntrega={fechaEntrega} cuenta={cuenta} imputable={imputable}
                total={total} totalOrden={totalOrden} concepto={concepto} medioPago={medioPago} cliente={cliente} vendedor={vendedor}
                detalle={detalle} estado={estado} formItems={formItems}
                telefonoCliente={telefonoCliente} setTelefonoCliente={setTelefonoCliente}
                accounts={accounts} filteredImputables={filteredImputables}
                showProveedor={showProveedor} showServiciosProveedor={showServiciosProveedor}
                config={config} products={products}
                onChangeTipo={handleChangeTipo} onChangeCuenta={handleChangeCuenta}
                setFecha={setFecha} setFechaEntrega={setFechaEntrega} setImputable={setImputable}
                setTotal={setTotal} setTotalOrden={setTotalOrden} setConcepto={setConcepto} setMedioPago={setMedioPago}
                setCliente={setCliente} setVendedor={setVendedor} setDetalle={setDetalle}
                setEstado={setEstado} setFormItems={setFormItems}
                onSubmit={handleAdd} submitLabel="Guardar"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Batch toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${batchMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
          >
            <CheckSquare className="h-3.5 w-3.5" /> {batchMode ? 'Salir Batch' : 'Selección Batch'}
          </button>
          {batchMode && selectedIds.size > 0 && (
            <>
              <span className="text-xs font-bold text-muted-foreground">{selectedIds.size} seleccionados</span>
              <button onClick={selectAll} className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground border border-border hover:bg-accent transition-colors">Todos</button>
              <button onClick={deselectAll} className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground border border-border hover:bg-accent transition-colors">Ninguno</button>
              <button onClick={() => handleBatchStatus('Completado')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">✓ Completar</button>
              <button onClick={() => handleBatchStatus('Pendiente')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">⏳ Pendiente</button>
              <button onClick={handleBatchDelete} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Trash2 className="h-3 w-3 inline mr-1" />Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..."
            className="w-full pl-10 p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring transition-all" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tipo</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)} className="p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="Todos">Todos</option><option value="Ingreso">Ingreso</option><option value="Egreso">Egreso</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Vendedor</label>
          <select value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)} className="p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="Todos">Todos</option>
            {(config?.vendors || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Proveedor</label>
          <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)} className="p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="Todos">Todos</option>
            {(config?.suppliers || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Orden</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="fecha_desc">Fecha (más nueva)</option><option value="fecha_asc">Fecha (más vieja)</option>
            <option value="monto_desc">Monto (mayor)</option><option value="monto_asc">Monto (menor)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] min-h-[340px] overflow-scroll custom-scrollbar">
          <table className="w-full min-w-[1800px] text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted/95 backdrop-blur">
                {batchMode && <th className="px-2 py-2.5 w-8"></th>}
                {['ID', 'OT', 'Fecha', 'Tipo', 'Cuenta', 'Imputable', 'SKU', 'Concepto', 'Monto', 'Unid', 'Estado', 'Medio Pago', 'Vendedor', 'Cliente', 'Proveedor', 'Detalle', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedTxs.length === 0 ? (
                <tr><td colSpan={batchMode ? 18 : 17} className="text-center py-12 text-muted-foreground text-sm">No hay movimientos.</td></tr>
              ) : (
                sortedTxs.map(tx => {
                  const displaySku = tx.tipo === 'Ingreso' && tx.items && Array.isArray(tx.items) && tx.items.length > 0
                    ? tx.items.map((i: any) => `${i.unidades}x${i.sku}`).join(', ') : tx.sku;
                  return (
                    <tr key={tx.id} className={`hover:bg-accent/50 transition-colors group ${selectedIds.has(tx.id) ? 'bg-primary/5' : ''}`}>
                      {batchMode && (
                        <td className="px-2 py-2">
                          <button onClick={() => toggleSelect(tx.id)} className="p-0.5">
                            {selectedIds.has(tx.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-2 font-mono text-[9px] text-muted-foreground">{tx.id?.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-[10px] font-semibold text-muted-foreground">{tx.numero_orden || '-'}</td>
                      <td className="px-3 py-2 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{formatDisplayDate(tx.fecha)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${tx.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {tx.tipo === 'Ingreso' ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}{tx.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{tx.cuenta}</td>
                      <td className="px-3 py-2 text-[10px] text-foreground font-semibold">{tx.imputable}</td>
                      <td className="px-3 py-2"><span className="font-mono text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">{displaySku || '—'}</span></td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{tx.concepto}</td>
                      <td className={`px-3 py-2 text-[10px] font-black font-mono whitespace-nowrap ${tx.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>${formatCurrency(Number(tx.total))}</td>
                      <td className="px-3 py-2 text-[10px] text-center text-muted-foreground">{tx.unidades}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleToggleEstado(tx)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase transition-colors ${tx.estado === 'Completado' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : tx.estado === 'Cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                          {tx.estado}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{tx.medio_pago}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{tx.vendedor || '-'}</td>
                      <td className="px-3 py-2 text-[10px] font-semibold text-foreground">{tx.cliente || '-'}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{tx.proveedor || '-'}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[120px] truncate">{tx.detalle}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEdit(tx)} className="p-1.5 bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg border border-border transition-all">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={async () => { await deleteTransaction(tx.id); toast({ title: 'Eliminado' }); }}
                            className="p-1.5 bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg border border-border transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="rounded-3xl max-w-xl max-h-[85vh] overflow-y-auto border-t-4" style={{ borderTopColor: editForm.tipo === 'Ingreso' ? '#059669' : '#e11d48' }}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground font-black text-lg">
                Editar {editingTx?.numero_orden || editingTx?.id?.slice(0, 8)}
              </DialogTitle>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${editForm.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {editForm.tipo}
              </span>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fecha"><input type="date" value={editForm.fecha || ''} onChange={e => setEditForm(p => ({ ...p, fecha: e.target.value }))} className="crm-input" /></FormField>
              <FormField label="Cuenta">
                <select value={editForm.cuenta || ''} onChange={e => setEditForm(p => ({ ...p, cuenta: e.target.value, imputable: '' }))} className="crm-input">
                  <option value="">Seleccionar...</option>
                  {editAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Imputable">
                <select value={editForm.imputable || ''} onChange={e => setEditForm(p => ({ ...p, imputable: e.target.value }))} className="crm-input" disabled={!editForm.cuenta}>
                  <option value="">Seleccionar...</option>
                  {editImputables.map(i => <option key={i} value={i}>{i}</option>)}
                  {editForm.imputable && !editImputables.includes(editForm.imputable) && (
                    <option value={editForm.imputable}>{editForm.imputable}</option>
                  )}
                </select>
              </FormField>
              <FormField label="Vendedor">
                <select value={editForm.vendedor || ''} onChange={e => setEditForm(p => ({ ...p, vendedor: e.target.value }))} className="crm-input">
                  <option value="">Seleccionar...</option>
                  {(config?.vendors || []).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </FormField>
            </div>
            <ClientMatcher
              phone={editForm.telefono_cliente || ''}
              clientName={editForm.cliente || ''}
              onPhoneChange={(p) => setEditForm(prev => ({ ...prev, telefono_cliente: p }))}
              onClientSelect={(c) => setEditForm(prev => ({ ...prev, cliente: c.nombre, telefono_cliente: c.telefono }))}
              onClientNameChange={(n) => setEditForm(prev => ({ ...prev, cliente: n }))}
              showPhoneField={editForm.tipo === 'Ingreso'}
            />
            <FormField label="Medio de Pago">
              <select value={editForm.medio_pago || ''} onChange={e => setEditForm(p => ({ ...p, medio_pago: e.target.value }))} className="crm-input">
                <option value="">Seleccionar...</option>
                {(config?.payment_methods || []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>

            {/* Items for Ingreso */}
            {editForm.tipo === 'Ingreso' && (
              <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Productos</label>
                  <button type="button" onClick={() => setEditItems(prev => [...prev, { sku: '', unidades: 1, color: 'Negro' }])} className="text-[10px] font-bold text-primary hover:text-primary/80">+ Añadir</button>
                </div>
                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <ItemColorPicker
                        value={item.color}
                        onChange={c => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, color: c } : it))}
                      />
                      <select value={item.sku} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, sku: e.target.value } : it))} className="crm-input min-w-0 flex-1">
                        <option value="">Seleccionar SKU...</option>
                        {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.nombre}</option>)}
                      </select>
                      <input type="number" min={1} value={item.unidades} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unidades: Number(e.target.value) } : it))} className="crm-input !w-20 !px-2 text-center flex-none" />
                      {editItems.length > 1 && <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-destructive hover:text-destructive/80 flex-none">×</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label={editForm.concepto === 'Seña' ? 'Monto Seña ($)' : 'Total ($)'}><input type="number" min={0} step="0.01" value={editForm.total || ''} onChange={e => setEditForm(p => ({ ...p, total: Number(e.target.value) }))} className="crm-input" /></FormField>
              <FormField label="Concepto">
                <select value={editForm.concepto || 'Total'} onChange={e => setEditForm(p => ({ ...p, concepto: e.target.value }))} className="crm-input">
                  <option value="Total">Total</option><option value="Seña">Seña</option><option value="Saldo">Saldo</option>
                </select>
              </FormField>
            </div>
            {(editForm.concepto === 'Seña' || editForm.tipo === 'Ingreso') && (
              <FormField label="Total del Pedido ($)"><input type="number" min={0} step="0.01" value={editForm.total_orden || ''} onChange={e => setEditForm(p => ({ ...p, total_orden: Number(e.target.value) }))} className="crm-input" placeholder="Precio total de la orden" /></FormField>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Estado">
                <select value={editForm.estado || 'Completado'} onChange={e => setEditForm(p => ({ ...p, estado: e.target.value }))} className="crm-input">
                  <option value="Completado">Completado</option><option value="Pendiente">Pendiente</option><option value="Cancelado">Cancelado</option>
                </select>
              </FormField>
              {editForm.tipo === 'Ingreso' && (
                <FormField label="Fecha Entrega"><input type="date" value={editForm.fecha_entrega || ''} onChange={e => setEditForm(p => ({ ...p, fecha_entrega: e.target.value }))} className="crm-input" /></FormField>
              )}
            </div>
            <FormField label="Detalle"><textarea value={editForm.detalle || ''} onChange={e => setEditForm(p => ({ ...p, detalle: e.target.value }))} placeholder="Observaciones..." rows={2} className="crm-input resize-none" /></FormField>
            <button onClick={handleSaveEdit}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-colors ${editForm.tipo === 'Ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              Guardar Cambios
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Importers */}
      <MercadoPagoImporter open={mpImporterOpen} onOpenChange={setMpImporterOpen} onImport={handleMpImport} paymentMethods={config?.payment_methods || []} />
      <ExcelImporter open={excelImporterOpen} onOpenChange={setExcelImporterOpen} onImport={handleExcelImport} />
    </div>
  );
}

function TransactionForm({
  tipo, fecha, fechaEntrega, cuenta, imputable, total, totalOrden, concepto, medioPago, cliente, vendedor, detalle, estado, formItems,
  telefonoCliente, setTelefonoCliente,
  accounts, filteredImputables, showProveedor, showServiciosProveedor, config, products,
  onChangeTipo, onChangeCuenta, setFecha, setFechaEntrega, setImputable, setTotal, setTotalOrden, setConcepto, setMedioPago,
  setCliente, setVendedor, setDetalle, setEstado, setFormItems, onSubmit, submitLabel,
}: any) {
  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="crm-input" /></FormField>
        <FormField label="Cuenta">
          <select value={cuenta} onChange={e => onChangeCuenta(e.target.value)} className="crm-input">
            <option value="">Seleccionar Cuenta...</option>
            {accounts.map((a: string) => <option key={a} value={a}>{a}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Imputable">
          <select value={imputable} onChange={e => setImputable(e.target.value)} className="crm-input" disabled={!cuenta}>
            <option value="">Seleccionar Imputable...</option>
            {filteredImputables.map((i: string) => <option key={i} value={i}>{i}</option>)}
          </select>
        </FormField>
        <FormField label="Vendedor">
          <select value={vendedor} onChange={e => setVendedor(e.target.value)} className="crm-input">
            <option value="">Seleccionar Vendedor...</option>
            {(config?.vendors || []).map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>
        </FormField>
      </div>
      {showProveedor ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Proveedor">
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del proveedor..." className="crm-input" />
          </FormField>
          <FormField label="Medio de Pago">
            <select value={medioPago} onChange={e => setMedioPago(e.target.value)} className="crm-input">
              <option value="">Seleccionar Pago...</option>
              {(config?.payment_methods || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
        </div>
      ) : (
        <>
          <ClientMatcher
            phone={telefonoCliente || ''}
            clientName={cliente}
            onPhoneChange={setTelefonoCliente}
            onClientSelect={(c) => { setCliente(c.nombre); setTelefonoCliente(c.telefono); }}
            onClientNameChange={setCliente}
          />
          <FormField label="Medio de Pago">
            <select value={medioPago} onChange={e => setMedioPago(e.target.value)} className="crm-input">
              <option value="">Seleccionar Pago...</option>
              {(config?.payment_methods || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
        </>
      )}
      {tipo === 'Ingreso' && (
        <div className="bg-muted rounded-xl p-3 border border-border">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Productos</label>
            <button type="button" onClick={() => setFormItems((prev: any[]) => [...prev, { sku: '', unidades: 1, color: 'Negro' }])} className="text-[10px] font-bold text-primary hover:text-primary/80">+ Añadir</button>
          </div>
          <div className="space-y-2">
            {formItems.map((item: any, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <ItemColorPicker
                  value={item.color || 'Negro'}
                  onChange={c => setFormItems((prev: any[]) => prev.map((it: any, i: number) => i === idx ? { ...it, color: c } : it))}
                />
                <select value={item.sku} onChange={e => setFormItems((prev: any[]) => prev.map((it: any, i: number) => i === idx ? { ...it, sku: e.target.value } : it))} className="crm-input min-w-0 flex-1">
                  <option value="">Seleccionar SKU...</option>
                  {products.map((p: any) => <option key={p.sku} value={p.sku}>{p.sku} - {p.nombre}</option>)}
                </select>
                <input type="number" min={1} value={item.unidades} onChange={e => setFormItems((prev: any[]) => prev.map((it: any, i: number) => i === idx ? { ...it, unidades: Number(e.target.value) } : it))} className="crm-input !w-20 !px-2 text-center flex-none" />
                {formItems.length > 1 && <button type="button" onClick={() => setFormItems((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))} className="p-1 text-destructive flex-none">×</button>}
              </div>
            ))}
          </div>
        </div>
      )}
      {showServiciosProveedor && (
        <FormField label="Proveedor Servicio">
          <select value={cliente} onChange={e => setCliente(e.target.value)} className="crm-input">
            <option value="">Seleccionar...</option>
            {(config?.suppliers || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField label={concepto === 'Seña' ? 'Monto Seña ($)' : 'Total ($)'}><input type="number" min={0} step="0.01" value={total || ''} onChange={e => setTotal(Number(e.target.value))} className="crm-input" /></FormField>
        <FormField label="Concepto">
          <select value={concepto} onChange={e => setConcepto(e.target.value)} className="crm-input">
            <option value="Total">Total</option><option value="Seña">Seña</option><option value="Saldo">Saldo</option>
          </select>
        </FormField>
      </div>
      {concepto === 'Seña' && (
        <FormField label="Total del Pedido ($)">
          <input type="number" min={0} step="0.01" value={totalOrden || ''} onChange={e => setTotalOrden(Number(e.target.value))} className="crm-input" placeholder="Precio total de la orden" />
        </FormField>
      )}
      {tipo === 'Ingreso' ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Estado">
            <select value={estado} onChange={e => setEstado(e.target.value)} className="crm-input">
              <option value="Completado">Completado</option><option value="Pendiente">Pendiente</option>
            </select>
          </FormField>
          <FormField label="Fecha Entrega"><input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} className="crm-input" /></FormField>
        </div>
      ) : (
        <FormField label="Estado">
          <select value={estado} onChange={e => setEstado(e.target.value)} className="crm-input">
            <option value="Completado">Completado</option><option value="Pendiente">Pendiente</option>
          </select>
        </FormField>
      )}
      <FormField label="Detalle"><textarea value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Observaciones..." rows={2} className="crm-input resize-none" /></FormField>
      <button onClick={onSubmit}
        className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-colors ${tipo === 'Ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
        {submitLabel}
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
