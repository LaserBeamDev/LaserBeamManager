
-- Update CRM tables: allow admin and operador roles to UPDATE/DELETE (not just owner)

-- crm_transactions: drop owner-only policies, add role-based ones
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.crm_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.crm_transactions;

CREATE POLICY "Users can update transactions" ON public.crm_transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Users can delete transactions" ON public.crm_transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- crm_products
DROP POLICY IF EXISTS "Users can update their own products" ON public.crm_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.crm_products;

CREATE POLICY "Users can update products" ON public.crm_products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Users can delete products" ON public.crm_products
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- crm_product_stocks
DROP POLICY IF EXISTS "Users can update their own stocks" ON public.crm_product_stocks;
DROP POLICY IF EXISTS "Users can delete their own stocks" ON public.crm_product_stocks;

CREATE POLICY "Users can update stocks" ON public.crm_product_stocks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Users can delete stocks" ON public.crm_product_stocks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- crm_config
DROP POLICY IF EXISTS "Users can update their own config" ON public.crm_config;
DROP POLICY IF EXISTS "Users can delete their own config" ON public.crm_config;

CREATE POLICY "Users can update config" ON public.crm_config
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Users can delete config" ON public.crm_config
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- Also allow operador to INSERT on CRM tables
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.crm_transactions;
CREATE POLICY "Users can insert transactions" ON public.crm_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "Users can manage their own products" ON public.crm_products;
CREATE POLICY "Users can insert products" ON public.crm_products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "Users can manage their own stocks" ON public.crm_product_stocks;
CREATE POLICY "Users can insert stocks" ON public.crm_product_stocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "Users can manage their own config" ON public.crm_config;
CREATE POLICY "Users can insert config" ON public.crm_config
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- Allow admins to view all user roles (for the admin panel)
-- Already exists: "Admins can manage roles" and "Users can view their own roles"
