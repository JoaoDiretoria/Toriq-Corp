-- Adicionar campo carga_horaria na tabela solicitacoes_treinamento
ALTER TABLE solicitacoes_treinamento 
ADD COLUMN IF NOT EXISTS carga_horaria INTEGER;
