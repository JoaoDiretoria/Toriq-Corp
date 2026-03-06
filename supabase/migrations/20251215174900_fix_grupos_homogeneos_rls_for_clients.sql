-- Ajustar RLS de grupos_homogeneos para permitir que clientes vejam grupos da empresa SST vinculada
-- IMPORTANTE: Usar get_user_empresa_id() (SECURITY DEFINER) para evitar recursão de RLS

-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Usuários podem ver grupos homogêneos da própria empresa" ON grupos_homogeneos;
DROP POLICY IF EXISTS "Usuários podem ver grupos homogêneos" ON grupos_homogeneos;

-- Criar nova política que permite:
-- 1. Usuários SST verem grupos da própria empresa
-- 2. Clientes verem grupos da empresa SST vinculada
CREATE POLICY "Usuários podem ver grupos homogêneos"
  ON grupos_homogeneos FOR SELECT
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    OR
    empresa_id IN (
      SELECT empresa_sst_id FROM clientes_sst 
      WHERE cliente_empresa_id = get_user_empresa_id(auth.uid())
    )
  );

-- Ajustar RLS de grupos_homogeneos_treinamentos para clientes também
DROP POLICY IF EXISTS "Usuários podem ver treinamentos de grupos homogêneos da própria empresa" ON grupos_homogeneos_treinamentos;
DROP POLICY IF EXISTS "Usuários podem ver treinamentos de grupos homogêneos" ON grupos_homogeneos_treinamentos;

CREATE POLICY "Usuários podem ver treinamentos de grupos homogêneos"
  ON grupos_homogeneos_treinamentos FOR SELECT
  USING (
    grupo_homogeneo_id IN (
      SELECT id FROM grupos_homogeneos 
      WHERE empresa_id = get_user_empresa_id(auth.uid())
      OR empresa_id IN (
        SELECT empresa_sst_id FROM clientes_sst 
        WHERE cliente_empresa_id = get_user_empresa_id(auth.uid())
      )
    )
  );

-- Ajustar RLS de catalogo_treinamentos para clientes verem treinamentos da SST
DROP POLICY IF EXISTS "Usuários podem ver treinamentos do catálogo" ON catalogo_treinamentos;
DROP POLICY IF EXISTS "Usuários autenticados podem ver treinamentos" ON catalogo_treinamentos;

CREATE POLICY "Usuários podem ver treinamentos do catálogo"
  ON catalogo_treinamentos FOR SELECT
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    OR
    empresa_id IN (
      SELECT empresa_sst_id FROM clientes_sst 
      WHERE cliente_empresa_id = get_user_empresa_id(auth.uid())
    )
  );
