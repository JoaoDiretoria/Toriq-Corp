-- Migration: Sistema de Log Completo para INSERT e UPDATE
-- Data: 2026-01-14
-- Descrição: Captura TODAS as inserções e atualizações em tabelas com empresa_id

-- ============================================================================
-- SISTEMA DE LOG COMPLETO - INSERT E UPDATE EM TODAS AS TABELAS
-- ============================================================================

-- Limpar configurações antigas
DELETE FROM notificacao_config;

-- Inserir configurações para TODAS as tabelas com descrições informativas
INSERT INTO notificacao_config (tabela, titulo, categoria, modulo, tela, campo_nome, ativo) VALUES
  -- COMERCIAL - Funis
  ('prospeccao_cards', 'Card de prospecção', 'comercial', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'titulo', true),
  ('prospeccao_colunas', 'Coluna de prospecção', 'comercial', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'nome', true),
  ('prospeccao_etiquetas', 'Etiqueta de prospecção', 'comercial', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'nome', true),
  ('prospeccao_modelos', 'Modelo de prospecção', 'comercial', 'toriq_corp', 'toriq-corp-comercial-prospeccao', 'titulo', true),
  
  ('closer_cards', 'Card do Closer', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'titulo', true),
  ('closer_colunas', 'Coluna do Closer', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('closer_etiquetas', 'Etiqueta do Closer', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('closer_modelos_atividade', 'Modelo de atividade Closer', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  
  ('pos_venda_cards', 'Card de pós-venda', 'comercial', 'toriq_corp', 'toriq-corp-comercial-pos-venda', 'titulo', true),
  ('pos_venda_colunas', 'Coluna de pós-venda', 'comercial', 'toriq_corp', 'toriq-corp-comercial-pos-venda', 'nome', true),
  ('pos_venda_etiquetas', 'Etiqueta de pós-venda', 'comercial', 'toriq_corp', 'toriq-corp-comercial-pos-venda', 'nome', true),
  
  ('cross_selling_cards', 'Card de cross-selling', 'comercial', 'toriq_corp', 'toriq-corp-comercial-cross-selling', 'titulo', true),
  ('cross_selling_colunas', 'Coluna de cross-selling', 'comercial', 'toriq_corp', 'toriq-corp-comercial-cross-selling', 'nome', true),
  ('cross_selling_etiquetas', 'Etiqueta de cross-selling', 'comercial', 'toriq_corp', 'toriq-corp-comercial-cross-selling', 'nome', true),
  
  ('comercial_funil', 'Lead comercial', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome_lead', true),
  ('funis', 'Funil personalizado', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('funil_etiquetas', 'Etiqueta de funil', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('funil_card_orcamentos', 'Orçamento de card', 'comercial', 'toriq_corp', 'toriq-corp-comercial', NULL, true),
  ('funil_card_comparacoes', 'Comparação de card', 'comercial', 'toriq_corp', 'toriq-corp-comercial', NULL, true),
  
  -- COMERCIAL - Contratos e Serviços
  ('contratos', 'Contrato', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'razao_social', true),
  ('modelos_contrato', 'Modelo de contrato', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('servicos', 'Serviço', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('produtos_servicos', 'Produto/Serviço', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('pacotes_produtos', 'Pacote de produtos', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('tipos_produtos', 'Tipo de produto', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('categorias_produtos', 'Categoria de produto', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  ('automacoes', 'Automação', 'comercial', 'toriq_corp', 'toriq-corp-comercial', 'nome', true),
  
  -- TREINAMENTOS
  ('turmas_treinamento', 'Turma de treinamento', 'treinamento', 'toriq_train', 'gestao-turmas', 'numero_turma', true),
  ('catalogo_treinamentos', 'Treinamento no catálogo', 'treinamento', 'toriq_train', 'catalogo-treinamentos', 'nome', true),
  ('solicitacoes_treinamento', 'Solicitação de treinamento', 'treinamento', 'toriq_train', 'solicitacoes-treinamento', NULL, true),
  ('provas_treinamento', 'Prova de treinamento', 'treinamento', 'toriq_train', 'gestao-turmas', 'nome', true),
  ('matriz_treinamentos', 'Matriz de treinamentos', 'treinamento', 'toriq_train', 'matriz-treinamentos', NULL, true),
  ('treinamentos', 'Treinamento', 'treinamento', 'toriq_train', 'gestao-turmas', NULL, true),
  ('avaliacao_reacao_modelos', 'Modelo de avaliação de reação', 'treinamento', 'toriq_train', 'gestao-turmas', 'nome', true),
  ('declaracoes_reorientacao', 'Declaração de reorientação', 'treinamento', 'toriq_train', 'gestao-turmas', 'titulo', true),
  ('modelo_diplomas', 'Modelo de diploma', 'treinamento', 'toriq_train', 'gestao-turmas', 'nome', true),
  ('treinamento_equipamentos', 'Equipamento de treinamento', 'treinamento', 'toriq_train', 'gestao-turmas', 'nome', true),
  ('treinamento_equipamentos_kits', 'Kit de equipamentos', 'treinamento', 'toriq_train', 'gestao-turmas', NULL, true),
  
  -- INSTRUTORES
  ('instrutores', 'Instrutor', 'treinamento', 'toriq_train', 'instrutores', 'nome', true),
  ('instrutor_formacoes_certificado', 'Formação de instrutor', 'treinamento', 'toriq_train', 'instrutores', NULL, true),
  ('instrutor_solicitacoes', 'Solicitação de instrutor', 'treinamento', 'toriq_train', 'instrutores', 'nome', true),
  
  -- CADASTROS - Colaboradores e Estrutura
  ('colaboradores', 'Colaborador', 'cadastro', 'perfil_empresa', 'cadastros', 'nome', true),
  ('setores', 'Setor', 'cadastro', 'perfil_empresa', 'cadastros', 'nome', true),
  ('cargos', 'Cargo', 'cadastro', 'perfil_empresa', 'cadastros', 'nome', true),
  ('grupos_homogeneos', 'Grupo homogêneo', 'cadastro', 'perfil_empresa', 'cadastros', 'nome', true),
  ('terceiros', 'Terceiro', 'cadastro', 'perfil_empresa', 'cadastros', NULL, true),
  
  -- CADASTROS - Clientes
  ('clientes_sst', 'Cliente', 'cadastro', 'perfil_empresa', 'clientes', 'nome', true),
  ('unidades_clientes', 'Unidade de cliente', 'cadastro', 'perfil_empresa', 'clientes', 'razao_social', true),
  ('grupos_clientes', 'Grupo de clientes', 'cadastro', 'perfil_empresa', 'clientes', 'nome', true),
  ('categorias_clientes_empresa', 'Categoria de cliente', 'cadastro', 'perfil_empresa', 'clientes', 'nome', true),
  ('empresa_contatos', 'Contato de empresa', 'cadastro', 'perfil_empresa', 'clientes', 'nome', true),
  
  -- CADASTROS - Parceiros e Fornecedores
  ('empresas_parceiras', 'Empresa parceira', 'cadastro', 'perfil_empresa', 'cadastros', 'nome', true),
  ('fornecedores', 'Fornecedor', 'cadastro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'razao_social', true),
  
  -- FINANCEIRO
  ('contas_receber', 'Conta a receber', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-receber', 'descricao', true),
  ('contas_receber_colunas', 'Coluna de contas a receber', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-receber', 'nome', true),
  ('contas_pagar', 'Conta a pagar', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-pagar', 'descricao', true),
  ('contas_pagar_colunas', 'Coluna de contas a pagar', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-contas-pagar', 'nome', true),
  ('contas_bancarias', 'Conta bancária', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'descricao', true),
  ('financeiro_contas', 'Conta financeira', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro', 'descricao', true),
  ('formas_cobranca', 'Forma de cobrança', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  ('formas_pagamento', 'Forma de pagamento', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  ('condicoes_pagamento', 'Condição de pagamento', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  ('plano_receitas', 'Plano de receitas', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  ('plano_despesas', 'Plano de despesas', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  ('centros_custo', 'Centro de custo', 'financeiro', 'toriq_corp', 'toriq-corp-financeiro-cadastros', 'nome', true),
  
  -- EPI
  ('cadastro_epis', 'EPI cadastrado', 'epi', 'gestao_epi', 'toriq-epi-catalogo', 'nome_modelo', true),
  ('estoque_epis', 'Entrada no estoque de EPI', 'epi', 'gestao_epi', 'toriq-epi-estoque', 'codigo_lote', true),
  ('entregas_epis', 'Entrega de EPI', 'epi', 'gestao_epi', 'toriq-epi-entregas', NULL, true),
  ('entregas_epi', 'Entrega de EPI', 'epi', 'gestao_epi', 'toriq-epi-entregas', NULL, true),
  
  -- EQUIPAMENTOS SST
  ('equipamentos_sst', 'Equipamento SST', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_categorias', 'Categoria de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_finalidades', 'Finalidade de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_kits', 'Kit de equipamentos', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_modelos_atividade', 'Modelo de atividade de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_movimentacoes', 'Movimentação de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', NULL, true),
  ('equipamentos_status', 'Status de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  ('equipamentos_unidades', 'Unidade de equipamento', 'equipamento', 'toriq_corp', 'toriq-corp-administrativo', 'nome', true),
  
  -- FROTA
  ('frota_veiculos', 'Veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', 'placa', true),
  ('frota_utilizacoes', 'Utilização de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL, true),
  ('frota_manutencoes', 'Manutenção de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL, true),
  ('frota_custos', 'Custo de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL, true),
  ('frota_documentos', 'Documento de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL, true),
  ('frota_checklists', 'Checklist de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', NULL, true),
  ('frota_ocorrencias', 'Ocorrência de veículo', 'frota', 'toriq_corp', 'toriq-corp-administrativo-frota', 'descricao', true),
  
  -- SAÚDE E SEGURANÇA
  ('saude_ocupacional', 'Registro de saúde ocupacional', 'saude', 'toriq_corp', 'toriq-corp-tecnico', NULL, true),
  ('normas_regulamentadoras', 'Norma regulamentadora', 'tecnico', 'toriq_corp', 'toriq-corp-tecnico', 'descricao', true),
  ('profissionais_saude', 'Profissional de saúde', 'saude', 'toriq_corp', 'toriq-corp-tecnico', 'nome', true),
  ('profissionais_seguranca', 'Profissional de segurança', 'tecnico', 'toriq_corp', 'toriq-corp-tecnico', 'nome', true),
  
  -- RELATÓRIOS E MODELOS
  ('modelo_relatorios', 'Modelo de relatório', 'sistema', 'perfil_empresa', 'configuracoes', 'nome', true),
  ('modelo_relatorio_molduras', 'Moldura de relatório', 'sistema', 'perfil_empresa', 'configuracoes', 'nome', true),
  ('modelos_atividade', 'Modelo de atividade', 'sistema', 'perfil_empresa', 'configuracoes', 'nome', true),
  
  -- CONFIGURAÇÕES
  ('configuracoes_empresa', 'Configuração da empresa', 'sistema', 'perfil_empresa', 'configuracoes', NULL, true),
  ('empresa_configuracoes', 'Configuração da empresa', 'sistema', 'perfil_empresa', 'configuracoes', NULL, true),
  ('informacoes_empresa', 'Informações da empresa', 'sistema', 'perfil_empresa', 'meu-perfil', NULL, true),
  ('empresas_modulos', 'Módulo da empresa', 'sistema', 'perfil_empresa', 'configuracoes', NULL, true),
  ('empresas_modulos_telas', 'Tela de módulo', 'sistema', 'perfil_empresa', 'configuracoes', NULL, true),
  
  -- USUÁRIOS
  ('profiles', 'Usuário', 'sistema', 'perfil_empresa', 'cadastros', 'nome', true),
  ('access_logs', 'Log de acesso', 'sistema', 'perfil_empresa', 'configuracoes', 'descricao', false)
ON CONFLICT (tabela) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  categoria = EXCLUDED.categoria,
  modulo = EXCLUDED.modulo,
  tela = EXCLUDED.tela,
  campo_nome = EXCLUDED.campo_nome,
  ativo = EXCLUDED.ativo;

-- Função genérica para INSERT e UPDATE
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
  v_config RECORD;
  v_usuario_nome TEXT;
  v_nome_registro TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_acao TEXT;
  v_new_jsonb JSONB;
BEGIN
  -- Converter NEW para JSONB
  v_new_jsonb := to_jsonb(NEW);
  
  -- Buscar empresa_id do registro
  IF v_new_jsonb ? 'empresa_id' AND v_new_jsonb->>'empresa_id' IS NOT NULL THEN
    v_empresa_id := (v_new_jsonb->>'empresa_id')::UUID;
  ELSIF v_new_jsonb ? 'empresa_sst_id' AND v_new_jsonb->>'empresa_sst_id' IS NOT NULL THEN
    v_empresa_id := (v_new_jsonb->>'empresa_sst_id')::UUID;
  END IF;
  
  -- Se não tem empresa_id, não loga
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar configuração da tabela
  SELECT * INTO v_config FROM notificacao_config WHERE tabela = TG_TABLE_NAME AND ativo = TRUE;
  
  -- Se não tem configuração ou está desativado, não loga
  IF v_config IS NULL THEN
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
  
  -- Buscar nome do registro
  IF v_config.campo_nome IS NOT NULL AND v_new_jsonb ? v_config.campo_nome THEN
    v_nome_registro := v_new_jsonb->>v_config.campo_nome;
  END IF;
  
  -- Montar mensagem descritiva
  IF v_nome_registro IS NOT NULL AND v_nome_registro != '' THEN
    v_mensagem := v_config.titulo || ' "' || v_nome_registro || '" foi ' || v_acao;
  ELSE
    v_mensagem := v_config.titulo || ' foi ' || v_acao;
  END IF;
  
  -- Adicionar quem fez a ação
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
    v_config.categoria,
    v_config.titulo || ' ' || v_acao,
    v_mensagem,
    v_config.modulo,
    v_config.tela,
    TG_TABLE_NAME,
    (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, não bloqueia a operação original
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover triggers antigos e criar novos para INSERT e UPDATE
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tabela FROM notificacao_config WHERE ativo = TRUE
  LOOP
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = r.tabela) THEN
      -- Remover triggers existentes
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_log_insert ON %I', r.tabela);
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_log_update ON %I', r.tabela);
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_log_changes ON %I', r.tabela);
      
      -- Criar trigger para INSERT
      EXECUTE format('CREATE TRIGGER trigger_log_insert AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION log_table_changes()', r.tabela);
      
      -- Criar trigger para UPDATE
      EXECUTE format('CREATE TRIGGER trigger_log_update AFTER UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION log_table_changes()', r.tabela);
      
      RAISE NOTICE 'Triggers criados para: %', r.tabela;
    END IF;
  END LOOP;
END $$;
