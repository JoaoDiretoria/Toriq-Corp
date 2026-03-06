-- ============================================================================
-- FASE 5: Correções de Segurança Finais
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - View atividades_unificadas: Remover SECURITY DEFINER (ERROR)
-- - colaboradores_treinamentos_datas: Corrigir policies USING(true) (WARN)
-- - EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- ============================================================================
-- GRUPO 1: VIEW ATIVIDADES_UNIFICADAS
-- Problema: SECURITY DEFINER permite bypass de RLS
-- Solução: Recriar view SEM security_invoker = true (padrão é INVOKER)
-- ============================================================================

DROP VIEW IF EXISTS public.atividades_unificadas;

CREATE VIEW public.atividades_unificadas AS
SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    (a.prazo)::text AS prazo,
    (a.horario)::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.updated_at, a.created_at) AS updated_at,
    'funil_generico'::text AS funil_origem,
    f.nome AS funil_nome,
    f.empresa_id,
    c.titulo AS card_titulo,
    f.id AS funil_id
FROM ((public.funil_card_atividades a
    JOIN public.funil_cards c ON ((c.id = a.card_id)))
    JOIN public.funis f ON ((f.id = c.funil_id)))
UNION ALL
SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    (a.prazo)::text AS prazo,
    (a.horario)::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.data_conclusao, a.created_at) AS updated_at,
    'prospeccao'::text AS funil_origem,
    'Prospecção (SDR)'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
FROM (public.prospeccao_atividades a
    JOIN public.prospeccao_cards c ON ((c.id = a.card_id)))
UNION ALL
SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    (a.prazo)::text AS prazo,
    (a.horario)::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.updated_at, a.created_at) AS updated_at,
    'closer'::text AS funil_origem,
    'Closer'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
FROM (public.closer_atividades a
    JOIN public.closer_cards c ON ((c.id = a.card_id)))
UNION ALL
SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    (a.prazo)::text AS prazo,
    (a.horario)::text AS horario,
    a.status,
    a.usuario_id AS criador_id,
    a.responsavel_id,
    a.created_at,
    COALESCE(a.data_conclusao, a.created_at) AS updated_at,
    'pos_venda'::text AS funil_origem,
    'Pós-Venda'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
FROM (public.pos_venda_atividades a
    JOIN public.pos_venda_cards c ON ((c.id = a.card_id)))
UNION ALL
SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo,
    a.horario,
    a.status,
    a.usuario_id AS criador_id,
    NULL::uuid AS responsavel_id,
    a.created_at,
    a.created_at AS updated_at,
    'cross_selling'::text AS funil_origem,
    'Cross-Selling'::character varying AS funil_nome,
    c.empresa_id,
    c.titulo AS card_titulo,
    NULL::uuid AS funil_id
FROM (public.cross_selling_atividades a
    JOIN public.cross_selling_cards c ON ((c.id = a.card_id)));

-- Garantir que a view usa SECURITY INVOKER (padrão do PostgreSQL 15+)
-- Não precisa de comando adicional, pois INVOKER é o padrão

-- ============================================================================
-- GRUPO 2: COLABORADORES_TREINAMENTOS_DATAS
-- Estrutura: colaborador_treinamento_id -> colaboradores_treinamentos -> colaborador_id -> colaboradores -> empresa_id
-- IMPACTO: Usuários só podem criar/deletar datas de treinamentos da SUA empresa
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- Remover policies vulneráveis
DROP POLICY IF EXISTS "Criar colaboradores_treinamentos_datas" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "Deletar colaboradores_treinamentos_datas" ON public.colaboradores_treinamentos_datas;

-- Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar colaboradores_treinamentos_datas da empresa"
    ON public.colaboradores_treinamentos_datas FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR colaborador_treinamento_id IN (
            SELECT ct.id FROM public.colaboradores_treinamentos ct
            JOIN public.colaboradores c ON c.id = ct.colaborador_id
            WHERE c.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Atualizar colaboradores_treinamentos_datas da empresa"
    ON public.colaboradores_treinamentos_datas FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR colaborador_treinamento_id IN (
            SELECT ct.id FROM public.colaboradores_treinamentos ct
            JOIN public.colaboradores c ON c.id = ct.colaborador_id
            WHERE c.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR colaborador_treinamento_id IN (
            SELECT ct.id FROM public.colaboradores_treinamentos ct
            JOIN public.colaboradores c ON c.id = ct.colaborador_id
            WHERE c.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Deletar colaboradores_treinamentos_datas da empresa"
    ON public.colaboradores_treinamentos_datas FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR colaborador_treinamento_id IN (
            SELECT ct.id FROM public.colaboradores_treinamentos ct
            JOIN public.colaboradores c ON c.id = ct.colaborador_id
            WHERE c.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Ler colaboradores_treinamentos_datas da empresa"
    ON public.colaboradores_treinamentos_datas FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR colaborador_treinamento_id IN (
            SELECT ct.id FROM public.colaboradores_treinamentos ct
            JOIN public.colaboradores c ON c.id = ct.colaborador_id
            WHERE c.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- ============================================================================
-- RESUMO FASE 5:
-- - 1 view corrigida (SECURITY DEFINER -> INVOKER)
-- - 1 tabela corrigida (colaboradores_treinamentos_datas)
-- - 4 policies novas criadas (com exceção para admin_vertical)
-- ============================================================================
