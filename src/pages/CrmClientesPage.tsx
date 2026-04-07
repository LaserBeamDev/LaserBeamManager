import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCrm } from '@/hooks/useCrm';
import { Loader2, Plus, Edit2, Trash2, Search, Users, ShoppingBag, Star, Phone, Mail, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round(amount * 100) / 100);

interface CrmClient {
  id: string;
  user_id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  cuit_dni: string;
  razon_social: string;
  rubro: string;
  condicion_fiscal: string;
  notas: string;
  created_at: string;
  updated_at: string;
}

const emptyClient = (): Partial<CrmClient> => ({
  nombre: '', telefono: '', email: '', direccion: '', cuit_dni: '', razon_social: '', rubro: '', condicion_fiscal: '', notas: '',
});

export default function CrmClientesPage() {
  const { user } = useAuth();
  const { transactions } = useCrm();
  const { toast } = useToast();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CrmClient> | null>(null);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('crm_clients').select('*').order('nombre');
    if (data) setClients(data as unknown as CrmClient[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const s = search.toLowerCase();
    return clients.filter(c =>
      c.nombre.toLowerCase().includes(s) || c.telefono.includes(s) || c.email.toLowerCase().includes(s) || c.razon_social.toLowerCase().includes(s)
    );
  }, [clients, search]);

  const handleSave = async () => {
    if (!user || !editing?.nombre) return;
    if (editing.id) {
      const { data } = await supabase.from('crm_clients').update({
        nombre: editing.nombre, telefono: editing.telefono, email: editing.email, direccion: editing.direccion,
        cuit_dni: editing.cuit_dni, razon_social: editing.razon_social, rubro: editing.rubro,
        condicion_fiscal: editing.condicion_fiscal, notas: editing.notas,
      } as any).eq('id', editing.id).select().single();
      if (data) setClients(prev => prev.map(c => c.id === editing.id ? data as unknown as CrmClient : c));
      toast({ title: 'Cliente actualizado' });
    } else {
      const { data } = await supabase.from('crm_clients').insert({ ...editing, user_id: user.id } as any).select().single();
      if (data) setClients(prev => [...prev, data as unknown as CrmClient]);
      toast({ title: 'Cliente creado' });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await supabase.from('crm_clients').delete().eq('id', id);
    setClients(prev => prev.filter(c => c.id !== id));
    if (selectedClient?.id === id) setSelectedClient(null);
    toast({ title: 'Cliente eliminado' });
  };

  // Client stats from transactions
  const clientStats = useMemo(() => {
    if (!selectedClient) return null;
    const name = selectedClient.nombre.toLowerCase();
    const clientTxs = transactions.filter(tx =>
      tx.tipo === 'Ingreso' && tx.estado !== 'Cancelado' && tx.cliente.toLowerCase() === name
    );
    const totalGastado = clientTxs.reduce((a, t) => a + Number(t.total), 0);
    const totalPedidos = new Set(clientTxs.map(t => t.numero_orden || t.id)).size;
    const ticketPromedio = totalPedidos > 0 ? totalGastado / totalPedidos : 0;
    const ultimoPedido = clientTxs.length > 0 ? clientTxs.sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null;

    // Products breakdown
    const skuMap = new Map<string, number>();
    clientTxs.forEach(tx => {
      const items = tx.items && tx.items.length > 0 ? tx.items : [{ sku: tx.sku, unidades: tx.unidades }];
      items.forEach((item: any) => {
        if (item.sku) skuMap.set(item.sku, (skuMap.get(item.sku) || 0) + (item.unidades || 0));
      });
    });
    const topProducts = Array.from(skuMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { totalGastado, totalPedidos, ticketPromedio, ultimoPedido, topProducts };
  }, [selectedClient, transactions]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Clientes</h1>
            <p className="text-xs text-slate-400 font-semibold">{clients.length} registrados</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(emptyClient()); setDialogOpen(true); }} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar por nombre, teléfono, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/60 p-12 shadow-sm text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">No hay clientes registrados</p>
            </div>
          ) : (
            filtered.map(client => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${selectedClient?.id === client.id ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200/60'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{client.nombre}</p>
                    {client.razon_social && <p className="text-xs text-slate-400">{client.razon_social}</p>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                      {client.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.telefono}</span>}
                      {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>}
                      {client.direccion && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.direccion}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing({ ...client }); setDialogOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {selectedClient && clientStats ? (
            <>
              <div className="bg-white rounded-3xl border border-violet-200/60 p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-700 mb-4">📊 Estadísticas de {selectedClient.nombre}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Compras</p>
                    <p className="text-lg font-black text-emerald-600 font-mono">${formatCurrency(clientStats.totalGastado)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pedidos</p>
                    <p className="text-lg font-black text-indigo-600">{clientStats.totalPedidos}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ticket Promedio</p>
                    <p className="text-lg font-black text-blue-600 font-mono">${formatCurrency(clientStats.ticketPromedio)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Último Pedido</p>
                    <p className="text-sm font-bold text-slate-600">{clientStats.ultimoPedido || '—'}</p>
                  </div>
                </div>
              </div>

              {clientStats.topProducts.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
                  <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" /> Productos Favoritos
                  </h3>
                  <div className="space-y-2">
                    {clientStats.topProducts.map(([sku, qty]) => (
                      <div key={sku} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <ShoppingBag className="h-3 w-3 text-slate-400" /> {sku}
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-600">{qty} un.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra info */}
              <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm text-xs space-y-2">
                {selectedClient.cuit_dni && <p><span className="font-bold text-slate-500">CUIT/DNI:</span> {selectedClient.cuit_dni}</p>}
                {selectedClient.condicion_fiscal && <p><span className="font-bold text-slate-500">Cond. Fiscal:</span> {selectedClient.condicion_fiscal}</p>}
                {selectedClient.rubro && <p><span className="font-bold text-slate-500">Rubro:</span> {selectedClient.rubro}</p>}
                {selectedClient.notas && <p><span className="font-bold text-slate-500">Notas:</span> {selectedClient.notas}</p>}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-slate-400 text-xs">Seleccioná un cliente para ver sus estadísticas</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar' : 'Nuevo'} Cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Nombre *</Label><Input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Teléfono</Label><Input value={editing.telefono || ''} onChange={e => setEditing({ ...editing, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
              </div>
              <div><Label>Dirección</Label><Input value={editing.direccion || ''} onChange={e => setEditing({ ...editing, direccion: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CUIT/DNI</Label><Input value={editing.cuit_dni || ''} onChange={e => setEditing({ ...editing, cuit_dni: e.target.value })} /></div>
                <div><Label>Condición Fiscal</Label><Input value={editing.condicion_fiscal || ''} onChange={e => setEditing({ ...editing, condicion_fiscal: e.target.value })} /></div>
              </div>
              <div><Label>Razón Social</Label><Input value={editing.razon_social || ''} onChange={e => setEditing({ ...editing, razon_social: e.target.value })} /></div>
              <div><Label>Rubro</Label><Input value={editing.rubro || ''} onChange={e => setEditing({ ...editing, rubro: e.target.value })} /></div>
              <div><Label>Notas</Label><Textarea value={editing.notas || ''} onChange={e => setEditing({ ...editing, notas: e.target.value })} rows={2} /></div>
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
