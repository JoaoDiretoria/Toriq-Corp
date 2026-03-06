-- Adicionar campos de endereço na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS email text;