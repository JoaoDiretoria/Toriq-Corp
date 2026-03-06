-- Tabela para questões dos treinamentos
CREATE TABLE IF NOT EXISTS treinamento_questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  alternativa_a TEXT NOT NULL,
  alternativa_b TEXT NOT NULL,
  alternativa_c TEXT NOT NULL,
  alternativa_d TEXT NOT NULL,
  resposta_correta CHAR(1) NOT NULL CHECK (resposta_correta IN ('A', 'B', 'C', 'D')),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para resultados das provas
CREATE TABLE IF NOT EXISTS turma_provas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas_treinamento(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tipo_prova VARCHAR(20) NOT NULL CHECK (tipo_prova IN ('pre_teste', 'pos_teste')),
  nota DECIMAL(5,2) NOT NULL,
  total_questoes INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  respostas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(turma_id, colaborador_id, tipo_prova)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_treinamento_questoes_treinamento ON treinamento_questoes(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_turma_provas_turma ON turma_provas(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_provas_colaborador ON turma_provas(colaborador_id);

-- RLS
ALTER TABLE treinamento_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_provas ENABLE ROW LEVEL SECURITY;

-- Políticas para treinamento_questoes
CREATE POLICY "Questões visíveis para usuários autenticados" ON treinamento_questoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Questões visíveis publicamente para provas" ON treinamento_questoes
  FOR SELECT TO anon USING (ativo = true);

-- Políticas para turma_provas
CREATE POLICY "Provas visíveis para usuários autenticados" ON turma_provas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserir provas publicamente" ON turma_provas
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Inserir provas autenticado" ON turma_provas
  FOR INSERT TO authenticated WITH CHECK (true);

-- Inserir algumas questões de exemplo para NR-10
INSERT INTO treinamento_questoes (treinamento_id, pergunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, ordem)
SELECT 
  ct.id,
  'Qual é a tensão considerada como baixa tensão segundo a NR-10?',
  'Até 1000V em corrente alternada',
  'Até 500V em corrente alternada',
  'Até 220V em corrente alternada',
  'Até 127V em corrente alternada',
  'A',
  1
FROM catalogo_treinamentos ct 
WHERE ct.norma = 'NR 10'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO treinamento_questoes (treinamento_id, pergunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, ordem)
SELECT 
  ct.id,
  'O que significa a sigla EPI?',
  'Equipamento de Proteção Individual',
  'Equipamento de Proteção Integrada',
  'Equipamento de Prevenção Individual',
  'Equipamento de Prevenção Integrada',
  'A',
  2
FROM catalogo_treinamentos ct 
WHERE ct.norma = 'NR 10'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO treinamento_questoes (treinamento_id, pergunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, ordem)
SELECT 
  ct.id,
  'Qual é o primeiro passo antes de iniciar qualquer trabalho em instalações elétricas?',
  'Desenergizar o circuito',
  'Colocar as luvas',
  'Avisar o supervisor',
  'Verificar as ferramentas',
  'A',
  3
FROM catalogo_treinamentos ct 
WHERE ct.norma = 'NR 10'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO treinamento_questoes (treinamento_id, pergunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, ordem)
SELECT 
  ct.id,
  'O que é um choque elétrico?',
  'Passagem de corrente elétrica pelo corpo humano',
  'Queimadura causada por fogo',
  'Explosão de equipamento elétrico',
  'Curto-circuito em instalação',
  'A',
  4
FROM catalogo_treinamentos ct 
WHERE ct.norma = 'NR 10'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO treinamento_questoes (treinamento_id, pergunta, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, ordem)
SELECT 
  ct.id,
  'Qual EPI é obrigatório para trabalhos com eletricidade?',
  'Luvas isolantes',
  'Capacete comum',
  'Óculos de sol',
  'Botas de couro',
  'A',
  5
FROM catalogo_treinamentos ct 
WHERE ct.norma = 'NR 10'
LIMIT 1
ON CONFLICT DO NOTHING;
