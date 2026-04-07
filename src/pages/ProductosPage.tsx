import { useState, useMemo } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBudget } from "@/hooks/useBudgetStore";
import { calcCostoProducto, calcCostoMinuto, calcTiempoProceso, formatARS } from "@/lib/engine";
import { Producto, ProductoTipo, ProcesoEnProducto } from "@/lib/types";
import { toast } from "sonner";

const TIPOS_PROD: { value: ProductoTipo; label: string }[] = [
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'configurable', label: 'Configurable' },
  { value: 'a_medida', label: 'A medida' },
];

export default function ProductosPage() {
  const { productos, materiales, procesos, parametrosActuales: params, addProducto, updateProducto, deleteProducto, loading } = useBudget();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Producto> | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const existingCategories = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [productos]);

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === '__all__' || p.categoria === filterCat;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setEditing({
      nombre: '', categoria: '', tipo: 'cerrado', descripcion: '', margenDefecto: params?.generales.margenGlobalDefecto || 40,
      activo: true, esPlantilla: false, materiales: [], procesos: [], observaciones: '', cantidadProduccion: 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: Producto) => { setEditing({ ...p, materiales: [...p.materiales], procesos: [...p.procesos] }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nombre) return;
    const now = new Date().toISOString();
    if (editing.id) {
      await updateProducto({ ...editing, updatedAt: now } as Producto);
      toast.success('Producto actualizado');
    } else {
      await addProducto({
        ...editing as any,
        id: crypto.randomUUID(),
        codigo: `PROD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: now, updatedAt: now,
      });
      toast.success('Producto creado');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar?')) {
      await deleteProducto(id);
      toast.success('Producto eliminado');
    }
  };

  const addMat = () => {
    if (!editing) return;
    setEditing({ ...editing, materiales: [...(editing.materiales || []), { itemId: materiales[0]?.id || '', cantidad: 1 }] });
  };

  const addProc = () => {
    if (!editing) return;
    const newProc: ProcesoEnProducto = {
      id: crypto.randomUUID(), procesoId: procesos[0]?.id || '',
      tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 1, unidadesPorTirada: 1, usarTiempoReal: false,
    };
    setEditing({ ...editing, procesos: [...(editing.procesos || []), newProc] });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Nuevo Producto</Button>
      </div>

      <div className="flex gap-3 items-center">
        <Input placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las categorías</SelectItem>
            {existingCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const cost = calcCostoProducto(p as Producto, 1, params, materiales, procesos);
          const qty = p.cantidadProduccion && p.cantidadProduccion > 1 ? p.cantidadProduccion : 0;
          const costoUnit = qty > 0 ? cost.costoTotal / qty : cost.costoUnitario;
          const precioSug = costoUnit * (1 + p.margenDefecto / 100);

          // Per-material breakdown
          const matBreakdown = (p.materiales || []).map(m => {
            const mat = materiales.find(x => x.id === m.itemId);
            if (!mat) return null;
            // Use effective cost for components (recursive)
            let effectiveCost = mat.costoBase;
            if (mat.tipo === 'COM' && mat.composicion && mat.composicion.length > 0) {
              // Calculate component cost from sub-items
              let compCost = 0;
              for (const comp of mat.composicion) {
                const subMat = materiales.find(x => x.id === comp.itemId);
                if (subMat) compCost += subMat.costoBase * comp.cantidad;
                if (comp.procesoId && params) {
                  const proceso = procesos.find(x => x.id === comp.procesoId);
                  if (proceso) {
                    const tiempo = calcTiempoProceso(comp as any, 1);
                    let cm = 0;
                    if (proceso.recurso === 'CO2' || proceso.recurso === 'FIBRA') cm = calcCostoMinuto(params, proceso.recurso);
                    else if (proceso.recurso === 'MANUAL') cm = params.co2.costoOperadorHora / 60;
                    else if (proceso.recurso === 'DISEÑO') cm = params.co2.costoOperadorHora / 60 * 1.5;
                    compCost += tiempo * cm;
                  }
                }
              }
              const compQty = mat.cantidadProduccion > 1 ? mat.cantidadProduccion : 1;
              effectiveCost = compCost / compQty;
            }
            const costoMat = effectiveCost * m.cantidad * 1;
            const costoMatUnit = qty > 0 ? costoMat / qty : costoMat;
            return { nombre: mat.nombre, unidad: mat.unidad, cantidad: m.cantidad, costoTotal: costoMat, costoUnit: costoMatUnit };
          }).filter(Boolean);

          // Per-process breakdown
          const procBreakdown = (p.procesos || []).map(pr => {
            const proceso = procesos.find(x => x.id === pr.procesoId);
            if (!proceso || !params) return null;
            const tiempo = calcTiempoProceso(pr, 1);
            let costoMin = 0;
            if (proceso.recurso === 'CO2' || proceso.recurso === 'FIBRA') {
              costoMin = calcCostoMinuto(params, proceso.recurso);
            } else if (proceso.recurso === 'MANUAL') {
              costoMin = params.co2.costoOperadorHora / 60;
            } else if (proceso.recurso === 'DISEÑO') {
              costoMin = params.co2.costoOperadorHora / 60 * 1.5;
            }
            const costoProc = tiempo * costoMin;
            const costoProcUnit = qty > 0 ? costoProc / qty : costoProc;
            return { nombre: proceso.nombre, recurso: proceso.recurso, tiempo, costoTotal: costoProc, costoUnit: costoProcUnit };
          }).filter(Boolean);

          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(p)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{p.codigo}</p>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria}</p>
                  </div>
                  <Badge variant="secondary">{p.tipo}</Badge>
                </div>
                <Separator className="my-2" />
                {qty > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo producción</span>
                      <span className="currency text-muted-foreground">{formatARS(cost.costoTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Salen</span>
                      <span>{qty} un.</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo unit.</span>
                  <span className="currency">{formatARS(costoUnit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margen</span>
                  <span className="font-medium text-blue-600">{p.margenDefecto}%</span>
                </div>
                <div className="flex justify-between text-sm bg-emerald-50 dark:bg-emerald-950/30 -mx-4 px-4 py-1 rounded-lg">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Precio sug.</span>
                  <span className="currency font-bold text-emerald-700 dark:text-emerald-400">{formatARS(precioSug)}</span>
                </div>

                {/* Collapsible cost breakdown */}
                {(matBreakdown.length > 0 || procBreakdown.length > 0) && (
                  <Collapsible>
                    <CollapsibleTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="w-full mt-2 gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronDown className="h-3 w-3" />
                        Desglose de costos
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent onClick={e => e.stopPropagation()}>
                      <div className="mt-2 space-y-2 text-xs">
                        {matBreakdown.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Materiales</p>
                            {matBreakdown.map((m, i) => (
                              <div key={i} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground truncate mr-2">{m!.nombre} ({m!.cantidad} {m!.unidad})</span>
                                <span className="shrink-0 font-medium">{formatARS(m!.costoUnit)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {procBreakdown.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Procesos</p>
                            {procBreakdown.map((pr, i) => (
                              <div key={i} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground truncate mr-2">{pr!.nombre} ({pr!.tiempo.toFixed(1)} min)</span>
                                <span className="shrink-0 font-medium">{formatARS(pr!.costoUnit)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="flex gap-1 mt-3 justify-end">
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Producto</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nombre</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
                <div>
                  <Label>Categoría</Label>
                  {showNewCat ? (
                    <div className="flex gap-2">
                      <Input placeholder="Nueva categoría..." value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1" />
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => { if (newCategory.trim()) { setEditing({ ...editing, categoria: newCategory.trim() }); } setShowNewCat(false); setNewCategory(''); }}>OK</Button>
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setShowNewCat(false); setNewCategory(''); }}>✕</Button>
                    </div>
                  ) : (
                    <Select value={editing.categoria || ''} onValueChange={v => { if (v === '__new__') { setShowNewCat(true); } else { setEditing({ ...editing, categoria: v }); } }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                      <SelectContent>
                        {[...new Set([...existingCategories, ...(editing.categoria && !existingCategories.includes(editing.categoria) ? [editing.categoria] : [])])].sort().map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Crear nueva categoría</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.tipo} onValueChange={v => setEditing({ ...editing, tipo: v as ProductoTipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_PROD.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Margen (%)</Label><Input type="number" value={editing.margenDefecto || ''} onChange={e => setEditing({ ...editing, margenDefecto: +e.target.value })} /></div>
                <div>
                  <Label>Cantidad que salen</Label>
                  <Input type="number" min={1} step={1} value={editing.cantidadProduccion || 1} onChange={e => setEditing({ ...editing, cantidadProduccion: Math.max(1, +e.target.value) })} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Unidades por producción</p>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.esPlantilla || false} onCheckedChange={v => setEditing({ ...editing, esPlantilla: v })} />
                  <Label>Plantilla</Label>
                </div>
              </div>
              <div><Label>Descripción</Label><Textarea value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} /></div>

              <Separator />
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-base font-semibold">Materiales</Label>
                  <Button variant="outline" size="sm" onClick={addMat}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {(editing.materiales || []).map((m, i) => {
                  const mat = materiales.find(x => x.id === m.itemId);
                  const isArea = mat && (mat.unidad === 'm2' || mat.unidad === 'cm2');
                  return (
                  <div key={i} className="flex gap-2 mb-2 items-center flex-wrap">
                    <Select value={m.itemId} onValueChange={v => {
                      const mats = [...(editing.materiales || [])]; mats[i] = { ...mats[i], itemId: v }; setEditing({ ...editing, materiales: mats });
                    }}>
                      <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{materiales.map(mat => <SelectItem key={mat.id} value={mat.id}>{mat.nombre} ({mat.unidad})</SelectItem>)}</SelectContent>
                    </Select>
                    {isArea ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Input type="number" step="any" className="w-20" placeholder="Alto"
                            value={m.alto || ''}
                            onChange={e => {
                              const alto = +e.target.value;
                              const largo = m.largo || 0;
                              const mats = [...(editing.materiales || [])];
                              mats[i] = { ...mats[i], cantidad: +(alto * largo).toFixed(4), alto, largo };
                              setEditing({ ...editing, materiales: mats });
                            }} />
                          <span className="text-xs text-muted-foreground">×</span>
                          <Input type="number" step="any" className="w-20" placeholder="Largo"
                            value={m.largo || ''}
                            onChange={e => {
                              const largo = +e.target.value;
                              const alto = m.alto || 0;
                              const mats = [...(editing.materiales || [])];
                              mats[i] = { ...mats[i], cantidad: +(alto * largo).toFixed(4), alto, largo };
                              setEditing({ ...editing, materiales: mats });
                            }} />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">= {m.cantidad} {mat.unidad}</span>
                      </>
                    ) : (
                      <Input type="number" step="any" className="w-24" placeholder="Cant." value={m.cantidad} onChange={e => {
                        const mats = [...(editing.materiales || [])]; mats[i] = { ...mats[i], cantidad: +e.target.value }; setEditing({ ...editing, materiales: mats });
                      }} />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditing({ ...editing, materiales: (editing.materiales || []).filter((_, j) => j !== i) });
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  );
                })}
              </div>

              <Separator />
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-base font-semibold">Procesos</Label>
                  <Button variant="outline" size="sm" onClick={addProc}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {(editing.procesos || []).map((p, i) => {
                  const proc = procesos.find(pr => pr.id === p.procesoId);
                  const isCO2 = proc?.recurso === 'CO2';
                  return (
                    <div key={p.id} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex gap-2 items-center">
                        <Select value={p.procesoId} onValueChange={v => {
                          const procs = [...(editing.procesos || [])]; procs[i] = { ...procs[i], procesoId: v }; setEditing({ ...editing, procesos: procs });
                        }}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{procesos.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.nombre} ({pr.recurso})</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditing({ ...editing, procesos: (editing.procesos || []).filter((_, j) => j !== i) });
                        }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      {isCO2 ? (
                        <div className="grid grid-cols-4 gap-2">
                          <div><Label className="text-xs">T. Tirada (min)</Label><Input type="number" step="any" value={p.tiempoPorTirada} onChange={e => {
                            const newVal = +e.target.value;
                            const procs = [...(editing.procesos || [])];
                            const unPorTirada = procs[i].unidadesPorTirada || 1;
                            procs[i] = { ...procs[i], tiempoPorTirada: newVal, tiempoPorUnidad: +(newVal / unPorTirada).toFixed(4) };
                            setEditing({ ...editing, procesos: procs });
                          }} /></div>
                          <div><Label className="text-xs">Un/Tirada</Label><Input type="number" min={1} value={p.unidadesPorTirada} onChange={e => {
                            const newVal = Math.max(1, +e.target.value);
                            const procs = [...(editing.procesos || [])];
                            const tTirada = procs[i].tiempoPorTirada || 0;
                            procs[i] = { ...procs[i], unidadesPorTirada: newVal, tiempoPorUnidad: +(tTirada / newVal).toFixed(4) };
                            setEditing({ ...editing, procesos: procs });
                          }} /></div>
                          <div>
                            <Label className="text-xs text-muted-foreground">T. Unidad (auto)</Label>
                            <p className="text-sm font-semibold mt-2">{(p.tiempoPorTirada / (p.unidadesPorTirada || 1)).toFixed(2)} min</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">T. x Pedido</Label>
                            <p className="text-sm font-medium mt-2 text-muted-foreground">= T.Tirada × ⌈cant/Un.Tirada⌉</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-w-sm">
                          <div>
                            <Label className="text-xs">Tiempo por unidad (min)</Label>
                            <Input type="number" step="any" value={p.tiempoPorUnidad} onChange={e => {
                              const procs = [...(editing.procesos || [])]; procs[i] = { ...procs[i], tiempoPorUnidad: +e.target.value, tiempoFijo: 0, tiempoPorTirada: 0, unidadesPorTirada: 1 }; setEditing({ ...editing, procesos: procs });
                            }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">T. x Pedido (auto)</Label>
                            <p className="text-sm font-medium mt-2 text-muted-foreground">= T.Unidad × cantidad</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div><Label>Observaciones</Label><Textarea value={editing.observaciones || ''} onChange={e => setEditing({ ...editing, observaciones: e.target.value })} rows={2} /></div>

              {/* Cost preview */}
              {(() => {
                const qtyProd = editing.cantidadProduccion && editing.cantidadProduccion > 1 ? editing.cantidadProduccion : 0;
                const preview = calcCostoProducto(editing as Producto, 1, params, materiales, procesos);
                const costoUnit = qtyProd > 0 ? preview.costoTotal / qtyProd : preview.costoUnitario;
                const precioSug = costoUnit * (1 + (editing.margenDefecto || 0) / 100);
                return preview.costoTotal > 0 ? (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Vista previa de costos</p>
                    <div className="flex justify-between text-sm"><span>Costo producción</span><span className="font-medium">{formatARS(preview.costoTotal)}</span></div>
                    {qtyProd > 0 && (
                      <div className="flex justify-between text-sm"><span>Salen</span><span>{qtyProd} un.</span></div>
                    )}
                    <div className="flex justify-between text-sm font-semibold"><span>Costo unitario</span><span className="text-primary">{formatARS(costoUnit)}</span></div>
                    <div className="flex justify-between text-sm"><span>Precio sug. (margen {editing.margenDefecto}%)</span><span className="font-medium">{formatARS(precioSug)}</span></div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
