import { MaterialComponente, Proceso, ParametrosOperativos, Producto, Presupuesto, CapacidadRecurso } from './types';

function uid() { return crypto.randomUUID(); }
const now = new Date().toISOString();

export function seedData() {
  // Materiales
  const acrilico3mm: MaterialComponente = {
    id: uid(), codigo: 'MAT-ACR-3MM', tipo: 'MAT', nombre: 'Acrílico Cristal 3mm',
    unidad: 'm2', costoBase: 12500, descripcion: 'Plancha acrílico transparente 3mm',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const acrilico5mm: MaterialComponente = {
    id: uid(), codigo: 'MAT-ACR-5MM', tipo: 'MAT', nombre: 'Acrílico Cristal 5mm',
    unidad: 'm2', costoBase: 18500, descripcion: 'Plancha acrílico transparente 5mm',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const mdfId = uid();
  const mdf3mm: MaterialComponente = {
    id: mdfId, codigo: 'MAT-MDF-3MM', tipo: 'MAT', nombre: 'MDF 3mm',
    unidad: 'm2', costoBase: 4200, descripcion: 'MDF fibrofácil 3mm',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const aceroInox: MaterialComponente = {
    id: uid(), codigo: 'MAT-INOX-1MM', tipo: 'MAT', nombre: 'Acero Inoxidable 1mm',
    unidad: 'm2', costoBase: 35000, descripcion: 'Chapa acero inoxidable 1mm',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const bolsaCelofan: MaterialComponente = {
    id: uid(), codigo: 'PAK-BOLSA-CEL', tipo: 'PAK', nombre: 'Bolsa Celofán',
    unidad: 'un', costoBase: 80, descripcion: 'Bolsa celofán transparente individual',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const cajaCarton: MaterialComponente = {
    id: uid(), codigo: 'PAK-CAJA-10', tipo: 'PAK', nombre: 'Caja Cartón x10',
    unidad: 'un', costoBase: 450, descripcion: 'Caja cartón corrugado para 10 unidades',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const argollaLlavero: MaterialComponente = {
    id: uid(), codigo: 'COM-ARGOLLA', tipo: 'COM', nombre: 'Argolla Llavero',
    unidad: 'un', costoBase: 150, descripcion: 'Argolla metálica para llavero',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const envio: MaterialComponente = {
    id: uid(), codigo: 'LOG-ENVIO-CABA', tipo: 'LOG', nombre: 'Envío CABA',
    unidad: 'un', costoBase: 3500, descripcion: 'Envío mensajería CABA',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };
  const digitalizacion: MaterialComponente = {
    id: uid(), codigo: 'ADI-DIGI', tipo: 'ADI', nombre: 'Digitalización de diseño',
    unidad: 'hr', costoBase: 5000, descripcion: 'Hora de diseño/vectorización',
    activo: true, esPlantilla: false, composicion: [], cantidadProduccion: 1, createdAt: now, updatedAt: now,
  };

  const materiales: MaterialComponente[] = [
    acrilico3mm, acrilico5mm, mdf3mm, aceroInox,
    bolsaCelofan, cajaCarton, argollaLlavero, envio, digitalizacion,
  ];

  // Procesos
  const corteCO2: Proceso = { id: uid(), codigo: 'PROC-CORTE-CO2', nombre: 'Corte CO2', recurso: 'CO2', activo: true, descripcion: 'Corte láser CO2', createdAt: now };
  const grabadoCO2: Proceso = { id: uid(), codigo: 'PROC-GRAB-CO2', nombre: 'Grabado CO2', recurso: 'CO2', activo: true, descripcion: 'Grabado láser CO2', createdAt: now };
  const grabadoFibra: Proceso = { id: uid(), codigo: 'PROC-GRAB-FIB', nombre: 'Grabado Fibra', recurso: 'FIBRA', activo: true, descripcion: 'Grabado láser fibra óptica', createdAt: now };
  const armadoManual: Proceso = { id: uid(), codigo: 'PROC-ARMADO', nombre: 'Armado Manual', recurso: 'MANUAL', activo: true, descripcion: 'Armado y ensamble manual', createdAt: now };
  const digitalizacionProc: Proceso = { id: uid(), codigo: 'PROC-DIGI', nombre: 'Digitalización', recurso: 'DISEÑO', activo: true, descripcion: 'Vectorización y preparación de archivos', createdAt: now };
  const embalado: Proceso = { id: uid(), codigo: 'PROC-EMBALADO', nombre: 'Embalado', recurso: 'MANUAL', activo: true, descripcion: 'Empaque individual y grupal', createdAt: now };
  const lijado: Proceso = { id: uid(), codigo: 'PROC-LIJADO', nombre: 'Lijado / Terminación', recurso: 'MANUAL', activo: true, descripcion: 'Lijado y terminación superficial', createdAt: now };

  const procesos: Proceso[] = [corteCO2, grabadoCO2, grabadoFibra, armadoManual, digitalizacionProc, embalado, lijado];

  // Parámetros
  const parametros: ParametrosOperativos = {
    id: uid(),
    co2: {
      tipo: 'CO2', costoMaquinaUsd: 8000, vidaUtilHoras: 20000,
      costoTuboUsd: 1200, vidaUtilTuboHoras: 8000,
      consumoKw: 1.5, mantenimientoAnual: 350000,
      horasProductivasAnuales: 2000, costoOperadorHora: 3500,
      contingenciaPct: 10, renovacionPct: 5,
    },
    fibra: {
      tipo: 'FIBRA', costoMaquinaUsd: 15000, vidaUtilHoras: 50000,
      costoTuboUsd: 0, vidaUtilTuboHoras: 0,
      consumoKw: 0.8, mantenimientoAnual: 200000,
      horasProductivasAnuales: 2000, costoOperadorHora: 3500,
      contingenciaPct: 8, renovacionPct: 5,
    },
    generales: {
      tarifaElectricaKwh: 85,
      margenGlobalDefecto: 40,
      ivaPct: 21,
      inflacionPct: 4.5,
      tipoCambioUsd: 1150,
      fechaVigencia: now,
    },
    fechaVigencia: now,
    createdAt: now,
  };

  // Producto ejemplo: Llavero Souvenir
  const llavero: Producto = {
    id: uid(), codigo: 'PROD-001', nombre: 'Llavero Souvenir 5cm',
    categoria: 'Souvenirs', tipo: 'cerrado',
    descripcion: 'Llavero acrílico grabado personalizado 5x3cm',
    margenDefecto: 45, activo: true, esPlantilla: true,
    materiales: [
      { itemId: acrilico3mm.id, cantidad: 0.0015 },
      { itemId: argollaLlavero.id, cantidad: 1 },
      { itemId: bolsaCelofan.id, cantidad: 1 },
    ],
    procesos: [
      { id: uid(), procesoId: corteCO2.id, tiempoFijo: 0, tiempoPorTirada: 0.5, tiempoPorUnidad: 0.3, unidadesPorTirada: 20, usarTiempoReal: false },
      { id: uid(), procesoId: grabadoCO2.id, tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 1.5, unidadesPorTirada: 1, usarTiempoReal: false },
      { id: uid(), procesoId: armadoManual.id, tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 0.5, unidadesPorTirada: 1, usarTiempoReal: false },
    ],
    cantidadProduccion: 1,
    observaciones: 'Producto estrella para eventos corporativos',
    createdAt: now, updatedAt: now,
  };

  const cartel: Producto = {
    id: uid(), codigo: 'PROD-002', nombre: 'Cartel MDF 30x20cm',
    categoria: 'Cartelería', tipo: 'configurable',
    descripcion: 'Cartel en MDF cortado y grabado',
    margenDefecto: 50, activo: true, esPlantilla: true,
    materiales: [
      { itemId: mdfId, cantidad: 0.06 },
    ],
    procesos: [
      { id: uid(), procesoId: corteCO2.id, tiempoFijo: 1, tiempoPorTirada: 0, tiempoPorUnidad: 2, unidadesPorTirada: 1, usarTiempoReal: false },
      { id: uid(), procesoId: grabadoCO2.id, tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 5, unidadesPorTirada: 1, usarTiempoReal: false },
      { id: uid(), procesoId: lijado.id, tiempoFijo: 0, tiempoPorTirada: 0, tiempoPorUnidad: 1, unidadesPorTirada: 1, usarTiempoReal: false },
    ],
    cantidadProduccion: 1,
    observaciones: '',
    createdAt: now, updatedAt: now,
  };

  const productos: Producto[] = [llavero, cartel];

  // Presupuesto ejemplo
  const presupuestos: Presupuesto[] = [];
  const nextPresupuestoNum = 1;

  const capacidades: CapacidadRecurso[] = [
    { recurso: 'CO2', minutosDisponiblesDia: 480 },
    { recurso: 'FIBRA', minutosDisponiblesDia: 480 },
    { recurso: 'MANUAL', minutosDisponiblesDia: 480 },
    { recurso: 'DISEÑO', minutosDisponiblesDia: 240 },
  ];

  return { materiales, procesos, parametros, productos, presupuestos, nextPresupuestoNum, capacidades };
}
