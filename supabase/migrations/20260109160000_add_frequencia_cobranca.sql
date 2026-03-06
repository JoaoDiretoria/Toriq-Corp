-- Adicionar campos de frequência de cobrança à tabela contas_pagar
ALTER TABLE public.contas_pagar 
ADD COLUMN IF NOT EXISTS frequencia_cobranca VARCHAR(20) DEFAULT 'unico';

ALTER TABLE public.contas_pagar 
ADD COLUMN IF NOT EXISTS tipo_valor_recorrente VARCHAR(20) DEFAULT NULL;

-- Constraint para frequencia_cobranca
ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_frequencia_check;

ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_frequencia_check CHECK (frequencia_cobranca IN ('unico', 'recorrente'));

-- Constraint para tipo_valor_recorrente
ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_tipo_valor_check;

ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_tipo_valor_check CHECK (
  tipo_valor_recorrente IS NULL OR tipo_valor_recorrente IN ('fixo', 'variavel')
);

-- Índice para frequência
CREATE INDEX IF NOT EXISTS idx_contas_pagar_frequencia ON public.contas_pagar(frequencia_cobranca);

-- Comentários
COMMENT ON COLUMN public.contas_pagar.frequencia_cobranca IS 'Frequência de cobrança: unico (esporádico) ou recorrente (mensal)';
COMMENT ON COLUMN public.contas_pagar.tipo_valor_recorrente IS 'Tipo de valor para pagamento recorrente: fixo ou variavel (alterado a cada mês)';
