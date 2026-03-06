-- ============================================================================
-- ROLLBACK: Reverter Correções de Performance Fase 8
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- NOTA: Este rollback reverte a remoção de índices não usados
-- ============================================================================

-- GRUPO 1: Índices removidos do Lote 1
CREATE INDEX IF NOT EXISTS idx_automacoes_ativo ON public.automacoes(ativo);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_modelo_treinamentos_treinamento ON public.avaliacao_reacao_modelo_treinamentos(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_respostas_colaborador ON public.avaliacao_reacao_respostas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_epis_ativo ON public.cadastro_epis(ativo);
CREATE INDEX IF NOT EXISTS idx_cadastro_epis_protecao_para ON public.cadastro_epis(protecao_para);
CREATE INDEX IF NOT EXISTS idx_categorias_clientes_empresa_empresa_id ON public.categorias_clientes_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cbo_codigo ON public.cbo_ocupacoes(codigo);
CREATE INDEX IF NOT EXISTS idx_cbo_descricao ON public.cbo_ocupacoes(descricao);
CREATE INDEX IF NOT EXISTS idx_centros_custo_ativo ON public.centros_custo(ativo);
CREATE INDEX IF NOT EXISTS idx_cliente_contatos_principal ON public.cliente_contatos(principal);
CREATE INDEX IF NOT EXISTS idx_clientes_sst_categoria_id ON public.clientes_sst(categoria_id);

-- GRUPO 2: Índices removidos do Lote 2
CREATE INDEX IF NOT EXISTS idx_closer_atividades_status ON public.closer_atividades(status);
CREATE INDEX IF NOT EXISTS idx_closer_card_etiquetas_card ON public.closer_card_etiquetas(card_id);
CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_created_at ON public.closer_card_movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_closer_card_movimentacoes_tipo ON public.closer_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_closer_colunas_empresa ON public.closer_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_closer_colunas_ordem ON public.closer_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_closer_etiquetas_empresa ON public.closer_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON public.colaboradores(ativo);
CREATE INDEX IF NOT EXISTS idx_colaboradores_grupo_homogeneo_id ON public.colaboradores(grupo_homogeneo_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_matricula ON public.colaboradores(matricula);
CREATE INDEX IF NOT EXISTS idx_colaboradores_temp_cpf ON public.colaboradores_temporarios(cpf);
CREATE INDEX IF NOT EXISTS idx_colaboradores_temp_status ON public.colaboradores_temporarios(status);
CREATE INDEX IF NOT EXISTS idx_colaboradores_treinamentos_data_realizacao ON public.colaboradores_treinamentos(data_realizacao);

-- GRUPO 3: Índices removidos do Lote 3
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_ativo ON public.condicoes_pagamento(ativo);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ativo ON public.contas_bancarias(ativo);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_coluna ON public.contas_pagar(coluna_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_frequencia ON public.contas_pagar(frequencia);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON public.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_closer_card ON public.contas_receber(closer_card_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_condicao ON public.contas_receber(condicao_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_data_recebimento ON public.contas_receber(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_prazo ON public.contas_receber_atividades(prazo);
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_status ON public.contas_receber_atividades(status);
CREATE INDEX IF NOT EXISTS idx_contatos_unidades_unidade_id ON public.contatos_unidades(unidade_id);

-- GRUPO 4: Índices removidos do Lote 4
CREATE INDEX IF NOT EXISTS idx_contrato_clausulas_contrato_id ON public.contrato_clausulas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_modulos_contrato_id ON public.contrato_modulos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON public.contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_parceiro_id ON public.contratos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_card_id ON public.cross_selling_card_movimentacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_created_at ON public.cross_selling_card_movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_cross_selling_card_movimentacoes_tipo ON public.cross_selling_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_declaracoes_reorientacao_treinamento ON public.declaracoes_reorientacao(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_empresas_modulos_telas_ativo ON public.empresas_modulos_telas(ativo);
CREATE INDEX IF NOT EXISTS idx_empresas_modulos_telas_tela_id ON public.empresas_modulos_telas(tela_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_status ON public.entregas_epis(status);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_data_entrega ON public.entregas_epis(data_entrega);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_estoque_id ON public.entregas_epis(estoque_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_epi_id ON public.entregas_epis(epi_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_data ON public.equipamentos_movimentacoes(data);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_status ON public.equipamentos_movimentacoes(status);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_numero ON public.equipamentos_movimentacoes(numero);
CREATE INDEX IF NOT EXISTS idx_equipamentos_movimentacoes_funil_card_id ON public.equipamentos_movimentacoes(funil_card_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_sst_categoria ON public.equipamentos_sst(categoria);
CREATE INDEX IF NOT EXISTS idx_equipamentos_sst_status ON public.equipamentos_sst(status);

-- GRUPO 5: Índices removidos do Lote 5
CREATE INDEX IF NOT EXISTS idx_estoque_epis_codigo_entrada ON public.estoque_epis(codigo_entrada);
CREATE INDEX IF NOT EXISTS idx_estoque_epis_data_validade ON public.estoque_epis(data_validade);
CREATE INDEX IF NOT EXISTS idx_estoque_epis_ativo ON public.estoque_epis(ativo);
CREATE INDEX IF NOT EXISTS idx_estoque_epis_codigo_lote ON public.estoque_epis(codigo_lote);
CREATE INDEX IF NOT EXISTS idx_estoque_epis_epi_id ON public.estoque_epis(epi_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ativo ON public.formas_pagamento(ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_frota_checklists_data ON public.frota_checklists(data);
CREATE INDEX IF NOT EXISTS idx_frota_checklists_empresa ON public.frota_checklists(empresa_id);

-- GRUPO 6: Índices removidos do Lote 6
CREATE INDEX IF NOT EXISTS idx_frota_custos_categoria ON public.frota_custos(categoria);
CREATE INDEX IF NOT EXISTS idx_frota_custos_empresa ON public.frota_custos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_custos_data ON public.frota_custos(data);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_tipo ON public.frota_documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_vencimento ON public.frota_documentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_frota_documentos_empresa ON public.frota_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_motoristas_cpf ON public.frota_motoristas(cpf);
CREATE INDEX IF NOT EXISTS idx_frota_motoristas_cnh ON public.frota_motoristas(cnh);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_status ON public.frota_ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_empresa ON public.frota_ocorrencias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frota_ocorrencias_data ON public.frota_ocorrencias(data);
CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_data ON public.frota_utilizacoes(data);
CREATE INDEX IF NOT EXISTS idx_frota_utilizacoes_funil_card_id ON public.frota_utilizacoes(funil_card_id);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_placa ON public.frota_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_empresa ON public.frota_veiculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_comparacoes_empresa_id ON public.funil_card_comparacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_etiquetas_etiqueta_id ON public.funil_card_etiquetas(etiqueta_id);

-- GRUPO 7: Índices removidos do Lote 7
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_ativo ON public.grupos_homogeneos(ativo);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_empresa_ativo ON public.grupos_homogeneos(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_origem ON public.instrutor_datas_indisponiveis(origem);
CREATE INDEX IF NOT EXISTS idx_instrutor_equipamentos_treinamento ON public.instrutor_equipamentos(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacao_treinamentos_formacao ON public.instrutor_formacao_treinamentos(formacao_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacoes_certificado_empresa ON public.instrutor_formacoes_certificado(empresa_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_status ON public.instrutor_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_instrutores_apto ON public.instrutores(apto);
CREATE INDEX IF NOT EXISTS idx_matriz_epi_cargo_epi ON public.matriz_epi_cargo(epi_id);
CREATE INDEX IF NOT EXISTS idx_matriz_epi_cargo_cargo ON public.matriz_epi_cargo(cargo_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_categoria ON public.notificacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_plano_despesas_tipo ON public.plano_despesas(tipo);
CREATE INDEX IF NOT EXISTS idx_plano_despesas_ativo ON public.plano_despesas(ativo);
CREATE INDEX IF NOT EXISTS idx_plano_receitas_ativo ON public.plano_receitas(ativo);
CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_created_at ON public.pos_venda_card_movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_venda_card_movimentacoes_tipo ON public.pos_venda_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_pos_venda_etiquetas_empresa ON public.pos_venda_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_etiquetas_etiqueta ON public.prospeccao_card_etiquetas(etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_created_at ON public.prospeccao_card_movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_movimentacoes_tipo ON public.prospeccao_card_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_prospeccao_cards_coluna ON public.prospeccao_cards(coluna_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_colunas_empresa ON public.prospeccao_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_modelos_tipo ON public.prospeccao_modelos(tipo);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON public.servicos(ativo);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON public.servicos(categoria);
CREATE INDEX IF NOT EXISTS idx_setor_permissoes_modulo_pagina ON public.setor_permissoes(modulo_id, pagina_id);

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 8
-- 2. Isso recria os índices que foram removidos
-- 3. NÃO afeta funcionalidade, apenas recria índices de performance
-- ============================================================================
