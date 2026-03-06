-- Migration: Criar tabela de categorias de clientes por empresa
-- Data: 2026-01-01

-- Tabela para categorias de clientes específicas de cada empresa
CREATE TABLE IF NOT EXISTS categorias_clientes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#6366f1',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Adicionar coluna categoria_id na tabela clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_clientes_empresa(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categorias_clientes_empresa_empresa_id ON categorias_clientes_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria_id ON clientes(categoria_id);

-- RLS
ALTER TABLE categorias_clientes_empresa ENABLE ROW LEVEL SECURITY;

-- Política para empresas verem suas categorias
CREATE POLICY "Empresas podem ver suas categorias" ON categorias_clientes_empresa
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política para empresas gerenciarem suas categorias
CREATE POLICY "Empresas podem gerenciar suas categorias" ON categorias_clientes_empresa
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE categorias_clientes_empresa IS 'Categorias de clientes específicas de cada empresa SST';
COMMENT ON COLUMN categorias_clientes_empresa.cor IS 'Cor em formato hexadecimal para identificação visual';
COMMENT ON COLUMN clientes.categoria_id IS 'Categoria do cliente definida pela empresa';
