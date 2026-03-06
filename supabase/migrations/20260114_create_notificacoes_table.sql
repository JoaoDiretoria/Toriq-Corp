-- Migration: Sistema de Notificações
-- Data: 2026-01-14

-- Tabela de notificações do sistema
-- Cada empresa vê apenas suas próprias notificações
-- Admin global vê todas as notificações

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Quem gerou a notificação
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  
  -- Tipo e categoria da notificação
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  categoria TEXT NOT NULL, -- ex: 'treinamento', 'epi', 'financeiro', 'comercial', etc.
  
  -- Conteúdo da notificação
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  
  -- Referência para navegação (onde aconteceu)
  modulo TEXT, -- ex: 'toriq_train', 'toriq_corp', 'gestao_epi'
  tela TEXT, -- ex: 'gestao-turmas', 'toriq-corp-comercial'
  referencia_tipo TEXT, -- ex: 'turma', 'colaborador', 'card', 'conta'
  referencia_id UUID, -- ID do registro relacionado
  referencia_dados JSONB DEFAULT '{}', -- Dados extras para navegação
  
  -- Status de leitura
  lida BOOLEAN DEFAULT FALSE,
  lida_em TIMESTAMPTZ,
  lida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_id ON notificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_categoria ON notificacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_lida ON notificacoes(empresa_id, lida);

-- RLS (Row Level Security)
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Policy: Admin Vertical vê todas as notificações
CREATE POLICY "Admin Vertical pode ver todas notificações"
  ON notificacoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Policy: Usuários da empresa veem notificações da sua empresa
CREATE POLICY "Usuários veem notificações da sua empresa"
  ON notificacoes FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Qualquer usuário autenticado pode inserir notificações da sua empresa
CREATE POLICY "Usuários podem criar notificações da sua empresa"
  ON notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Policy: Usuários podem marcar como lida notificações da sua empresa
CREATE POLICY "Usuários podem atualizar notificações da sua empresa"
  ON notificacoes FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin_vertical'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificacoes_updated_at ON notificacoes;
CREATE TRIGGER trigger_notificacoes_updated_at
  BEFORE UPDATE ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_notificacoes_updated_at();

-- Comentários
COMMENT ON TABLE notificacoes IS 'Sistema de notificações do Vertical ON';
COMMENT ON COLUMN notificacoes.tipo IS 'Tipo visual: info, success, warning, error';
COMMENT ON COLUMN notificacoes.categoria IS 'Categoria da ação: treinamento, epi, financeiro, comercial, etc.';
COMMENT ON COLUMN notificacoes.referencia_tipo IS 'Tipo do registro relacionado para navegação';
COMMENT ON COLUMN notificacoes.referencia_id IS 'ID do registro para navegação ao clicar';
COMMENT ON COLUMN notificacoes.referencia_dados IS 'Dados extras em JSON para navegação complexa';
