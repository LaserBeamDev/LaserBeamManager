import { useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/hooks/useBudgetStore";
import { formatMinutos } from "@/lib/engine";
import { CapacidadRecurso } from "@/lib/types";
import { toast } from "sonner";

export default function ProduccionPage() {
  const { capacidades: savedCapacidades, saveCapacidades, loading } = useBudget();

  const defaultCapacidades: CapacidadRecurso[] = [
    { recurso: 'CO2', minutosDisponiblesDia: 480 },
    { recurso: 'FIBRA', minutosDisponiblesDia: 480 },
    { recurso: 'MANUAL', minutosDisponiblesDia: 480 },
    { recurso: 'DISEÑO', minutosDisponiblesDia: 240 },
  ];

  const [capacidades, setCapacidades] = useState<CapacidadRecurso[]>(
    savedCapacidades.length > 0 ? savedCapacidades : defaultCapacidades
  );

  const updateMinutos = (recurso: string, value: number) => {
    setCapacidades(prev => prev.map(c => c.recurso === recurso ? { ...c, minutosDisponiblesDia: value } : c));
  };

  const handleSave = async () => {
    await saveCapacidades(capacidades);
    toast.success('Capacidades guardadas');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Producción y Capacidad</h1>
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Guardar</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {capacidades.map(c => (
          <Card key={c.recurso}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.recurso}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs">Minutos disponibles / día</Label>
                <Input type="number" value={c.minutosDisponiblesDia} onChange={e => updateMinutos(c.recurso, +e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">= {formatMinutos(c.minutosDisponiblesDia)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Capacidad por Recurso</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Creá presupuestos para ver estimaciones de consumo de capacidad aquí.</p>
        </CardContent>
      </Card>
    </div>
  );
}
