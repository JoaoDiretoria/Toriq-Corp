-- Adicionar coluna grupo_homogeneo_id na tabela colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS grupo_homogeneo_id UUID REFERENCES grupos_homogeneos(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_grupo_homogeneo_id ON colaboradores(grupo_homogeneo_id);
