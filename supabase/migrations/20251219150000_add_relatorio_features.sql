-- Adicionar campo de orientação ao modelo_relatorios
ALTER TABLE modelo_relatorios 
ADD COLUMN IF NOT EXISTS orientacao VARCHAR(20) DEFAULT 'portrait' CHECK (orientacao IN ('portrait', 'landscape'));

-- Adicionar campo de tamanho de página ao modelo_relatorios
ALTER TABLE modelo_relatorios 
ADD COLUMN IF NOT EXISTS tamanho_pagina VARCHAR(20) DEFAULT 'a4' CHECK (tamanho_pagina IN ('a4', 'a3', 'a5', 'letter', 'legal', 'custom'));

-- Criar tabela para armazenar anexos de turmas (fotos, documentos, etc)
CREATE TABLE IF NOT EXISTS turma_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas_treinamento(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('foto', 'lista_presenca', 'case', 'documento_instrutor', 'outro')),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_turma_anexos_turma ON turma_anexos(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_anexos_tipo ON turma_anexos(tipo);

-- RLS
ALTER TABLE turma_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas para turma_anexos
CREATE POLICY "Usuários podem ver anexos de turmas da sua empresa"
ON turma_anexos FOR SELECT
USING (
  turma_id IN (
    SELECT t.id FROM turmas_treinamento t
    JOIN catalogo_treinamentos ct ON ct.id = t.treinamento_id
    WHERE ct.empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
);

CREATE POLICY "Usuários podem inserir anexos em turmas da sua empresa"
ON turma_anexos FOR INSERT
WITH CHECK (
  turma_id IN (
    SELECT t.id FROM turmas_treinamento t
    JOIN catalogo_treinamentos ct ON ct.id = t.treinamento_id
    WHERE ct.empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
);

CREATE POLICY "Usuários podem atualizar anexos de turmas da sua empresa"
ON turma_anexos FOR UPDATE
USING (
  turma_id IN (
    SELECT t.id FROM turmas_treinamento t
    JOIN catalogo_treinamentos ct ON ct.id = t.treinamento_id
    WHERE ct.empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
);

CREATE POLICY "Usuários podem deletar anexos de turmas da sua empresa"
ON turma_anexos FOR DELETE
USING (
  turma_id IN (
    SELECT t.id FROM turmas_treinamento t
    JOIN catalogo_treinamentos ct ON ct.id = t.treinamento_id
    WHERE ct.empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin_vertical')
);

-- Trigger para updated_at
CREATE TRIGGER update_turma_anexos_updated_at
  BEFORE UPDATE ON turma_anexos
  FOR EACH ROW
  EXECUTE FUNCTION update_modelo_relatorio_updated_at();

-- Comentários explicativos
COMMENT ON TABLE turma_anexos IS 'Armazena anexos de turmas (fotos, documentos, cases, etc) para uso em relatórios';
COMMENT ON COLUMN modelo_relatorios.orientacao IS 'Orientação da página: portrait (retrato) ou landscape (paisagem)';
COMMENT ON COLUMN modelo_relatorios.tamanho_pagina IS 'Tamanho padrão da página do relatório';
