-- Função SECURITY DEFINER para obter empresa_id do usuário atual (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id 
  FROM public.profiles 
  WHERE id = _user_id
  LIMIT 1
$$;

-- Remover política problemática que causa recursão infinita
DROP POLICY IF EXISTS "Empresa SST pode ver perfis dos seus clientes" ON public.profiles;

-- Criar nova política usando a função SECURITY DEFINER
CREATE POLICY "Empresa SST pode ver perfis dos seus clientes"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'empresa_sst'::app_role) AND 
  empresa_id IN (
    SELECT cliente_empresa_id 
    FROM clientes_sst 
    WHERE empresa_sst_id = public.get_user_empresa_id(auth.uid())
  )
);