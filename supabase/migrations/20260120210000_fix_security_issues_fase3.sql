-- ============================================================================
-- MIGRAÇÃO: Correção de Issues de Segurança - Fase 3 (VERSÃO SEGURA)
-- Data: 20/01/2026
-- IMPORTANTE: Substitui apenas policies de INSERT/UPDATE/DELETE
--             NÃO toca nas policies de SELECT existentes
-- ============================================================================

-- ============================================================================
-- GRUPO 1: CONTAS A PAGAR (empresa_id disponível)
-- IMPACTO: Usuários só podem criar/editar/deletar contas da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes
-- ============================================================================

-- contas_pagar - Remover policies vulneráveis
DROP POLICY IF EXISTS "Usuários podem deletar contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem criar contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem atualizar contas_pagar" ON public.contas_pagar;

-- contas_pagar - Criar policies seguras separadas
CREATE POLICY "Criar contas_pagar da empresa"
    ON public.contas_pagar FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar contas_pagar da empresa"
    ON public.contas_pagar FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar contas_pagar da empresa"
    ON public.contas_pagar FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- contas_pagar_colunas - Remover policies vulneráveis
DROP POLICY IF EXISTS "Usuários podem deletar contas_pagar_colunas" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem criar contas_pagar_colunas" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem atualizar contas_pagar_colunas" ON public.contas_pagar_colunas;

-- contas_pagar_colunas - Criar policies seguras separadas
CREATE POLICY "Criar contas_pagar_colunas da empresa"
    ON public.contas_pagar_colunas FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar contas_pagar_colunas da empresa"
    ON public.contas_pagar_colunas FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar contas_pagar_colunas da empresa"
    ON public.contas_pagar_colunas FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================================
-- GRUPO 2: CROSS-SELLING (empresa_id disponível)
-- IMPACTO: Usuários só podem criar/editar/deletar cards da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes
-- ============================================================================

-- cross_selling_cards - Remover policies vulneráveis
DROP POLICY IF EXISTS "Permitir exclusão de cards cross_selling" ON public.cross_selling_cards;
DROP POLICY IF EXISTS "Permitir inserção de cards cross_selling" ON public.cross_selling_cards;
DROP POLICY IF EXISTS "Permitir atualização de cards cross_selling" ON public.cross_selling_cards;

-- cross_selling_cards - Criar policies seguras
CREATE POLICY "Criar cards cross_selling da empresa"
    ON public.cross_selling_cards FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar cards cross_selling da empresa"
    ON public.cross_selling_cards FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar cards cross_selling da empresa"
    ON public.cross_selling_cards FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- cross_selling_atividades - Remover policies vulneráveis
DROP POLICY IF EXISTS "Permitir exclusão de atividades cross_selling" ON public.cross_selling_atividades;
DROP POLICY IF EXISTS "Permitir inserção de atividades cross_selling" ON public.cross_selling_atividades;
DROP POLICY IF EXISTS "Permitir atualização de atividades cross_selling" ON public.cross_selling_atividades;

-- cross_selling_atividades - Criar policies seguras (via card_id)
CREATE POLICY "Criar atividades cross_selling da empresa"
    ON public.cross_selling_atividades FOR INSERT TO authenticated
    WITH CHECK (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Atualizar atividades cross_selling da empresa"
    ON public.cross_selling_atividades FOR UPDATE TO authenticated
    USING (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar atividades cross_selling da empresa"
    ON public.cross_selling_atividades FOR DELETE TO authenticated
    USING (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- cross_selling_colunas - Remover policies vulneráveis
DROP POLICY IF EXISTS "Permitir exclusão de colunas cross_selling" ON public.cross_selling_colunas;
DROP POLICY IF EXISTS "Permitir inserção de colunas cross_selling" ON public.cross_selling_colunas;
DROP POLICY IF EXISTS "Permitir atualização de colunas cross_selling" ON public.cross_selling_colunas;

-- cross_selling_colunas - Criar policies seguras
CREATE POLICY "Criar colunas cross_selling da empresa"
    ON public.cross_selling_colunas FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar colunas cross_selling da empresa"
    ON public.cross_selling_colunas FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar colunas cross_selling da empresa"
    ON public.cross_selling_colunas FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- cross_selling_etiquetas - Remover policies vulneráveis
DROP POLICY IF EXISTS "Permitir exclusão de etiquetas cross_selling" ON public.cross_selling_etiquetas;
DROP POLICY IF EXISTS "Permitir inserção de etiquetas cross_selling" ON public.cross_selling_etiquetas;
DROP POLICY IF EXISTS "Permitir atualização de etiquetas cross_selling" ON public.cross_selling_etiquetas;

-- cross_selling_etiquetas - Criar policies seguras
CREATE POLICY "Criar etiquetas cross_selling da empresa"
    ON public.cross_selling_etiquetas FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar etiquetas cross_selling da empresa"
    ON public.cross_selling_etiquetas FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar etiquetas cross_selling da empresa"
    ON public.cross_selling_etiquetas FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- cross_selling_card_etiquetas - Remover policies vulneráveis
DROP POLICY IF EXISTS "Permitir exclusão de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas;
DROP POLICY IF EXISTS "Permitir inserção de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas;

-- cross_selling_card_etiquetas - Criar policies seguras (via card_id)
CREATE POLICY "Criar card_etiquetas cross_selling da empresa"
    ON public.cross_selling_card_etiquetas FOR INSERT TO authenticated
    WITH CHECK (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar card_etiquetas cross_selling da empresa"
    ON public.cross_selling_card_etiquetas FOR DELETE TO authenticated
    USING (card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- ============================================================================
-- GRUPO 3: AVALIAÇÃO DE REAÇÃO (via modelo_id -> empresa_id)
-- IMPACTO: Usuários só podem criar/editar/deletar avaliações da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes (incluindo acesso público)
-- ============================================================================

-- avaliacao_reacao_modelos - Remover policies vulneráveis
DROP POLICY IF EXISTS "Deletar modelos autenticado" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Inserir modelos autenticado" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Atualizar modelos autenticado" ON public.avaliacao_reacao_modelos;

-- avaliacao_reacao_modelos - Criar policies seguras
CREATE POLICY "Criar modelos avaliacao da empresa"
    ON public.avaliacao_reacao_modelos FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar modelos avaliacao da empresa"
    ON public.avaliacao_reacao_modelos FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar modelos avaliacao da empresa"
    ON public.avaliacao_reacao_modelos FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- avaliacao_reacao_categorias - Remover policies vulneráveis
DROP POLICY IF EXISTS "Deletar categorias autenticado" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Inserir categorias autenticado" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Atualizar categorias autenticado" ON public.avaliacao_reacao_categorias;

-- avaliacao_reacao_categorias - Criar policies seguras (via modelo_id)
CREATE POLICY "Criar categorias avaliacao da empresa"
    ON public.avaliacao_reacao_categorias FOR INSERT TO authenticated
    WITH CHECK (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Atualizar categorias avaliacao da empresa"
    ON public.avaliacao_reacao_categorias FOR UPDATE TO authenticated
    USING (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar categorias avaliacao da empresa"
    ON public.avaliacao_reacao_categorias FOR DELETE TO authenticated
    USING (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- avaliacao_reacao_itens - Remover policies vulneráveis
DROP POLICY IF EXISTS "Deletar itens autenticado" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Inserir itens autenticado" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Atualizar itens autenticado" ON public.avaliacao_reacao_itens;

-- avaliacao_reacao_itens - Criar policies seguras (via categoria_id -> modelo_id)
CREATE POLICY "Criar itens avaliacao da empresa"
    ON public.avaliacao_reacao_itens FOR INSERT TO authenticated
    WITH CHECK (categoria_id IN (
        SELECT c.id FROM public.avaliacao_reacao_categorias c
        JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
        WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Atualizar itens avaliacao da empresa"
    ON public.avaliacao_reacao_itens FOR UPDATE TO authenticated
    USING (categoria_id IN (
        SELECT c.id FROM public.avaliacao_reacao_categorias c
        JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
        WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    ))
    WITH CHECK (categoria_id IN (
        SELECT c.id FROM public.avaliacao_reacao_categorias c
        JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
        WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Deletar itens avaliacao da empresa"
    ON public.avaliacao_reacao_itens FOR DELETE TO authenticated
    USING (categoria_id IN (
        SELECT c.id FROM public.avaliacao_reacao_categorias c
        JOIN public.avaliacao_reacao_modelos m ON c.modelo_id = m.id
        WHERE m.empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    ));

-- avaliacao_reacao_opcoes_resposta - NÃO ALTERAR (opções globais compartilhadas)
-- avaliacao_reacao_respostas - NÃO ALTERAR (alunos respondem via link público)

-- avaliacao_reacao_modelo_treinamentos - Remover policies vulneráveis
DROP POLICY IF EXISTS "Deletar modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Inserir modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Atualizar modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos;

-- avaliacao_reacao_modelo_treinamentos - Criar policies seguras (via modelo_id)
CREATE POLICY "Criar modelo_treinamentos da empresa"
    ON public.avaliacao_reacao_modelo_treinamentos FOR INSERT TO authenticated
    WITH CHECK (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Atualizar modelo_treinamentos da empresa"
    ON public.avaliacao_reacao_modelo_treinamentos FOR UPDATE TO authenticated
    USING (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar modelo_treinamentos da empresa"
    ON public.avaliacao_reacao_modelo_treinamentos FOR DELETE TO authenticated
    USING (modelo_id IN (SELECT id FROM public.avaliacao_reacao_modelos WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- ============================================================================
-- GRUPO 4: PROSPECÇÃO (via card_id -> empresa_id)
-- IMPACTO: Usuários só podem criar/editar/deletar prospecções da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes
-- ============================================================================

-- prospeccao_atividades - Remover policy vulnerável
DROP POLICY IF EXISTS "Usuarios podem inserir atividades" ON public.prospeccao_atividades;

-- prospeccao_atividades - Criar policies seguras (via card_id)
CREATE POLICY "Criar atividades prospecção da empresa"
    ON public.prospeccao_atividades FOR INSERT TO authenticated
    WITH CHECK (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Atualizar atividades prospecção da empresa"
    ON public.prospeccao_atividades FOR UPDATE TO authenticated
    USING (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar atividades prospecção da empresa"
    ON public.prospeccao_atividades FOR DELETE TO authenticated
    USING (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- prospeccao_etiquetas - Remover policies vulneráveis
DROP POLICY IF EXISTS "etiquetas_delete" ON public.prospeccao_etiquetas;
DROP POLICY IF EXISTS "etiquetas_insert" ON public.prospeccao_etiquetas;
DROP POLICY IF EXISTS "etiquetas_update" ON public.prospeccao_etiquetas;

-- prospeccao_etiquetas - Criar policies seguras
CREATE POLICY "Criar etiquetas prospecção da empresa"
    ON public.prospeccao_etiquetas FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar etiquetas prospecção da empresa"
    ON public.prospeccao_etiquetas FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar etiquetas prospecção da empresa"
    ON public.prospeccao_etiquetas FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- prospeccao_card_etiquetas - Remover policies vulneráveis
DROP POLICY IF EXISTS "card_etiquetas_delete" ON public.prospeccao_card_etiquetas;
DROP POLICY IF EXISTS "card_etiquetas_insert" ON public.prospeccao_card_etiquetas;

-- prospeccao_card_etiquetas - Criar policies seguras (via card_id)
CREATE POLICY "Criar card_etiquetas prospecção da empresa"
    ON public.prospeccao_card_etiquetas FOR INSERT TO authenticated
    WITH CHECK (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar card_etiquetas prospecção da empresa"
    ON public.prospeccao_card_etiquetas FOR DELETE TO authenticated
    USING (card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- ============================================================================
-- GRUPO 5: SOLICITAÇÕES DE TREINAMENTO
-- IMPACTO: Usuários só podem criar/editar/deletar solicitações da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes
-- ============================================================================

-- solicitacoes_treinamento - Remover policies vulneráveis
DROP POLICY IF EXISTS "Usuarios podem deletar solicitacoes" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "delete_policy" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "Usuarios podem criar solicitacoes" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "insert_policy" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "Usuarios podem atualizar solicitacoes" ON public.solicitacoes_treinamento;

-- solicitacoes_treinamento - Criar policies seguras
CREATE POLICY "Criar solicitacoes_treinamento da empresa"
    ON public.solicitacoes_treinamento FOR INSERT TO authenticated
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Atualizar solicitacoes_treinamento da empresa"
    ON public.solicitacoes_treinamento FOR UPDATE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Deletar solicitacoes_treinamento da empresa"
    ON public.solicitacoes_treinamento FOR DELETE TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================================
-- GRUPO 6: COLABORADORES E SINISTROS (via turma_id -> empresa_id)
-- IMPACTO: Usuários só podem criar/editar/deletar dados de turmas da SUA empresa
-- LEITURA: Mantida pelas policies de SELECT existentes
-- NOTA: Instrutores também podem gerenciar turmas onde são responsáveis
-- ============================================================================

-- colaboradores_temporarios - Remover policies vulneráveis
DROP POLICY IF EXISTS "Deletar colaborador temporário autenticado" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Inserir colaborador temporário autenticado" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Atualizar colaborador temporário autenticado" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Inserir colaborador temporário publicamente" ON public.colaboradores_temporarios;

-- colaboradores_temporarios - Criar policies seguras (via turma_id)
CREATE POLICY "Criar colaboradores_temporarios da empresa"
    ON public.colaboradores_temporarios FOR INSERT TO authenticated
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

CREATE POLICY "Atualizar colaboradores_temporarios da empresa"
    ON public.colaboradores_temporarios FOR UPDATE TO authenticated
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()))
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

CREATE POLICY "Deletar colaboradores_temporarios da empresa"
    ON public.colaboradores_temporarios FOR DELETE TO authenticated
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

-- colaboradores_temporarios - Manter inserção pública para links de presença
CREATE POLICY "Inserir colaborador temporário publicamente"
    ON public.colaboradores_temporarios FOR INSERT TO anon
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE permite_presenca_publica = true));

-- sinistros_colaborador - Remover policies vulneráveis
DROP POLICY IF EXISTS "sinistros_colaborador_delete" ON public.sinistros_colaborador;
DROP POLICY IF EXISTS "sinistros_colaborador_insert" ON public.sinistros_colaborador;
DROP POLICY IF EXISTS "sinistros_colaborador_update" ON public.sinistros_colaborador;

-- sinistros_colaborador - Criar policies seguras (via turma_id)
CREATE POLICY "Criar sinistros_colaborador da empresa"
    ON public.sinistros_colaborador FOR INSERT TO authenticated
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

CREATE POLICY "Atualizar sinistros_colaborador da empresa"
    ON public.sinistros_colaborador FOR UPDATE TO authenticated
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()))
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

CREATE POLICY "Deletar sinistros_colaborador da empresa"
    ON public.sinistros_colaborador FOR DELETE TO authenticated
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

-- sinistro_fotos - Remover policies vulneráveis
DROP POLICY IF EXISTS "sinistro_fotos_delete" ON public.sinistro_fotos;
DROP POLICY IF EXISTS "sinistro_fotos_insert" ON public.sinistro_fotos;

-- sinistro_fotos - Criar policies seguras (via sinistro_id -> turma_id)
CREATE POLICY "Criar sinistro_fotos da empresa"
    ON public.sinistro_fotos FOR INSERT TO authenticated
    WITH CHECK (sinistro_id IN (
        SELECT id FROM public.sinistros_colaborador 
        WHERE turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid())
    ));

CREATE POLICY "Deletar sinistro_fotos da empresa"
    ON public.sinistro_fotos FOR DELETE TO authenticated
    USING (sinistro_id IN (
        SELECT id FROM public.sinistros_colaborador 
        WHERE turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid())
    ));

-- reorientacoes_colaborador - Remover policies vulneráveis
DROP POLICY IF EXISTS "Inserir reorientação autenticado" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Atualizar reorientação autenticado" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Inserir reorientação publicamente" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Atualizar reorientação publicamente" ON public.reorientacoes_colaborador;

-- reorientacoes_colaborador - Criar policies seguras (via turma_id)
CREATE POLICY "Criar reorientacoes da empresa"
    ON public.reorientacoes_colaborador FOR INSERT TO authenticated
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

CREATE POLICY "Atualizar reorientacoes da empresa"
    ON public.reorientacoes_colaborador FOR UPDATE TO authenticated
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()))
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()) OR instrutor_id = auth.uid()));

-- reorientacoes_colaborador - Manter acesso público para links de reorientação
CREATE POLICY "Inserir reorientação publicamente"
    ON public.reorientacoes_colaborador FOR INSERT TO anon
    WITH CHECK (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE permite_prova_publica = true));

CREATE POLICY "Atualizar reorientação publicamente"
    ON public.reorientacoes_colaborador FOR UPDATE TO anon
    USING (turma_id IN (SELECT id FROM public.turmas_treinamento WHERE permite_prova_publica = true));

-- colaboradores_treinamentos_datas - Remover policies vulneráveis
DROP POLICY IF EXISTS "delete_policy" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "insert_policy" ON public.colaboradores_treinamentos_datas;

-- colaboradores_treinamentos_datas - Manter permissivo (não tem empresa_id direto)
CREATE POLICY "Criar colaboradores_treinamentos_datas"
    ON public.colaboradores_treinamentos_datas FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Deletar colaboradores_treinamentos_datas"
    ON public.colaboradores_treinamentos_datas FOR DELETE TO authenticated
    USING (true);

-- ============================================================================
-- GRUPO 7: OUTROS (mantém permissivo onde necessário)
-- ============================================================================

-- notificacoes - Sistema gera notificações para qualquer usuário
DROP POLICY IF EXISTS "notificacoes_insert_policy" ON public.notificacoes;

CREATE POLICY "Sistema pode inserir notificacoes"
    ON public.notificacoes FOR INSERT TO authenticated
    WITH CHECK (true);

-- closer_card_movimentacoes - Remover policy vulnerável
DROP POLICY IF EXISTS "Usuários autenticados podem inserir movimentações do closer" ON public.closer_card_movimentacoes;

-- closer_card_movimentacoes - Criar policies seguras (via card_id)
CREATE POLICY "Criar movimentacoes closer da empresa"
    ON public.closer_card_movimentacoes FOR INSERT TO authenticated
    WITH CHECK (card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Atualizar movimentacoes closer da empresa"
    ON public.closer_card_movimentacoes FOR UPDATE TO authenticated
    USING (card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Deletar movimentacoes closer da empresa"
    ON public.closer_card_movimentacoes FOR DELETE TO authenticated
    USING (card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())));

-- instrutor_solicitacao_perguntas - NÃO ALTERAR (formulário público)

-- ============================================================================
-- RESUMO FASE 3 (VERSÃO SEGURA):
-- - 6 grupos de tabelas corrigidos
-- - ~42 policies vulneráveis substituídas por restritivas
-- - Policies de SELECT NÃO foram tocadas (continuam funcionando)
-- - Mantidas policies públicas onde necessário (links de presença/prova)
-- - Cada operação (INSERT/UPDATE/DELETE) tem sua própria policy
-- ============================================================================
