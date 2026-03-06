-- Habilitar RLS na tabela profiles se ainda não estiver habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy para usuários atualizarem seu próprio profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy para empresa_sst atualizar profiles de usuários da mesma empresa
DROP POLICY IF EXISTS "SST can update profiles in same company" ON public.profiles;
CREATE POLICY "SST can update profiles in same company" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('empresa_sst', 'admin_vertical')
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('empresa_sst', 'admin_vertical')
  )
);

-- Policy para admin_vertical atualizar qualquer profile
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
CREATE POLICY "Admin can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin_vertical'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin_vertical'
  )
);
