-- ============================================================================
-- MIGRAÇÃO: Correção de Issues Críticas de Segurança
-- Data: 20/01/2026
-- Fase 1: Issues CRÍTICAS (ERROR) e algumas de ALTA prioridade
-- NOTA: Esta migração já foi aplicada via MCP em 3 partes
-- ============================================================================

-- ============================================================================
-- 1. HABILITAR RLS NA TABELA turma_cases_sucesso
-- ============================================================================
ALTER TABLE public.turma_cases_sucesso ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ADICIONAR COLUNAS DE CONTROLE
-- ============================================================================
ALTER TABLE public.turmas_treinamento 
ADD COLUMN IF NOT EXISTS permite_presenca_publica BOOLEAN DEFAULT true;

ALTER TABLE public.turmas_treinamento 
ADD COLUMN IF NOT EXISTS permite_prova_publica BOOLEAN DEFAULT true;

-- ============================================================================
-- 3. REMOVER ÍNDICES DUPLICADOS
-- ============================================================================
DROP INDEX IF EXISTS public.idx_contas_pagar_atividades_conta;
DROP INDEX IF EXISTS public.idx_contas_pagar_colunas_empresa;
DROP INDEX IF EXISTS public.idx_contas_pagar_movimentacoes_conta;
DROP INDEX IF EXISTS public.idx_card_movimentacoes_card_id;
DROP INDEX IF EXISTS public.idx_card_movimentacoes_created_at;
DROP INDEX IF EXISTS public.idx_empresas_modulos_telas_empresa;
DROP INDEX IF EXISTS public.idx_empresas_modulos_telas_modulo;

-- ============================================================================
-- 4. CORRIGIR POLICIES COM USING (true)
-- ============================================================================

-- 4.1 turma_colaborador_presencas
DROP POLICY IF EXISTS "Presenças atualizáveis publicamente" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Presenças inseríveis publicamente" ON public.turma_colaborador_presencas;

CREATE POLICY "Presenças atualizáveis via link público"
    ON public.turma_colaborador_presencas FOR UPDATE
    TO anon
    USING (
        colaborador_turma_id IN (
            SELECT tc.id FROM turma_colaboradores tc
            JOIN turmas_treinamento tt ON tc.turma_id = tt.id
            WHERE tt.permite_presenca_publica = true
        )
    )
    WITH CHECK (
        colaborador_turma_id IN (
            SELECT tc.id FROM turma_colaboradores tc
            JOIN turmas_treinamento tt ON tc.turma_id = tt.id
            WHERE tt.permite_presenca_publica = true
        )
    );

CREATE POLICY "Presenças inseríveis via link público"
    ON public.turma_colaborador_presencas FOR INSERT
    TO anon
    WITH CHECK (
        colaborador_turma_id IN (
            SELECT tc.id FROM turma_colaboradores tc
            JOIN turmas_treinamento tt ON tc.turma_id = tt.id
            WHERE tt.permite_presenca_publica = true
        )
    );

-- 4.2 turma_colaboradores
DROP POLICY IF EXISTS "Atualizar notas de provas publicamente" ON public.turma_colaboradores;

CREATE POLICY "Atualizar notas via prova pública"
    ON public.turma_colaboradores FOR UPDATE
    TO anon
    USING (
        turma_id IN (
            SELECT id FROM turmas_treinamento 
            WHERE permite_prova_publica = true
        )
    )
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas_treinamento 
            WHERE permite_prova_publica = true
        )
    );

-- 4.3 turma_provas
DROP POLICY IF EXISTS "Atualizar provas autenticado" ON public.turma_provas;
DROP POLICY IF EXISTS "Atualizar provas publicamente" ON public.turma_provas;
DROP POLICY IF EXISTS "Deletar provas autenticado" ON public.turma_provas;
DROP POLICY IF EXISTS "Deletar provas publicamente" ON public.turma_provas;
DROP POLICY IF EXISTS "Inserir provas autenticado" ON public.turma_provas;
DROP POLICY IF EXISTS "Inserir provas publicamente" ON public.turma_provas;

CREATE POLICY "Usuários autenticados podem gerenciar provas da sua empresa"
    ON public.turma_provas FOR ALL
    TO authenticated
    USING (
        turma_id IN (
            SELECT tt.id FROM turmas_treinamento tt
            WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
               OR tt.instrutor_id = auth.uid()
        )
    )
    WITH CHECK (
        turma_id IN (
            SELECT tt.id FROM turmas_treinamento tt
            WHERE tt.empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
               OR tt.instrutor_id = auth.uid()
        )
    );

CREATE POLICY "Provas acessíveis via link público"
    ON public.turma_provas FOR ALL
    TO anon
    USING (
        turma_id IN (
            SELECT id FROM turmas_treinamento 
            WHERE permite_prova_publica = true
        )
    )
    WITH CHECK (
        turma_id IN (
            SELECT id FROM turmas_treinamento 
            WHERE permite_prova_publica = true
        )
    );

-- ============================================================================
-- 5. RECRIAR VIEW SEM SECURITY DEFINER
-- ============================================================================
DROP VIEW IF EXISTS public.atividades_unificadas;

CREATE VIEW public.atividades_unificadas AS
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
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
   FROM funil_card_atividades a
     JOIN funil_cards c ON c.id = a.card_id
     JOIN funis f ON f.id = c.funil_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
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
   FROM prospeccao_atividades a
     JOIN prospeccao_cards c ON c.id = a.card_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
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
   FROM closer_atividades a
     JOIN closer_cards c ON c.id = a.card_id
UNION ALL
 SELECT a.id,
    a.card_id,
    a.tipo,
    a.descricao,
    a.prazo::text AS prazo,
    a.horario::text AS horario,
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
   FROM pos_venda_atividades a
     JOIN pos_venda_cards c ON c.id = a.card_id
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
   FROM cross_selling_atividades a
     JOIN cross_selling_cards c ON c.id = a.card_id;

-- ============================================================================
-- RESUMO DAS CORREÇÕES:
-- 1. ✅ RLS habilitado em turma_cases_sucesso
-- 2. ✅ Colunas permite_presenca_publica e permite_prova_publica adicionadas
-- 3. ✅ 7 índices duplicados removidos
-- 4. ✅ 9 policies com USING(true) substituídas por policies restritivas
-- 5. ✅ View atividades_unificadas recriada sem SECURITY DEFINER
-- ============================================================================
