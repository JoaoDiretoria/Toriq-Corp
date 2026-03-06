-- Criar tabela de clientes das empresas SST
CREATE TABLE public.clientes_sst (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_sst_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  responsavel TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.clientes_sst ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_clientes_sst_updated_at
  BEFORE UPDATE ON public.clientes_sst
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para clientes_sst
CREATE POLICY "Admin vertical pode gerenciar clientes SST"
  ON public.clientes_sst FOR ALL
  USING (has_role(auth.uid(), 'admin_vertical'))
  WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Empresa SST pode ver seus clientes"
  ON public.clientes_sst FOR SELECT
  USING (
    empresa_sst_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Empresa SST pode gerenciar seus clientes"
  ON public.clientes_sst FOR ALL
  USING (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_sst_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_sst_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas RLS para empresa_sst acessar comercial_funil
CREATE POLICY "Empresa SST pode ver seu funil comercial"
  ON public.comercial_funil FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Empresa SST pode gerenciar seu funil"
  ON public.comercial_funil FOR ALL
  USING (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas RLS para empresa_sst acessar financeiro_contas
CREATE POLICY "Empresa SST pode ver suas contas"
  ON public.financeiro_contas FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Empresa SST pode gerenciar suas contas"
  ON public.financeiro_contas FOR ALL
  USING (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );