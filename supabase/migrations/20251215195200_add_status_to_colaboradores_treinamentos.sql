-- Adicionar coluna status para diferenciar treinamentos necessários de realizados
-- status: 'necessario' = treinamento que o colaborador precisa fazer
-- status: 'realizado' = treinamento que o colaborador já fez

ALTER TABLE colaboradores_treinamentos 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'necessario';

-- Atualizar registros existentes para 'necessario'
UPDATE colaboradores_treinamentos SET status = 'necessario' WHERE status IS NULL;

-- Criar índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_status 
ON colaboradores_treinamentos(status);
