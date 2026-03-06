-- Migration: Adicionar coluna acoes_rapidas_config à tabela funil_cards
-- Data: 2026-01-01

-- Adicionar coluna acoes_rapidas_config para configuração de visibilidade das ações rápidas por card
ALTER TABLE funil_cards 
ADD COLUMN IF NOT EXISTS acoes_rapidas_config JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN funil_cards.acoes_rapidas_config IS 'Configuração de visibilidade das ações rápidas do card. Formato: {"acao_id": true/false}. Null ou ausente = visível.';
