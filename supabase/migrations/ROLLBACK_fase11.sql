-- =====================================================
-- ROLLBACK FASE 11: Reverter Consolidação de Policies
-- Data: 21/01/2026
-- EXECUTAR APENAS SE HOUVER PROBLEMAS
-- =====================================================

-- PARTE 1: CATALOGO_TREINAMENTOS
DROP POLICY IF EXISTS "catalogo_treinamentos_select_anon" ON public.catalogo_treinamentos;
DROP POLICY IF EXISTS "catalogo_treinamentos_select_authenticated" ON public.catalogo_treinamentos;

CREATE POLICY "Catálogo treinamentos visível publicamente para provas" ON public.catalogo_treinamentos FOR SELECT TO anon USING (true);
CREATE POLICY "Treinamentos visíveis publicamente" ON public.catalogo_treinamentos FOR SELECT TO anon USING (true);
CREATE POLICY "Usuários podem ver treinamentos do catálogo" ON public.catalogo_treinamentos FOR SELECT TO public USING ((empresa_id = get_user_empresa_id((SELECT auth.uid()))));

-- PARTE 2: CLIENTES_SST
DROP POLICY IF EXISTS "clientes_sst_select_anon" ON public.clientes_sst;
DROP POLICY IF EXISTS "clientes_sst_select_authenticated" ON public.clientes_sst;

CREATE POLICY "Clientes SST visíveis publicamente para provas" ON public.clientes_sst FOR SELECT TO anon USING (true);
CREATE POLICY "Clientes visíveis publicamente para cadastro" ON public.clientes_sst FOR SELECT TO anon USING (true);
CREATE POLICY "Empresa SST pode ver seus clientes" ON public.clientes_sst FOR SELECT TO public USING (empresa_sst_id = get_user_empresa_id((SELECT auth.uid())));

-- PARTE 3: TURMAS_TREINAMENTO
DROP POLICY IF EXISTS "turmas_treinamento_select_anon" ON public.turmas_treinamento;
DROP POLICY IF EXISTS "turmas_treinamento_select_authenticated" ON public.turmas_treinamento;

CREATE POLICY "Turmas visíveis publicamente para cadastro" ON public.turmas_treinamento FOR SELECT TO anon USING (true);
CREATE POLICY "Turmas visíveis publicamente para provas" ON public.turmas_treinamento FOR SELECT TO anon USING (true);
CREATE POLICY "Usuários podem ver turmas da sua empresa" ON public.turmas_treinamento FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));

-- PARTE 4: TURMA_COLABORADORES
DROP POLICY IF EXISTS "turma_colaboradores_select_anon" ON public.turma_colaboradores;
DROP POLICY IF EXISTS "turma_colaboradores_select_authenticated" ON public.turma_colaboradores;

CREATE POLICY "Colaboradores da turma visíveis publicamente para provas" ON public.turma_colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "Turma colaboradores visíveis publicamente" ON public.turma_colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "Instrutores podem ver colaboradores turma" ON public.turma_colaboradores FOR SELECT TO authenticated USING (is_instrutor_of_turma(turma_id));

-- PARTE 5: TURMAS_TREINAMENTO_AULAS
DROP POLICY IF EXISTS "turmas_treinamento_aulas_select_anon" ON public.turmas_treinamento_aulas;
DROP POLICY IF EXISTS "turmas_treinamento_aulas_select_authenticated" ON public.turmas_treinamento_aulas;

CREATE POLICY "Aulas visíveis publicamente para cadastro" ON public.turmas_treinamento_aulas FOR SELECT TO anon USING (true);
CREATE POLICY "Instrutores podem ver aulas das suas turmas" ON public.turmas_treinamento_aulas FOR SELECT TO authenticated USING (is_instrutor_of_turma(turma_id));

-- PARTE 6: EMPRESAS_MODULOS
DROP POLICY IF EXISTS "empresas_modulos_select_authenticated" ON public.empresas_modulos;

CREATE POLICY "Admin vertical pode ver todos os módulos de empresas" ON public.empresas_modulos FOR SELECT TO authenticated USING (has_role((SELECT auth.uid()), 'admin_vertical'::app_role));
CREATE POLICY "Usuários podem ver módulos da sua empresa" ON public.empresas_modulos FOR SELECT TO public USING (empresa_id = get_user_empresa_id((SELECT auth.uid())));

-- PARTE 7: COLABORADORES
DROP POLICY IF EXISTS "colaboradores_select_anon" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_select_authenticated" ON public.colaboradores;

CREATE POLICY "Colaboradores visíveis publicamente para provas" ON public.colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "Cliente final pode ver colaboradores da sua empresa" ON public.colaboradores FOR SELECT TO public USING (empresa_id = get_user_empresa_id((SELECT auth.uid())));

-- PARTE 8: AVALIACAO_REACAO_*
DROP POLICY IF EXISTS "avaliacao_reacao_categorias_select_anon" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "avaliacao_reacao_categorias_select_auth" ON public.avaliacao_reacao_categorias;
CREATE POLICY "Categorias visíveis publicamente" ON public.avaliacao_reacao_categorias FOR SELECT TO anon USING (true);
CREATE POLICY "Categorias visíveis para usuários autenticados" ON public.avaliacao_reacao_categorias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "avaliacao_reacao_itens_select_anon" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "avaliacao_reacao_itens_select_auth" ON public.avaliacao_reacao_itens;
CREATE POLICY "Itens visíveis publicamente" ON public.avaliacao_reacao_itens FOR SELECT TO anon USING (true);
CREATE POLICY "Itens visíveis para usuários autenticados" ON public.avaliacao_reacao_itens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "avaliacao_reacao_modelos_select_anon" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "avaliacao_reacao_modelos_select_auth" ON public.avaliacao_reacao_modelos;
CREATE POLICY "Modelos visíveis publicamente" ON public.avaliacao_reacao_modelos FOR SELECT TO anon USING (true);
CREATE POLICY "Modelos visíveis para usuários autenticados" ON public.avaliacao_reacao_modelos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "avaliacao_reacao_opcoes_select_anon" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "avaliacao_reacao_opcoes_select_auth" ON public.avaliacao_reacao_opcoes_resposta;
CREATE POLICY "Opções visíveis publicamente" ON public.avaliacao_reacao_opcoes_resposta FOR SELECT TO anon USING (true);
CREATE POLICY "Opções visíveis para usuários autenticados" ON public.avaliacao_reacao_opcoes_resposta FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "avaliacao_reacao_modelo_treinamentos_select_anon" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "avaliacao_reacao_modelo_treinamentos_select_auth" ON public.avaliacao_reacao_modelo_treinamentos;
CREATE POLICY "Modelo treinamentos visíveis publicamente" ON public.avaliacao_reacao_modelo_treinamentos FOR SELECT TO anon USING (true);
CREATE POLICY "Modelo treinamentos visíveis para usuários autenticados" ON public.avaliacao_reacao_modelo_treinamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "avaliacao_reacao_respostas_select_anon" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "avaliacao_reacao_respostas_select_auth" ON public.avaliacao_reacao_respostas;
CREATE POLICY "Respostas visíveis publicamente para leitura" ON public.avaliacao_reacao_respostas FOR SELECT TO anon USING (true);
CREATE POLICY "Respostas visíveis para usuários autenticados" ON public.avaliacao_reacao_respostas FOR SELECT TO authenticated USING (true);

-- PARTE 9: CLOSER_*
DROP POLICY IF EXISTS "closer_atividades_all" ON public.closer_atividades;
CREATE POLICY "Ler closer_atividades da empresa" ON public.closer_atividades FOR SELECT TO authenticated USING (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Criar closer_atividades da empresa" ON public.closer_atividades FOR INSERT TO authenticated WITH CHECK (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Atualizar closer_atividades da empresa" ON public.closer_atividades FOR UPDATE TO authenticated USING (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Deletar closer_atividades da empresa" ON public.closer_atividades FOR DELETE TO authenticated USING (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "closer_cards_all" ON public.closer_cards;
CREATE POLICY "Ler closer_cards da empresa" ON public.closer_cards FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "Criar closer_cards da empresa" ON public.closer_cards FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "closer_card_etiquetas_all" ON public.closer_card_etiquetas;
CREATE POLICY "Ler closer_card_etiquetas da empresa" ON public.closer_card_etiquetas FOR SELECT TO authenticated USING (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Criar closer_card_etiquetas da empresa" ON public.closer_card_etiquetas FOR INSERT TO authenticated WITH CHECK (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "closer_card_movimentacoes_all" ON public.closer_card_movimentacoes;
CREATE POLICY "Usuários autenticados podem ver movimentações do closer" ON public.closer_card_movimentacoes FOR SELECT TO authenticated USING (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));
CREATE POLICY "Criar movimentacoes closer da empresa" ON public.closer_card_movimentacoes FOR INSERT TO authenticated WITH CHECK (card_id IN (SELECT id FROM closer_cards WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))));

-- PARTE 10: CARGOS
DROP POLICY IF EXISTS "cargos_all" ON public.cargos;
CREATE POLICY "cargos_select_policy" ON public.cargos FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "cargos_insert_policy" ON public.cargos FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "cargos_update_policy" ON public.cargos FOR UPDATE TO authenticated USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));
CREATE POLICY "cargos_delete_policy" ON public.cargos FOR DELETE TO authenticated USING (empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid())));

DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK FASE 11 executado - Policies restauradas';
END $$;
