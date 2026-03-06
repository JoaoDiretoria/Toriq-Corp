-- Criar tabela de contas bancárias
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  banco TEXT NOT NULL,
  agencia TEXT NOT NULL,
  conta TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'investimento')),
  descricao TEXT,
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_empresa ON public.contas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ativo ON public.contas_bancarias(ativo);

-- Habilitar RLS
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode tudo em contas_bancarias" ON public.contas_bancarias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_bancarias da sua empresa" ON public.contas_bancarias
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar contas_bancarias na sua empresa" ON public.contas_bancarias
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar contas_bancarias da sua empresa" ON public.contas_bancarias
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar contas_bancarias da sua empresa" ON public.contas_bancarias
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.contas_bancarias IS 'Contas bancárias da empresa para gestão financeira';
COMMENT ON COLUMN public.contas_bancarias.tipo IS 'Tipo de conta: corrente, poupanca, investimento';
