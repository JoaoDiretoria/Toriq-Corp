-- Otimização de índices para melhorar performance das queries

-- Índice em profiles.empresa_id (muito usado nas políticas RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON profiles(empresa_id);

-- Índice em clientes_sst.empresa_sst_id (usado nas políticas RLS)
CREATE INDEX IF NOT EXISTS idx_clientes_sst_empresa_sst_id ON clientes_sst(empresa_sst_id);

-- Índice em colaboradores.empresa_id (filtro principal)
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON colaboradores(empresa_id);

-- Índice em colaboradores.ativo (filtro comum)
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON colaboradores(ativo);

-- Índice composto para colaboradores (empresa_id + ativo)
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_ativo ON colaboradores(empresa_id, ativo);

-- Índice em grupos_homogeneos.ativo (filtro comum)
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_ativo ON grupos_homogeneos(ativo);

-- Índice composto para grupos_homogeneos (empresa_id + ativo)
CREATE INDEX IF NOT EXISTS idx_grupos_homogeneos_empresa_ativo ON grupos_homogeneos(empresa_id, ativo);

-- Índice em catalogo_treinamentos para ordenação por norma
CREATE INDEX IF NOT EXISTS idx_catalogo_treinamentos_empresa_norma ON catalogo_treinamentos(empresa_id, norma);

-- Otimizar função get_user_empresa_id com STABLE para cache
CREATE OR REPLACE FUNCTION get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Atualizar estatísticas das tabelas
ANALYZE profiles;
ANALYZE colaboradores;
ANALYZE grupos_homogeneos;
ANALYZE catalogo_treinamentos;
ANALYZE clientes_sst;
ANALYZE colaboradores_treinamentos;
ANALYZE grupos_homogeneos_treinamentos;
