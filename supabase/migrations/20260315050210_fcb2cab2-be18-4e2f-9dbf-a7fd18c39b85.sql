
-- Step 1: Set all Ingreso with concepto='Total' to 'Completado'
UPDATE public.crm_transactions 
SET etapa = 'Completado', updated_at = now()
WHERE tipo = 'Ingreso' 
  AND concepto = 'Total' 
  AND etapa IS DISTINCT FROM 'Completado';

-- Step 2: Set Seña transactions to 'Completado' where same client has a 'Total' transaction
UPDATE public.crm_transactions t
SET etapa = 'Completado', updated_at = now()
WHERE t.tipo = 'Ingreso'
  AND t.concepto = 'Seña'
  AND t.etapa IS DISTINCT FROM 'Completado'
  AND EXISTS (
    SELECT 1 FROM public.crm_transactions t2
    WHERE t2.user_id = t.user_id
      AND t2.tipo = 'Ingreso'
      AND t2.concepto = 'Total'
      AND t2.cliente = t.cliente
  );

-- Step 3: Set the 6 specific active clients to 'Máquina/Producción'
UPDATE public.crm_transactions
SET etapa = 'Máquina/Producción', updated_at = now()
WHERE tipo = 'Ingreso'
  AND cliente IN ('5491126459408', '5491136801718', '5491134771785', '5491134385172', '5491158159249', '5492323531706')
  AND etapa IS DISTINCT FROM 'Completado'
  AND estado != 'Cancelado';

-- Step 4: Any remaining Ingreso still in 'Pedido Confirmado' should be 'Completado'
UPDATE public.crm_transactions
SET etapa = 'Completado', updated_at = now()
WHERE tipo = 'Ingreso'
  AND etapa = 'Pedido Confirmado'
  AND cliente NOT IN ('5491126459408', '5491136801718', '5491134771785', '5491134385172', '5491158159249', '5492323531706');
