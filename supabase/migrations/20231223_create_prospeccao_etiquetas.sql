-- Tabela de etiquetas
CREATE TABLE IF NOT EXISTS prospeccao_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relacionamento card-etiqueta
CREATE TABLE IF NOT EXISTS prospeccao_card_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES prospeccao_cards(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES prospeccao_etiquetas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, etiqueta_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prospeccao_etiquetas_empresa ON prospeccao_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_etiquetas_card ON prospeccao_card_etiquetas(card_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_etiquetas_etiqueta ON prospeccao_card_etiquetas(etiqueta_id);

-- RLS para etiquetas
ALTER TABLE prospeccao_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver etiquetas da sua empresa" ON prospeccao_etiquetas
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar etiquetas na sua empresa" ON prospeccao_etiquetas
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar etiquetas da sua empresa" ON prospeccao_etiquetas
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar etiquetas da sua empresa" ON prospeccao_etiquetas
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS para card_etiquetas
ALTER TABLE prospeccao_card_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver etiquetas de cards da sua empresa" ON prospeccao_card_etiquetas
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM prospeccao_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem adicionar etiquetas a cards da sua empresa" ON prospeccao_card_etiquetas
  FOR INSERT WITH CHECK (
    card_id IN (
      SELECT id FROM prospeccao_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem remover etiquetas de cards da sua empresa" ON prospeccao_card_etiquetas
  FOR DELETE USING (
    card_id IN (
      SELECT id FROM prospeccao_cards WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
