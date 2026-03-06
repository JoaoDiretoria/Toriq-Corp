-- Adicionar coluna grupo_acesso na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grupo_acesso TEXT;

-- Comentário explicativo
COMMENT ON COLUMN profiles.grupo_acesso IS 'Grupo de acesso do usuário: administrador, gestor ou colaborador';

-- Garantir que a política de INSERT existe para profiles
DO $$
BEGIN
    -- Verificar se a política já existe antes de criar
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Garantir que a política de UPDATE existe para profiles (para usuários da mesma empresa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update profiles in same company'
    ) THEN
        CREATE POLICY "Users can update profiles in same company" ON profiles
            FOR UPDATE USING (
                empresa_id IN (
                    SELECT empresa_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END $$;
