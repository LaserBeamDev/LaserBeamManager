import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { MaterialComponente, Proceso, ParametrosOperativos, Producto, Presupuesto, CapacidadRecurso } from '@/lib/types';
import { toast } from 'sonner';

// ---- DB ↔ TS Mappers ----

function dbToMaterial(r: any): MaterialComponente {
  return {
    id: r.id, codigo: r.codigo, tipo: r.tipo, nombre: r.nombre,
    unidad: r.unidad, costoBase: Number(r.costo_base), descripcion: r.descripcion || '',
    activo: r.activo, esPlantilla: r.es_plantilla, composicion: r.composicion || [],
    alto: r.alto != null ? Number(r.alto) : null,
    largo: r.largo != null ? Number(r.largo) : null,
    area: r.area != null ? Number(r.area) : null,
    proveedor: r.proveedor || '',
    cantidadProduccion: Number(r.cantidad_produccion) || 1,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function materialToDb(m: MaterialComponente, userId: string): any {
  return {
    id: m.id, user_id: userId, codigo: m.codigo, tipo: m.tipo, nombre: m.nombre,
    unidad: m.unidad, costo_base: m.costoBase, descripcion: m.descripcion,
    activo: m.activo, es_plantilla: m.esPlantilla, composicion: m.composicion as any,
    alto: m.alto ?? null, largo: m.largo ?? null, area: m.area ?? null,
    proveedor: m.proveedor || '',
    cantidad_produccion: m.cantidadProduccion || 1,
  };
}

function dbToProceso(r: any): Proceso {
  return {
    id: r.id, codigo: r.codigo, nombre: r.nombre, recurso: r.recurso,
    activo: r.activo, descripcion: r.descripcion || '', createdAt: r.created_at,
  };
}

function procesoToDb(p: Proceso, userId: string) {
  return {
    id: p.id, user_id: userId, codigo: p.codigo, nombre: p.nombre,
    recurso: p.recurso, activo: p.activo, descripcion: p.descripcion,
  };
}

function dbToProducto(r: any): Producto {
  return {
    id: r.id, codigo: r.codigo, nombre: r.nombre, categoria: r.categoria || '',
    tipo: r.tipo, descripcion: r.descripcion || '', margenDefecto: Number(r.margen_defecto),
    activo: r.activo, esPlantilla: r.es_plantilla, materiales: r.materiales || [],
    procesos: r.procesos || [], cantidadProduccion: Number(r.cantidad_produccion) || 1,
    observaciones: r.observaciones || '',
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function productoToDb(p: Producto, userId: string): any {
  return {
    id: p.id, user_id: userId, codigo: p.codigo, nombre: p.nombre,
    categoria: p.categoria, tipo: p.tipo, descripcion: p.descripcion,
    margen_defecto: p.margenDefecto, activo: p.activo, es_plantilla: p.esPlantilla,
    materiales: p.materiales as any, procesos: p.procesos as any, observaciones: p.observaciones,
    cantidad_produccion: p.cantidadProduccion || 1,
  };
}

function dbToParametros(r: any): ParametrosOperativos {
  return {
    id: r.id, co2: r.co2, fibra: r.fibra, generales: r.generales,
    fechaVigencia: r.fecha_vigencia, createdAt: r.created_at,
  };
}

function dbToPresupuesto(r: any): Presupuesto {
  return {
    id: r.id, numero: r.numero, clienteNombre: r.cliente_nombre || '',
    clienteContacto: r.cliente_contacto || '', observaciones: r.observaciones || '',
    estado: r.estado, fechaCreacion: r.fecha_creacion,
    validezDias: r.validez_dias, impuestoPct: Number(r.impuesto_pct),
    items: r.items || [], totalNeto: Number(r.total_neto),
    totalConImpuesto: Number(r.total_con_impuesto),
    parametrosSnapshotId: r.parametros_snapshot_id || '',
  };
}

function presupuestoToDb(p: Presupuesto, userId: string): any {
  return {
    id: p.id, user_id: userId, cliente_nombre: p.clienteNombre,
    cliente_contacto: p.clienteContacto, observaciones: p.observaciones,
    estado: p.estado, fecha_creacion: p.fechaCreacion,
    validez_dias: p.validezDias, impuesto_pct: p.impuestoPct,
    items: p.items as any, total_neto: p.totalNeto,
    total_con_impuesto: p.totalConImpuesto,
    parametros_snapshot_id: p.parametrosSnapshotId,
  };
}

function dbToCapacidad(r: any): CapacidadRecurso {
  return { recurso: r.recurso, minutosDisponiblesDia: r.minutos_disponibles_dia };
}

// ---- Context ----

interface BudgetContextType {
  loading: boolean;
  materiales: MaterialComponente[];
  procesos: Proceso[];
  parametrosHistory: ParametrosOperativos[];
  parametrosActuales: ParametrosOperativos | null;
  productos: Producto[];
  presupuestos: Presupuesto[];
  capacidades: CapacidadRecurso[];
  // Materiales CRUD
  addMaterial: (m: MaterialComponente) => Promise<void>;
  updateMaterial: (m: MaterialComponente) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  // Procesos CRUD
  addProceso: (p: Proceso) => Promise<void>;
  updateProceso: (p: Proceso) => Promise<void>;
  deleteProceso: (id: string) => Promise<void>;
  // Productos CRUD
  addProducto: (p: Producto) => Promise<void>;
  updateProducto: (p: Producto) => Promise<void>;
  deleteProducto: (id: string) => Promise<void>;
  // Parametros
  saveParametros: (p: ParametrosOperativos) => Promise<void>;
  // Presupuestos CRUD
  addPresupuesto: (p: Presupuesto) => Promise<Presupuesto | null>;
  updatePresupuesto: (p: Presupuesto) => Promise<void>;
  deletePresupuesto: (id: string) => Promise<void>;
  getPresupuesto: (id: string) => Presupuesto | undefined;
  // Capacidades
  saveCapacidades: (c: CapacidadRecurso[]) => Promise<void>;
  // Refresh
  refresh: () => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materiales, setMateriales] = useState<MaterialComponente[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [parametrosHistory, setParametrosHistory] = useState<ParametrosOperativos[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [capacidades, setCapacidades] = useState<CapacidadRecurso[]>([]);

  const parametrosActuales = parametrosHistory.length > 0
    ? parametrosHistory[parametrosHistory.length - 1]
    : null;

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [matRes, procRes, paramRes, prodRes, presRes, capRes] = await Promise.all([
        supabase.from('budget_materiales').select('*'),
        supabase.from('budget_procesos').select('*'),
        supabase.from('budget_parametros').select('*').order('created_at', { ascending: true }),
        supabase.from('budget_productos').select('*'),
        supabase.from('budget_presupuestos').select('*'),
        supabase.from('budget_capacidades').select('*'),
      ]);

      if (matRes.data) setMateriales(matRes.data.map(dbToMaterial));
      if (procRes.data) setProcesos(procRes.data.map(dbToProceso));
      if (paramRes.data) setParametrosHistory(paramRes.data.map(dbToParametros));
      if (prodRes.data) setProductos(prodRes.data.map(dbToProducto));
      if (presRes.data) setPresupuestos(presRes.data.map(dbToPresupuesto));
      if (capRes.data) setCapacidades(capRes.data.map(dbToCapacidad));
    } catch (err) {
      console.error('Error fetching budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uid = user?.id || '';

  // ---- Materiales ----
  const addMaterialFn = useCallback(async (m: MaterialComponente) => {
    const { error } = await supabase.from('budget_materiales').insert(materialToDb(m, uid));
    if (error) { toast.error('Error al guardar material'); console.error(error); return; }
    setMateriales(prev => [...prev, m]);
  }, [uid]);

  const updateMaterialFn = useCallback(async (m: MaterialComponente) => {
    const { error } = await supabase.from('budget_materiales').update(materialToDb(m, uid)).eq('id', m.id);
    if (error) { toast.error('Error al actualizar material'); console.error(error); return; }
    setMateriales(prev => prev.map(x => x.id === m.id ? m : x));
  }, [uid]);

  const deleteMaterialFn = useCallback(async (id: string) => {
    const { error } = await supabase.from('budget_materiales').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar material'); console.error(error); return; }
    setMateriales(prev => prev.filter(x => x.id !== id));
  }, []);

  // ---- Procesos ----
  const addProcesoFn = useCallback(async (p: Proceso) => {
    const { error } = await supabase.from('budget_procesos').insert(procesoToDb(p, uid));
    if (error) { toast.error('Error al guardar proceso'); console.error(error); return; }
    setProcesos(prev => [...prev, p]);
  }, [uid]);

  const updateProcesoFn = useCallback(async (p: Proceso) => {
    const { error } = await supabase.from('budget_procesos').update(procesoToDb(p, uid)).eq('id', p.id);
    if (error) { toast.error('Error al actualizar proceso'); console.error(error); return; }
    setProcesos(prev => prev.map(x => x.id === p.id ? p : x));
  }, [uid]);

  const deleteProcesoFn = useCallback(async (id: string) => {
    const { error } = await supabase.from('budget_procesos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar proceso'); console.error(error); return; }
    setProcesos(prev => prev.filter(x => x.id !== id));
  }, []);

  // ---- Productos ----
  const addProductoFn = useCallback(async (p: Producto) => {
    const { error } = await supabase.from('budget_productos').insert(productoToDb(p, uid));
    if (error) { toast.error('Error al guardar producto'); console.error(error); return; }
    setProductos(prev => [...prev, p]);
  }, [uid]);

  const updateProductoFn = useCallback(async (p: Producto) => {
    const { error } = await supabase.from('budget_productos').update(productoToDb(p, uid)).eq('id', p.id);
    if (error) { toast.error('Error al actualizar producto'); console.error(error); return; }
    setProductos(prev => prev.map(x => x.id === p.id ? p : x));
  }, [uid]);

  const deleteProductoFn = useCallback(async (id: string) => {
    const { error } = await supabase.from('budget_productos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar producto'); console.error(error); return; }
    setProductos(prev => prev.filter(x => x.id !== id));
  }, []);

  // ---- Parametros ----
  const saveParametrosFn = useCallback(async (p: ParametrosOperativos) => {
    const { error } = await (supabase.from('budget_parametros') as any).insert({
      id: p.id, user_id: uid, co2: p.co2 as any, fibra: p.fibra as any,
      generales: p.generales as any, fecha_vigencia: p.fechaVigencia,
    });
    if (error) { toast.error('Error al guardar parámetros'); console.error(error); return; }
    setParametrosHistory(prev => [...prev, p]);
  }, [uid]);

  // ---- Presupuestos ----
  const addPresupuestoFn = useCallback(async (p: Presupuesto): Promise<Presupuesto | null> => {
    const dbData = presupuestoToDb(p, uid);
    // Don't send numero - let the DB sequence handle it
    const { data, error } = await supabase.from('budget_presupuestos')
      .insert(dbData)
      .select('numero')
      .single();
    if (error) { toast.error('Error al crear presupuesto'); console.error(error); return null; }
    const saved = { ...p, numero: data.numero };
    setPresupuestos(prev => [...prev, saved]);
    return saved;
  }, [uid]);

  const updatePresupuestoFn = useCallback(async (p: Presupuesto) => {
    const dbData = presupuestoToDb(p, uid);
    const { error } = await supabase.from('budget_presupuestos').update(dbData).eq('id', p.id);
    if (error) { toast.error('Error al actualizar presupuesto'); console.error(error); return; }
    setPresupuestos(prev => prev.map(x => x.id === p.id ? p : x));
  }, [uid]);

  const deletePresupuestoFn = useCallback(async (id: string) => {
    const { error } = await supabase.from('budget_presupuestos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar presupuesto'); console.error(error); return; }
    setPresupuestos(prev => prev.filter(x => x.id !== id));
  }, []);

  const getPresupuestoFn = useCallback((id: string) => {
    return presupuestos.find(p => p.id === id);
  }, [presupuestos]);

  // ---- Capacidades ----
  const saveCapacidadesFn = useCallback(async (caps: CapacidadRecurso[]) => {
    // Delete existing and re-insert
    await supabase.from('budget_capacidades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = caps.map(c => ({
      user_id: uid, recurso: c.recurso, minutos_disponibles_dia: c.minutosDisponiblesDia,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('budget_capacidades').insert(rows);
      if (error) { toast.error('Error al guardar capacidades'); console.error(error); return; }
    }
    setCapacidades(caps);
  }, [uid]);

  return (
    <BudgetContext.Provider value={{
      loading, materiales, procesos, parametrosHistory, parametrosActuales,
      productos, presupuestos, capacidades,
      addMaterial: addMaterialFn, updateMaterial: updateMaterialFn, deleteMaterial: deleteMaterialFn,
      addProceso: addProcesoFn, updateProceso: updateProcesoFn, deleteProceso: deleteProcesoFn,
      addProducto: addProductoFn, updateProducto: updateProductoFn, deleteProducto: deleteProductoFn,
      saveParametros: saveParametrosFn,
      addPresupuesto: addPresupuestoFn, updatePresupuesto: updatePresupuestoFn,
      deletePresupuesto: deletePresupuestoFn, getPresupuesto: getPresupuestoFn,
      saveCapacidades: saveCapacidadesFn,
      refresh: fetchAll,
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
