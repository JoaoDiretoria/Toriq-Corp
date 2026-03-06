-- Corrigir erro "permission denied for table users" ao atualizar profiles
-- O problema ocorre porque a FK profiles.id -> auth.users(id) requer verificação
-- e usuários normais não têm permissão de SELECT em auth.users

-- Solução: Criar uma função SECURITY DEFINER para fazer o UPDATE de profiles
-- que executa com privilégios elevados

-- Função para atualizar profile de forma segura (bypassa problema de FK)
CREATE OR REPLACE FUNCTION update_profile_safe(
  p_profile_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_setor_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_grupo_acesso TEXT DEFAULT NULL,
  p_gestor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_id UUID;
  v_current_role TEXT;
  v_current_grupo TEXT;
  v_current_empresa UUID;
  v_target_empresa UUID;
BEGIN
  -- Obter usuário atual
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter dados do usuário atual
  SELECT role, grupo_acesso, empresa_id 
  INTO v_current_role, v_current_grupo, v_current_empresa
  FROM profiles WHERE id = v_current_user_id;
  
  -- Obter empresa do target
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = p_profile_id;
  
  -- Verificar permissões
  -- 1. Usuário pode editar seu próprio perfil
  -- 2. admin_vertical pode editar qualquer um
  -- 3. administrador pode editar usuários da mesma empresa
  IF v_current_user_id != p_profile_id 
     AND v_current_role != 'admin_vertical'
     AND (v_current_grupo != 'administrador' OR v_current_empresa IS DISTINCT FROM v_target_empresa) THEN
    RAISE EXCEPTION 'Sem permissão para editar este usuário';
  END IF;
  
  -- Fazer o update
  UPDATE profiles SET
    nome = COALESCE(p_nome, nome),
    setor_id = CASE WHEN p_setor_id IS NOT NULL THEN p_setor_id ELSE setor_id END,
    role = CASE WHEN p_role IS NOT NULL THEN p_role::app_role ELSE role END,
    grupo_acesso = CASE WHEN p_grupo_acesso IS NOT NULL THEN p_grupo_acesso ELSE grupo_acesso END,
    gestor_id = CASE WHEN p_gestor_id IS NOT NULL THEN p_gestor_id ELSE gestor_id END,
    updated_at = NOW()
  WHERE id = p_profile_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION update_profile_safe TO authenticated;

-- Alternativa: Criar policy mais permissiva para UPDATE que não cause verificação de FK
-- Primeiro, remover policies conflitantes de UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "SST can update profiles in same company" ON profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "profiles_update_hierarchy" ON profiles;

-- Criar uma única policy de UPDATE simplificada
-- Usando SECURITY DEFINER function para evitar problema de FK
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (
  -- Próprio usuário
  id = auth.uid()
  OR
  -- admin_vertical
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  OR
  -- administrador da mesma empresa
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin_vertical' OR grupo_acesso = 'administrador')
    )
  )
);

-- Também precisamos garantir que o WITH CHECK seja compatível
-- Para UPDATE, o WITH CHECK verifica o novo valor após a atualização
