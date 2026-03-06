-- Criar política para empresa SST ver datas de solicitações dos seus clientes
CREATE POLICY "Empresa SST pode ver datas de solicitações dos seus clientes"
  ON solicitacoes_treinamento_datas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitacoes_treinamento st
      JOIN clientes_sst cs ON cs.cliente_empresa_id = st.empresa_id
      JOIN profiles p ON p.empresa_id = cs.empresa_sst_id
      WHERE st.id = solicitacoes_treinamento_datas.solicitacao_id
      AND p.id = auth.uid()
    )
  );
