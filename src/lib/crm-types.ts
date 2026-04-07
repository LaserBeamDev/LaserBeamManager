export type TransactionType = 'Ingreso' | 'Egreso';
export type ConceptoType = 'Seña' | 'Saldo' | 'Total';
export type EstadoType = 'Pendiente' | 'Completado' | 'Cancelado';
export type EtapaProduccion = 'Diseño Solicitado' | 'Pedido Potencial' | 'Pedido Confirmado' | 'Máquina/Producción' | 'Logística' | 'Completado';

export interface CrmProduct {
  id: string;
  user_id: string;
  sku: string;
  nombre: string;
  controla_stock: boolean;
  created_at: string;
}

export interface CrmProductStock {
  id: string;
  user_id: string;
  sku: string;
  cantidad: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  sku: string;
  unidades: number;
  color?: string;
}

export interface CrmTransaction {
  id: string;
  user_id: string;
  numero_orden: string;
  fecha: string;
  fecha_entrega?: string | null;
  prioridad: number;
  tipo: TransactionType;
  cuenta: string;
  imputable: string;
  sku: string;
  total: number;
  concepto: ConceptoType;
  estado: EstadoType;
  etapa?: EtapaProduccion | null;
  medio_pago: string;
  unidades: number;
  items: TransactionItem[];
  proveedor?: string;
  cliente: string;
  vendedor: string;
  detalle?: string;
  notas_produccion?: string;
  telefono_cliente?: string;
  medio_envio?: string;
  tracking_number?: string;
  fecha_despacho?: string | null;
  total_orden: number;
  color_producto?: string | null;
  created_at: string;
  updated_at: string;
}

export const COLORES_PRODUCTO = [
  { value: 'Negro', hex: '#1a1a1a', label: 'Negro (Standard)' },
  { value: 'Blanco', hex: '#f5f5f5', label: 'Blanco', border: true },
  { value: 'Rojo', hex: '#dc2626', label: 'Rojo' },
  { value: 'Azul', hex: '#2563eb', label: 'Azul' },
  { value: 'Verde', hex: '#16a34a', label: 'Verde' },
  { value: 'Amarillo', hex: '#eab308', label: 'Amarillo' },
  { value: 'Rosa', hex: '#ec4899', label: 'Rosa' },
  { value: 'Naranja', hex: '#ea580c', label: 'Naranja' },
  { value: 'Violeta', hex: '#7c3aed', label: 'Violeta' },
  { value: 'Dorado', hex: '#d4a017', label: 'Dorado' },
  { value: 'Plateado', hex: '#a8a8a8', label: 'Plateado' },
  { value: 'Bordo', hex: '#7f1d1d', label: 'Bordo' },
];

export interface CrmConfig {
  id: string;
  user_id: string;
  suppliers: string[];
  payment_methods: string[];
  vendors: string[];
  accounts_ingresos: string[];
  accounts_egresos: string[];
  imputables_ingresos: string[];
  imputables_egresos: string[];
}

export const ETAPAS_PRODUCCION: EtapaProduccion[] = [
  'Diseño Solicitado',
  'Pedido Potencial',
  'Pedido Confirmado',
  'Máquina/Producción',
  'Logística',
  'Completado',
];

export const DEFAULT_SKUS: Record<string, string> = {
  'VF1000CC': 'Vaso de aluminio de 1000cc litro',
  'VF700CC': 'Vaso de aluminio de 700cc litro',
  'VF500CC': 'Vaso de aluminio de 500cc litro',
  'VT550CC': 'Vaso de aluminio de 550cc litro',
  'MATS': 'Mate tipo Stanley',
  'MATV': 'Mate tipo Vasito',
  'BOMB01': 'Bombilla plana',
  'LLAV01': 'Llavero destapador de aluminio',
  'CVF1000': 'Caja Vaso fernetero 1000cc',
  'CVF700': 'Caja Vaso fernetero 700cc',
  'SERVICIO': 'Servicio de Grabado/Corte',
  'OTROS': 'Otro Producto',
};

export const MEDIOS_ENVIO = [
  'Correo Argentino', 'Andreani', 'OCA', 'Via Cargo', 'Expreso',
  'Motomensajería', 'Retira en taller', 'Envío propio', 'Otro',
];
