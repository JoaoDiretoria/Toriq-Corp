-- Migration: Adicionar campos para rastrear card de origem no Contas a Receber
-- Data: 2026-01-09
-- Descrição: Permite rastrear o card original quando um recebível é criado a partir do Closer

-- Adicionar campos à tabela contas_receber
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS origem_card_id UUID,
ADD COLUMN IF NOT EXISTS origem_kanban VARCHAR(50);

-- Comentários para documentação
COMMENT ON COLUMN contas_receber.origem_card_id IS 'ID do card original de onde este recebível foi criado';
COMMENT ON COLUMN contas_receber.origem_kanban IS 'Kanban de origem (prospeccao, closer, etc)';
