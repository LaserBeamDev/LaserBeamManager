import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBudget } from "@/hooks/useBudgetStore";
import { calcCostoMinutoDesglose, formatARS } from "@/lib/engine";
import { ParametrosOperativos, ParametrosMaquina } from "@/lib/types";
import { toast } from "sonner";

function MaquinaForm({ label, data, onChange, esCO2 }: { label: string; data: ParametrosMaquina; onChange: (d: ParametrosMaquina) => void; esCO2: boolean }) {
  const set = (key: keyof ParametrosMaquina, val: number) => onChange({ ...data, [key]: val });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Costo máquina (USD)</Label><Input type="number" value={data.costoMaquinaUsd} onChange={e => set('costoMaquinaUsd', +e.target.value)} /></div>
          <div><Label className="text-xs">Vida útil (horas)</Label><Input type="number" value={data.vidaUtilHoras} onChange={e => set('vidaUtilHoras', +e.target.value)} /></div>
          {esCO2 && <>
            <div><Label className="text-xs">Costo tubo (USD)</Label><Input type="number" value={data.costoTuboUsd} onChange={e => set('costoTuboUsd', +e.target.value)} /></div>
            <div><Label className="text-xs">Vida tubo (horas)</Label><Input type="number" value={data.vidaUtilTuboHoras} onChange={e => set('vidaUtilTuboHoras', +e.target.value)} /></div>
          </>}
          <div><Label className="text-xs">Consumo (kW)</Label><Input type="number" step="0.1" value={data.consumoKw} onChange={e => set('consumoKw', +e.target.value)} /></div>
          <div><Label className="text-xs">Mantenimiento anual (ARS)</Label><Input type="number" value={data.mantenimientoAnual} onChange={e => set('mantenimientoAnual', +e.target.value)} /></div>
          <div><Label className="text-xs">Horas productivas/año</Label><Input type="number" value={data.horasProductivasAnuales} onChange={e => set('horasProductivasAnuales', +e.target.value)} /></div>
          <div><Label className="text-xs">Costo operador/hora (ARS)</Label><Input type="number" value={data.costoOperadorHora} onChange={e => set('costoOperadorHora', +e.target.value)} /></div>
          <div><Label className="text-xs">Contingencia (%)</Label><Input type="number" value={data.contingenciaPct} onChange={e => set('contingenciaPct', +e.target.value)} /></div>
          <div><Label className="text-xs">Renovación (%)</Label><Input type="number" value={data.renovacionPct} onChange={e => set('renovacionPct', +e.target.value)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParametrosPage() {
  const { parametrosActuales, saveParametros, loading } = useBudget();
  const [params, setParams] = useState<ParametrosOperativos>(parametrosActuales || {
    id: crypto.randomUUID(),
    co2: { tipo: 'CO2', costoMaquinaUsd: 8000, vidaUtilHoras: 20000, costoTuboUsd: 1200, vidaUtilTuboHoras: 8000, consumoKw: 1.5, mantenimientoAnual: 350000, horasProductivasAnuales: 2000, costoOperadorHora: 3500, contingenciaPct: 10, renovacionPct: 5 },
    fibra: { tipo: 'FIBRA', costoMaquinaUsd: 15000, vidaUtilHoras: 50000, costoTuboUsd: 0, vidaUtilTuboHoras: 0, consumoKw: 0.8, mantenimientoAnual: 200000, horasProductivasAnuales: 2000, costoOperadorHora: 3500, contingenciaPct: 8, renovacionPct: 5 },
    generales: { tarifaElectricaKwh: 85, margenGlobalDefecto: 40, ivaPct: 21, inflacionPct: 4.5, tipoCambioUsd: 1150, fechaVigencia: new Date().toISOString() },
    fechaVigencia: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  // Update params when data loads
  useState(() => {
    if (parametrosActuales) setParams(parametrosActuales);
  });

  const desgloseCO2 = calcCostoMinutoDesglose(params, 'CO2');
  const desgloseFibra = calcCostoMinutoDesglose(params, 'FIBRA');

  const handleSave = async () => {
    const now = new Date().toISOString();
    const newParams = { ...params, id: crypto.randomUUID(), fechaVigencia: now, createdAt: now };
    newParams.generales.fechaVigencia = now;
    await saveParametros(newParams);
    setParams(newParams);
    toast.success('Parámetros guardados con nueva fecha de vigencia');
  };

  const g = params.generales;
  const setG = (key: string, val: number) => setParams({ ...params, generales: { ...g, [key]: val } });

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Parámetros Operativos</h1>
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Guardar Nueva Versión</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaquinaForm label="Láser CO2" data={params.co2} onChange={co2 => setParams({ ...params, co2 })} esCO2={true} />
        <MaquinaForm label="Láser Fibra" data={params.fibra} onChange={fibra => setParams({ ...params, fibra })} esCO2={false} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parámetros Generales</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Tarifa eléctrica (ARS/kWh)</Label><Input type="number" value={g.tarifaElectricaKwh} onChange={e => setG('tarifaElectricaKwh', +e.target.value)} /></div>
            <div><Label className="text-xs">Margen global defecto (%)</Label><Input type="number" value={g.margenGlobalDefecto} onChange={e => setG('margenGlobalDefecto', +e.target.value)} /></div>
            <div><Label className="text-xs">IVA (%)</Label><Input type="number" value={g.ivaPct} onChange={e => setG('ivaPct', +e.target.value)} /></div>
            <div><Label className="text-xs">Inflación (%)</Label><Input type="number" value={g.inflacionPct} onChange={e => setG('inflacionPct', +e.target.value)} /></div>
            <div><Label className="text-xs">Tipo cambio USD</Label><Input type="number" value={g.tipoCambioUsd} onChange={e => setG('tipoCambioUsd', +e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[{ label: 'CO2', d: desgloseCO2 }, { label: 'Fibra', d: desgloseFibra }].map(({ label, d }) => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-base">Costo Minuto {label}: <span className="text-primary currency">{formatARS(d.total)}</span> <span className="text-xs font-normal text-muted-foreground">ARS/min</span></CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {[
                  ['Amortización', d.amortizacion],
                  ['Energía', d.energia],
                  ['Mantenimiento', d.mantenimiento],
                  ['Operador', d.operador],
                  ['Consumibles', d.consumibles],
                  ['Contingencia', d.contingencia],
                  ['Renovación', d.renovacion],
                ].map(([name, val]) => (
                  <div key={name as string} className="flex justify-between">
                    <span className="text-muted-foreground">{name as string}</span>
                    <span className="currency">{formatARS(val as number)}/min</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="currency">{formatARS(d.total)}/min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
