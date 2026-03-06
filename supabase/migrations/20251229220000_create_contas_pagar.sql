-- Criar tabela de colunas do Kanban de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_colunas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  coluna_id UUID NOT NULL REFERENCES public.contas_pagar_colunas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.empresas(id),
  fornecedor_nome TEXT NOT NULL,
  fornecedor_cnpj TEXT,
  descricao TEXT,
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_pago DECIMAL(15,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_competencia DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  forma_pagamento TEXT,
  forma_pagamento_id UUID,
  categoria TEXT,
  conta_financeira TEXT,
  conta_financeira_id UUID,
  centro_custo TEXT,
  centro_custo_id UUID,
  observacoes TEXT,
  origem TEXT CHECK (origem IN ('manual', 'compras', 'rh')),
  ordem INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  condicao_pagamento TEXT,
  condicao_pagamento_id UUID,
  recorrente BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de atividades de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prazo DATE,
  horario TEXT,
  status TEXT NOT NULL DEFAULT 'programada',
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  coluna_origem_id UUID REFERENCES public.contas_pagar_colunas(id),
  coluna_destino_id UUID REFERENCES public.contas_pagar_colunas(id),
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa ON public.contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_coluna ON public.contas_pagar(coluna_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_colunas_empresa ON public.contas_pagar_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_atividades_conta ON public.contas_pagar_atividades(conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_movimentacoes_conta ON public.contas_pagar_movimentacoes(conta_id);

-- Habilitar RLS
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contas_pagar
CREATE POLICY "Admin pode tudo em contas_pagar" ON public.contas_pagar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_pagar da sua empresa" ON public.contas_pagar
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar contas_pagar na sua empresa" ON public.contas_pagar
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar contas_pagar da sua empresa" ON public.contas_pagar
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar contas_pagar da sua empresa" ON public.contas_pagar
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Políticas RLS para contas_pagar_colunas
CREATE POLICY "Admin pode tudo em contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar contas_pagar_colunas na sua empresa" ON public.contas_pagar_colunas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Políticas RLS para contas_pagar_atividades
CREATE POLICY "Admin pode tudo em contas_pagar_atividades" ON public.contas_pagar_atividades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_pagar_atividades" ON public.contas_pagar_atividades
  FOR SELECT USING (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Usuários podem criar contas_pagar_atividades" ON public.contas_pagar_atividades
  FOR INSERT WITH CHECK (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Usuários podem atualizar contas_pagar_atividades" ON public.contas_pagar_atividades
  FOR UPDATE USING (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Usuários podem deletar contas_pagar_atividades" ON public.contas_pagar_atividades
  FOR DELETE USING (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

-- Políticas RLS para contas_pagar_movimentacoes
CREATE POLICY "Admin pode tudo em contas_pagar_movimentacoes" ON public.contas_pagar_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver contas_pagar_movimentacoes" ON public.contas_pagar_movimentacoes
  FOR SELECT USING (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Usuários podem criar contas_pagar_movimentacoes" ON public.contas_pagar_movimentacoes
  FOR INSERT WITH CHECK (
    conta_id IN (SELECT id FROM contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  );

-- Triggers para updated_at
CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_pagar_colunas_updated_at
  BEFORE UPDATE ON public.contas_pagar_colunas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_pagar_atividades_updated_at
  BEFORE UPDATE ON public.contas_pagar_atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.contas_pagar IS 'Contas a pagar do módulo financeiro';
COMMENT ON TABLE public.contas_pagar_colunas IS 'Colunas do Kanban de contas a pagar';
COMMENT ON TABLE public.contas_pagar_atividades IS 'Atividades relacionadas às contas a pagar';
COMMENT ON TABLE public.contas_pagar_movimentacoes IS 'Histórico de movimentações das contas a pagar';
COMMENT ON COLUMN public.contas_pagar.origem IS 'Origem da conta: manual, compras, rh';
