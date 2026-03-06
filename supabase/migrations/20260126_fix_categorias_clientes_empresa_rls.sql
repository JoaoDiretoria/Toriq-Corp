-- Adicionar políticas de INSERT, UPDATE e DELETE para categorias_clientes_empresa
-- Atualmente só existe política de SELECT

-- Política de INSERT
CREATE POLICY "Empresas podem criar suas categorias"
ON public.categorias_clientes_empresa
FOR INSERT
WITH CHECK (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
);

-- Política de UPDATE
CREATE POLICY "Empresas podem atualizar suas categorias"
ON public.categorias_clientes_empresa
FOR UPDATE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
)
WITH CHECK (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
);

-- Política de DELETE
CREATE POLICY "Empresas podem deletar suas categorias"
ON public.categorias_clientes_empresa
FOR DELETE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
);
