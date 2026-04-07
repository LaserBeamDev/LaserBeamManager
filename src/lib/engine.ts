import { ParametrosOperativos, ParametrosMaquina, Producto, ProcesoEnProducto, CostoMinutoDesglose, RecursoTipo, ResumenProduccion, TiempoProduccion, MaterialComponente, Proceso } from './types';

export function calcCostoMinutoDesglose(params: ParametrosOperativos, tipo: 'CO2' | 'FIBRA'): CostoMinutoDesglose {
  const m: ParametrosMaquina = tipo === 'CO2' ? params.co2 : params.fibra;
  const g = params.generales;
  const horasAnuales = m.horasProductivasAnuales || 2000;
  const minutosAnuales = horasAnuales * 60;

  const costoMaquinaArs = m.costoMaquinaUsd * g.tipoCambioUsd;
  const amortizacion = costoMaquinaArs / (m.vidaUtilHoras * 60);

  const energia = (m.consumoKw * g.tarifaElectricaKwh) / 60;
  const mantenimiento = m.mantenimientoAnual / minutosAnuales;
  const operador = m.costoOperadorHora / 60;

  let consumibles = 0;
  if (tipo === 'CO2' && m.costoTuboUsd > 0 && m.vidaUtilTuboHoras > 0) {
    consumibles = (m.costoTuboUsd * g.tipoCambioUsd) / (m.vidaUtilTuboHoras * 60);
  }

  const subtotal = amortizacion + energia + mantenimiento + operador + consumibles;
  const contingencia = subtotal * (m.contingenciaPct / 100);
  const renovacion = subtotal * (m.renovacionPct / 100);
  const total = subtotal + contingencia + renovacion;

  return { amortizacion, energia, mantenimiento, operador, consumibles, contingencia, renovacion, total };
}

export function calcCostoMinuto(params: ParametrosOperativos, tipo: 'CO2' | 'FIBRA'): number {
  return calcCostoMinutoDesglose(params, tipo).total;
}

export function calcTiempoProceso(proc: ProcesoEnProducto, cantidad: number): number {
  if (proc.usarTiempoReal && proc.tiempoReal != null) return proc.tiempoReal;
  const tiradas = proc.unidadesPorTirada > 0 ? Math.ceil(cantidad / proc.unidadesPorTirada) : cantidad;
  return proc.tiempoFijo + (proc.tiempoPorTirada * tiradas) + (proc.tiempoPorUnidad * cantidad);
}

export function calcCostoProducto(
  producto: Producto,
  cantidad: number,
  params: ParametrosOperativos | null,
  allMateriales?: MaterialComponente[],
  allProcesos?: Proceso[],
): {
  costoMateriales: number;
  costoProcesos: number;
  costoTotal: number;
  costoUnitario: number;
  tiempos: TiempoProduccion[];
} {
  if (!params) return { costoMateriales: 0, costoProcesos: 0, costoTotal: 0, costoUnitario: 0, tiempos: [] };

  const findMaterial = (id: string) => allMateriales?.find(m => m.id === id);
  const findProceso = (id: string) => allProcesos?.find(p => p.id === id);

  // Recursive function to calculate effective cost of a material/component
  const calcEffectiveCost = (material: MaterialComponente): number => {
    // If it's a component (COM) with composition, calculate cost from sub-items
    if (material.tipo === 'COM' && material.composicion && material.composicion.length > 0) {
      let compCost = 0;
      for (const comp of material.composicion) {
        const subMat = findMaterial(comp.itemId);
        if (subMat) {
          compCost += calcEffectiveCost(subMat) * comp.cantidad;
        }
        // If the composition item has a process, calculate its cost
        if (comp.procesoId) {
          const proceso = findProceso(comp.procesoId);
          if (proceso) {
            const procTiming: ProcesoEnProducto = {
              id: comp.id, procesoId: comp.procesoId,
              tiempoFijo: comp.tiempoFijo || 0,
              tiempoPorTirada: comp.tiempoPorTirada || 0,
              tiempoPorUnidad: comp.tiempoPorUnidad || 1,
              unidadesPorTirada: comp.unidadesPorTirada || 1,
              usarTiempoReal: comp.usarTiempoReal || false,
              tiempoReal: comp.tiempoReal,
            };
            const tiempo = calcTiempoProceso(procTiming, 1);
            let costoMin = 0;
            if (proceso.recurso === 'CO2' || proceso.recurso === 'FIBRA') {
              costoMin = calcCostoMinuto(params!, proceso.recurso);
            } else if (proceso.recurso === 'MANUAL') {
              costoMin = params!.co2.costoOperadorHora / 60;
            } else if (proceso.recurso === 'DISEÑO') {
              costoMin = params!.co2.costoOperadorHora / 60 * 1.5;
            }
            compCost += tiempo * costoMin;
          }
        }
      }
      // Divide by cantidadProduccion to get unit cost
      const qty = material.cantidadProduccion > 1 ? material.cantidadProduccion : 1;
      return compCost / qty;
    }
    // For regular materials, use costoBase
    return material.costoBase;
  };

  // Materiales
  let costoMateriales = 0;
  for (const mat of producto.materiales) {
    const material = findMaterial(mat.itemId);
    if (material) {
      costoMateriales += calcEffectiveCost(material) * mat.cantidad * cantidad;
    }
  }

  // Procesos
  let costoProcesos = 0;
  const tiempos: TiempoProduccion[] = [];
  for (const proc of producto.procesos) {
    const proceso = findProceso(proc.procesoId);
    if (!proceso) continue;
    const tiempo = calcTiempoProceso(proc, cantidad);
    const recurso = proceso.recurso;

    let costoMin = 0;
    if (recurso === 'CO2' || recurso === 'FIBRA') {
      costoMin = calcCostoMinuto(params, recurso);
    } else if (recurso === 'MANUAL') {
      costoMin = params.co2.costoOperadorHora / 60;
    } else if (recurso === 'DISEÑO') {
      costoMin = params.co2.costoOperadorHora / 60 * 1.5;
    }

    costoProcesos += tiempo * costoMin;
    tiempos.push({ recurso, proceso: proceso.nombre, tiempoMinutos: tiempo });
  }

  const costoTotal = costoMateriales + costoProcesos;
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;

  return { costoMateriales, costoProcesos, costoTotal, costoUnitario, tiempos };
}

export function calcResumenProduccion(tiempos: TiempoProduccion[]): ResumenProduccion {
  const tiemposPorRecurso: Record<RecursoTipo, number> = { CO2: 0, FIBRA: 0, MANUAL: 0, 'DISEÑO': 0 };
  for (const t of tiempos) {
    tiemposPorRecurso[t.recurso] += t.tiempoMinutos;
  }
  const entries = Object.entries(tiemposPorRecurso) as [RecursoTipo, number][];
  const cuelloBotella = entries.reduce((a, b) => b[1] > a[1] ? b : a, entries[0])[0];
  const tiempoTotal = entries.reduce((s, [, v]) => s + v, 0);
  return { tiemposPorRecurso, cuelloBotella, tiempoTotal };
}

export function calcPrecioConMargen(costoUnitario: number, margenPct: number): number {
  return costoUnitario * (1 + margenPct / 100);
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function formatMinutos(min: number): string {
  if (min < 60) return `${min.toFixed(1)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}min`;
}
