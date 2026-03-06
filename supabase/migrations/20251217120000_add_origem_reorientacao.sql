-- Adicionar campo origem na tabela de reorientações
ALTER TABLE reorientacoes_colaborador 
ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'instrutor';

-- Comentário explicativo
COMMENT ON COLUMN reorientacoes_colaborador.origem IS 'Origem da reorientação: qrcode ou instrutor';
