-- Add restrictive policy requiring authentication for clientes_sst
CREATE POLICY "Require authentication for clientes_sst" 
ON public.clientes_sst 
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);