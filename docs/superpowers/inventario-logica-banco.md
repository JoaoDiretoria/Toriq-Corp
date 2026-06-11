# Inventário da lógica do banco (triggers + funções)

> Gerado de `scripts/dump_logic_inventory.py`. Cada item deve ser portado
> para Python na Fatia 3 e marcado aqui (Categoria + Destino).


## Triggers (229)

| Tabela | Trigger | Categoria | Destino Python | Portado |
|---|---|---|---|---|
| agenda_eventos | set_agenda_eventos_updated_at | timestamp |  | ☐ |
| automacoes | trigger_log_insert | auditoria |  | ☐ |
| automacoes | trigger_log_update | auditoria |  | ☐ |
| blog_autores | update_blog_autores_updated_at | timestamp |  | ☐ |
| blog_categorias | update_blog_categorias_updated_at | timestamp |  | ☐ |
| blog_user_preferences | update_blog_user_preferences_updated_at | timestamp |  | ☐ |
| blogs | update_blogs_updated_at | timestamp |  | ☐ |
| cargos | trigger_log_insert | auditoria |  | ☐ |
| cargos | trigger_log_update | auditoria |  | ☐ |
| cargos | update_cargos_updated_at | timestamp |  | ☐ |
| categorias_clientes | update_categorias_clientes_updated_at | timestamp |  | ☐ |
| categorias_clientes_empresa | trigger_log_insert | auditoria |  | ☐ |
| categorias_clientes_empresa | trigger_log_update | auditoria |  | ☐ |
| categorias_produtos | trigger_log_insert | auditoria |  | ☐ |
| categorias_produtos | trigger_log_update | auditoria |  | ☐ |
| centros_custo | trigger_log_insert | auditoria |  | ☐ |
| centros_custo | trigger_log_update | auditoria |  | ☐ |
| cliente_contatos | trigger_update_cliente_contatos_updated_at | timestamp |  | ☐ |
| clientes_sst | trigger_log_insert | auditoria |  | ☐ |
| clientes_sst | trigger_log_update | auditoria |  | ☐ |
| clientes_sst | update_clientes_sst_updated_at | timestamp |  | ☐ |
| closer_atividades | trigger_log_insert | auditoria |  | ☐ |
| closer_card_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| closer_cards | trigger_log_insert | auditoria |  | ☐ |
| closer_cards | trigger_log_update | auditoria |  | ☐ |
| closer_colunas | trigger_log_insert | auditoria |  | ☐ |
| closer_colunas | trigger_log_update | auditoria |  | ☐ |
| closer_etiquetas | trigger_log_insert | auditoria |  | ☐ |
| closer_etiquetas | trigger_log_update | auditoria |  | ☐ |
| closer_modelos_atividade | trigger_log_insert | auditoria |  | ☐ |
| closer_modelos_atividade | trigger_log_update | auditoria |  | ☐ |
| colaboradores | trigger_log_insert | auditoria |  | ☐ |
| colaboradores | trigger_log_update | auditoria |  | ☐ |
| colaboradores | update_colaboradores_updated_at | timestamp |  | ☐ |
| comercial_funil | trigger_log_insert | auditoria |  | ☐ |
| comercial_funil | trigger_log_update | auditoria |  | ☐ |
| comercial_funil | update_comercial_funil_updated_at | timestamp |  | ☐ |
| condicoes_pagamento | trigger_log_insert | auditoria |  | ☐ |
| condicoes_pagamento | trigger_log_update | auditoria |  | ☐ |
| condicoes_pagamento | update_condicoes_pagamento_updated_at | timestamp |  | ☐ |
| configuracoes_empresa | trigger_log_insert | auditoria |  | ☐ |
| configuracoes_empresa | trigger_log_update | auditoria |  | ☐ |
| configuracoes_empresa | update_configuracoes_empresa_updated_at | timestamp |  | ☐ |
| contas_bancarias | trigger_log_insert | auditoria |  | ☐ |
| contas_bancarias | trigger_log_update | auditoria |  | ☐ |
| contas_bancarias | update_contas_bancarias_updated_at | timestamp |  | ☐ |
| contas_pagar | trigger_log_insert | auditoria |  | ☐ |
| contas_pagar | trigger_log_update | auditoria |  | ☐ |
| contas_pagar | update_contas_pagar_updated_at | timestamp |  | ☐ |
| contas_pagar_atividades | update_contas_pagar_atividades_updated_at | timestamp |  | ☐ |
| contas_pagar_colunas | trigger_log_insert | auditoria |  | ☐ |
| contas_pagar_colunas | trigger_log_update | auditoria |  | ☐ |
| contas_pagar_colunas | update_contas_pagar_colunas_updated_at | timestamp |  | ☐ |
| contas_receber | trigger_log_insert | auditoria |  | ☐ |
| contas_receber | trigger_log_update | auditoria |  | ☐ |
| contas_receber | update_contas_receber_updated_at | timestamp |  | ☐ |
| contas_receber_atividades | update_contas_receber_atividades_updated_at | timestamp |  | ☐ |
| contas_receber_colunas | trigger_log_insert | auditoria |  | ☐ |
| contas_receber_colunas | trigger_log_update | auditoria |  | ☐ |
| contas_receber_colunas | update_contas_receber_colunas_updated_at | timestamp |  | ☐ |
| contratos | contratos_updated_at | timestamp |  | ☐ |
| contratos | trigger_log_insert | auditoria |  | ☐ |
| contratos | trigger_log_update | auditoria |  | ☐ |
| cross_selling_atividades | trigger_log_insert | auditoria |  | ☐ |
| cross_selling_card_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| cross_selling_cards | trigger_log_insert | auditoria |  | ☐ |
| cross_selling_cards | trigger_log_update | auditoria |  | ☐ |
| cross_selling_colunas | trigger_log_insert | auditoria |  | ☐ |
| cross_selling_colunas | trigger_log_update | auditoria |  | ☐ |
| cross_selling_etiquetas | trigger_log_insert | auditoria |  | ☐ |
| cross_selling_etiquetas | trigger_log_update | auditoria |  | ☐ |
| empresa_configuracoes | trigger_log_insert | auditoria |  | ☐ |
| empresa_configuracoes | trigger_log_update | auditoria |  | ☐ |
| empresa_contatos | trigger_log_insert | auditoria |  | ☐ |
| empresa_contatos | trigger_log_update | auditoria |  | ☐ |
| empresas | update_empresas_updated_at | timestamp |  | ☐ |
| empresas_modulos | trigger_log_insert | auditoria |  | ☐ |
| empresas_modulos | trigger_log_update | auditoria |  | ☐ |
| empresas_modulos_telas | trigger_log_insert | auditoria |  | ☐ |
| empresas_modulos_telas | trigger_log_update | auditoria |  | ☐ |
| empresas_modulos_telas | trigger_update_empresas_modulos_telas_updated_at | timestamp |  | ☐ |
| equipamentos_categorias | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_categorias | trigger_log_update | auditoria |  | ☐ |
| equipamentos_finalidades | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_finalidades | trigger_log_update | auditoria |  | ☐ |
| equipamentos_kits | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_kits | trigger_log_update | auditoria |  | ☐ |
| equipamentos_modelos_atividade | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_modelos_atividade | trigger_log_update | auditoria |  | ☐ |
| equipamentos_movimentacoes | trigger_gerar_numero_movimentacao | negócio (revisar) |  | ☐ |
| equipamentos_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_movimentacoes | trigger_log_update | auditoria |  | ☐ |
| equipamentos_sst | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_sst | trigger_log_update | auditoria |  | ☐ |
| equipamentos_status | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_status | trigger_log_update | auditoria |  | ☐ |
| equipamentos_unidades | trigger_log_insert | auditoria |  | ☐ |
| equipamentos_unidades | trigger_log_update | auditoria |  | ☐ |
| financeiro_contas | trigger_log_insert | auditoria |  | ☐ |
| financeiro_contas | trigger_log_update | auditoria |  | ☐ |
| financeiro_contas | update_financeiro_contas_updated_at | timestamp |  | ☐ |
| formas_cobranca | trigger_log_insert | auditoria |  | ☐ |
| formas_cobranca | trigger_log_update | auditoria |  | ☐ |
| formas_pagamento | trigger_log_insert | auditoria |  | ☐ |
| formas_pagamento | trigger_log_update | auditoria |  | ☐ |
| fornecedores | trigger_log_insert | auditoria |  | ☐ |
| fornecedores | trigger_log_update | auditoria |  | ☐ |
| fornecedores | update_fornecedores_updated_at | timestamp |  | ☐ |
| frota_checklists | trigger_log_insert | auditoria |  | ☐ |
| frota_checklists | trigger_log_update | auditoria |  | ☐ |
| frota_checklists | update_frota_checklists_updated_at | timestamp |  | ☐ |
| frota_custos | trigger_log_insert | auditoria |  | ☐ |
| frota_custos | trigger_log_update | auditoria |  | ☐ |
| frota_custos | update_frota_custos_updated_at | timestamp |  | ☐ |
| frota_documentos | trigger_log_insert | auditoria |  | ☐ |
| frota_documentos | trigger_log_update | auditoria |  | ☐ |
| frota_manutencoes | trigger_log_insert | auditoria |  | ☐ |
| frota_manutencoes | trigger_log_update | auditoria |  | ☐ |
| frota_ocorrencias | trigger_log_insert | auditoria |  | ☐ |
| frota_ocorrencias | trigger_log_update | auditoria |  | ☐ |
| frota_ocorrencias | update_frota_ocorrencias_updated_at | timestamp |  | ☐ |
| frota_utilizacoes | trigger_generate_utilizacao_codigo | negócio (revisar) |  | ☐ |
| frota_utilizacoes | trigger_log_insert | auditoria |  | ☐ |
| frota_utilizacoes | trigger_log_update | auditoria |  | ☐ |
| frota_veiculos | trigger_frota_veiculos_updated_at | timestamp |  | ☐ |
| frota_veiculos | trigger_log_insert | auditoria |  | ☐ |
| frota_veiculos | trigger_log_update | auditoria |  | ☐ |
| funil_card_atividades | trigger_log_insert | auditoria |  | ☐ |
| funil_card_atividades | trigger_log_update | auditoria |  | ☐ |
| funil_card_comparacoes | trigger_log_insert | auditoria |  | ☐ |
| funil_card_comparacoes | trigger_log_update | auditoria |  | ☐ |
| funil_card_comparacoes | trigger_update_funil_card_comparacoes_updated_at | timestamp |  | ☐ |
| funil_card_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| funil_card_orcamentos | trigger_log_insert | auditoria |  | ☐ |
| funil_card_orcamentos | trigger_log_update | auditoria |  | ☐ |
| funil_card_orcamentos | trigger_update_funil_card_orcamentos_updated_at | timestamp |  | ☐ |
| funil_card_orcamentos_servicos_sst | trigger_update_funil_card_orcamentos_sst_updated_at | timestamp |  | ☐ |
| funil_card_propostas | trigger_update_funil_card_propostas_updated_at | timestamp |  | ☐ |
| funil_card_propostas | update_funil_card_propostas_updated_at | timestamp |  | ☐ |
| funil_cards | trigger_log_insert | auditoria |  | ☐ |
| funil_cards | trigger_log_update | auditoria |  | ☐ |
| funil_etapas | trigger_log_insert | auditoria |  | ☐ |
| funil_etapas | trigger_log_update | auditoria |  | ☐ |
| funil_etiquetas | trigger_log_insert | auditoria |  | ☐ |
| funil_etiquetas | trigger_log_update | auditoria |  | ☐ |
| funil_negocio_configuracoes | trigger_update_funil_negocio_configuracoes_updated_at | timestamp |  | ☐ |
| funis | trigger_criar_configuracao_funil | negócio (revisar) |  | ☐ |
| funis | trigger_log_insert | auditoria |  | ☐ |
| funis | trigger_log_update | auditoria |  | ☐ |
| google_oauth_tokens | trg_google_token_ts | negócio (revisar) |  | ☐ |
| grupos_clientes | trigger_log_insert | auditoria |  | ☐ |
| grupos_clientes | trigger_log_update | auditoria |  | ☐ |
| import_queue | trigger_update_import_queue_updated_at | timestamp |  | ☐ |
| informacoes_empresa | trigger_log_insert | auditoria |  | ☐ |
| informacoes_empresa | trigger_log_update | auditoria |  | ☐ |
| informacoes_empresa | trigger_update_informacoes_empresa_updated_at | timestamp |  | ☐ |
| modelos_atividade | trigger_log_insert | auditoria |  | ☐ |
| modelos_atividade | trigger_log_update | auditoria |  | ☐ |
| modelos_contrato | modelos_contrato_updated_at | timestamp |  | ☐ |
| modelos_contrato | trigger_log_insert | auditoria |  | ☐ |
| modelos_contrato | trigger_log_update | auditoria |  | ☐ |
| notificacoes | trigger_notificacoes_updated_at | timestamp |  | ☐ |
| pacotes_produtos | trigger_log_insert | auditoria |  | ☐ |
| pacotes_produtos | trigger_log_update | auditoria |  | ☐ |
| pesquisas_opiniao | update_pesquisas_opiniao_updated_at | timestamp |  | ☐ |
| pesquisas_votos | trigger_increment_pesquisa_votos | negócio (revisar) |  | ☐ |
| plano_despesas | trigger_log_insert | auditoria |  | ☐ |
| plano_despesas | trigger_log_update | auditoria |  | ☐ |
| plano_despesas | update_plano_despesas_updated_at | timestamp |  | ☐ |
| plano_receitas | trigger_log_insert | auditoria |  | ☐ |
| plano_receitas | trigger_log_update | auditoria |  | ☐ |
| plano_receitas | update_plano_receitas_updated_at | timestamp |  | ☐ |
| pos_venda_atividades | trigger_log_insert | auditoria |  | ☐ |
| pos_venda_card_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| pos_venda_cards | trigger_log_insert | auditoria |  | ☐ |
| pos_venda_cards | trigger_log_update | auditoria |  | ☐ |
| pos_venda_colunas | trigger_log_insert | auditoria |  | ☐ |
| pos_venda_colunas | trigger_log_update | auditoria |  | ☐ |
| pos_venda_etiquetas | trigger_log_insert | auditoria |  | ☐ |
| pos_venda_etiquetas | trigger_log_update | auditoria |  | ☐ |
| produtos_servicos | trigger_log_insert | auditoria |  | ☐ |
| produtos_servicos | trigger_log_update | auditoria |  | ☐ |
| profiles | trigger_log_insert | auditoria |  | ☐ |
| profiles | trigger_log_update | auditoria |  | ☐ |
| profiles | update_profiles_updated_at | timestamp |  | ☐ |
| profissionais_saude | trigger_log_insert | auditoria |  | ☐ |
| profissionais_saude | trigger_log_update | auditoria |  | ☐ |
| profissionais_seguranca | trigger_log_insert | auditoria |  | ☐ |
| profissionais_seguranca | trigger_log_update | auditoria |  | ☐ |
| propostas_comerciais_servicos_sst | trigger_update_propostas_servicos_sst_updated_at | timestamp |  | ☐ |
| propostas_comerciais_vertical365 | trigger_propostas_v365_updated_at | timestamp |  | ☐ |
| propostas_comerciais_vertical365 | trigger_propostas_vertical365_updated_at | timestamp |  | ☐ |
| propostas_modelos | trigger_update_propostas_modelos_updated_at | timestamp |  | ☐ |
| propostas_modelos | update_propostas_modelos_updated_at | timestamp |  | ☐ |
| prospeccao_atividades | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_card_movimentacoes | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_cards | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_cards | trigger_log_update | auditoria |  | ☐ |
| prospeccao_cards | trigger_prospeccao_cards_updated_at | timestamp |  | ☐ |
| prospeccao_colunas | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_colunas | trigger_log_update | auditoria |  | ☐ |
| prospeccao_colunas | trigger_prospeccao_colunas_updated_at | timestamp |  | ☐ |
| prospeccao_etiquetas | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_etiquetas | trigger_log_update | auditoria |  | ☐ |
| prospeccao_modelos | trigger_log_insert | auditoria |  | ☐ |
| prospeccao_modelos | trigger_log_update | auditoria |  | ☐ |
| saude_ocupacional | trigger_log_insert | auditoria |  | ☐ |
| saude_ocupacional | trigger_log_update | auditoria |  | ☐ |
| saude_ocupacional | update_saude_ocupacional_updated_at | timestamp |  | ☐ |
| servicos | trigger_log_insert | auditoria |  | ☐ |
| servicos | trigger_log_update | auditoria |  | ☐ |
| servicos | trigger_servicos_updated_at | timestamp |  | ☐ |
| setor_permissoes | update_setor_permissoes_updated_at | timestamp |  | ☐ |
| setores | trigger_log_insert | auditoria |  | ☐ |
| setores | trigger_log_update | auditoria |  | ☐ |
| setores | update_setores_updated_at | timestamp |  | ☐ |
| terceiros | trigger_log_insert | auditoria |  | ☐ |
| terceiros | trigger_log_update | auditoria |  | ☐ |
| terceiros | update_terceiros_updated_at | timestamp |  | ☐ |
| tickets_sla_config | trigger_tickets_sla_config_updated_at | timestamp |  | ☐ |
| tickets_suporte | trigger_notify_ticket_created | notificação |  | ☐ |
| tickets_suporte | trigger_notify_ticket_updated | notificação |  | ☐ |
| tickets_suporte | trigger_ticket_updated_at | timestamp |  | ☐ |
| tipos_empresa | update_tipos_empresa_updated_at | timestamp |  | ☐ |
| tipos_produtos | trigger_log_insert | auditoria |  | ☐ |
| tipos_produtos | trigger_log_update | auditoria |  | ☐ |
| unidades_clientes | trigger_log_insert | auditoria |  | ☐ |
| unidades_clientes | trigger_log_update | auditoria |  | ☐ |
| white_label_config | trigger_white_label_config_updated_at | timestamp |  | ☐ |

## Funções (108)

| Função | Categoria | Destino Python | Portado |
|---|---|---|---|
| atualizar_google_token_ts | negócio (revisar) |  | ☐ |
| can_delete_profile | negócio (revisar) |  | ☐ |
| can_update_profile | negócio (revisar) |  | ☐ |
| can_view_profile | negócio (revisar) |  | ☐ |
| criar_configuracao_funil_padrao | negócio (revisar) |  | ☐ |
| criar_notificacao | notificação |  | ☐ |
| delete_empresa_cascade | negócio (revisar) |  | ☐ |
| executar_automacoes_agendadas | negócio (revisar) |  | ☐ |
| executar_automacoes_negocio_parado | negócio (revisar) |  | ☐ |
| generate_contrato_numero | negócio (revisar) |  | ☐ |
| generate_utilizacao_codigo | negócio (revisar) |  | ☐ |
| gerar_contas_recorrentes | negócio (revisar) |  | ☐ |
| gerar_numero_movimentacao | negócio (revisar) |  | ☐ |
| get_aulas_instrutor | negócio (revisar) |  | ☐ |
| get_certificados_expirando | negócio (revisar) |  | ☐ |
| get_clientes_empresa_ids | negócio (revisar) |  | ☐ |
| get_current_user_empresa_id | negócio (revisar) |  | ☐ |
| get_current_user_role | negócio (revisar) |  | ☐ |
| get_empresa_sst_do_cliente | negócio (revisar) |  | ☐ |
| get_empresa_sst_pai | negócio (revisar) |  | ☐ |
| get_empresa_sst_pai_by_user | negócio (revisar) |  | ☐ |
| get_instrutor_id_for_user | negócio (revisar) |  | ☐ |
| get_my_profile_data | negócio (revisar) |  | ☐ |
| get_solicitacoes_treinamento_clientes | negócio (revisar) |  | ☐ |
| get_subordinados | negócio (revisar) |  | ☐ |
| get_turmas_instrutor | negócio (revisar) |  | ☐ |
| get_user_empresa_id | negócio (revisar) |  | ☐ |
| get_user_empresa_id_safe | negócio (revisar) |  | ☐ |
| get_user_role | negócio (revisar) |  | ☐ |
| get_user_role_safe | negócio (revisar) |  | ☐ |
| get_usuarios_visiveis | negócio (revisar) |  | ☐ |
| handle_new_user | negócio (revisar) |  | ☐ |
| has_role | negócio (revisar) |  | ☐ |
| increment_pesquisa_votos | negócio (revisar) |  | ☐ |
| invalidar_sessoes_anteriores | negócio (revisar) |  | ☐ |
| invalidar_todas_sessoes_por_email | notificação |  | ☐ |
| is_admin_or_empresa_admin | negócio (revisar) |  | ☐ |
| is_admin_vertical | negócio (revisar) |  | ☐ |
| is_cliente_of_turma | negócio (revisar) |  | ☐ |
| is_empresa_sst | negócio (revisar) |  | ☐ |
| is_instrutor_of_turma | negócio (revisar) |  | ☐ |
| limpar_logs_auditoria_expirados | auditoria |  | ☐ |
| log_card_movimentacao | auditoria |  | ☐ |
| log_funil_atividade_changes | auditoria |  | ☐ |
| log_funil_card_changes | auditoria |  | ☐ |
| log_funil_etapa_changes | auditoria |  | ☐ |
| log_table_changes | auditoria |  | ☐ |
| log_table_insert | auditoria |  | ☐ |
| notify_cliente_sst_created | notificação |  | ☐ |
| notify_closer_card_created | notificação |  | ☐ |
| notify_colaborador_created | notificação |  | ☐ |
| notify_conta_pagar_created | notificação |  | ☐ |
| notify_conta_receber_created | notificação |  | ☐ |
| notify_cross_selling_card_created | notificação |  | ☐ |
| notify_entrega_epi_created | notificação |  | ☐ |
| notify_estoque_epi_created | notificação |  | ☐ |
| notify_pos_venda_card_created | notificação |  | ☐ |
| notify_prospeccao_card_created | notificação |  | ☐ |
| notify_solicitacao_treinamento_created | notificação |  | ☐ |
| notify_ticket_created | notificação |  | ☐ |
| notify_ticket_updated | notificação |  | ☐ |
| notify_turma_created | notificação |  | ☐ |
| obter_proximo_codigo_turma | negócio (revisar) |  | ☐ |
| pode_acessar_registro | negócio (revisar) |  | ☐ |
| pode_acessar_usuario | negócio (revisar) |  | ☐ |
| pode_ver_notificacao_empresa | notificação |  | ☐ |
| populate_empresa_modulo_telas | negócio (revisar) |  | ☐ |
| register_app_update | negócio (revisar) |  | ☐ |
| registrar_sessao | negócio (revisar) |  | ☐ |
| update_agenda_eventos_updated_at | timestamp |  | ☐ |
| update_cadastro_epis_updated_at | timestamp |  | ☐ |
| update_catalogo_treinamentos_updated_at | timestamp |  | ☐ |
| update_cliente_contatos_updated_at | timestamp |  | ☐ |
| update_contratos_updated_at | timestamp |  | ☐ |
| update_declaracoes_reorientacao_updated_at | timestamp |  | ☐ |
| update_empresas_modulos_telas_updated_at | timestamp |  | ☐ |
| update_entregas_epis_updated_at | timestamp |  | ☐ |
| update_estoque_epis_updated_at | timestamp |  | ☐ |
| update_frota_veiculos_updated_at | timestamp |  | ☐ |
| update_funil_card_comparacoes_updated_at | timestamp |  | ☐ |
| update_funil_card_orcamentos_sst_updated_at | timestamp |  | ☐ |
| update_funil_card_orcamentos_updated_at | timestamp |  | ☐ |
| update_funil_card_propostas_updated_at | timestamp |  | ☐ |
| update_funil_negocio_configuracoes_updated_at | timestamp |  | ☐ |
| update_grupos_homogeneos_updated_at | timestamp |  | ☐ |
| update_import_queue_updated_at | timestamp |  | ☐ |
| update_informacoes_empresa_updated_at | timestamp |  | ☐ |
| update_instrutor_formacoes_updated_at | timestamp |  | ☐ |
| update_instrutor_solicitacoes_updated_at | timestamp |  | ☐ |
| update_matriz_epi_cargo_updated_at | timestamp |  | ☐ |
| update_modelo_relatorio_blocos_updated_at | timestamp |  | ☐ |
| update_modelo_relatorio_updated_at | timestamp |  | ☐ |
| update_notificacoes_updated_at | timestamp |  | ☐ |
| update_profile_safe | negócio (revisar) |  | ☐ |
| update_propostas_modelos_updated_at | timestamp |  | ☐ |
| update_propostas_servicos_sst_updated_at | timestamp |  | ☐ |
| update_propostas_v365_updated_at | timestamp |  | ☐ |
| update_propostas_vertical365_updated_at | timestamp |  | ☐ |
| update_prospeccao_updated_at | timestamp |  | ☐ |
| update_servicos_updated_at | timestamp |  | ☐ |
| update_ticket_updated_at | timestamp |  | ☐ |
| update_tickets_sla_config_updated_at | timestamp |  | ☐ |
| update_turma_anexos_updated_at | timestamp |  | ☐ |
| update_turma_colaboradores_updated_at | timestamp |  | ☐ |
| update_updated_at_column | timestamp |  | ☐ |
| update_white_label_config_updated_at | timestamp |  | ☐ |
| verificar_sessao_ativa_por_email | notificação |  | ☐ |
| verificar_sessao_valida | negócio (revisar) |  | ☐ |

## Definições completas (referência)


### trigger `set_agenda_eventos_updated_at` on `agenda_eventos`
```sql
CREATE TRIGGER set_agenda_eventos_updated_at BEFORE UPDATE ON public.agenda_eventos FOR EACH ROW EXECUTE FUNCTION update_agenda_eventos_updated_at()
```

### trigger `trigger_log_insert` on `automacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.automacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `automacoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.automacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_blog_autores_updated_at` on `blog_autores`
```sql
CREATE TRIGGER update_blog_autores_updated_at BEFORE UPDATE ON public.blog_autores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_blog_categorias_updated_at` on `blog_categorias`
```sql
CREATE TRIGGER update_blog_categorias_updated_at BEFORE UPDATE ON public.blog_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_blog_user_preferences_updated_at` on `blog_user_preferences`
```sql
CREATE TRIGGER update_blog_user_preferences_updated_at BEFORE UPDATE ON public.blog_user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_blogs_updated_at` on `blogs`
```sql
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `cargos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cargos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `cargos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.cargos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_cargos_updated_at` on `cargos`
```sql
CREATE TRIGGER update_cargos_updated_at BEFORE UPDATE ON public.cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_categorias_clientes_updated_at` on `categorias_clientes`
```sql
CREATE TRIGGER update_categorias_clientes_updated_at BEFORE UPDATE ON public.categorias_clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `categorias_clientes_empresa`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.categorias_clientes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `categorias_clientes_empresa`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.categorias_clientes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `categorias_produtos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.categorias_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `categorias_produtos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.categorias_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `centros_custo`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `centros_custo`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_cliente_contatos_updated_at` on `cliente_contatos`
```sql
CREATE TRIGGER trigger_update_cliente_contatos_updated_at BEFORE UPDATE ON public.cliente_contatos FOR EACH ROW EXECUTE FUNCTION update_cliente_contatos_updated_at()
```

### trigger `trigger_log_insert` on `clientes_sst`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.clientes_sst FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `clientes_sst`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.clientes_sst FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_clientes_sst_updated_at` on `clientes_sst`
```sql
CREATE TRIGGER update_clientes_sst_updated_at BEFORE UPDATE ON public.clientes_sst FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `closer_atividades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_atividades FOR EACH ROW EXECUTE FUNCTION log_table_insert()
```

### trigger `trigger_log_insert` on `closer_card_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao()
```

### trigger `trigger_log_insert` on `closer_cards`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `closer_cards`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.closer_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `closer_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `closer_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.closer_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `closer_etiquetas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `closer_etiquetas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.closer_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `closer_modelos_atividade`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.closer_modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `closer_modelos_atividade`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.closer_modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `colaboradores`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `colaboradores`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_colaboradores_updated_at` on `colaboradores`
```sql
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `comercial_funil`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.comercial_funil FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `comercial_funil`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.comercial_funil FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_comercial_funil_updated_at` on `comercial_funil`
```sql
CREATE TRIGGER update_comercial_funil_updated_at BEFORE UPDATE ON public.comercial_funil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `condicoes_pagamento`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.condicoes_pagamento FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `condicoes_pagamento`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.condicoes_pagamento FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_condicoes_pagamento_updated_at` on `condicoes_pagamento`
```sql
CREATE TRIGGER update_condicoes_pagamento_updated_at BEFORE UPDATE ON public.condicoes_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `configuracoes_empresa`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `configuracoes_empresa`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_configuracoes_empresa_updated_at` on `configuracoes_empresa`
```sql
CREATE TRIGGER update_configuracoes_empresa_updated_at BEFORE UPDATE ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `contas_bancarias`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contas_bancarias`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_contas_bancarias_updated_at` on `contas_bancarias`
```sql
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `contas_pagar`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contas_pagar`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_contas_pagar_updated_at` on `contas_pagar`
```sql
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_contas_pagar_atividades_updated_at` on `contas_pagar_atividades`
```sql
CREATE TRIGGER update_contas_pagar_atividades_updated_at BEFORE UPDATE ON public.contas_pagar_atividades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `contas_pagar_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contas_pagar_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contas_pagar_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contas_pagar_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_contas_pagar_colunas_updated_at` on `contas_pagar_colunas`
```sql
CREATE TRIGGER update_contas_pagar_colunas_updated_at BEFORE UPDATE ON public.contas_pagar_colunas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `contas_receber`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contas_receber`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_contas_receber_updated_at` on `contas_receber`
```sql
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `update_contas_receber_atividades_updated_at` on `contas_receber_atividades`
```sql
CREATE TRIGGER update_contas_receber_atividades_updated_at BEFORE UPDATE ON public.contas_receber_atividades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `contas_receber_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contas_receber_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contas_receber_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contas_receber_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_contas_receber_colunas_updated_at` on `contas_receber_colunas`
```sql
CREATE TRIGGER update_contas_receber_colunas_updated_at BEFORE UPDATE ON public.contas_receber_colunas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `contratos_updated_at` on `contratos`
```sql
CREATE TRIGGER contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION update_contratos_updated_at()
```

### trigger `trigger_log_insert` on `contratos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.contratos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `contratos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `cross_selling_atividades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cross_selling_atividades FOR EACH ROW EXECUTE FUNCTION log_table_insert()
```

### trigger `trigger_log_insert` on `cross_selling_card_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cross_selling_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao()
```

### trigger `trigger_log_insert` on `cross_selling_cards`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cross_selling_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `cross_selling_cards`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.cross_selling_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `cross_selling_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cross_selling_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `cross_selling_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.cross_selling_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `cross_selling_etiquetas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.cross_selling_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `cross_selling_etiquetas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.cross_selling_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `empresa_configuracoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.empresa_configuracoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `empresa_configuracoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.empresa_configuracoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `empresa_contatos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.empresa_contatos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `empresa_contatos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.empresa_contatos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_empresas_updated_at` on `empresas`
```sql
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `empresas_modulos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.empresas_modulos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `empresas_modulos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.empresas_modulos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `empresas_modulos_telas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.empresas_modulos_telas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `empresas_modulos_telas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.empresas_modulos_telas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_empresas_modulos_telas_updated_at` on `empresas_modulos_telas`
```sql
CREATE TRIGGER trigger_update_empresas_modulos_telas_updated_at BEFORE UPDATE ON public.empresas_modulos_telas FOR EACH ROW EXECUTE FUNCTION update_empresas_modulos_telas_updated_at()
```

### trigger `trigger_log_insert` on `equipamentos_categorias`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_categorias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_categorias`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_categorias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_finalidades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_finalidades FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_finalidades`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_finalidades FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_kits`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_kits FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_kits`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_kits FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_modelos_atividade`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_modelos_atividade`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_gerar_numero_movimentacao` on `equipamentos_movimentacoes`
```sql
CREATE TRIGGER trigger_gerar_numero_movimentacao BEFORE INSERT ON public.equipamentos_movimentacoes FOR EACH ROW WHEN ((new.numero_movimentacao IS NULL)) EXECUTE FUNCTION gerar_numero_movimentacao()
```

### trigger `trigger_log_insert` on `equipamentos_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_movimentacoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_sst`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_sst FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_sst`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_sst FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_status`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_status FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_status`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_status FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `equipamentos_unidades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.equipamentos_unidades FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `equipamentos_unidades`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.equipamentos_unidades FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `financeiro_contas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.financeiro_contas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `financeiro_contas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.financeiro_contas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_financeiro_contas_updated_at` on `financeiro_contas`
```sql
CREATE TRIGGER update_financeiro_contas_updated_at BEFORE UPDATE ON public.financeiro_contas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `formas_cobranca`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.formas_cobranca FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `formas_cobranca`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.formas_cobranca FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `formas_pagamento`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.formas_pagamento FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `formas_pagamento`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.formas_pagamento FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `fornecedores`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `fornecedores`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_fornecedores_updated_at` on `fornecedores`
```sql
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `frota_checklists`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_checklists FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_checklists`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_checklists FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_frota_checklists_updated_at` on `frota_checklists`
```sql
CREATE TRIGGER update_frota_checklists_updated_at BEFORE UPDATE ON public.frota_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `frota_custos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_custos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_custos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_custos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_frota_custos_updated_at` on `frota_custos`
```sql
CREATE TRIGGER update_frota_custos_updated_at BEFORE UPDATE ON public.frota_custos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `frota_documentos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_documentos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_documentos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_documentos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `frota_manutencoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_manutencoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_manutencoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_manutencoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `frota_ocorrencias`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_ocorrencias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_ocorrencias`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_ocorrencias FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_frota_ocorrencias_updated_at` on `frota_ocorrencias`
```sql
CREATE TRIGGER update_frota_ocorrencias_updated_at BEFORE UPDATE ON public.frota_ocorrencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_generate_utilizacao_codigo` on `frota_utilizacoes`
```sql
CREATE TRIGGER trigger_generate_utilizacao_codigo BEFORE INSERT ON public.frota_utilizacoes FOR EACH ROW WHEN ((new.codigo IS NULL)) EXECUTE FUNCTION generate_utilizacao_codigo()
```

### trigger `trigger_log_insert` on `frota_utilizacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_utilizacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_utilizacoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_utilizacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_frota_veiculos_updated_at` on `frota_veiculos`
```sql
CREATE TRIGGER trigger_frota_veiculos_updated_at BEFORE UPDATE ON public.frota_veiculos FOR EACH ROW EXECUTE FUNCTION update_frota_veiculos_updated_at()
```

### trigger `trigger_log_insert` on `frota_veiculos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.frota_veiculos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `frota_veiculos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.frota_veiculos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `funil_card_atividades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_card_atividades FOR EACH ROW EXECUTE FUNCTION log_funil_atividade_changes()
```

### trigger `trigger_log_update` on `funil_card_atividades`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_card_atividades FOR EACH ROW EXECUTE FUNCTION log_funil_atividade_changes()
```

### trigger `trigger_log_insert` on `funil_card_comparacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_card_comparacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `funil_card_comparacoes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_card_comparacoes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_funil_card_comparacoes_updated_at` on `funil_card_comparacoes`
```sql
CREATE TRIGGER trigger_update_funil_card_comparacoes_updated_at BEFORE UPDATE ON public.funil_card_comparacoes FOR EACH ROW EXECUTE FUNCTION update_funil_card_comparacoes_updated_at()
```

### trigger `trigger_log_insert` on `funil_card_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao()
```

### trigger `trigger_log_insert` on `funil_card_orcamentos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_card_orcamentos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `funil_card_orcamentos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_card_orcamentos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_funil_card_orcamentos_updated_at` on `funil_card_orcamentos`
```sql
CREATE TRIGGER trigger_update_funil_card_orcamentos_updated_at BEFORE UPDATE ON public.funil_card_orcamentos FOR EACH ROW EXECUTE FUNCTION update_funil_card_orcamentos_updated_at()
```

### trigger `trigger_update_funil_card_orcamentos_sst_updated_at` on `funil_card_orcamentos_servicos_sst`
```sql
CREATE TRIGGER trigger_update_funil_card_orcamentos_sst_updated_at BEFORE UPDATE ON public.funil_card_orcamentos_servicos_sst FOR EACH ROW EXECUTE FUNCTION update_funil_card_orcamentos_sst_updated_at()
```

### trigger `trigger_update_funil_card_propostas_updated_at` on `funil_card_propostas`
```sql
CREATE TRIGGER trigger_update_funil_card_propostas_updated_at BEFORE UPDATE ON public.funil_card_propostas FOR EACH ROW EXECUTE FUNCTION update_funil_card_propostas_updated_at()
```

### trigger `update_funil_card_propostas_updated_at` on `funil_card_propostas`
```sql
CREATE TRIGGER update_funil_card_propostas_updated_at BEFORE UPDATE ON public.funil_card_propostas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `funil_cards`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_cards FOR EACH ROW EXECUTE FUNCTION log_funil_card_changes()
```

### trigger `trigger_log_update` on `funil_cards`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_cards FOR EACH ROW EXECUTE FUNCTION log_funil_card_changes()
```

### trigger `trigger_log_insert` on `funil_etapas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_etapas FOR EACH ROW EXECUTE FUNCTION log_funil_etapa_changes()
```

### trigger `trigger_log_update` on `funil_etapas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_etapas FOR EACH ROW EXECUTE FUNCTION log_funil_etapa_changes()
```

### trigger `trigger_log_insert` on `funil_etiquetas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funil_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `funil_etiquetas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funil_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_funil_negocio_configuracoes_updated_at` on `funil_negocio_configuracoes`
```sql
CREATE TRIGGER trigger_update_funil_negocio_configuracoes_updated_at BEFORE UPDATE ON public.funil_negocio_configuracoes FOR EACH ROW EXECUTE FUNCTION update_funil_negocio_configuracoes_updated_at()
```

### trigger `trigger_criar_configuracao_funil` on `funis`
```sql
CREATE TRIGGER trigger_criar_configuracao_funil AFTER INSERT ON public.funis FOR EACH ROW EXECUTE FUNCTION criar_configuracao_funil_padrao()
```

### trigger `trigger_log_insert` on `funis`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.funis FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `funis`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.funis FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trg_google_token_ts` on `google_oauth_tokens`
```sql
CREATE TRIGGER trg_google_token_ts BEFORE UPDATE ON public.google_oauth_tokens FOR EACH ROW EXECUTE FUNCTION atualizar_google_token_ts()
```

### trigger `trigger_log_insert` on `grupos_clientes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.grupos_clientes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `grupos_clientes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.grupos_clientes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_import_queue_updated_at` on `import_queue`
```sql
CREATE TRIGGER trigger_update_import_queue_updated_at BEFORE UPDATE ON public.import_queue FOR EACH ROW EXECUTE FUNCTION update_import_queue_updated_at()
```

### trigger `trigger_log_insert` on `informacoes_empresa`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.informacoes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `informacoes_empresa`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.informacoes_empresa FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_informacoes_empresa_updated_at` on `informacoes_empresa`
```sql
CREATE TRIGGER trigger_update_informacoes_empresa_updated_at BEFORE UPDATE ON public.informacoes_empresa FOR EACH ROW EXECUTE FUNCTION update_informacoes_empresa_updated_at()
```

### trigger `trigger_log_insert` on `modelos_atividade`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `modelos_atividade`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.modelos_atividade FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `modelos_contrato_updated_at` on `modelos_contrato`
```sql
CREATE TRIGGER modelos_contrato_updated_at BEFORE UPDATE ON public.modelos_contrato FOR EACH ROW EXECUTE FUNCTION update_contratos_updated_at()
```

### trigger `trigger_log_insert` on `modelos_contrato`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.modelos_contrato FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `modelos_contrato`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.modelos_contrato FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_notificacoes_updated_at` on `notificacoes`
```sql
CREATE TRIGGER trigger_notificacoes_updated_at BEFORE UPDATE ON public.notificacoes FOR EACH ROW EXECUTE FUNCTION update_notificacoes_updated_at()
```

### trigger `trigger_log_insert` on `pacotes_produtos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pacotes_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `pacotes_produtos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.pacotes_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_pesquisas_opiniao_updated_at` on `pesquisas_opiniao`
```sql
CREATE TRIGGER update_pesquisas_opiniao_updated_at BEFORE UPDATE ON public.pesquisas_opiniao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_increment_pesquisa_votos` on `pesquisas_votos`
```sql
CREATE TRIGGER trigger_increment_pesquisa_votos AFTER INSERT ON public.pesquisas_votos FOR EACH ROW EXECUTE FUNCTION increment_pesquisa_votos()
```

### trigger `trigger_log_insert` on `plano_despesas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.plano_despesas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `plano_despesas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.plano_despesas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_plano_despesas_updated_at` on `plano_despesas`
```sql
CREATE TRIGGER update_plano_despesas_updated_at BEFORE UPDATE ON public.plano_despesas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `plano_receitas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.plano_receitas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `plano_receitas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.plano_receitas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_plano_receitas_updated_at` on `plano_receitas`
```sql
CREATE TRIGGER update_plano_receitas_updated_at BEFORE UPDATE ON public.plano_receitas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `pos_venda_atividades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pos_venda_atividades FOR EACH ROW EXECUTE FUNCTION log_table_insert()
```

### trigger `trigger_log_insert` on `pos_venda_card_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pos_venda_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao()
```

### trigger `trigger_log_insert` on `pos_venda_cards`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pos_venda_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `pos_venda_cards`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.pos_venda_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `pos_venda_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pos_venda_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `pos_venda_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.pos_venda_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `pos_venda_etiquetas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.pos_venda_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `pos_venda_etiquetas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.pos_venda_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `produtos_servicos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.produtos_servicos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `produtos_servicos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.produtos_servicos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `profiles`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `profiles`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_profiles_updated_at` on `profiles`
```sql
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `profissionais_saude`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.profissionais_saude FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `profissionais_saude`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.profissionais_saude FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `profissionais_seguranca`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.profissionais_seguranca FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `profissionais_seguranca`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.profissionais_seguranca FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_update_propostas_servicos_sst_updated_at` on `propostas_comerciais_servicos_sst`
```sql
CREATE TRIGGER trigger_update_propostas_servicos_sst_updated_at BEFORE UPDATE ON public.propostas_comerciais_servicos_sst FOR EACH ROW EXECUTE FUNCTION update_propostas_servicos_sst_updated_at()
```

### trigger `trigger_propostas_v365_updated_at` on `propostas_comerciais_vertical365`
```sql
CREATE TRIGGER trigger_propostas_v365_updated_at BEFORE UPDATE ON public.propostas_comerciais_vertical365 FOR EACH ROW EXECUTE FUNCTION update_propostas_v365_updated_at()
```

### trigger `trigger_propostas_vertical365_updated_at` on `propostas_comerciais_vertical365`
```sql
CREATE TRIGGER trigger_propostas_vertical365_updated_at BEFORE UPDATE ON public.propostas_comerciais_vertical365 FOR EACH ROW EXECUTE FUNCTION update_propostas_vertical365_updated_at()
```

### trigger `trigger_update_propostas_modelos_updated_at` on `propostas_modelos`
```sql
CREATE TRIGGER trigger_update_propostas_modelos_updated_at BEFORE UPDATE ON public.propostas_modelos FOR EACH ROW EXECUTE FUNCTION update_propostas_modelos_updated_at()
```

### trigger `update_propostas_modelos_updated_at` on `propostas_modelos`
```sql
CREATE TRIGGER update_propostas_modelos_updated_at BEFORE UPDATE ON public.propostas_modelos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `prospeccao_atividades`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_atividades FOR EACH ROW EXECUTE FUNCTION log_table_insert()
```

### trigger `trigger_log_insert` on `prospeccao_card_movimentacoes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_card_movimentacoes FOR EACH ROW EXECUTE FUNCTION log_card_movimentacao()
```

### trigger `trigger_log_insert` on `prospeccao_cards`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `prospeccao_cards`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.prospeccao_cards FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_prospeccao_cards_updated_at` on `prospeccao_cards`
```sql
CREATE TRIGGER trigger_prospeccao_cards_updated_at BEFORE UPDATE ON public.prospeccao_cards FOR EACH ROW EXECUTE FUNCTION update_prospeccao_updated_at()
```

### trigger `trigger_log_insert` on `prospeccao_colunas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `prospeccao_colunas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.prospeccao_colunas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_prospeccao_colunas_updated_at` on `prospeccao_colunas`
```sql
CREATE TRIGGER trigger_prospeccao_colunas_updated_at BEFORE UPDATE ON public.prospeccao_colunas FOR EACH ROW EXECUTE FUNCTION update_prospeccao_updated_at()
```

### trigger `trigger_log_insert` on `prospeccao_etiquetas`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `prospeccao_etiquetas`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.prospeccao_etiquetas FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `prospeccao_modelos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.prospeccao_modelos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `prospeccao_modelos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.prospeccao_modelos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `saude_ocupacional`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.saude_ocupacional FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `saude_ocupacional`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.saude_ocupacional FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_saude_ocupacional_updated_at` on `saude_ocupacional`
```sql
CREATE TRIGGER update_saude_ocupacional_updated_at BEFORE UPDATE ON public.saude_ocupacional FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `servicos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.servicos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `servicos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_servicos_updated_at` on `servicos`
```sql
CREATE TRIGGER trigger_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION update_servicos_updated_at()
```

### trigger `update_setor_permissoes_updated_at` on `setor_permissoes`
```sql
CREATE TRIGGER update_setor_permissoes_updated_at BEFORE UPDATE ON public.setor_permissoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `setores`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.setores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `setores`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_setores_updated_at` on `setores`
```sql
CREATE TRIGGER update_setores_updated_at BEFORE UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `terceiros`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.terceiros FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `terceiros`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.terceiros FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `update_terceiros_updated_at` on `terceiros`
```sql
CREATE TRIGGER update_terceiros_updated_at BEFORE UPDATE ON public.terceiros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_tickets_sla_config_updated_at` on `tickets_sla_config`
```sql
CREATE TRIGGER trigger_tickets_sla_config_updated_at BEFORE UPDATE ON public.tickets_sla_config FOR EACH ROW EXECUTE FUNCTION update_tickets_sla_config_updated_at()
```

### trigger `trigger_notify_ticket_created` on `tickets_suporte`
```sql
CREATE TRIGGER trigger_notify_ticket_created AFTER INSERT ON public.tickets_suporte FOR EACH ROW EXECUTE FUNCTION notify_ticket_created()
```

### trigger `trigger_notify_ticket_updated` on `tickets_suporte`
```sql
CREATE TRIGGER trigger_notify_ticket_updated AFTER UPDATE ON public.tickets_suporte FOR EACH ROW EXECUTE FUNCTION notify_ticket_updated()
```

### trigger `trigger_ticket_updated_at` on `tickets_suporte`
```sql
CREATE TRIGGER trigger_ticket_updated_at BEFORE UPDATE ON public.tickets_suporte FOR EACH ROW EXECUTE FUNCTION update_ticket_updated_at()
```

### trigger `update_tipos_empresa_updated_at` on `tipos_empresa`
```sql
CREATE TRIGGER update_tipos_empresa_updated_at BEFORE UPDATE ON public.tipos_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### trigger `trigger_log_insert` on `tipos_produtos`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.tipos_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `tipos_produtos`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.tipos_produtos FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_insert` on `unidades_clientes`
```sql
CREATE TRIGGER trigger_log_insert AFTER INSERT ON public.unidades_clientes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_log_update` on `unidades_clientes`
```sql
CREATE TRIGGER trigger_log_update AFTER UPDATE ON public.unidades_clientes FOR EACH ROW EXECUTE FUNCTION log_table_changes()
```

### trigger `trigger_white_label_config_updated_at` on `white_label_config`
```sql
CREATE TRIGGER trigger_white_label_config_updated_at BEFORE UPDATE ON public.white_label_config FOR EACH ROW EXECUTE FUNCTION update_white_label_config_updated_at()
```

### function `atualizar_google_token_ts`
```sql
CREATE OR REPLACE FUNCTION public.atualizar_google_token_ts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$function$

```

### function `can_delete_profile`
```sql
CREATE OR REPLACE FUNCTION public.can_delete_profile(target_profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_grupo TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT user_id, user_role, user_grupo_acesso, user_empresa_id
  INTO v_my_id, v_my_role, v_my_grupo, v_my_empresa
  FROM public.get_my_profile_data();
  
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_id = target_profile_id THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM public.profiles WHERE id = target_profile_id;
  
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$

```

### function `can_update_profile`
```sql
CREATE OR REPLACE FUNCTION public.can_update_profile(target_profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_grupo TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT user_id, user_role, user_grupo_acesso, user_empresa_id
  INTO v_my_id, v_my_role, v_my_grupo, v_my_empresa
  FROM public.get_my_profile_data();
  
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_id = target_profile_id THEN
    RETURN TRUE;
  END IF;
  
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM public.profiles WHERE id = target_profile_id;
  
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$

```

### function `can_view_profile`
```sql
CREATE OR REPLACE FUNCTION public.can_view_profile(target_profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT user_id, user_role, user_empresa_id
  INTO v_my_id, v_my_role, v_my_empresa
  FROM public.get_my_profile_data();
  
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_my_id = target_profile_id THEN
    RETURN TRUE;
  END IF;
  
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM public.profiles WHERE id = target_profile_id;
  
  IF v_my_empresa IS NOT NULL AND v_my_empresa = v_target_empresa THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$

```

### function `criar_configuracao_funil_padrao`
```sql
CREATE OR REPLACE FUNCTION public.criar_configuracao_funil_padrao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.funis_configuracoes (
    funil_id,
    titulo_pagina,
    descricao_pagina,
    card_mostrar_valor,
    dashboard_metricas
  ) VALUES (
    NEW.id,
    NEW.nome,
    NEW.descricao,
    CASE WHEN NEW.tipo = 'negocio' THEN true ELSE false END,
    CASE 
      WHEN NEW.tipo = 'negocio' THEN '["total_cards", "valor_total", "cards_por_etapa", "taxa_conversao"]'::jsonb
      ELSE '["total_cards", "cards_por_etapa", "cards_atrasados"]'::jsonb
    END
  );
  RETURN NEW;
END;
$function$

```

### function `criar_notificacao`
```sql
CREATE OR REPLACE FUNCTION public.criar_notificacao(p_empresa_id uuid, p_tipo text, p_categoria text, p_titulo text, p_mensagem text, p_usuario_id uuid DEFAULT NULL::uuid, p_usuario_nome text DEFAULT NULL::text, p_modulo text DEFAULT NULL::text, p_tela text DEFAULT NULL::text, p_referencia_tipo text DEFAULT NULL::text, p_referencia_id uuid DEFAULT NULL::uuid, p_referencia_dados jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notificacao_id UUID;
  v_empresa_sst_pai UUID;
  v_empresa_tipo tipo_empresa;
BEGIN
  -- Criar notificação para a empresa original
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
  
  -- Buscar tipo da empresa
  SELECT tipo INTO v_empresa_tipo FROM empresas WHERE id = p_empresa_id;
  
  -- Se a empresa é cliente_final ou empresa_parceira, também notificar a SST pai
  IF v_empresa_tipo IN ('cliente_final', 'empresa_parceira') THEN
    -- Buscar empresa SST pai
    v_empresa_sst_pai := get_empresa_sst_pai(p_empresa_id);
    
    -- Se encontrou SST pai e é diferente da empresa original, criar notificação para ela também
    IF v_empresa_sst_pai IS NOT NULL AND v_empresa_sst_pai != p_empresa_id THEN
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
        v_empresa_sst_pai,
        p_usuario_id,
        p_usuario_nome,
        p_tipo,
        p_categoria,
        '[Cliente] ' || p_titulo,
        p_mensagem,
        p_modulo,
        p_tela,
        p_referencia_tipo,
        p_referencia_id,
        p_referencia_dados || jsonb_build_object('empresa_origem_id', p_empresa_id)
      );
    END IF;
  END IF;
  
  RETURN v_notificacao_id;
END;
$function$

```

### function `delete_empresa_cascade`
```sql
CREATE OR REPLACE FUNCTION public.delete_empresa_cascade(p_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_nome TEXT;
  v_empresa_tipo TEXT;
  v_user_ids UUID[];
  v_deleted_users INT := 0;
  v_current_user_role TEXT;
  v_user_id UUID;
BEGIN
  SELECT role INTO v_current_user_role FROM public.profiles WHERE id = auth.uid();
  IF v_current_user_role IS NULL OR v_current_user_role != 'admin_vertical' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem excluir empresas');
  END IF;

  SELECT nome, tipo INTO v_empresa_nome, v_empresa_tipo FROM public.empresas WHERE id = p_empresa_id;
  IF v_empresa_nome IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada'); END IF;
  IF v_empresa_tipo = 'vertical_on' THEN RETURN jsonb_build_object('success', false, 'error', 'Não é possível excluir a empresa Vertical On'); END IF;

  SELECT ARRAY_AGG(id) INTO v_user_ids FROM public.profiles WHERE empresa_id = p_empresa_id;

  -- 1. Limpar referências empresa_lead_id
  BEGIN UPDATE public.prospeccao_cards SET empresa_lead_id = NULL WHERE empresa_lead_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE public.closer_cards SET empresa_lead_id = NULL WHERE empresa_lead_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 2. Prospecção
  BEGIN DELETE FROM public.prospeccao_card_movimentacoes WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_atividades WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_card_etiquetas WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 3. Closer
  BEGIN DELETE FROM public.closer_card_movimentacoes WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_atividades WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_card_etiquetas WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_modelos_atividade WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 4. Cross-selling
  BEGIN DELETE FROM public.cross_selling_atividades WHERE card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_card_etiquetas WHERE card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 5. Financeiro
  BEGIN DELETE FROM public.contas_pagar_movimentacoes WHERE conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_pagar_atividades WHERE conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_pagar WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_receber WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 6. Notificações
  BEGIN DELETE FROM public.notificacoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 7. Tickets
  BEGIN DELETE FROM public.tickets_suporte WHERE empresa_solicitante_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.tickets_suporte WHERE empresa_destino_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 8. Parceiras
  BEGIN DELETE FROM public.empresas_parceiras WHERE empresa_sst_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.empresas_parceiras WHERE parceira_empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 9. Treinamentos
  BEGIN DELETE FROM public.instrutor_treinamentos WHERE treinamento_id IN (SELECT id FROM public.catalogo_treinamentos WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.catalogo_treinamentos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.turmas_treinamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.solicitacoes_treinamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.instrutores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 10. Cadastros
  BEGIN DELETE FROM public.colaboradores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.clientes_sst WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.unidades_clientes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.setores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cargos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.grupos_homogeneos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.fornecedores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 11. Frota
  BEGIN DELETE FROM public.frota_checklists WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_custos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_documentos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_manutencoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_ocorrencias WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_utilizacoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_veiculos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 12. EPIs
  BEGIN DELETE FROM public.entregas_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.estoque_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cadastro_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 13. Aux financeiro
  BEGIN DELETE FROM public.centros_custo WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.formas_pagamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_bancarias WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.modelos_atividade WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 14. Módulos/contatos
  BEGIN DELETE FROM public.empresas_modulos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.empresa_contatos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Usuários
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_user_ids LOOP
      BEGIN DELETE FROM auth.users WHERE id = v_user_id; v_deleted_users := v_deleted_users + 1; EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
  END IF;

  DELETE FROM public.empresas WHERE id = p_empresa_id;
  RETURN jsonb_build_object('success', true, 'message', format('Empresa "%s" excluída com sucesso', v_empresa_nome), 'totalUsersDeleted', v_deleted_users);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', format('Erro ao excluir empresa: %s', SQLERRM));
END;
$function$

```

### function `executar_automacoes_agendadas`
```sql
CREATE OR REPLACE FUNCTION public.executar_automacoes_agendadas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  exec RECORD;
  card RECORD;
  ordem_destino int;
  etapa_gatilho_id uuid;
BEGIN
  -- Find all pending executions whose time has arrived
  FOR exec IN
    SELECT e.*, a.tipo, a.acao_config, a.ativo as automacao_ativa, a.etapa_id as automacao_etapa_id
    FROM automacoes_execucoes e
    JOIN automacoes a ON a.id = e.automacao_id
    WHERE e.executado = false
      AND e.executar_em <= now()
    ORDER BY e.executar_em
    LIMIT 100
  LOOP
    -- Skip if automation was deactivated
    IF NOT exec.automacao_ativa THEN
      UPDATE automacoes_execucoes
      SET executado = true, executado_em = now(), erro = 'Automação desativada'
      WHERE id = exec.id;
      CONTINUE;
    END IF;

    -- Get the card
    SELECT * INTO card FROM funil_cards WHERE id = exec.card_id AND ativo = true;
    
    IF card IS NULL THEN
      UPDATE automacoes_execucoes
      SET executado = true, executado_em = now(), erro = 'Card não encontrado ou inativo'
      WHERE id = exec.id;
      CONTINUE;
    END IF;

    -- NOVA VERIFICAÇÃO: Verificar se o card ainda está na etapa de gatilho
    -- Se o card foi movido para outra etapa, não executar a automação
    IF card.etapa_id != exec.automacao_etapa_id THEN
      UPDATE automacoes_execucoes
      SET executado = true, executado_em = now(), erro = 'Card não está mais na etapa de gatilho'
      WHERE id = exec.id;
      CONTINUE;
    END IF;

    BEGIN
      IF exec.tipo = 'duplicar_card_agendado' THEN
        -- Count existing cards in destination for ordering
        SELECT COALESCE(COUNT(*), 0) INTO ordem_destino
        FROM funil_cards
        WHERE funil_id = (exec.acao_config->>'funil_destino_id')::uuid
          AND etapa_id = (exec.acao_config->>'etapa_destino_id')::uuid
          AND ativo = true;

        -- Duplicate the card to destination
        INSERT INTO funil_cards (
          funil_id, etapa_id, titulo, descricao, valor,
          cliente_id, responsavel_id, data_previsao, prioridade,
          ordem, ativo
        ) VALUES (
          (exec.acao_config->>'funil_destino_id')::uuid,
          (exec.acao_config->>'etapa_destino_id')::uuid,
          card.titulo,
          card.descricao,
          card.valor,
          card.cliente_id,
          card.responsavel_id,
          card.data_previsao,
          card.prioridade,
          ordem_destino,
          true
        );

        UPDATE automacoes_execucoes
        SET executado = true, executado_em = now()
        WHERE id = exec.id;

      ELSIF exec.tipo = 'mover_card_agendado' THEN
        SELECT COALESCE(COUNT(*), 0) INTO ordem_destino
        FROM funil_cards
        WHERE funil_id = (exec.acao_config->>'funil_destino_id')::uuid
          AND etapa_id = (exec.acao_config->>'etapa_destino_id')::uuid
          AND ativo = true;

        -- Move the card
        UPDATE funil_cards
        SET funil_id = (exec.acao_config->>'funil_destino_id')::uuid,
            etapa_id = (exec.acao_config->>'etapa_destino_id')::uuid,
            ordem = ordem_destino,
            updated_at = now()
        WHERE id = card.id;

        UPDATE automacoes_execucoes
        SET executado = true, executado_em = now()
        WHERE id = exec.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      UPDATE automacoes_execucoes
      SET erro = SQLERRM
      WHERE id = exec.id;
    END;
  END LOOP;
END;
$function$

```

### function `executar_automacoes_negocio_parado`
```sql
CREATE OR REPLACE FUNCTION public.executar_automacoes_negocio_parado()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  automacao RECORD;
  card RECORD;
  prazo_date DATE;
  dias_adicionar INTEGER;
BEGIN
  -- Buscar todas as automações ativas do tipo negocio_parado_etapa
  FOR automacao IN 
    SELECT a.*, f.empresa_id as funil_empresa_id
    FROM public.automacoes a
    JOIN public.funis f ON f.id = a.funil_id
    WHERE a.gatilho = 'negocio_parado_etapa'
    AND a.ativo = true
    AND a.dias_parado IS NOT NULL
  LOOP
    -- Buscar cards que estão parados na etapa há mais de X dias
    FOR card IN
      SELECT fc.*
      FROM public.funil_cards fc
      WHERE fc.funil_id = automacao.funil_id
      AND fc.etapa_id = automacao.etapa_id
      AND fc.ativo = true
      -- Card está na etapa há mais de X dias (baseado em updated_at)
      AND fc.updated_at < NOW() - (automacao.dias_parado || ' days')::INTERVAL
      -- Não criar atividade duplicada - verificar se já existe atividade automática recente
      AND NOT EXISTS (
        SELECT 1 FROM public.funil_card_atividades fca
        WHERE fca.card_id = fc.id
        AND fca.descricao LIKE 'Atividade automática:%'
        AND fca.created_at > NOW() - INTERVAL '1 day'
      )
    LOOP
      -- Executar a ação configurada
      IF automacao.tipo = 'agendar_atividade' THEN
        -- Calcular prazo baseado na configuração
        dias_adicionar := CASE (automacao.acao_config->>'quando')
          WHEN '1_dia' THEN 1
          WHEN '2_dias' THEN 2
          WHEN '3_dias' THEN 3
          WHEN '1_semana' THEN 7
          ELSE 0
        END;
        
        prazo_date := CURRENT_DATE + dias_adicionar;
        
        -- Criar atividade
        INSERT INTO public.funil_card_atividades (
          card_id,
          tipo,
          descricao,
          prazo,
          status,
          usuario_id,
          responsavel_id
        ) VALUES (
          card.id,
          COALESCE(automacao.acao_config->>'tipo_atividade', 'tarefa'),
          COALESCE(automacao.acao_config->>'descricao', 'Atividade automática: Card parado há ' || automacao.dias_parado || ' dias'),
          prazo_date,
          'a_realizar',
          card.responsavel_id,
          card.responsavel_id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$function$

```

### function `generate_contrato_numero`
```sql
CREATE OR REPLACE FUNCTION public.generate_contrato_numero(p_empresa_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ano INTEGER;
  v_numero INTEGER;
BEGIN
  v_ano := EXTRACT(YEAR FROM NOW());
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(SPLIT_PART(numero, '-', 3), '-', 1) AS INTEGER)
  ), 0) + 1
  INTO v_numero
  FROM public.contratos
  WHERE empresa_id = p_empresa_id
    AND numero LIKE 'TQ-' || v_ano || '-%';
  
  RETURN 'TQ-' || v_ano || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$function$

```

### function `generate_utilizacao_codigo`
```sql
CREATE OR REPLACE FUNCTION public.generate_utilizacao_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  next_num INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN codigo ~ '^USO[0-9]{6}/[0-9]{4}$' 
      THEN CAST(SUBSTRING(codigo FROM 4 FOR 6) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1
  INTO next_num
  FROM public.frota_utilizacoes;
  
  NEW.codigo := 'USO' || LPAD(next_num::TEXT, 6, '0') || '/' || year_suffix;
  
  RETURN NEW;
END;
$function$

```

### function `gerar_contas_recorrentes`
```sql
CREATE OR REPLACE FUNCTION public.gerar_contas_recorrentes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_mes_atual INTEGER;
  v_ano_atual INTEGER;
  v_mes_ano_atual TEXT;
  v_conta RECORD;
  v_coluna_recorrente_id UUID;
  v_conta_existente UUID;
  v_novo_numero TEXT;
  v_nova_data_vencimento DATE;
  v_dia_vencimento INTEGER;
  v_contas_criadas INTEGER := 0;
  v_contas_ignoradas INTEGER := 0;
  v_total_recorrentes INTEGER := 0;
BEGIN
  -- Data atual
  v_mes_atual := EXTRACT(MONTH FROM CURRENT_DATE);
  v_ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
  v_mes_ano_atual := v_ano_atual || '-' || LPAD(v_mes_atual::TEXT, 2, '0');

  RAISE NOTICE 'Gerando contas recorrentes para %', v_mes_ano_atual;

  -- Loop por todas as contas recorrentes
  FOR v_conta IN 
    SELECT * FROM public.contas_pagar 
    WHERE frequencia_cobranca = 'recorrente'
  LOOP
    v_total_recorrentes := v_total_recorrentes + 1;

    -- Buscar coluna "Pagamentos Recorrentes" da empresa
    SELECT id INTO v_coluna_recorrente_id
    FROM public.contas_pagar_colunas
    WHERE empresa_id = v_conta.empresa_id
      AND nome = 'Pagamentos Recorrentes'
    LIMIT 1;

    IF v_coluna_recorrente_id IS NULL THEN
      RAISE NOTICE 'Empresa % não tem coluna de Pagamentos Recorrentes', v_conta.empresa_id;
      v_contas_ignoradas := v_contas_ignoradas + 1;
      CONTINUE;
    END IF;

    -- Verificar se já existe conta para este mês
    SELECT id INTO v_conta_existente
    FROM public.contas_pagar
    WHERE empresa_id = v_conta.empresa_id
      AND fornecedor_id = v_conta.fornecedor_id
      AND descricao = v_conta.descricao
      AND categoria = v_conta.categoria
      AND data_vencimento >= (v_mes_ano_atual || '-01')::DATE
      AND data_vencimento <= (v_mes_ano_atual || '-31')::DATE
      AND coluna_id = v_coluna_recorrente_id
    LIMIT 1;

    IF v_conta_existente IS NOT NULL THEN
      RAISE NOTICE 'Conta recorrente já existe para %: %', v_mes_ano_atual, v_conta.numero;
      v_contas_ignoradas := v_contas_ignoradas + 1;
      CONTINUE;
    END IF;

    -- Gerar novo número
    v_novo_numero := 'REC-' || v_mes_ano_atual || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM 8 FOR 6);

    -- Calcular data de vencimento
    v_dia_vencimento := EXTRACT(DAY FROM v_conta.data_vencimento);
    IF v_dia_vencimento > 28 THEN
      v_dia_vencimento := 28; -- Limitar para evitar problemas com fevereiro
    END IF;
    v_nova_data_vencimento := MAKE_DATE(v_ano_atual, v_mes_atual, v_dia_vencimento);

    -- Criar nova conta
    INSERT INTO public.contas_pagar (
      empresa_id,
      numero,
      fornecedor_id,
      fornecedor_nome,
      fornecedor_cnpj,
      descricao,
      valor,
      valor_pago,
      data_competencia,
      data_vencimento,
      forma_pagamento_id,
      forma_pagamento,
      centro_custo_id,
      categoria,
      conta_financeira_id,
      conta_financeira,
      frequencia_cobranca,
      tipo_valor_recorrente,
      observacoes,
      coluna_id,
      status_pagamento,
      ordem
    ) VALUES (
      v_conta.empresa_id,
      v_novo_numero,
      v_conta.fornecedor_id,
      v_conta.fornecedor_nome,
      v_conta.fornecedor_cnpj,
      v_conta.descricao,
      CASE WHEN v_conta.tipo_valor_recorrente = 'fixo' THEN v_conta.valor ELSE 0 END,
      0,
      (v_mes_ano_atual || '-01')::DATE,
      v_nova_data_vencimento,
      v_conta.forma_pagamento_id,
      v_conta.forma_pagamento,
      v_conta.centro_custo_id,
      v_conta.categoria,
      v_conta.conta_financeira_id,
      v_conta.conta_financeira,
      'unico',
      NULL,
      'Gerado automaticamente a partir da conta recorrente ' || v_conta.numero || 
        CASE WHEN v_conta.tipo_valor_recorrente = 'variavel' THEN '. (Valor variável - ajustar conforme utilização)' ELSE '' END,
      v_coluna_recorrente_id,
      'previsto',
      0
    );

    RAISE NOTICE 'Conta recorrente criada: % baseada em %', v_novo_numero, v_conta.numero;
    v_contas_criadas := v_contas_criadas + 1;

  END LOOP;

  RETURN jsonb_build_object(
    'message', 'Processamento concluído para ' || v_mes_ano_atual,
    'total_recorrentes', v_total_recorrentes,
    'contas_criadas', v_contas_criadas,
    'contas_ignoradas', v_contas_ignoradas
  );
END;
$function$

```

### function `gerar_numero_movimentacao`
```sql
CREATE OR REPLACE FUNCTION public.gerar_numero_movimentacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  ano_atual INTEGER;
  proximo_numero INTEGER;
BEGIN
  ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_movimentacao FROM 10 FOR 5) AS INTEGER)
  ), 0) + 1
  INTO proximo_numero
  FROM public.equipamentos_movimentacoes
  WHERE numero_movimentacao LIKE 'MOV-' || ano_atual || '-%';
  
  NEW.numero_movimentacao := 'MOV-' || ano_atual || '-' || LPAD(proximo_numero::TEXT, 5, '0');
  
  RETURN NEW;
END;
$function$

```

### function `get_aulas_instrutor`
```sql
CREATE OR REPLACE FUNCTION public.get_aulas_instrutor(p_user_id uuid)
 RETURNS TABLE(turma_id uuid, aula_id uuid, data date, hora_inicio time without time zone, hora_fim time without time zone, horas numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_instrutor_id UUID;
BEGIN
  SELECT i.id INTO v_instrutor_id
  FROM public.instrutores i
  WHERE i.user_id = p_user_id
  LIMIT 1;
  
  IF v_instrutor_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    a.turma_id,
    a.id AS aula_id,
    a.data,
    a.hora_inicio,
    a.hora_fim,
    a.horas
  FROM public.turmas_treinamento_aulas a
  JOIN public.turmas_treinamento t ON t.id = a.turma_id
  WHERE t.instrutor_id = v_instrutor_id
  ORDER BY a.turma_id, a.data;
END;
$function$

```

### function `get_certificados_expirando`
```sql
CREATE OR REPLACE FUNCTION public.get_certificados_expirando(dias_antecedencia integer DEFAULT 30)
 RETURNS TABLE(empresa_id uuid, empresa_nome text, certificado_cn text, validade timestamp with time zone, dias_restantes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS empresa_id,
    e.nome AS empresa_nome,
    e.certificado_a1_cn AS certificado_cn,
    e.certificado_a1_validade AS validade,
    EXTRACT(DAY FROM (e.certificado_a1_validade - NOW()))::INTEGER AS dias_restantes
  FROM empresas e
  WHERE e.certificado_a1_validade IS NOT NULL
    AND e.certificado_a1_validade <= NOW() + (dias_antecedencia || ' days')::INTERVAL
    AND e.certificado_a1_validade > NOW()
  ORDER BY e.certificado_a1_validade ASC;
END;
$function$

```

### function `get_clientes_empresa_ids`
```sql
CREATE OR REPLACE FUNCTION public.get_clientes_empresa_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT cliente_empresa_id FROM public.clientes_sst 
  WHERE empresa_sst_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid());
$function$

```

### function `get_current_user_empresa_id`
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_empresa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT empresa_id FROM profiles WHERE id = auth.uid();
$function$

```

### function `get_current_user_role`
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE id = auth.uid();
$function$

```

### function `get_empresa_sst_do_cliente`
```sql
CREATE OR REPLACE FUNCTION public.get_empresa_sst_do_cliente(user_empresa_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT empresa_sst_id
  FROM clientes_sst
  WHERE cliente_empresa_id = user_empresa_id
  LIMIT 1;
$function$

```

### function `get_empresa_sst_pai`
```sql
CREATE OR REPLACE FUNCTION public.get_empresa_sst_pai(p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo tipo_empresa;
  v_empresa_sst_id UUID;
  v_role TEXT;
BEGIN
  -- Buscar tipo da empresa
  SELECT tipo INTO v_tipo FROM empresas WHERE id = p_empresa_id;
  
  -- Se não encontrou a empresa, retornar NULL
  IF v_tipo IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Se é vertical_on (Toriq/Admin), não tem SST pai - usa tema padrão
  IF v_tipo = 'vertical_on' THEN
    RETURN NULL;
  END IF;
  
  -- Se é empresa_sst, ela mesma é a SST (retorna ela própria)
  IF v_tipo = 'sst' THEN
    RETURN p_empresa_id;
  END IF;
  
  -- Se é cliente_final, buscar via tabela clientes_sst
  IF v_tipo = 'cliente_final' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM clientes_sst
    WHERE cliente_empresa_id = p_empresa_id
    LIMIT 1;
    
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Se é empresa_parceira, buscar via tabela empresas_parceiras
  IF v_tipo = 'empresa_parceira' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM empresas_parceiras
    WHERE parceira_empresa_id = p_empresa_id
    LIMIT 1;
    
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Fallback: tipo desconhecido, sem SST pai
  RETURN NULL;
END;
$function$

```

### function `get_empresa_sst_pai_by_user`
```sql
CREATE OR REPLACE FUNCTION public.get_empresa_sst_pai_by_user(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id UUID;
  v_role TEXT;
  v_instrutor_empresa_id UUID;
BEGIN
  -- Buscar perfil do usuário
  SELECT empresa_id, role INTO v_empresa_id, v_role
  FROM profiles
  WHERE id = p_user_id;
  
  -- Se não encontrou perfil, retornar NULL
  IF v_role IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Admin vertical nunca tem white label
  IF v_role = 'admin_vertical' THEN
    RETURN NULL;
  END IF;
  
  -- Se é instrutor, buscar empresa_id da tabela instrutores
  -- Instrutores estão vinculados diretamente à empresa SST
  IF v_role = 'instrutor' THEN
    SELECT empresa_id INTO v_instrutor_empresa_id
    FROM instrutores
    WHERE user_id = p_user_id
    LIMIT 1;
    
    -- Verificar se a empresa do instrutor é uma SST
    IF v_instrutor_empresa_id IS NOT NULL THEN
      -- A empresa_id do instrutor já é a empresa SST
      RETURN v_instrutor_empresa_id;
    END IF;
    
    RETURN NULL;
  END IF;
  
  -- Para outros roles, usar a função existente com empresa_id do perfil
  IF v_empresa_id IS NOT NULL THEN
    RETURN get_empresa_sst_pai(v_empresa_id);
  END IF;
  
  RETURN NULL;
END;
$function$

```

### function `get_instrutor_id_for_user`
```sql
CREATE OR REPLACE FUNCTION public.get_instrutor_id_for_user(p_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id FROM public.instrutores WHERE user_id = p_user_id LIMIT 1;
$function$

```

### function `get_my_profile_data`
```sql
CREATE OR REPLACE FUNCTION public.get_my_profile_data()
 RETURNS TABLE(user_id uuid, user_role text, user_grupo_acesso text, user_empresa_id uuid, user_setor_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.role::TEXT,
    p.grupo_acesso,
    p.empresa_id,
    p.setor_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$function$

```

### function `get_solicitacoes_treinamento_clientes`
```sql
CREATE OR REPLACE FUNCTION public.get_solicitacoes_treinamento_clientes(p_empresa_sst_id uuid)
 RETURNS TABLE(id uuid, numero bigint, treinamento_id uuid, colaborador_id uuid, tipo text, data_treinamento date, status text, observacoes text, created_at timestamp with time zone, empresa_id uuid, treinamento_nome text, treinamento_norma text, empresa_nome text, cliente_sst_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    st.id,
    st.numero,
    st.treinamento_id,
    st.colaborador_id,
    st.tipo,
    st.data_treinamento,
    st.status,
    st.observacoes,
    st.created_at,
    st.empresa_id,
    ct.nome as treinamento_nome,
    ct.norma as treinamento_norma,
    e.nome as empresa_nome,
    cs.id as cliente_sst_id
  FROM solicitacoes_treinamento st
  JOIN clientes_sst cs ON cs.cliente_empresa_id = st.empresa_id AND cs.empresa_sst_id = p_empresa_sst_id
  LEFT JOIN catalogo_treinamentos ct ON ct.id = st.treinamento_id
  LEFT JOIN empresas e ON e.id = st.empresa_id
  WHERE st.status IN ('enviado', 'aceito', 'recusado')
  ORDER BY st.created_at DESC;
$function$

```

### function `get_subordinados`
```sql
CREATE OR REPLACE FUNCTION public.get_subordinados(p_user_id uuid)
 RETURNS TABLE(subordinado_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
WITH RECURSIVE subordinados AS (
  SELECT id FROM public.profiles WHERE gestor_id = p_user_id
  UNION ALL
  SELECT p.id FROM public.profiles p
  INNER JOIN subordinados s ON p.gestor_id = s.id
)
SELECT id as subordinado_id FROM subordinados;
$function$

```

### function `get_turmas_instrutor`
```sql
CREATE OR REPLACE FUNCTION public.get_turmas_instrutor(p_user_id uuid)
 RETURNS TABLE(id uuid, numero_turma integer, codigo_turma character varying, cliente_id uuid, treinamento_id uuid, tipo_treinamento text, quantidade_participantes integer, status text, validado boolean, cliente_nome text, treinamento_nome text, treinamento_norma text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_instrutor_id UUID;
BEGIN
  SELECT i.id INTO v_instrutor_id
  FROM public.instrutores i
  WHERE i.user_id = p_user_id
  LIMIT 1;
  
  IF v_instrutor_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.numero_turma,
    t.codigo_turma,
    t.cliente_id,
    t.treinamento_id,
    t.tipo_treinamento,
    t.quantidade_participantes,
    t.status,
    t.validado,
    c.nome::TEXT AS cliente_nome,
    ct.nome::TEXT AS treinamento_nome,
    ct.norma::TEXT AS treinamento_norma
  FROM public.turmas_treinamento t
  LEFT JOIN public.clientes_sst c ON c.id = t.cliente_id
  LEFT JOIN public.catalogo_treinamentos ct ON ct.id = t.treinamento_id
  WHERE t.instrutor_id = v_instrutor_id;
END;
$function$

```

### function `get_user_empresa_id`
```sql
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT empresa_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$function$

```

### function `get_user_empresa_id_safe`
```sql
CREATE OR REPLACE FUNCTION public.get_user_empresa_id_safe(p_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT empresa_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$function$

```

### function `get_user_role`
```sql
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT role::text
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$function$

```

### function `get_user_role_safe`
```sql
CREATE OR REPLACE FUNCTION public.get_user_role_safe(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT role::text FROM public.profiles WHERE id = p_user_id LIMIT 1;
$function$

```

### function `get_usuarios_visiveis`
```sql
CREATE OR REPLACE FUNCTION public.get_usuarios_visiveis(p_user_id uuid)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_grupo TEXT;
  v_empresa_id UUID;
BEGIN
  SELECT grupo_acesso, empresa_id INTO v_grupo, v_empresa_id
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_grupo = 'administrador' THEN
    RETURN QUERY SELECT p.id FROM public.profiles p WHERE p.empresa_id = v_empresa_id;
  ELSIF v_grupo = 'gestor' THEN
    RETURN QUERY 
      SELECT p_user_id
      UNION
      SELECT subordinado_id FROM public.get_subordinados(p_user_id);
  ELSE
    RETURN QUERY SELECT p_user_id;
  END IF;
END;
$function$

```

### function `handle_new_user`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, empresa_id, setor_id, senha_alterada)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    'cliente_final'::app_role,
    NULL,
    NULL,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = COALESCE(EXCLUDED.nome, profiles.nome);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$

```

### function `has_role`
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$function$

```

### function `increment_pesquisa_votos`
```sql
CREATE OR REPLACE FUNCTION public.increment_pesquisa_votos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Incrementar votos na opção (se houver)
  IF NEW.opcao_id IS NOT NULL THEN
    UPDATE pesquisas_opcoes 
    SET votos = votos + 1 
    WHERE id = NEW.opcao_id;
  END IF;
  
  -- Incrementar total_votos na pesquisa
  UPDATE pesquisas_opiniao 
  SET total_votos = total_votos + 1,
      updated_at = NOW()
  WHERE id = NEW.pesquisa_id;
  
  RETURN NEW;
END;
$function$

```

### function `invalidar_sessoes_anteriores`
```sql
CREATE OR REPLACE FUNCTION public.invalidar_sessoes_anteriores(p_user_id uuid, p_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Marcar todas as sessões anteriores como inativas
  UPDATE sessoes_ativas
  SET ativo = FALSE
  WHERE user_id = p_user_id
    AND session_token != p_session_token
    AND ativo = TRUE;
END;
$function$

```

### function `invalidar_todas_sessoes_por_email`
```sql
CREATE OR REPLACE FUNCTION public.invalidar_todas_sessoes_por_email(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    UPDATE sessoes_ativas
    SET ativo = FALSE
    WHERE user_id = v_user_id;
  END IF;
END;
$function$

```

### function `is_admin_or_empresa_admin`
```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_empresa_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role TEXT;
  v_grupo TEXT;
BEGIN
  SELECT role, grupo_acesso INTO v_role, v_grupo
  FROM public.profiles WHERE id = p_user_id;
  
  RETURN v_role = 'admin_vertical' OR v_grupo = 'administrador';
END;
$function$

```

### function `is_admin_vertical`
```sql
CREATE OR REPLACE FUNCTION public.is_admin_vertical()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = 'admin_vertical'
  );
$function$

```

### function `is_cliente_of_turma`
```sql
CREATE OR REPLACE FUNCTION public.is_cliente_of_turma(turma_cliente_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clientes_sst cs
    JOIN public.profiles p ON p.empresa_id = cs.cliente_empresa_id
    WHERE cs.id = turma_cliente_id
      AND p.id = auth.uid()
  );
$function$

```

### function `is_empresa_sst`
```sql
CREATE OR REPLACE FUNCTION public.is_empresa_sst()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'empresa_sst'
  );
$function$

```

### function `is_instrutor_of_turma`
```sql
CREATE OR REPLACE FUNCTION public.is_instrutor_of_turma(p_turma_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE t.id = p_turma_id AND i.user_id = auth.uid()
  );
$function$

```

### function `limpar_logs_auditoria_expirados`
```sql
CREATE OR REPLACE FUNCTION public.limpar_logs_auditoria_expirados()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa RECORD;
  v_total_deletados INTEGER := 0;
  v_deletados_empresa INTEGER;
  v_resultado jsonb := '[]'::jsonb;
BEGIN
  -- Para cada empresa com configuração de auditoria
  FOR v_empresa IN 
    SELECT 
      ac.empresa_id,
      ac.dias_expiracao,
      e.nome as empresa_nome
    FROM auditoria_config ac
    JOIN empresas e ON e.id = ac.empresa_id
  LOOP
    -- Deletar logs mais antigos que dias_expiracao
    DELETE FROM turmas_auditoria
    WHERE empresa_id = v_empresa.empresa_id
    AND created_at < NOW() - (v_empresa.dias_expiracao || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deletados_empresa = ROW_COUNT;
    v_total_deletados := v_total_deletados + v_deletados_empresa;
    
    -- Adicionar ao resultado se deletou algo
    IF v_deletados_empresa > 0 THEN
      v_resultado := v_resultado || jsonb_build_object(
        'empresa_id', v_empresa.empresa_id,
        'empresa_nome', v_empresa.empresa_nome,
        'dias_expiracao', v_empresa.dias_expiracao,
        'logs_deletados', v_deletados_empresa
      );
    END IF;
  END LOOP;
  
  -- Para empresas SEM configuração, usar padrão de 60 dias
  DELETE FROM turmas_auditoria
  WHERE empresa_id NOT IN (SELECT empresa_id FROM auditoria_config)
  AND created_at < NOW() - INTERVAL '60 days';
  
  GET DIAGNOSTICS v_deletados_empresa = ROW_COUNT;
  v_total_deletados := v_total_deletados + v_deletados_empresa;
  
  IF v_deletados_empresa > 0 THEN
    v_resultado := v_resultado || jsonb_build_object(
      'empresa_id', 'sem_config',
      'empresa_nome', 'Empresas sem configuração (padrão 60 dias)',
      'dias_expiracao', 60,
      'logs_deletados', v_deletados_empresa
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_deletados', v_total_deletados,
    'detalhes', v_resultado,
    'executado_em', NOW()
  );
END;
$function$

```

### function `log_card_movimentacao`
```sql
CREATE OR REPLACE FUNCTION public.log_card_movimentacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa_id UUID;
  v_usuario_nome TEXT;
  v_new_jsonb JSONB;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  IF TG_TABLE_NAME = 'funil_card_movimentacoes' THEN
    SELECT f.empresa_id INTO v_empresa_id
    FROM public.funil_cards fc JOIN public.funis f ON fc.funil_id = f.id
    WHERE fc.id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'prospeccao_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM public.prospeccao_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'closer_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM public.closer_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'pos_venda_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM public.pos_venda_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  ELSIF TG_TABLE_NAME = 'cross_selling_card_movimentacoes' THEN
    SELECT empresa_id INTO v_empresa_id FROM public.cross_selling_cards WHERE id = (v_new_jsonb->>'card_id')::UUID;
  END IF;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  INSERT INTO public.notificacoes (
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
$function$

```

### function `log_funil_atividade_changes`
```sql
CREATE OR REPLACE FUNCTION public.log_funil_atividade_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  
  SELECT f.empresa_id INTO v_empresa_id
  FROM public.funil_cards fc
  JOIN public.funis f ON fc.funil_id = f.id
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
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
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
  
  INSERT INTO public.notificacoes (
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
$function$

```

### function `log_funil_card_changes`
```sql
CREATE OR REPLACE FUNCTION public.log_funil_card_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  
  SELECT f.empresa_id, f.nome INTO v_empresa_id, v_funil_nome
  FROM public.funis f
  WHERE f.id = (v_new_jsonb->>'funil_id')::UUID;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criado';
    v_tipo := 'success';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'atualizado';
    v_tipo := 'info';
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  v_titulo := v_new_jsonb->>'titulo';
  
  IF v_titulo IS NOT NULL AND v_titulo != '' THEN
    v_mensagem := 'Card "' || v_titulo || '" foi ' || v_acao || ' no funil "' || COALESCE(v_funil_nome, 'Desconhecido') || '"';
  ELSE
    v_mensagem := 'Card foi ' || v_acao || ' no funil "' || COALESCE(v_funil_nome, 'Desconhecido') || '"';
  END IF;
  
  IF v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN
    v_mensagem := v_mensagem || ' por ' || v_usuario_nome;
  END IF;
  
  INSERT INTO public.notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), v_tipo,
    'comercial', 'Card ' || v_acao, v_mensagem, 'toriq_corp', 'toriq-corp-administrativo',
    'funil_cards', (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$

```

### function `log_funil_etapa_changes`
```sql
CREATE OR REPLACE FUNCTION public.log_funil_etapa_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  FROM public.funis f
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
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
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
  
  INSERT INTO public.notificacoes (
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
$function$

```

### function `log_table_changes`
```sql
CREATE OR REPLACE FUNCTION public.log_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_new_jsonb := to_jsonb(NEW);
  
  IF v_new_jsonb ? 'empresa_id' AND v_new_jsonb->>'empresa_id' IS NOT NULL THEN
    v_empresa_id := (v_new_jsonb->>'empresa_id')::UUID;
  ELSIF v_new_jsonb ? 'empresa_sst_id' AND v_new_jsonb->>'empresa_sst_id' IS NOT NULL THEN
    v_empresa_id := (v_new_jsonb->>'empresa_sst_id')::UUID;
  END IF;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_config FROM public.notificacao_config WHERE tabela = TG_TABLE_NAME AND ativo = TRUE;
  
  IF v_config IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criado';
    v_tipo := 'success';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'atualizado';
    v_tipo := 'info';
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  IF v_config.campo_nome IS NOT NULL AND v_new_jsonb ? v_config.campo_nome THEN
    v_nome_registro := v_new_jsonb->>v_config.campo_nome;
  END IF;
  
  IF v_nome_registro IS NOT NULL AND v_nome_registro != '' THEN
    v_mensagem := v_config.titulo || ' "' || v_nome_registro || '" foi ' || v_acao;
  ELSE
    v_mensagem := v_config.titulo || ' foi ' || v_acao;
  END IF;
  
  IF v_usuario_nome IS NOT NULL AND v_usuario_nome != 'Sistema' THEN
    v_mensagem := v_mensagem || ' por ' || v_usuario_nome;
  END IF;
  
  INSERT INTO public.notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), v_tipo,
    v_config.categoria, v_config.titulo || ' ' || v_acao, v_mensagem,
    v_config.modulo, v_config.tela, TG_TABLE_NAME, (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$

```

### function `log_table_insert`
```sql
CREATE OR REPLACE FUNCTION public.log_table_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa_id UUID;
  v_config RECORD;
  v_usuario_nome TEXT;
  v_nome_registro TEXT;
  v_mensagem TEXT;
  v_new_jsonb JSONB;
BEGIN
  v_new_jsonb := to_jsonb(NEW);
  
  IF v_new_jsonb ? 'empresa_id' THEN
    v_empresa_id := (v_new_jsonb->>'empresa_id')::UUID;
  ELSIF v_new_jsonb ? 'empresa_sst_id' THEN
    v_empresa_id := (v_new_jsonb->>'empresa_sst_id')::UUID;
  END IF;
  
  IF v_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_config FROM public.notificacao_config WHERE tabela = TG_TABLE_NAME AND ativo = TRUE;
  
  IF v_config IS NULL THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_nome := 'Sistema';
  END;
  
  IF v_config.campo_nome IS NOT NULL AND v_new_jsonb ? v_config.campo_nome THEN
    v_nome_registro := v_new_jsonb->>v_config.campo_nome;
  END IF;
  
  IF v_nome_registro IS NOT NULL AND v_nome_registro != '' THEN
    v_mensagem := v_config.titulo || ': "' || v_nome_registro || '"';
  ELSE
    v_mensagem := v_config.titulo;
  END IF;
  
  INSERT INTO public.notificacoes (
    empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem,
    modulo, tela, referencia_tipo, referencia_id
  ) VALUES (
    v_empresa_id, auth.uid(), COALESCE(v_usuario_nome, 'Sistema'), 'info',
    v_config.categoria, v_config.titulo, v_mensagem,
    v_config.modulo, v_config.tela, TG_TABLE_NAME, (v_new_jsonb->>'id')::UUID
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar notificação para %: %', TG_TABLE_NAME, SQLERRM;
    RETURN NEW;
END;
$function$

```

### function `notify_cliente_sst_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_cliente_sst_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_closer_card_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_closer_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_colaborador_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_colaborador_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_conta_pagar_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_conta_pagar_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_conta_receber_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_conta_receber_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_cross_selling_card_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_cross_selling_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_entrega_epi_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_entrega_epi_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
  v_colaborador_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  SELECT nome INTO v_colaborador_nome FROM public.colaboradores WHERE id = NEW.colaborador_id;
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_estoque_epi_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_estoque_epi_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
  v_epi_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  SELECT nome_modelo INTO v_epi_nome FROM public.cadastro_epis WHERE id = NEW.epi_id;
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_pos_venda_card_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_pos_venda_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_prospeccao_card_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_prospeccao_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_solicitacao_treinamento_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_solicitacao_treinamento_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `notify_ticket_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_destino_empresa_id UUID;
BEGIN
  -- Se empresa_destino_id é NULL (ticket vai para admin global)
  -- Usar a empresa_solicitante_id para a notificação
  IF NEW.empresa_destino_id IS NULL THEN
    -- Para tickets de empresa_sst -> admin global, usar empresa_solicitante
    v_destino_empresa_id := NEW.empresa_solicitante_id;
  ELSE
    v_destino_empresa_id := NEW.empresa_destino_id;
  END IF;
  
  -- Se ainda for NULL, não criar notificação
  IF v_destino_empresa_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO notificacoes (empresa_id, usuario_id, usuario_nome, tipo, categoria, titulo, mensagem, modulo, tela, referencia_tipo, referencia_id)
  VALUES (
    v_destino_empresa_id, 
    NEW.solicitante_id, 
    NEW.solicitante_nome,
    CASE NEW.prioridade WHEN 'critica' THEN 'error' WHEN 'alta' THEN 'warning' ELSE 'info' END,
    'suporte', 
    'Novo ticket de suporte', 
    'Ticket #' || LEFT(NEW.id::text, 8) || ': ' || NEW.titulo,
    'perfil_empresa', 
    'suporte', 
    'tickets_suporte', 
    NEW.id
  );
  RETURN NEW;
END;
$function$

```

### function `notify_ticket_updated`
```sql
CREATE OR REPLACE FUNCTION public.notify_ticket_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO notificacoes (
      empresa_id,
      usuario_id,
      tipo,
      categoria,
      titulo,
      mensagem,
      modulo,
      tela,
      referencia_tipo,
      referencia_id
    ) VALUES (
      NEW.empresa_solicitante_id,
      NEW.solicitante_id,
      'info',
      'suporte',
      'Ticket atualizado',
      'Ticket #' || LEFT(NEW.id::text, 8) || ' mudou para: ' || NEW.status,
      'perfil_empresa',
      'suporte',
      'tickets_suporte',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$

```

### function `notify_turma_created`
```sql
CREATE OR REPLACE FUNCTION public.notify_turma_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_usuario_nome TEXT;
BEGIN
  SELECT nome INTO v_usuario_nome FROM public.profiles WHERE id = auth.uid();
  
  PERFORM public.criar_notificacao(
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
$function$

```

### function `obter_proximo_codigo_turma`
```sql
CREATE OR REPLACE FUNCTION public.obter_proximo_codigo_turma(p_cliente_id uuid, p_sigla text, p_nr text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sequencia INTEGER;
  v_codigo TEXT;
BEGIN
  -- Inserir ou atualizar a sequência atomicamente
  INSERT INTO turma_codigo_sequencia (cliente_id, ultima_sequencia)
  VALUES (p_cliente_id, 1)
  ON CONFLICT (cliente_id) 
  DO UPDATE SET 
    ultima_sequencia = turma_codigo_sequencia.ultima_sequencia + 1,
    updated_at = now()
  RETURNING ultima_sequencia INTO v_sequencia;
  
  -- Formatar código: SIGLA + 3 dígitos + -NR + número
  v_codigo := p_sigla || LPAD(v_sequencia::TEXT, 3, '0') || '-NR' || p_nr;
  
  RETURN v_codigo;
END;
$function$

```

### function `pode_acessar_registro`
```sql
CREATE OR REPLACE FUNCTION public.pode_acessar_registro(p_criador_id uuid, p_responsavel_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_grupo TEXT;
  v_user_empresa UUID;
  v_criador_empresa UUID;
BEGIN
  SELECT role, grupo_acesso, empresa_id INTO v_user_role, v_user_grupo, v_user_empresa
  FROM public.profiles WHERE id = v_user_id;
  
  IF v_user_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_criador_empresa
  FROM public.profiles WHERE id = p_criador_id;
  
  IF v_user_empresa IS DISTINCT FROM v_criador_empresa THEN
    RETURN FALSE;
  END IF;
  
  IF v_user_id = p_criador_id OR v_user_id = p_responsavel_id THEN
    RETURN TRUE;
  END IF;
  
  IF v_user_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  IF v_user_grupo = 'gestor' THEN
    IF EXISTS (SELECT 1 FROM public.get_subordinados(v_user_id) WHERE subordinado_id = p_criador_id) THEN
      RETURN TRUE;
    END IF;
    IF p_responsavel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.get_subordinados(v_user_id) WHERE subordinado_id = p_responsavel_id) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$

```

### function `pode_acessar_usuario`
```sql
CREATE OR REPLACE FUNCTION public.pode_acessar_usuario(p_viewer_id uuid, p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_viewer_grupo TEXT;
  v_viewer_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT grupo_acesso, empresa_id INTO v_viewer_grupo, v_viewer_empresa
  FROM public.profiles WHERE id = p_viewer_id;
  
  SELECT empresa_id INTO v_target_empresa
  FROM public.profiles WHERE id = p_target_id;
  
  IF v_viewer_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  IF p_viewer_id = p_target_id THEN
    RETURN TRUE;
  END IF;
  
  IF v_viewer_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  IF v_viewer_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.get_subordinados(p_viewer_id) WHERE subordinado_id = p_target_id
    );
  END IF;
  
  RETURN FALSE;
END;
$function$

```

### function `pode_ver_notificacao_empresa`
```sql
CREATE OR REPLACE FUNCTION public.pode_ver_notificacao_empresa(p_notificacao_empresa_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_empresa_id UUID;
  v_user_role TEXT;
  v_user_tipo tipo_empresa;
  v_notificacao_empresa_sst_pai UUID;
BEGIN
  -- Buscar dados do usuário atual
  SELECT empresa_id, role INTO v_user_empresa_id, v_user_role
  FROM profiles
  WHERE id = (SELECT auth.uid());
  
  -- Admin vertical vê tudo
  IF v_user_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  -- Se a notificação é da própria empresa do usuário
  IF p_notificacao_empresa_id = v_user_empresa_id THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar tipo da empresa do usuário
  SELECT tipo INTO v_user_tipo FROM empresas WHERE id = v_user_empresa_id;
  
  -- Se o usuário é de uma empresa SST, pode ver notificações de:
  -- 1. Seus clientes finais (via clientes_sst)
  -- 2. Suas empresas parceiras (via empresas_parceiras)
  IF v_user_tipo = 'sst' THEN
    -- Verificar se a empresa da notificação é cliente desta SST
    IF EXISTS (
      SELECT 1 FROM clientes_sst 
      WHERE empresa_sst_id = v_user_empresa_id 
      AND cliente_empresa_id = p_notificacao_empresa_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Verificar se a empresa da notificação é parceira desta SST
    IF EXISTS (
      SELECT 1 FROM empresas_parceiras 
      WHERE empresa_sst_id = v_user_empresa_id 
      AND parceira_empresa_id = p_notificacao_empresa_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Caso contrário, não pode ver
  RETURN FALSE;
END;
$function$

```

### function `populate_empresa_modulo_telas`
```sql
CREATE OR REPLACE FUNCTION public.populate_empresa_modulo_telas(p_empresa_id uuid, p_modulo_id uuid, p_modulo_codigo text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  tela_ids TEXT[];
BEGIN
  -- Definir telas baseado no módulo
  CASE p_modulo_codigo
    WHEN 'perfil_empresa' THEN
      tela_ids := ARRAY['meu-perfil', 'cadastros', 'configuracoes'];
    
    WHEN 'toriq_corp' THEN
      tela_ids := ARRAY[
        'toriq-corp-tarefas',
        'toriq-corp-comercial',
        'toriq-corp-contratos',
        'toriq-corp-administrativo',
        'toriq-corp-financeiro',
        'toriq-corp-financeiro-dashboard',
        'toriq-corp-financeiro-cadastros',
        'toriq-corp-contas-receber',
        'toriq-corp-contas-pagar',
        'toriq-corp-fluxo-caixa',
        'toriq-corp-dre',
        'toriq-corp-tecnico',
        'toriq-corp-marketing',
        'toriq-corp-controle-frota',
        'toriq-corp-controle-equipamentos',
        'toriq-corp-configuracoes',
        'toriq-corp-teste-acesso'
      ];
    
    WHEN 'toriq_train' THEN
      tela_ids := ARRAY[
        'agenda-treinamentos',
        'gestao-turmas',
        'solicitacoes-treinamentos',
        'nr',
        'catalogo-treinamentos',
        'matriz-treinamentos',
        'grupos-homogeneos',
        'provas',
        'avaliacao-reacao',
        'declaracao-reorientacao',
        'modelo-relatorio',
        'instrutores',
        'empresas-parceiras'
      ];
    
    ELSE
      tela_ids := ARRAY[]::TEXT[];
  END CASE;

  -- Inserir telas (ignorar se já existir)
  INSERT INTO empresas_modulos_telas (empresa_id, modulo_id, tela_id, ativo)
  SELECT p_empresa_id, p_modulo_id, unnest(tela_ids), false
  ON CONFLICT (empresa_id, modulo_id, tela_id) DO NOTHING;
END;
$function$

```

### function `register_app_update`
```sql
CREATE OR REPLACE FUNCTION public.register_app_update(p_version character varying, p_title character varying, p_description text, p_changelog jsonb, p_release_date timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_update_id UUID;
BEGIN
    -- Verifica se a versão já existe
    SELECT id INTO v_update_id
    FROM system_updates
    WHERE version = p_version;
    
    -- Se não existe, cria
    IF v_update_id IS NULL THEN
        INSERT INTO system_updates (version, title, description, changelog, release_date, is_active)
        VALUES (p_version, p_title, p_description, p_changelog, p_release_date, true)
        RETURNING id INTO v_update_id;
        
        -- Desativa versões anteriores
        UPDATE system_updates
        SET is_active = false
        WHERE id != v_update_id;
    END IF;
    
    RETURN v_update_id;
END;
$function$

```

### function `registrar_sessao`
```sql
CREATE OR REPLACE FUNCTION public.registrar_sessao(p_user_id uuid, p_session_token text, p_dispositivo text DEFAULT NULL::text, p_navegador text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Primeiro invalidar sessões anteriores
  PERFORM invalidar_sessoes_anteriores(p_user_id, p_session_token);
  
  -- Inserir nova sessão (ou atualizar se já existe)
  INSERT INTO sessoes_ativas (user_id, session_token, dispositivo, navegador, ip_address, ativo)
  VALUES (p_user_id, p_session_token, p_dispositivo, p_navegador, p_ip_address, TRUE)
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    last_activity = NOW(),
    ativo = TRUE;
END;
$function$

```

### function `update_agenda_eventos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_agenda_eventos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_cadastro_epis_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_cadastro_epis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_catalogo_treinamentos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_catalogo_treinamentos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_cliente_contatos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_cliente_contatos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_contratos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_contratos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_declaracoes_reorientacao_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_declaracoes_reorientacao_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_empresas_modulos_telas_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_empresas_modulos_telas_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_entregas_epis_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_entregas_epis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_estoque_epis_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_estoque_epis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_frota_veiculos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_frota_veiculos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_funil_card_comparacoes_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_funil_card_comparacoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_funil_card_orcamentos_sst_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_funil_card_orcamentos_sst_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_funil_card_orcamentos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_funil_card_orcamentos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_funil_card_propostas_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_funil_card_propostas_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_funil_negocio_configuracoes_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_funil_negocio_configuracoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_grupos_homogeneos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_grupos_homogeneos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_import_queue_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_import_queue_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_informacoes_empresa_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_informacoes_empresa_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_instrutor_formacoes_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_instrutor_formacoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_instrutor_solicitacoes_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_instrutor_solicitacoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_matriz_epi_cargo_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_matriz_epi_cargo_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_modelo_relatorio_blocos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_modelo_relatorio_blocos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_modelo_relatorio_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_modelo_relatorio_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_notificacoes_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_notificacoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_profile_safe`
```sql
CREATE OR REPLACE FUNCTION public.update_profile_safe(p_profile_id uuid, p_nome text DEFAULT NULL::text, p_setor_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_grupo_acesso text DEFAULT NULL::text, p_gestor_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_user_id UUID;
  v_current_role TEXT;
  v_current_grupo TEXT;
  v_current_empresa UUID;
  v_target_empresa UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  SELECT role, grupo_acesso, empresa_id 
  INTO v_current_role, v_current_grupo, v_current_empresa
  FROM public.profiles WHERE id = v_current_user_id;
  
  SELECT empresa_id INTO v_target_empresa
  FROM public.profiles WHERE id = p_profile_id;
  
  IF v_current_user_id != p_profile_id 
     AND v_current_role != 'admin_vertical'
     AND (v_current_grupo != 'administrador' OR v_current_empresa IS DISTINCT FROM v_target_empresa) THEN
    RAISE EXCEPTION 'Sem permissão para editar este usuário';
  END IF;
  
  UPDATE public.profiles SET
    nome = COALESCE(p_nome, nome),
    setor_id = CASE WHEN p_setor_id IS NOT NULL THEN p_setor_id ELSE setor_id END,
    role = CASE WHEN p_role IS NOT NULL THEN p_role::public.app_role ELSE role END,
    grupo_acesso = CASE WHEN p_grupo_acesso IS NOT NULL THEN p_grupo_acesso ELSE grupo_acesso END,
    gestor_id = CASE WHEN p_gestor_id IS NOT NULL THEN p_gestor_id ELSE gestor_id END,
    updated_at = NOW()
  WHERE id = p_profile_id;
  
  RETURN TRUE;
END;
$function$

```

### function `update_propostas_modelos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_propostas_modelos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_propostas_servicos_sst_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_propostas_servicos_sst_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_propostas_v365_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_propostas_v365_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_propostas_vertical365_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_propostas_vertical365_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_prospeccao_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_prospeccao_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_servicos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_servicos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_ticket_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_ticket_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_tickets_sla_config_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_tickets_sla_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_turma_anexos_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_turma_anexos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_turma_colaboradores_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_turma_colaboradores_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### function `update_updated_at_column`
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### function `update_white_label_config_updated_at`
```sql
CREATE OR REPLACE FUNCTION public.update_white_label_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

```

### function `verificar_sessao_ativa_por_email`
```sql
CREATE OR REPLACE FUNCTION public.verificar_sessao_ativa_por_email(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_has_active_session BOOLEAN;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se existe sessão ativa
  SELECT EXISTS(
    SELECT 1 FROM sessoes_ativas
    WHERE user_id = v_user_id
      AND ativo = TRUE
      AND last_activity > NOW() - INTERVAL '24 hours'
  ) INTO v_has_active_session;
  
  RETURN COALESCE(v_has_active_session, FALSE);
END;
$function$

```

### function `verificar_sessao_valida`
```sql
CREATE OR REPLACE FUNCTION public.verificar_sessao_valida(p_user_id uuid, p_session_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ativo BOOLEAN;
BEGIN
  SELECT ativo INTO v_ativo
  FROM sessoes_ativas
  WHERE user_id = p_user_id
    AND session_token = p_session_token;
  
  RETURN COALESCE(v_ativo, FALSE);
END;
$function$

```