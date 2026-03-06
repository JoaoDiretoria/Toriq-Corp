-- Adiciona coluna para armazenar orçamento Vertical 365 nos cards do funil
ALTER TABLE funil_cards 
ADD COLUMN IF NOT EXISTS orcamento_vertical365 JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN funil_cards.orcamento_vertical365 IS 'Armazena os dados do orçamento Vertical 365 (treinamentos, gestão, implantação, desconto, totais)';
