-- Adicionar campos de condição de pagamento à tabela contas_receber
ALTER TABLE public.contas_receber 
ADD COLUMN IF NOT EXISTS condicao_pagamento TEXT,
ADD COLUMN IF NOT EXISTS condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_contas_receber_condicao ON public.contas_receber(condicao_pagamento_id);

-- Comentários para documentação
COMMENT ON COLUMN public.contas_receber.condicao_pagamento IS 'Nome da condição de pagamento';
COMMENT ON COLUMN public.contas_receber.condicao_pagamento_id IS 'Referência à condição de pagamento';
COMMENT ON COLUMN public.contas_receber.recorrente IS 'Indica se é um recebível com cobrança recorrente mensal';
