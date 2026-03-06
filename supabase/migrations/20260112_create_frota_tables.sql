-- Migration: Criar tabelas para Gestão de Frota
-- Data: 2026-01-12

-- Tabela principal de veículos
CREATE TABLE IF NOT EXISTS frota_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  renavam VARCHAR(20),
  chassi VARCHAR(50),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  ano VARCHAR(20),
  tipo VARCHAR(50) DEFAULT 'Passeio',
  combustivel VARCHAR(50) DEFAULT 'Flex',
  km_atual INTEGER DEFAULT 0,
  gestor_responsavel VARCHAR(255),
  motorista_padrao VARCHAR(255),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(empresa_id, placa)
);

-- Tabela de registros de utilização
CREATE TABLE IF NOT EXISTS frota_utilizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  local_utilizacao VARCHAR(255),
  motorista VARCHAR(255),
  km_inicio INTEGER NOT NULL,
  km_fim INTEGER NOT NULL,
  km_rodado INTEGER GENERATED ALWAYS AS (km_fim - km_inicio) STORED,
  finalidade VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de manutenções
CREATE TABLE IF NOT EXISTS frota_manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- Preventiva, Preditiva, Corretiva
  data DATE NOT NULL,
  km INTEGER,
  servico VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Agendada', -- Agendada, Em andamento, Concluída, Pendente
  custo DECIMAL(12,2) DEFAULT 0,
  proxima_km INTEGER,
  proxima_data DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de checklists
CREATE TABLE IF NOT EXISTS frota_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo VARCHAR(50) DEFAULT 'Pré-uso', -- Pré-uso, Pós-uso
  km INTEGER,
  responsavel VARCHAR(255),
  local_inspecao VARCHAR(255),
  itens_verificados TEXT[], -- Array de itens marcados
  status_geral VARCHAR(50) NOT NULL DEFAULT 'Aprovado', -- Aprovado, Atenção, Reprovado
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de custos
CREATE TABLE IF NOT EXISTS frota_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  categoria VARCHAR(50) NOT NULL, -- Abastecimento, Pedágio, Seguro, Peças, Serviços, Multa, Outro
  data DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  fornecedor VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS frota_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  tipo_documento VARCHAR(50) NOT NULL, -- Licenciamento, Seguro, IPVA, Inspeção, Tacógrafo, Outro
  numero VARCHAR(100),
  data_vencimento DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de ocorrências
CREATE TABLE IF NOT EXISTS frota_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES frota_veiculos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- Avaria, Acidente, Multa, Falha, Outro
  data DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Aberta', -- Aberta, Em análise, Resolvida, Pendente
  local_ocorrencia VARCHAR(255),
  descricao TEXT NOT NULL,
  custo_estimado DECIMAL(12,2),
  responsavel VARCHAR(255),
  prazo DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_empresa ON frota_veiculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_placa ON frota_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_veiculo ON frota_utilizacoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_data ON frota_utilizacoes(data);
CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_veiculo ON frota_manutencoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_status ON frota_manutencoes(status);
CREATE INDEX IF NOT EXISTS idx_frota_checklists_veiculo ON frota_checklists(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_custos_veiculo ON frota_custos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_custos_data ON frota_custos(data);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_veiculo ON frota_documentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_vencimento ON frota_documentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_veiculo ON frota_ocorrencias(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_status ON frota_ocorrencias(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_frota_veiculos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_frota_veiculos_updated_at ON frota_veiculos;
CREATE TRIGGER trigger_frota_veiculos_updated_at
  BEFORE UPDATE ON frota_veiculos
  FOR EACH ROW
  EXECUTE FUNCTION update_frota_veiculos_updated_at();

-- RLS Policies
ALTER TABLE frota_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_utilizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frota_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Policies para frota_veiculos
CREATE POLICY "frota_veiculos_select" ON frota_veiculos
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "frota_veiculos_insert" ON frota_veiculos
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "frota_veiculos_update" ON frota_veiculos
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "frota_veiculos_delete" ON frota_veiculos
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policies para frota_utilizacoes
CREATE POLICY "frota_utilizacoes_select" ON frota_utilizacoes
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_utilizacoes_insert" ON frota_utilizacoes
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_utilizacoes_update" ON frota_utilizacoes
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_utilizacoes_delete" ON frota_utilizacoes
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Policies para frota_manutencoes
CREATE POLICY "frota_manutencoes_select" ON frota_manutencoes
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_manutencoes_insert" ON frota_manutencoes
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_manutencoes_update" ON frota_manutencoes
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_manutencoes_delete" ON frota_manutencoes
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Policies para frota_checklists
CREATE POLICY "frota_checklists_select" ON frota_checklists
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_checklists_insert" ON frota_checklists
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_checklists_update" ON frota_checklists
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_checklists_delete" ON frota_checklists
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Policies para frota_custos
CREATE POLICY "frota_custos_select" ON frota_custos
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_custos_insert" ON frota_custos
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_custos_update" ON frota_custos
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_custos_delete" ON frota_custos
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Policies para frota_documentos
CREATE POLICY "frota_documentos_select" ON frota_documentos
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_documentos_insert" ON frota_documentos
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_documentos_update" ON frota_documentos
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_documentos_delete" ON frota_documentos
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Policies para frota_ocorrencias
CREATE POLICY "frota_ocorrencias_select" ON frota_ocorrencias
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_ocorrencias_insert" ON frota_ocorrencias
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_ocorrencias_update" ON frota_ocorrencias
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "frota_ocorrencias_delete" ON frota_ocorrencias
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );
