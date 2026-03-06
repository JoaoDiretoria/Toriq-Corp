-- Correção: Evitar recursão infinita nas RLS policies
-- O problema é que as policies consultam a tabela profiles, que tem RLS ativo

-- Primeiro, criar funções SECURITY DEFINER que bypassam o RLS

-- Função para obter dados do usuário atual (bypassa RLS)
CREATE OR REPLACE FUNCTION get_my_profile_data()
RETURNS TABLE(
  user_id UUID,
  user_role TEXT,
  user_grupo_acesso TEXT,
  user_empresa_id UUID,
  user_setor_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.role::TEXT,
    p.grupo_acesso,
    p.empresa_id,
    p.setor_id
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função para verificar se usuário atual pode ver outro perfil
CREATE OR REPLACE FUNCTION can_view_profile(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_grupo TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  -- Obter dados do usuário atual
  SELECT user_id, user_role, user_grupo_acesso, user_empresa_id
  INTO v_my_id, v_my_role, v_my_grupo, v_my_empresa
  FROM get_my_profile_data();
  
  -- Sempre pode ver o próprio perfil
  IF v_my_id = target_profile_id THEN
    RETURN TRUE;
  END IF;
  
  -- admin_vertical vê todos
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  -- Obter empresa do target
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = target_profile_id;
  
  -- Se não é da mesma empresa, não pode ver
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- Administrador da empresa vê todos da mesma empresa
  IF v_my_grupo = 'administrador' OR (v_my_role = 'empresa_sst' AND v_my_grupo IS NULL) THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor vê subordinados
  IF v_my_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM get_subordinados(v_my_id) WHERE subordinado_id = target_profile_id
    );
  END IF;
  
  -- Colaborador só vê a si mesmo (já tratado acima)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função para verificar se usuário atual pode editar outro perfil
CREATE OR REPLACE FUNCTION can_update_profile(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_grupo TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT user_id, user_role, user_grupo_acesso, user_empresa_id
  INTO v_my_id, v_my_role, v_my_grupo, v_my_empresa
  FROM get_my_profile_data();
  
  -- Sempre pode editar o próprio perfil
  IF v_my_id = target_profile_id THEN
    RETURN TRUE;
  END IF;
  
  -- admin_vertical edita todos
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = target_profile_id;
  
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- Administrador da empresa edita todos da mesma empresa
  IF v_my_grupo = 'administrador' OR (v_my_role = 'empresa_sst' AND v_my_grupo IS NULL) THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor edita subordinados
  IF v_my_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM get_subordinados(v_my_id) WHERE subordinado_id = target_profile_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função para verificar se usuário atual pode deletar outro perfil
CREATE OR REPLACE FUNCTION can_delete_profile(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_grupo TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  SELECT user_id, user_role, user_grupo_acesso, user_empresa_id
  INTO v_my_id, v_my_role, v_my_grupo, v_my_empresa
  FROM get_my_profile_data();
  
  -- Não pode deletar a si mesmo
  IF v_my_id = target_profile_id THEN
    RETURN FALSE;
  END IF;
  
  -- admin_vertical deleta todos
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = target_profile_id;
  
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- Administrador da empresa deleta todos da mesma empresa
  IF v_my_grupo = 'administrador' OR (v_my_role = 'empresa_sst' AND v_my_grupo IS NULL) THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor deleta subordinados
  IF v_my_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM get_subordinados(v_my_id) WHERE subordinado_id = target_profile_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Remover policies antigas que causam recursão
DROP POLICY IF EXISTS "Users can view profiles based on hierarchy" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles based on hierarchy" ON profiles;
DROP POLICY IF EXISTS "Users can delete profiles based on hierarchy" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles in same company" ON profiles;

-- Criar novas policies usando as funções SECURITY DEFINER
CREATE POLICY "profiles_select_hierarchy" ON profiles
FOR SELECT TO authenticated
USING (can_view_profile(id));

CREATE POLICY "profiles_update_hierarchy" ON profiles
FOR UPDATE TO authenticated
USING (can_update_profile(id));

CREATE POLICY "profiles_delete_hierarchy" ON profiles
FOR DELETE TO authenticated
USING (can_delete_profile(id));

-- Manter policy de INSERT (usuário pode inserir seu próprio perfil)
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
