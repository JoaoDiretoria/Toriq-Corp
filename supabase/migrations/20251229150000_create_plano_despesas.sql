-- Criar tabela de plano de despesas
CREATE TABLE IF NOT EXISTS public.plano_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'deducoes_sobre_vendas',
    'custo_servico_prestado',
    'despesas_administrativas',
    'despesas_estrutura',
    'despesas_pessoal',
    'despesas_comerciais',
    'despesas_financeiras',
    'despesas_nao_operacional',
    'impostos',
    'participacao_dividendos'
  )),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plano_despesas_empresa ON public.plano_despesas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plano_despesas_tipo ON public.plano_despesas(tipo);
CREATE INDEX IF NOT EXISTS idx_plano_despesas_ativo ON public.plano_despesas(ativo);

-- Habilitar RLS
ALTER TABLE public.plano_despesas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode tudo em plano_despesas" ON public.plano_despesas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver plano_despesas da sua empresa" ON public.plano_despesas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar plano_despesas na sua empresa" ON public.plano_despesas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar plano_despesas da sua empresa" ON public.plano_despesas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar plano_despesas da sua empresa" ON public.plano_despesas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_plano_despesas_updated_at
  BEFORE UPDATE ON public.plano_despesas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.plano_despesas IS 'Plano de classificação de despesas para DRE';
COMMENT ON COLUMN public.plano_despesas.tipo IS 'Tipo de despesa: deducoes_sobre_vendas, custo_servico_prestado, despesas_administrativas, despesas_estrutura, despesas_pessoal, despesas_comerciais, despesas_financeiras, despesas_nao_operacional, impostos, participacao_dividendos';
