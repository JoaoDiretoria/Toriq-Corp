-- Permitir admin_vertical inserir módulos
CREATE POLICY "Admin vertical pode inserir módulos"
ON public.modulos FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin_vertical'::app_role));

-- Permitir admin_vertical atualizar módulos
CREATE POLICY "Admin vertical pode atualizar módulos"
ON public.modulos FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin_vertical'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_vertical'::app_role));

-- Permitir admin_vertical deletar módulos
CREATE POLICY "Admin vertical pode deletar módulos"
ON public.modulos FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_vertical'::app_role));