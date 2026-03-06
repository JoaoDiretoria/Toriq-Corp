-- ============================================================================
-- ROLLBACK: Reverter Consolidação de Policies Fase 9
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- ============================================================================

-- ============================================================================
-- LOTE 1: FUNIS - Restaurar policies DELETE originais
-- ============================================================================

DROP POLICY IF EXISTS "delete_funis_consolidado" ON public.funis;

CREATE POLICY "Admin pode excluir funis" ON public.funis
    AS PERMISSIVE FOR DELETE TO public
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Empresas podem deletar seus funis" ON public.funis
    AS PERMISSIVE FOR DELETE TO public
    USING (empresa_id IN (
        SELECT profiles.empresa_id
        FROM profiles
        WHERE profiles.id = (select auth.uid())
    ));

CREATE POLICY "Usuarios podem excluir funis da sua empresa" ON public.funis
    AS PERMISSIVE FOR DELETE TO public
    USING (empresa_id IN (
        SELECT profiles.empresa_id
        FROM profiles
        WHERE profiles.id = (select auth.uid())
    ));

-- funil_etapas
DROP POLICY IF EXISTS "delete_funil_etapas_consolidado" ON public.funil_etapas;

CREATE POLICY "Admin pode excluir etapas" ON public.funil_etapas
    AS PERMISSIVE FOR DELETE TO public
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Empresas podem deletar etapas de seus funis" ON public.funil_etapas
    AS PERMISSIVE FOR DELETE TO public
    USING (funil_id IN (
        SELECT funis.id FROM funis
        WHERE funis.empresa_id IN (
            SELECT profiles.empresa_id
            FROM profiles
            WHERE profiles.id = (select auth.uid())
        )
    ));

CREATE POLICY "Usuarios podem excluir etapas de funis da sua empresa" ON public.funil_etapas
    AS PERMISSIVE FOR DELETE TO public
    USING (funil_id IN (
        SELECT funis.id FROM funis
        WHERE funis.empresa_id IN (
            SELECT profiles.empresa_id
            FROM profiles
            WHERE profiles.id = (select auth.uid())
        )
    ));

-- ============================================================================
-- LOTE 2: AVALIAÇÃO DE REAÇÃO - Restaurar policies SELECT
-- ============================================================================

-- avaliacao_reacao_categorias
CREATE POLICY "Admin pode ver todas categorias avaliacao reacao" ON public.avaliacao_reacao_categorias
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver categorias de avaliacao de reacao" ON public.avaliacao_reacao_categorias
    AS PERMISSIVE FOR SELECT TO public
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'cliente_final'::app_role)
        AND modelo_id IN (
            SELECT arm.id FROM avaliacao_reacao_modelos arm
            WHERE arm.empresa_id IN (
                SELECT DISTINCT tt.empresa_id
                FROM turmas_treinamento tt
                JOIN clientes_sst cs ON cs.id = tt.cliente_id
                WHERE cs.cliente_empresa_id = (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = (select auth.uid()))
            )
        )
    );

CREATE POLICY "Instrutores podem ver avaliacao_reacao_categorias" ON public.avaliacao_reacao_categorias
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (modelo_id IN (
        SELECT avaliacao_reacao_modelos.id FROM avaliacao_reacao_modelos
        WHERE avaliacao_reacao_modelos.empresa_id IN (
            SELECT turmas_treinamento.empresa_id FROM turmas_treinamento
            WHERE turmas_treinamento.instrutor_id = get_instrutor_id_for_user((select auth.uid()))
        )
    ));

-- avaliacao_reacao_itens
CREATE POLICY "Admin pode ver todos itens avaliacao reacao" ON public.avaliacao_reacao_itens
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver itens de avaliacao de reacao" ON public.avaliacao_reacao_itens
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver avaliacao_reacao_itens" ON public.avaliacao_reacao_itens
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- avaliacao_reacao_modelos
CREATE POLICY "Admin pode ver todos modelos avaliacao reacao" ON public.avaliacao_reacao_modelos
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver modelos de avaliacao de reacao" ON public.avaliacao_reacao_modelos
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver avaliacao_reacao_modelos" ON public.avaliacao_reacao_modelos
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- avaliacao_reacao_opcoes_resposta
CREATE POLICY "Admin pode ver todas opcoes avaliacao reacao" ON public.avaliacao_reacao_opcoes_resposta
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver opcoes de avaliacao de reacao" ON public.avaliacao_reacao_opcoes_resposta
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver avaliacao_reacao_opcoes_resposta" ON public.avaliacao_reacao_opcoes_resposta
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- avaliacao_reacao_modelo_treinamentos
CREATE POLICY "Admin pode ver todos modelo treinamentos avaliacao" ON public.avaliacao_reacao_modelo_treinamentos
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver modelo treinamentos avaliacao" ON public.avaliacao_reacao_modelo_treinamentos
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver avaliacao_reacao_modelo_treinamentos" ON public.avaliacao_reacao_modelo_treinamentos
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- avaliacao_reacao_respostas
CREATE POLICY "Admin pode ver todas avaliacoes de reacao" ON public.avaliacao_reacao_respostas
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver avaliacoes de reacao das suas turmas" ON public.avaliacao_reacao_respostas
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver avaliacao_reacao_respostas" ON public.avaliacao_reacao_respostas
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- LOTE 3: PROVAS - Restaurar policies SELECT
-- ============================================================================

-- provas_alternativas
CREATE POLICY "Admin pode ver todas provas_alternativas" ON public.provas_alternativas
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver alternativas de provas das suas turmas" ON public.provas_alternativas
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver alternativas" ON public.provas_alternativas
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- provas_questoes
CREATE POLICY "Admin pode ver todas provas_questoes" ON public.provas_questoes
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver questoes de provas das suas turmas" ON public.provas_questoes
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver questoes" ON public.provas_questoes
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- provas_treinamento
CREATE POLICY "Admin pode ver todas provas_treinamento" ON public.provas_treinamento
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver provas de treinamentos das suas turmas" ON public.provas_treinamento
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver provas_treinamento" ON public.provas_treinamento
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- LOTE 4: REORIENTAÇÕES - Restaurar policies SELECT
-- ============================================================================

CREATE POLICY "Admin pode ver todas reorientacoes" ON public.reorientacoes_colaborador
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver reorientacoes das suas turmas" ON public.reorientacoes_colaborador
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver reorientacoes" ON public.reorientacoes_colaborador
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- LOTE 5: TURMA COLABORADOR PRESENÇAS - Restaurar policies SELECT
-- ============================================================================

CREATE POLICY "Admin pode ver todas presencas" ON public.turma_colaborador_presencas
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Cliente final pode ver presencas das suas turmas" ON public.turma_colaborador_presencas
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

CREATE POLICY "Instrutores podem ver presencas turma" ON public.turma_colaborador_presencas
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- LOTE 6: DECLARAÇÕES REORIENTAÇÃO - Restaurar policies SELECT
-- ============================================================================

DROP POLICY IF EXISTS "select_declaracoes_reorientacao_consolidado" ON public.declaracoes_reorientacao;

CREATE POLICY "Admin pode ver todas declaracoes reorientacao" ON public.declaracoes_reorientacao
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Empresa SST pode ver suas declarações" ON public.declaracoes_reorientacao
    AS PERMISSIVE FOR SELECT TO public
    USING (empresa_id IN (
        SELECT profiles.empresa_id FROM profiles WHERE profiles.id = (select auth.uid())
    ));

CREATE POLICY "Cliente final pode ver declaracoes de reorientacao" ON public.declaracoes_reorientacao
    AS PERMISSIVE FOR SELECT TO public
    USING (true);

-- ============================================================================
-- LOTE 7: FINANCEIRO CONTAS - Restaurar policies SELECT
-- ============================================================================

DROP POLICY IF EXISTS "select_financeiro_contas_consolidado" ON public.financeiro_contas;

CREATE POLICY "Admin vertical pode ver todas as contas" ON public.financeiro_contas
    AS PERMISSIVE FOR SELECT TO public
    USING ((select auth.uid()) IN (
        SELECT profiles.id FROM profiles WHERE profiles.role = 'admin_vertical'::app_role
    ));

CREATE POLICY "Empresa SST pode ver suas contas" ON public.financeiro_contas
    AS PERMISSIVE FOR SELECT TO public
    USING (empresa_id IN (
        SELECT profiles.empresa_id FROM profiles WHERE profiles.id = (select auth.uid())
    ));

CREATE POLICY "Cliente final pode ver suas contas" ON public.financeiro_contas
    AS PERMISSIVE FOR SELECT TO public
    USING (empresa_id IN (
        SELECT profiles.empresa_id FROM profiles WHERE profiles.id = (select auth.uid())
    ));

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 9
-- 2. Isso restaura as policies originais (com duplicatas)
-- 3. NÃO afeta funcionalidade, apenas performance
-- ============================================================================
