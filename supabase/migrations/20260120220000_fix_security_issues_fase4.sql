-- ============================================================================
-- FASE 4: Correções de Segurança - Tabelas Restantes
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - 12 tabelas com policies vulneráveis (FOR ALL USING(true))
-- - Policies de SELECT NÃO serão alteradas
-- - Apenas INSERT/UPDATE/DELETE serão restringidos por empresa_id
-- - EXCEÇÃO: admin_vertical tem acesso total (sem empresa_id)
-- ============================================================================

-- ============================================================================
-- GRUPO 1: CLOSER (CRM de Vendas) - 6 tabelas
-- Estrutura: closer_cards tem empresa_id, outras via card_id
-- IMPACTO: Usuários só podem criar/editar/deletar cards do closer da SUA empresa
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- closer_cards - Remover policy vulnerável
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_cards;

-- closer_cards - Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar closer_cards da empresa"
    ON public.closer_cards FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Atualizar closer_cards da empresa"
    ON public.closer_cards FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Deletar closer_cards da empresa"
    ON public.closer_cards FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Ler closer_cards da empresa"
    ON public.closer_cards FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

-- closer_colunas - Remover policy vulnerável
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_colunas;

-- closer_colunas - Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar closer_colunas da empresa"
    ON public.closer_colunas FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Atualizar closer_colunas da empresa"
    ON public.closer_colunas FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Deletar closer_colunas da empresa"
    ON public.closer_colunas FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Ler closer_colunas da empresa"
    ON public.closer_colunas FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

-- closer_etiquetas - Remover policy vulnerável
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_etiquetas;

-- closer_etiquetas - Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar closer_etiquetas da empresa"
    ON public.closer_etiquetas FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Atualizar closer_etiquetas da empresa"
    ON public.closer_etiquetas FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Deletar closer_etiquetas da empresa"
    ON public.closer_etiquetas FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Ler closer_etiquetas da empresa"
    ON public.closer_etiquetas FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

-- closer_modelos_atividade - Remover policy vulnerável
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_modelos_atividade;

-- closer_modelos_atividade - Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar closer_modelos_atividade da empresa"
    ON public.closer_modelos_atividade FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Atualizar closer_modelos_atividade da empresa"
    ON public.closer_modelos_atividade FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Deletar closer_modelos_atividade da empresa"
    ON public.closer_modelos_atividade FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Ler closer_modelos_atividade da empresa"
    ON public.closer_modelos_atividade FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

-- closer_atividades - Remover policy vulnerável (via card_id)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_atividades;

-- closer_atividades - Criar policies seguras (via card_id -> empresa_id, com exceção para admin_vertical)
CREATE POLICY "Criar closer_atividades da empresa"
    ON public.closer_atividades FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Atualizar closer_atividades da empresa"
    ON public.closer_atividades FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar closer_atividades da empresa"
    ON public.closer_atividades FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Ler closer_atividades da empresa"
    ON public.closer_atividades FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- closer_card_etiquetas - Remover policy vulnerável (via card_id)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_card_etiquetas;

-- closer_card_etiquetas - Criar policies seguras (via card_id -> empresa_id, com exceção para admin_vertical)
CREATE POLICY "Criar closer_card_etiquetas da empresa"
    ON public.closer_card_etiquetas FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar closer_card_etiquetas da empresa"
    ON public.closer_card_etiquetas FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Ler closer_card_etiquetas da empresa"
    ON public.closer_card_etiquetas FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- ============================================================================
-- GRUPO 2: CONTAS A PAGAR (Atividades e Movimentações)
-- Estrutura: via conta_id -> contas_pagar -> empresa_id
-- IMPACTO: Usuários só podem criar/editar/deletar atividades de contas da SUA empresa
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- contas_pagar_atividades - Remover policy vulnerável
DROP POLICY IF EXISTS "contas_pagar_atividades_all" ON public.contas_pagar_atividades;

-- contas_pagar_atividades - Criar policies seguras (via conta_id, com exceção para admin_vertical)
CREATE POLICY "Criar contas_pagar_atividades da empresa"
    ON public.contas_pagar_atividades FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Atualizar contas_pagar_atividades da empresa"
    ON public.contas_pagar_atividades FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar contas_pagar_atividades da empresa"
    ON public.contas_pagar_atividades FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Ler contas_pagar_atividades da empresa"
    ON public.contas_pagar_atividades FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- contas_pagar_movimentacoes - Remover policy vulnerável
DROP POLICY IF EXISTS "contas_pagar_movimentacoes_all" ON public.contas_pagar_movimentacoes;

-- contas_pagar_movimentacoes - Criar policies seguras (via conta_id, com exceção para admin_vertical)
CREATE POLICY "Criar contas_pagar_movimentacoes da empresa"
    ON public.contas_pagar_movimentacoes FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Atualizar contas_pagar_movimentacoes da empresa"
    ON public.contas_pagar_movimentacoes FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar contas_pagar_movimentacoes da empresa"
    ON public.contas_pagar_movimentacoes FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Ler contas_pagar_movimentacoes da empresa"
    ON public.contas_pagar_movimentacoes FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- ============================================================================
-- GRUPO 3: AVALIAÇÃO DE REAÇÃO (Opções e Respostas)
-- Estrutura: opcoes via categoria_id, respostas via modelo_id/turma_id
-- IMPACTO: Manter INSERT público para formulários, restringir UPDATE/DELETE
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- avaliacao_reacao_opcoes_resposta - Remover policies vulneráveis
DROP POLICY IF EXISTS "Atualizar opções autenticado" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Deletar opções autenticado" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Inserir opções autenticado" ON public.avaliacao_reacao_opcoes_resposta;

-- avaliacao_reacao_opcoes_resposta - Criar policies seguras (via categoria_id -> modelo_id -> empresa_id, com exceção para admin_vertical)
CREATE POLICY "Criar opcoes_resposta da empresa"
    ON public.avaliacao_reacao_opcoes_resposta FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR categoria_id IN (
            SELECT c.id FROM public.avaliacao_reacao_categorias c
            JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
            WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Atualizar opcoes_resposta da empresa"
    ON public.avaliacao_reacao_opcoes_resposta FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR categoria_id IN (
            SELECT c.id FROM public.avaliacao_reacao_categorias c
            JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
            WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR categoria_id IN (
            SELECT c.id FROM public.avaliacao_reacao_categorias c
            JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
            WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Deletar opcoes_resposta da empresa"
    ON public.avaliacao_reacao_opcoes_resposta FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR categoria_id IN (
            SELECT c.id FROM public.avaliacao_reacao_categorias c
            JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
            WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- avaliacao_reacao_respostas - Remover policies vulneráveis de escrita
DROP POLICY IF EXISTS "Atualizar respostas autenticado" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Deletar respostas autenticado" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Inserir respostas autenticado" ON public.avaliacao_reacao_respostas;
-- MANTER: "Inserir respostas publicamente" - necessário para formulário público

-- avaliacao_reacao_respostas - Criar policies seguras (via modelo_id -> empresa_id, com exceção para admin_vertical)
CREATE POLICY "Criar respostas da empresa"
    ON public.avaliacao_reacao_respostas FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Atualizar respostas da empresa"
    ON public.avaliacao_reacao_respostas FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar respostas da empresa"
    ON public.avaliacao_reacao_respostas FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- ============================================================================
-- GRUPO 4: EMPRESA CONTATOS
-- Estrutura: tem empresa_id direto
-- IMPACTO: Usuários só podem gerenciar contatos da SUA empresa
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- empresa_contatos - Remover policy vulnerável
DROP POLICY IF EXISTS "Permitir acesso aos contatos de empresas" ON public.empresa_contatos;

-- empresa_contatos - Criar policies seguras (com exceção para admin_vertical)
CREATE POLICY "Criar empresa_contatos da empresa"
    ON public.empresa_contatos FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Atualizar empresa_contatos da empresa"
    ON public.empresa_contatos FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Deletar empresa_contatos da empresa"
    ON public.empresa_contatos FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Ler empresa_contatos da empresa"
    ON public.empresa_contatos FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- GRUPO 5: PROSPECÇÃO MOVIMENTAÇÕES
-- Estrutura: via card_id -> prospeccao_cards -> empresa_id
-- IMPACTO: Usuários só podem ver/criar movimentações de cards da SUA empresa
-- EXCEÇÃO: admin_vertical tem acesso total
-- ============================================================================

-- prospeccao_card_movimentacoes - Remover policy vulnerável
DROP POLICY IF EXISTS "Permitir acesso às movimentações de cards" ON public.prospeccao_card_movimentacoes;

-- prospeccao_card_movimentacoes - Criar policies seguras (via card_id, com exceção para admin_vertical)
CREATE POLICY "Criar prospeccao_card_movimentacoes da empresa"
    ON public.prospeccao_card_movimentacoes FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Atualizar prospeccao_card_movimentacoes da empresa"
    ON public.prospeccao_card_movimentacoes FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Deletar prospeccao_card_movimentacoes da empresa"
    ON public.prospeccao_card_movimentacoes FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Ler prospeccao_card_movimentacoes da empresa"
    ON public.prospeccao_card_movimentacoes FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_vertical'
        OR card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    );

-- ============================================================================
-- GRUPO 6: INSTRUTOR SOLICITAÇÕES (Formulário Público)
-- Estrutura: tem empresa_id e token para acesso público
-- IMPACTO: MANTER acesso público via token, restringir gerenciamento por empresa
-- NOTA: Esta tabela precisa de acesso público para o formulário de cadastro de instrutores
-- ============================================================================

-- instrutor_solicitacoes - NÃO ALTERAR
-- A policy "Acesso publico via token" é INTENCIONAL para permitir que candidatos
-- a instrutor preencham o formulário público. A empresa_id é definida pelo link gerado.
-- Alterar isso quebraria o fluxo de cadastro de instrutores.

-- ============================================================================
-- RESUMO FASE 4:
-- - 12 tabelas corrigidas (instrutor_solicitacoes mantida como está)
-- - ~48 policies novas criadas (com exceção para admin_vertical)
-- - Policies de SELECT incluídas onde não existiam
-- - Acesso público mantido onde necessário
-- - admin_vertical tem acesso TOTAL a todas as tabelas (sem restrição de empresa)
-- ============================================================================
