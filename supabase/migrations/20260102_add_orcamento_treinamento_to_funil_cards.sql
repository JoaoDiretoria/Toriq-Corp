-- Migration: Adicionar coluna orcamento_treinamento à tabela funil_cards
-- Data: 2026-01-02

-- Adicionar coluna orcamento_treinamento para armazenar dados do orçamento de treinamento normativo
ALTER TABLE funil_cards 
ADD COLUMN IF NOT EXISTS orcamento_treinamento JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN funil_cards.orcamento_treinamento IS 'Dados do orçamento de treinamento normativo. Formato JSON com: empresa, cidadeDestino, estadoOrigem, cidadeOrigem, km, tabelaPrecos, config.';
