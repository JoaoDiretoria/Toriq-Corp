-- Migration: Criar tabelas de Profissionais de Saúde e Profissionais de Segurança
-- Data: 2026-01-07

-- Tabela de Profissionais de Saúde
CREATE TABLE IF NOT EXISTS profissionais_saude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  especialidade VARCHAR(100) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11),
  conselho VARCHAR(50),
  nr_conselho VARCHAR(50),
  uf_conselho VARCHAR(2),
  certificado_digital_url TEXT,
  senha_certificado TEXT,
  rubrica_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Profissionais de Segurança
CREATE TABLE IF NOT EXISTS profissionais_seguranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  especialidade VARCHAR(100) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11),
  conselho VARCHAR(50),
  nr_conselho VARCHAR(50),
  uf_conselho VARCHAR(2),
  certificado_digital_url TEXT,
  senha_certificado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profissionais_saude_empresa_id ON profissionais_saude(empresa_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_seguranca_empresa_id ON profissionais_seguranca(empresa_id);

-- RLS Policies para profissionais_saude
ALTER TABLE profissionais_saude ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver profissionais de saúde da sua empresa"
  ON profissionais_saude FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir profissionais de saúde na sua empresa"
  ON profissionais_saude FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar profissionais de saúde da sua empresa"
  ON profissionais_saude FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar profissionais de saúde da sua empresa"
  ON profissionais_saude FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies para profissionais_seguranca
ALTER TABLE profissionais_seguranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver profissionais de segurança da sua empresa"
  ON profissionais_seguranca FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir profissionais de segurança na sua empresa"
  ON profissionais_seguranca FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar profissionais de segurança da sua empresa"
  ON profissionais_seguranca FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar profissionais de segurança da sua empresa"
  ON profissionais_seguranca FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Comentários
COMMENT ON TABLE profissionais_saude IS 'Cadastro de profissionais de saúde da empresa';
COMMENT ON TABLE profissionais_seguranca IS 'Cadastro de profissionais de segurança da empresa';
