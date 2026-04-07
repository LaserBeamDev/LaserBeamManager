
-- crm_products: replace ALL policy with separate SELECT (all auth) + INSERT/UPDATE/DELETE (owner only)
DROP POLICY IF EXISTS "Users can manage their own products" ON public.crm_products;
CREATE POLICY "All authenticated can read products" ON public.crm_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own products" ON public.crm_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.crm_products FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.crm_products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crm_product_stocks: same pattern
DROP POLICY IF EXISTS "Users can manage their own stocks" ON public.crm_product_stocks;
CREATE POLICY "All authenticated can read stocks" ON public.crm_product_stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own stocks" ON public.crm_product_stocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stocks" ON public.crm_product_stocks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stocks" ON public.crm_product_stocks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crm_transactions: same pattern
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.crm_transactions;
CREATE POLICY "All authenticated can read transactions" ON public.crm_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own transactions" ON public.crm_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.crm_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.crm_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crm_config: same pattern
DROP POLICY IF EXISTS "Users can manage their own config" ON public.crm_config;
CREATE POLICY "All authenticated can read config" ON public.crm_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own config" ON public.crm_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own config" ON public.crm_config FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own config" ON public.crm_config FOR DELETE TO authenticated USING (auth.uid() = user_id);
