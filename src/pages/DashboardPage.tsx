import { useNavigate } from "react-router-dom";
import { Plus, FileText, Package, Layers, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/hooks/useBudgetStore";
import { formatARS, calcCostoMinuto } from "@/lib/engine";
import { Badge } from "@/components/ui/badge";

const estadoBadge: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-primary/10 text-primary",
  aceptado: "bg-success/10 text-success",
  vencido: "bg-destructive/10 text-destructive",
};

export default function DashboardPage() {
  const nav = useNavigate();
  const { presupuestos, productos, materiales, parametrosActuales: params, loading } = useBudget();

  const activos = presupuestos.filter(p => p.estado === 'borrador' || p.estado === 'enviado');
  const costoMinCO2 = params ? calcCostoMinuto(params, 'CO2') : 0;
  const costoMinFibra = params ? calcCostoMinuto(params, 'FIBRA') : 0;

  const ultimos = [...presupuestos].sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()).slice(0, 5);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <Button onClick={() => nav('/presupuestos/nuevo')} className="gap-2"><Plus className="h-4 w-4" />Nuevo Presupuesto</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav('/presupuestos')}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Presupuestos Activos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{activos.length}</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav('/parametros')}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Costo Min CO2</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold currency">{formatARS(costoMinCO2)}</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav('/parametros')}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Costo Min Fibra</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold currency">{formatARS(costoMinFibra)}</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav('/productos')}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Productos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{productos.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Productos', icon: Package, url: '/productos' },
          { label: 'Materiales', icon: Layers, url: '/materiales' },
          { label: 'Presupuestos', icon: FileText, url: '/presupuestos' },
          { label: 'Parámetros', icon: Settings, url: '/parametros' },
        ].map(q => (
          <Button key={q.label} variant="outline" className="h-16 flex-col gap-1" onClick={() => nav(q.url)}>
            <q.icon className="h-5 w-5" /><span className="text-xs">{q.label}</span>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos Presupuestos</CardTitle></CardHeader>
        <CardContent>
          {ultimos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay presupuestos aún. ¡Creá el primero!</p>
          ) : (
            <div className="space-y-2">
              {ultimos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => nav(`/presupuestos/${p.id}`)}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">#{String(p.numero).padStart(4, '0')}</span>
                    <span className="font-medium text-sm">{p.clienteNombre || 'Sin cliente'}</span>
                    <Badge variant="secondary" className={estadoBadge[p.estado]}>{p.estado}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{p.items.length} items</span>
                    <span className="currency font-medium">{formatARS(p.totalConImpuesto)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
