-- Criar tabela de grupos homogêneos de treinamentos
CREATE TABLE IF NOT EXISTS grupos_homogeneos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes_sst(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  cargo_nome VARCHAR(255),
  nome VARCHAR(255) NOT NULL,
  agente_nocivo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de relacionamento entre grupos homogêneos e treinamentos
CREATE TABLE IF NOT EXISTS grupos_homogeneos_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_homogeneo_id UUID NOT NULL REFERENCES grupos_homogeneos(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grupo_homogeneo_id, treinamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_empresa_id ON grupos_homogeneos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_cliente_id ON grupos_homogeneos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_cargo_id ON grupos_homogeneos(cargo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_treinamentos_grupo_id ON grupos_homogeneos_treinamentos(grupo_homogeneo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_treinamentos_treinamento_id ON grupos_homogeneos_treinamentos(treinamento_id);

-- RLS para grupos_homogeneos
ALTER TABLE grupos_homogeneos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver grupos homogêneos da própria empresa"
  ON grupos_homogeneos FOR SELECT
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem criar grupos homogêneos na própria empresa"
  ON grupos_homogeneos FOR INSERT
  WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar grupos homogêneos da própria empresa"
  ON grupos_homogeneos FOR UPDATE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários podem deletar grupos homogêneos da própria empresa"
  ON grupos_homogeneos FOR DELETE
  USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- RLS para grupos_homogeneos_treinamentos
ALTER TABLE grupos_homogeneos_treinamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver treinamentos de grupos homogêneos da própria empresa"
  ON grupos_homogeneos_treinamentos FOR SELECT
  USING (
    grupo_homogeneo_id IN (
      SELECT id FROM grupos_homogeneos 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem criar treinamentos em grupos homogêneos da própria empresa"
  ON grupos_homogeneos_treinamentos FOR INSERT
  WITH CHECK (
    grupo_homogeneo_id IN (
      SELECT id FROM grupos_homogeneos 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem deletar treinamentos de grupos homogêneos da própria empresa"
  ON grupos_homogeneos_treinamentos FOR DELETE
  USING (
    grupo_homogeneo_id IN (
      SELECT id FROM grupos_homogeneos 
      WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_grupos_homogeneos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grupos_homogeneos_updated_at
  BEFORE UPDATE ON grupos_homogeneos
  FOR EACH ROW
  EXECUTE FUNCTION update_grupos_homogeneos_updated_at();
