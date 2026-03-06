-- Migration: Adicionar campo checklist_obrigatorio na tabela frota_veiculos
-- Data: 2026-01-12

-- Adicionar coluna para indicar se checklist é obrigatório para cada uso do veículo
ALTER TABLE frota_veiculos 
ADD COLUMN IF NOT EXISTS checklist_obrigatorio BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN frota_veiculos.checklist_obrigatorio IS 'Indica se o checklist é obrigatório antes de cada utilização do veículo';
