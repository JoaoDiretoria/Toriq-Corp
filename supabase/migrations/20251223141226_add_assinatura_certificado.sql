-- Adicionar coluna assinatura_certificado na tabela turma_colaboradores
-- Esta coluna armazena a assinatura digital do colaborador para o certificado
ALTER TABLE turma_colaboradores ADD COLUMN IF NOT EXISTS assinatura_certificado TEXT;

-- Comentário explicativo
COMMENT ON COLUMN turma_colaboradores.assinatura_certificado IS 'Assinatura digital do colaborador para o certificado (base64 data URL)';
