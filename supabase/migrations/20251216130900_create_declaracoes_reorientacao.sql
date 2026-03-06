-- Criar tabela de declarações de reorientação
CREATE TABLE IF NOT EXISTS declaracoes_reorientacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  texto TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(empresa_id, treinamento_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_declaracoes_reorientacao_empresa ON declaracoes_reorientacao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_declaracoes_reorientacao_treinamento ON declaracoes_reorientacao(treinamento_id);

-- Habilitar RLS
ALTER TABLE declaracoes_reorientacao ENABLE ROW LEVEL SECURITY;

-- Política para empresa SST ver suas próprias declarações
CREATE POLICY "Empresa SST pode ver suas declarações"
  ON declaracoes_reorientacao
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para empresa SST inserir declarações
CREATE POLICY "Empresa SST pode inserir declarações"
  ON declaracoes_reorientacao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para empresa SST atualizar suas declarações
CREATE POLICY "Empresa SST pode atualizar suas declarações"
  ON declaracoes_reorientacao
  FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para empresa SST deletar suas declarações
CREATE POLICY "Empresa SST pode deletar suas declarações"
  ON declaracoes_reorientacao
  FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_declaracoes_reorientacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_declaracoes_reorientacao_updated_at
  BEFORE UPDATE ON declaracoes_reorientacao
  FOR EACH ROW
  EXECUTE FUNCTION update_declaracoes_reorientacao_updated_at();
