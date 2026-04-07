import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Edit2, Trash2, Search, Store, Phone, MapPin, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CrmSupplier {
  id: string;
  user_id: string;
  nombre: string;
  contacto: string;
  direccion: string;
  producto_servicio: string;
  created_at: string;
  updated_at: string;
}

const emptySupplier = (): Partial<CrmSupplier> => ({
  nombre: '', contacto: '', direccion: '', producto_servicio: '',
});

export default function CrmProveedoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<CrmSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CrmSupplier> | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('crm_suppliers').select('*').order('nombre');
    if (data) setSuppliers(data as unknown as CrmSupplier[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const s = search.toLowerCase();
    return suppliers.filter(sup =>
      sup.nombre.toLowerCase().includes(s) || sup.contacto.toLowerCase().includes(s) || sup.producto_servicio.toLowerCase().includes(s)
    );
  }, [suppliers, search]);

  const handleSave = async () => {
    if (!user || !editing?.nombre) return;
    if (editing.id) {
      const { data } = await supabase.from('crm_suppliers').update({
        nombre: editing.nombre, contacto: editing.contacto, direccion: editing.direccion,
        producto_servicio: editing.producto_servicio,
      } as any).eq('id', editing.id).select().single();
      if (data) setSuppliers(prev => prev.map(s => s.id === editing.id ? data as unknown as CrmSupplier : s));
      toast({ title: 'Proveedor actualizado' });
    } else {
      const { data } = await supabase.from('crm_suppliers').insert({ ...editing, user_id: user.id } as any).select().single();
      if (data) setSuppliers(prev => [...prev, data as unknown as CrmSupplier]);
      toast({ title: 'Proveedor creado' });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    await supabase.from('crm_suppliers').delete().eq('id', id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Proveedor eliminado' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Proveedores</h1>
            <p className="text-xs text-slate-400 font-semibold">{suppliers.length} registrados</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(emptySupplier()); setDialogOpen(true); }} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 shadow-sm text-center">
          <Store className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm">No hay proveedores registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(sup => (
            <div key={sup.id} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">{sup.nombre}</p>
                  <div className="space-y-1 mt-2 text-xs text-slate-400">
                    {sup.contacto && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {sup.contacto}</p>}
                    {sup.direccion && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {sup.direccion}</p>}
                    {sup.producto_servicio && <p className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> {sup.producto_servicio}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...sup }); setDialogOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(sup.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nombre Completo *</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div><Label>Contacto (teléfono/email)</Label><Input value={editing.contacto || ''} onChange={e => setEditing({ ...editing, contacto: e.target.value })} /></div>
              <div><Label>Dirección</Label><Input value={editing.direccion || ''} onChange={e => setEditing({ ...editing, direccion: e.target.value })} /></div>
              <div><Label>Producto o Servicio que brinda</Label><Input value={editing.producto_servicio || ''} onChange={e => setEditing({ ...editing, producto_servicio: e.target.value })} /></div>
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
