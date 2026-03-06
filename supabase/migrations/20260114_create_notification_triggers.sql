-- Migration: Triggers para gerar notificações automaticamente
-- Data: 2026-01-14

-- ============================================================================
-- TRIGGERS PARA GERAR NOTIFICAÇÕES AUTOMATICAMENTE
-- ============================================================================

-- 1. FUNIL PROSPECCAO - Novo card criado
CREATE OR REPLACE FUNCTION notify_prospeccao_card_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'comercial',
    p_titulo := 'Novo lead na prospecção',
    p_mensagem := 'Lead "' || COALESCE(NEW.nome_lead, 'Sem nome') || '" foi adicionado ao funil de prospecção',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-comercial-prospeccao',
    p_referencia_tipo := 'prospeccao_card',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_prospeccao_card ON prospeccao_cards;
CREATE TRIGGER trigger_notify_prospeccao_card
  AFTER INSERT ON prospeccao_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_prospeccao_card_created();

-- 2. FUNIL CLOSER - Novo card criado
CREATE OR REPLACE FUNCTION notify_closer_card_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'comercial',
    p_titulo := 'Novo card no Closer',
    p_mensagem := 'Card "' || COALESCE(NEW.nome_lead, 'Sem nome') || '" foi adicionado ao funil Closer',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-comercial',
    p_referencia_tipo := 'closer_card',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_closer_card ON closer_cards;
CREATE TRIGGER trigger_notify_closer_card
  AFTER INSERT ON closer_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_closer_card_created();

-- 3. FUNIL POS-VENDA - Novo card criado
CREATE OR REPLACE FUNCTION notify_pos_venda_card_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'success',
    p_categoria := 'comercial',
    p_titulo := 'Novo cliente no Onboarding',
    p_mensagem := 'Cliente "' || COALESCE(NEW.nome_cliente, 'Sem nome') || '" entrou no funil de Pós-Venda',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-comercial-pos-venda',
    p_referencia_tipo := 'pos_venda_card',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_pos_venda_card ON pos_venda_cards;
CREATE TRIGGER trigger_notify_pos_venda_card
  AFTER INSERT ON pos_venda_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_pos_venda_card_created();

-- 4. FUNIL CROSS-SELLING - Novo card criado
CREATE OR REPLACE FUNCTION notify_cross_selling_card_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'comercial',
    p_titulo := 'Nova oportunidade Cross-Selling',
    p_mensagem := 'Cliente "' || COALESCE(NEW.nome_cliente, 'Sem nome') || '" adicionado ao Cross-Selling',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-comercial-cross-selling',
    p_referencia_tipo := 'cross_selling_card',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_cross_selling_card ON cross_selling_cards;
CREATE TRIGGER trigger_notify_cross_selling_card
  AFTER INSERT ON cross_selling_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_cross_selling_card_created();

-- 5. TURMAS DE TREINAMENTO - Nova turma criada
CREATE OR REPLACE FUNCTION notify_turma_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'success',
    p_categoria := 'treinamento',
    p_titulo := 'Nova turma criada',
    p_mensagem := 'Turma "' || COALESCE(NEW.nome, 'Sem nome') || '" foi criada',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_train',
    p_tela := 'gestao-turmas',
    p_referencia_tipo := 'turma',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_turma ON turmas_treinamento;
CREATE TRIGGER trigger_notify_turma
  AFTER INSERT ON turmas_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION notify_turma_created();

-- 6. SOLICITAÇÕES DE TREINAMENTO - Nova solicitação
CREATE OR REPLACE FUNCTION notify_solicitacao_treinamento_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'warning',
    p_categoria := 'treinamento',
    p_titulo := 'Nova solicitação de treinamento',
    p_mensagem := 'Solicitação de treinamento "' || COALESCE(NEW.nome_treinamento, 'Sem nome') || '" recebida',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_train',
    p_tela := 'solicitacoes-treinamento',
    p_referencia_tipo := 'solicitacao_treinamento',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_solicitacao_treinamento ON solicitacoes_treinamento;
CREATE TRIGGER trigger_notify_solicitacao_treinamento
  AFTER INSERT ON solicitacoes_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION notify_solicitacao_treinamento_created();

-- 7. COLABORADORES - Novo colaborador cadastrado
CREATE OR REPLACE FUNCTION notify_colaborador_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'cadastro',
    p_titulo := 'Novo colaborador cadastrado',
    p_mensagem := 'Colaborador "' || COALESCE(NEW.nome, 'Sem nome') || '" foi cadastrado',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'perfil_empresa',
    p_tela := 'cadastros',
    p_referencia_tipo := 'colaborador',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_colaborador ON colaboradores;
CREATE TRIGGER trigger_notify_colaborador
  AFTER INSERT ON colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION notify_colaborador_created();

-- 8. CONTAS A RECEBER - Nova conta criada
CREATE OR REPLACE FUNCTION notify_conta_receber_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'success',
    p_categoria := 'financeiro',
    p_titulo := 'Nova conta a receber',
    p_mensagem := 'Conta a receber de R$ ' || COALESCE(NEW.valor::TEXT, '0') || ' foi criada',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-financeiro-contas-receber',
    p_referencia_tipo := 'conta_receber',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_conta_receber ON contas_receber;
CREATE TRIGGER trigger_notify_conta_receber
  AFTER INSERT ON contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION notify_conta_receber_created();

-- 9. CONTAS A PAGAR - Nova conta criada
CREATE OR REPLACE FUNCTION notify_conta_pagar_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'warning',
    p_categoria := 'financeiro',
    p_titulo := 'Nova conta a pagar',
    p_mensagem := 'Conta a pagar de R$ ' || COALESCE(NEW.valor::TEXT, '0') || ' foi criada',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'toriq_corp',
    p_tela := 'toriq-corp-financeiro-contas-pagar',
    p_referencia_tipo := 'conta_pagar',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_conta_pagar ON contas_pagar;
CREATE TRIGGER trigger_notify_conta_pagar
  AFTER INSERT ON contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION notify_conta_pagar_created();

-- 10. ENTREGAS DE EPI - Nova entrega
CREATE OR REPLACE FUNCTION notify_entrega_epi_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
  v_colaborador_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  SELECT nome INTO v_colaborador_nome FROM colaboradores WHERE id = NEW.colaborador_id;
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'success',
    p_categoria := 'epi',
    p_titulo := 'EPI entregue',
    p_mensagem := 'EPI entregue para colaborador "' || COALESCE(v_colaborador_nome, 'Desconhecido') || '"',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'gestao_epi',
    p_tela := 'toriq-epi-entregas',
    p_referencia_tipo := 'entrega_epi',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_entrega_epi ON entregas_epis;
CREATE TRIGGER trigger_notify_entrega_epi
  AFTER INSERT ON entregas_epis
  FOR EACH ROW
  EXECUTE FUNCTION notify_entrega_epi_created();

-- 11. ESTOQUE EPI - Nova entrada no estoque
CREATE OR REPLACE FUNCTION notify_estoque_epi_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
  v_epi_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  SELECT nome_modelo INTO v_epi_nome FROM cadastro_epis WHERE id = NEW.epi_id;
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_id,
    p_tipo := 'info',
    p_categoria := 'epi',
    p_titulo := 'Nova entrada no estoque',
    p_mensagem := COALESCE(NEW.quantidade_inicial::TEXT, '0') || ' unidades de "' || COALESCE(v_epi_nome, 'EPI') || '" adicionadas ao estoque',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'gestao_epi',
    p_tela := 'toriq-epi-estoque',
    p_referencia_tipo := 'estoque_epi',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_estoque_epi ON estoque_epis;
CREATE TRIGGER trigger_notify_estoque_epi
  AFTER INSERT ON estoque_epis
  FOR EACH ROW
  EXECUTE FUNCTION notify_estoque_epi_created();

-- 12. CLIENTES SST - Novo cliente cadastrado
CREATE OR REPLACE FUNCTION notify_cliente_sst_created()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  PERFORM criar_notificacao(
    p_empresa_id := NEW.empresa_sst_id,
    p_tipo := 'success',
    p_categoria := 'cadastro',
    p_titulo := 'Novo cliente cadastrado',
    p_mensagem := 'Cliente "' || COALESCE(NEW.razao_social, 'Sem nome') || '" foi cadastrado',
    p_usuario_id := auth.uid(),
    p_usuario_nome := COALESCE(v_usuario_nome, 'Sistema'),
    p_modulo := 'perfil_empresa',
    p_tela := 'clientes',
    p_referencia_tipo := 'cliente_sst',
    p_referencia_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_cliente_sst ON clientes_sst;
CREATE TRIGGER trigger_notify_cliente_sst
  AFTER INSERT ON clientes_sst
  FOR EACH ROW
  EXECUTE FUNCTION notify_cliente_sst_created();
