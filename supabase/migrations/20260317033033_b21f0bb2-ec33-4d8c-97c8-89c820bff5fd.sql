
-- Table to store multiple MercadoPago accounts per user
CREATE TABLE public.crm_mp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL DEFAULT '',
  access_token text NOT NULL DEFAULT '',
  ambiente text NOT NULL DEFAULT 'production',
  activa boolean NOT NULL DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_mp_accounts ENABLE ROW LEVEL SECURITY;

-- Only owner and admins can read their own accounts (tokens are sensitive)
CREATE POLICY "Owner can read own mp accounts"
ON public.crm_mp_accounts FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can insert mp accounts"
ON public.crm_mp_accounts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Owner can update mp accounts"
ON public.crm_mp_accounts FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can delete mp accounts"
ON public.crm_mp_accounts FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_crm_mp_accounts_updated_at
  BEFORE UPDATE ON public.crm_mp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
