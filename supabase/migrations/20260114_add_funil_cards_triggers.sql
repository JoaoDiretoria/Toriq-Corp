-- Migration: Triggers para tabelas de funis personalizados
-- Data: 2026-01-14
-- Descrição: Adiciona triggers para funil_cards, funil_etapas, funil_card_atividades
--            e movimentações de cards (que não têm empresa_id diretamente)

-- ============================================================================
-- TRIGGERS PARA TABELAS DE FUNIS PERSONALIZADOS
-- ============================================================================

-- Função especial para tabelas que usam funil_id em vez de empresa_id
CREATE OR REPLACE FUNCTION log_funil_card_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_funil_nome TEXT;
  v_usuario_nome TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_acao TEXT;
  v_new_jsonb JSONB;
  v_titulo TEXT;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  -- Buscar empresa_id e nome do funil via funil_id
  SELECT f.empresa_id, f.nome INTO v_empresa_id, v_funil_nome
  FROM funis f
  WHERE f.id = (v_new_jsonb->>'funil_id')::UUID;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Definir ação e tipo
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criado';
    v_tipo := 'success';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'atualizado';
    v_tipo := 'info';
  END IF;
  
  -- Buscar nome do usuário
  BEGIN
    SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  -- Buscar título do card
  v_titulo := v_new_jsonb->>'titulo';
  
  -- Montar mensagem
  IF v_titulo IS NOT NULL AND v_titulo != '' THEN
    v_mensagem := 'Card "' || v_titulo || '" foi ' || v_acao || ' no funil "' || COALESCE(v_funil_nome, 'Desconhecido') || '"';
  ELSE
    v_mensagem := 'Card foi ' || v_acao || ' no funil "' || COALESCE(v_funil_nome, 'Desconhecido') || '"';
  END IF;
  
  IF v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN
    v_mensagem := v_mensagem || ' por ' || v_usuario_nome;
  END IF;
  
  -- Inserir notificação
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
    referencia_id
  ) VALUES (
    v_empresa_id,
    auth.uid(),
    COALESCE(v_usuario_nome, 'Sistema'),
    v_tipo,
    'comercial',
    'Card ' || v_acao,
    v_mensagem,
    'toriq_corp',
    'toriq-corp-administrativo',
    'funil_cards',
    (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atividades de funil
CREATE OR REPLACE FUNCTION log_funil_atividade_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_nome TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_acao TEXT;
  v_new_jsonb JSONB;
  v_titulo TEXT;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  -- Buscar empresa_id via card_id -> funil_id
  SELECT f.empresa_id INTO v_empresa_id
  FROM funil_cards fc
  JOIN funis f ON fc.funil_id = f.id
  WHERE fc.id = (v_new_jsonb->>'card_id')::UUID;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criada';
    v_tipo := 'info';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'atualizada';
    v_tipo := 'info';
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  v_titulo := v_new_jsonb->>'titulo';
  
  IF v_titulo IS NOT NULL AND v_titulo != '' THEN
    v_mensagem := 'Atividade "' || v_titulo || '" foi ' || v_acao;
  ELSE
    v_mensagem := 'Atividade foi ' || v_acao;
  END IF;
  
  IF v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN
    v_mensagem := v_mensagem || ' por ' || v_usuario_nome;
  END IF;
  
  INSERT INTO notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), v_tipo,
    'atividade', 'Atividade ' || v_acao, v_mensagem,
    'toriq_corp', 'toriq-corp-administrativo', 'funil_card_atividades',
    (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers para funil_cards
DROP TRIGGER IF EXISTS trigger_log_insert ON funil_cards;
DROP TRIGGER IF EXISTS trigger_log_update ON funil_cards;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON funil_cards FOR EACH ROW EXECUTE FUNCTION log_funil_card_changes();
CREATE TRIGGER trigger_log_update AFTER UPDATE ON funil_cards FOR EACH ROW EXECUTE FUNCTION log_funil_card_changes();

-- Criar triggers para funil_card_atividades
DROP TRIGGER IF EXISTS trigger_log_insert ON funil_card_atividades;
DROP TRIGGER IF EXISTS trigger_log_update ON funil_card_atividades;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON funil_card_atividades FOR EACH ROW EXECUTE FUNCTION log_funil_atividade_changes();
CREATE TRIGGER trigger_log_update AFTER UPDATE ON funil_card_atividades FOR EACH ROW EXECUTE FUNCTION log_funil_atividade_changes();

-- Criar triggers para funil_etapas
CREATE OR REPLACE FUNCTION log_funil_etapa_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_nome TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_acao TEXT;
  v_new_jsonb JSONB;
  v_nome TEXT;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  SELECT f.empresa_id INTO v_empresa_id
  FROM funis f
  WHERE f.id = (v_new_jsonb->>'funil_id')::UUID;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criada';
    v_tipo := 'success';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'atualizada';
    v_tipo := 'info';
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  v_nome := v_new_jsonb->>'nome';
  
  IF v_nome IS NOT NULL AND v_nome != '' THEN
    v_mensagem := 'Etapa "' || v_nome || '" foi ' || v_acao;
  ELSE
    v_mensagem := 'Etapa foi ' || v_acao;
  END IF;
  
  IF v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN
    v_mensagem := v_mensagem || ' por ' || v_usuario_nome;
  END IF;
  
  INSERT INTO notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), v_tipo,
    'comercial', 'Etapa ' || v_acao, v_mensagem,
    'toriq_corp', 'toriq-corp-administrativo', 'funil_etapas',
    (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_insert ON funil_etapas;
DROP TRIGGER IF EXISTS trigger_log_update ON funil_etapas;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON funil_etapas FOR EACH ROW EXECUTE FUNCTION log_funil_etapa_changes();
CREATE TRIGGER trigger_log_update AFTER UPDATE ON funil_etapas FOR EACH ROW EXECUTE FUNCTION log_funil_etapa_changes();

-- Função para movimentações de cards
CREATE OR REPLACE FUNCTION log_card_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_nome TEXT;
  v_new_jsonb JSONB;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  -- Tentar buscar empresa_id de diferentes formas dependendo da tabela
  IF TG_TABLE_NAME = 'funil_card_movimentacoes' THEN
    SELECT f.empresa_id INTO v_empresa_id
    FROM funil_cards fc JOIN funis f ON fc.funil_id = f.id
    WHERE fc.id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'prospeccao_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM prospeccao_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'closer_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM closer_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'pos_venda_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM pos_venda_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'cross_selling_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM cross_selling_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  END IF;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  INSERT INTO notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), 'info',
    'comercial', 'Card movido', 
    'Card foi movido de coluna' || CASE WHEN v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN ' por ' || v_usuario_nome ELSE '' END,
    'toriq_corp', 'toriq-corp-comercial', TG_TABLE_NAME,
    (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de movimentação
DROP TRIGGER IF EXISTS trigger_log_insert ON funil_card_movimentacoes;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON funil_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao();

DROP TRIGGER IF EXISTS trigger_log_insert ON prospeccao_card_movimentacoes;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON prospeccao_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao();

DROP TRIGGER IF EXISTS trigger_log_insert ON closer_card_movimentacoes;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON closer_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao();

DROP TRIGGER IF EXISTS trigger_log_insert ON pos_venda_card_movimentacoes;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON pos_venda_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao();

DROP TRIGGER IF EXISTS trigger_log_insert ON cross_selling_card_movimentacoes;
CREATE TRIGGER trigger_log_insert AFTER INSERT ON cross_selling_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao();
