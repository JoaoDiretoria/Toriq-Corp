-- Adicionar coluna proposta_aprovada na tabela funil_card_atividades
-- Para controlar se a proposta comercial foi aprovada

ALTER TABLE funil_card_atividades 
ADD COLUMN IF NOT EXISTS proposta_aprovada BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN funil_card_atividades.proposta_aprovada IS 'Indica se a proposta comercial vinculada a esta atividade foi aprovada';
