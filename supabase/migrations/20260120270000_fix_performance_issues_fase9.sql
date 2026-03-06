-- ============================================================================
-- FASE 9: Otimização de Performance - Consolidação de Multiple Permissive Policies
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - Consolida ~50 policies duplicadas
-- - Melhora performance em queries com RLS
-- - SEM IMPACTO em funcionalidade (apenas performance)
-- ============================================================================

-- ============================================================================
-- LOTE 1: FUNIS - Consolidar DELETE duplicadas
-- ============================================================================

-- funis: 3 policies DELETE → 1 consolidada
DROP POLICY IF EXISTS "Admin pode excluir funis" ON public.funis;
DROP POLICY IF EXISTS "Empresas podem deletar seus funis" ON public.funis;
DROP POLICY IF EXISTS "Usuarios podem excluir funis da sua empresa" ON public.funis;

CREATE POLICY "delete_funis_consolidado" ON public.funis
    AS PERMISSIVE FOR DELETE TO public
    USING (
        -- Admin vertical pode excluir qualquer funil
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = 'admin_vertical'::app_role
        ))
        OR
        -- Usuário pode excluir funis da sua empresa
        (empresa_id IN (
            SELECT profiles.empresa_id
            FROM profiles
            WHERE profiles.id = (select auth.uid())
        ))
    );

-- funil_etapas: 3 policies DELETE → 1 consolidada
DROP POLICY IF EXISTS "Admin pode excluir etapas" ON public.funil_etapas;
DROP POLICY IF EXISTS "Empresas podem deletar etapas de seus funis" ON public.funil_etapas;
DROP POLICY IF EXISTS "Usuarios podem excluir etapas de funis da sua empresa" ON public.funil_etapas;

CREATE POLICY "delete_funil_etapas_consolidado" ON public.funil_etapas
    AS PERMISSIVE FOR DELETE TO public
    USING (
        -- Admin vertical pode excluir qualquer etapa
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = 'admin_vertical'::app_role
        ))
        OR
        -- Usuário pode excluir etapas de funis da sua empresa
        (funil_id IN (
            SELECT funis.id
            FROM funis
            WHERE funis.empresa_id IN (
                SELECT profiles.empresa_id
                FROM profiles
                WHERE profiles.id = (select auth.uid())
            )
        ))
    );

-- ============================================================================
-- LOTE 2: AVALIAÇÃO DE REAÇÃO - Consolidar SELECT redundantes
-- As policies com USING(true) para anon e authenticated já permitem acesso total
-- As outras policies são redundantes e podem ser removidas
-- ============================================================================

-- avaliacao_reacao_categorias: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todas categorias avaliacao reacao" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Cliente final pode ver categorias de avaliacao de reacao" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_categorias" ON public.avaliacao_reacao_categorias;
-- Manter: "Categorias visíveis publicamente" e "Categorias visíveis para usuários autenticados"

-- avaliacao_reacao_itens: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todos itens avaliacao reacao" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Cliente final pode ver itens de avaliacao de reacao" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_itens" ON public.avaliacao_reacao_itens;
-- Manter: "Itens visíveis publicamente" e "Itens visíveis para usuários autenticados"

-- avaliacao_reacao_modelos: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todos modelos avaliacao reacao" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Cliente final pode ver modelos de avaliacao de reacao" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_modelos" ON public.avaliacao_reacao_modelos;
-- Manter: "Modelos visíveis publicamente" e "Modelos visíveis para usuários autenticados"

-- avaliacao_reacao_opcoes_resposta: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todas opcoes avaliacao reacao" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Cliente final pode ver opcoes de avaliacao de reacao" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_opcoes_resposta" ON public.avaliacao_reacao_opcoes_resposta;
-- Manter: "Opções visíveis publicamente" e "Opções visíveis para usuários autenticados"

-- avaliacao_reacao_modelo_treinamentos: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todos modelo treinamentos avaliacao" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Cliente final pode ver modelo treinamentos avaliacao" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_modelo_treinamentos" ON public.avaliacao_reacao_modelo_treinamentos;
-- Manter: "Modelo treinamentos visíveis publicamente" e "Modelo treinamentos visíveis para usuários autenticados"

-- avaliacao_reacao_respostas: Manter apenas 2 policies (anon + authenticated)
DROP POLICY IF EXISTS "Admin pode ver todas avaliacoes de reacao" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Cliente final pode ver avaliacoes de reacao das suas turmas" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Instrutores podem ver avaliacao_reacao_respostas" ON public.avaliacao_reacao_respostas;
-- Manter: "Respostas visíveis publicamente para leitura" e "Respostas visíveis para usuários autenticados"

-- ============================================================================
-- LOTE 3: PROVAS - Consolidar SELECT redundantes
-- ============================================================================

-- provas_alternativas: Remover policies redundantes
DROP POLICY IF EXISTS "Admin pode ver todas provas_alternativas" ON public.provas_alternativas;
DROP POLICY IF EXISTS "Cliente final pode ver alternativas de provas das suas turmas" ON public.provas_alternativas;
DROP POLICY IF EXISTS "Instrutores podem ver alternativas" ON public.provas_alternativas;
-- Manter: "Alternativas de provas visíveis publicamente" e "Usuários podem ver alternativas..."

-- provas_questoes: Remover policies redundantes
DROP POLICY IF EXISTS "Admin pode ver todas provas_questoes" ON public.provas_questoes;
DROP POLICY IF EXISTS "Cliente final pode ver questoes de provas das suas turmas" ON public.provas_questoes;
DROP POLICY IF EXISTS "Instrutores podem ver questoes" ON public.provas_questoes;
-- Manter: "Questões de provas visíveis publicamente" e "Usuários podem ver questões..."

-- provas_treinamento: Remover policies redundantes
DROP POLICY IF EXISTS "Admin pode ver todas provas_treinamento" ON public.provas_treinamento;
DROP POLICY IF EXISTS "Cliente final pode ver provas de treinamentos das suas turmas" ON public.provas_treinamento;
DROP POLICY IF EXISTS "Instrutores podem ver provas_treinamento" ON public.provas_treinamento;
-- Manter: "Provas treinamento visíveis publicamente" e "Usuários podem ver provas..."

-- ============================================================================
-- LOTE 4: REORIENTAÇÕES - Consolidar SELECT redundantes
-- ============================================================================

-- reorientacoes_colaborador: Remover policies redundantes
DROP POLICY IF EXISTS "Admin pode ver todas reorientacoes" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Cliente final pode ver reorientacoes das suas turmas" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Instrutores podem ver reorientacoes" ON public.reorientacoes_colaborador;
-- Manter: "Reorientações visíveis publicamente para consulta" e "Reorientações visíveis para autenticados"

-- ============================================================================
-- LOTE 5: TURMA COLABORADOR PRESENÇAS - Consolidar SELECT redundantes
-- ============================================================================

-- turma_colaborador_presencas: Remover policies redundantes
DROP POLICY IF EXISTS "Admin pode ver todas presencas" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Cliente final pode ver presencas das suas turmas" ON public.turma_colaborador_presencas;
DROP POLICY IF EXISTS "Instrutores podem ver presencas turma" ON public.turma_colaborador_presencas;
-- Manter: "Presenças visíveis publicamente" e "Presenças visíveis para usuários autenticados"

-- ============================================================================
-- LOTE 6: DECLARAÇÕES REORIENTAÇÃO - Consolidar SELECT
-- ============================================================================

-- declaracoes_reorientacao: Consolidar 3 → 1
DROP POLICY IF EXISTS "Admin pode ver todas declaracoes reorientacao" ON public.declaracoes_reorientacao;
DROP POLICY IF EXISTS "Cliente final pode ver declaracoes de reorientacao" ON public.declaracoes_reorientacao;
DROP POLICY IF EXISTS "Empresa SST pode ver suas declarações" ON public.declaracoes_reorientacao;

CREATE POLICY "select_declaracoes_reorientacao_consolidado" ON public.declaracoes_reorientacao
    AS PERMISSIVE FOR SELECT TO public
    USING (
        -- Admin vertical pode ver todas
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = 'admin_vertical'::app_role
        ))
        OR
        -- Empresa SST pode ver suas declarações
        (empresa_id IN (
            SELECT profiles.empresa_id
            FROM profiles
            WHERE profiles.id = (select auth.uid())
        ))
        OR
        -- Cliente final pode ver declarações das turmas dos seus colaboradores
        (EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = (select auth.uid())
            AND p.role = 'cliente_final'::app_role
        ) AND treinamento_id IN (
            SELECT tt.treinamento_id
            FROM turmas_treinamento tt
            JOIN clientes_sst cs ON cs.id = tt.cliente_id
            WHERE cs.cliente_empresa_id = (
                SELECT profiles.empresa_id
                FROM profiles
                WHERE profiles.id = (select auth.uid())
            )
        ))
    );

-- ============================================================================
-- LOTE 7: FINANCEIRO CONTAS - Consolidar SELECT
-- ============================================================================

-- financeiro_contas: Consolidar 3 → 1
DROP POLICY IF EXISTS "Admin vertical pode ver todas as contas" ON public.financeiro_contas;
DROP POLICY IF EXISTS "Cliente final pode ver suas contas" ON public.financeiro_contas;
DROP POLICY IF EXISTS "Empresa SST pode ver suas contas" ON public.financeiro_contas;

CREATE POLICY "select_financeiro_contas_consolidado" ON public.financeiro_contas
    AS PERMISSIVE FOR SELECT TO public
    USING (
        -- Admin vertical pode ver todas
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = 'admin_vertical'::app_role
        ))
        OR
        -- Usuário pode ver contas da sua empresa
        (empresa_id IN (
            SELECT profiles.empresa_id
            FROM profiles
            WHERE profiles.id = (select auth.uid())
        ))
    );

-- ============================================================================
-- RESUMO FASE 9:
-- - ~35 policies removidas/consolidadas
-- - Funis: 6 → 2 policies
-- - Avaliação de Reação: 30 → 12 policies
-- - Provas: 15 → 6 policies
-- - Reorientações: 5 → 2 policies
-- - Presenças: 5 → 2 policies
-- - Declarações: 3 → 1 policy
-- - Financeiro: 3 → 1 policy
-- ============================================================================
