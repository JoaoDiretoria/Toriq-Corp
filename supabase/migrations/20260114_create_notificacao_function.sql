-- Migration: Função para criar notificações no backend
-- Data: 2026-01-14

-- Função para criar notificações no backend
-- Pode ser chamada por triggers ou diretamente via RPC

CREATE OR REPLACE FUNCTION criar_notificacao(
  p_empresa_id UUID,
  p_tipo TEXT,
  p_categoria TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_usuario_id UUID DEFAULT NULL,
  p_usuario_nome TEXT DEFAULT 'Sistema',
  p_modulo TEXT DEFAULT NULL,
  p_tela TEXT DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_dados JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notificacao_id UUID;
BEGIN
  INSERT INTO notificacoes (
    empresa_id,
    usuario_id,
    usuario_nome,
    tipo,
    categoria,
    titulo,
    mensagem,
    modulo,
    tela,
    referencia_tipo,
    referencia_id,
    referencia_dados
  ) VALUES (
    p_empresa_id,
    p_usuario_id,
    p_usuario_nome,
    p_tipo,
    p_categoria,
    p_titulo,
    p_mensagem,
    p_modulo,
    p_tela,
    p_referencia_tipo,
    p_referencia_id,
    p_referencia_dados
  )
  RETURNING id INTO v_notificacao_id;
  
  RETURN v_notificacao_id;
END;
$$;

-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION criar_notificacao TO authenticated;

-- Comentário
COMMENT ON FUNCTION criar_notificacao IS 'Função para criar notificações no sistema. Pode ser chamada por triggers ou via RPC.';

-- ============================================================================
-- EXEMPLOS DE TRIGGERS PARA GERAR NOTIFICAÇÕES AUTOMATICAMENTE
-- Descomente e adapte conforme necessário
-- ============================================================================

-- Exemplo: Notificação quando uma turma é criada
/*
CREATE OR REPLACE FUNCTION notify_turma_criada()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'success',
    p_categoria := 'treinamento',
    p_titulo := 'Nova turma criada',
    p_mensagem := 'Turma "' || NEW.nome || '" foi criada com sucesso',
    p_modulo := 'toriq_train',
    p_tela := 'gestao-turmas',
    p_referencia_tipo := 'turma',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_turma_criada
  AFTER INSERT ON turmas_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION notify_turma_criada();
*/

-- Exemplo: Notificação quando um colaborador é cadastrado
/*
CREATE OR REPLACE FUNCTION notify_colaborador_cadastrado()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'cadastro',
    p_titulo := 'Novo colaborador cadastrado',
    p_mensagem := 'Colaborador "' || NEW.nome || '" foi cadastrado',
    p_modulo := 'perfil_empresa',
    p_tela := 'cadastros',
    p_referencia_tipo := 'colaborador',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_colaborador_cadastrado
  AFTER INSERT ON colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION notify_colaborador_cadastrado();
*/
