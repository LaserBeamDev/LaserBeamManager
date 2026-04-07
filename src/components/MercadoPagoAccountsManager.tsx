import { useState } from 'react';
import { useMercadoPago, MpAccount } from '@/hooks/useMercadoPago';
import {
  Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff,
  Wallet, RefreshCw, Link2, CreditCard,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function MercadoPagoAccountsManager() {
  const { accounts, loading, addAccount, deleteAccount, verifyAccount, getBalance } = useMercadoPago();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [nombre, setNombre] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [mpUsers, setMpUsers] = useState<Record<string, any>>({});

  const handleAdd = async () => {
    if (!nombre.trim() || !token.trim()) return;
    setSaving(true);
    try {
      const account = await addAccount(nombre.trim(), token.trim());
      if (account) {
        // Verify immediately
        try {
          const result = await verifyAccount(account.id);
          if (result.valid) {
            setMpUsers(prev => ({ ...prev, [account.id]: result.user }));
            toast({ title: `✅ ${nombre} conectada`, description: `Usuario: ${result.user?.nickname}` });
          } else {
            toast({ title: '⚠️ Token inválido', description: 'La cuenta se guardó pero el token parece incorrecto', variant: 'destructive' });
          }
        } catch { /* ignore verify error */ }
      }
      setNombre('');
      setToken('');
      setShowAdd(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (account: MpAccount) => {
    setVerifying(account.id);
    try {
      const result = await verifyAccount(account.id);
      if (result.valid) {
        setMpUsers(prev => ({ ...prev, [account.id]: result.user }));
        toast({ title: '✅ Conexión válida', description: `${result.user?.nickname} (${result.user?.email})` });
      } else {
        toast({ title: '❌ Token inválido', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVerifying(null);
    }
  };

  const handleBalance = async (account: MpAccount) => {
    setVerifying(account.id);
    try {
      const result = await getBalance(account.id);
      setBalances(prev => ({ ...prev, [account.id]: result.balance }));
      setMpUsers(prev => ({ ...prev, [account.id]: result.user }));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta de MercadoPago?')) return;
    try {
      await deleteAccount(id);
      toast({ title: 'Cuenta eliminada' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-foreground">Cuentas MercadoPago</h3>
          <p className="text-xs text-muted-foreground">Conectá tus cuentas para importar movimientos, ver saldos y crear links de pago</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Agregar Cuenta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-bold text-muted-foreground">No hay cuentas configuradas</p>
          <p className="text-xs text-muted-foreground mt-1">Agregá tu Access Token de MercadoPago para empezar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => {
            const user = mpUsers[acc.id];
            const balance = balances[acc.id];
            const isVerifying = verifying === acc.id;

            return (
              <div key={acc.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#009ee3]/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-[#009ee3]" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{acc.nombre}</p>
                      {user && (
                        <p className="text-xs text-muted-foreground">{user.nickname} · {user.email}</p>
                      )}
                      {!user && (
                        <p className="text-xs text-muted-foreground">Token: ····{acc.access_token?.slice(-6)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(acc)}
                      disabled={isVerifying}
                      className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      title="Verificar conexión"
                    >
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleBalance(acc)}
                      disabled={isVerifying}
                      className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      title="Ver saldo"
                    >
                      <Wallet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {balance && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Disponible</p>
                      <p className="text-sm font-black text-emerald-600">
                        ${balance.available_balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">No Disponible</p>
                      <p className="text-sm font-black text-amber-600">
                        ${balance.unavailable_balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                      <p className="text-sm font-black text-foreground">
                        ${balance.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}

                {acc.last_sync_at && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Última sincronización: {new Date(acc.last_sync_at).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-foreground">Nueva Cuenta MercadoPago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre de la Cuenta</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Mercado Pago Laserbeam"
                className="w-full mt-1 px-3 py-2 border border-input bg-background text-foreground rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Access Token</label>
              <div className="relative mt-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="APP_USR-..."
                  className="w-full px-3 py-2 pr-10 border border-input bg-background text-foreground rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Obtené tu token en{' '}
                <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  mercadopago.com/developers
                </a>
                {' → Tu App → Credenciales de producción'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!nombre.trim() || !token.trim() || saving}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Conectar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
