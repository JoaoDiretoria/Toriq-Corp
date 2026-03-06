-- Criar tabelas do módulo Closer (CRM de vendas)

-- Tabela de colunas do kanban
CREATE TABLE IF NOT EXISTS closer_colunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  meta_valor NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cards (leads/oportunidades)
CREATE TABLE IF NOT EXISTS closer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  coluna_id UUID NOT NULL REFERENCES closer_colunas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  empresa_lead_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  contatos JSONB DEFAULT '[]'::jsonb,
  origem VARCHAR(100),
  temperatura VARCHAR(20) DEFAULT 'morno',
  data_contato DATE,
  data_followup DATE,
  valor NUMERIC(15,2) DEFAULT 0,
  valor_a_vista NUMERIC(15,2) DEFAULT 0,
  valor_3x NUMERIC(15,2) DEFAULT 0,
  valor_leasing NUMERIC(15,2) DEFAULT 0,
  forma_pagamento VARCHAR(20) DEFAULT 'a_vista',
  responsavel_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN DEFAULT FALSE,
  dados_orcamento JSONB DEFAULT NULL,
  dados_custo_mensal JSONB DEFAULT NULL,
  dados_comparacao JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atividades dos cards
CREATE TABLE IF NOT EXISTS closer_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES closer_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  prazo DATE,
  horario TIME,
  status VARCHAR(20) DEFAULT 'a_realizar',
  responsavel_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  membros_ids UUID[] DEFAULT '{}',
  checklist_items JSONB DEFAULT '[]'::jsonb,
  anexos JSONB DEFAULT '[]'::jsonb,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de etiquetas
CREATE TABLE IF NOT EXISTS closer_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relacionamento card-etiqueta
CREATE TABLE IF NOT EXISTS closer_card_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES closer_cards(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES closer_etiquetas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, etiqueta_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_closer_colunas_empresa ON closer_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_closer_colunas_ordem ON closer_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_closer_cards_empresa ON closer_cards(empresa_id);
CREATE INDEX IF NOT EXISTS idx_closer_cards_coluna ON closer_cards(coluna_id);
CREATE INDEX IF NOT EXISTS idx_closer_cards_arquivado ON closer_cards(arquivado);
CREATE INDEX IF NOT EXISTS idx_closer_atividades_card ON closer_atividades(card_id);
CREATE INDEX IF NOT EXISTS idx_closer_atividades_status ON closer_atividades(status);
CREATE INDEX IF NOT EXISTS idx_closer_etiquetas_empresa ON closer_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_closer_card_etiquetas_card ON closer_card_etiquetas(card_id);

-- RLS para closer_colunas
ALTER TABLE closer_colunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_colunas" ON closer_colunas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver colunas da sua empresa" ON closer_colunas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar colunas na sua empresa" ON closer_colunas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar colunas da sua empresa" ON closer_colunas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar colunas da sua empresa" ON closer_colunas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- RLS para closer_cards
ALTER TABLE closer_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_cards" ON closer_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver cards da sua empresa" ON closer_cards
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar cards na sua empresa" ON closer_cards
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar cards da sua empresa" ON closer_cards
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar cards da sua empresa" ON closer_cards
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- RLS para closer_atividades
ALTER TABLE closer_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_atividades" ON closer_atividades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver atividades de cards da sua empresa" ON closer_atividades
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar atividades em cards da sua empresa" ON closer_atividades
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem atualizar atividades de cards da sua empresa" ON closer_atividades
  FOR UPDATE USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem deletar atividades de cards da sua empresa" ON closer_atividades
  FOR DELETE USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS para closer_etiquetas
ALTER TABLE closer_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_etiquetas" ON closer_etiquetas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver etiquetas da sua empresa" ON closer_etiquetas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar etiquetas na sua empresa" ON closer_etiquetas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar etiquetas da sua empresa" ON closer_etiquetas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar etiquetas da sua empresa" ON closer_etiquetas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- RLS para closer_card_etiquetas
ALTER TABLE closer_card_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_card_etiquetas" ON closer_card_etiquetas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver etiquetas de cards da sua empresa" ON closer_card_etiquetas
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem adicionar etiquetas a cards da sua empresa" ON closer_card_etiquetas
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem remover etiquetas de cards da sua empresa" ON closer_card_etiquetas
  FOR DELETE USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Comentários para documentação
COMMENT ON TABLE closer_colunas IS 'Colunas do kanban do módulo Closer';
COMMENT ON TABLE closer_cards IS 'Cards/leads do módulo Closer';
COMMENT ON TABLE closer_atividades IS 'Atividades e histórico dos cards';
COMMENT ON TABLE closer_etiquetas IS 'Etiquetas para categorizar cards';
COMMENT ON TABLE closer_card_etiquetas IS 'Relacionamento entre cards e etiquetas';

COMMENT ON COLUMN closer_cards.valor IS 'Valor principal do negócio (preço cheio)';
COMMENT ON COLUMN closer_cards.valor_a_vista IS 'Valor do negócio à vista com desconto';
COMMENT ON COLUMN closer_cards.valor_3x IS 'Valor do negócio parcelado em 3x';
COMMENT ON COLUMN closer_cards.valor_leasing IS 'Valor do negócio em leasing/consórcio';
COMMENT ON COLUMN closer_cards.forma_pagamento IS 'Forma de pagamento selecionada: a_vista, 3x, leasing';
COMMENT ON COLUMN closer_cards.dados_orcamento IS 'Dados completos do orçamento de licença vitalícia';
COMMENT ON COLUMN closer_cards.dados_custo_mensal IS 'Dados do cálculo de custo mensal pós-licença';
COMMENT ON COLUMN closer_cards.dados_comparacao IS 'Dados da comparação de economia SaaS x TORIQ';
