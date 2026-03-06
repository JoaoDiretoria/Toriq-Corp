-- Migration: Criar tabelas para Controle de Equipamentos SST
-- Data: 2026-01-06

-- Tabela de categorias de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Tabela de unidades de medida
CREATE TABLE IF NOT EXISTS equipamentos_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Tabela de status de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT 'bg-gray-100 text-gray-700 border-gray-300',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

-- Tabela de finalidades (usado para)
CREATE TABLE IF NOT EXISTS equipamentos_finalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- Tabela principal de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_sst (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  numero_serie TEXT,
  categoria TEXT NOT NULL,
  unidade_medida TEXT,
  quantidade INTEGER DEFAULT 1,
  usado_para TEXT[], -- Array de finalidades
  status TEXT DEFAULT 'disponivel',
  local_base TEXT,
  validade_calibracao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

-- Tabela de kits de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  tipo_servico TEXT[], -- Array de tipos de serviço
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

-- Tabela de itens do kit (relacionamento kit-equipamento)
CREATE TABLE IF NOT EXISTS equipamentos_kit_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES equipamentos_kits(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES equipamentos_sst(id) ON DELETE CASCADE,
  quantidade INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kit_id, equipamento_id)
);

-- Tabela de movimentações de equipamentos
CREATE TABLE IF NOT EXISTS equipamentos_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  kit_id UUID REFERENCES equipamentos_kits(id) ON DELETE SET NULL,
  equipamento_id UUID REFERENCES equipamentos_sst(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('saida', 'entrada')),
  quantidade INTEGER DEFAULT 1,
  tipo_servico TEXT,
  cliente_id UUID REFERENCES clientes_sst(id) ON DELETE SET NULL,
  responsavel_retirada TEXT,
  usuario_separou_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usuario_utilizou_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usuario_recebeu_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_saida TIMESTAMPTZ,
  data_retorno TIMESTAMPTZ,
  status TEXT DEFAULT 'demanda' CHECK (status IN ('demanda', 'separado', 'retirado', 'em_uso', 'devolvido', 'pendente')),
  checklist_saida JSONB,
  checklist_entrada JSONB,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atividades das movimentações
CREATE TABLE IF NOT EXISTS equipamentos_movimentacao_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL REFERENCES equipamentos_movimentacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'checklist')),
  descricao TEXT NOT NULL,
  itens_checklist JSONB, -- Array de {id, texto, concluido}
  prazo DATE,
  horario TIME,
  membro_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  membro_nome TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de modelos de atividades
CREATE TABLE IF NOT EXISTS equipamentos_modelos_atividade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'checklist')),
  nome TEXT NOT NULL,
  descricao TEXT,
  itens JSONB, -- Array de strings para checklist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_equipamentos_sst_empresa ON equipamentos_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_sst_status ON equipamentos_sst(status);
CREATE INDEX IF NOT EXISTS idx_equipamentos_sst_categoria ON equipamentos_sst(categoria);
CREATE INDEX IF NOT EXISTS idx_equipamentos_kits_empresa ON equipamentos_kits(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_empresa ON equipamentos_movimentacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_status ON equipamentos_movimentacoes(status);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_data ON equipamentos_movimentacoes(created_at);

-- RLS Policies
ALTER TABLE equipamentos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_finalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_kit_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_movimentacao_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos_modelos_atividade ENABLE ROW LEVEL SECURITY;

-- Policies para equipamentos_categorias
CREATE POLICY "equipamentos_categorias_select" ON equipamentos_categorias
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_categorias_insert" ON equipamentos_categorias
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_categorias_update" ON equipamentos_categorias
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_categorias_delete" ON equipamentos_categorias
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_unidades
CREATE POLICY "equipamentos_unidades_select" ON equipamentos_unidades
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_unidades_insert" ON equipamentos_unidades
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_unidades_update" ON equipamentos_unidades
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_unidades_delete" ON equipamentos_unidades
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_status
CREATE POLICY "equipamentos_status_select" ON equipamentos_status
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_status_insert" ON equipamentos_status
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_status_update" ON equipamentos_status
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_status_delete" ON equipamentos_status
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_finalidades
CREATE POLICY "equipamentos_finalidades_select" ON equipamentos_finalidades
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_finalidades_insert" ON equipamentos_finalidades
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_finalidades_update" ON equipamentos_finalidades
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_finalidades_delete" ON equipamentos_finalidades
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_sst
CREATE POLICY "equipamentos_sst_select" ON equipamentos_sst
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_sst_insert" ON equipamentos_sst
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_sst_update" ON equipamentos_sst
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_sst_delete" ON equipamentos_sst
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_kits
CREATE POLICY "equipamentos_kits_select" ON equipamentos_kits
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_kits_insert" ON equipamentos_kits
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_kits_update" ON equipamentos_kits
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_kits_delete" ON equipamentos_kits
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_kit_itens (via kit)
CREATE POLICY "equipamentos_kit_itens_select" ON equipamentos_kit_itens
  FOR SELECT USING (kit_id IN (SELECT id FROM equipamentos_kits WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_kit_itens_insert" ON equipamentos_kit_itens
  FOR INSERT WITH CHECK (kit_id IN (SELECT id FROM equipamentos_kits WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_kit_itens_update" ON equipamentos_kit_itens
  FOR UPDATE USING (kit_id IN (SELECT id FROM equipamentos_kits WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_kit_itens_delete" ON equipamentos_kit_itens
  FOR DELETE USING (kit_id IN (SELECT id FROM equipamentos_kits WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Policies para equipamentos_movimentacoes
CREATE POLICY "equipamentos_movimentacoes_select" ON equipamentos_movimentacoes
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_movimentacoes_insert" ON equipamentos_movimentacoes
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_movimentacoes_update" ON equipamentos_movimentacoes
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_movimentacoes_delete" ON equipamentos_movimentacoes
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Policies para equipamentos_movimentacao_atividades (via movimentacao)
CREATE POLICY "equipamentos_movimentacao_atividades_select" ON equipamentos_movimentacao_atividades
  FOR SELECT USING (movimentacao_id IN (SELECT id FROM equipamentos_movimentacoes WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_movimentacao_atividades_insert" ON equipamentos_movimentacao_atividades
  FOR INSERT WITH CHECK (movimentacao_id IN (SELECT id FROM equipamentos_movimentacoes WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_movimentacao_atividades_update" ON equipamentos_movimentacao_atividades
  FOR UPDATE USING (movimentacao_id IN (SELECT id FROM equipamentos_movimentacoes WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "equipamentos_movimentacao_atividades_delete" ON equipamentos_movimentacao_atividades
  FOR DELETE USING (movimentacao_id IN (SELECT id FROM equipamentos_movimentacoes WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())));

-- Policies para equipamentos_modelos_atividade
CREATE POLICY "equipamentos_modelos_atividade_select" ON equipamentos_modelos_atividade
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_modelos_atividade_insert" ON equipamentos_modelos_atividade
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_modelos_atividade_update" ON equipamentos_modelos_atividade
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "equipamentos_modelos_atividade_delete" ON equipamentos_modelos_atividade
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Inserir dados padrão para novas empresas (trigger)
CREATE OR REPLACE FUNCTION insert_equipamentos_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir categorias padrão
  INSERT INTO equipamentos_categorias (empresa_id, nome) VALUES
    (NEW.id, 'EPI'),
    (NEW.id, 'EPC'),
    (NEW.id, 'Medição'),
    (NEW.id, 'Resgate'),
    (NEW.id, 'Primeiros Socorros'),
    (NEW.id, 'Sinalização'),
    (NEW.id, 'Ferramentas'),
    (NEW.id, 'Audiovisual'),
    (NEW.id, 'Didático'),
    (NEW.id, 'Outros')
  ON CONFLICT DO NOTHING;
  
  -- Inserir unidades padrão
  INSERT INTO equipamentos_unidades (empresa_id, nome) VALUES
    (NEW.id, 'Unidade'),
    (NEW.id, 'Metro'),
    (NEW.id, 'Par'),
    (NEW.id, 'Conjunto'),
    (NEW.id, 'Kit'),
    (NEW.id, 'Litro'),
    (NEW.id, 'Kg')
  ON CONFLICT DO NOTHING;
  
  -- Inserir status padrão
  INSERT INTO equipamentos_status (empresa_id, codigo, nome, cor) VALUES
    (NEW.id, 'disponivel', 'Disponível', 'bg-green-100 text-green-700 border-green-300'),
    (NEW.id, 'em_uso', 'Em Uso', 'bg-blue-100 text-blue-700 border-blue-300'),
    (NEW.id, 'manutencao', 'Manutenção', 'bg-yellow-100 text-yellow-700 border-yellow-300'),
    (NEW.id, 'baixa', 'Baixa', 'bg-red-100 text-red-700 border-red-300')
  ON CONFLICT DO NOTHING;
  
  -- Inserir finalidades padrão
  INSERT INTO equipamentos_finalidades (empresa_id, nome) VALUES
    (NEW.id, 'Treinamentos'),
    (NEW.id, 'Higiene Ocupacional'),
    (NEW.id, 'Visita Técnica'),
    (NEW.id, 'Cadastro de Espaço Confinado'),
    (NEW.id, 'Atividade de Resgate em Altura ou E.C')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para empresas do tipo SST
DROP TRIGGER IF EXISTS trigger_insert_equipamentos_defaults ON empresas;
CREATE TRIGGER trigger_insert_equipamentos_defaults
  AFTER INSERT ON empresas
  FOR EACH ROW
  WHEN (NEW.tipo = 'sst')
  EXECUTE FUNCTION insert_equipamentos_defaults();
