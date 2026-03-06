-- Adicionar campo de assinatura na tabela de presenças
ALTER TABLE turma_colaborador_presencas 
ADD COLUMN IF NOT EXISTS assinatura TEXT;

-- Política para permitir acesso público à tabela turma_colaborador_presencas (necessário para marcar presença via QR Code)
CREATE POLICY "Presenças visíveis publicamente"
  ON turma_colaborador_presencas
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Presenças atualizáveis publicamente"
  ON turma_colaborador_presencas
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Presenças inseríveis publicamente"
  ON turma_colaborador_presencas
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política para permitir acesso público à tabela turma_colaboradores
CREATE POLICY "Turma colaboradores visíveis publicamente"
  ON turma_colaboradores
  FOR SELECT
  TO anon
  USING (true);
