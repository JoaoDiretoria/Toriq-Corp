-- Criar tabela para armazenar datas indisponíveis dos instrutores
CREATE TABLE IF NOT EXISTS instrutor_datas_indisponiveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrutor_id UUID NOT NULL REFERENCES instrutores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instrutor_id, data)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_instrutor_id ON instrutor_datas_indisponiveis(instrutor_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_data ON instrutor_datas_indisponiveis(data);

-- Habilitar RLS
ALTER TABLE instrutor_datas_indisponiveis ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver datas de instrutores da mesma empresa
CREATE POLICY "Usuários podem ver datas indisponíveis de instrutores da mesma empresa"
ON instrutor_datas_indisponiveis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
);

-- Política para INSERT: usuários podem cadastrar datas para instrutores da mesma empresa
CREATE POLICY "Usuários podem cadastrar datas indisponíveis para instrutores da mesma empresa"
ON instrutor_datas_indisponiveis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
);

-- Política para UPDATE: usuários podem atualizar datas de instrutores da mesma empresa
CREATE POLICY "Usuários podem atualizar datas indisponíveis de instrutores da mesma empresa"
ON instrutor_datas_indisponiveis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
);

-- Política para DELETE: usuários podem excluir datas de instrutores da mesma empresa
CREATE POLICY "Usuários podem excluir datas indisponíveis de instrutores da mesma empresa"
ON instrutor_datas_indisponiveis
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
);
