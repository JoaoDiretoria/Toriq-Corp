-- Adicionar coluna data_realizacao para registrar quando o treinamento foi realizado
ALTER TABLE colaboradores_treinamentos 
ADD COLUMN IF NOT EXISTS data_realizacao DATE;

-- Criar índice para filtrar por data
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_data_realizacao 
ON colaboradores_treinamentos(data_realizacao);
