-- Drop existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin vertical pode ver todos os perfis" ON public.profiles;

-- Recreate with explicit authentication check
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admin vertical pode ver todos os perfis" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin_vertical'::app_role));