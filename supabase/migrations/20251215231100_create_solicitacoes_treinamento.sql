-- Criar tabela de solicitações de treinamento
CREATE TABLE IF NOT EXISTS solicitacoes_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  tipo VARCHAR(50),
  data_treinamento DATE,
  status VARCHAR(50) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_treinamento_empresa_id 
ON solicitacoes_treinamento(empresa_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_treinamento_status 
ON solicitacoes_treinamento(status);

-- RLS
ALTER TABLE solicitacoes_treinamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver solicitações da própria empresa"
  ON solicitacoes_treinamento FOR SELECT
  USING (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar solicitações para própria empresa"
  ON solicitacoes_treinamento FOR INSERT
  WITH CHECK (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar solicitações da própria empresa"
  ON solicitacoes_treinamento FOR UPDATE
  USING (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar solicitações da própria empresa"
  ON solicitacoes_treinamento FOR DELETE
  USING (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_solicitacoes_treinamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solicitacoes_treinamento_updated_at
  BEFORE UPDATE ON solicitacoes_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitacoes_treinamento_updated_at();
