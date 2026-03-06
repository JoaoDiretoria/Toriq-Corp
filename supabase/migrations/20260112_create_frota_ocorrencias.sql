-- Criar tabela de ocorrências de veículos
CREATE TABLE IF NOT EXISTS frota_ocorrencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Avaria',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Aberta',
  local VARCHAR(255),
  descricao TEXT,
  custo_estimado DECIMAL(12,2),
  responsavel VARCHAR(255),
  prazo DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_veiculo ON frota_ocorrencias(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_empresa ON frota_ocorrencias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_data ON frota_ocorrencias(data);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_status ON frota_ocorrencias(status);

-- RLS
ALTER TABLE frota_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver ocorrências da sua empresa"
  ON frota_ocorrencias FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir ocorrências na sua empresa"
  ON frota_ocorrencias FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar ocorrências da sua empresa"
  ON frota_ocorrencias FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar ocorrências da sua empresa"
  ON frota_ocorrencias FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_frota_ocorrencias_updated_at
  BEFORE UPDATE ON frota_ocorrencias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
