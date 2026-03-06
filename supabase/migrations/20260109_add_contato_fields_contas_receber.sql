-- Migration: Adicionar campos de contato e empresa do Closer no Contas a Receber
-- Data: 2026-01-09

-- Campos de contato
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS contato_nome TEXT,
ADD COLUMN IF NOT EXISTS contato_email TEXT,
ADD COLUMN IF NOT EXISTS contato_telefone TEXT;

-- Campos da empresa do lead
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS empresa_nome TEXT,
ADD COLUMN IF NOT EXISTS empresa_email TEXT,
ADD COLUMN IF NOT EXISTS empresa_telefone TEXT,
ADD COLUMN IF NOT EXISTS empresa_endereco TEXT,
ADD COLUMN IF NOT EXISTS empresa_numero TEXT,
ADD COLUMN IF NOT EXISTS empresa_complemento TEXT,
ADD COLUMN IF NOT EXISTS empresa_bairro TEXT,
ADD COLUMN IF NOT EXISTS empresa_cidade TEXT,
ADD COLUMN IF NOT EXISTS empresa_estado TEXT,
ADD COLUMN IF NOT EXISTS empresa_cep TEXT;

COMMENT ON COLUMN contas_receber.contato_nome IS 'Nome do contato do card do Closer';
COMMENT ON COLUMN contas_receber.contato_email IS 'E-mail do contato do card do Closer';
COMMENT ON COLUMN contas_receber.contato_telefone IS 'Telefone do contato do card do Closer';
COMMENT ON COLUMN contas_receber.empresa_nome IS 'Nome da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_email IS 'E-mail da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_telefone IS 'Telefone da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_endereco IS 'Endereço da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_cidade IS 'Cidade da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_estado IS 'Estado da empresa do lead';
COMMENT ON COLUMN contas_receber.empresa_cep IS 'CEP da empresa do lead';
