-- Migration: Criar tabelas de movimentações para todos os Kanbans
-- Data: 2026-01-09
-- Descrição: Cria tabelas separadas para histórico de movimentações (NÃO atividades!)
-- Movimentações = registros automáticos de mudanças de coluna/kanban
-- Atividades = tarefas criadas manualmente pelo usuário via botão "Nova Atividade"

-- =====================================================
-- TABELA: prospeccao_card_movimentacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS prospeccao_card_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES prospeccao_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
  descricao TEXT NOT NULL,
  coluna_origem_id UUID,
  coluna_destino_id UUID,
  pagina_origem VARCHAR(100),
  pagina_destino VARCHAR(100),
  kanban_origem VARCHAR(100),
  kanban_destino VARCHAR(100),
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_card_id ON prospeccao_card_movimentacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_tipo ON prospeccao_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_created_at ON prospeccao_card_movimentacoes(created_at DESC);

ALTER TABLE prospeccao_card_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode tudo em prospeccao_card_movimentacoes" ON prospeccao_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem ver movimentações prospeccao" ON prospeccao_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem criar movimentações prospeccao" ON prospeccao_card_movimentacoes;

CREATE POLICY "Admin pode tudo em prospeccao_card_movimentacoes" ON prospeccao_card_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver movimentações prospeccao" ON prospeccao_card_movimentacoes
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM prospeccao_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar movimentações prospeccao" ON prospeccao_card_movimentacoes
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM prospeccao_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- TABELA: pos_venda_card_movimentacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_venda_card_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pos_venda_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
  descricao TEXT NOT NULL,
  coluna_origem_id UUID,
  coluna_destino_id UUID,
  kanban_origem VARCHAR(100),
  kanban_destino VARCHAR(100),
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_card_id ON pos_venda_card_movimentacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_tipo ON pos_venda_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_created_at ON pos_venda_card_movimentacoes(created_at DESC);

ALTER TABLE pos_venda_card_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode tudo em pos_venda_card_movimentacoes" ON pos_venda_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem ver movimentações pos_venda" ON pos_venda_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem criar movimentações pos_venda" ON pos_venda_card_movimentacoes;

CREATE POLICY "Admin pode tudo em pos_venda_card_movimentacoes" ON pos_venda_card_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver movimentações pos_venda" ON pos_venda_card_movimentacoes
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM pos_venda_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar movimentações pos_venda" ON pos_venda_card_movimentacoes
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM pos_venda_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- TABELA: cross_selling_card_movimentacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS cross_selling_card_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cross_selling_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
  descricao TEXT NOT NULL,
  coluna_origem_id UUID,
  coluna_destino_id UUID,
  kanban_origem VARCHAR(100),
  kanban_destino VARCHAR(100),
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_card_id ON cross_selling_card_movimentacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_tipo ON cross_selling_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_created_at ON cross_selling_card_movimentacoes(created_at DESC);

ALTER TABLE cross_selling_card_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode tudo em cross_selling_card_movimentacoes" ON cross_selling_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem ver movimentações cross_selling" ON cross_selling_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem criar movimentações cross_selling" ON cross_selling_card_movimentacoes;

CREATE POLICY "Admin pode tudo em cross_selling_card_movimentacoes" ON cross_selling_card_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver movimentações cross_selling" ON cross_selling_card_movimentacoes
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM cross_selling_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar movimentações cross_selling" ON cross_selling_card_movimentacoes
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM cross_selling_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- ATUALIZAR funil_card_movimentacoes para ter os mesmos campos
-- =====================================================
ALTER TABLE funil_card_movimentacoes 
ADD COLUMN IF NOT EXISTS coluna_origem_id UUID,
ADD COLUMN IF NOT EXISTS coluna_destino_id UUID,
ADD COLUMN IF NOT EXISTS kanban_origem VARCHAR(100),
ADD COLUMN IF NOT EXISTS kanban_destino VARCHAR(100),
ADD COLUMN IF NOT EXISTS dados_anteriores JSONB,
ADD COLUMN IF NOT EXISTS dados_novos JSONB;

-- =====================================================
-- ATUALIZAR closer_card_movimentacoes para garantir compatibilidade
-- =====================================================
ALTER TABLE closer_card_movimentacoes 
ADD COLUMN IF NOT EXISTS coluna_origem_id UUID,
ADD COLUMN IF NOT EXISTS coluna_destino_id UUID;

-- =====================================================
-- Comentários para documentação
-- =====================================================
COMMENT ON TABLE pos_venda_card_movimentacoes IS 'Histórico de movimentações dos cards do Onboarding/Pós-venda';
COMMENT ON TABLE cross_selling_card_movimentacoes IS 'Histórico de movimentações dos cards do Cross-Selling';
