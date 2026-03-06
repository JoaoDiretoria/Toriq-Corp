-- Permitir que empresa_sst veja perfis dos usuários de empresas que são seus clientes
CREATE POLICY "Empresa SST pode ver perfis dos seus clientes"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'empresa_sst'::app_role) AND 
  empresa_id IN (
    SELECT cliente_empresa_id 
    FROM clientes_sst 
    WHERE empresa_sst_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
);