-- Criar tabela de relacionamento entre colaboradores e treinamentos
CREATE TABLE IF NOT EXISTS colaboradores_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(colaborador_id, treinamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_colaborador_id ON colaboradores_treinamentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_treinamento_id ON colaboradores_treinamentos(treinamento_id);

-- RLS
ALTER TABLE colaboradores_treinamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver treinamentos de colaboradores da própria empresa"
  ON colaboradores_treinamentos FOR SELECT
  USING (
    colaborador_id IN (
      SELECT id FROM colaboradores 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem criar treinamentos para colaboradores da própria empresa"
  ON colaboradores_treinamentos FOR INSERT
  WITH CHECK (
    colaborador_id IN (
      SELECT id FROM colaboradores 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem deletar treinamentos de colaboradores da própria empresa"
  ON colaboradores_treinamentos FOR DELETE
  USING (
    colaborador_id IN (
      SELECT id FROM colaboradores 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );
