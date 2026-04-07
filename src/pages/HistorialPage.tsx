import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/hooks/useBudgetStore";
import { formatARS } from "@/lib/engine";
import { Badge } from "@/components/ui/badge";

export default function HistorialPage() {
  const { presupuestos, loading } = useBudget();

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial y Comparativas</h1>
      {presupuestos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No hay presupuestos guardados aún.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {presupuestos.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-muted-foreground">#{String(p.numero).padStart(4, '0')}</span>
                  <span className="font-medium">{p.clienteNombre || 'Sin cliente'}</span>
                  <Badge variant="secondary">{p.estado}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(p.fechaCreacion).toLocaleDateString('es-AR')}</span>
                </div>
                <span className="currency font-semibold">{formatARS(p.totalConImpuesto)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
