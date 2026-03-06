-- Corrigir profiles existentes de instrutores que foram criados com role errado
-- Atualizar para role 'instrutor' e primeiro_acesso = true

UPDATE public.profiles
SET role = 'instrutor', primeiro_acesso = true
WHERE email IN ('jhony@instrutor.com', 'joao2@gmai.com', 'maria@helena.com')
AND role != 'instrutor';
