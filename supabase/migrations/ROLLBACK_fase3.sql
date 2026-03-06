-- ============================================================================
-- ROLLBACK: Reverter Correções de Segurança Fase 3 (VERSÃO SEGURA)
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- ============================================================================

-- ============================================================================
-- GRUPO 1: CONTAS A PAGAR
-- ============================================================================
DROP POLICY IF EXISTS "Criar contas_pagar da empresa" ON public.contas_pagar;
DROP POLICY IF EXISTS "Atualizar contas_pagar da empresa" ON public.contas_pagar;
DROP POLICY IF EXISTS "Deletar contas_pagar da empresa" ON public.contas_pagar;
CREATE POLICY "Usuários podem deletar contas_pagar" ON public.contas_pagar FOR DELETE TO authenticated USING (true);
CREATE POLICY "Usuários podem criar contas_pagar" ON public.contas_pagar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar contas_pagar" ON public.contas_pagar FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar contas_pagar_colunas da empresa" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Atualizar contas_pagar_colunas da empresa" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Deletar contas_pagar_colunas da empresa" ON public.contas_pagar_colunas;
CREATE POLICY "Usuários podem deletar contas_pagar_colunas" ON public.contas_pagar_colunas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Usuários podem criar contas_pagar_colunas" ON public.contas_pagar_colunas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários podem atualizar contas_pagar_colunas" ON public.contas_pagar_colunas FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- GRUPO 2: CROSS-SELLING
-- ============================================================================
DROP POLICY IF EXISTS "Criar cards cross_selling da empresa" ON public.cross_selling_cards;
DROP POLICY IF EXISTS "Atualizar cards cross_selling da empresa" ON public.cross_selling_cards;
DROP POLICY IF EXISTS "Deletar cards cross_selling da empresa" ON public.cross_selling_cards;
CREATE POLICY "Permitir exclusão de cards cross_selling" ON public.cross_selling_cards FOR DELETE TO authenticated USING (true);
CREATE POLICY "Permitir inserção de cards cross_selling" ON public.cross_selling_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de cards cross_selling" ON public.cross_selling_cards FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar atividades cross_selling da empresa" ON public.cross_selling_atividades;
DROP POLICY IF EXISTS "Atualizar atividades cross_selling da empresa" ON public.cross_selling_atividades;
DROP POLICY IF EXISTS "Deletar atividades cross_selling da empresa" ON public.cross_selling_atividades;
CREATE POLICY "Permitir exclusão de atividades cross_selling" ON public.cross_selling_atividades FOR DELETE TO authenticated USING (true);
CREATE POLICY "Permitir inserção de atividades cross_selling" ON public.cross_selling_atividades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de atividades cross_selling" ON public.cross_selling_atividades FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar colunas cross_selling da empresa" ON public.cross_selling_colunas;
DROP POLICY IF EXISTS "Atualizar colunas cross_selling da empresa" ON public.cross_selling_colunas;
DROP POLICY IF EXISTS "Deletar colunas cross_selling da empresa" ON public.cross_selling_colunas;
CREATE POLICY "Permitir exclusão de colunas cross_selling" ON public.cross_selling_colunas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Permitir inserção de colunas cross_selling" ON public.cross_selling_colunas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de colunas cross_selling" ON public.cross_selling_colunas FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar etiquetas cross_selling da empresa" ON public.cross_selling_etiquetas;
DROP POLICY IF EXISTS "Atualizar etiquetas cross_selling da empresa" ON public.cross_selling_etiquetas;
DROP POLICY IF EXISTS "Deletar etiquetas cross_selling da empresa" ON public.cross_selling_etiquetas;
CREATE POLICY "Permitir exclusão de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Permitir inserção de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar card_etiquetas cross_selling da empresa" ON public.cross_selling_card_etiquetas;
DROP POLICY IF EXISTS "Deletar card_etiquetas cross_selling da empresa" ON public.cross_selling_card_etiquetas;
CREATE POLICY "Permitir exclusão de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Permitir inserção de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- GRUPO 3: AVALIAÇÃO DE REAÇÃO
-- ============================================================================
DROP POLICY IF EXISTS "Criar modelos avaliacao da empresa" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Atualizar modelos avaliacao da empresa" ON public.avaliacao_reacao_modelos;
DROP POLICY IF EXISTS "Deletar modelos avaliacao da empresa" ON public.avaliacao_reacao_modelos;
CREATE POLICY "Deletar modelos autenticado" ON public.avaliacao_reacao_modelos FOR DELETE TO authenticated USING (true);
CREATE POLICY "Inserir modelos autenticado" ON public.avaliacao_reacao_modelos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar modelos autenticado" ON public.avaliacao_reacao_modelos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Criar categorias avaliacao da empresa" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Atualizar categorias avaliacao da empresa" ON public.avaliacao_reacao_categorias;
DROP POLICY IF EXISTS "Deletar categorias avaliacao da empresa" ON public.avaliacao_reacao_categorias;
CREATE POLICY "Deletar categorias autenticado" ON public.avaliacao_reacao_categorias FOR DELETE TO authenticated USING (true);
CREATE POLICY "Inserir categorias autenticado" ON public.avaliacao_reacao_categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar categorias autenticado" ON public.avaliacao_reacao_categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Criar itens avaliacao da empresa" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Atualizar itens avaliacao da empresa" ON public.avaliacao_reacao_itens;
DROP POLICY IF EXISTS "Deletar itens avaliacao da empresa" ON public.avaliacao_reacao_itens;
CREATE POLICY "Deletar itens autenticado" ON public.avaliacao_reacao_itens FOR DELETE TO authenticated USING (true);
CREATE POLICY "Inserir itens autenticado" ON public.avaliacao_reacao_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar itens autenticado" ON public.avaliacao_reacao_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Criar modelo_treinamentos da empresa" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Atualizar modelo_treinamentos da empresa" ON public.avaliacao_reacao_modelo_treinamentos;
DROP POLICY IF EXISTS "Deletar modelo_treinamentos da empresa" ON public.avaliacao_reacao_modelo_treinamentos;
CREATE POLICY "Deletar modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos FOR DELETE TO authenticated USING (true);
CREATE POLICY "Inserir modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar modelo treinamentos autenticado" ON public.avaliacao_reacao_modelo_treinamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- GRUPO 4: PROSPECÇÃO
-- ============================================================================
DROP POLICY IF EXISTS "Criar atividades prospecção da empresa" ON public.prospeccao_atividades;
DROP POLICY IF EXISTS "Atualizar atividades prospecção da empresa" ON public.prospeccao_atividades;
DROP POLICY IF EXISTS "Deletar atividades prospecção da empresa" ON public.prospeccao_atividades;
CREATE POLICY "Usuarios podem inserir atividades" ON public.prospeccao_atividades FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Criar etiquetas prospecção da empresa" ON public.prospeccao_etiquetas;
DROP POLICY IF EXISTS "Atualizar etiquetas prospecção da empresa" ON public.prospeccao_etiquetas;
DROP POLICY IF EXISTS "Deletar etiquetas prospecção da empresa" ON public.prospeccao_etiquetas;
CREATE POLICY "etiquetas_delete" ON public.prospeccao_etiquetas FOR DELETE TO authenticated USING (true);
CREATE POLICY "etiquetas_insert" ON public.prospeccao_etiquetas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "etiquetas_update" ON public.prospeccao_etiquetas FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar card_etiquetas prospecção da empresa" ON public.prospeccao_card_etiquetas;
DROP POLICY IF EXISTS "Deletar card_etiquetas prospecção da empresa" ON public.prospeccao_card_etiquetas;
CREATE POLICY "card_etiquetas_delete" ON public.prospeccao_card_etiquetas FOR DELETE TO authenticated USING (true);
CREATE POLICY "card_etiquetas_insert" ON public.prospeccao_card_etiquetas FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- GRUPO 5: SOLICITAÇÕES DE TREINAMENTO
-- ============================================================================
DROP POLICY IF EXISTS "Criar solicitacoes_treinamento da empresa" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "Atualizar solicitacoes_treinamento da empresa" ON public.solicitacoes_treinamento;
DROP POLICY IF EXISTS "Deletar solicitacoes_treinamento da empresa" ON public.solicitacoes_treinamento;
CREATE POLICY "Usuarios podem deletar solicitacoes" ON public.solicitacoes_treinamento FOR DELETE TO authenticated USING (true);
CREATE POLICY "Usuarios podem criar solicitacoes" ON public.solicitacoes_treinamento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios podem atualizar solicitacoes" ON public.solicitacoes_treinamento FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- GRUPO 6: COLABORADORES E SINISTROS
-- ============================================================================
DROP POLICY IF EXISTS "Criar colaboradores_temporarios da empresa" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Atualizar colaboradores_temporarios da empresa" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Deletar colaboradores_temporarios da empresa" ON public.colaboradores_temporarios;
DROP POLICY IF EXISTS "Inserir colaborador temporário publicamente" ON public.colaboradores_temporarios;
CREATE POLICY "Deletar colaborador temporário autenticado" ON public.colaboradores_temporarios FOR DELETE TO authenticated USING (true);
CREATE POLICY "Inserir colaborador temporário autenticado" ON public.colaboradores_temporarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserir colaborador temporário publicamente" ON public.colaboradores_temporarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Atualizar colaborador temporário autenticado" ON public.colaboradores_temporarios FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar sinistros_colaborador da empresa" ON public.sinistros_colaborador;
DROP POLICY IF EXISTS "Atualizar sinistros_colaborador da empresa" ON public.sinistros_colaborador;
DROP POLICY IF EXISTS "Deletar sinistros_colaborador da empresa" ON public.sinistros_colaborador;
CREATE POLICY "sinistros_colaborador_delete" ON public.sinistros_colaborador FOR DELETE TO authenticated USING (true);
CREATE POLICY "sinistros_colaborador_insert" ON public.sinistros_colaborador FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sinistros_colaborador_update" ON public.sinistros_colaborador FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Criar sinistro_fotos da empresa" ON public.sinistro_fotos;
DROP POLICY IF EXISTS "Deletar sinistro_fotos da empresa" ON public.sinistro_fotos;
CREATE POLICY "sinistro_fotos_delete" ON public.sinistro_fotos FOR DELETE TO authenticated USING (true);
CREATE POLICY "sinistro_fotos_insert" ON public.sinistro_fotos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Criar reorientacoes da empresa" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Atualizar reorientacoes da empresa" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Inserir reorientação publicamente" ON public.reorientacoes_colaborador;
DROP POLICY IF EXISTS "Atualizar reorientação publicamente" ON public.reorientacoes_colaborador;
CREATE POLICY "Inserir reorientação autenticado" ON public.reorientacoes_colaborador FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserir reorientação publicamente" ON public.reorientacoes_colaborador FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Atualizar reorientação autenticado" ON public.reorientacoes_colaborador FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Atualizar reorientação publicamente" ON public.reorientacoes_colaborador FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "Criar colaboradores_treinamentos_datas" ON public.colaboradores_treinamentos_datas;
DROP POLICY IF EXISTS "Deletar colaboradores_treinamentos_datas" ON public.colaboradores_treinamentos_datas;
CREATE POLICY "delete_policy" ON public.colaboradores_treinamentos_datas FOR DELETE TO authenticated USING (true);
CREATE POLICY "insert_policy" ON public.colaboradores_treinamentos_datas FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- GRUPO 7: OUTROS
-- ============================================================================
DROP POLICY IF EXISTS "Sistema pode inserir notificacoes" ON public.notificacoes;
CREATE POLICY "notificacoes_insert_policy" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Criar movimentacoes closer da empresa" ON public.closer_card_movimentacoes;
DROP POLICY IF EXISTS "Atualizar movimentacoes closer da empresa" ON public.closer_card_movimentacoes;
DROP POLICY IF EXISTS "Deletar movimentacoes closer da empresa" ON public.closer_card_movimentacoes;
CREATE POLICY "Usuários autenticados podem inserir movimentações do closer" ON public.closer_card_movimentacoes FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 3
-- 2. Execute via MCP ou Supabase SQL Editor
-- 3. Se precisar de rollback, execute:
--    mcp1_execute_sql(project_id="xraggzqaddfiymqgrtha", query="<conteúdo deste arquivo>")
-- ============================================================================
