import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBudget } from "@/hooks/useBudgetStore";
import { formatARS } from "@/lib/engine";
import { MaterialComponente, ItemTipo, Unidad } from "@/lib/types";
import { toast } from "sonner";

const TIPOS: { value: ItemTipo; label: string }[] = [
  { value: 'MAT', label: 'Material' },
  { value: 'COM', label: 'Componente' },
  { value: 'PAK', label: 'Packaging' },
  { value: 'LOG', label: 'Logística' },
  { value: 'ADI', label: 'Adicional' },
];

const UNIDADES: { value: Unidad; label: string }[] = [
  { value: 'm2', label: 'm²' },
  { value: 'cm2', label: 'cm²' },
  { value: 'ml', label: 'ml' },
  { value: 'un', label: 'Unidad' },
  { value: 'hr', label: 'Hora' },
  { value: 'min', label: 'Minuto' },
  { value: 'kg', label: 'Kg' },
  { value: 'mt', label: 'Metro' },
];

const tipoBadge: Record<ItemTipo, string> = {
  MAT: 'bg-primary/10 text-primary',
  COM: 'bg-accent/10 text-accent',
  PAK: 'bg-warning/10 text-warning',
  LOG: 'bg-muted text-muted-foreground',
  ADI: 'bg-secondary text-secondary-foreground',
};

function emptyMaterial(): Partial<MaterialComponente> {
  return { nombre: '', tipo: 'MAT', unidad: 'un', costoBase: 0, descripcion: '', activo: true, proveedor: '' };
}

export default function MaterialesPage() {
  const { materiales, addMaterial, updateMaterial, deleteMaterial, loading } = useBudget();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MaterialComponente> | null>(null);

  const filtered = materiales.filter(m => {
    const matchSearch = m.nombre.toLowerCase().includes(search.toLowerCase()) || m.codigo.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'all' || m.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(filtered);

  const openNew = () => { setEditing(emptyMaterial()); setDialogOpen(true); };
  const openEdit = (m: MaterialComponente) => { setEditing({ ...m }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nombre) return;
    const now = new Date().toISOString();
    if (editing.id) {
      await updateMaterial({ ...editing, updatedAt: now } as MaterialComponente);
      toast.success('Material actualizado');
    } else {
      const newItem: MaterialComponente = {
        ...editing as any,
        id: crypto.randomUUID(),
        codigo: `${editing.tipo}-${Date.now().toString(36).toUpperCase()}`,
        composicion: [],
        esPlantilla: false,
        createdAt: now,
        updatedAt: now,
      };
      await addMaterial(newItem);
      toast.success('Material creado');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este ítem?')) {
      await deleteMaterial(id);
      toast.success('Material eliminado');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Materiales y Componentes</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Nuevo</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <SortableHeader label="Código" sortKey="codigo" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                  <SortableHeader label="Nombre" sortKey="nombre" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                  <SortableHeader label="Tipo" sortKey="tipo" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                  <SortableHeader label="Unidad" sortKey="unidad" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                  <SortableHeader label="Costo Base" sortKey="costoBase" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-right" />
                  <SortableHeader label="Proveedor" sortKey="proveedor" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                  <SortableHeader label="Estado" sortKey="activo" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-center" />
                  <th className="table-header text-right p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-sm text-muted-foreground">{m.codigo}</td>
                    <td className="p-3 font-medium text-sm">{m.nombre}</td>
                    <td className="p-3"><Badge variant="secondary" className={tipoBadge[m.tipo]}>{m.tipo}</Badge></td>
                    <td className="p-3 text-sm text-muted-foreground">{UNIDADES.find(u => u.value === m.unidad)?.label || m.unidad}</td>
                    <td className="p-3 currency text-sm">{formatARS(m.costoBase)}</td>
                    <td className="p-3 text-sm text-muted-foreground">{(m as any).proveedor || '—'}</td>
                    <td className="p-3 text-center"><Badge variant={m.activo ? "default" : "secondary"}>{m.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No se encontraron ítems</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Material / Componente</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.tipo} onValueChange={v => setEditing({ ...editing, tipo: v as ItemTipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidad</Label>
                  <Select value={editing.unidad} onValueChange={v => setEditing({ ...editing, unidad: v as Unidad })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Costo Base (ARS)</Label><Input type="number" value={editing.costoBase || ''} onChange={e => setEditing({ ...editing, costoBase: Number(e.target.value) })} /></div>
              {(editing.unidad === 'm2' || editing.unidad === 'cm2') && (
                <div>
                  <Label>Dimensiones de la plancha ({editing.unidad === 'm2' ? 'metros' : 'centímetros'})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" step="any" placeholder="Alto"
                      value={editing.alto || ''}
                      onChange={e => {
                        const alto = +e.target.value;
                        const largo = editing.largo || 0;
                        setEditing({ ...editing, alto, largo, area: +(alto * largo).toFixed(4) });
                      }} />
                    <span className="text-sm text-muted-foreground">×</span>
                    <Input type="number" step="any" placeholder="Largo"
                      value={editing.largo || ''}
                      onChange={e => {
                        const largo = +e.target.value;
                        const alto = editing.alto || 0;
                        setEditing({ ...editing, alto, largo, area: +(alto * largo).toFixed(4) });
                      }} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">= {(editing.area || 0)} {editing.unidad}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Área total de la plancha para referencia de costo</p>
                </div>
              )}
              <div><Label>Descripción</Label><Textarea value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} /></div>
              <div><Label>Proveedor</Label><Input value={(editing as any).proveedor || ''} onChange={e => setEditing({ ...editing, proveedor: e.target.value } as any)} placeholder="Nombre del proveedor" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.activo !== false} onCheckedChange={v => setEditing({ ...editing, activo: v })} />
                <Label>Activo</Label>
              </div>
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
