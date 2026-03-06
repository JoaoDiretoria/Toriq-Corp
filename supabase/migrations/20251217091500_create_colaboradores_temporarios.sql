-- Tabela para armazenar colaboradores temporários pendentes de aprovação via QR Code
CREATE TABLE IF NOT EXISTS colaboradores_temporarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas_treinamento(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_temp_turma ON colaboradores_temporarios(turma_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_temp_status ON colaboradores_temporarios(status);
CREATE INDEX IF NOT EXISTS idx_colaboradores_temp_cpf ON colaboradores_temporarios(cpf);

-- Constraint para evitar duplicidade de CPF na mesma turma
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_temp_turma_cpf ON colaboradores_temporarios(turma_id, cpf) WHERE status = 'pendente';

-- Habilitar RLS
ALTER TABLE colaboradores_temporarios ENABLE ROW LEVEL SECURITY;

-- Política para inserção pública (via QR Code)
CREATE POLICY "Inserir colaborador temporário publicamente"
  ON colaboradores_temporarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para visualização pública
CREATE POLICY "Visualizar colaboradores temporários publicamente"
  ON colaboradores_temporarios
  FOR SELECT
  TO anon
  USING (true);

-- Políticas para usuários autenticados
CREATE POLICY "Colaboradores temporários visíveis para autenticados"
  ON colaboradores_temporarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inserir colaborador temporário autenticado"
  ON colaboradores_temporarios
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Atualizar colaborador temporário autenticado"
  ON colaboradores_temporarios
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Deletar colaborador temporário autenticado"
  ON colaboradores_temporarios
  FOR DELETE
  TO authenticated
  USING (true);
