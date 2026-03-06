-- ============================================================================
-- FASE 8: Otimização de Performance - Remoção de Índices Não Usados
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - ~70 índices não usados removidos
-- - ~15 índices de FK recriados
-- - Redução do overhead de escrita no banco
-- - SEM IMPACTO em funcionalidade (apenas performance)
-- ============================================================================

-- LOTE 1: Índices de status/ativo que não são usados
DROP INDEX IF EXISTS idx_automacoes_ativo;
DROP INDEX IF EXISTS idx_cadastro_epis_ativo;
DROP INDEX IF EXISTS idx_cadastro_epis_protecao_para;
DROP INDEX IF EXISTS idx_categorias_clientes_empresa_empresa_id;
DROP INDEX IF EXISTS idx_cbo_codigo;
DROP INDEX IF EXISTS idx_cbo_descricao;
DROP INDEX IF EXISTS idx_centros_custo_ativo;
DROP INDEX IF EXISTS idx_cliente_contatos_principal;

-- LOTE 2: Índices de Closer não usados
DROP INDEX IF EXISTS idx_closer_atividades_status;
DROP INDEX IF EXISTS idx_closer_card_etiquetas_card;
DROP INDEX IF EXISTS idx_closer_card_movimentacoes_created_at;
DROP INDEX IF EXISTS idx_closer_card_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_closer_colunas_ordem;
DROP INDEX IF EXISTS idx_colaboradores_ativo;
DROP INDEX IF EXISTS idx_colaboradores_matricula;
DROP INDEX IF EXISTS idx_colaboradores_temp_cpf;
DROP INDEX IF EXISTS idx_colaboradores_temp_status;
DROP INDEX IF EXISTS idx_colaboradores_treinamentos_data_realizacao;

-- LOTE 3: Índices de Financeiro não usados
DROP INDEX IF EXISTS idx_condicoes_pagamento_ativo;
DROP INDEX IF EXISTS idx_contas_bancarias_ativo;
DROP INDEX IF EXISTS idx_contas_pagar_data_vencimento;
DROP INDEX IF EXISTS idx_contas_pagar_frequencia;
DROP INDEX IF EXISTS idx_contas_pagar_status;
DROP INDEX IF EXISTS idx_contas_receber_closer_card;
DROP INDEX IF EXISTS idx_contas_receber_condicao;
DROP INDEX IF EXISTS idx_contas_receber_data_recebimento;
DROP INDEX IF EXISTS idx_contas_receber_atividades_prazo;
DROP INDEX IF EXISTS idx_contas_receber_atividades_status;

-- LOTE 4: Índices de Contratos e Cross-Selling não usados
DROP INDEX IF EXISTS idx_contratos_status;
DROP INDEX IF EXISTS idx_contratos_parceiro_id;
DROP INDEX IF EXISTS idx_cross_selling_card_movimentacoes_card_id;
DROP INDEX IF EXISTS idx_cross_selling_card_movimentacoes_created_at;
DROP INDEX IF EXISTS idx_cross_selling_card_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_empresas_modulos_telas_ativo;
DROP INDEX IF EXISTS idx_empresas_modulos_telas_tela_id;
DROP INDEX IF EXISTS idx_entregas_epis_status;
DROP INDEX IF EXISTS idx_entregas_epis_data_entrega;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_data;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_status;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_numero;
DROP INDEX IF EXISTS idx_equipamentos_movimentacoes_funil_card_id;
DROP INDEX IF EXISTS idx_equipamentos_sst_categoria;
DROP INDEX IF EXISTS idx_equipamentos_sst_status;

-- LOTE 5: Índices de Estoque e Fornecedores não usados
DROP INDEX IF EXISTS idx_estoque_epis_codigo_entrada;
DROP INDEX IF EXISTS idx_estoque_epis_data_validade;
DROP INDEX IF EXISTS idx_estoque_epis_ativo;
DROP INDEX IF EXISTS idx_estoque_epis_codigo_lote;
DROP INDEX IF EXISTS idx_formas_pagamento_ativo;
DROP INDEX IF EXISTS idx_fornecedores_ativo;
DROP INDEX IF EXISTS idx_fornecedores_cnpj;
DROP INDEX IF EXISTS idx_frota_checklists_data;
DROP INDEX IF EXISTS idx_frota_checklists_empresa;

-- LOTE 6: Índices de Frota não usados
DROP INDEX IF EXISTS idx_frota_custos_categoria;
DROP INDEX IF EXISTS idx_frota_custos_empresa;
DROP INDEX IF EXISTS idx_frota_custos_data;
DROP INDEX IF EXISTS idx_frota_documentos_tipo;
DROP INDEX IF EXISTS idx_frota_documentos_vencimento;
DROP INDEX IF EXISTS idx_frota_documentos_empresa;
DROP INDEX IF EXISTS idx_frota_motoristas_cpf;
DROP INDEX IF EXISTS idx_frota_motoristas_cnh;
DROP INDEX IF EXISTS idx_frota_ocorrencias_status;
DROP INDEX IF EXISTS idx_frota_ocorrencias_empresa;
DROP INDEX IF EXISTS idx_frota_ocorrencias_data;
DROP INDEX IF EXISTS idx_frota_utilizacoes_data;
DROP INDEX IF EXISTS idx_frota_utilizacoes_funil_card_id;
DROP INDEX IF EXISTS idx_frota_veiculos_placa;
DROP INDEX IF EXISTS idx_frota_veiculos_empresa;
DROP INDEX IF EXISTS idx_funil_card_comparacoes_empresa_id;

-- LOTE 7: Índices diversos não usados
DROP INDEX IF EXISTS idx_grupos_homogeneos_ativo;
DROP INDEX IF EXISTS idx_grupos_homogeneos_empresa_ativo;
DROP INDEX IF EXISTS idx_instrutor_datas_indisponiveis_origem;
DROP INDEX IF EXISTS idx_instrutor_equipamentos_treinamento;
DROP INDEX IF EXISTS idx_instrutor_formacao_treinamentos_formacao;
DROP INDEX IF EXISTS idx_instrutor_formacoes_certificado_empresa;
DROP INDEX IF EXISTS idx_instrutor_solicitacoes_status;
DROP INDEX IF EXISTS idx_instrutores_apto;
DROP INDEX IF EXISTS idx_notificacoes_lida;
DROP INDEX IF EXISTS idx_notificacoes_categoria;
DROP INDEX IF EXISTS idx_plano_despesas_tipo;
DROP INDEX IF EXISTS idx_plano_despesas_ativo;
DROP INDEX IF EXISTS idx_plano_receitas_ativo;
DROP INDEX IF EXISTS idx_pos_venda_card_movimentacoes_created_at;
DROP INDEX IF EXISTS idx_pos_venda_card_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_prospeccao_card_movimentacoes_created_at;
DROP INDEX IF EXISTS idx_prospeccao_card_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_prospeccao_modelos_tipo;
DROP INDEX IF EXISTS idx_servicos_ativo;
DROP INDEX IF EXISTS idx_servicos_categoria;
DROP INDEX IF EXISTS idx_setor_permissoes_modulo_pagina;

-- ============================================================================
-- RECRIAR ÍNDICES DE FK QUE FORAM REPORTADOS COMO FALTANTES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_modelo_treinamentos_treinamento_id ON public.avaliacao_reacao_modelo_treinamentos(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacao_reacao_respostas_colaborador_id ON public.avaliacao_reacao_respostas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_clientes_sst_categoria_id ON public.clientes_sst(categoria_id);
CREATE INDEX IF NOT EXISTS idx_closer_colunas_empresa_id ON public.closer_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_closer_etiquetas_empresa_id ON public.closer_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_grupo_homogeneo_id ON public.colaboradores(grupo_homogeneo_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_coluna_id ON public.contas_pagar(coluna_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor_id ON public.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente_id ON public.contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contatos_unidades_unidade_id ON public.contatos_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_contrato_clausulas_contrato_id ON public.contrato_clausulas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_modulos_contrato_id ON public.contrato_modulos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON public.contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_declaracoes_reorientacao_treinamento_id ON public.declaracoes_reorientacao(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_estoque_id ON public.entregas_epis(estoque_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epis_epi_id ON public.entregas_epis(epi_id);
CREATE INDEX IF NOT EXISTS idx_estoque_epis_epi_id ON public.estoque_epis(epi_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_etiquetas_etiqueta_id ON public.funil_card_etiquetas(etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_cargo_id ON public.grupos_homogeneos(cargo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_cliente_id ON public.grupos_homogeneos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_treinamentos_treinamento_id ON public.grupos_homogeneos_treinamentos(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_equipamentos_treinamento_id ON public.instrutor_equipamentos(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_matriz_epi_cargo_epi_id ON public.matriz_epi_cargo(epi_id);
CREATE INDEX IF NOT EXISTS idx_matriz_epi_cargo_cargo_id ON public.matriz_epi_cargo(cargo_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_cards_coluna_id ON public.prospeccao_cards(coluna_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_colunas_empresa_id ON public.prospeccao_colunas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pos_venda_etiquetas_empresa_id ON public.pos_venda_etiquetas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_prospeccao_card_etiquetas_etiqueta_id ON public.prospeccao_card_etiquetas(etiqueta_id);

-- ============================================================================
-- RESUMO FASE 8:
-- - ~70 índices não usados removidos (status, ativo, data, etc)
-- - ~28 índices de FK recriados/mantidos
-- - Redução de overhead de escrita
-- - Melhora na performance geral
-- ============================================================================
