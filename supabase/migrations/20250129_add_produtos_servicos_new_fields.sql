-- Adicionar novos campos na tabela produtos_servicos
-- natureza: produto ou serviço (renomear campo tipo existente)
-- classificacao: finalidade do serviço (Consultoria, Treinamento, Documento, Assessoria, Suporte Técnico)
-- categoria_plano: plano do produto (Ouro, Prata, Bronze, etc)

-- Adicionar campo classificacao
ALTER TABLE produtos_servicos 
ADD COLUMN IF NOT EXISTS classificacao TEXT;

-- Adicionar campo categoria_plano
ALTER TABLE produtos_servicos 
ADD COLUMN IF NOT EXISTS categoria_plano TEXT;

-- Comentários
COMMENT ON COLUMN produtos_servicos.tipo IS 'Natureza do item: produto ou servico';
COMMENT ON COLUMN produtos_servicos.classificacao IS 'Classificação/finalidade: Consultoria, Treinamento, Documento, Assessoria, Suporte Técnico, etc';
COMMENT ON COLUMN produtos_servicos.categoria_plano IS 'Categoria/Plano: Ouro, Prata, Bronze, etc';

-- Criar tabela para classificações personalizadas por empresa
CREATE TABLE IF NOT EXISTS classificacoes_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela para categorias/planos personalizados por empresa
CREATE TABLE IF NOT EXISTS planos_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_classificacoes_produtos_empresa ON classificacoes_produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planos_produtos_empresa ON planos_produtos(empresa_id);

-- RLS para classificacoes_produtos
ALTER TABLE classificacoes_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classificacoes_produtos_select" ON classificacoes_produtos;
CREATE POLICY "classificacoes_produtos_select" ON classificacoes_produtos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "classificacoes_produtos_insert" ON classificacoes_produtos;
CREATE POLICY "classificacoes_produtos_insert" ON classificacoes_produtos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "classificacoes_produtos_update" ON classificacoes_produtos;
CREATE POLICY "classificacoes_produtos_update" ON classificacoes_produtos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "classificacoes_produtos_delete" ON classificacoes_produtos;
CREATE POLICY "classificacoes_produtos_delete" ON classificacoes_produtos
  FOR DELETE USING (true);

-- RLS para planos_produtos
ALTER TABLE planos_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_produtos_select" ON planos_produtos;
CREATE POLICY "planos_produtos_select" ON planos_produtos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "planos_produtos_insert" ON planos_produtos;
CREATE POLICY "planos_produtos_insert" ON planos_produtos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "planos_produtos_update" ON planos_produtos;
CREATE POLICY "planos_produtos_update" ON planos_produtos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "planos_produtos_delete" ON planos_produtos;
CREATE POLICY "planos_produtos_delete" ON planos_produtos
  FOR DELETE USING (true);
