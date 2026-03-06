-- Tabela para armazenar reorientações de colaboradores após prova com nota entre 7-9
CREATE TABLE IF NOT EXISTS reorientacoes_colaborador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas_treinamento(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  turma_prova_id UUID NOT NULL REFERENCES turma_provas(id) ON DELETE CASCADE,
  
  -- Dados do colaborador no momento da reorientação
  colaborador_nome TEXT NOT NULL,
  colaborador_cpf TEXT NOT NULL,
  empresa_nome TEXT NOT NULL,
  treinamento_nome TEXT NOT NULL,
  data_treinamento DATE NOT NULL,
  
  -- Resultado da prova
  nota DECIMAL(5,2) NOT NULL,
  total_questoes INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  
  -- Questões erradas (JSON com detalhes)
  questoes_incorretas JSONB NOT NULL,
  -- Estrutura: [{ questao_id, numero, pergunta, alternativa_selecionada, alternativa_correta, alternativas_erradas }]
  
  -- Texto de reorientação da empresa SST
  texto_reorientacao TEXT,
  
  -- Assinatura digital (base64 da imagem)
  assinatura_digital TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assinado_em TIMESTAMPTZ,
  
  -- Constraint para garantir que só existe uma reorientação por prova
  UNIQUE(turma_prova_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reorientacoes_turma ON reorientacoes_colaborador(turma_id);
CREATE INDEX IF NOT EXISTS idx_reorientacoes_colaborador ON reorientacoes_colaborador(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_reorientacoes_prova ON reorientacoes_colaborador(turma_prova_id);

-- Habilitar RLS
ALTER TABLE reorientacoes_colaborador ENABLE ROW LEVEL SECURITY;

-- Política para visualização pública (necessário para a tela de prova)
CREATE POLICY "Reorientações visíveis publicamente para consulta"
  ON reorientacoes_colaborador
  FOR SELECT
  TO anon
  USING (true);

-- Política para inserção pública (colaborador assina após prova)
CREATE POLICY "Inserir reorientação publicamente"
  ON reorientacoes_colaborador
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para atualização pública (para salvar assinatura)
CREATE POLICY "Atualizar reorientação publicamente"
  ON reorientacoes_colaborador
  FOR UPDATE
  TO anon
  USING (true);

-- Políticas para usuários autenticados
CREATE POLICY "Reorientações visíveis para autenticados"
  ON reorientacoes_colaborador
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inserir reorientação autenticado"
  ON reorientacoes_colaborador
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Atualizar reorientação autenticado"
  ON reorientacoes_colaborador
  FOR UPDATE
  TO authenticated
  USING (true);
