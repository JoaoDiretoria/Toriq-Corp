-- Migration: Criar tabela para histórico de movimentações dos cards do Closer
-- Data: 2026-01-09
-- Descrição: Registra todas as movimentações de cards entre colunas/etapas do Closer

-- Tabela para histórico de movimentações dos cards do Closer
CREATE TABLE IF NOT EXISTS closer_card_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES closer_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
  descricao TEXT NOT NULL,
  coluna_origem_id UUID REFERENCES closer_colunas(id) ON DELETE SET NULL,
  coluna_destino_id UUID REFERENCES closer_colunas(id) ON DELETE SET NULL,
  pagina_origem VARCHAR(100),
  pagina_destino VARCHAR(100),
  kanban_origem VARCHAR(100) DEFAULT 'Closer',
  kanban_destino VARCHAR(100) DEFAULT 'Closer',
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_card_id ON closer_card_movimentacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_tipo ON closer_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_created_at ON closer_card_movimentacoes(created_at DESC);

-- RLS para closer_card_movimentacoes
ALTER TABLE closer_card_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em closer_card_movimentacoes" ON closer_card_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver movimentações de cards da sua empresa" ON closer_card_movimentacoes
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar movimentações em cards da sua empresa" ON closer_card_movimentacoes
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM closer_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Comentários para documentação
COMMENT ON TABLE closer_card_movimentacoes IS 'Histórico de movimentações dos cards do Closer entre colunas/etapas';
COMMENT ON COLUMN closer_card_movimentacoes.tipo IS 'Tipo: criacao, mudanca_coluna, mudanca_etapa, encaminhamento, edicao';
COMMENT ON COLUMN closer_card_movimentacoes.pagina_origem IS 'Página/módulo de origem (ex: prospeccao, closer, onboarding)';
COMMENT ON COLUMN closer_card_movimentacoes.pagina_destino IS 'Página/módulo de destino';
