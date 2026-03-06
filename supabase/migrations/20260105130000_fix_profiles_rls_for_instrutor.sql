-- Permitir que empresas SST possam criar profiles para instrutores
-- Esta policy permite que usuários com role 'empresa_sst' ou 'admin_vertical' 
-- possam inserir novos profiles com role 'instrutor'

-- Permitir que usuários atualizem seu próprio profile (para primeiro_acesso)
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Primeiro, verificar se a policy já existe e removê-la se necessário
DROP POLICY IF EXISTS "empresa_sst_can_insert_instrutor_profiles" ON public.profiles;

-- Criar policy para permitir inserção de profiles de instrutores por empresas SST
CREATE POLICY "empresa_sst_can_insert_instrutor_profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- O usuário atual deve ter role empresa_sst ou admin_vertical
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('empresa_sst', 'admin_vertical')
    )
    -- E o novo profile deve ser do tipo instrutor
    AND role = 'instrutor'
  );

-- Também permitir update de profiles de instrutores por empresas SST
DROP POLICY IF EXISTS "empresa_sst_can_update_instrutor_profiles" ON public.profiles;

CREATE POLICY "empresa_sst_can_update_instrutor_profiles" ON public.profiles
  FOR UPDATE
  USING (
    -- O usuário atual deve ter role empresa_sst ou admin_vertical
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('empresa_sst', 'admin_vertical')
    )
    -- E o profile sendo atualizado deve ser do tipo instrutor
    AND role = 'instrutor'
  )
  WITH CHECK (
    -- O novo role deve continuar sendo instrutor
    role = 'instrutor'
  );
