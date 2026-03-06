-- ============================================================================
-- MIGRAÇÃO: Correção de Issues de Segurança - Fase 2
-- Data: 20/01/2026
-- Aplicada via MCP Supabase
-- ============================================================================

-- ============================================================================
-- 1. CORRIGIR search_path EM 78 FUNÇÕES
-- ============================================================================
ALTER FUNCTION public.can_delete_profile SET search_path = '';
ALTER FUNCTION public.can_update_profile SET search_path = '';
ALTER FUNCTION public.can_view_profile SET search_path = '';
ALTER FUNCTION public.criar_configuracao_funil_padrao SET search_path = '';
ALTER FUNCTION public.criar_notificacao SET search_path = '';
ALTER FUNCTION public.generate_contrato_numero SET search_path = '';
ALTER FUNCTION public.generate_utilizacao_codigo SET search_path = '';
ALTER FUNCTION public.gerar_contas_recorrentes SET search_path = '';
ALTER FUNCTION public.gerar_numero_movimentacao SET search_path = '';
ALTER FUNCTION public.get_aulas_instrutor SET search_path = '';
ALTER FUNCTION public.get_clientes_empresa_ids SET search_path = '';
ALTER FUNCTION public.get_instrutor_id_for_user SET search_path = '';
ALTER FUNCTION public.get_my_profile_data SET search_path = '';
ALTER FUNCTION public.get_subordinados SET search_path = '';
ALTER FUNCTION public.get_turmas_instrutor SET search_path = '';
ALTER FUNCTION public.get_user_empresa_id SET search_path = '';
ALTER FUNCTION public.get_user_empresa_id_safe SET search_path = '';
ALTER FUNCTION public.get_user_role SET search_path = '';
ALTER FUNCTION public.get_user_role_safe SET search_path = '';
ALTER FUNCTION public.get_usuarios_visiveis SET search_path = '';
ALTER FUNCTION public.handle_new_user SET search_path = '';
ALTER FUNCTION public.has_role SET search_path = '';
ALTER FUNCTION public.is_admin_or_empresa_admin SET search_path = '';
ALTER FUNCTION public.is_admin_vertical SET search_path = '';
ALTER FUNCTION public.is_cliente_of_turma SET search_path = '';
ALTER FUNCTION public.is_empresa_sst SET search_path = '';
ALTER FUNCTION public.is_instrutor_of_turma SET search_path = '';
ALTER FUNCTION public.log_card_movimentacao SET search_path = '';
ALTER FUNCTION public.log_funil_atividade_changes SET search_path = '';
ALTER FUNCTION public.log_funil_card_changes SET search_path = '';
ALTER FUNCTION public.log_funil_etapa_changes SET search_path = '';
ALTER FUNCTION public.log_table_changes SET search_path = '';
ALTER FUNCTION public.log_table_insert SET search_path = '';
ALTER FUNCTION public.notify_cliente_sst_created SET search_path = '';
ALTER FUNCTION public.notify_closer_card_created SET search_path = '';
ALTER FUNCTION public.notify_colaborador_created SET search_path = '';
ALTER FUNCTION public.notify_conta_pagar_created SET search_path = '';
ALTER FUNCTION public.notify_conta_receber_created SET search_path = '';
ALTER FUNCTION public.notify_cross_selling_card_created SET search_path = '';
ALTER FUNCTION public.notify_entrega_epi_created SET search_path = '';
ALTER FUNCTION public.notify_estoque_epi_created SET search_path = '';
ALTER FUNCTION public.notify_pos_venda_card_created SET search_path = '';
ALTER FUNCTION public.notify_prospeccao_card_created SET search_path = '';
ALTER FUNCTION public.notify_solicitacao_treinamento_created SET search_path = '';
ALTER FUNCTION public.notify_ticket_created SET search_path = '';
ALTER FUNCTION public.notify_ticket_updated SET search_path = '';
ALTER FUNCTION public.notify_turma_created SET search_path = '';
ALTER FUNCTION public.pode_acessar_registro SET search_path = '';
ALTER FUNCTION public.pode_acessar_usuario SET search_path = '';
ALTER FUNCTION public.populate_empresa_modulo_telas SET search_path = '';
ALTER FUNCTION public.update_cadastro_epis_updated_at SET search_path = '';
ALTER FUNCTION public.update_catalogo_treinamentos_updated_at SET search_path = '';
ALTER FUNCTION public.update_cliente_contatos_updated_at SET search_path = '';
ALTER FUNCTION public.update_contratos_updated_at SET search_path = '';
ALTER FUNCTION public.update_declaracoes_reorientacao_updated_at SET search_path = '';
ALTER FUNCTION public.update_empresas_modulos_telas_updated_at SET search_path = '';
ALTER FUNCTION public.update_entregas_epis_updated_at SET search_path = '';
ALTER FUNCTION public.update_estoque_epis_updated_at SET search_path = '';
ALTER FUNCTION public.update_frota_veiculos_updated_at SET search_path = '';
ALTER FUNCTION public.update_funil_card_comparacoes_updated_at SET search_path = '';
ALTER FUNCTION public.update_funil_card_orcamentos_updated_at SET search_path = '';
ALTER FUNCTION public.update_funil_negocio_configuracoes_updated_at SET search_path = '';
ALTER FUNCTION public.update_grupos_homogeneos_updated_at SET search_path = '';
ALTER FUNCTION public.update_informacoes_empresa_updated_at SET search_path = '';
ALTER FUNCTION public.update_instrutor_formacoes_updated_at SET search_path = '';
ALTER FUNCTION public.update_instrutor_solicitacoes_updated_at SET search_path = '';
ALTER FUNCTION public.update_matriz_epi_cargo_updated_at SET search_path = '';
ALTER FUNCTION public.update_modelo_relatorio_blocos_updated_at SET search_path = '';
ALTER FUNCTION public.update_modelo_relatorio_updated_at SET search_path = '';
ALTER FUNCTION public.update_notificacoes_updated_at SET search_path = '';
ALTER FUNCTION public.update_profile_safe SET search_path = '';
ALTER FUNCTION public.update_prospeccao_updated_at SET search_path = '';
ALTER FUNCTION public.update_servicos_updated_at SET search_path = '';
ALTER FUNCTION public.update_ticket_updated_at SET search_path = '';
ALTER FUNCTION public.update_tickets_sla_config_updated_at SET search_path = '';
ALTER FUNCTION public.update_turma_anexos_updated_at SET search_path = '';
ALTER FUNCTION public.update_turma_colaboradores_updated_at SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';

-- ============================================================================
-- 2. HABILITAR RLS EM notificacao_config
-- ============================================================================
ALTER TABLE public.notificacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver configurações"
    ON public.notificacao_config FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- 3. CORRIGIR POLICIES COM USING(true) - turma_colaborador_presencas
-- ============================================================================
DROP POLICY IF EXISTS "Atualizar presenças autenticado" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Deletar presenças autenticado" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Inserir presenças autenticado" ON public.turma_colaborador_presencas;

CREATE POLICY "Atualizar presenças autenticado"
    ON public.turma_colaborador_presencas FOR UPDATE TO authenticated
    USING (colaborador_turma_id IN (
        SELECT tc.id FROM turma_colaboradores tc
        JOIN turmas_treinamento tt ON tc.turma_id = tt.id
        WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR tt.instrutor_id = auth.uid()
    ));

CREATE POLICY "Deletar presenças autenticado"
    ON public.turma_colaborador_presencas FOR DELETE TO authenticated
    USING (colaborador_turma_id IN (
        SELECT tc.id FROM turma_colaboradores tc
        JOIN turmas_treinamento tt ON tc.turma_id = tt.id
        WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR tt.instrutor_id = auth.uid()
    ));

CREATE POLICY "Inserir presenças autenticado"
    ON public.turma_colaborador_presencas FOR INSERT TO authenticated
    WITH CHECK (colaborador_turma_id IN (
        SELECT tc.id FROM turma_colaboradores tc
        JOIN turmas_treinamento tt ON tc.turma_id = tt.id
        WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR tt.instrutor_id = auth.uid()
    ));

-- ============================================================================
-- 4. CORRIGIR POLICIES COM USING(true) - turma_anexos
-- ============================================================================
DROP POLICY IF EXISTS "Permitir atualização de anexos para usuários autenticados" ON public.turma_anexos;
DROP POLICY IF EXISTS "Permitir exclusão de anexos para usuários autenticados" ON public.turma_anexos;
DROP POLICY IF EXISTS "Permitir inserção de anexos para usuários autenticados" ON public.turma_anexos;

CREATE POLICY "Atualizar anexos da empresa"
    ON public.turma_anexos FOR UPDATE TO authenticated
    USING (turma_id IN (
        SELECT id FROM turmas_treinamento 
        WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR instrutor_id = auth.uid()
    ));

CREATE POLICY "Deletar anexos da empresa"
    ON public.turma_anexos FOR DELETE TO authenticated
    USING (turma_id IN (
        SELECT id FROM turmas_treinamento 
        WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR instrutor_id = auth.uid()
    ));

CREATE POLICY "Inserir anexos da empresa"
    ON public.turma_anexos FOR INSERT TO authenticated
    WITH CHECK (turma_id IN (
        SELECT id FROM turmas_treinamento 
        WHERE empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR instrutor_id = auth.uid()
    ));

-- ============================================================================
-- 5. CORRIGIR POLICIES COM USING(true) - tickets_suporte
-- ============================================================================
DROP POLICY IF EXISTS "insert_anexos" ON public.tickets_suporte_anexos;

CREATE POLICY "insert_anexos"
    ON public.tickets_suporte_anexos FOR INSERT TO authenticated
    WITH CHECK (ticket_id IN (
        SELECT id FROM tickets_suporte 
        WHERE empresa_solicitante_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR solicitante_id = auth.uid()
    ));

DROP POLICY IF EXISTS "insert_comentarios" ON public.tickets_suporte_comentarios;

CREATE POLICY "insert_comentarios"
    ON public.tickets_suporte_comentarios FOR INSERT TO authenticated
    WITH CHECK (ticket_id IN (
        SELECT id FROM tickets_suporte 
        WHERE empresa_solicitante_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
           OR solicitante_id = auth.uid()
    ));

-- ============================================================================
-- 6. CORRIGIR POLICY - solicitacoes_treinamento
-- ============================================================================
DROP POLICY IF EXISTS "update_policy" ON public.solicitacoes_treinamento;

CREATE POLICY "update_policy"
    ON public.solicitacoes_treinamento FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- RESUMO DAS CORREÇÕES FASE 2:
-- 1. ✅ 78 funções com search_path corrigidas
-- 2. ✅ RLS habilitado em notificacao_config
-- 3. ✅ 3 policies turma_colaborador_presencas corrigidas
-- 4. ✅ 3 policies turma_anexos corrigidas
-- 5. ✅ 2 policies tickets_suporte corrigidas
-- 6. ✅ 1 policy solicitacoes_treinamento corrigida
-- ============================================================================
