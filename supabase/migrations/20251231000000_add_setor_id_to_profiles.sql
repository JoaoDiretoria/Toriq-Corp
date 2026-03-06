-- Adicionar coluna setor_id na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES setores(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_setor_id ON profiles(setor_id);
