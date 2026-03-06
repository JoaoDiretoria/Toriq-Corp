-- Tabela para armazenar permissões de acesso por setor
CREATE TABLE IF NOT EXISTS setor_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
  modulo_id VARCHAR(100) NOT NULL,
  pagina_id VARCHAR(100) NOT NULL,
  visualizar BOOLEAN DEFAULT FALSE,
  editar BOOLEAN DEFAULT FALSE,
  criar BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(setor_id, modulo_id, pagina_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_setor_permissoes_setor_id ON setor_permissoes(setor_id);
CREATE INDEX IF NOT EXISTS idx_setor_permissoes_modulo_pagina ON setor_permissoes(modulo_id, pagina_id);

-- Habilitar RLS
ALTER TABLE setor_permissoes ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT - usuários autenticados podem ver permissões da sua empresa
CREATE POLICY "Users can view setor_permissoes of their company"
ON setor_permissoes FOR SELECT TO authenticated
USING (
  setor_id IN (
    SELECT s.id FROM setores s
    WHERE s.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  )
);

-- Policy para INSERT - empresa_sst e admin podem inserir
CREATE POLICY "SST can insert setor_permissoes"
ON setor_permissoes FOR INSERT TO authenticated
WITH CHECK (
  setor_id IN (
    SELECT s.id FROM setores s
    WHERE s.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('empresa_sst', 'admin_vertical')
  )
);

-- Policy para UPDATE - empresa_sst e admin podem atualizar
CREATE POLICY "SST can update setor_permissoes"
ON setor_permissoes FOR UPDATE TO authenticated
USING (
  setor_id IN (
    SELECT s.id FROM setores s
    WHERE s.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('empresa_sst', 'admin_vertical')
  )
);

-- Policy para DELETE - empresa_sst e admin podem deletar
CREATE POLICY "SST can delete setor_permissoes"
ON setor_permissoes FOR DELETE TO authenticated
USING (
  setor_id IN (
    SELECT s.id FROM setores s
    WHERE s.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('empresa_sst', 'admin_vertical')
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_setor_permissoes_updated_at
  BEFORE UPDATE ON setor_permissoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
