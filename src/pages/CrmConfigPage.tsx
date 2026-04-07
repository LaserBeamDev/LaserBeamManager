import { useState, useEffect } from 'react';
import { useCrm } from '@/hooks/useCrm';
import { Loader2, Plus, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MercadoPagoAccountsManager from '@/components/MercadoPagoAccountsManager';

type ConfigKey = 'suppliers' | 'payment_methods' | 'vendors' | 'accounts_ingresos' | 'accounts_egresos' | 'imputables_ingresos' | 'imputables_egresos';

const CONFIG_TABS: { key: ConfigKey; label: string }[] = [
  { key: 'suppliers', label: 'Proveedores' },
  { key: 'payment_methods', label: 'Medios de Pago' },
  { key: 'vendors', label: 'Vendedores' },
  { key: 'accounts_ingresos', label: 'Cuentas Ingresos' },
  { key: 'accounts_egresos', label: 'Cuentas Egresos' },
  { key: 'imputables_ingresos', label: 'Imputables Ingresos' },
  { key: 'imputables_egresos', label: 'Imputables Egresos' },
];

export default function CrmConfigPage() {
  const { config, loading, ensureConfig, updateConfig } = useCrm();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConfigKey>('suppliers');
  const [newItem, setNewItem] = useState('');

  useEffect(() => { ensureConfig(); }, [ensureConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const items: string[] = (config as any)?.[activeTab] || [];

  const handleAdd = async () => {
    const val = newItem.trim();
    if (!val) return;
    if (items.includes(val)) {
      toast({ title: 'Ya existe', variant: 'destructive' });
      return;
    }
    await updateConfig({ [activeTab]: [...items, val] });
    setNewItem('');
    toast({ title: 'Agregado' });
  };

  const handleRemove = async (item: string) => {
    await updateConfig({ [activeTab]: items.filter(i => i !== item) });
    toast({ title: 'Eliminado' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-indigo-600" />
        </div>
        <h1 className="text-xl font-black text-slate-800">Configuración</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {CONFIG_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setNewItem(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">
          {CONFIG_TABS.find(t => t.key === activeTab)?.label}
        </h3>

        {/* Add new */}
        <div className="flex gap-2 mb-6">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Agregar nuevo..."
            className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No hay elementos configurados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 group hover:border-rose-200 hover:bg-rose-50/50 transition-all"
              >
                {item}
                <button
                  onClick={() => handleRemove(item)}
                  className="p-0.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-100 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MercadoPago Accounts */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <MercadoPagoAccountsManager />
      </div>
    </div>
  );
}
