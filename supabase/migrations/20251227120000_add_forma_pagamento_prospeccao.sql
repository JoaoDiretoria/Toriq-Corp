-- Adicionar campo forma_pagamento à tabela prospeccao_cards
ALTER TABLE prospeccao_cards ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(20) DEFAULT 'a_vista';

-- Adicionar campos de valor por forma de pagamento
ALTER TABLE prospeccao_cards ADD COLUMN IF NOT EXISTS valor_a_vista NUMERIC(15,2) DEFAULT 0;
ALTER TABLE prospeccao_cards ADD COLUMN IF NOT EXISTS valor_3x NUMERIC(15,2) DEFAULT 0;
ALTER TABLE prospeccao_cards ADD COLUMN IF NOT EXISTS valor_leasing NUMERIC(15,2) DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN prospeccao_cards.forma_pagamento IS 'Forma de pagamento selecionada: a_vista, 3x, leasing';
COMMENT ON COLUMN prospeccao_cards.valor_a_vista IS 'Valor do negócio à vista';
COMMENT ON COLUMN prospeccao_cards.valor_3x IS 'Valor do negócio em 3 vezes';
COMMENT ON COLUMN prospeccao_cards.valor_leasing IS 'Valor do negócio em leasing';
