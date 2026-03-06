-- Permitir que clientes vejam seu próprio registro em clientes_sst
-- Isso é necessário para que o cliente possa descobrir qual empresa SST está vinculada
-- Usa get_user_empresa_id (SECURITY DEFINER) para evitar recursão de RLS

CREATE POLICY "Cliente pode ver seu próprio registro"
  ON clientes_sst FOR SELECT
  USING (
    cliente_empresa_id = get_user_empresa_id(auth.uid())
  );
