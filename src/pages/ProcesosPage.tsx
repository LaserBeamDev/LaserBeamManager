import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
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
import { Proceso, RecursoTipo } from "@/lib/types";
import { toast } from "sonner";

const RECURSOS: { value: RecursoTipo; label: string }[] = [
  { value: 'CO2', label: 'Láser CO2' },
  { value: 'FIBRA', label: 'Láser Fibra' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'DISEÑO', label: 'Diseño' },
];

const recursoBadge: Record<RecursoTipo, string> = {
  CO2: 'bg-primary/10 text-primary',
  FIBRA: 'bg-accent/10 text-accent',
  MANUAL: 'bg-warning/10 text-warning',
  'DISEÑO': 'bg-secondary text-secondary-foreground',
};

export default function ProcesosPage() {
  const { procesos, addProceso, updateProceso, deleteProceso, loading } = useBudget();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Proceso> | null>(null);

  const openNew = () => { setEditing({ nombre: '', recurso: 'CO2', activo: true, descripcion: '' }); setDialogOpen(true); };
  const openEdit = (p: Proceso) => { setEditing({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nombre) return;
    const now = new Date().toISOString();
    if (editing.id) {
      await updateProceso(editing as Proceso);
      toast.success('Proceso actualizado');
    } else {
      await addProceso({
        ...editing as any,
        id: crypto.randomUUID(),
        codigo: `PROC-${Date.now().toString(36).toUpperCase()}`,
        createdAt: now,
      });
      toast.success('Proceso creado');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este proceso?')) {
      await deleteProceso(id);
      toast.success('Proceso eliminado');
    }
  };

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(procesos);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Procesos</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Nuevo Proceso</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <SortableHeader label="Código" sortKey="codigo" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                <SortableHeader label="Nombre" sortKey="nombre" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                <SortableHeader label="Recurso" sortKey="recurso" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                <SortableHeader label="Descripción" sortKey="descripcion" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-left" />
                <SortableHeader label="Estado" sortKey="activo" currentKey={sortKey as string} currentDir={sortDir} onSort={k => toggleSort(k as any)} className="text-center" />
                <th className="table-header text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-sm text-muted-foreground">{p.codigo}</td>
                  <td className="p-3 font-medium text-sm">{p.nombre}</td>
                  <td className="p-3"><Badge variant="secondary" className={recursoBadge[p.recurso]}>{p.recurso}</Badge></td>
                  <td className="p-3 text-sm text-muted-foreground">{p.descripcion}</td>
                  <td className="p-3 text-center"><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Proceso</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div>
                <Label>Recurso</Label>
                <Select value={editing.recurso} onValueChange={v => setEditing({ ...editing, recurso: v as RecursoTipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECURSOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descripción</Label><Textarea value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} /></div>
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
