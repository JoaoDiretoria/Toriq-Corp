-- Adicionar política de DELETE para empresas
-- Permite que empresa SST delete empresas cliente_final vinculadas a ela

CREATE POLICY "empresas_delete"
ON public.empresas
FOR DELETE
USING (
  -- Admin vertical pode deletar qualquer empresa
  (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'
  OR
  -- Empresa SST pode deletar seus clientes (cliente_final vinculados via clientes_sst)
  (
    tipo = 'cliente_final' 
    AND id IN (
      SELECT cs.cliente_empresa_id 
      FROM clientes_sst cs 
      WHERE cs.empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  )
  OR
  -- Empresa SST pode deletar empresas órfãs do tipo cliente_final que ela criou
  (
    tipo = 'cliente_final'
    AND NOT EXISTS (SELECT 1 FROM clientes_sst cs WHERE cs.cliente_empresa_id = id)
  )
);
