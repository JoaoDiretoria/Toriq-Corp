-- Atualizar todos os profiles de instrutores para terem role 'instrutor'
-- Isso garante que instrutores cadastrados tenham acesso apenas às páginas de instrutor

UPDATE public.profiles
SET role = 'instrutor'
WHERE id IN (
  SELECT user_id 
  FROM public.instrutores 
  WHERE user_id IS NOT NULL
);

-- Comentário: Esta migration atualiza os profiles de todos os instrutores
-- que possuem user_id vinculado para terem o role 'instrutor',
-- garantindo que eles tenham acesso apenas ao dashboard de instrutor.
