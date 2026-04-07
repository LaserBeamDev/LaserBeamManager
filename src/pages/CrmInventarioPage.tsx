import { useState } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Package, AlertTriangle, Loader2, Edit3, Archive, TrendingDown, CheckCircle2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockItem {
  sku: string;
  nombre: string;
  cantidad: number;
  minStock: number;
}

function StockCard({ s, onUpdateStock }: { s: StockItem; onUpdateStock: (sku: string, qty: number, min: number) => Promise<void> }) {
  const { toast } = useToast();
  const isLow = s.cantidad <= s.minStock;
  const [editQty, setEditQty] = useState(s.cantidad);
  const [editMin, setEditMin] = useState(s.minStock);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await onUpdateStock(s.sku, editQty, editMin);
    toast({ title: 'Stock actualizado' });
    setIsEditing(false);
  };

  return (
    <div className={`bg-white rounded-3xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${isLow ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{s.sku}</span>
        {isLow ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black uppercase">
            <AlertTriangle className="h-3 w-3" /> Bajo
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase">OK</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-4 leading-tight">{s.nombre}</p>

      {isEditing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Actual</label>
              <input type="number" value={editQty} onChange={e => setEditQty(Number(e.target.value))} className="w-full p-2 bg-slate-50 border-2 border-indigo-200 rounded-xl text-center text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Mínimo</label>
              <input type="number" value={editMin} onChange={e => setEditMin(Number(e.target.value))} className="w-full p-2 bg-slate-50 border-2 border-indigo-200 rounded-xl text-center text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1">
              <Save className="h-3 w-3" /> Guardar
            </button>
            <button onClick={() => setIsEditing(false)} className="py-2 px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-3xl font-black ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>{s.cantidad}</p>
            <p className="text-[10px] text-slate-400 font-bold">mín: {s.minStock}</p>
          </div>
          <button onClick={() => { setEditQty(s.cantidad); setEditMin(s.minStock); setIsEditing(true); }} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CrmInventarioPage() {
  const { products, currentStocks, loading, addProduct, updateStock, updateProduct } = useCrm();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newControlaStock, setNewControlaStock] = useState(true);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState({ sku: '', nombre: '', controla_stock: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleAddProduct = async () => {
    if (!newSku.trim() || !newNombre.trim()) {
      toast({ title: 'Error', description: 'SKU y nombre son obligatorios', variant: 'destructive' });
      return;
    }
    await addProduct(newSku.trim().toUpperCase(), newNombre.trim(), newControlaStock);
    toast({ title: 'Producto agregado' });
    setNewSku(''); setNewNombre(''); setNewControlaStock(true); setAddOpen(false);
  };

  const startEditProduct = (p: typeof products[0]) => {
    setEditingProduct(p.id);
    setEditProductForm({ sku: p.sku, nombre: p.nombre, controla_stock: p.controla_stock });
  };

  const handleSaveProduct = async (id: string) => {
    await updateProduct(id, editProductForm);
    toast({ title: 'Producto actualizado' });
    setEditingProduct(null);
  };

  const totalProducts = products.length;
  const withStock = products.filter(p => p.controla_stock).length;
  const lowStockItems = currentStocks.filter(s => s.cantidad <= s.minStock);
  const okStockItems = currentStocks.filter(s => s.cantidad > s.minStock);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Inventario</h1>
          <p className="text-xs text-slate-400 font-semibold">{totalProducts} productos registrados</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Nuevo Producto
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-slate-800 font-black">Agregar Producto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</label>
                <input value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="PROD001" className="crm-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                <input value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Nombre del producto" className="crm-input mt-1" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch checked={newControlaStock} onCheckedChange={setNewControlaStock} />
                <span className="text-sm font-semibold text-slate-600">Controla stock</span>
              </label>
              <button onClick={handleAddProduct} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
                Agregar Producto
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-indigo-50"><Package className="h-5 w-5 text-indigo-600" /></div>
          </div>
          <p className="text-2xl font-black text-slate-800">{totalProducts}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Productos</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-emerald-50"><Archive className="h-5 w-5 text-emerald-600" /></div>
          </div>
          <p className="text-2xl font-black text-slate-800">{withStock}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con Control Stock</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-rose-50"><TrendingDown className="h-5 w-5 text-rose-600" /></div>
          </div>
          <p className="text-2xl font-black text-rose-600">{lowStockItems.length}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Bajo</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-emerald-50"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{okStockItems.length}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock OK</p>
        </div>
      </div>

      {/* Stock Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-700">Control de Stock</h3>
        </div>
        {currentStocks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200/60">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No hay productos con control de stock
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentStocks.map(s => (
              <StockCard key={s.sku} s={s} onUpdateStock={updateStock} />
            ))}
          </div>
        )}
      </div>

      {/* All Products - Editable */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Catálogo Completo</h3>
        {products.length === 0 ? (
          <p className="text-slate-400 text-sm">Agregá tu primer producto con el botón "Nuevo Producto".</p>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${editingProduct === p.id ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                {editingProduct === p.id ? (
                  <>
                    <input value={editProductForm.sku} onChange={e => setEditProductForm(f => ({ ...f, sku: e.target.value }))} className="w-28 p-2 bg-white border-2 border-indigo-200 rounded-xl text-xs font-mono font-bold outline-none" />
                    <input value={editProductForm.nombre} onChange={e => setEditProductForm(f => ({ ...f, nombre: e.target.value }))} className="flex-1 p-2 bg-white border-2 border-indigo-200 rounded-xl text-sm outline-none" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={editProductForm.controla_stock} onCheckedChange={v => setEditProductForm(f => ({ ...f, controla_stock: v }))} />
                      <span className="text-[10px] font-bold text-slate-400">Stock</span>
                    </label>
                    <button onClick={() => handleSaveProduct(p.id)} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingProduct(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${p.controla_stock ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>
                      {p.sku}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{p.nombre}</span>
                    {p.controla_stock && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">STOCK</span>
                    )}
                    <button onClick={() => startEditProduct(p)} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
