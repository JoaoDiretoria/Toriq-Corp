-- Tabela de automações
CREATE TABLE IF NOT EXISTS automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'enviar_mensagem_whatsapp',
    'agendar_atividade', 
    'criar_negocio',
    'duplicar_card',
    'mover_etapa',
    'enviar_email',
    'criar_tarefa'
  )),
  gatilho TEXT NOT NULL CHECK (gatilho IN (
    'negocio_chegar_etapa',
    'negocio_ganho',
    'negocio_perdido',
    'pessoa_adicionada',
    'empresa_adicionada',
    'negocio_parado_etapa',
    'atividade_finalizada'
  )),
  -- Configuração do gatilho
  funil_id UUID REFERENCES funis(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES funil_etapas(id) ON DELETE SET NULL,
  dias_parado INTEGER, -- Para gatilho negocio_parado_etapa
  -- Configuração da ação
  acao_config JSONB NOT NULL DEFAULT '{}',
  -- Ex para agendar_atividade: {"tipo_atividade": "ligacao", "quando": "mesmo_dia", "descricao": "...", "responsavel": "responsavel_negocio"}
  -- Ex para criar_negocio: {"funil_destino_id": "uuid"}
  -- Ex para enviar_mensagem: {"template_id": "uuid", "canal": "whatsapp"}
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_automacoes_empresa_id ON automacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_funil_id ON automacoes(funil_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_ativo ON automacoes(ativo);

-- RLS
ALTER TABLE automacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem automações da sua empresa
CREATE POLICY "Usuarios podem ver automacoes da sua empresa"
  ON automacoes FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Política para usuários criarem automações na sua empresa
CREATE POLICY "Usuarios podem criar automacoes"
  ON automacoes FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Política para usuários atualizarem automações da sua empresa
CREATE POLICY "Usuarios podem atualizar automacoes"
  ON automacoes FOR UPDATE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Política para usuários excluírem automações da sua empresa
CREATE POLICY "Usuarios podem excluir automacoes"
  ON automacoes FOR DELETE
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_automacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_automacoes_updated_at
  BEFORE UPDATE ON automacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_automacoes_updated_at();
