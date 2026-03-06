-- Migration: Adicionar campos PCMSO na tabela clientes_sst
-- Data: 2026-01-07

-- Adicionar campo possui_pcmso (boolean)
ALTER TABLE clientes_sst
ADD COLUMN IF NOT EXISTS possui_pcmso BOOLEAN DEFAULT FALSE;

-- Adicionar campo medico_responsavel_id (referência a profiles)
ALTER TABLE clientes_sst
ADD COLUMN IF NOT EXISTS medico_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON COLUMN clientes_sst.possui_pcmso IS 'Indica se a empresa possui PCMSO (Programa de Controle Médico de Saúde Ocupacional)';
COMMENT ON COLUMN clientes_sst.medico_responsavel_id IS 'ID do médico responsável pelo PCMSO da empresa';
