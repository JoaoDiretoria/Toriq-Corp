-- Criar tabela de entregas de EPIs
CREATE TABLE IF NOT EXISTS entregas_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  epi_id UUID NOT NULL REFERENCES cadastro_epis(id) ON DELETE CASCADE,
  estoque_id UUID NOT NULL REFERENCES estoque_epis(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  termo TEXT,
  assinatura_base64 TEXT,
  hash_sha256 VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'entregue' CHECK (status IN ('entregue', 'devolvido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entregas_epis_empresa_id ON entregas_epis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_colaborador_id ON entregas_epis(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_epi_id ON entregas_epis(epi_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_estoque_id ON entregas_epis(estoque_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_data_entrega ON entregas_epis(data_entrega);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_status ON entregas_epis(status);

-- Habilitar RLS
ALTER TABLE entregas_epis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver entregas da própria empresa"
  ON entregas_epis FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir entregas na própria empresa"
  ON entregas_epis FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar entregas da própria empresa"
  ON entregas_epis FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar entregas da própria empresa"
  ON entregas_epis FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_entregas_epis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entregas_epis_updated_at
  BEFORE UPDATE ON entregas_epis
  FOR EACH ROW
  EXECUTE FUNCTION update_entregas_epis_updated_at();

-- Comentários
COMMENT ON TABLE entregas_epis IS 'Registro de entregas de EPIs aos trabalhadores';
COMMENT ON COLUMN entregas_epis.hash_sha256 IS 'Hash SHA-256 do termo + assinatura + timestamp para validação';
COMMENT ON COLUMN entregas_epis.assinatura_base64 IS 'Assinatura do trabalhador em formato base64 (PNG)';
COMMENT ON COLUMN entregas_epis.termo IS 'Texto do termo de responsabilidade assinado';
