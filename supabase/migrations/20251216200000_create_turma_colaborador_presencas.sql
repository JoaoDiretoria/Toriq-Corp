-- Tabela para presenças por dia de aula
CREATE TABLE IF NOT EXISTS turma_colaborador_presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_turma_id UUID NOT NULL REFERENCES turma_colaboradores(id) ON DELETE CASCADE,
  data_aula DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(colaborador_turma_id, data_aula)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_turma_colaborador_presencas_colaborador ON turma_colaborador_presencas(colaborador_turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_colaborador_presencas_data ON turma_colaborador_presencas(data_aula);

-- RLS
ALTER TABLE turma_colaborador_presencas ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Presenças visíveis para usuários autenticados" ON turma_colaborador_presencas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserir presenças autenticado" ON turma_colaborador_presencas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualizar presenças autenticado" ON turma_colaborador_presencas
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Deletar presenças autenticado" ON turma_colaborador_presencas
  FOR DELETE TO authenticated USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_turma_colaborador_presencas_updated_at
  BEFORE UPDATE ON turma_colaborador_presencas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
