-- Adicionar campo de sugestões/comentários na tabela de modelos
ALTER TABLE avaliacao_reacao_modelos ADD COLUMN IF NOT EXISTS campo_sugestoes BOOLEAN DEFAULT true;

-- Tabela de relacionamento entre modelos de avaliação e treinamentos
CREATE TABLE IF NOT EXISTS avaliacao_reacao_modelo_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES avaliacao_reacao_modelos(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(modelo_id, treinamento_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_modelo_treinamentos_modelo ON avaliacao_reacao_modelo_treinamentos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_modelo_treinamentos_treinamento ON avaliacao_reacao_modelo_treinamentos(treinamento_id);

-- RLS
ALTER TABLE avaliacao_reacao_modelo_treinamentos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Modelo treinamentos visíveis para usuários autenticados" ON avaliacao_reacao_modelo_treinamentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserir modelo treinamentos autenticado" ON avaliacao_reacao_modelo_treinamentos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Atualizar modelo treinamentos autenticado" ON avaliacao_reacao_modelo_treinamentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Deletar modelo treinamentos autenticado" ON avaliacao_reacao_modelo_treinamentos
  FOR DELETE TO authenticated USING (true);

-- Políticas públicas para visualização
CREATE POLICY "Modelo treinamentos visíveis publicamente" ON avaliacao_reacao_modelo_treinamentos
  FOR SELECT TO anon USING (true);
