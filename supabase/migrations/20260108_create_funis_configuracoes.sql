-- Migration: Criar tabela de configurações de funil
-- Permite personalização dinâmica de cada funil

-- Tabela de configurações de funil
CREATE TABLE IF NOT EXISTS funis_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
  
  -- Configurações gerais da página
  titulo_pagina VARCHAR(255),
  descricao_pagina TEXT,
  
  -- Configurações de visualização
  modo_visualizacao VARCHAR(20) DEFAULT 'kanban' CHECK (modo_visualizacao IN ('kanban', 'lista')),
  
  -- Configurações do dashboard
  dashboard_visivel BOOLEAN DEFAULT true,
  dashboard_tipo VARCHAR(50) DEFAULT 'simples',
  dashboard_metricas JSONB DEFAULT '["total_cards", "valor_total", "cards_por_etapa"]'::jsonb,
  
  -- Configurações do botão de adicionar card
  botao_adicionar_visivel BOOLEAN DEFAULT true,
  botao_adicionar_texto VARCHAR(100) DEFAULT 'Novo Card',
  
  -- Configurações do card (frente)
  card_campos_visiveis JSONB DEFAULT '["titulo", "cliente", "valor", "data", "responsavel"]'::jsonb,
  card_mostrar_valor BOOLEAN DEFAULT true,
  card_mostrar_cliente BOOLEAN DEFAULT true,
  card_mostrar_data BOOLEAN DEFAULT true,
  card_mostrar_responsavel BOOLEAN DEFAULT true,
  card_mostrar_etiquetas BOOLEAN DEFAULT true,
  
  -- Configurações internas do card (popup)
  card_interno_atividades_tipos JSONB DEFAULT '["tarefa", "email", "ligacao", "whatsapp", "reuniao", "visita", "nota"]'::jsonb,
  card_interno_acoes_rapidas JSONB DEFAULT '["editar", "mover", "excluir"]'::jsonb,
  card_interno_mostrar_historico BOOLEAN DEFAULT true,
  card_interno_mostrar_movimentacoes BOOLEAN DEFAULT true,
  card_interno_campos_personalizados JSONB DEFAULT '[]'::jsonb,
  
  -- Configurações de ações especiais (para funis existentes)
  acoes_especiais JSONB DEFAULT '[]'::jsonb,
  
  -- Configurações de campos do formulário de novo card
  formulario_campos JSONB DEFAULT '[
    {"campo": "titulo", "label": "Título", "tipo": "text", "obrigatorio": true, "visivel": true},
    {"campo": "cliente", "label": "Cliente", "tipo": "select", "obrigatorio": false, "visivel": true},
    {"campo": "valor", "label": "Valor", "tipo": "currency", "obrigatorio": false, "visivel": true},
    {"campo": "data_previsao", "label": "Data Previsão", "tipo": "date", "obrigatorio": false, "visivel": true},
    {"campo": "responsavel", "label": "Responsável", "tipo": "select", "obrigatorio": false, "visivel": true},
    {"campo": "descricao", "label": "Descrição", "tipo": "textarea", "obrigatorio": false, "visivel": true}
  ]'::jsonb,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(funil_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funis_configuracoes_funil_id ON funis_configuracoes(funil_id);

-- RLS
ALTER TABLE funis_configuracoes ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver configurações de funis da sua empresa
CREATE POLICY "Usuarios podem ver configuracoes de funis da empresa"
  ON funis_configuracoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM funis f
      JOIN empresas e ON f.empresa_id = e.id
      JOIN profiles p ON p.empresa_id = e.id
      WHERE f.id = funis_configuracoes.funil_id
      AND p.id = auth.uid()
    )
  );

-- Política: Admins podem gerenciar configurações
CREATE POLICY "Admins podem gerenciar configuracoes de funis"
  ON funis_configuracoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM funis f
      JOIN empresas e ON f.empresa_id = e.id
      JOIN profiles p ON p.empresa_id = e.id
      WHERE f.id = funis_configuracoes.funil_id
      AND p.id = auth.uid()
      AND p.role IN ('admin_vertical', 'empresa_sst')
    )
  );

-- Função para criar configuração padrão ao criar funil
CREATE OR REPLACE FUNCTION criar_configuracao_funil_padrao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO funis_configuracoes (
    funil_id,
    titulo_pagina,
    descricao_pagina,
    card_mostrar_valor,
    dashboard_metricas
  ) VALUES (
    NEW.id,
    NEW.nome,
    NEW.descricao,
    CASE WHEN NEW.tipo = 'negocio' THEN true ELSE false END,
    CASE 
      WHEN NEW.tipo = 'negocio' THEN '["total_cards", "valor_total", "cards_por_etapa", "taxa_conversao"]'::jsonb
      ELSE '["total_cards", "cards_por_etapa", "cards_atrasados"]'::jsonb
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar configuração padrão
DROP TRIGGER IF EXISTS trigger_criar_configuracao_funil ON funis;
CREATE TRIGGER trigger_criar_configuracao_funil
  AFTER INSERT ON funis
  FOR EACH ROW
  EXECUTE FUNCTION criar_configuracao_funil_padrao();

-- Criar configurações para funis existentes que não têm
INSERT INTO funis_configuracoes (funil_id, titulo_pagina, descricao_pagina, card_mostrar_valor, dashboard_metricas)
SELECT 
  f.id,
  f.nome,
  f.descricao,
  CASE WHEN f.tipo = 'negocio' THEN true ELSE false END,
  CASE 
    WHEN f.tipo = 'negocio' THEN '["total_cards", "valor_total", "cards_por_etapa", "taxa_conversao"]'::jsonb
    ELSE '["total_cards", "cards_por_etapa", "cards_atrasados"]'::jsonb
  END
FROM funis f
WHERE NOT EXISTS (
  SELECT 1 FROM funis_configuracoes fc WHERE fc.funil_id = f.id
);

COMMENT ON TABLE funis_configuracoes IS 'Configurações personalizáveis para cada funil';
