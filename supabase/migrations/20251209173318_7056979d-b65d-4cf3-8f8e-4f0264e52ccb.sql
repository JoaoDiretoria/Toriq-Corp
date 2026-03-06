-- Função SECURITY DEFINER para obter role do usuário (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Remover políticas problemáticas que usam has_role na tabela profiles
DROP POLICY IF EXISTS "Empresa SST pode ver perfis dos seus clientes" ON public.profiles;
DROP POLICY IF EXISTS "Admin vertical pode ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admin vertical pode atualizar perfis" ON public.profiles;

-- Recriar política SST usando get_user_role ao invés de has_role
CREATE POLICY "Empresa SST pode ver perfis dos seus clientes"
ON public.profiles
FOR SELECT
USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id IN (
    SELECT cliente_empresa_id 
    FROM clientes_sst 
    WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
  )
);

-- Recriar política Admin SELECT usando get_user_role
CREATE POLICY "Admin vertical pode ver todos os perfis"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role(auth.uid()) = 'admin_vertical'
);

-- Recriar política Admin UPDATE usando get_user_role
CREATE POLICY "Admin vertical pode atualizar perfis"
ON public.profiles
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin_vertical')
WITH CHECK (get_user_role(auth.uid()) = 'admin_vertical');