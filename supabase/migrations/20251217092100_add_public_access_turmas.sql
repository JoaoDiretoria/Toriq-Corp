-- Política para permitir acesso público à tabela turmas_treinamento (necessário para cadastro via QR Code)
CREATE POLICY "Turmas visíveis publicamente para cadastro"
  ON turmas_treinamento
  FOR SELECT
  TO anon
  USING (true);

-- Política para permitir acesso público à tabela catalogo_treinamentos (necessário para exibir nome do treinamento)
CREATE POLICY "Treinamentos visíveis publicamente"
  ON catalogo_treinamentos
  FOR SELECT
  TO anon
  USING (true);

-- Política para permitir acesso público à tabela clientes_sst (necessário para exibir nome da empresa)
CREATE POLICY "Clientes visíveis publicamente para cadastro"
  ON clientes_sst
  FOR SELECT
  TO anon
  USING (true);
