-- =====================================================
-- FASE 11: Consolidação Agressiva de Multiple Permissive Policies
-- Data: 21/01/2026
-- Objetivo: Reduzir ~100+ issues de Multiple Permissive Policies
-- =====================================================

-- =====================================================
-- PARTE 1: CATALOGO_TREINAMENTOS (9 → 2 policies)
-- =====================================================

-- Remover policies SELECT duplicadas
DROP POLICY IF EXISTS "Catálogo treinamentos visível publicamente para provas" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Cliente final pode ver treinamentos das suas turmas" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Empresa parceira pode ver treinamentos da SST vinculada" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Instrutores podem ver catalogo de treinamentos" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Instrutores podem ver treinamentos das suas turmas" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Parceira pode ver catalogo via empresa_sst" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Parceira select catalogo_treinamentos" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Treinamentos visíveis publicamente" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "Usuários podem ver treinamentos do catálogo" ON public.catalogo_treinamentos;

-- Policy consolidada para anon (acesso público)
CREATE POLICY "catalogo_treinamentos_select_anon" ON public.catalogo_treinamentos
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "catalogo_treinamentos_select_authenticated" ON public.catalogo_treinamentos
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical vê tudo
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Usuário da mesma empresa
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Empresa parceira vê treinamentos da SST
        empresa_id IN (
            SELECT ep.empresa_sst_id FROM empresas_parceiras ep
            JOIN profiles p ON p.empresa_id = ep.parceira_empresa_id
            WHERE p.id = (SELECT auth.uid())
        )
        OR
        -- Cliente final vê treinamentos das suas turmas
        id IN (
            SELECT tt.treinamento_id FROM turmas_treinamento tt
            JOIN clientes_sst cs ON cs.id = tt.cliente_id
            WHERE cs.cliente_empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
        OR
        -- Instrutor vê treinamentos das suas turmas
        id IN (
            SELECT tt.treinamento_id FROM turmas_treinamento tt
            WHERE tt.instrutor_id = get_instrutor_id_for_user((SELECT auth.uid()))
        )
    );

-- =====================================================
-- PARTE 2: CLIENTES_SST (7 → 2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Cliente pode ver seu próprio registro" ON public.clientes_sst;
DROP POLICY IF EXISTS "Clientes SST visíveis publicamente para provas" ON public.clientes_sst;
DROP POLICY IF EXISTS "Clientes finais podem ver seus registros clientes_sst" ON public.clientes_sst;
DROP POLICY IF EXISTS "Clientes visíveis publicamente para cadastro" ON public.clientes_sst;
DROP POLICY IF EXISTS "Empresa SST pode ver seus clientes" ON public.clientes_sst;
DROP POLICY IF EXISTS "Instrutores podem ver clientes das suas turmas" ON public.clientes_sst;
DROP POLICY IF EXISTS "Parceira pode ver clientes via empresa_sst" ON public.clientes_sst;

-- Policy para anon
CREATE POLICY "clientes_sst_select_anon" ON public.clientes_sst
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "clientes_sst_select_authenticated" ON public.clientes_sst
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical vê tudo
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Empresa SST vê seus clientes
        empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Cliente final vê seu próprio registro
        cliente_empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Parceira vê clientes da SST
        empresa_sst_id IN (
            SELECT ep.empresa_sst_id FROM empresas_parceiras ep
            JOIN profiles p ON p.empresa_id = ep.parceira_empresa_id
            WHERE p.id = (SELECT auth.uid())
        )
        OR
        -- Instrutor vê clientes das turmas
        id IN (
            SELECT tt.cliente_id FROM turmas_treinamento tt
            WHERE tt.instrutor_id = get_instrutor_id_for_user((SELECT auth.uid()))
        )
    );

-- =====================================================
-- PARTE 3: TURMAS_TREINAMENTO (6 → 2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Clientes finais podem ver suas turmas" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "Instrutores podem ver suas turmas" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "Parceira pode ver turmas via empresa_sst" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "Turmas visíveis publicamente para cadastro" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "Turmas visíveis publicamente para provas" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "Usuários podem ver turmas da sua empresa" ON public.turmas_treinamento;

-- Policy para anon
CREATE POLICY "turmas_treinamento_select_anon" ON public.turmas_treinamento
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "turmas_treinamento_select_authenticated" ON public.turmas_treinamento
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical vê tudo
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Empresa dona da turma
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Instrutor vê suas turmas
        instrutor_id = get_instrutor_id_for_user((SELECT auth.uid()))
        OR
        -- Cliente final vê turmas
        is_cliente_of_turma(cliente_id)
        OR
        -- Parceira vê turmas da SST
        empresa_id IN (
            SELECT ep.empresa_sst_id FROM empresas_parceiras ep
            JOIN profiles p ON p.empresa_id = ep.parceira_empresa_id
            WHERE p.id = (SELECT auth.uid())
        )
    );

-- =====================================================
-- PARTE 4: TURMA_COLABORADORES (5 → 2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Clientes finais podem ver colaboradores das suas turmas" ON public.turma_colaboradores;
DROP POLICY IF EXISTS "Colaboradores da turma visíveis publicamente para provas" ON public.turma_colaboradores;
DROP POLICY IF EXISTS "Empresa SST pode ver colaboradores de suas turmas" ON public.turma_colaboradores;
DROP POLICY IF EXISTS "Instrutores podem ver colaboradores turma" ON public.turma_colaboradores;
DROP POLICY IF EXISTS "Turma colaboradores visíveis publicamente" ON public.turma_colaboradores;

-- Policy para anon
CREATE POLICY "turma_colaboradores_select_anon" ON public.turma_colaboradores
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "turma_colaboradores_select_authenticated" ON public.turma_colaboradores
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Instrutor da turma
        is_instrutor_of_turma(turma_id)
        OR
        -- Empresa SST dona da turma
        turma_id IN (
            SELECT id FROM turmas_treinamento
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
        OR
        -- Cliente final
        EXISTS (
            SELECT 1 FROM turmas_treinamento t
            WHERE t.id = turma_colaboradores.turma_id AND is_cliente_of_turma(t.cliente_id)
        )
    );

-- =====================================================
-- PARTE 5: TURMAS_TREINAMENTO_AULAS (5 → 2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Aulas visíveis publicamente para cadastro" ON public.turmas_treinamento_aulas;
DROP POLICY IF EXISTS "Clientes finais podem ver aulas das suas turmas" ON public.turmas_treinamento_aulas;
DROP POLICY IF EXISTS "Instrutores podem ver aulas das suas turmas" ON public.turmas_treinamento_aulas;
DROP POLICY IF EXISTS "Parceira pode ver aulas via empresa_sst" ON public.turmas_treinamento_aulas;
DROP POLICY IF EXISTS "Usuários podem ver aulas de turmas da sua empresa" ON public.turmas_treinamento_aulas;

-- Policy para anon
CREATE POLICY "turmas_treinamento_aulas_select_anon" ON public.turmas_treinamento_aulas
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "turmas_treinamento_aulas_select_authenticated" ON public.turmas_treinamento_aulas
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Instrutor da turma
        is_instrutor_of_turma(turma_id)
        OR
        -- Empresa SST
        turma_id IN (
            SELECT id FROM turmas_treinamento
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
        OR
        -- Cliente final
        EXISTS (
            SELECT 1 FROM turmas_treinamento t
            WHERE t.id = turmas_treinamento_aulas.turma_id AND is_cliente_of_turma(t.cliente_id)
        )
        OR
        -- Parceira
        turma_id IN (
            SELECT t.id FROM turmas_treinamento t
            WHERE t.empresa_id IN (
                SELECT ep.empresa_sst_id FROM empresas_parceiras ep
                JOIN profiles p ON p.empresa_id = ep.parceira_empresa_id
                WHERE p.id = (SELECT auth.uid())
            )
        )
    );

-- =====================================================
-- PARTE 6: EMPRESAS_MODULOS (5 → 1 policy)
-- =====================================================

DROP POLICY IF EXISTS "Admin vertical pode ver todos os módulos de empresas" ON public.empresas_modulos;
DROP POLICY IF EXISTS "Clientes finais podem ver módulos da empresa SST" ON public.empresas_modulos;
DROP POLICY IF EXISTS "Empresas parceiras podem ver módulos da empresa SST" ON public.empresas_modulos;
DROP POLICY IF EXISTS "Instrutores podem ver módulos da empresa SST" ON public.empresas_modulos;
DROP POLICY IF EXISTS "Usuários podem ver módulos da sua empresa" ON public.empresas_modulos;

CREATE POLICY "empresas_modulos_select_authenticated" ON public.empresas_modulos
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical
        has_role((SELECT auth.uid()), 'admin_vertical'::app_role)
        OR
        -- Própria empresa
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Cliente final vê módulos da SST
        empresa_id IN (
            SELECT c.empresa_sst_id FROM clientes_sst c
            WHERE c.responsavel_id = (SELECT auth.uid())
        )
        OR
        -- Parceira vê módulos da SST
        empresa_id IN (
            SELECT ep.empresa_sst_id FROM empresas_parceiras ep
            WHERE ep.responsavel_id = (SELECT auth.uid())
        )
        OR
        -- Instrutor vê módulos da empresa
        empresa_id IN (
            SELECT i.empresa_id FROM instrutores i WHERE i.user_id = (SELECT auth.uid())
        )
    );

-- =====================================================
-- PARTE 7: COLABORADORES SELECT (3 → 2 policies)
-- =====================================================

DROP POLICY IF EXISTS "Cliente final pode ver colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Colaboradores visíveis publicamente para provas" ON public.colaboradores;
DROP POLICY IF EXISTS "Instrutores podem ver colaboradores" ON public.colaboradores;

-- Policy para anon
CREATE POLICY "colaboradores_select_anon" ON public.colaboradores
    FOR SELECT TO anon USING (true);

-- Policy consolidada para authenticated
CREATE POLICY "colaboradores_select_authenticated" ON public.colaboradores
    FOR SELECT TO authenticated
    USING (
        -- Admin vertical
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        -- Empresa SST vê colaboradores dos seus clientes
        empresa_id IN (
            SELECT cs.cliente_empresa_id FROM clientes_sst cs
            WHERE cs.empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
        OR
        -- Cliente final vê seus colaboradores
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        -- Instrutor vê colaboradores das turmas
        empresa_id IN (
            SELECT c.cliente_empresa_id FROM clientes_sst c
            WHERE c.id IN (
                SELECT tt.cliente_id FROM turmas_treinamento tt
                WHERE tt.instrutor_id = get_instrutor_id_for_user((SELECT auth.uid()))
            )
        )
    );

-- =====================================================
-- PARTE 8: AVALIACAO_REACAO_* (múltiplas tabelas)
-- =====================================================

-- CATEGORIAS (2 → 2 mantendo separação anon/authenticated)
DROP POLICY IF EXISTS "Categorias visíveis para usuários autenticados" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Categorias visíveis publicamente" ON public.avaliacao_reacao_categorias;

CREATE POLICY "avaliacao_reacao_categorias_select_anon" ON public.avaliacao_reacao_categorias
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_categorias_select_auth" ON public.avaliacao_reacao_categorias
    FOR SELECT TO authenticated USING (true);

-- ITENS (2 → 2)
DROP POLICY IF EXISTS "Itens visíveis para usuários autenticados" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Itens visíveis publicamente" ON public.avaliacao_reacao_itens;

CREATE POLICY "avaliacao_reacao_itens_select_anon" ON public.avaliacao_reacao_itens
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_itens_select_auth" ON public.avaliacao_reacao_itens
    FOR SELECT TO authenticated USING (true);

-- MODELOS (2 → 2)
DROP POLICY IF EXISTS "Modelos visíveis para usuários autenticados" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Modelos visíveis publicamente" ON public.avaliacao_reacao_modelos;

CREATE POLICY "avaliacao_reacao_modelos_select_anon" ON public.avaliacao_reacao_modelos
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_modelos_select_auth" ON public.avaliacao_reacao_modelos
    FOR SELECT TO authenticated USING (true);

-- OPCOES RESPOSTA (2 → 2)
DROP POLICY IF EXISTS "Opções visíveis para usuários autenticados" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Opções visíveis publicamente" ON public.avaliacao_reacao_opcoes_resposta;

CREATE POLICY "avaliacao_reacao_opcoes_select_anon" ON public.avaliacao_reacao_opcoes_resposta
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_opcoes_select_auth" ON public.avaliacao_reacao_opcoes_resposta
    FOR SELECT TO authenticated USING (true);

-- MODELO_TREINAMENTOS (2 → 2)
DROP POLICY IF EXISTS "Modelo treinamentos visíveis para usuários autenticados" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Modelo treinamentos visíveis publicamente" ON public.avaliacao_reacao_modelo_treinamentos;

CREATE POLICY "avaliacao_reacao_modelo_treinamentos_select_anon" ON public.avaliacao_reacao_modelo_treinamentos
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_modelo_treinamentos_select_auth" ON public.avaliacao_reacao_modelo_treinamentos
    FOR SELECT TO authenticated USING (true);

-- RESPOSTAS SELECT (2 → 2)
DROP POLICY IF EXISTS "Respostas visíveis para usuários autenticados" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Respostas visíveis publicamente para leitura" ON public.avaliacao_reacao_respostas;

CREATE POLICY "avaliacao_reacao_respostas_select_anon" ON public.avaliacao_reacao_respostas
    FOR SELECT TO anon USING (true);
CREATE POLICY "avaliacao_reacao_respostas_select_auth" ON public.avaliacao_reacao_respostas
    FOR SELECT TO authenticated USING (true);

-- =====================================================
-- PARTE 9: CLOSER_* (múltiplas tabelas, 2 policies cada → 1)
-- =====================================================

-- CLOSER_ATIVIDADES
DROP POLICY IF EXISTS "Deletar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Usuários podem deletar atividades de cards da sua empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Criar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Usuários podem criar atividades em cards da sua empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Ler closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Usuários podem ver atividades de cards da sua empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Atualizar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Usuários podem atualizar atividades de cards da sua empresa" ON public.closer_atividades;

CREATE POLICY "closer_atividades_all" ON public.closer_atividades
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    );

-- CLOSER_CARDS
DROP POLICY IF EXISTS "Deletar closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Usuários podem deletar cards da sua empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Criar closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Usuários podem criar cards na sua empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Ler closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Usuários podem ver cards da sua empresa" ON public.closer_cards;

CREATE POLICY "closer_cards_all" ON public.closer_cards
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
    );

-- CLOSER_CARD_ETIQUETAS
DROP POLICY IF EXISTS "Deletar closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Usuários podem remover etiquetas de cards da sua empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Criar closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Usuários podem adicionar etiquetas a cards da sua empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Ler closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Usuários podem ver etiquetas de cards da sua empresa" ON public.closer_card_etiquetas;

CREATE POLICY "closer_card_etiquetas_all" ON public.closer_card_etiquetas
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    );

-- CLOSER_CARD_MOVIMENTACOES
DROP POLICY IF EXISTS "Criar movimentacoes closer da empresa" ON public.closer_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem criar movimentações em cards da sua empresa" ON public.closer_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem ver movimentações do closer" ON public.closer_card_movimentacoes;
DROP POLICY IF EXISTS "Usuários podem ver movimentações de cards da sua empresa" ON public.closer_card_movimentacoes;

CREATE POLICY "closer_card_movimentacoes_all" ON public.closer_card_movimentacoes
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        card_id IN (
            SELECT id FROM closer_cards
            WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    );

-- =====================================================
-- PARTE 10: CARGOS (8 → 1 policy ALL)
-- =====================================================

DROP POLICY IF EXISTS "Admin pode deletar cargos de qualquer empresa" ON public.cargos;
DROP POLICY IF EXISTS "cargos_delete_policy" ON public.cargos;
DROP POLICY IF EXISTS "Admin pode criar cargos em qualquer empresa" ON public.cargos;
DROP POLICY IF EXISTS "cargos_insert_policy" ON public.cargos;
DROP POLICY IF EXISTS "Admin pode ver todos os cargos" ON public.cargos;
DROP POLICY IF EXISTS "cargos_select_policy" ON public.cargos;
DROP POLICY IF EXISTS "Admin pode atualizar cargos de qualquer empresa" ON public.cargos;
DROP POLICY IF EXISTS "cargos_update_policy" ON public.cargos;

CREATE POLICY "cargos_all" ON public.cargos
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        empresa_id IN (
            SELECT cs.cliente_empresa_id FROM clientes_sst cs
            WHERE cs.empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'::app_role
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        OR
        empresa_id IN (
            SELECT cs.cliente_empresa_id FROM clientes_sst cs
            WHERE cs.empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
        )
    );

-- =====================================================
-- LOG DA MIGRAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'FASE 11 - Consolidação agressiva concluída!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Policies consolidadas:';
    RAISE NOTICE '  - catalogo_treinamentos: 9 → 2';
    RAISE NOTICE '  - clientes_sst: 7 → 2';
    RAISE NOTICE '  - turmas_treinamento: 6 → 2';
    RAISE NOTICE '  - turma_colaboradores: 5 → 2';
    RAISE NOTICE '  - turmas_treinamento_aulas: 5 → 2';
    RAISE NOTICE '  - empresas_modulos: 5 → 1';
    RAISE NOTICE '  - colaboradores: 3 → 2';
    RAISE NOTICE '  - avaliacao_reacao_*: ~12 → ~12 (mantidas separadas anon/auth)';
    RAISE NOTICE '  - closer_*: ~16 → 4';
    RAISE NOTICE '  - cargos: 8 → 1';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Total estimado: ~75 policies removidas';
    RAISE NOTICE '=====================================================';
END $$;
