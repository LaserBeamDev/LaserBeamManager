
-- CRM Products table
CREATE TABLE public.crm_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sku text NOT NULL,
  nombre text NOT NULL,
  controla_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku)
);

ALTER TABLE public.crm_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own products" ON public.crm_products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- CRM Product Stocks table
CREATE TABLE public.crm_product_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sku text NOT NULL,
  cantidad integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku)
);

ALTER TABLE public.crm_product_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stocks" ON public.crm_product_stocks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- CRM Transactions table
CREATE TYPE public.transaction_type AS ENUM ('Ingreso', 'Egreso');
CREATE TYPE public.concepto_type AS ENUM ('Seña', 'Saldo', 'Total');
CREATE TYPE public.estado_type AS ENUM ('Pendiente', 'Completado', 'Cancelado');
CREATE TYPE public.etapa_produccion AS ENUM ('Diseño Solicitado', 'Pedido Potencial', 'Pedido Confirmado', 'Máquina/Producción', 'Logística', 'Completado');

CREATE TABLE public.crm_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  numero_orden text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date,
  prioridad bigint DEFAULT 0,
  tipo public.transaction_type NOT NULL,
  cuenta text NOT NULL DEFAULT '',
  imputable text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  total numeric(12,2) NOT NULL DEFAULT 0,
  concepto public.concepto_type NOT NULL DEFAULT 'Total',
  estado public.estado_type NOT NULL DEFAULT 'Pendiente',
  etapa public.etapa_produccion,
  medio_pago text NOT NULL DEFAULT '',
  unidades integer NOT NULL DEFAULT 1,
  items jsonb DEFAULT '[]'::jsonb,
  proveedor text DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  vendedor text NOT NULL DEFAULT '',
  detalle text DEFAULT '',
  notas_produccion text DEFAULT '',
  medio_envio text DEFAULT '',
  tracking_number text DEFAULT '',
  fecha_despacho date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions" ON public.crm_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- CRM Config table (stores user-specific configuration lists)
CREATE TABLE public.crm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  suppliers text[] DEFAULT ARRAY['ChatGPT','Google Workspace','Creative Fabrica','Canva','Claro Telefonia','Movistar Telefonia','Internet','Edenor','Licencias','ARCA','TiendaNube','Facebook','Mercado Libre','Varios','Trello','Correo/Envios','Limpieza'],
  payment_methods text[] DEFAULT ARRAY['Efectivo','Mercado Pago Laserbeam','Mercado Pago Laserbeam2','Pendiente Cobro'],
  vendors text[] DEFAULT ARRAY['Julian','Elias','German'],
  accounts_ingresos text[] DEFAULT ARRAY['Ventas','Otros Ingresos'],
  accounts_egresos text[] DEFAULT ARRAY['Costos Operativos','Costos No Operativos','Servicios','Impuestos'],
  imputables_ingresos text[] DEFAULT ARRAY['Venta Fábrica','Ventas LaserBeam','Otros Ingresos'],
  imputables_egresos text[] DEFAULT ARRAY['Materia Prima LaserBeam','Materia Prima Fábrica','Servicios/Suscrip.','Viáticos','Contador','Sueldos','Publicidad','Consumibles','Ajuste Cuentas','Infra Estructura','Monotributo Julian','Monotributo Carla','Monotributo Edith','Impuestos Municipales','Tienda Online','Logística','Reserva Taller','Otros Egresos'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own config" ON public.crm_config
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on transactions
CREATE TRIGGER update_crm_transactions_updated_at
  BEFORE UPDATE ON public.crm_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_product_stocks_updated_at
  BEFORE UPDATE ON public.crm_product_stocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_config_updated_at
  BEFORE UPDATE ON public.crm_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
