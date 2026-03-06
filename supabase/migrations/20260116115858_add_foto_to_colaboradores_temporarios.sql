-- Adicionar campos foto_url e matricula na tabela colaboradores_temporarios
ALTER TABLE colaboradores_temporarios 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE colaboradores_temporarios 
ADD COLUMN IF NOT EXISTS matricula TEXT;

-- Comentários explicativos
COMMENT ON COLUMN colaboradores_temporarios.foto_url IS 'URL da foto do colaborador adicionada pelo instrutor antes de aprovar';
COMMENT ON COLUMN colaboradores_temporarios.matricula IS 'Matrícula do colaborador informada no cadastro';
