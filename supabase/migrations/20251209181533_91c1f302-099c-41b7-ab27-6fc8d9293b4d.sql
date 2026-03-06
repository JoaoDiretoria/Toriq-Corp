-- Criar tabela colaboradores
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  cpf text,
  cargo text,
  setor text,
  data_admissao date,
  email text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cliente_final
CREATE POLICY "Cliente final pode ver colaboradores da sua empresa"
ON public.colaboradores FOR SELECT
USING (get_user_role(auth.uid()) = 'cliente_final' AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Cliente final pode cadastrar colaboradores"
ON public.colaboradores FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'cliente_final' AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Cliente final pode atualizar colaboradores"
ON public.colaboradores FOR UPDATE
USING (get_user_role(auth.uid()) = 'cliente_final' AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Cliente final pode deletar colaboradores"
ON public.colaboradores FOR DELETE
USING (get_user_role(auth.uid()) = 'cliente_final' AND empresa_id = get_user_empresa_id(auth.uid()));

-- Políticas para empresa_sst
CREATE POLICY "Empresa SST pode gerenciar colaboradores dos seus clientes"
ON public.colaboradores FOR ALL
USING (get_user_role(auth.uid()) = 'empresa_sst' AND empresa_id IN (
  SELECT cliente_empresa_id FROM clientes_sst WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
))
WITH CHECK (get_user_role(auth.uid()) = 'empresa_sst' AND empresa_id IN (
  SELECT cliente_empresa_id FROM clientes_sst WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
));

-- Políticas para admin_vertical
CREATE POLICY "Admin vertical pode gerenciar todos os colaboradores"
ON public.colaboradores FOR ALL
USING (has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();