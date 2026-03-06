-- Migration: Sistema de Log Universal
-- Data: 2026-01-14
-- Captura todas as inserções em tabelas com empresa_id automaticamente

-- ============================================================================
-- SISTEMA DE LOG UNIVERSAL - Captura todas as inserções em tabelas com empresa_id
-- ============================================================================

-- Primeiro, remover os triggers específicos anteriores (vamos usar um sistema genérico)
DROP TRIGGER IF EXISTS trigger_notify_prospeccao_card ON prospeccao_cards;
DROP TRIGGER IF EXISTS trigger_notify_closer_card ON closer_cards;
DROP TRIGGER IF EXISTS trigger_notify_pos_venda_card ON pos_venda_cards;
DROP TRIGGER IF EXISTS trigger_notify_cross_selling_card ON cross_selling_cards;
DROP TRIGGER IF EXISTS trigger_notify_turma ON turmas_treinamento;
DROP TRIGGER IF EXISTS trigger_notify_solicitacao_treinamento ON solicitacoes_treinamento;
DROP TRIGGER IF EXISTS trigger_notify_colaborador ON colaboradores;
DROP TRIGGER IF EXISTS trigger_notify_conta_receber ON contas_receber;
DROP TRIGGER IF EXISTS trigger_notify_conta_pagar ON contas_pagar;
DROP TRIGGER IF EXISTS trigger_notify_entrega_epi ON entregas_epis;
DROP TRIGGER IF EXISTS trigger_notify_estoque_epi ON estoque_epis;
DROP TRIGGER IF EXISTS trigger_notify_cliente_sst ON clientes_sst;

-- Tabela de configuração para mapear tabelas -> títulos amigáveis
CREATE TABLE IF NOT EXISTS notificacao_config (
  tabela TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  modulo TEXT,
  tela TEXT,
  campo_nome TEXT DEFAULT 'nome', -- campo usado para exibir o nome do registro
  ativo BOOLEAN DEFAULT TRUE
);

-- Inserir configurações para cada tabela
INSERT INTO notificacao_config (tabela, titulo, categoria, modulo, tela, campo_nome) VALUES
  -- Comercial
  ('prospeccao_cards', 'Novo lead na prospecção', 'comercial', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'nome_lead'),
  ('closer_cards', 'Novo card no Closer', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome_lead'),
  ('pos_venda_cards', 'Novo cliente no Onboarding', 'comercial', 'toriq_corp', 'toriq-corp-comercial-pos-venda', 'nome_cliente'),
  ('cross_selling_cards', 'Nova oportunidade Cross-Selling', 'comercial', 'toriq_corp', 'toriq-corp-comercial-cross-selling', 'nome_cliente'),
  
  -- Treinamentos
  ('turmas_treinamento', 'Nova turma criada', 'treinamento', 'toriq_train', 'gestao-turmas', 'nome'),
  ('solicitacoes_treinamento', 'Nova solicitação de treinamento', 'treinamento', 'toriq_train', 'solicitacoes-treinamento', 'nome_treinamento'),
  ('catalogo_treinamentos', 'Novo treinamento no catálogo', 'treinamento', 'toriq_train', 'catalogo-treinamentos', 'nome'),
  ('provas_treinamento', 'Nova prova criada', 'treinamento', 'toriq_train', 'gestao-turmas', 'titulo'),
  
  -- Cadastros
  ('colaboradores', 'Novo colaborador cadastrado', 'cadastro', 'perfil_empresa', 'cadastros', 'nome'),
  ('clientes_sst', 'Novo cliente cadastrado', 'cadastro', 'perfil_empresa', 'clientes', 'razao_social'),
  ('instrutores', 'Novo instrutor cadastrado', 'cadastro', 'perfil_empresa', 'cadastros', 'nome'),
  ('fornecedores', 'Novo fornecedor cadastrado', 'cadastro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome'),
  ('setores', 'Novo setor criado', 'cadastro', 'perfil_empresa', 'cadastros', 'nome'),
  ('cargos', 'Novo cargo criado', 'cadastro', 'perfil_empresa', 'cadastros', 'nome'),
  ('grupos_homogeneos', 'Novo grupo homogêneo', 'cadastro', 'perfil_empresa', 'cadastros', 'nome'),
  
  -- Financeiro
  ('contas_receber', 'Nova conta a receber', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-receber', 'descricao'),
  ('contas_pagar', 'Nova conta a pagar', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-pagar', 'descricao'),
  ('contas_bancarias', 'Nova conta bancária', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome'),
  
  -- EPI
  ('cadastro_epis', 'Novo EPI cadastrado', 'epi', 'gestao_epi', 'toriq-epi-catalogo', 'nome_modelo'),
  ('estoque_epis', 'Nova entrada no estoque', 'epi', 'gestao_epi', 'toriq-epi-estoque', 'codigo_lote'),
  ('entregas_epis', 'EPI entregue', 'epi', 'gestao_epi', 'toriq-epi-entregas', NULL),
  
  -- Frota
  ('frota_veiculos', 'Novo veículo cadastrado', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', 'placa'),
  ('frota_utilizacoes', 'Nova utilização de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL),
  ('frota_abastecimentos', 'Novo abastecimento', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL),
  
  -- Serviços e Produtos
  ('servicos', 'Novo serviço cadastrado', 'cadastro', 'toriq_corp', 'toriq-corp-comercial', 'nome'),
  ('produtos_servicos', 'Novo produto/serviço', 'cadastro', 'toriq_corp', 'toriq-corp-comercial', 'nome'),
  
  -- Atividades
  ('prospeccao_atividades', 'Nova atividade de prospecção', 'atividade', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'titulo'),
  ('closer_atividades', 'Nova atividade no Closer', 'atividade', 'toriq_corp', 'toriq-corp-comercial', 'titulo'),
  ('pos_venda_atividades', 'Nova atividade pós-venda', 'atividade', 'toriq_corp', 'toriq-corp-comercial-pos-venda', 'titulo'),
  ('cross_selling_atividades', 'Nova atividade cross-selling', 'atividade', 'toriq_corp', 'toriq-corp-comercial-cross-selling', 'titulo')
ON CONFLICT (tabela) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  categoria = EXCLUDED.categoria,
  modulo = EXCLUDED.modulo,
  tela = EXCLUDED.tela,
  campo_nome = EXCLUDED.campo_nome;

-- Função genérica para criar notificação de log
CREATE OR REPLACE FUNCTION log_table_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_config RECORD;
  v_usuario_nome TEXT;
  v_nome_registro TEXT;
  v_mensagem TEXT;
BEGIN
  -- Buscar empresa_id do registro (pode estar em empresa_id ou empresa_sst_id)
  v_empresa_id := COALESCE(
    (NEW::jsonb)->>'empresa_id',
    (NEW::jsonb)->>'empresa_sst_id'
  )::UUID;
  
  -- Se não tem empresa_id, não loga
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar configuração da tabela
  SELECT * INTO v_config FROM notificacao_config WHERE tabela = TG_TABLE_NAME AND ativo = TRUE;
  
  -- Se não tem configuração, não loga
  IF v_config IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar nome do usuário
  SELECT nome INTO v_usuario_nome FROM profiles WHERE id = auth.uid();
  
  -- Buscar nome do registro (campo configurado)
  IF v_config.campo_nome IS NOT NULL THEN
    v_nome_registro := (NEW::jsonb)->>v_config.campo_nome;
  END IF;
  
  -- Montar mensagem
  IF v_nome_registro IS NOT NULL AND v_nome_registro != '' THEN
    v_mensagem := v_config.titulo || ': "' || v_nome_registro || '"';
  ELSE
    v_mensagem := v_config.titulo;
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
    'info',
    v_config.categoria,
    v_config.titulo,
    v_mensagem,
    v_config.modulo,
    v_config.tela,
    TG_TABLE_NAME,
    (NEW::jsonb)->>'id'::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, não bloqueia a operação original
    RAISE WARNING 'Erro ao criar notificação para %: %', TG_TABLE_NAME, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a todas as tabelas configuradas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tabela FROM notificacao_config WHERE ativo = TRUE
  LOOP
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = r.tabela) THEN
      -- Remover trigger existente se houver
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_log_insert ON %I', r.tabela);
      -- Criar novo trigger
      EXECUTE format('CREATE TRIGGER trigger_log_insert AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION log_table_insert()', r.tabela);
      RAISE NOTICE 'Trigger criado para tabela: %', r.tabela;
    ELSE
      RAISE NOTICE 'Tabela não existe: %', r.tabela;
    END IF;
  END LOOP;
END $$;
