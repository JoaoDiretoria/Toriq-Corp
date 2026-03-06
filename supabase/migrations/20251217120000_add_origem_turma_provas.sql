-- Adicionar coluna origem na tabela turma_provas
ALTER TABLE turma_provas 
ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'qrcode';

-- Comentário explicativo
COMMENT ON COLUMN turma_provas.origem IS 'Origem do preenchimento da prova: qrcode ou instrutor';

-- Atualizar registros existentes para ter origem qrcode
UPDATE turma_provas SET origem = 'qrcode' WHERE origem IS NULL;
