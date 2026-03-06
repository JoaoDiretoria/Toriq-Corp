-- Migração: Adicionar campos 'apto' e 'data_desativacao' na tabela instrutores
-- 'apto' indica se o instrutor possui todas as formações e treinamentos com anexos válidos
-- 'data_desativacao' registra quando o instrutor foi desativado

-- Adicionar campo 'apto' na tabela instrutores
ALTER TABLE instrutores 
ADD COLUMN IF NOT EXISTS apto BOOLEAN DEFAULT FALSE;

-- Adicionar campo 'data_desativacao' para registrar quando o instrutor foi desativado
ALTER TABLE instrutores 
ADD COLUMN IF NOT EXISTS data_desativacao TIMESTAMPTZ DEFAULT NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN instrutores.apto IS 'Indica se o instrutor está apto (possui formações com anexos e treinamentos vinculados com anexos)';
COMMENT ON COLUMN instrutores.data_desativacao IS 'Data e hora em que o instrutor foi desativado. NULL se estiver ativo.';

-- Criar índice para consultas rápidas de instrutores aptos
CREATE INDEX IF NOT EXISTS idx_instrutores_apto ON instrutores(apto) WHERE apto = TRUE;

-- Criar índice para consultas de instrutores ativos
CREATE INDEX IF NOT EXISTS idx_instrutores_ativo ON instrutores(ativo) WHERE ativo = TRUE;
