-- Migration: Criar tabelas para atividades e movimentações dos cards do funil
-- Data: 2026-01-01

-- Tabela para atividades dos cards do funil
CREATE TABLE IF NOT EXISTS funil_card_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'tarefa',
  descricao TEXT NOT NULL,
  prazo DATE,
  horario VARCHAR(10),
  status VARCHAR(20) NOT NULL DEFAULT 'a_realizar',
  usuario_id UUID REFERENCES auth.users(id),
  responsavel_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para histórico de movimentações dos cards do funil
CREATE TABLE IF NOT EXISTS funil_card_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_etapa',
  descricao TEXT NOT NULL,
  etapa_origem_id UUID REFERENCES funil_etapas(id),
  etapa_destino_id UUID REFERENCES funil_etapas(id),
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_funil_card_atividades_card_id ON funil_card_atividades(card_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_atividades_status ON funil_card_atividades(status);
CREATE INDEX IF NOT EXISTS idx_funil_card_movimentacoes_card_id ON funil_card_movimentacoes(card_id);

-- RLS para funil_card_atividades
ALTER TABLE funil_card_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view atividades of their empresa cards" ON funil_card_atividades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_atividades.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert atividades on their empresa cards" ON funil_card_atividades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_atividades.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update atividades of their empresa cards" ON funil_card_atividades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_atividades.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete atividades of their empresa cards" ON funil_card_atividades
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_atividades.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS para funil_card_movimentacoes
ALTER TABLE funil_card_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movimentacoes of their empresa cards" ON funil_card_movimentacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_movimentacoes.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert movimentacoes on their empresa cards" ON funil_card_movimentacoes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_movimentacoes.card_id
      AND f.empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Tabela para etiquetas do funil
CREATE TABLE IF NOT EXISTS funil_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) NOT NULL DEFAULT '#F59E0B',
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de relacionamento entre cards e etiquetas
CREATE TABLE IF NOT EXISTS funil_card_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES funil_etiquetas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, etiqueta_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funil_etiquetas_empresa_id ON funil_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_etiquetas_card_id ON funil_card_etiquetas(card_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_etiquetas_etiqueta_id ON funil_card_etiquetas(etiqueta_id);

-- RLS para funil_etiquetas
ALTER TABLE funil_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view etiquetas of their empresa" ON funil_etiquetas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert etiquetas in their empresa" ON funil_etiquetas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update etiquetas of their empresa" ON funil_etiquetas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete etiquetas of their empresa" ON funil_etiquetas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- RLS para funil_card_etiquetas
ALTER TABLE funil_card_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view card_etiquetas of their empresa" ON funil_card_etiquetas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_etiquetas.card_id
      AND f.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert card_etiquetas on their empresa cards" ON funil_card_etiquetas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_etiquetas.card_id
      AND f.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete card_etiquetas of their empresa cards" ON funil_card_etiquetas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM funil_cards fc
      JOIN funis f ON fc.funil_id = f.id
      WHERE fc.id = funil_card_etiquetas.card_id
      AND f.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );
