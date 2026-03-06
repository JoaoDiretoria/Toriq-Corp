-- ============================================================================
-- FASE 6: Correções de Performance - Índices em Foreign Keys
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - ~100 índices criados em colunas de FK sem índice
-- - Melhora significativa em JOINs e queries com filtros
-- - Melhora nas policies RLS que usam subconsultas
-- - SEM IMPACTO em funcionalidade (apenas performance)
-- ============================================================================

-- ============================================================================
-- GRUPO 1: CLOSER (CRM de Vendas)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_closer_atividades_responsavel_id 
    ON public.closer_atividades(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_closer_atividades_usuario_id 
    ON public.closer_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_closer_card_etiquetas_etiqueta_id 
    ON public.closer_card_etiquetas(etiqueta_id);

CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_coluna_destino_id 
    ON public.closer_card_movimentacoes(coluna_destino_id);

CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_coluna_origem_id 
    ON public.closer_card_movimentacoes(coluna_origem_id);

CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_usuario_id 
    ON public.closer_card_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_closer_cards_empresa_lead_id 
    ON public.closer_cards(empresa_lead_id);

CREATE INDEX IF NOT EXISTS idx_closer_modelos_atividade_empresa_id 
    ON public.closer_modelos_atividade(empresa_id);

-- ============================================================================
-- GRUPO 2: CONTAS A PAGAR/RECEBER (Financeiro)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contas_pagar_created_by 
    ON public.contas_pagar(created_by);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_atividades_usuario_id 
    ON public.contas_pagar_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_movimentacoes_coluna_destino_id 
    ON public.contas_pagar_movimentacoes(coluna_destino_id);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_movimentacoes_coluna_origem_id 
    ON public.contas_pagar_movimentacoes(coluna_origem_id);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_movimentacoes_usuario_id 
    ON public.contas_pagar_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_contas_receber_created_by 
    ON public.contas_receber(created_by);

CREATE INDEX IF NOT EXISTS idx_contas_receber_movimentacoes_coluna_destino_id 
    ON public.contas_receber_movimentacoes(coluna_destino_id);

CREATE INDEX IF NOT EXISTS idx_contas_receber_movimentacoes_coluna_origem_id 
    ON public.contas_receber_movimentacoes(coluna_origem_id);

CREATE INDEX IF NOT EXISTS idx_financeiro_contas_empresa_id 
    ON public.financeiro_contas(empresa_id);

-- ============================================================================
-- GRUPO 3: CROSS-SELLING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cross_selling_atividades_card_id 
    ON public.cross_selling_atividades(card_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_atividades_usuario_id 
    ON public.cross_selling_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_usuario_id 
    ON public.cross_selling_card_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_cards_coluna_id 
    ON public.cross_selling_cards(coluna_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_cards_created_by 
    ON public.cross_selling_cards(created_by);

CREATE INDEX IF NOT EXISTS idx_cross_selling_cards_empresa_id 
    ON public.cross_selling_cards(empresa_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_cards_responsavel_id 
    ON public.cross_selling_cards(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_colunas_empresa_id 
    ON public.cross_selling_colunas(empresa_id);

CREATE INDEX IF NOT EXISTS idx_cross_selling_etiquetas_empresa_id 
    ON public.cross_selling_etiquetas(empresa_id);

-- ============================================================================
-- GRUPO 4: PROSPECÇÃO (SDR)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prospeccao_atividades_responsavel_id 
    ON public.prospeccao_atividades(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_prospeccao_atividades_usuario_id 
    ON public.prospeccao_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_coluna_destino_id 
    ON public.prospeccao_card_movimentacoes(coluna_destino_id);

CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_coluna_origem_id 
    ON public.prospeccao_card_movimentacoes(coluna_origem_id);

CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_usuario_id 
    ON public.prospeccao_card_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_prospeccao_cards_empresa_lead_id 
    ON public.prospeccao_cards(empresa_lead_id);

-- ============================================================================
-- GRUPO 5: PÓS-VENDA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pos_venda_atividades_responsavel_id 
    ON public.pos_venda_atividades(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_pos_venda_atividades_usuario_id 
    ON public.pos_venda_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_usuario_id 
    ON public.pos_venda_card_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_pos_venda_cards_cliente_id 
    ON public.pos_venda_cards(cliente_id);

CREATE INDEX IF NOT EXISTS idx_pos_venda_cards_created_by 
    ON public.pos_venda_cards(created_by);

CREATE INDEX IF NOT EXISTS idx_pos_venda_cards_responsavel_id 
    ON public.pos_venda_cards(responsavel_id);

-- ============================================================================
-- GRUPO 6: FUNIL GENÉRICO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_funil_card_atividades_responsavel_id 
    ON public.funil_card_atividades(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_funil_card_atividades_usuario_id 
    ON public.funil_card_atividades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_funil_card_comparacoes_created_by 
    ON public.funil_card_comparacoes(created_by);

CREATE INDEX IF NOT EXISTS idx_funil_card_movimentacoes_etapa_destino_id 
    ON public.funil_card_movimentacoes(etapa_destino_id);

CREATE INDEX IF NOT EXISTS idx_funil_card_movimentacoes_etapa_origem_id 
    ON public.funil_card_movimentacoes(etapa_origem_id);

CREATE INDEX IF NOT EXISTS idx_funil_card_movimentacoes_usuario_id 
    ON public.funil_card_movimentacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_funil_card_orcamentos_created_by 
    ON public.funil_card_orcamentos(created_by);

CREATE INDEX IF NOT EXISTS idx_automacoes_etapa_id 
    ON public.automacoes(etapa_id);

CREATE INDEX IF NOT EXISTS idx_comercial_funil_empresa_id 
    ON public.comercial_funil(empresa_id);

-- ============================================================================
-- GRUPO 7: TREINAMENTOS E COLABORADORES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_datas_colaborador_treinamento_id 
    ON public.colaboradores_treinamentos_datas(colaborador_treinamento_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_treinamento_colaborador_id 
    ON public.solicitacoes_treinamento(colaborador_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_treinamento_treinamento_id 
    ON public.solicitacoes_treinamento(treinamento_id);

CREATE INDEX IF NOT EXISTS idx_treinamentos_empresa_id 
    ON public.treinamentos(empresa_id);

CREATE INDEX IF NOT EXISTS idx_sinistros_colaborador_registrado_por 
    ON public.sinistros_colaborador(registrado_por);

CREATE INDEX IF NOT EXISTS idx_sinistros_colaborador_tipo_sinistro_id 
    ON public.sinistros_colaborador(tipo_sinistro_id);

-- ============================================================================
-- GRUPO 8: INSTRUTORES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_aprovado_por 
    ON public.instrutor_datas_indisponiveis(aprovado_por);

CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_solicitado_por 
    ON public.instrutor_datas_indisponiveis(solicitado_por);

CREATE INDEX IF NOT EXISTS idx_instrutor_formacoes_instrutor_id 
    ON public.instrutor_formacoes(instrutor_id);

CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacao_perguntas_respondido_por 
    ON public.instrutor_solicitacao_perguntas(respondido_por);

CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_avaliado_por 
    ON public.instrutor_solicitacoes(avaliado_por);

CREATE INDEX IF NOT EXISTS idx_instrutor_treinamentos_instrutor_id 
    ON public.instrutor_treinamentos(instrutor_id);

CREATE INDEX IF NOT EXISTS idx_instrutor_treinamentos_treinamento_id 
    ON public.instrutor_treinamentos(treinamento_id);

CREATE INDEX IF NOT EXISTS idx_instrutores_empresa_parceira_id 
    ON public.instrutores(empresa_parceira_id);

CREATE INDEX IF NOT EXISTS idx_contratos_instrutor_id 
    ON public.contratos(instrutor_id);

CREATE INDEX IF NOT EXISTS idx_contratos_modelo_id 
    ON public.contratos(modelo_id);

-- ============================================================================
-- GRUPO 9: EMPRESAS E PARCEIROS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_empresas_parceiras_empresa_sst_id 
    ON public.empresas_parceiras(empresa_sst_id);

CREATE INDEX IF NOT EXISTS idx_empresas_parceiras_parceira_empresa_id 
    ON public.empresas_parceiras(parceira_empresa_id);

CREATE INDEX IF NOT EXISTS idx_empresas_parceiras_responsavel_id 
    ON public.empresas_parceiras(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_unidades_clientes_medico_pcmso_id 
    ON public.unidades_clientes(medico_pcmso_id);

CREATE INDEX IF NOT EXISTS idx_unidades_clientes_tecnico_responsavel_id 
    ON public.unidades_clientes(tecnico_responsavel_id);

-- ============================================================================
-- GRUPO 10: EQUIPAMENTOS E FROTA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipamentos_modelos_atividade_empresa_id 
    ON public.equipamentos_modelos_atividade(empresa_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacao_atividades_membro_id 
    ON public.equipamentos_movimentacao_atividades(membro_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacao_atividades_movimentacao_id 
    ON public.equipamentos_movimentacao_atividades(movimentacao_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_cliente_id 
    ON public.equipamentos_movimentacoes(cliente_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_equipamento_id 
    ON public.equipamentos_movimentacoes(equipamento_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_kit_id 
    ON public.equipamentos_movimentacoes(kit_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_usuario_recebeu_id 
    ON public.equipamentos_movimentacoes(usuario_recebeu_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_usuario_separou_id 
    ON public.equipamentos_movimentacoes(usuario_separou_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_usuario_utilizou_id 
    ON public.equipamentos_movimentacoes(usuario_utilizou_id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_historico_usuario_id 
    ON public.equipamentos_movimentacoes_historico(usuario_id);

CREATE INDEX IF NOT EXISTS idx_frota_checklists_created_by 
    ON public.frota_checklists(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_custos_created_by 
    ON public.frota_custos(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_created_by 
    ON public.frota_manutencoes(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_empresa_id 
    ON public.frota_manutencoes(empresa_id);

CREATE INDEX IF NOT EXISTS idx_frota_motoristas_created_by 
    ON public.frota_motoristas(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_created_by 
    ON public.frota_ocorrencias(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_created_by 
    ON public.frota_utilizacoes(created_by);

CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_empresa_id 
    ON public.frota_utilizacoes(empresa_id);

CREATE INDEX IF NOT EXISTS idx_frota_veiculos_created_by 
    ON public.frota_veiculos(created_by);

-- ============================================================================
-- GRUPO 11: EPIs E SEGURANÇA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cadastro_epis_created_by 
    ON public.cadastro_epis(created_by);

CREATE INDEX IF NOT EXISTS idx_entregas_epi_empresa_id 
    ON public.entregas_epi(empresa_id);

CREATE INDEX IF NOT EXISTS idx_estoque_epis_created_by 
    ON public.estoque_epis(created_by);

CREATE INDEX IF NOT EXISTS idx_matriz_epi_cargo_created_by 
    ON public.matriz_epi_cargo(created_by);

CREATE INDEX IF NOT EXISTS idx_perigos_created_by 
    ON public.perigos(created_by);

CREATE INDEX IF NOT EXISTS idx_riscos_created_by 
    ON public.riscos(created_by);

CREATE INDEX IF NOT EXISTS idx_saude_ocupacional_empresa_id 
    ON public.saude_ocupacional(empresa_id);

-- ============================================================================
-- GRUPO 12: NOTIFICAÇÕES E SUPORTE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notificacoes_lida_por 
    ON public.notificacoes(lida_por);

CREATE INDEX IF NOT EXISTS idx_tickets_suporte_atendente_id 
    ON public.tickets_suporte(atendente_id);

CREATE INDEX IF NOT EXISTS idx_tickets_suporte_comentarios_autor_id 
    ON public.tickets_suporte_comentarios(autor_id);

-- ============================================================================
-- GRUPO 13: PRODUTOS E PACOTES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pacotes_produtos_itens_produto_id 
    ON public.pacotes_produtos_itens(produto_id);

CREATE INDEX IF NOT EXISTS idx_produtos_servicos_forma_cobranca_id 
    ON public.produtos_servicos(forma_cobranca_id);

-- ============================================================================
-- RESUMO FASE 6:
-- - ~100 índices criados em colunas de FK
-- - Organizado em 13 grupos por módulo
-- - Uso de IF NOT EXISTS para idempotência
-- - SEM impacto em funcionalidade
-- ============================================================================
