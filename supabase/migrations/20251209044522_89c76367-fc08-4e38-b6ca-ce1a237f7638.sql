-- Adicionar coluna para vincular cliente_sst a uma empresa real
ALTER TABLE public.clientes_sst 
ADD COLUMN IF NOT EXISTS cliente_empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_clientes_sst_cliente_empresa_id ON public.clientes_sst(cliente_empresa_id);

-- Permitir que empresa_sst possa criar empresas do tipo cliente_final
CREATE POLICY "Empresa SST pode criar empresas cliente_final" 
ON public.empresas 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'empresa_sst'::app_role) 
  AND tipo = 'cliente_final'::tipo_empresa
);

-- Permitir que empresa_sst possa atualizar empresas que ela criou (via clientes_sst)
CREATE POLICY "Empresa SST pode atualizar seus clientes" 
ON public.empresas 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'empresa_sst'::app_role) 
  AND tipo = 'cliente_final'::tipo_empresa
  AND id IN (
    SELECT cliente_empresa_id FROM public.clientes_sst 
    WHERE empresa_sst_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Permitir que empresa_sst possa gerenciar módulos dos seus clientes
CREATE POLICY "Empresa SST pode gerenciar módulos dos seus clientes" 
ON public.empresas_modulos 
FOR ALL 
USING (
  has_role(auth.uid(), 'empresa_sst'::app_role) 
  AND empresa_id IN (
    SELECT cliente_empresa_id FROM public.clientes_sst 
    WHERE empresa_sst_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'empresa_sst'::app_role) 
  AND empresa_id IN (
    SELECT cliente_empresa_id FROM public.clientes_sst 
    WHERE empresa_sst_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);