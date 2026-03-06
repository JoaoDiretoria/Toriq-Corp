-- Criar tabela de custos de veículos
CREATE TABLE IF NOT EXISTS frota_custos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria VARCHAR(50) NOT NULL DEFAULT 'Abastecimento',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  fornecedor VARCHAR(255),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_frota_custos_veiculo ON frota_custos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_custos_empresa ON frota_custos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_custos_data ON frota_custos(data);
CREATE INDEX IF NOT EXISTS idx_frota_custos_categoria ON frota_custos(categoria);

-- RLS
ALTER TABLE frota_custos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver custos da sua empresa"
  ON frota_custos FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir custos na sua empresa"
  ON frota_custos FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar custos da sua empresa"
  ON frota_custos FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar custos da sua empresa"
  ON frota_custos FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_frota_custos_updated_at
  BEFORE UPDATE ON frota_custos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
