-- Criar tabelas para o módulo de Pós Venda (Kanban)

-- Tabela de colunas do Kanban de Pós Venda
CREATE TABLE IF NOT EXISTS pos_venda_colunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  meta_valor NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cards do Kanban de Pós Venda
CREATE TABLE IF NOT EXISTS pos_venda_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  coluna_id UUID NOT NULL REFERENCES pos_venda_colunas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  valor NUMERIC(15,2) DEFAULT 0,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(255),
  cliente_email VARCHAR(255),
  cliente_telefone VARCHAR(50),
  cliente_empresa VARCHAR(255),
  cliente_id UUID REFERENCES clientes_sst(id) ON DELETE SET NULL,
  tipo_servico VARCHAR(100),
  data_venda DATE,
  data_implementacao DATE,
  data_followup DATE,
  status_satisfacao VARCHAR(20) DEFAULT 'pendente',
  nota_nps INTEGER,
  ordem INTEGER DEFAULT 0,
  arquivado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Tabela de atividades do Pós Venda
CREATE TABLE IF NOT EXISTS pos_venda_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pos_venda_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prazo DATE,
  horario VARCHAR(10),
  anexos JSONB DEFAULT '[]'::jsonb,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  membros_ids UUID[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'a_realizar',
  data_conclusao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etiquetas do Pós Venda
CREATE TABLE IF NOT EXISTS pos_venda_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(20) DEFAULT '#f59e0b',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamento card-etiqueta
CREATE TABLE IF NOT EXISTS pos_venda_card_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pos_venda_cards(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES pos_venda_etiquetas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, etiqueta_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pos_venda_colunas_empresa ON pos_venda_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_cards_empresa ON pos_venda_cards(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_cards_coluna ON pos_venda_cards(coluna_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_atividades_card ON pos_venda_atividades(card_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_etiquetas_empresa ON pos_venda_etiquetas(empresa_id);

-- RLS Policies
ALTER TABLE pos_venda_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_card_etiquetas ENABLE ROW LEVEL SECURITY;

-- Policies para admin_vertical (acesso total)
CREATE POLICY "Admin pode ver todas as colunas pos_venda" ON pos_venda_colunas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_vertical')
  );

CREATE POLICY "Admin pode ver todos os cards pos_venda" ON pos_venda_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_vertical')
  );

CREATE POLICY "Admin pode ver todas as atividades pos_venda" ON pos_venda_atividades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_vertical')
  );

CREATE POLICY "Admin pode ver todas as etiquetas pos_venda" ON pos_venda_etiquetas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_vertical')
  );

CREATE POLICY "Admin pode ver todas as card_etiquetas pos_venda" ON pos_venda_card_etiquetas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin_vertical')
  );

-- Comentários para documentação
COMMENT ON TABLE pos_venda_colunas IS 'Colunas do Kanban de Pós Venda';
COMMENT ON TABLE pos_venda_cards IS 'Cards/Clientes do Kanban de Pós Venda';
COMMENT ON TABLE pos_venda_atividades IS 'Atividades e histórico dos cards de Pós Venda';
COMMENT ON TABLE pos_venda_etiquetas IS 'Etiquetas para categorização dos cards de Pós Venda';
COMMENT ON TABLE pos_venda_card_etiquetas IS 'Relacionamento entre cards e etiquetas de Pós Venda';
