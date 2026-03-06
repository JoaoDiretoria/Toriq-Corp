-- Tabela de modelos de contrato
CREATE TABLE IF NOT EXISTS modelos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'cliente', -- 'cliente' ou 'parceiro'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cláusulas padrão dos modelos
CREATE TABLE IF NOT EXISTS modelo_clausulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES modelos_contrato(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de módulos/serviços padrão dos modelos
CREATE TABLE IF NOT EXISTS modelo_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES modelos_contrato(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  versao VARCHAR(50),
  tipo_cliente VARCHAR(50) DEFAULT 'Cliente direto',
  descricao TEXT,
  itens TEXT[], -- Array de itens inclusos
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela principal de contratos
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero VARCHAR(50) NOT NULL, -- Formato: TQ-ANO-NUMERO
  modelo_id UUID REFERENCES modelos_contrato(id) ON DELETE SET NULL,
  
  -- Tipo de contrato
  tipo VARCHAR(50) NOT NULL DEFAULT 'cliente', -- 'cliente' ou 'parceiro'
  
  -- Dados do cliente/parceiro
  cliente_id UUID REFERENCES clientes_sst(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,
  instrutor_id UUID REFERENCES instrutores(id) ON DELETE SET NULL,
  
  -- Dados manuais (caso não tenha vínculo)
  razao_social VARCHAR(255),
  cnpj VARCHAR(20),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  email VARCHAR(255),
  representante_legal VARCHAR(255),
  
  -- Valores
  valor_implantacao DECIMAL(10,2) DEFAULT 0,
  valor_mensal DECIMAL(10,2) DEFAULT 0,
  valor_avista DECIMAL(10,2) DEFAULT 0,
  texto_avista VARCHAR(255),
  valor_3x DECIMAL(10,2) DEFAULT 0,
  texto_3x VARCHAR(255),
  valor_leasing DECIMAL(10,2) DEFAULT 0,
  texto_leasing VARCHAR(255),
  forma_pagamento VARCHAR(50) DEFAULT 'avista', -- 'avista', '3x', 'leasing', 'mensal'
  meio_pagamento VARCHAR(50) DEFAULT 'pix',
  observacao_comercial TEXT,
  
  -- Info gerais
  validade_dias INTEGER DEFAULT 10,
  foro VARCHAR(255),
  observacoes_adicionais TEXT,
  criado_por VARCHAR(255),
  
  -- Assinatura
  assinante_nome VARCHAR(255),
  assinante_cpf VARCHAR(14),
  assinado BOOLEAN DEFAULT false,
  data_assinatura TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'rascunho', -- 'rascunho', 'enviado', 'assinado', 'cancelado'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cláusulas do contrato
CREATE TABLE IF NOT EXISTS contrato_clausulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de módulos/serviços do contrato
CREATE TABLE IF NOT EXISTS contrato_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  versao VARCHAR(50),
  tipo_cliente VARCHAR(50) DEFAULT 'Cliente direto',
  descricao TEXT,
  itens TEXT[], -- Array de itens inclusos
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id ON contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_parceiro_id ON contratos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_contrato_clausulas_contrato_id ON contrato_clausulas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_modulos_contrato_id ON contrato_modulos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_empresa_id ON modelos_contrato(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modelo_clausulas_modelo_id ON modelo_clausulas(modelo_id);
CREATE INDEX IF NOT EXISTS idx_modelo_modulos_modelo_id ON modelo_modulos(modelo_id);

-- Sequence para número do contrato
CREATE SEQUENCE IF NOT EXISTS contrato_numero_seq START 1;

-- Função para gerar número do contrato
CREATE OR REPLACE FUNCTION generate_contrato_numero(p_empresa_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_ano INTEGER;
  v_numero INTEGER;
BEGIN
  v_ano := EXTRACT(YEAR FROM NOW());
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(SPLIT_PART(numero, '-', 3), '-', 1) AS INTEGER)
  ), 0) + 1
  INTO v_numero
  FROM contratos
  WHERE empresa_id = p_empresa_id
    AND numero LIKE 'TQ-' || v_ano || '-%';
  
  RETURN 'TQ-' || v_ano || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE modelos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_clausulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_clausulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_modulos ENABLE ROW LEVEL SECURITY;

-- Policies para modelos_contrato
CREATE POLICY "Empresas podem ver seus modelos" ON modelos_contrato
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem criar modelos" ON modelos_contrato
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar seus modelos" ON modelos_contrato
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem deletar seus modelos" ON modelos_contrato
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para modelo_clausulas
CREATE POLICY "Empresas podem ver clausulas de seus modelos" ON modelo_clausulas
  FOR SELECT USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem criar clausulas em seus modelos" ON modelo_clausulas
  FOR INSERT WITH CHECK (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem atualizar clausulas de seus modelos" ON modelo_clausulas
  FOR UPDATE USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem deletar clausulas de seus modelos" ON modelo_clausulas
  FOR DELETE USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Policies para modelo_modulos
CREATE POLICY "Empresas podem ver modulos de seus modelos" ON modelo_modulos
  FOR SELECT USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem criar modulos em seus modelos" ON modelo_modulos
  FOR INSERT WITH CHECK (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem atualizar modulos de seus modelos" ON modelo_modulos
  FOR UPDATE USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem deletar modulos de seus modelos" ON modelo_modulos
  FOR DELETE USING (modelo_id IN (SELECT id FROM modelos_contrato WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Policies para contratos
CREATE POLICY "Empresas podem ver seus contratos" ON contratos
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem criar contratos" ON contratos
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar seus contratos" ON contratos
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Empresas podem deletar seus contratos" ON contratos
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para contrato_clausulas
CREATE POLICY "Empresas podem ver clausulas de seus contratos" ON contrato_clausulas
  FOR SELECT USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem criar clausulas em seus contratos" ON contrato_clausulas
  FOR INSERT WITH CHECK (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem atualizar clausulas de seus contratos" ON contrato_clausulas
  FOR UPDATE USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem deletar clausulas de seus contratos" ON contrato_clausulas
  FOR DELETE USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Policies para contrato_modulos
CREATE POLICY "Empresas podem ver modulos de seus contratos" ON contrato_modulos
  FOR SELECT USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem criar modulos em seus contratos" ON contrato_modulos
  FOR INSERT WITH CHECK (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem atualizar modulos de seus contratos" ON contrato_modulos
  FOR UPDATE USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Empresas podem deletar modulos de seus contratos" ON contrato_modulos
  FOR DELETE USING (contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION update_contratos_updated_at();

CREATE TRIGGER modelos_contrato_updated_at
  BEFORE UPDATE ON modelos_contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_contratos_updated_at();
