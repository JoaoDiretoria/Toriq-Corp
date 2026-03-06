-- CORREÇÃO COMPLETA: Recriar todas as funções RLS com lógica correta
-- O problema é que as funções podem estar falhando silenciosamente

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

-- Função SIMPLIFICADA para verificar se usuário atual pode ver outro perfil
-- Regra: Todos da mesma empresa podem se ver (por enquanto, para evitar problemas)
CREATE OR REPLACE FUNCTION can_view_profile(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_my_id UUID;
  v_my_role TEXT;
  v_my_empresa UUID;
  v_target_empresa UUID;
BEGIN
  -- Obter dados do usuário atual
  SELECT user_id, user_role, user_empresa_id
  INTO v_my_id, v_my_role, v_my_empresa
  FROM get_my_profile_data();
  
  -- Se não conseguiu obter dados, negar acesso
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
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
  
  -- Usuários da mesma empresa podem se ver (simplificado para evitar bugs)
  IF v_my_empresa IS NOT NULL AND v_my_empresa = v_target_empresa THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função SIMPLIFICADA para verificar se usuário atual pode editar outro perfil
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
  
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
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
  
  -- Somente administrador pode editar outros da empresa
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função RESTRITIVA para verificar se usuário atual pode deletar outro perfil
-- SOMENTE admin_vertical e administrador podem deletar
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
  
  IF v_my_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- NUNCA pode deletar a si mesmo
  IF v_my_id = target_profile_id THEN
    RETURN FALSE;
  END IF;
  
  -- SOMENTE admin_vertical pode deletar
  IF v_my_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = target_profile_id;
  
  -- Se não é da mesma empresa, não pode deletar
  IF v_my_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- SOMENTE grupo_acesso = 'administrador' pode deletar
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  -- Ninguém mais pode deletar
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Garantir que as policies existem e estão corretas
DROP POLICY IF EXISTS "profiles_select_hierarchy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_hierarchy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_hierarchy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select_hierarchy" ON profiles
FOR SELECT TO authenticated
USING (can_view_profile(id));

CREATE POLICY "profiles_update_hierarchy" ON profiles
FOR UPDATE TO authenticated
USING (can_update_profile(id));

CREATE POLICY "profiles_delete_hierarchy" ON profiles
FOR DELETE TO authenticated
USING (can_delete_profile(id));

CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
