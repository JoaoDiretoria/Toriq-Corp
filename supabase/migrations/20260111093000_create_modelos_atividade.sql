-- Criar tabela de modelos de atividade
CREATE TABLE IF NOT EXISTS modelos_atividade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por empresa
CREATE INDEX IF NOT EXISTS idx_modelos_atividade_empresa ON modelos_atividade(empresa_id);

-- RLS
ALTER TABLE modelos_atividade ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuários podem ver modelos da sua empresa"
  ON modelos_atividade FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy para INSERT
CREATE POLICY "Usuários podem criar modelos na sua empresa"
  ON modelos_atividade FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy para UPDATE
CREATE POLICY "Usuários podem atualizar modelos da sua empresa"
  ON modelos_atividade FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy para DELETE
CREATE POLICY "Usuários podem deletar modelos da sua empresa"
  ON modelos_atividade FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );
