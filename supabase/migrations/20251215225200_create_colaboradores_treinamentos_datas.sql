-- Criar tabela para armazenar múltiplas datas de treinamentos realizados
CREATE TABLE IF NOT EXISTS colaboradores_treinamentos_datas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_treinamento_id UUID NOT NULL,
  data DATE NOT NULL,
  inicio TIME DEFAULT '08:00',
  fim TIME DEFAULT '17:00',
  horas INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_colaborador_treinamento
    FOREIGN KEY (colaborador_treinamento_id) 
    REFERENCES colaboradores_treinamentos(id) 
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_datas_ct_id 
ON colaboradores_treinamentos_datas(colaborador_treinamento_id);

CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_datas_data 
ON colaboradores_treinamentos_datas(data);

-- RLS
ALTER TABLE colaboradores_treinamentos_datas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver datas de treinamentos da própria empresa"
  ON colaboradores_treinamentos_datas FOR SELECT
  USING (
    colaborador_treinamento_id IN (
      SELECT ct.id FROM colaboradores_treinamentos ct
      JOIN colaboradores c ON ct.colaborador_id = c.id
      WHERE c.empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem criar datas de treinamentos da própria empresa"
  ON colaboradores_treinamentos_datas FOR INSERT
  WITH CHECK (
    colaborador_treinamento_id IN (
      SELECT ct.id FROM colaboradores_treinamentos ct
      JOIN colaboradores c ON ct.colaborador_id = c.id
      WHERE c.empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem deletar datas de treinamentos da própria empresa"
  ON colaboradores_treinamentos_datas FOR DELETE
  USING (
    colaborador_treinamento_id IN (
      SELECT ct.id FROM colaboradores_treinamentos ct
      JOIN colaboradores c ON ct.colaborador_id = c.id
      WHERE c.empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );
