-- Adicionar campos do Closer na tabela pos_venda_cards para manter consistência
-- quando um card é movido de Fechado/Ganho para Onboarding

-- Campos de pagamento
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(20);
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS valor_a_vista NUMERIC(15,2);
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS valor_3x NUMERIC(15,2);
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS valor_leasing NUMERIC(15,2);

-- Campos de temperatura e origem
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS temperatura VARCHAR(20) DEFAULT 'morno';
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS origem VARCHAR(100);

-- Campos de dados do orçamento (JSON)
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS dados_orcamento JSONB;
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS dados_custo_mensal JSONB;
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS dados_comparacao JSONB;
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS dados_proposta JSONB;

-- Campo para contatos adicionais
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS contatos JSONB DEFAULT '[]'::jsonb;

-- Campo para referência ao card original do Closer
ALTER TABLE pos_venda_cards ADD COLUMN IF NOT EXISTS closer_card_id UUID;

-- Comentários
COMMENT ON COLUMN pos_venda_cards.forma_pagamento IS 'Forma de pagamento: a_vista, 3x, leasing';
COMMENT ON COLUMN pos_venda_cards.closer_card_id IS 'Referência ao card original do Closer';
