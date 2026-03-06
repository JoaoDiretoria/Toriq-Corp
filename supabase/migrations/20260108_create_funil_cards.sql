-- Migration: Criar tabela de cards genéricos para funis
-- Permite armazenar cards de qualquer funil

CREATE TABLE IF NOT EXISTS funil_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES funil_etapas(id) ON DELETE CASCADE,
  
  -- Campos básicos
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Campos de negócio
  cliente_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(255),
  valor DECIMAL(15,2) DEFAULT 0,
  
  -- Campos de controle
  data_previsao DATE,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responsavel_nome VARCHAR(255),
  
  -- Ordenação e status
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  
  -- Campos personalizados (JSON)
  campos_personalizados JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funil_cards_funil_id ON funil_cards(funil_id);
CREATE INDEX IF NOT EXISTS idx_funil_cards_etapa_id ON funil_cards(etapa_id);
CREATE INDEX IF NOT EXISTS idx_funil_cards_cliente_id ON funil_cards(cliente_id);
CREATE INDEX IF NOT EXISTS idx_funil_cards_responsavel_id ON funil_cards(responsavel_id);

-- RLS
ALTER TABLE funil_cards ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver cards de funis da sua empresa
CREATE POLICY "Usuarios podem ver cards de funis da empresa"
  ON funil_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM funis f
      JOIN empresas e ON f.empresa_id = e.id
      JOIN profiles p ON p.empresa_id = e.id
      WHERE f.id = funil_cards.funil_id
      AND p.id = auth.uid()
    )
  );

-- Política: Usuários podem gerenciar cards de funis da sua empresa
CREATE POLICY "Usuarios podem gerenciar cards de funis da empresa"
  ON funil_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM funis f
      JOIN empresas e ON f.empresa_id = e.id
      JOIN profiles p ON p.empresa_id = e.id
      WHERE f.id = funil_cards.funil_id
      AND p.id = auth.uid()
    )
  );

COMMENT ON TABLE funil_cards IS 'Cards genéricos para qualquer funil do sistema';
