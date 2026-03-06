-- Criar tabela de documentos de veículos
CREATE TABLE IF NOT EXISTS frota_documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Licenciamento',
  numero VARCHAR(100),
  vencimento DATE NOT NULL,
  observacoes TEXT,
  anexo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_frota_documentos_veiculo ON frota_documentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_empresa ON frota_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_vencimento ON frota_documentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_tipo ON frota_documentos(tipo);

-- RLS
ALTER TABLE frota_documentos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver documentos da sua empresa"
  ON frota_documentos FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir documentos na sua empresa"
  ON frota_documentos FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar documentos da sua empresa"
  ON frota_documentos FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar documentos da sua empresa"
  ON frota_documentos FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_frota_documentos_updated_at
  BEFORE UPDATE ON frota_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
