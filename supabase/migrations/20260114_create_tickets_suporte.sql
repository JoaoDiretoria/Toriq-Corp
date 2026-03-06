-- Migration: Sistema de Suporte - Tickets
-- Data: 2026-01-14
-- Descrição: Tabelas para sistema de tickets de suporte

-- Tabela principal de tickets
CREATE TABLE IF NOT EXISTS tickets_suporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  solicitante_nome TEXT NOT NULL,
  solicitante_email TEXT,
  empresa_solicitante_id UUID REFERENCES empresas(id),
  empresa_destino_id UUID REFERENCES empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('bug', 'duvida', 'sugestao', 'problema_tecnico', 'financeiro', 'outro')),
  categoria TEXT NOT NULL CHECK (categoria IN ('sistema', 'treinamento', 'financeiro', 'comercial', 'epi', 'frota', 'cadastro', 'integracao', 'outro')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  impacto_operacional TEXT NOT NULL DEFAULT 'nenhum' CHECK (impacto_operacional IN ('nenhum', 'baixo', 'medio', 'alto', 'critico')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'aguardando_resposta', 'resolvido', 'fechado')),
  atendente_id UUID REFERENCES auth.users(id),
  atendente_nome TEXT,
  resolucao TEXT,
  resolvido_em TIMESTAMPTZ,
  tela_origem TEXT,
  url_origem TEXT,
  navegador TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS tickets_suporte_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_suporte(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho_bytes INTEGER,
  tipo_mime TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS tickets_suporte_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_suporte(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id),
  autor_nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  interno BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_solicitante ON tickets_suporte(empresa_solicitante_id);
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_destino ON tickets_suporte(empresa_destino_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets_suporte(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets_suporte(created_at DESC);

-- RLS
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_suporte_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_suporte_comentarios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "admin_global_select_tickets" ON tickets_suporte FOR SELECT TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical');

CREATE POLICY "admin_global_update_tickets" ON tickets_suporte FOR UPDATE TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical');

CREATE POLICY "empresa_select_tickets" ON tickets_suporte FOR SELECT TO authenticated
USING (empresa_solicitante_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR empresa_destino_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "empresa_update_tickets" ON tickets_suporte FOR UPDATE TO authenticated
USING (empresa_destino_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "insert_tickets" ON tickets_suporte FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "select_anexos" ON tickets_suporte_anexos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tickets_suporte t WHERE t.id = ticket_id AND (
  t.empresa_solicitante_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR t.empresa_destino_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical')));

CREATE POLICY "insert_anexos" ON tickets_suporte_anexos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "select_comentarios" ON tickets_suporte_comentarios FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tickets_suporte t WHERE t.id = ticket_id AND (
  t.empresa_solicitante_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR t.empresa_destino_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical'))
  AND (interno = false OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical'));

CREATE POLICY "insert_comentarios" ON tickets_suporte_comentarios FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE OR REPLACE FUNCTION update_ticket_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ticket_updated_at BEFORE UPDATE ON tickets_suporte
FOR EACH ROW EXECUTE FUNCTION update_ticket_updated_at();

-- Notificações
CREATE OR REPLACE FUNCTION notify_ticket_created() RETURNS TRIGGER AS $$
DECLARE v_destino_empresa_id UUID;
BEGIN
  IF NEW.empresa_destino_id IS NULL THEN
    SELECT empresa_id INTO v_destino_empresa_id FROM profiles WHERE role = 'admin_vertical' LIMIT 1;
  ELSE
    v_destino_empresa_id := NEW.empresa_destino_id;
  END IF;
  
  INSERT INTO notificacoes (empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem, modulo, tela, referencia_tipo, referencia_id)
  VALUES (v_destino_empresa_id, NEW.solicitante_id, NEW.solicitante_nome,
    CASE NEW.prioridade WHEN 'critica' THEN 'error' WHEN 'alta' THEN 'warning' ELSE 'info' END,
    'suporte', 'Novo ticket de suporte', 'Ticket #' || LEFT(NEW.id::text, 8) || ': ' || NEW.titulo,
    'perfil_empresa', 'suporte', 'tickets_suporte', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_ticket_created AFTER INSERT ON tickets_suporte
FOR EACH ROW EXECUTE FUNCTION notify_ticket_created();

CREATE OR REPLACE FUNCTION notify_ticket_updated() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO notificacoes (empresa_id, usuario_id, tipo, categoria, titulo, mensagem, modulo, tela, referencia_tipo, referencia_id)
    VALUES (NEW.empresa_solicitante_id, NEW.solicitante_id, 'info', 'suporte', 'Ticket atualizado',
      'Ticket #' || LEFT(NEW.id::text, 8) || ' mudou para: ' || NEW.status,
      'perfil_empresa', 'suporte', 'tickets_suporte', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_ticket_updated AFTER UPDATE ON tickets_suporte
FOR EACH ROW EXECUTE FUNCTION notify_ticket_updated();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_suporte;
