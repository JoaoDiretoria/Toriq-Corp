-- Adicionar campos de endereço detalhado na tabela empresas
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS complemento text,
ADD COLUMN IF NOT EXISTS bairro text;