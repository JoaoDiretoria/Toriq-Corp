-- Adicionar campos de classificação e descrição de despesa padrão na tabela de fornecedores
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS classificacao_despesa_padrao VARCHAR(100),
ADD COLUMN IF NOT EXISTS descricao_despesa_padrao TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.fornecedores.classificacao_despesa_padrao IS 'Classificação de despesa padrão para este fornecedor (tipo do plano_despesas)';
COMMENT ON COLUMN public.fornecedores.descricao_despesa_padrao IS 'Descrição de despesa padrão para este fornecedor (nome do plano_despesas)';
