import { useState, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, ChevronDown } from "lucide-react";
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
import { calcCostoMinuto, formatARS } from "@/lib/engine";
import { MaterialComponente, Unidad, ComposicionItem } from "@/lib/types";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortableTable } from "@/hooks/useSortableTable";
import { toast } from "sonner";

const UNIDADES: { value: Unidad; label: string }[] = [
  { value: 'un', label: 'Unidad' },
  { value: 'm2', label: 'm²' },
  { value: 'cm2', label: 'cm²' },
  { value: 'ml', label: 'ml' },
  { value: 'kg', label: 'Kg' },
  { value: 'mt', label: 'Metro' },
];

function calcProcessCostPerMin(recurso: string, params: any): number {
  if (recurso === 'CO2' || recurso === 'FIBRA') return calcCostoMinuto(params, recurso);
  if (recurso === 'MANUAL') return params.co2.costoOperadorHora / 60;
  if (recurso === 'DISEÑO') return params.co2.costoOperadorHora / 60 * 1.5;
  return 0;
}

function calcProcessTime(item: ComposicionItem, cantidad: number): number {
  if (item.usarTiempoReal && item.tiempoReal != null) return item.tiempoReal;
  const tiempoFijo = item.tiempoFijo || 0;
  const tiempoPorTirada = item.tiempoPorTirada || 0;
  const tiempoPorUnidad = item.tiempoPorUnidad || 0;
  const unidadesPorTirada = item.unidadesPorTirada || 1;
  const tiradas = unidadesPorTirada > 0 ? Math.ceil(cantidad / unidadesPorTirada) : cantidad;
  return tiempoFijo + (tiempoPorTirada * tiradas) + (tiempoPorUnidad * cantidad);
}

export default function ComponentesPage() {
  const { materiales, procesos, parametrosActuales: params, addMaterial, updateMaterial, deleteMaterial, loading } = useBudget();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MaterialComponente> | null>(null);

  const componentes = useMemo(() => materiales.filter(m => m.tipo === 'COM'), [materiales]);

  const filtered = componentes.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase()) || m.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const calcComponentCost = (comp: MaterialComponente): { costoMateriales: number; costoProcesos: number; costoTotal: number; costoUnitario: number; matBreakdown: any[]; procBreakdown: any[] } => {
    let costoMateriales = comp.costoBase || 0;
    let costoProcesos = 0;
    const matBreakdown: any[] = [];
    const procBreakdown: any[] = [];
    const qty = comp.cantidadProduccion > 1 ? comp.cantidadProduccion : 0;

    if (comp.composicion) {
      for (const item of comp.composicion) {
        if (item.procesoId && params) {
          const proceso = procesos.find(p => p.id === item.procesoId);
          if (proceso) {
            const costoMin = calcProcessCostPerMin(proceso.recurso, params);
            const tiempo = calcProcessTime(item, 1);
            const costo = costoMin * tiempo;
            costoProcesos += costo;
            procBreakdown.push({
              nombre: proceso.nombre, recurso: proceso.recurso, tiempo,
              costoTotal: costo, costoUnit: qty > 0 ? costo / qty : costo,
            });
          }
        } else {
          const mat = materiales.find(m => m.id === item.itemId);
          if (mat) {
            const costo = mat.costoBase * item.cantidad;
            costoMateriales += costo;
            matBreakdown.push({
              nombre: mat.nombre, unidad: mat.unidad, cantidad: item.cantidad,
              costoTotal: costo, costoUnit: qty > 0 ? costo / qty : costo,
            });
          }
        }
      }
    }

    // Subtract the initial costoBase we added, then add it to breakdown if > 0
    if (comp.costoBase > 0) {
      costoMateriales -= comp.costoBase; // remove double count
      matBreakdown.unshift({
        nombre: 'Costo base adicional', unidad: '-', cantidad: 1,
        costoTotal: comp.costoBase, costoUnit: qty > 0 ? comp.costoBase / qty : comp.costoBase,
      });
      costoMateriales += comp.costoBase;
    }

    const costoTotal = costoMateriales + costoProcesos;
    const costoUnitario = qty > 0 ? costoTotal / qty : costoTotal;

    return { costoMateriales, costoProcesos, costoTotal, costoUnitario, matBreakdown, procBreakdown };
  };

  const filteredWithCost = filtered.map(c => {
    const costs = calcComponentCost(c);
    return { ...c, ...costs };
  });

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(filteredWithCost);

  const matOptions = materiales.filter(m => m.tipo !== 'COM' && m.activo);
  const procOptions = procesos.filter(p => p.activo);

  const openNew = () => {
    setEditing({
      nombre: '', tipo: 'COM', unidad: 'un', costoBase: 0, descripcion: '', activo: true,
      composicion: [], esPlantilla: false, proveedor: '', cantidadProduccion: 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (m: MaterialComponente) => {
    setEditing({ ...m, composicion: [...(m.composicion || [])] });
    setDialogOpen(true);
  };

  const addComposicionMaterial = () => {
    if (!editing) return;
    const comp = [...(editing.composicion || [])];
    comp.push({ id: crypto.randomUUID(), itemId: matOptions[0]?.id || '', cantidad: 1 });
    setEditing({ ...editing, composicion: comp });
  };

  const addComposicionProceso = () => {
    if (!editing) return;
    const comp = [...(editing.composicion || [])];
    comp.push({
      id: crypto.randomUUID(), itemId: '', cantidad: 1, procesoId: procOptions[0]?.id || '',
      tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 1, unidadesPorTirada: 1, usarTiempoReal: false,
    });
    setEditing({ ...editing, composicion: comp });
  };

  const updateComposicion = (idx: number, updates: Partial<ComposicionItem>) => {
    if (!editing) return;
    const comp = [...(editing.composicion || [])];
    comp[idx] = { ...comp[idx], ...updates };
    setEditing({ ...editing, composicion: comp });
  };

  const removeComposicion = (idx: number) => {
    if (!editing) return;
    const comp = [...(editing.composicion || [])];
    comp.splice(idx, 1);
    setEditing({ ...editing, composicion: comp });
  };

  const handleSave = async () => {
    if (!editing?.nombre) return;
    const now = new Date().toISOString();
    if (editing.id) {
      await updateMaterial({ ...editing, tipo: 'COM', updatedAt: now } as MaterialComponente);
      toast.success('Componente actualizado');
    } else {
      const newItem: MaterialComponente = {
        ...editing as any,
        tipo: 'COM',
        id: crypto.randomUUID(),
        codigo: `COM-${Date.now().toString(36).toUpperCase()}`,
        esPlantilla: false,
        createdAt: now,
        updatedAt: now,
      };
      await addMaterial(newItem);
      toast.success('Componente creado');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este componente?')) {
      await deleteMaterial(id);
      toast.success('Componente eliminado');
    }
  };

  // Cost preview for dialog
  const editingCost = editing ? calcComponentCost(editing as MaterialComponente) : null;

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Componentes</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Nuevo Componente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar componente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Card grid like ProductosPage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(c => {
          const qty = c.cantidadProduccion > 1 ? c.cantidadProduccion : 0;
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(c)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{c.codigo}</p>
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{(c.composicion || []).length} ítems</p>
                  </div>
                  <Badge variant={c.activo ? "default" : "secondary"}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <Separator className="my-2" />
                {qty > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo producción</span>
                      <span className="text-muted-foreground">{formatARS(c.costoTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Salen</span>
                      <span>{qty} un.</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo unit.</span>
                  <span className="font-medium">{formatARS(c.costoUnitario)}</span>
                </div>

                {/* Collapsible cost breakdown */}
                {(c.matBreakdown.length > 0 || c.procBreakdown.length > 0) && (
                  <Collapsible>
                    <CollapsibleTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="w-full mt-2 gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronDown className="h-3 w-3" />
                        Desglose de costos
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent onClick={e => e.stopPropagation()}>
                      <div className="mt-2 space-y-2 text-xs">
                        {c.matBreakdown.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Materiales</p>
                            {c.matBreakdown.map((m: any, i: number) => (
                              <div key={i} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground truncate mr-2">{m.nombre} ({m.cantidad} {m.unidad})</span>
                                <span className="shrink-0 font-medium">{formatARS(m.costoUnit)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {c.procBreakdown.length > 0 && (
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Procesos</p>
                            {c.procBreakdown.map((pr: any, i: number) => (
                              <div key={i} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground truncate mr-2">{pr.nombre} ({pr.tiempo.toFixed(1)} min)</span>
                                <span className="shrink-0 font-medium">{formatARS(pr.costoUnit)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="flex gap-1 mt-3 justify-end">
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(c.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground">No hay componentes creados</div>
        )}
      </div>

      {/* Dialog with full builder */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Componente</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nombre</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
                <div>
                  <Label>Unidad</Label>
                  <Select value={editing.unidad} onValueChange={v => setEditing({ ...editing, unidad: v as Unidad })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Costo Base Adicional</Label><Input type="number" value={editing.costoBase || ''} onChange={e => setEditing({ ...editing, costoBase: Number(e.target.value) })} /></div>
                <div>
                  <Label>Cantidad que salen</Label>
                  <Input type="number" min={1} step={1} value={editing.cantidadProduccion || 1} onChange={e => setEditing({ ...editing, cantidadProduccion: Math.max(1, +e.target.value) })} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Unidades por producción</p>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={editing.activo !== false} onCheckedChange={v => setEditing({ ...editing, activo: v })} />
                  <Label>Activo</Label>
                </div>
              </div>
              <div><Label>Descripción</Label><Textarea value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} /></div>

              <Separator />

              {/* Materiales */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-base font-semibold">Materiales</Label>
                  <Button variant="outline" size="sm" onClick={addComposicionMaterial}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {(editing.composicion || []).filter(item => !item.procesoId).map((item, idx) => {
                  const realIdx = (editing.composicion || []).indexOf(item);
                  const mat = materiales.find(m => m.id === item.itemId);
                  const isArea = mat && (mat.unidad === 'm2' || mat.unidad === 'cm2');
                  return (
                    <div key={item.id} className="flex gap-2 mb-2 items-center flex-wrap">
                      <Select value={item.itemId} onValueChange={v => updateComposicion(realIdx, { itemId: v })}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{matOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre} ({m.unidad})</SelectItem>)}</SelectContent>
                      </Select>
                      {isArea ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Input type="number" step="any" className="w-20" placeholder="Alto"
                              value={(item as any).alto || ''}
                              onChange={e => {
                                const alto = +e.target.value;
                                const largo = (item as any).largo || 0;
                                updateComposicion(realIdx, { cantidad: +(alto * largo).toFixed(4), ...(({ alto, largo }) as any) });
                              }} />
                            <span className="text-xs text-muted-foreground">×</span>
                            <Input type="number" step="any" className="w-20" placeholder="Largo"
                              value={(item as any).largo || ''}
                              onChange={e => {
                                const largo = +e.target.value;
                                const alto = (item as any).alto || 0;
                                updateComposicion(realIdx, { cantidad: +(alto * largo).toFixed(4), ...(({ alto, largo }) as any) });
                              }} />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">= {item.cantidad} {mat.unidad}</span>
                        </>
                      ) : (
                        <Input type="number" step="any" className="w-24" placeholder="Cant." value={item.cantidad}
                          onChange={e => updateComposicion(realIdx, { cantidad: +e.target.value })} />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeComposicion(realIdx)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Procesos - same config as ProductosPage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-base font-semibold">Procesos</Label>
                  <Button variant="outline" size="sm" onClick={addComposicionProceso}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {(editing.composicion || []).filter(item => !!item.procesoId).map((item) => {
                  const realIdx = (editing.composicion || []).indexOf(item);
                  const proc = procesos.find(p => p.id === item.procesoId);
                  const isCO2 = proc?.recurso === 'CO2';
                  return (
                    <div key={item.id} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex gap-2 items-center">
                        <Select value={item.procesoId} onValueChange={v => updateComposicion(realIdx, { procesoId: v })}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{procOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre} ({p.recurso})</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => removeComposicion(realIdx)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      {isCO2 ? (
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">T. Tirada (min)</Label>
                            <Input type="number" step="any" value={item.tiempoPorTirada || 0} onChange={e => {
                              const newVal = +e.target.value;
                              const unPorTirada = item.unidadesPorTirada || 1;
                              updateComposicion(realIdx, {
                                tiempoPorTirada: newVal,
                                tiempoPorUnidad: +(newVal / unPorTirada).toFixed(4),
                              });
                            }} />
                          </div>
                          <div>
                            <Label className="text-xs">Un/Tirada</Label>
                            <Input type="number" min={1} value={item.unidadesPorTirada || 1} onChange={e => {
                              const newVal = Math.max(1, +e.target.value);
                              const tTirada = item.tiempoPorTirada || 0;
                              updateComposicion(realIdx, {
                                unidadesPorTirada: newVal,
                                tiempoPorUnidad: +(tTirada / newVal).toFixed(4),
                              });
                            }} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">T. Unidad (auto)</Label>
                            <p className="text-sm font-semibold mt-2">{((item.tiempoPorTirada || 0) / (item.unidadesPorTirada || 1)).toFixed(2)} min</p>
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
                            <Input type="number" step="any" value={item.tiempoPorUnidad || 0} onChange={e => {
                              updateComposicion(realIdx, {
                                tiempoPorUnidad: +e.target.value,
                                tiempoFijo: 0, tiempoPorTirada: 0, unidadesPorTirada: 1,
                              });
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

              {/* Cost preview */}
              {editingCost && editingCost.costoTotal > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Vista previa de costos</p>
                  <div className="flex justify-between text-sm"><span>Costo producción</span><span className="font-medium">{formatARS(editingCost.costoTotal)}</span></div>
                  {(editing.cantidadProduccion || 1) > 1 && (
                    <div className="flex justify-between text-sm"><span>Salen</span><span>{editing.cantidadProduccion} un.</span></div>
                  )}
                  <div className="flex justify-between text-sm font-semibold"><span>Costo unitario</span><span className="text-primary">{formatARS(editingCost.costoUnitario)}</span></div>
                  {editingCost.matBreakdown.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Materiales</p>
                      {editingCost.matBreakdown.map((m: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{m.nombre}</span>
                          <span>{formatARS(m.costoUnit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingCost.procBreakdown.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Procesos</p>
                      {editingCost.procBreakdown.map((pr: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{pr.nombre} ({pr.tiempo.toFixed(1)} min)</span>
                          <span>{formatARS(pr.costoUnit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
