-- Criar tabela de tipos de empresa
CREATE TABLE IF NOT EXISTS tipos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de categorias de clientes
CREATE TABLE IF NOT EXISTS categorias_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tipos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para tipos_empresa (admin_vertical pode gerenciar)
CREATE POLICY "Admin pode ver tipos de empresa"
  ON tipos_empresa FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode criar tipos de empresa"
  ON tipos_empresa FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode atualizar tipos de empresa"
  ON tipos_empresa FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode deletar tipos de empresa"
  ON tipos_empresa FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Políticas para categorias_clientes (admin_vertical pode gerenciar)
CREATE POLICY "Admin pode ver categorias de clientes"
  ON categorias_clientes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode criar categorias de clientes"
  ON categorias_clientes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode atualizar categorias de clientes"
  ON categorias_clientes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode deletar categorias de clientes"
  ON categorias_clientes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_tipos_empresa_updated_at
  BEFORE UPDATE ON tipos_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_clientes_updated_at
  BEFORE UPDATE ON categorias_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns tipos de empresa padrão
INSERT INTO tipos_empresa (nome, descricao) VALUES
  ('Indústria', 'Empresas do setor industrial'),
  ('Comércio', 'Empresas do setor comercial'),
  ('Serviços', 'Empresas prestadoras de serviços'),
  ('Construção Civil', 'Empresas do setor de construção'),
  ('Agronegócio', 'Empresas do setor agrícola')
ON CONFLICT (nome) DO NOTHING;

-- Inserir algumas categorias de clientes padrão
INSERT INTO categorias_clientes (nome, descricao) VALUES
  ('Premium', 'Clientes com atendimento prioritário'),
  ('Standard', 'Clientes com atendimento padrão'),
  ('Básico', 'Clientes com plano básico'),
  ('VIP', 'Clientes especiais com benefícios exclusivos')
ON CONFLICT (nome) DO NOTHING;
