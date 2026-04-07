
-- Budget Materiales
CREATE TABLE public.budget_materiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'MAT',
  nombre text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'un',
  costo_base numeric NOT NULL DEFAULT 0,
  descripcion text DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  es_plantilla boolean NOT NULL DEFAULT false,
  composicion jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_materiales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_materiales" ON public.budget_materiales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_materiales" ON public.budget_materiales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth update budget_materiales" ON public.budget_materiales FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth delete budget_materiales" ON public.budget_materiales FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE TRIGGER update_budget_materiales_updated_at BEFORE UPDATE ON public.budget_materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget Procesos
CREATE TABLE public.budget_procesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  recurso text NOT NULL DEFAULT 'CO2',
  activo boolean NOT NULL DEFAULT true,
  descripcion text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_procesos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_procesos" ON public.budget_procesos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_procesos" ON public.budget_procesos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth update budget_procesos" ON public.budget_procesos FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth delete budget_procesos" ON public.budget_procesos FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- Budget Productos
CREATE TABLE public.budget_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  categoria text DEFAULT '',
  tipo text NOT NULL DEFAULT 'cerrado',
  descripcion text DEFAULT '',
  margen_defecto numeric NOT NULL DEFAULT 40,
  activo boolean NOT NULL DEFAULT true,
  es_plantilla boolean NOT NULL DEFAULT false,
  materiales jsonb DEFAULT '[]'::jsonb,
  procesos jsonb DEFAULT '[]'::jsonb,
  observaciones text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_productos" ON public.budget_productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_productos" ON public.budget_productos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth update budget_productos" ON public.budget_productos FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth delete budget_productos" ON public.budget_productos FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE TRIGGER update_budget_productos_updated_at BEFORE UPDATE ON public.budget_productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget Parametros (history)
CREATE TABLE public.budget_parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  co2 jsonb NOT NULL DEFAULT '{}'::jsonb,
  fibra jsonb NOT NULL DEFAULT '{}'::jsonb,
  generales jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha_vigencia timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_parametros" ON public.budget_parametros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_parametros" ON public.budget_parametros FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- Budget Presupuestos
CREATE SEQUENCE IF NOT EXISTS budget_presupuestos_numero_seq;
CREATE TABLE public.budget_presupuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  numero integer NOT NULL DEFAULT nextval('budget_presupuestos_numero_seq'),
  cliente_nombre text DEFAULT '',
  cliente_contacto text DEFAULT '',
  observaciones text DEFAULT '',
  estado text NOT NULL DEFAULT 'borrador',
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  validez_dias integer NOT NULL DEFAULT 7,
  impuesto_pct numeric NOT NULL DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  total_neto numeric NOT NULL DEFAULT 0,
  total_con_impuesto numeric NOT NULL DEFAULT 0,
  parametros_snapshot_id text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_presupuestos" ON public.budget_presupuestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_presupuestos" ON public.budget_presupuestos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth update budget_presupuestos" ON public.budget_presupuestos FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth delete budget_presupuestos" ON public.budget_presupuestos FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- Budget Capacidades
CREATE TABLE public.budget_capacidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recurso text NOT NULL,
  minutos_disponibles_dia integer NOT NULL DEFAULT 480,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_capacidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read budget_capacidades" ON public.budget_capacidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert budget_capacidades" ON public.budget_capacidades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth update budget_capacidades" ON public.budget_capacidades FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE POLICY "Auth delete budget_capacidades" ON public.budget_capacidades FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));
CREATE TRIGGER update_budget_capacidades_updated_at BEFORE UPDATE ON public.budget_capacidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
