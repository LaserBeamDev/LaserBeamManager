import { MaterialComponente, Proceso, ParametrosOperativos, Producto, Presupuesto, CapacidadRecurso } from './types';
import { seedData } from './seed-data';

const KEYS = {
  materiales: 'lb_materiales',
  procesos: 'lb_procesos',
  parametros: 'lb_parametros',
  productos: 'lb_productos',
  presupuestos: 'lb_presupuestos',
  capacidades: 'lb_capacidades',
  nextPresupuestoNum: 'lb_next_pres_num',
  seeded: 'lb_seeded',
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function initStore() {
  if (!localStorage.getItem(KEYS.seeded)) {
    const seed = seedData();
    set(KEYS.materiales, seed.materiales);
    set(KEYS.procesos, seed.procesos);
    set(KEYS.parametros, [seed.parametros]);
    set(KEYS.productos, seed.productos);
    set(KEYS.presupuestos, seed.presupuestos);
    set(KEYS.capacidades, seed.capacidades);
    set(KEYS.nextPresupuestoNum, seed.nextPresupuestoNum);
    set(KEYS.seeded, true);
  }
}

// Materiales
export const getMateriales = (): MaterialComponente[] => get(KEYS.materiales, []);
export const saveMateriales = (m: MaterialComponente[]) => set(KEYS.materiales, m);
export const getMaterial = (id: string) => getMateriales().find(m => m.id === id);

export const addMaterial = (m: MaterialComponente) => {
  const all = getMateriales();
  all.push(m);
  saveMateriales(all);
};

export const updateMaterial = (m: MaterialComponente) => {
  const all = getMateriales().map(x => x.id === m.id ? m : x);
  saveMateriales(all);
};

export const deleteMaterial = (id: string) => {
  saveMateriales(getMateriales().filter(x => x.id !== id));
};

// Procesos
export const getProcesos = (): Proceso[] => get(KEYS.procesos, []);
export const saveProcesos = (p: Proceso[]) => set(KEYS.procesos, p);
export const getProceso = (id: string) => getProcesos().find(p => p.id === id);

export const addProceso = (p: Proceso) => {
  const all = getProcesos();
  all.push(p);
  saveProcesos(all);
};

export const updateProceso = (p: Proceso) => {
  saveProcesos(getProcesos().map(x => x.id === p.id ? p : x));
};

export const deleteProceso = (id: string) => {
  saveProcesos(getProcesos().filter(x => x.id !== id));
};

// Parámetros
export const getParametrosHistory = (): ParametrosOperativos[] => get(KEYS.parametros, []);
export const getParametrosActuales = (): ParametrosOperativos | null => {
  const all = getParametrosHistory();
  return all.length > 0 ? all[all.length - 1] : null;
};
export const saveParametros = (p: ParametrosOperativos) => {
  const all = getParametrosHistory();
  all.push(p);
  set(KEYS.parametros, all);
};

// Productos
export const getProductos = (): Producto[] => get(KEYS.productos, []);
export const saveProductos = (p: Producto[]) => set(KEYS.productos, p);
export const getProducto = (id: string) => getProductos().find(p => p.id === id);

export const addProducto = (p: Producto) => {
  const all = getProductos();
  all.push(p);
  saveProductos(all);
};

export const updateProducto = (p: Producto) => {
  saveProductos(getProductos().map(x => x.id === p.id ? p : x));
};

export const deleteProducto = (id: string) => {
  saveProductos(getProductos().filter(x => x.id !== id));
};

// Presupuestos
export const getPresupuestos = (): Presupuesto[] => get(KEYS.presupuestos, []);
export const savePresupuestos = (p: Presupuesto[]) => set(KEYS.presupuestos, p);
export const getPresupuesto = (id: string) => getPresupuestos().find(p => p.id === id);

export const getNextPresupuestoNum = (): number => {
  const n = get(KEYS.nextPresupuestoNum, 1);
  set(KEYS.nextPresupuestoNum, n + 1);
  return n;
};

export const addPresupuesto = (p: Presupuesto) => {
  const all = getPresupuestos();
  all.push(p);
  savePresupuestos(all);
};

export const updatePresupuesto = (p: Presupuesto) => {
  savePresupuestos(getPresupuestos().map(x => x.id === p.id ? p : x));
};

export const deletePresupuesto = (id: string) => {
  savePresupuestos(getPresupuestos().filter(x => x.id !== id));
};

// Capacidades
export const getCapacidades = (): CapacidadRecurso[] => get(KEYS.capacidades, []);
export const saveCapacidades = (c: CapacidadRecurso[]) => set(KEYS.capacidades, c);
