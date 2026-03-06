-- ============================================================================
-- ROLLBACK: Reverter Correções de Segurança Fase 4
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- NOTA: Este rollback remove as policies com exceção admin_vertical e restaura
--       as policies originais (FOR ALL USING(true))
-- ============================================================================

-- ============================================================================
-- GRUPO 1: CLOSER (CRM de Vendas)
-- ============================================================================

-- closer_cards
DROP POLICY IF EXISTS "Criar closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Atualizar closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Deletar closer_cards da empresa" ON public.closer_cards;
DROP POLICY IF EXISTS "Ler closer_cards da empresa" ON public.closer_cards;
CREATE POLICY "Allow all for authenticated users" ON public.closer_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closer_colunas
DROP POLICY IF EXISTS "Criar closer_colunas da empresa" ON public.closer_colunas;
DROP POLICY IF EXISTS "Atualizar closer_colunas da empresa" ON public.closer_colunas;
DROP POLICY IF EXISTS "Deletar closer_colunas da empresa" ON public.closer_colunas;
DROP POLICY IF EXISTS "Ler closer_colunas da empresa" ON public.closer_colunas;
CREATE POLICY "Allow all for authenticated users" ON public.closer_colunas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closer_etiquetas
DROP POLICY IF EXISTS "Criar closer_etiquetas da empresa" ON public.closer_etiquetas;
DROP POLICY IF EXISTS "Atualizar closer_etiquetas da empresa" ON public.closer_etiquetas;
DROP POLICY IF EXISTS "Deletar closer_etiquetas da empresa" ON public.closer_etiquetas;
DROP POLICY IF EXISTS "Ler closer_etiquetas da empresa" ON public.closer_etiquetas;
CREATE POLICY "Allow all for authenticated users" ON public.closer_etiquetas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closer_modelos_atividade
DROP POLICY IF EXISTS "Criar closer_modelos_atividade da empresa" ON public.closer_modelos_atividade;
DROP POLICY IF EXISTS "Atualizar closer_modelos_atividade da empresa" ON public.closer_modelos_atividade;
DROP POLICY IF EXISTS "Deletar closer_modelos_atividade da empresa" ON public.closer_modelos_atividade;
DROP POLICY IF EXISTS "Ler closer_modelos_atividade da empresa" ON public.closer_modelos_atividade;
CREATE POLICY "Allow all for authenticated users" ON public.closer_modelos_atividade FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closer_atividades
DROP POLICY IF EXISTS "Criar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Atualizar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Deletar closer_atividades da empresa" ON public.closer_atividades;
DROP POLICY IF EXISTS "Ler closer_atividades da empresa" ON public.closer_atividades;
CREATE POLICY "Allow all for authenticated users" ON public.closer_atividades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closer_card_etiquetas
DROP POLICY IF EXISTS "Criar closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Deletar closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
DROP POLICY IF EXISTS "Ler closer_card_etiquetas da empresa" ON public.closer_card_etiquetas;
CREATE POLICY "Allow all for authenticated users" ON public.closer_card_etiquetas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- GRUPO 2: CONTAS A PAGAR (Atividades e Movimentações)
-- ============================================================================

-- contas_pagar_atividades
DROP POLICY IF EXISTS "Criar contas_pagar_atividades da empresa" ON public.contas_pagar_atividades;
DROP POLICY IF EXISTS "Atualizar contas_pagar_atividades da empresa" ON public.contas_pagar_atividades;
DROP POLICY IF EXISTS "Deletar contas_pagar_atividades da empresa" ON public.contas_pagar_atividades;
DROP POLICY IF EXISTS "Ler contas_pagar_atividades da empresa" ON public.contas_pagar_atividades;
CREATE POLICY "contas_pagar_atividades_all" ON public.contas_pagar_atividades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contas_pagar_movimentacoes
DROP POLICY IF EXISTS "Criar contas_pagar_movimentacoes da empresa" ON public.contas_pagar_movimentacoes;
DROP POLICY IF EXISTS "Atualizar contas_pagar_movimentacoes da empresa" ON public.contas_pagar_movimentacoes;
DROP POLICY IF EXISTS "Deletar contas_pagar_movimentacoes da empresa" ON public.contas_pagar_movimentacoes;
DROP POLICY IF EXISTS "Ler contas_pagar_movimentacoes da empresa" ON public.contas_pagar_movimentacoes;
CREATE POLICY "contas_pagar_movimentacoes_all" ON public.contas_pagar_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- GRUPO 3: AVALIAÇÃO DE REAÇÃO (Opções e Respostas)
-- ============================================================================

-- avaliacao_reacao_opcoes_resposta
DROP POLICY IF EXISTS "Criar opcoes_resposta da empresa" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Atualizar opcoes_resposta da empresa" ON public.avaliacao_reacao_opcoes_resposta;
DROP POLICY IF EXISTS "Deletar opcoes_resposta da empresa" ON public.avaliacao_reacao_opcoes_resposta;
CREATE POLICY "Inserir opções autenticado" ON public.avaliacao_reacao_opcoes_resposta FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar opções autenticado" ON public.avaliacao_reacao_opcoes_resposta FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar opções autenticado" ON public.avaliacao_reacao_opcoes_resposta FOR DELETE TO authenticated USING (true);

-- avaliacao_reacao_respostas
DROP POLICY IF EXISTS "Criar respostas da empresa" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Atualizar respostas da empresa" ON public.avaliacao_reacao_respostas;
DROP POLICY IF EXISTS "Deletar respostas da empresa" ON public.avaliacao_reacao_respostas;
CREATE POLICY "Inserir respostas autenticado" ON public.avaliacao_reacao_respostas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Atualizar respostas autenticado" ON public.avaliacao_reacao_respostas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Deletar respostas autenticado" ON public.avaliacao_reacao_respostas FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- GRUPO 4: EMPRESA CONTATOS
-- ============================================================================

-- empresa_contatos
DROP POLICY IF EXISTS "Criar empresa_contatos da empresa" ON public.empresa_contatos;
DROP POLICY IF EXISTS "Atualizar empresa_contatos da empresa" ON public.empresa_contatos;
DROP POLICY IF EXISTS "Deletar empresa_contatos da empresa" ON public.empresa_contatos;
DROP POLICY IF EXISTS "Ler empresa_contatos da empresa" ON public.empresa_contatos;
CREATE POLICY "Permitir acesso aos contatos de empresas" ON public.empresa_contatos FOR ALL TO authenticated USING (true);

-- ============================================================================
-- GRUPO 5: PROSPECÇÃO MOVIMENTAÇÕES
-- ============================================================================

-- prospeccao_card_movimentacoes
DROP POLICY IF EXISTS "Criar prospeccao_card_movimentacoes da empresa" ON public.prospeccao_card_movimentacoes;
DROP POLICY IF EXISTS "Atualizar prospeccao_card_movimentacoes da empresa" ON public.prospeccao_card_movimentacoes;
DROP POLICY IF EXISTS "Deletar prospeccao_card_movimentacoes da empresa" ON public.prospeccao_card_movimentacoes;
DROP POLICY IF EXISTS "Ler prospeccao_card_movimentacoes da empresa" ON public.prospeccao_card_movimentacoes;
CREATE POLICY "Permitir acesso às movimentações de cards" ON public.prospeccao_card_movimentacoes FOR ALL TO authenticated USING (true);

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 4
-- 2. Execute via MCP ou Supabase SQL Editor
-- 3. Se precisar de rollback, execute:
--    mcp1_execute_sql(project_id="xraggzqaddfiymqgrtha", query="<conteúdo deste arquivo>")
-- ============================================================================
