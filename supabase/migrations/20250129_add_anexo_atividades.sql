-- Adicionar coluna anexo_url na tabela funil_card_atividades
ALTER TABLE funil_card_atividades 
ADD COLUMN IF NOT EXISTS anexo_url TEXT,
ADD COLUMN IF NOT EXISTS anexo_nome TEXT;

-- Comentários explicativos
COMMENT ON COLUMN funil_card_atividades.anexo_url IS 'URL do anexo armazenado no storage';
COMMENT ON COLUMN funil_card_atividades.anexo_nome IS 'Nome original do arquivo anexado';
