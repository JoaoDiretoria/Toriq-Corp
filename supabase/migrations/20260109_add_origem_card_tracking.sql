-- Migration: Adicionar campos para rastrear card de origem entre Kanbans
-- Data: 2026-01-09
-- Descrição: Permite rastrear o card original quando um lead é movido entre Kanbans

-- Adicionar campos à tabela closer_cards
ALTER TABLE closer_cards 
ADD COLUMN IF NOT EXISTS origem_card_id UUID,
ADD COLUMN IF NOT EXISTS origem_kanban VARCHAR(50);

-- Adicionar campos à tabela pos_venda_cards
ALTER TABLE pos_venda_cards 
ADD COLUMN IF NOT EXISTS origem_card_id UUID,
ADD COLUMN IF NOT EXISTS origem_kanban VARCHAR(50);

-- Adicionar campos à tabela cross_selling_cards (se existir)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cross_selling_cards') THEN
    ALTER TABLE cross_selling_cards 
    ADD COLUMN IF NOT EXISTS origem_card_id UUID,
    ADD COLUMN IF NOT EXISTS origem_kanban VARCHAR(50);
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN closer_cards.origem_card_id IS 'ID do card original de onde este card foi encaminhado';
COMMENT ON COLUMN closer_cards.origem_kanban IS 'Kanban de origem (prospeccao, closer, onboarding, etc)';
