-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj_cpf TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON public.fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores(ativo);

-- Habilitar RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode tudo em fornecedores" ON public.fornecedores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver fornecedores da sua empresa" ON public.fornecedores
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar fornecedores na sua empresa" ON public.fornecedores
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar fornecedores da sua empresa" ON public.fornecedores
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar fornecedores da sua empresa" ON public.fornecedores
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.fornecedores IS 'Cadastro de fornecedores para contas a pagar';
