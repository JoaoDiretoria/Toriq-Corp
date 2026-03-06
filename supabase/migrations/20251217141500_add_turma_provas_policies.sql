-- Adicionar políticas de UPDATE e DELETE para turma_provas
-- Necessário para permitir refazer pós-teste quando nota < 7

-- Política para UPDATE (anon - QR Code)
CREATE POLICY "Atualizar provas publicamente" ON turma_provas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Política para UPDATE (authenticated - Instrutor)
CREATE POLICY "Atualizar provas autenticado" ON turma_provas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Política para DELETE (anon - QR Code)
CREATE POLICY "Deletar provas publicamente" ON turma_provas
  FOR DELETE TO anon USING (true);

-- Política para DELETE (authenticated - Instrutor)
CREATE POLICY "Deletar provas autenticado" ON turma_provas
  FOR DELETE TO authenticated USING (true);
