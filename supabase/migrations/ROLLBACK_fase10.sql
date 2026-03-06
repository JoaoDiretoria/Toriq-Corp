-- =====================================================
-- ROLLBACK FASE 10: Reverter Correções de Segurança e Performance
-- Data: 21/01/2026
-- EXECUTAR APENAS SE HOUVER PROBLEMAS COM A FASE 10
-- =====================================================

-- =====================================================
-- PARTE 1: REVERTER POLÍTICAS DE SEGURANÇA
-- =====================================================

-- -----------------------------------------------------
-- 1.1 RESTAURAR policy original de instrutor_solicitacoes
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Acesso publico leitura via token" ON public.instrutor_solicitacoes;

CREATE POLICY "Acesso publico via token" ON public.instrutor_solicitacoes
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------
-- 1.2 RESTAURAR policy original de notificacoes
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Usuarios podem inserir notificacoes da propria empresa" ON public.notificacoes;

CREATE POLICY "Sistema pode inserir notificacoes" ON public.notificacoes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =====================================================
-- PARTE 2: REMOVER ÍNDICES CRIADOS
-- =====================================================

DROP INDEX IF EXISTS public.idx_contratos_parceiro_id;
DROP INDEX IF EXISTS public.idx_cross_selling_card_movimentacoes_card_id;
DROP INDEX IF EXISTS public.idx_frota_checklists_empresa_id;
DROP INDEX IF EXISTS public.idx_frota_custos_empresa_id;
DROP INDEX IF EXISTS public.idx_frota_documentos_empresa_id;
DROP INDEX IF EXISTS public.idx_frota_ocorrencias_empresa_id;
DROP INDEX IF EXISTS public.idx_frota_utilizacoes_funil_card_id;
DROP INDEX IF EXISTS public.idx_funil_card_comparacoes_empresa_id;
DROP INDEX IF EXISTS public.idx_instrutor_formacoes_certificado_empresa_id;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'ROLLBACK FASE 10 - Executado com sucesso!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Policies restauradas para estado anterior';
    RAISE NOTICE 'Índices removidos';
    RAISE NOTICE '=====================================================';
END $$;
