
-- Create crm_clients table
CREATE TABLE public.crm_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  telefono TEXT DEFAULT '',
  email TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  cuit_dni TEXT DEFAULT '',
  razon_social TEXT DEFAULT '',
  rubro TEXT DEFAULT '',
  condicion_fiscal TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All auth read crm_clients" ON public.crm_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert crm_clients" ON public.crm_clients FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
CREATE POLICY "Auth update crm_clients" ON public.crm_clients FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
CREATE POLICY "Auth delete crm_clients" ON public.crm_clients FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Create crm_suppliers table
CREATE TABLE public.crm_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  contacto TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  producto_servicio TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All auth read crm_suppliers" ON public.crm_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert crm_suppliers" ON public.crm_suppliers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
CREATE POLICY "Auth update crm_suppliers" ON public.crm_suppliers FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));
CREATE POLICY "Auth delete crm_suppliers" ON public.crm_suppliers FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Add telefono_cliente to crm_transactions
ALTER TABLE public.crm_transactions ADD COLUMN IF NOT EXISTS telefono_cliente TEXT DEFAULT '';

-- Add proveedor to budget_materiales
ALTER TABLE public.budget_materiales ADD COLUMN IF NOT EXISTS proveedor TEXT DEFAULT '';
