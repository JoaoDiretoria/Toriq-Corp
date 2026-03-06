-- Tabela para armazenar as respostas da avaliação de reação
CREATE TABLE IF NOT EXISTS avaliacao_reacao_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas_treinamento(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES avaliacao_reacao_modelos(id) ON DELETE CASCADE,
  respostas JSONB NOT NULL DEFAULT '{}',
  sugestoes_comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(turma_id, colaborador_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_respostas_turma ON avaliacao_reacao_respostas(turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_respostas_colaborador ON avaliacao_reacao_respostas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_respostas_modelo ON avaliacao_reacao_respostas(modelo_id);

-- RLS
ALTER TABLE avaliacao_reacao_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Respostas visíveis para usuários autenticados" ON avaliacao_reacao_respostas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserir respostas autenticado" ON avaliacao_reacao_respostas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualizar respostas autenticado" ON avaliacao_reacao_respostas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Deletar respostas autenticado" ON avaliacao_reacao_respostas
  FOR DELETE TO authenticated USING (true);

-- Políticas públicas para inserção via QR Code
CREATE POLICY "Inserir respostas publicamente" ON avaliacao_reacao_respostas
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Respostas visíveis publicamente para leitura" ON avaliacao_reacao_respostas
  FOR SELECT TO anon USING (true);

-- Adicionar coluna avaliacao_reacao_respondida na tabela turma_colaboradores
ALTER TABLE turma_colaboradores ADD COLUMN IF NOT EXISTS avaliacao_reacao_respondida BOOLEAN DEFAULT false;
