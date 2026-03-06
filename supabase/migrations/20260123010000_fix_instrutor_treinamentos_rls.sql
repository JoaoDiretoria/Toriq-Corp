-- =====================================================
-- CORREÇÃO RLS: Permitir INSERT em instrutor_treinamentos
-- Empresa SST precisa poder inserir treinamentos dos instrutores
-- =====================================================

-- Política de INSERT para empresa_sst
DROP POLICY IF EXISTS "Empresa SST pode inserir treinamentos de instrutores" ON public.instrutor_treinamentos;
CREATE POLICY "Empresa SST pode inserir treinamentos de instrutores"
  ON public.instrutor_treinamentos FOR INSERT
  WITH CHECK (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Política de UPDATE para empresa_sst
DROP POLICY IF EXISTS "Empresa SST pode atualizar treinamentos de instrutores" ON public.instrutor_treinamentos;
CREATE POLICY "Empresa SST pode atualizar treinamentos de instrutores"
  ON public.instrutor_treinamentos FOR UPDATE
  USING (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Política de DELETE para empresa_sst
DROP POLICY IF EXISTS "Empresa SST pode deletar treinamentos de instrutores" ON public.instrutor_treinamentos;
CREATE POLICY "Empresa SST pode deletar treinamentos de instrutores"
  ON public.instrutor_treinamentos FOR DELETE
  USING (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Política de SELECT para empresa_sst
DROP POLICY IF EXISTS "Empresa SST pode ver treinamentos de instrutores" ON public.instrutor_treinamentos;
CREATE POLICY "Empresa SST pode ver treinamentos de instrutores"
  ON public.instrutor_treinamentos FOR SELECT
  USING (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
