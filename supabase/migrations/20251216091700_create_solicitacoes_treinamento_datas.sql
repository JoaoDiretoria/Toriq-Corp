-- Criar tabela para armazenar múltiplas datas de solicitações de treinamento
CREATE TABLE IF NOT EXISTS solicitacoes_treinamento_datas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacoes_treinamento(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  inicio TIME DEFAULT '08:00',
  fim TIME DEFAULT '17:00',
  horas INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_treinamento_datas_solicitacao_id 
ON solicitacoes_treinamento_datas(solicitacao_id);

-- RLS
ALTER TABLE solicitacoes_treinamento_datas ENABLE ROW LEVEL SECURITY;

-- Policy para visualização
CREATE POLICY "Usuários podem ver datas de solicitações da própria empresa"
  ON solicitacoes_treinamento_datas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitacoes_treinamento st
      JOIN profiles p ON p.empresa_id = st.empresa_id
      WHERE st.id = solicitacoes_treinamento_datas.solicitacao_id
      AND p.id = auth.uid()
    )
  );

-- Policy para inserção
CREATE POLICY "Usuários podem inserir datas de solicitações da própria empresa"
  ON solicitacoes_treinamento_datas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM solicitacoes_treinamento st
      JOIN profiles p ON p.empresa_id = st.empresa_id
      WHERE st.id = solicitacao_id
      AND p.id = auth.uid()
    )
  );

-- Policy para deleção
CREATE POLICY "Usuários podem deletar datas de solicitações da própria empresa"
  ON solicitacoes_treinamento_datas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM solicitacoes_treinamento st
      JOIN profiles p ON p.empresa_id = st.empresa_id
      WHERE st.id = solicitacoes_treinamento_datas.solicitacao_id
      AND p.id = auth.uid()
    )
  );
