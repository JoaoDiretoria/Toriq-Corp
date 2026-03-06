-- Adicionar políticas RLS para prospeccao_atividades

-- Política para SELECT - Admin pode ver todas as atividades
CREATE POLICY IF NOT EXISTS "Admin pode ver todas as atividades"
  ON prospeccao_atividades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Política para INSERT - Admin pode criar atividades
CREATE POLICY IF NOT EXISTS "Admin pode criar atividades"
  ON prospeccao_atividades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Política para UPDATE - Admin pode atualizar atividades
CREATE POLICY IF NOT EXISTS "Admin pode atualizar atividades"
  ON prospeccao_atividades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Política para DELETE - Admin pode deletar atividades
CREATE POLICY IF NOT EXISTS "Admin pode deletar atividades"
  ON prospeccao_atividades FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );
