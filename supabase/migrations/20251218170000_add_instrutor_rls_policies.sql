-- =====================================================
-- POLÍTICAS RLS PARA INSTRUTOR VER SEUS DADOS
-- Permite que instrutores vejam suas formações e treinamentos
-- =====================================================

-- Políticas para instrutor_formacoes
DROP POLICY IF EXISTS "Instrutores podem ver suas formacoes" ON public.instrutor_formacoes;
CREATE POLICY "Instrutores podem ver suas formacoes"
  ON public.instrutor_formacoes FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

-- Políticas para instrutor_treinamentos
DROP POLICY IF EXISTS "Instrutores podem ver seus treinamentos" ON public.instrutor_treinamentos;
CREATE POLICY "Instrutores podem ver seus treinamentos"
  ON public.instrutor_treinamentos FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

-- Política para catalogo_treinamentos (para o JOIN funcionar)
DROP POLICY IF EXISTS "Instrutores podem ver catalogo de treinamentos" ON public.catalogo_treinamentos;
CREATE POLICY "Instrutores podem ver catalogo de treinamentos"
  ON public.catalogo_treinamentos FOR SELECT
  USING (
    empresa_id IN (SELECT empresa_id FROM public.instrutores WHERE user_id = auth.uid())
    OR
    id IN (SELECT treinamento_id FROM public.instrutor_treinamentos WHERE instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()))
  );
