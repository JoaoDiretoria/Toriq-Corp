-- ============================================================================
-- ROLLBACK: Reverter Correções de Segurança Fase 5
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- ============================================================================

-- ============================================================================
-- GRUPO 1: VIEW ATIVIDADES_UNIFICADAS
-- Recriar com SECURITY DEFINER (estado original)
-- ============================================================================

DROP VIEW IF EXISTS public.atividades_unificadas;

CREATE VIEW public.atividades_unificadas
WITH (security_invoker = false)
AS
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
FROM ((funil_card_atividades a
    JOIN funil_cards c ON ((c.id = a.card_id)))
    JOIN funis f ON ((f.id = c.funil_id)))
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
FROM (prospeccao_atividades a
    JOIN prospeccao_cards c ON ((c.id = a.card_id)))
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
FROM (closer_atividades a
    JOIN closer_cards c ON ((c.id = a.card_id)))
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
FROM (pos_venda_atividades a
    JOIN pos_venda_cards c ON ((c.id = a.card_id)))
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
FROM (cross_selling_atividades a
    JOIN cross_selling_cards c ON ((c.id = a.card_id)));

-- ============================================================================
-- GRUPO 2: COLABORADORES_TREINAMENTOS_DATAS
-- Restaurar policies vulneráveis originais
-- ============================================================================

DROP POLICY IF EXISTS "Criar colaboradores_treinamentos_datas da empresa" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "Atualizar colaboradores_treinamentos_datas da empresa" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "Deletar colaboradores_treinamentos_datas da empresa" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "Ler colaboradores_treinamentos_datas da empresa" ON public.colaboradores_treinamentos_datas;

CREATE POLICY "Criar colaboradores_treinamentos_datas" 
    ON public.colaboradores_treinamentos_datas FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Deletar colaboradores_treinamentos_datas" 
    ON public.colaboradores_treinamentos_datas FOR DELETE TO authenticated 
    USING (true);

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 5
-- 2. Execute via MCP ou Supabase SQL Editor
-- ============================================================================
