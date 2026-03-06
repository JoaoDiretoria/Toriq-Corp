-- Criar tabela de setores
CREATE TABLE IF NOT EXISTS setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Criar tabela de cargos
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_setores_empresa_id ON setores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cargos_empresa_id ON cargos(empresa_id);

-- RLS para setores
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver setores da própria empresa"
  ON setores FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem criar setores na própria empresa"
  ON setores FOR INSERT
  WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar setores da própria empresa"
  ON setores FOR UPDATE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar setores da própria empresa"
  ON setores FOR DELETE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- RLS para cargos
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver cargos da própria empresa"
  ON cargos FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem criar cargos na própria empresa"
  ON cargos FOR INSERT
  WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar cargos da própria empresa"
  ON cargos FOR UPDATE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar cargos da própria empresa"
  ON cargos FOR DELETE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON setores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cargos_updated_at
  BEFORE UPDATE ON cargos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
