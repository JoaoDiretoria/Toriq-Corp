-- Adicionar campos extras à tabela prospeccao_atividades
ALTER TABLE prospeccao_atividades 
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS prazo DATE,
ADD COLUMN IF NOT EXISTS horario TIME,
ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;

-- Criar tabela de modelos de mensagens
CREATE TABLE IF NOT EXISTS prospeccao_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prospeccao_modelos_empresa ON prospeccao_modelos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_modelos_tipo ON prospeccao_modelos(tipo);

-- RLS
ALTER TABLE prospeccao_modelos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de criar (para evitar erro de duplicação)
DROP POLICY IF EXISTS "Usuários podem ver modelos da sua empresa" ON prospeccao_modelos;
DROP POLICY IF EXISTS "Usuários podem criar modelos na sua empresa" ON prospeccao_modelos;
DROP POLICY IF EXISTS "Usuários podem atualizar modelos da sua empresa" ON prospeccao_modelos;
DROP POLICY IF EXISTS "Usuários podem deletar modelos da sua empresa" ON prospeccao_modelos;

-- Políticas para prospeccao_modelos
CREATE POLICY "Usuários podem ver modelos da sua empresa"
  ON prospeccao_modelos FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem criar modelos na sua empresa"
  ON prospeccao_modelos FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem atualizar modelos da sua empresa"
  ON prospeccao_modelos FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem deletar modelos da sua empresa"
  ON prospeccao_modelos FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );
