-- Criar tabela de checklists de veículos
CREATE TABLE IF NOT EXISTS frota_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Pré-uso',
  km INTEGER,
  responsavel VARCHAR(255),
  local VARCHAR(255),
  status_geral VARCHAR(50) NOT NULL DEFAULT 'Aprovado',
  itens_marcados TEXT[] DEFAULT '{}',
  observacoes TEXT,
  anexo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_frota_checklists_veiculo ON frota_checklists(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_checklists_empresa ON frota_checklists(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_checklists_data ON frota_checklists(data);

-- RLS
ALTER TABLE frota_checklists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver checklists da sua empresa"
  ON frota_checklists FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir checklists na sua empresa"
  ON frota_checklists FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar checklists da sua empresa"
  ON frota_checklists FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar checklists da sua empresa"
  ON frota_checklists FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_frota_checklists_updated_at
  BEFORE UPDATE ON frota_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
