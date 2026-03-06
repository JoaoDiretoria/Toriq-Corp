-- Migration: Adicionar coluna cliente_id nas tabelas de profissionais
-- Data: 2026-01-14
-- Descrição: Permite vincular profissionais de saúde e segurança a clientes específicos

-- Adicionar coluna cliente_id na tabela profissionais_saude
ALTER TABLE profissionais_saude 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes_sst(id) ON DELETE SET NULL;

-- Adicionar coluna cliente_id na tabela profissionais_seguranca
ALTER TABLE profissionais_seguranca 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes_sst(id) ON DELETE SET NULL;

-- Criar índices para melhor performance nas buscas por cliente
CREATE INDEX IF NOT EXISTS idx_profissionais_saude_cliente_id ON profissionais_saude(cliente_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_seguranca_cliente_id ON profissionais_seguranca(cliente_id);

-- Comentários
COMMENT ON COLUMN profissionais_saude.cliente_id IS 'Cliente SST ao qual o profissional está vinculado (opcional)';
COMMENT ON COLUMN profissionais_seguranca.cliente_id IS 'Cliente SST ao qual o profissional está vinculado (opcional)';
