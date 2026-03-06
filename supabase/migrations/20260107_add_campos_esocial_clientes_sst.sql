-- Migration: Adicionar campos eSocial e CNAE na tabela clientes_sst
-- Data: 2026-01-07
-- Descrição: Adiciona campos para Tipo de Inscrição, Nº Inscrição eSocial, CNAE, CNAE Atividade e Grau de Risco

-- Adicionar coluna tipo_inscricao (1-CNPJ, 2-CPF, 3-CAEPF, 4-CNO, 5-CGC, 6-CEI)
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS tipo_inscricao VARCHAR(1) DEFAULT '1';

-- Adicionar coluna numero_inscricao_esocial
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS numero_inscricao_esocial VARCHAR(50);

-- Adicionar coluna cnae
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS cnae VARCHAR(20);

-- Adicionar coluna cnae_atividade (descrição da atividade econômica)
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS cnae_atividade TEXT;

-- Adicionar coluna grau_risco (1, 2, 3 ou 4)
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS grau_risco VARCHAR(1);

-- Adicionar coluna porte_empresa
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS porte_empresa VARCHAR(20);

-- Adicionar coluna servicos_contratados (array de IDs de produtos_servicos)
ALTER TABLE clientes_sst 
ADD COLUMN IF NOT EXISTS servicos_contratados TEXT[];

-- Comentários nas colunas
COMMENT ON COLUMN clientes_sst.tipo_inscricao IS 'Tipo de inscrição eSocial: 1-CNPJ, 2-CPF, 3-CAEPF, 4-CNO, 5-CGC, 6-CEI';
COMMENT ON COLUMN clientes_sst.numero_inscricao_esocial IS 'Número da inscrição no eSocial (CNPJ, CPF, etc)';
COMMENT ON COLUMN clientes_sst.cnae IS 'Código CNAE da empresa';
COMMENT ON COLUMN clientes_sst.cnae_atividade IS 'Descrição da atividade econômica (CNAE)';
COMMENT ON COLUMN clientes_sst.grau_risco IS 'Grau de risco da atividade: 1-Leve, 2-Moderado, 3-Alto, 4-Muito Alto';
COMMENT ON COLUMN clientes_sst.porte_empresa IS 'Porte da empresa: MEI, ME, EPP, MEDIO, GRANDE';
COMMENT ON COLUMN clientes_sst.servicos_contratados IS 'Array de IDs dos produtos/serviços contratados';
