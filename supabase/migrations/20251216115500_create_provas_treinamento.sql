-- Tabela de provas/testes
CREATE TABLE IF NOT EXISTS provas_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pre_teste', 'pos_teste')),
  nome VARCHAR(255),
  total_questoes INTEGER DEFAULT 10,
  pontuacao_total DECIMAL(5,2) DEFAULT 10.00,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, treinamento_id, tipo)
);

-- Tabela de questões/alternativas
CREATE TABLE IF NOT EXISTS provas_questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prova_id UUID NOT NULL REFERENCES provas_treinamento(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  tipo_questao VARCHAR(20) NOT NULL CHECK (tipo_questao IN ('selecao', 'vf')),
  pergunta TEXT NOT NULL,
  pontuacao DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de alternativas das questões
CREATE TABLE IF NOT EXISTS provas_alternativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id UUID NOT NULL REFERENCES provas_questoes(id) ON DELETE CASCADE,
  letra VARCHAR(1) NOT NULL,
  texto TEXT NOT NULL,
  correta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_provas_treinamento_empresa ON provas_treinamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_provas_treinamento_treinamento ON provas_treinamento(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_provas_questoes_prova ON provas_questoes(prova_id);
CREATE INDEX IF NOT EXISTS idx_provas_alternativas_questao ON provas_alternativas(questao_id);

-- RLS
ALTER TABLE provas_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas_alternativas ENABLE ROW LEVEL SECURITY;

-- Políticas para provas_treinamento
CREATE POLICY "Usuários podem ver provas da própria empresa"
  ON provas_treinamento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.empresa_id = provas_treinamento.empresa_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir provas na própria empresa"
  ON provas_treinamento FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.empresa_id = provas_treinamento.empresa_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar provas da própria empresa"
  ON provas_treinamento FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.empresa_id = provas_treinamento.empresa_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar provas da própria empresa"
  ON provas_treinamento FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.empresa_id = provas_treinamento.empresa_id
      AND p.id = auth.uid()
    )
  );

-- Políticas para provas_questoes
CREATE POLICY "Usuários podem ver questões de provas da própria empresa"
  ON provas_questoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM provas_treinamento pt
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pt.id = provas_questoes.prova_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir questões em provas da própria empresa"
  ON provas_questoes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM provas_treinamento pt
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pt.id = provas_questoes.prova_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar questões de provas da própria empresa"
  ON provas_questoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM provas_treinamento pt
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pt.id = provas_questoes.prova_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar questões de provas da própria empresa"
  ON provas_questoes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM provas_treinamento pt
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pt.id = provas_questoes.prova_id
      AND p.id = auth.uid()
    )
  );

-- Políticas para provas_alternativas
CREATE POLICY "Usuários podem ver alternativas de provas da própria empresa"
  ON provas_alternativas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM provas_questoes pq
      JOIN provas_treinamento pt ON pt.id = pq.prova_id
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pq.id = provas_alternativas.questao_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir alternativas em provas da própria empresa"
  ON provas_alternativas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM provas_questoes pq
      JOIN provas_treinamento pt ON pt.id = pq.prova_id
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pq.id = provas_alternativas.questao_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar alternativas de provas da própria empresa"
  ON provas_alternativas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM provas_questoes pq
      JOIN provas_treinamento pt ON pt.id = pq.prova_id
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pq.id = provas_alternativas.questao_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar alternativas de provas da própria empresa"
  ON provas_alternativas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM provas_questoes pq
      JOIN provas_treinamento pt ON pt.id = pq.prova_id
      JOIN profiles p ON p.empresa_id = pt.empresa_id
      WHERE pq.id = provas_alternativas.questao_id
      AND p.id = auth.uid()
    )
  );
