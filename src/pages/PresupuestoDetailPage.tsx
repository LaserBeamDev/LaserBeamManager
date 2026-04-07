import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, MessageSquare, ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBudget } from "@/hooks/useBudgetStore";
import { calcCostoProducto, calcPrecioConMargen, formatARS, formatMinutos, calcResumenProduccion } from "@/lib/engine";
import { Presupuesto, PresupuestoItem, Producto, ProcesoEnProducto, PresupuestoEstado, TiempoProduccion } from "@/lib/types";
import { toast } from "sonner";
import { useCrm } from "@/hooks/useCrm";

export default function PresupuestoDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === 'nuevo';
  const { addTransaction, generateOrderNumber, products: crmProducts, config: crmConfig } = useCrm();
  const {
    productos, materiales, procesos, parametrosActuales: params,
    addPresupuesto, updatePresupuesto, getPresupuesto, loading,
  } = useBudget();

  const [pres, setPres] = useState<Presupuesto>(() => {
    if (isNew) return {
      id: crypto.randomUUID(), numero: 0, // Will be assigned by DB
      clienteNombre: '', clienteContacto: '', observaciones: '',
      estado: 'borrador', fechaCreacion: new Date().toISOString(),
      validezDias: 7, impuestoPct: 0, items: [],
      totalNeto: 0, totalConImpuesto: 0, parametrosSnapshotId: '',
    };
    return getPresupuesto(id!) || {
      id: crypto.randomUUID(), numero: 0,
      clienteNombre: '', clienteContacto: '', observaciones: '',
      estado: 'borrador', fechaCreacion: new Date().toISOString(),
      validezDias: 7, impuestoPct: 0, items: [],
      totalNeto: 0, totalConImpuesto: 0, parametrosSnapshotId: '',
    };
  });

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otPaymentType, setOtPaymentType] = useState<'sena50' | 'total' | 'custom'>('sena50');
  const [otCustomAmount, setOtCustomAmount] = useState(0);
  const [quickProduct, setQuickProduct] = useState<Partial<Producto>>({
    nombre: '', categoria: '', tipo: 'a_medida', margenDefecto: 40,
    materiales: [], procesos: [], descripcion: '', observaciones: '',
  });

  // Re-load presupuesto from context when data finishes loading
  useMemo(() => {
    if (!isNew && !loading && id) {
      const found = getPresupuesto(id);
      if (found && found.id !== pres.id) setPres(found);
      else if (found && pres.numero === 0 && found.numero !== 0) setPres(found);
    }
  }, [loading, id, isNew, getPresupuesto]);

  const recalcTotals = (items: PresupuestoItem[]): Presupuesto => {
    const totalNeto = items.reduce((s, i) => s + i.total, 0);
    const totalConImpuesto = totalNeto * (1 + pres.impuestoPct / 100);
    return { ...pres, items, totalNeto, totalConImpuesto };
  };

  const addExistingProduct = (prod: Producto) => {
    const cantidad = 1;
    const cost = calcCostoProducto(prod, cantidad, params, materiales, procesos);
    const margen = prod.margenDefecto || params?.generales.margenGlobalDefecto || 40;
    const precioUnit = calcPrecioConMargen(cost.costoUnitario, margen);
    const item: PresupuestoItem = {
      id: crypto.randomUUID(), productoId: prod.id,
      nombrePersonalizado: prod.nombre, cantidad,
      costoUnitario: cost.costoUnitario, margenAplicado: margen,
      precioUnitario: precioUnit, total: precioUnit * cantidad,
      composicionSnapshot: { materiales: prod.materiales, procesos: prod.procesos },
      tiemposSnapshot: cost.tiempos,
    };
    const updated = recalcTotals([...pres.items, item]);
    setPres(updated);
    setAddPanelOpen(false);
  };

  const addQuickProduct = () => {
    if (!quickProduct.nombre) return;
    const prod: Producto = {
      ...(quickProduct as any),
      id: crypto.randomUUID(),
      codigo: `QP-${Date.now().toString(36).toUpperCase()}`,
      activo: true, esPlantilla: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const cantidad = 1;
    const cost = calcCostoProducto(prod, cantidad, params, materiales, procesos);
    const margen = prod.margenDefecto || 40;
    const precioUnit = calcPrecioConMargen(cost.costoUnitario, margen);
    const item: PresupuestoItem = {
      id: crypto.randomUUID(), productoId: undefined,
      nombrePersonalizado: prod.nombre, cantidad,
      costoUnitario: cost.costoUnitario, margenAplicado: margen,
      precioUnitario: precioUnit, total: precioUnit * cantidad,
      composicionSnapshot: { materiales: prod.materiales, procesos: prod.procesos },
      tiemposSnapshot: cost.tiempos,
    };
    const updated = recalcTotals([...pres.items, item]);
    setPres(updated);
    setAddPanelOpen(false);
    setQuickProduct({ nombre: '', categoria: '', tipo: 'a_medida', margenDefecto: 40, materiales: [], procesos: [], descripcion: '', observaciones: '' });
  };

  const updateItemQty = (itemId: string, qty: number) => {
    const items = pres.items.map(item => {
      if (item.id !== itemId) return item;
      const prod = productos.find(p => p.id === item.productoId);
      if (prod) {
        const cost = calcCostoProducto(prod, qty, params, materiales, procesos);
        const precioUnit = calcPrecioConMargen(cost.costoUnitario, item.margenAplicado);
        return { ...item, cantidad: qty, costoUnitario: cost.costoUnitario, precioUnitario: precioUnit, total: precioUnit * qty, tiemposSnapshot: cost.tiempos };
      }
      return { ...item, cantidad: qty, total: item.precioUnitario * qty };
    });
    setPres(recalcTotals(items));
  };

  const updateItemMargen = (itemId: string, margen: number) => {
    const items = pres.items.map(item => {
      if (item.id !== itemId) return item;
      const precioUnit = calcPrecioConMargen(item.costoUnitario, margen);
      return { ...item, margenAplicado: margen, precioUnitario: precioUnit, total: precioUnit * item.cantidad };
    });
    setPres(recalcTotals(items));
  };

  const removeItem = (itemId: string) => setPres(recalcTotals(pres.items.filter(i => i.id !== itemId)));

  const handleSave = async () => {
    const p = { ...pres, parametrosSnapshotId: params?.id || '' };
    if (isNew) {
      const saved = await addPresupuesto(p);
      if (saved) {
        toast.success('Presupuesto creado');
        nav(`/presupuestos/${saved.id}`, { replace: true });
      }
    } else {
      await updatePresupuesto(p);
      toast.success('Presupuesto guardado');
    }
  };

  const generateWhatsApp = () => {
    let text = `Hola *${pres.clienteNombre || 'Cliente'}*, te paso la cotización:\n\n`;
    pres.items.forEach(item => { text += `• ${item.nombrePersonalizado} x${item.cantidad}: ${formatARS(item.total)}\n`; });
    text += `\n*Total: ${formatARS(pres.totalConImpuesto)}*`;
    if (pres.impuestoPct > 0) text += ` (IVA incl.)`;
    text += `\nVálido por ${pres.validezDias} días.\n\nSaludos, *LaserBeam*`;
    navigator.clipboard.writeText(text);
    toast.success('Texto copiado al portapapeles');
  };

  const allTiempos: TiempoProduccion[] = pres.items.flatMap(i => i.tiemposSnapshot || []);
  const resumen = calcResumenProduccion(allTiempos);

  const handleCreateOT = async () => {
    const itemsForOT = pres.items.map(item => ({
      sku: item.nombrePersonalizado.slice(0, 20).toUpperCase().replace(/\s+/g, '-'),
      unidades: item.cantidad,
    }));
    const primarySku = itemsForOT[0]?.sku || 'PRESUP';
    const totalUnidades = itemsForOT.reduce((a, i) => a + i.unidades, 0) || 1;

    let montoInicial: number;
    let concepto: 'Seña' | 'Total';
    if (otPaymentType === 'total') {
      montoInicial = pres.totalConImpuesto;
      concepto = 'Total';
    } else if (otPaymentType === 'sena50') {
      montoInicial = Math.round(pres.totalConImpuesto * 0.5 * 100) / 100;
      concepto = 'Seña';
    } else {
      montoInicial = otCustomAmount;
      concepto = 'Seña';
    }

    await addTransaction({
      tipo: 'Ingreso',
      fecha: new Date().toISOString().slice(0, 10),
      cuenta: 'Ventas',
      imputable: 'Ventas LaserBeam',
      sku: primarySku,
      total: montoInicial,
      total_orden: pres.totalConImpuesto,
      concepto,
      medio_pago: 'Pendiente Cobro',
      unidades: totalUnidades,
      items: itemsForOT,
      cliente: pres.clienteNombre || 'Sin cliente',
      vendedor: crmConfig?.vendors?.[0] || '',
      detalle: `Presupuesto #${String(pres.numero).padStart(4, '0')} [pid:${pres.id}]`,
      numero_orden: generateOrderNumber(),
      etapa: 'Pedido Confirmado',
    });
    setOtDialogOpen(false);
    toast.success('OT creada en el CRM', {
      action: { label: 'Ir al Kanban', onClick: () => nav('/crm/produccion') },
      duration: 6000,
    });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav('/presupuestos')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-semibold">{isNew ? 'Nuevo Presupuesto' : `Presupuesto #${String(pres.numero).padStart(4, '0')}`}</h1>
        <Badge variant="secondary">{pres.estado}</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Cliente</Label><Input value={pres.clienteNombre} onChange={e => setPres({ ...pres, clienteNombre: e.target.value })} placeholder="Nombre del cliente" /></div>
            <div><Label className="text-xs">Contacto</Label><Input value={pres.clienteContacto} onChange={e => setPres({ ...pres, clienteContacto: e.target.value })} placeholder="Tel / email" /></div>
            <div><Label className="text-xs">Validez (días)</Label><Input type="number" value={pres.validezDias} onChange={e => setPres({ ...pres, validezDias: +e.target.value })} /></div>
            <div>
              <Label className="text-xs">Impuesto</Label>
              <Select value={String(pres.impuestoPct)} onValueChange={v => {
                const imp = +v;
                setPres({ ...pres, impuestoPct: imp, totalConImpuesto: pres.totalNeto * (1 + imp / 100) });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">Sin impuesto</SelectItem><SelectItem value="21">+21% IVA</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3"><Label className="text-xs">Observaciones</Label><Textarea value={pres.observaciones} onChange={e => setPres({ ...pres, observaciones: e.target.value })} rows={2} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Productos</CardTitle>
          <Button onClick={() => setAddPanelOpen(true)} className="gap-2" size="sm"><Plus className="h-3 w-3" />Agregar Producto</Button>
        </CardHeader>
        <CardContent className="p-0">
          {pres.items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Sin productos. Agregá uno para empezar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b">
                  <th className="table-header text-left p-3">Producto</th>
                  <th className="table-header text-center p-3 w-20">Cant.</th>
                  <th className="table-header text-right p-3">Costo U.</th>
                  <th className="table-header text-center p-3 w-20">Margen</th>
                  <th className="table-header text-right p-3">Precio U.</th>
                  <th className="table-header text-right p-3">Total</th>
                  <th className="table-header w-10"></th>
                </tr></thead>
                <tbody>
                  {pres.items.map(item => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <button className="flex items-center gap-1 text-left" onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                          {expandedItem === item.id ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                          <span className="font-medium text-sm">{item.nombrePersonalizado}</span>
                        </button>
                        {expandedItem === item.id && (
                          <div className="mt-2 p-3 bg-muted/20 rounded-lg animate-fade-in text-xs space-y-2">
                            <p className="font-medium text-muted-foreground uppercase">Detalle técnico</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="font-medium mb-1">Materiales</p>
                                {(item.composicionSnapshot?.materiales || []).map((m: any, idx: number) => {
                                  const mat = materiales.find(x => x.id === m.itemId);
                                  return <p key={idx} className="text-muted-foreground">{mat?.nombre || 'N/A'} × {m.cantidad}</p>;
                                })}
                              </div>
                              <div>
                                <p className="font-medium mb-1">Tiempos</p>
                                {(item.tiemposSnapshot || []).map((t: TiempoProduccion, idx: number) => (
                                  <p key={idx} className="text-muted-foreground">{t.proceso}: {formatMinutos(t.tiempoMinutos)}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center"><Input type="number" min={1} className="w-16 mx-auto text-center" value={item.cantidad} onChange={e => updateItemQty(item.id, Math.max(1, +e.target.value))} /></td>
                      <td className="p-3 currency text-sm">{formatARS(item.costoUnitario)}</td>
                      <td className="p-3 text-center"><Input type="number" className="w-16 mx-auto text-center" value={item.margenAplicado} onChange={e => updateItemMargen(item.id, +e.target.value)} /></td>
                      <td className="p-3 currency text-sm font-medium">{formatARS(item.precioUnitario)}</td>
                      <td className="p-3 currency text-sm font-semibold">{formatARS(item.total)}</td>
                      <td className="p-3"><Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="currency">{formatARS(pres.totalNeto)}</span></div>
              {pres.impuestoPct > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA ({pres.impuestoPct}%)</span><span className="currency">{formatARS(pres.totalConImpuesto - pres.totalNeto)}</span></div>}
              <Separator />
              <div className="flex justify-between font-semibold text-lg"><span>Total</span><span className="currency">{formatARS(pres.totalConImpuesto)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pres.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen Producción</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              {Object.entries(resumen.tiemposPorRecurso).map(([r, m]) => (
                <div key={r}><p className="text-muted-foreground text-xs">{r}</p><p className="font-medium">{formatMinutos(m)}</p></div>
              ))}
              <div><p className="text-muted-foreground text-xs">Cuello de botella</p><Badge variant="secondary" className="bg-warning/10 text-warning">{resumen.cuelloBotella}</Badge></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end flex-wrap">
        {pres.estado === 'aceptado' && pres.items.length > 0 && (
          <Button variant="outline" onClick={() => { setOtPaymentType('sena50'); setOtCustomAmount(0); setOtDialogOpen(true); }} className="gap-2 border-primary text-primary hover:bg-primary/10">
            <ClipboardList className="h-4 w-4" />Crear OT
          </Button>
        )}
        <Button variant="outline" onClick={generateWhatsApp} className="gap-2"><MessageSquare className="h-4 w-4" />WhatsApp</Button>
        <Select value={pres.estado} onValueChange={v => setPres({ ...pres, estado: v as PresupuestoEstado })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="borrador">Borrador</SelectItem><SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aceptado">Aceptado</SelectItem><SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Guardar</Button>
      </div>

      <Sheet open={addPanelOpen} onOpenChange={setAddPanelOpen}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>Agregar Producto</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <Label className="text-base font-semibold">Productos existentes</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {productos.filter(p => p.activo).map(prod => {
                  const cost = calcCostoProducto(prod, 1, params, materiales, procesos);
                  return (
                    <div key={prod.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => addExistingProduct(prod)}>
                      <div><p className="text-sm font-medium">{prod.nombre}</p><p className="text-xs text-muted-foreground">{prod.categoria}</p></div>
                      <span className="currency text-sm">{formatARS(cost.costoUnitario)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-base font-semibold">Crear producto rápido</Label>
              <div className="mt-2 space-y-3">
                <div><Label className="text-xs">Nombre</Label><Input value={quickProduct.nombre || ''} onChange={e => setQuickProduct({ ...quickProduct, nombre: e.target.value })} /></div>
                <div><Label className="text-xs">Categoría</Label><Input value={quickProduct.categoria || ''} onChange={e => setQuickProduct({ ...quickProduct, categoria: e.target.value })} /></div>
                <div>
                  <div className="flex justify-between items-center"><Label className="text-xs">Materiales</Label>
                    <Button variant="ghost" size="sm" onClick={() => setQuickProduct({ ...quickProduct, materiales: [...(quickProduct.materiales || []), { itemId: materiales[0]?.id || '', cantidad: 1 }] })}><Plus className="h-3 w-3" /></Button>
                  </div>
                  {(quickProduct.materiales || []).map((m, i) => (
                    <div key={i} className="flex gap-2 mt-1">
                      <Select value={m.itemId} onValueChange={v => { const mats = [...(quickProduct.materiales || [])]; mats[i] = { ...mats[i], itemId: v }; setQuickProduct({ ...quickProduct, materiales: mats }); }}>
                        <SelectTrigger className="flex-1 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{materiales.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" step="any" className="w-20" value={m.cantidad} onChange={e => { const mats = [...(quickProduct.materiales || [])]; mats[i] = { ...mats[i], cantidad: +e.target.value }; setQuickProduct({ ...quickProduct, materiales: mats }); }} />
                      <Button variant="ghost" size="icon" onClick={() => setQuickProduct({ ...quickProduct, materiales: (quickProduct.materiales || []).filter((_, j) => j !== i) })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between items-center"><Label className="text-xs">Procesos</Label>
                    <Button variant="ghost" size="sm" onClick={() => setQuickProduct({ ...quickProduct, procesos: [...(quickProduct.procesos || []), { id: crypto.randomUUID(), procesoId: procesos[0]?.id || '', tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 1, unidadesPorTirada: 1, usarTiempoReal: false }] })}><Plus className="h-3 w-3" /></Button>
                  </div>
                  {(quickProduct.procesos || []).map((p, i) => (
                    <div key={p.id} className="border rounded p-2 mt-1 space-y-1">
                      <div className="flex gap-2">
                        <Select value={p.procesoId} onValueChange={v => { const procs = [...(quickProduct.procesos || [])]; procs[i] = { ...procs[i], procesoId: v }; setQuickProduct({ ...quickProduct, procesos: procs }); }}>
                          <SelectTrigger className="flex-1 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{procesos.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.nombre}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => setQuickProduct({ ...quickProduct, procesos: (quickProduct.procesos || []).filter((_, j) => j !== i) })}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div><Label className="text-[10px]">T.Fijo</Label><Input type="number" step="any" value={p.tiempoFijo} className="h-7 text-xs" onChange={e => { const procs = [...(quickProduct.procesos || [])]; procs[i] = { ...procs[i], tiempoFijo: +e.target.value }; setQuickProduct({ ...quickProduct, procesos: procs }); }} /></div>
                        <div><Label className="text-[10px]">T.Unidad</Label><Input type="number" step="any" value={p.tiempoPorUnidad} className="h-7 text-xs" onChange={e => { const procs = [...(quickProduct.procesos || [])]; procs[i] = { ...procs[i], tiempoPorUnidad: +e.target.value }; setQuickProduct({ ...quickProduct, procesos: procs }); }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div><Label className="text-xs">Margen (%)</Label><Input type="number" value={quickProduct.margenDefecto || 40} onChange={e => setQuickProduct({ ...quickProduct, margenDefecto: +e.target.value })} /></div>
                <Button onClick={addQuickProduct} className="w-full">Agregar al Presupuesto</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={otDialogOpen} onOpenChange={setOtDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Crear Orden de Trabajo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total del pedido</span>
              <span className="font-semibold">{formatARS(pres.totalConImpuesto)}</span>
            </div>
            <Separator />
            <Label className="text-sm font-medium">Pago inicial</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={otPaymentType === 'sena50' ? 'default' : 'outline'} size="sm" onClick={() => setOtPaymentType('sena50')}>Seña 50%</Button>
              <Button variant={otPaymentType === 'total' ? 'default' : 'outline'} size="sm" onClick={() => setOtPaymentType('total')}>Pago Total</Button>
              <Button variant={otPaymentType === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setOtPaymentType('custom')}>Otro monto</Button>
            </div>
            {otPaymentType === 'custom' && (
              <div><Label className="text-xs">Monto de la seña</Label><Input type="number" step="any" value={otCustomAmount} onChange={e => setOtCustomAmount(+e.target.value)} placeholder="0.00" /></div>
            )}
            <div className="flex justify-between text-sm bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground">Monto inicial a registrar</span>
              <span className="font-semibold">
                {formatARS(
                  otPaymentType === 'total' ? pres.totalConImpuesto
                  : otPaymentType === 'sena50' ? Math.round(pres.totalConImpuesto * 0.5 * 100) / 100
                  : otCustomAmount
                )}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateOT} className="gap-2"><ClipboardList className="h-4 w-4" />Crear OT</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
