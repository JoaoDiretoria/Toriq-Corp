-- ============================================================================
-- ROLLBACK: Reverter Correções de Segurança Fase 1 e Fase 2
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- ============================================================================

-- ============================================================================
-- ROLLBACK FASE 1
-- ============================================================================

-- 1. Desabilitar RLS em turma_cases_sucesso (REVERTER)
-- IMPACTO: Tabela voltará a ser acessível sem restrições
ALTER TABLE public.turma_cases_sucesso DISABLE ROW LEVEL SECURITY;

-- 2. Remover colunas de controle adicionadas (REVERTER)
-- IMPACTO: Policies que usam essas colunas vão falhar - execute ANTES de reverter policies
ALTER TABLE public.turmas_treinamento DROP COLUMN IF EXISTS permite_presenca_publica;
ALTER TABLE public.turmas_treinamento DROP COLUMN IF EXISTS permite_prova_publica;

-- 3. Restaurar policies originais de turma_colaborador_presencas (anon)
DROP POLICY IF EXISTS "Presenças atualizáveis via link público" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Presenças inseríveis via link público" ON public.turma_colaborador_presencas;

CREATE POLICY "Presenças atualizáveis publicamente"
    ON public.turma_colaborador_presencas FOR UPDATE TO anon
    USING (true) WITH CHECK (true);

CREATE POLICY "Presenças inseríveis publicamente"
    ON public.turma_colaborador_presencas FOR INSERT TO anon
    WITH CHECK (true);

-- 4. Restaurar policy original de turma_colaboradores (anon)
DROP POLICY IF EXISTS "Atualizar notas via prova pública" ON public.turma_colaboradores;

CREATE POLICY "Atualizar notas de provas publicamente"
    ON public.turma_colaboradores FOR UPDATE TO anon
    USING (true) WITH CHECK (true);

-- 5. Restaurar policies originais de turma_provas
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar provas da sua empresa" ON public.turma_provas;
DROP POLICY IF EXISTS "Provas acessíveis via link público" ON public.turma_provas;

CREATE POLICY "Atualizar provas autenticado" ON public.turma_provas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Atualizar provas publicamente" ON public.turma_provas FOR UPDATE TO anon USING (true);
CREATE POLICY "Deletar provas autenticado" ON public.turma_provas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Deletar provas publicamente" ON public.turma_provas FOR DELETE TO anon USING (true);
CREATE POLICY "Inserir provas autenticado" ON public.turma_provas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserir provas publicamente" ON public.turma_provas FOR INSERT TO anon WITH CHECK (true);

-- 6. Recriar índices removidos (se necessário para performance)
-- NOTA: Esses índices eram duplicados, não é recomendado recriá-los
-- CREATE INDEX idx_contas_pagar_atividades_conta ON public.contas_pagar_atividades(conta_pagar_id);
-- CREATE INDEX idx_contas_pagar_colunas_empresa ON public.contas_pagar_colunas(empresa_id);
-- CREATE INDEX idx_contas_pagar_movimentacoes_conta ON public.contas_pagar_movimentacoes(conta_pagar_id);
-- CREATE INDEX idx_card_movimentacoes_card_id ON public.card_movimentacoes(card_id);
-- CREATE INDEX idx_card_movimentacoes_created_at ON public.card_movimentacoes(created_at);
-- CREATE INDEX idx_empresas_modulos_telas_empresa ON public.empresas_modulos_telas(empresa_id);
-- CREATE INDEX idx_empresas_modulos_telas_modulo ON public.empresas_modulos_telas(modulo_id);

-- ============================================================================
-- ROLLBACK FASE 2
-- ============================================================================

-- 1. Remover search_path das funções (REVERTER)
-- IMPACTO: Funções voltarão a usar search_path padrão (pode ser vulnerável a hijacking)
ALTER FUNCTION public.can_delete_profile RESET search_path;
ALTER FUNCTION public.can_update_profile RESET search_path;
ALTER FUNCTION public.can_view_profile RESET search_path;
ALTER FUNCTION public.criar_configuracao_funil_padrao RESET search_path;
ALTER FUNCTION public.criar_notificacao RESET search_path;
ALTER FUNCTION public.generate_contrato_numero RESET search_path;
ALTER FUNCTION public.generate_utilizacao_codigo RESET search_path;
ALTER FUNCTION public.gerar_contas_recorrentes RESET search_path;
ALTER FUNCTION public.gerar_numero_movimentacao RESET search_path;
ALTER FUNCTION public.get_aulas_instrutor RESET search_path;
ALTER FUNCTION public.get_clientes_empresa_ids RESET search_path;
ALTER FUNCTION public.get_instrutor_id_for_user RESET search_path;
ALTER FUNCTION public.get_my_profile_data RESET search_path;
ALTER FUNCTION public.get_subordinados RESET search_path;
ALTER FUNCTION public.get_turmas_instrutor RESET search_path;
ALTER FUNCTION public.get_user_empresa_id RESET search_path;
ALTER FUNCTION public.get_user_empresa_id_safe RESET search_path;
ALTER FUNCTION public.get_user_role RESET search_path;
ALTER FUNCTION public.get_user_role_safe RESET search_path;
ALTER FUNCTION public.get_usuarios_visiveis RESET search_path;
ALTER FUNCTION public.handle_new_user RESET search_path;
ALTER FUNCTION public.has_role RESET search_path;
ALTER FUNCTION public.is_admin_or_empresa_admin RESET search_path;
ALTER FUNCTION public.is_admin_vertical RESET search_path;
ALTER FUNCTION public.is_cliente_of_turma RESET search_path;
ALTER FUNCTION public.is_empresa_sst RESET search_path;
ALTER FUNCTION public.is_instrutor_of_turma RESET search_path;
ALTER FUNCTION public.log_card_movimentacao RESET search_path;
ALTER FUNCTION public.log_funil_atividade_changes RESET search_path;
ALTER FUNCTION public.log_funil_card_changes RESET search_path;
ALTER FUNCTION public.log_funil_etapa_changes RESET search_path;
ALTER FUNCTION public.log_table_changes RESET search_path;
ALTER FUNCTION public.log_table_insert RESET search_path;
ALTER FUNCTION public.notify_cliente_sst_created RESET search_path;
ALTER FUNCTION public.notify_closer_card_created RESET search_path;
ALTER FUNCTION public.notify_colaborador_created RESET search_path;
ALTER FUNCTION public.notify_conta_pagar_created RESET search_path;
ALTER FUNCTION public.notify_conta_receber_created RESET search_path;
ALTER FUNCTION public.notify_cross_selling_card_created RESET search_path;
ALTER FUNCTION public.notify_entrega_epi_created RESET search_path;
ALTER FUNCTION public.notify_estoque_epi_created RESET search_path;
ALTER FUNCTION public.notify_pos_venda_card_created RESET search_path;
ALTER FUNCTION public.notify_prospeccao_card_created RESET search_path;
ALTER FUNCTION public.notify_solicitacao_treinamento_created RESET search_path;
ALTER FUNCTION public.notify_ticket_created RESET search_path;
ALTER FUNCTION public.notify_ticket_updated RESET search_path;
ALTER FUNCTION public.notify_turma_created RESET search_path;
ALTER FUNCTION public.pode_acessar_registro RESET search_path;
ALTER FUNCTION public.pode_acessar_usuario RESET search_path;
ALTER FUNCTION public.populate_empresa_modulo_telas RESET search_path;
ALTER FUNCTION public.update_cadastro_epis_updated_at RESET search_path;
ALTER FUNCTION public.update_catalogo_treinamentos_updated_at RESET search_path;
ALTER FUNCTION public.update_cliente_contatos_updated_at RESET search_path;
ALTER FUNCTION public.update_contratos_updated_at RESET search_path;
ALTER FUNCTION public.update_declaracoes_reorientacao_updated_at RESET search_path;
ALTER FUNCTION public.update_empresas_modulos_telas_updated_at RESET search_path;
ALTER FUNCTION public.update_entregas_epis_updated_at RESET search_path;
ALTER FUNCTION public.update_estoque_epis_updated_at RESET search_path;
ALTER FUNCTION public.update_frota_veiculos_updated_at RESET search_path;
ALTER FUNCTION public.update_funil_card_comparacoes_updated_at RESET search_path;
ALTER FUNCTION public.update_funil_card_orcamentos_updated_at RESET search_path;
ALTER FUNCTION public.update_funil_negocio_configuracoes_updated_at RESET search_path;
ALTER FUNCTION public.update_grupos_homogeneos_updated_at RESET search_path;
ALTER FUNCTION public.update_informacoes_empresa_updated_at RESET search_path;
ALTER FUNCTION public.update_instrutor_formacoes_updated_at RESET search_path;
ALTER FUNCTION public.update_instrutor_solicitacoes_updated_at RESET search_path;
ALTER FUNCTION public.update_matriz_epi_cargo_updated_at RESET search_path;
ALTER FUNCTION public.update_modelo_relatorio_blocos_updated_at RESET search_path;
ALTER FUNCTION public.update_modelo_relatorio_updated_at RESET search_path;
ALTER FUNCTION public.update_notificacoes_updated_at RESET search_path;
ALTER FUNCTION public.update_profile_safe RESET search_path;
ALTER FUNCTION public.update_prospeccao_updated_at RESET search_path;
ALTER FUNCTION public.update_servicos_updated_at RESET search_path;
ALTER FUNCTION public.update_ticket_updated_at RESET search_path;
ALTER FUNCTION public.update_tickets_sla_config_updated_at RESET search_path;
ALTER FUNCTION public.update_turma_anexos_updated_at RESET search_path;
ALTER FUNCTION public.update_turma_colaboradores_updated_at RESET search_path;
ALTER FUNCTION public.update_updated_at_column RESET search_path;

-- 2. Desabilitar RLS em notificacao_config (REVERTER)
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações" ON public.notificacao_config;
ALTER TABLE public.notificacao_config DISABLE ROW LEVEL SECURITY;

-- 3. Restaurar policies originais de turma_colaborador_presencas (authenticated)
DROP POLICY IF EXISTS "Atualizar presenças autenticado" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Deletar presenças autenticado" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Inserir presenças autenticado" ON public.turma_colaborador_presencas;

CREATE POLICY "Atualizar presenças autenticado"
    ON public.turma_colaborador_presencas FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Deletar presenças autenticado"
    ON public.turma_colaborador_presencas FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Inserir presenças autenticado"
    ON public.turma_colaborador_presencas FOR INSERT TO authenticated
    WITH CHECK (true);

-- 4. Restaurar policies originais de turma_anexos
DROP POLICY IF EXISTS "Atualizar anexos da empresa" ON public.turma_anexos;
DROP POLICY IF EXISTS "Deletar anexos da empresa" ON public.turma_anexos;
DROP POLICY IF EXISTS "Inserir anexos da empresa" ON public.turma_anexos;

CREATE POLICY "Permitir atualização de anexos para usuários autenticados"
    ON public.turma_anexos FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão de anexos para usuários autenticados"
    ON public.turma_anexos FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção de anexos para usuários autenticados"
    ON public.turma_anexos FOR INSERT TO authenticated
    WITH CHECK (true);

-- 5. Restaurar policies originais de tickets_suporte
DROP POLICY IF EXISTS "insert_anexos" ON public.tickets_suporte_anexos;
CREATE POLICY "insert_anexos"
    ON public.tickets_suporte_anexos FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "insert_comentarios" ON public.tickets_suporte_comentarios;
CREATE POLICY "insert_comentarios"
    ON public.tickets_suporte_comentarios FOR INSERT TO authenticated
    WITH CHECK (true);

-- 6. Restaurar policy original de solicitacoes_treinamento
DROP POLICY IF EXISTS "update_policy" ON public.solicitacoes_treinamento;
CREATE POLICY "update_policy"
    ON public.solicitacoes_treinamento FOR UPDATE TO authenticated
    USING (true);

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- 1. Execute este script APENAS se houver problemas após as correções
-- 2. Execute via MCP ou diretamente no Supabase SQL Editor
-- 3. Após executar, teste a aplicação novamente
-- ============================================================================
