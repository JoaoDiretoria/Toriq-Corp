-- Adicionar campo de origem na tabela de presenças
-- Valores possíveis: 'qrcode', 'instrutor'
ALTER TABLE turma_colaborador_presencas 
ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'instrutor';

-- Comentário para documentação
COMMENT ON COLUMN turma_colaborador_presencas.origem IS 'Origem da marcação de presença: qrcode ou instrutor';
