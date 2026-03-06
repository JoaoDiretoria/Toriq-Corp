-- Criar tabela de serviços da Toriq
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  tipo TEXT, -- 'produto', 'servico', 'consultoria', 'treinamento'
  preco DECIMAL(10,2),
  unidade TEXT, -- 'hora', 'dia', 'projeto', 'mensal', 'anual', 'unidade'
  duracao_estimada TEXT,
  ativo BOOLEAN DEFAULT true,
  destaque BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_servicos_empresa_id ON servicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON servicos(categoria);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_servicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_servicos_updated_at ON servicos;
CREATE TRIGGER trigger_servicos_updated_at
  BEFORE UPDATE ON servicos
  FOR EACH ROW
  EXECUTE FUNCTION update_servicos_updated_at();

-- RLS
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Política para admin_vertical ver todos os serviços
CREATE POLICY "Admin vertical pode ver todos os serviços"
  ON servicos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_vertical'
    )
  );

-- Política para admin_vertical gerenciar serviços
CREATE POLICY "Admin vertical pode gerenciar serviços"
  ON servicos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin_vertical'
    )
  );

-- Comentários
COMMENT ON TABLE servicos IS 'Tabela de serviços oferecidos pela empresa';
COMMENT ON COLUMN servicos.tipo IS 'Tipo do serviço: produto, servico, consultoria, treinamento';
COMMENT ON COLUMN servicos.unidade IS 'Unidade de cobrança: hora, dia, projeto, mensal, anual, unidade';
