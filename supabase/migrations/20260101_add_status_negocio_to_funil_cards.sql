-- Migration: Adicionar coluna status_negocio à tabela funil_cards
-- Data: 2026-01-01

-- Adicionar coluna status_negocio para funis do tipo negócio
ALTER TABLE funil_cards 
ADD COLUMN IF NOT EXISTS status_negocio VARCHAR(20) DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN funil_cards.status_negocio IS 'Status do negócio: perdido, em_andamento, aceito, ganho. Usado apenas para funis do tipo negócio.';
