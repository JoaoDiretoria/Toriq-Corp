-- Criar tabela de anexos de atividades
CREATE TABLE IF NOT EXISTS contas_pagar_atividades_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES contas_pagar_atividades(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_arquivo VARCHAR(100),
  tamanho INTEGER,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por atividade
CREATE INDEX IF NOT EXISTS idx_atividades_anexos_atividade ON contas_pagar_atividades_anexos(atividade_id);

-- RLS
ALTER TABLE contas_pagar_atividades_anexos ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuários podem ver anexos de atividades da sua empresa"
  ON contas_pagar_atividades_anexos FOR SELECT
  USING (
    atividade_id IN (
      SELECT a.id FROM contas_pagar_atividades a
      JOIN contas_pagar c ON a.conta_id = c.id
      WHERE c.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy para INSERT
CREATE POLICY "Usuários podem criar anexos de atividades da sua empresa"
  ON contas_pagar_atividades_anexos FOR INSERT
  WITH CHECK (
    atividade_id IN (
      SELECT a.id FROM contas_pagar_atividades a
      JOIN contas_pagar c ON a.conta_id = c.id
      WHERE c.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy para DELETE
CREATE POLICY "Usuários podem deletar anexos de atividades da sua empresa"
  ON contas_pagar_atividades_anexos FOR DELETE
  USING (
    atividade_id IN (
      SELECT a.id FROM contas_pagar_atividades a
      JOIN contas_pagar c ON a.conta_id = c.id
      WHERE c.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Criar bucket para anexos de atividades (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividades-anexos', 'atividades-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload no bucket
CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'atividades-anexos' AND auth.role() = 'authenticated');

-- Policy para visualizar anexos
CREATE POLICY "Qualquer um pode visualizar anexos públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'atividades-anexos');

-- Policy para deletar anexos
CREATE POLICY "Usuários autenticados podem deletar seus anexos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'atividades-anexos' AND auth.role() = 'authenticated');
