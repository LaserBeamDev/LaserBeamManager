import { useState, useRef } from 'react';
import { Plus, Printer, Trash2, Edit3, Eye, X, Package, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MEDIOS_ENVIO } from '@/lib/crm-types';

type RemitoTipo = 'envio' | 'entrega';

interface Sender {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  telefono: string;
  documento: string;
}

interface Remito {
  id: string;
  tipo: RemitoTipo;
  fecha: string;
  numero: string;
  remitente_nombre: string;
  remitente_direccion: string;
  remitente_localidad: string;
  remitente_provincia: string;
  remitente_cp: string;
  remitente_telefono: string;
  remitente_documento: string;
  destinatario_nombre: string;
  destinatario_direccion: string;
  destinatario_localidad: string;
  destinatario_provincia: string;
  destinatario_cp: string;
  destinatario_telefono: string;
  destinatario_documento: string;
  medio_envio: string;
  cantidad_bultos: number;
  observaciones: string;
  valor_declarado: number;
}

const DEFAULT_SENDER: Sender = {
  id: 'default',
  nombre: 'LaserBeam',
  direccion: '',
  localidad: '',
  provincia: 'Buenos Aires',
  cp: '',
  telefono: '',
  documento: '',
};

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

function loadSenders(): Sender[] {
  try {
    const saved = JSON.parse(localStorage.getItem('remito_senders') || '[]');
    if (saved.length === 0) return [DEFAULT_SENDER];
    return saved;
  } catch { return [DEFAULT_SENDER]; }
}

function saveSenders(senders: Sender[]) {
  localStorage.setItem('remito_senders', JSON.stringify(senders));
}

const emptyRemito = (tipo: RemitoTipo, sender: Sender): Remito => ({
  id: crypto.randomUUID(),
  tipo,
  fecha: new Date().toISOString().slice(0, 10),
  numero: `R-${Date.now().toString().slice(-6)}`,
  remitente_nombre: sender.nombre,
  remitente_direccion: sender.direccion,
  remitente_localidad: sender.localidad,
  remitente_provincia: sender.provincia,
  remitente_cp: sender.cp,
  remitente_telefono: sender.telefono,
  remitente_documento: sender.documento,
  destinatario_nombre: '',
  destinatario_direccion: '',
  destinatario_localidad: '',
  destinatario_provincia: '',
  destinatario_cp: '',
  destinatario_telefono: '',
  destinatario_documento: '',
  medio_envio: tipo === 'entrega' ? 'Retira en taller' : '',
  cantidad_bultos: 1,
  observaciones: '',
  valor_declarado: 0,
});

export default function CrmRemitosPage() {
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [editing, setEditing] = useState<Remito | null>(null);
  const [previewing, setPreviewing] = useState<Remito | null>(null);
  const [senders, setSenders] = useState<Sender[]>(loadSenders);
  const [managingSenders, setManagingSenders] = useState(false);
  const [editingSender, setEditingSender] = useState<Sender | null>(null);
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || 'default');
  const printRef = useRef<HTMLDivElement>(null);

  const getSelectedSender = () => senders.find(s => s.id === selectedSenderId) || senders[0] || DEFAULT_SENDER;

  const handleNew = (tipo: RemitoTipo) => {
    const r = emptyRemito(tipo, getSelectedSender());
    setEditing(r);
  };

  const handleSave = () => {
    if (!editing) return;
    setRemitos(prev => {
      const exists = prev.find(r => r.id === editing.id);
      if (exists) return prev.map(r => r.id === editing.id ? editing : r);
      return [editing, ...prev];
    });
    toast.success('Remito guardado');
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    setRemitos(prev => prev.filter(r => r.id !== id));
    toast.success('Remito eliminado');
  };

  const handlePrint = (remito: Remito) => {
    setPreviewing(remito);
    setTimeout(() => {
      const content = document.getElementById('remito-print-area');
      if (!content) return;
      const win = window.open('', '_blank');
      if (!win) { toast.error('Bloqueador de popups activo'); return; }
      win.document.write(`
        <html><head><title>Remito ${remito.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 8px; color: #111; }
          .remito-copy { page-break-after: always; padding: 15px; border: 2px solid #111; margin-bottom: 10px; }
          .remito-copy:last-child { page-break-after: auto; }
          .remito-header { text-align: center; border-bottom: 3px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
          .remito-header h1 { font-size: 22px; letter-spacing: 2px; }
          .remito-header p { font-size: 10px; color: #555; }
          .copy-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .section { border: 1px solid #333; padding: 8px; margin-bottom: 8px; }
          .section-title { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; background: #f0f0f0; padding: 3px 8px; }
          .row { display: flex; gap: 12px; margin-bottom: 3px; }
          .row .label { font-weight: bold; min-width: 80px; }
          .signatures { margin-top: 25px; display: flex; justify-content: space-between; }
          .signature { border-top: 2px solid #333; width: 220px; text-align: center; padding-top: 8px; margin-top: 60px; font-size: 12px; font-weight: bold; }
          @media print { body { padding: 5px; } .remito-copy { border: 1.5px solid #111; } }
        </style></head><body>
        ${content.innerHTML}
        </body></html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
      setPreviewing(null);
    }, 100);
  };

  const handleSaveSender = () => {
    if (!editingSender) return;
    const updated = senders.some(s => s.id === editingSender.id)
      ? senders.map(s => s.id === editingSender.id ? editingSender : s)
      : [...senders, editingSender];
    setSenders(updated);
    saveSenders(updated);
    setEditingSender(null);
    toast.success('Remitente guardado');
  };

  const handleDeleteSender = (id: string) => {
    if (senders.length <= 1) { toast.error('Debe haber al menos un remitente'); return; }
    const updated = senders.filter(s => s.id !== id);
    setSenders(updated);
    saveSenders(updated);
    if (selectedSenderId === id) setSelectedSenderId(updated[0].id);
    toast.success('Remitente eliminado');
  };

  const loadSenderIntoEditing = (senderId: string) => {
    if (!editing) return;
    const sender = senders.find(s => s.id === senderId);
    if (!sender) return;
    setEditing({
      ...editing,
      remitente_nombre: sender.nombre,
      remitente_direccion: sender.direccion,
      remitente_localidad: sender.localidad,
      remitente_provincia: sender.provincia,
      remitente_cp: sender.cp,
      remitente_telefono: sender.telefono,
      remitente_documento: sender.documento,
    });
    setSelectedSenderId(senderId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-foreground">Remitos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManagingSenders(true)} className="gap-2 text-xs">
            <Edit3 className="h-3 w-3" /> Remitentes
          </Button>
          <Button onClick={() => handleNew('envio')} className="gap-2">
            <Plus className="h-4 w-4" /> Remito Envío
          </Button>
          <Button onClick={() => handleNew('entrega')} variant="secondary" className="gap-2">
            <Plus className="h-4 w-4" /> Remito Entrega
          </Button>
        </div>
      </div>

      {remitos.length === 0 && !editing && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-bold">No hay remitos creados</p>
          <p className="text-sm">Creá un remito de envío (expreso) o de entrega (retiro en taller)</p>
        </div>
      )}

      <div className="grid gap-3">
        {remitos.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-foreground">{r.numero} — {r.fecha}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.tipo === 'envio' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {r.tipo === 'envio' ? 'ENVÍO' : 'ENTREGA'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.destinatario_nombre} → {r.tipo === 'entrega' ? 'Retira en taller' : `${r.destinatario_localidad}, ${r.destinatario_provincia}`}
              </p>
              <p className="text-xs text-muted-foreground">{r.cantidad_bultos} bulto(s) · {r.medio_envio}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setPreviewing(r)} title="Ver"><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handlePrint(r)} title="Imprimir"><Printer className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(r)} title="Editar"><Edit3 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing && remitos.find(r => r.id === editing.id) ? 'Editar' : 'Nuevo'} Remito {editing?.tipo === 'envio' ? 'de Envío' : 'de Entrega'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Nº Remito</Label><Input value={editing.numero} onChange={e => setEditing({ ...editing, numero: e.target.value })} /></div>
                <div><Label className="text-xs">Fecha</Label><Input type="date" value={editing.fecha} onChange={e => setEditing({ ...editing, fecha: e.target.value })} /></div>
              </div>

              {/* Remitente with sender selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-foreground bg-muted px-3 py-1.5 rounded-lg">REMITENTE</h3>
                  <Select value={selectedSenderId} onValueChange={v => loadSenderIntoEditing(v)}>
                    <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Seleccionar remitente" /></SelectTrigger>
                    <SelectContent>{senders.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nombre / Razón Social</Label><Input value={editing.remitente_nombre} onChange={e => setEditing({ ...editing, remitente_nombre: e.target.value })} /></div>
                  <div><Label className="text-xs">DNI / CUIT</Label><Input value={editing.remitente_documento} onChange={e => setEditing({ ...editing, remitente_documento: e.target.value })} /></div>
                  <div className="col-span-2"><Label className="text-xs">Dirección</Label><Input value={editing.remitente_direccion} onChange={e => setEditing({ ...editing, remitente_direccion: e.target.value })} /></div>
                  <div><Label className="text-xs">Localidad</Label><Input value={editing.remitente_localidad} onChange={e => setEditing({ ...editing, remitente_localidad: e.target.value })} /></div>
                  <div><Label className="text-xs">Provincia</Label>
                    <Select value={editing.remitente_provincia} onValueChange={v => setEditing({ ...editing, remitente_provincia: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">CP</Label><Input value={editing.remitente_cp} onChange={e => setEditing({ ...editing, remitente_cp: e.target.value })} /></div>
                  <div><Label className="text-xs">Teléfono</Label><Input value={editing.remitente_telefono} onChange={e => setEditing({ ...editing, remitente_telefono: e.target.value })} /></div>
                </div>
              </div>

              {/* Destinatario */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2 bg-muted px-3 py-1.5 rounded-lg">
                  {editing.tipo === 'entrega' ? 'RECEPTOR (quien retira)' : 'DESTINATARIO'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nombre</Label><Input value={editing.destinatario_nombre} onChange={e => setEditing({ ...editing, destinatario_nombre: e.target.value })} /></div>
                  <div><Label className="text-xs">DNI / CUIT</Label><Input value={editing.destinatario_documento} onChange={e => setEditing({ ...editing, destinatario_documento: e.target.value })} /></div>
                  {editing.tipo === 'envio' && (
                    <>
                      <div className="col-span-2"><Label className="text-xs">Dirección</Label><Input value={editing.destinatario_direccion} onChange={e => setEditing({ ...editing, destinatario_direccion: e.target.value })} /></div>
                      <div><Label className="text-xs">Localidad</Label><Input value={editing.destinatario_localidad} onChange={e => setEditing({ ...editing, destinatario_localidad: e.target.value })} /></div>
                      <div><Label className="text-xs">Provincia</Label>
                        <Select value={editing.destinatario_provincia} onValueChange={v => setEditing({ ...editing, destinatario_provincia: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">CP</Label><Input value={editing.destinatario_cp} onChange={e => setEditing({ ...editing, destinatario_cp: e.target.value })} /></div>
                    </>
                  )}
                  <div><Label className="text-xs">Teléfono</Label><Input value={editing.destinatario_telefono} onChange={e => setEditing({ ...editing, destinatario_telefono: e.target.value })} /></div>
                </div>
              </div>

              {/* Datos de envío */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2 bg-muted px-3 py-1.5 rounded-lg">
                  {editing.tipo === 'entrega' ? 'DATOS DE ENTREGA' : 'DATOS DE ENVÍO'}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {editing.tipo === 'envio' && (
                    <div><Label className="text-xs">Medio de envío</Label>
                      <Select value={editing.medio_envio} onValueChange={v => setEditing({ ...editing, medio_envio: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{MEDIOS_ENVIO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label className="text-xs">Cantidad de bultos</Label><Input type="number" min={1} value={editing.cantidad_bultos} onChange={e => setEditing({ ...editing, cantidad_bultos: Math.max(1, +e.target.value) })} /></div>
                  <div><Label className="text-xs">Valor Declarado ($)</Label><Input type="number" value={editing.valor_declarado || ''} onChange={e => setEditing({ ...editing, valor_declarado: +e.target.value })} /></div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Observaciones / Contenido</Label>
                <Textarea value={editing.observaciones} onChange={e => setEditing({ ...editing, observaciones: e.target.value })} placeholder="Descripción del contenido, instrucciones, fragilidad..." rows={3} />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={() => { handleSave(); handlePrint(editing); }} variant="secondary" className="gap-1"><Printer className="h-4 w-4" />Guardar e Imprimir</Button>
                <Button onClick={handleSave}>Guardar Remito</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => { if (!o) setPreviewing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vista Previa: {previewing?.numero}</span>
              {previewing && <Button size="sm" onClick={() => handlePrint(previewing)} className="gap-1"><Printer className="h-4 w-4" />Imprimir</Button>}
            </DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="border border-border rounded-lg p-6 bg-white text-black text-sm">
              <RemitoPreviewSingle remito={previewing} copyLabel="ORIGINAL" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Senders Dialog */}
      <Dialog open={managingSenders} onOpenChange={setManagingSenders}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Remitentes Guardados</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {senders.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div>
                  <p className="font-bold text-sm">{s.nombre}</p>
                  <p className="text-xs text-muted-foreground">{s.direccion || 'Sin dirección'} — {s.localidad}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSender({ ...s })}><Edit3 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSender(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={() => setEditingSender({ id: crypto.randomUUID(), nombre: '', direccion: '', localidad: '', provincia: 'Buenos Aires', cp: '', telefono: '', documento: '' })}>
              <Plus className="h-4 w-4" /> Agregar Remitente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sender Dialog */}
      <Dialog open={!!editingSender} onOpenChange={o => { if (!o) setEditingSender(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{senders.find(s => s.id === editingSender?.id) ? 'Editar' : 'Nuevo'} Remitente</DialogTitle></DialogHeader>
          {editingSender && (
            <div className="space-y-3">
              <div><Label className="text-xs">Nombre / Razón Social</Label><Input value={editingSender.nombre} onChange={e => setEditingSender({ ...editingSender, nombre: e.target.value })} /></div>
              <div><Label className="text-xs">DNI / CUIT</Label><Input value={editingSender.documento} onChange={e => setEditingSender({ ...editingSender, documento: e.target.value })} /></div>
              <div><Label className="text-xs">Dirección</Label><Input value={editingSender.direccion} onChange={e => setEditingSender({ ...editingSender, direccion: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Localidad</Label><Input value={editingSender.localidad} onChange={e => setEditingSender({ ...editingSender, localidad: e.target.value })} /></div>
                <div><Label className="text-xs">Provincia</Label>
                  <Select value={editingSender.provincia} onValueChange={v => setEditingSender({ ...editingSender, provincia: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">CP</Label><Input value={editingSender.cp} onChange={e => setEditingSender({ ...editingSender, cp: e.target.value })} /></div>
                <div><Label className="text-xs">Teléfono</Label><Input value={editingSender.telefono} onChange={e => setEditingSender({ ...editingSender, telefono: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingSender(null)}>Cancelar</Button>
                <Button onClick={handleSaveSender} className="gap-1"><Save className="h-4 w-4" />Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden print area - TRIPLICADO */}
      <div className="hidden">
        <div id="remito-print-area" ref={printRef}>
          {previewing && (
            <>
              <RemitoPreviewSingle remito={previewing} copyLabel="ORIGINAL — Remitente" />
              <RemitoPreviewSingle remito={previewing} copyLabel="DUPLICADO — Transportista" />
              <RemitoPreviewSingle remito={previewing} copyLabel="TRIPLICADO — Destinatario" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RemitoPreviewSingle({ remito, copyLabel }: { remito: Remito; copyLabel: string }) {
  const isEntrega = remito.tipo === 'entrega';
  return (
    <div className="remito-copy" style={{ pageBreakAfter: 'always', padding: '15px', border: '2px solid #111', marginBottom: '10px' }}>
      <div style={{ textAlign: 'center', borderBottom: '3px solid #111', paddingBottom: '8px', marginBottom: '12px' }}>
        <h1 style={{ fontSize: '22px', letterSpacing: '2px', fontWeight: 'bold' }}>
          {isEntrega ? 'REMITO DE ENTREGA' : 'REMITO DE ENVÍO'}
        </h1>
        <p style={{ fontSize: '10px', color: '#555' }}>Nº {remito.numero} — Fecha: {remito.fecha}</p>
        <p style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>{copyLabel}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1, border: '1px solid #333', padding: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', background: '#f0f0f0', padding: '3px 8px' }}>REMITENTE</div>
          <p><strong>Nombre:</strong> {remito.remitente_nombre}</p>
          <p><strong>Documento:</strong> {remito.remitente_documento}</p>
          <p><strong>Dirección:</strong> {remito.remitente_direccion}</p>
          <p><strong>Localidad:</strong> {remito.remitente_localidad} — CP: {remito.remitente_cp}</p>
          <p><strong>Provincia:</strong> {remito.remitente_provincia}</p>
          <p><strong>Teléfono:</strong> {remito.remitente_telefono}</p>
        </div>
        <div style={{ flex: 1, border: '1px solid #333', padding: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', background: '#f0f0f0', padding: '3px 8px' }}>
            {isEntrega ? 'RECEPTOR' : 'DESTINATARIO'}
          </div>
          <p><strong>Nombre:</strong> {remito.destinatario_nombre}</p>
          <p><strong>Documento:</strong> {remito.destinatario_documento}</p>
          {!isEntrega && (
            <>
              <p><strong>Dirección:</strong> {remito.destinatario_direccion}</p>
              <p><strong>Localidad:</strong> {remito.destinatario_localidad} — CP: {remito.destinatario_cp}</p>
              <p><strong>Provincia:</strong> {remito.destinatario_provincia}</p>
            </>
          )}
          <p><strong>Teléfono:</strong> {remito.destinatario_telefono}</p>
        </div>
      </div>

      <div style={{ border: '1px solid #333', padding: '8px', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', background: '#f0f0f0', padding: '3px 8px' }}>
          {isEntrega ? 'DATOS DE ENTREGA' : 'DATOS DEL ENVÍO'}
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {!isEntrega && <p><strong>Medio:</strong> {remito.medio_envio}</p>}
          <p><strong>Cantidad de bultos:</strong> {remito.cantidad_bultos}</p>
          <p><strong>Valor Declarado:</strong> ${remito.valor_declarado || 0}</p>
        </div>
      </div>

      {remito.observaciones && (
        <div style={{ border: '1px solid #333', padding: '8px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px', background: '#f0f0f0', padding: '3px 8px' }}>OBSERVACIONES / CONTENIDO</div>
          <p>{remito.observaciones}</p>
        </div>
      )}

      <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ borderTop: '2px solid #333', width: '220px', textAlign: 'center', paddingTop: '8px', marginTop: '60px', fontSize: '12px', fontWeight: 'bold' }}>
          Firma Remitente
        </div>
        {!isEntrega && (
          <div style={{ borderTop: '2px solid #333', width: '220px', textAlign: 'center', paddingTop: '8px', marginTop: '60px', fontSize: '12px', fontWeight: 'bold' }}>
            Firma Transportista
          </div>
        )}
        <div style={{ borderTop: '2px solid #333', width: '220px', textAlign: 'center', paddingTop: '8px', marginTop: '60px', fontSize: '12px', fontWeight: 'bold' }}>
          {isEntrega ? 'Firma Receptor' : 'Firma Destinatario'}
        </div>
      </div>
    </div>
  );
}
