
-- Add dimension columns to budget_materiales for surface area materials
ALTER TABLE public.budget_materiales 
  ADD COLUMN IF NOT EXISTS alto numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS largo numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS area numeric DEFAULT NULL;

-- Add active column to profiles for account deactivation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Allow admins to update any profile (for name, avatar, deactivation)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
