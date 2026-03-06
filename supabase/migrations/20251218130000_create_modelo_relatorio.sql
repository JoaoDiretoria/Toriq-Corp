-- Tabela principal de modelos de relatório
CREATE TABLE IF NOT EXISTS modelo_relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('certificado', 'etapa', 'relatorio')),
  selecao_treinamento VARCHAR(50) NOT NULL DEFAULT 'todos' CHECK (selecao_treinamento IN ('todos', 'individual', 'todos_exceto')),
  largura INTEGER,
  altura INTEGER,
  moldura_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de treinamentos vinculados ao modelo (para seleção individual ou todos_exceto)
CREATE TABLE IF NOT EXISTS modelo_relatorio_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES modelo_relatorios(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(modelo_id, treinamento_id)
);

-- Tabela de textos do modelo (para certificados)
CREATE TABLE IF NOT EXISTS modelo_relatorio_textos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES modelo_relatorios(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  tamanho INTEGER NOT NULL DEFAULT 14,
  fonte VARCHAR(100) NOT NULL DEFAULT 'Arial',
  peso VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (peso IN ('normal', 'bold', 'light')),
  alinhamento VARCHAR(50) NOT NULL DEFAULT 'center' CHECK (alinhamento IN ('left', 'center', 'right', 'justify')),
  cor VARCHAR(20) DEFAULT '#000000',
  posicao_x INTEGER DEFAULT 0,
  posicao_y INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de molduras disponíveis
CREATE TABLE IF NOT EXISTS modelo_relatorio_molduras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  largura INTEGER,
  altura INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_modelo_relatorios_empresa ON modelo_relatorios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modelo_relatorio_treinamentos_modelo ON modelo_relatorio_treinamentos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_modelo_relatorio_textos_modelo ON modelo_relatorio_textos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_modelo_relatorio_molduras_empresa ON modelo_relatorio_molduras(empresa_id);

-- RLS
ALTER TABLE modelo_relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_relatorio_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_relatorio_textos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_relatorio_molduras ENABLE ROW LEVEL SECURITY;

-- Políticas para modelo_relatorios
CREATE POLICY "Empresas podem ver seus modelos" ON modelo_relatorios
  FOR SELECT USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE id = empresa_id
      AND (
        auth.uid() IN (SELECT id FROM profiles WHERE empresa_id = modelo_relatorios.empresa_id)
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
      )
    )
  );

CREATE POLICY "Empresas podem criar modelos" ON modelo_relatorios
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

CREATE POLICY "Empresas podem atualizar seus modelos" ON modelo_relatorios
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

CREATE POLICY "Empresas podem deletar seus modelos" ON modelo_relatorios
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

-- Políticas para modelo_relatorio_treinamentos
CREATE POLICY "Acesso a treinamentos do modelo" ON modelo_relatorio_treinamentos
  FOR ALL USING (
    modelo_id IN (
      SELECT id FROM modelo_relatorios WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

-- Políticas para modelo_relatorio_textos
CREATE POLICY "Acesso a textos do modelo" ON modelo_relatorio_textos
  FOR ALL USING (
    modelo_id IN (
      SELECT id FROM modelo_relatorios WHERE empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

-- Políticas para modelo_relatorio_molduras
CREATE POLICY "Empresas podem ver suas molduras" ON modelo_relatorio_molduras
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

CREATE POLICY "Empresas podem criar molduras" ON modelo_relatorio_molduras
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

CREATE POLICY "Empresas podem deletar suas molduras" ON modelo_relatorio_molduras
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_modelo_relatorio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_modelo_relatorios_updated_at
  BEFORE UPDATE ON modelo_relatorios
  FOR EACH ROW
  EXECUTE FUNCTION update_modelo_relatorio_updated_at();

CREATE TRIGGER trigger_modelo_relatorio_textos_updated_at
  BEFORE UPDATE ON modelo_relatorio_textos
  FOR EACH ROW
  EXECUTE FUNCTION update_modelo_relatorio_updated_at();
