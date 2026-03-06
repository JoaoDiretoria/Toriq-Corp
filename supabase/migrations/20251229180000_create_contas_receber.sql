-- Criar tabela de colunas do Kanban de Contas a Receber
CREATE TABLE IF NOT EXISTS public.contas_receber_colunas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de Contas a Receber
CREATE TABLE IF NOT EXISTS public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  coluna_id UUID NOT NULL REFERENCES public.contas_receber_colunas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES public.empresas(id),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  servico_produto TEXT,
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_pago DECIMAL(15,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_competencia DATE,
  data_recebimento DATE,
  data_pagamento DATE,
  forma_pagamento TEXT,
  forma_pagamento_id UUID,
  categoria TEXT,
  conta_financeira TEXT,
  conta_financeira_id UUID,
  observacoes TEXT,
  origem TEXT CHECK (origem IN ('manual', 'closer', 'pos-venda')),
  ordem INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  -- Referência ao card original do Closer (se vier de lá)
  closer_card_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_receber_empresa ON public.contas_receber(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_coluna ON public.contas_receber(coluna_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON public.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_data_recebimento ON public.contas_receber(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_closer_card ON public.contas_receber(closer_card_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_colunas_empresa ON public.contas_receber_colunas(empresa_id);

-- Habilitar RLS
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber_colunas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contas_receber
CREATE POLICY "Admin pode tudo em contas_receber" ON public.contas_receber
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_receber da sua empresa" ON public.contas_receber
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar contas_receber na sua empresa" ON public.contas_receber
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar contas_receber da sua empresa" ON public.contas_receber
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar contas_receber da sua empresa" ON public.contas_receber
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Políticas RLS para contas_receber_colunas
CREATE POLICY "Admin pode tudo em contas_receber_colunas" ON public.contas_receber_colunas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_receber_colunas da sua empresa" ON public.contas_receber_colunas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar contas_receber_colunas na sua empresa" ON public.contas_receber_colunas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar contas_receber_colunas da sua empresa" ON public.contas_receber_colunas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar contas_receber_colunas da sua empresa" ON public.contas_receber_colunas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Triggers para updated_at
CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_receber_colunas_updated_at
  BEFORE UPDATE ON public.contas_receber_colunas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.contas_receber IS 'Contas a receber do módulo financeiro';
COMMENT ON TABLE public.contas_receber_colunas IS 'Colunas do Kanban de contas a receber';
COMMENT ON COLUMN public.contas_receber.origem IS 'Origem do recebível: manual, closer, pos-venda';
COMMENT ON COLUMN public.contas_receber.closer_card_id IS 'Referência ao card do Closer que originou este recebível';
