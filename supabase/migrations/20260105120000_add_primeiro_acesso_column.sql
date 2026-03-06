-- Adicionar coluna primeiro_acesso na tabela profiles
-- Esta coluna indica se o usuário precisa trocar a senha no primeiro login
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'primeiro_acesso') THEN
        ALTER TABLE public.profiles ADD COLUMN primeiro_acesso BOOLEAN DEFAULT false;
    END IF;
END $$;
