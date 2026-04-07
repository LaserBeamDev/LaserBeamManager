export type ItemTipo = 'MAT' | 'COM' | 'PAK' | 'LOG' | 'ADI';
export type Unidad = 'm2' | 'cm2' | 'ml' | 'un' | 'hr' | 'min' | 'kg' | 'mt';
export type RecursoTipo = 'CO2' | 'FIBRA' | 'MANUAL' | 'DISEÑO';
export type ProductoTipo = 'cerrado' | 'configurable' | 'a_medida';
export type PresupuestoEstado = 'borrador' | 'enviado' | 'aceptado' | 'vencido';

export interface MaterialComponente {
  id: string;
  codigo: string;
  tipo: ItemTipo;
  nombre: string;
  unidad: Unidad;
  costoBase: number;
  descripcion: string;
  activo: boolean;
  esPlantilla: boolean;
  composicion: ComposicionItem[];
  alto?: number | null;
  largo?: number | null;
  area?: number | null;
  proveedor?: string;
  cantidadProduccion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComposicionItem {
  id: string;
  itemId: string; // ref a MaterialComponente
  cantidad: number;
  procesoId?: string; // ref a Proceso si es un proceso
  // Process timing fields (same as ProcesoEnProducto)
  tiempoFijo?: number;
  tiempoPorTirada?: number;
  tiempoPorUnidad?: number;
  unidadesPorTirada?: number;
  usarTiempoReal?: boolean;
  tiempoReal?: number;
}

export interface Proceso {
  id: string;
  codigo: string;
  nombre: string;
  recurso: RecursoTipo;
  activo: boolean;
  descripcion: string;
  createdAt: string;
}

export interface ProcesoEnProducto {
  id: string;
  procesoId: string;
  tiempoFijo: number; // minutos
  tiempoPorTirada: number;
  tiempoPorUnidad: number;
  unidadesPorTirada: number;
  usarTiempoReal: boolean;
  tiempoReal?: number;
}

export interface ParametrosMaquina {
  tipo: 'CO2' | 'FIBRA';
  costoMaquinaUsd: number;
  vidaUtilHoras: number;
  costoTuboUsd: number;
  vidaUtilTuboHoras: number;
  consumoKw: number;
  mantenimientoAnual: number;
  horasProductivasAnuales: number;
  costoOperadorHora: number;
  contingenciaPct: number;
  renovacionPct: number;
}

export interface ParametrosGenerales {
  tarifaElectricaKwh: number;
  margenGlobalDefecto: number;
  ivaPct: number;
  inflacionPct: number;
  tipoCambioUsd: number;
  fechaVigencia: string;
}

export interface ParametrosOperativos {
  id: string;
  co2: ParametrosMaquina;
  fibra: ParametrosMaquina;
  generales: ParametrosGenerales;
  fechaVigencia: string;
  createdAt: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  tipo: ProductoTipo;
  descripcion: string;
  margenDefecto: number;
  activo: boolean;
  esPlantilla: boolean;
  materiales: { itemId: string; cantidad: number; alto?: number; largo?: number }[];
  procesos: ProcesoEnProducto[];
  cantidadProduccion: number;
  observaciones: string;
  createdAt: string;
  updatedAt: string;
}

export interface PresupuestoItem {
  id: string;
  productoId?: string;
  nombrePersonalizado: string;
  cantidad: number;
  costoUnitario: number;
  margenAplicado: number;
  precioUnitario: number;
  total: number;
  composicionSnapshot: any;
  tiemposSnapshot: any;
}

export interface Presupuesto {
  id: string;
  numero: number;
  clienteNombre: string;
  clienteContacto: string;
  observaciones: string;
  estado: PresupuestoEstado;
  fechaCreacion: string;
  validezDias: number;
  impuestoPct: number; // 0 o 21
  items: PresupuestoItem[];
  totalNeto: number;
  totalConImpuesto: number;
  parametrosSnapshotId: string;
}

export interface CapacidadRecurso {
  recurso: RecursoTipo;
  minutosDisponiblesDia: number;
}

export interface CostoMinutoDesglose {
  amortizacion: number;
  energia: number;
  mantenimiento: number;
  operador: number;
  consumibles: number;
  contingencia: number;
  renovacion: number;
  total: number;
}

export interface TiempoProduccion {
  recurso: RecursoTipo;
  proceso: string;
  tiempoMinutos: number;
}

export interface ResumenProduccion {
  tiemposPorRecurso: Record<RecursoTipo, number>;
  cuelloBotella: RecursoTipo;
  tiempoTotal: number;
}
