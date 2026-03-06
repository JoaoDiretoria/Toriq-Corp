-- CORREÇÃO URGENTE: Restringir permissões de DELETE
-- O problema era que usuários empresa_sst sem grupo_acesso podiam deletar todos

-- Recriar função can_delete_profile com regras mais restritivas
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
  
  -- SOMENTE grupo_acesso = 'administrador' pode deletar (não mais empresa_sst sem grupo)
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor NÃO pode mais deletar subordinados (muito perigoso)
  -- Apenas visualizar e editar
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Também corrigir can_update_profile para ser mais restritivo
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
  
  -- SOMENTE grupo_acesso = 'administrador' pode editar outros (não mais empresa_sst sem grupo)
  IF v_my_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor pode editar subordinados
  IF v_my_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM get_subordinados(v_my_id) WHERE subordinado_id = target_profile_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
