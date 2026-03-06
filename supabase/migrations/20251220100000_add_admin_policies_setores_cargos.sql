-- Adicionar políticas para admin_vertical poder gerenciar setores e cargos de qualquer empresa

-- Políticas para setores
CREATE POLICY "Admin pode ver todos os setores"
  ON setores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode criar setores em qualquer empresa"
  ON setores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode atualizar setores de qualquer empresa"
  ON setores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode deletar setores de qualquer empresa"
  ON setores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Políticas para cargos
CREATE POLICY "Admin pode ver todos os cargos"
  ON cargos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode criar cargos em qualquer empresa"
  ON cargos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode atualizar cargos de qualquer empresa"
  ON cargos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

CREATE POLICY "Admin pode deletar cargos de qualquer empresa"
  ON cargos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );
