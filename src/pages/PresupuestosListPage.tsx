import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBudget } from "@/hooks/useBudgetStore";
import { formatARS } from "@/lib/engine";

const estadoLabel: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado', vencido: 'Vencido',
};
const estadoStyle: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviado: 'bg-primary/10 text-primary',
  aceptado: 'bg-success/10 text-success',
  vencido: 'bg-destructive/10 text-destructive',
};

export default function PresupuestosListPage() {
  const nav = useNavigate();
  const { presupuestos, loading } = useBudget();

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Presupuestos</h1>
        <Button onClick={() => nav('/presupuestos/nuevo')} className="gap-2"><Plus className="h-4 w-4" />Nuevo Presupuesto</Button>
      </div>

      {presupuestos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Sin presupuestos</p>
            <p className="text-muted-foreground text-sm mb-4">Creá tu primer presupuesto para empezar</p>
            <Button onClick={() => nav('/presupuestos/nuevo')} className="gap-2"><Plus className="h-4 w-4" />Nuevo Presupuesto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...presupuestos].sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()).map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => nav(`/presupuestos/${p.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-muted-foreground">#{String(p.numero).padStart(4, '0')}</span>
                  <div>
                    <p className="font-medium">{p.clienteNombre || 'Sin cliente'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.fechaCreacion).toLocaleDateString('es-AR')}</p>
                  </div>
                  <Badge variant="secondary" className={estadoStyle[p.estado]}>{estadoLabel[p.estado]}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{p.items.length} items</span>
                  <span className="currency font-semibold text-lg">{formatARS(p.totalConImpuesto)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
