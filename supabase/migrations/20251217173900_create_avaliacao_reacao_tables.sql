-- Tabela para modelos de avaliação de reação
CREATE TABLE IF NOT EXISTS avaliacao_reacao_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para categorias de avaliação
CREATE TABLE IF NOT EXISTS avaliacao_reacao_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES avaliacao_reacao_modelos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  ordem INTEGER DEFAULT 0,
  qtd_opcoes_resposta INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para opções de resposta
CREATE TABLE IF NOT EXISTS avaliacao_reacao_opcoes_resposta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES avaliacao_reacao_categorias(id) ON DELETE CASCADE,
  valor INTEGER NOT NULL,
  texto VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para itens/perguntas
CREATE TABLE IF NOT EXISTS avaliacao_reacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES avaliacao_reacao_categorias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_modelos_empresa ON avaliacao_reacao_modelos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_categorias_modelo ON avaliacao_reacao_categorias(modelo_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_opcoes_categoria ON avaliacao_reacao_opcoes_resposta(categoria_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_itens_categoria ON avaliacao_reacao_itens(categoria_id);

-- RLS
ALTER TABLE avaliacao_reacao_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_reacao_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_reacao_opcoes_resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_reacao_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para modelos
CREATE POLICY "Modelos visíveis para usuários autenticados" ON avaliacao_reacao_modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir modelos autenticado" ON avaliacao_reacao_modelos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar modelos autenticado" ON avaliacao_reacao_modelos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar modelos autenticado" ON avaliacao_reacao_modelos FOR DELETE TO authenticated USING (true);

-- Políticas para categorias
CREATE POLICY "Categorias visíveis para usuários autenticados" ON avaliacao_reacao_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir categorias autenticado" ON avaliacao_reacao_categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar categorias autenticado" ON avaliacao_reacao_categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar categorias autenticado" ON avaliacao_reacao_categorias FOR DELETE TO authenticated USING (true);

-- Políticas para opções de resposta
CREATE POLICY "Opções visíveis para usuários autenticados" ON avaliacao_reacao_opcoes_resposta FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir opções autenticado" ON avaliacao_reacao_opcoes_resposta FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar opções autenticado" ON avaliacao_reacao_opcoes_resposta FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar opções autenticado" ON avaliacao_reacao_opcoes_resposta FOR DELETE TO authenticated USING (true);

-- Políticas para itens
CREATE POLICY "Itens visíveis para usuários autenticados" ON avaliacao_reacao_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserir itens autenticado" ON avaliacao_reacao_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar itens autenticado" ON avaliacao_reacao_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar itens autenticado" ON avaliacao_reacao_itens FOR DELETE TO authenticated USING (true);

-- Políticas públicas (anon)
CREATE POLICY "Modelos visíveis publicamente" ON avaliacao_reacao_modelos FOR SELECT TO anon USING (ativo = true);
CREATE POLICY "Categorias visíveis publicamente" ON avaliacao_reacao_categorias FOR SELECT TO anon USING (true);
CREATE POLICY "Opções visíveis publicamente" ON avaliacao_reacao_opcoes_resposta FOR SELECT TO anon USING (true);
CREATE POLICY "Itens visíveis publicamente" ON avaliacao_reacao_itens FOR SELECT TO anon USING (true);
