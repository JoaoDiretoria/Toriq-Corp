-- Migration: Adicionar campo comissao na tabela colaboradores
-- Data: 2025-12-29
-- Descrição: Adiciona o campo comissao (percentual) para colaboradores do setor comercial

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2);

COMMENT ON COLUMN colaboradores.comissao IS 'Percentual de comissão do colaborador sobre negócios fechados (apenas para setor comercial)';
