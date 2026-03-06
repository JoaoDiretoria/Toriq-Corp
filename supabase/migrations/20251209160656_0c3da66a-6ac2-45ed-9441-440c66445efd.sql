-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;