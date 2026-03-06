-- RLS Policies para controle de acesso hierárquico
-- Administrador: vê todos da empresa
-- Gestor: vê a si mesmo + subordinados
-- Colaborador: vê apenas a si mesmo

-- Atualizar policy de SELECT em profiles para considerar hierarquia
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles based on hierarchy" ON profiles;

CREATE POLICY "Users can view profiles based on hierarchy" ON profiles
FOR SELECT TO authenticated
USING (
  -- Sempre pode ver o próprio perfil
  id = auth.uid()
  OR
  -- admin_vertical vê todos
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  OR
  -- Administrador da empresa vê todos da mesma empresa
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (grupo_acesso = 'administrador' OR (role = 'empresa_sst' AND setor_id IS NULL))
    )
  )
  OR
  -- Gestor vê seus subordinados (diretos e indiretos)
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND grupo_acesso = 'gestor'
    )
    AND id IN (SELECT subordinado_id FROM get_subordinados(auth.uid()))
  )
);

-- Policy para UPDATE em profiles considerando hierarquia
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles based on hierarchy" ON profiles;

CREATE POLICY "Users can update profiles based on hierarchy" ON profiles
FOR UPDATE TO authenticated
USING (
  -- Pode atualizar o próprio perfil
  id = auth.uid()
  OR
  -- admin_vertical pode atualizar todos
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  OR
  -- Administrador da empresa pode atualizar todos da mesma empresa
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (grupo_acesso = 'administrador' OR (role = 'empresa_sst' AND setor_id IS NULL))
    )
  )
  OR
  -- Gestor pode atualizar seus subordinados
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND grupo_acesso = 'gestor'
    )
    AND id IN (SELECT subordinado_id FROM get_subordinados(auth.uid()))
  )
);

-- Policy para DELETE em profiles considerando hierarquia
DROP POLICY IF EXISTS "Users can delete profiles based on hierarchy" ON profiles;

CREATE POLICY "Users can delete profiles based on hierarchy" ON profiles
FOR DELETE TO authenticated
USING (
  -- admin_vertical pode deletar todos
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  OR
  -- Administrador da empresa pode deletar todos da mesma empresa (exceto a si mesmo)
  (
    id != auth.uid()
    AND empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (grupo_acesso = 'administrador' OR (role = 'empresa_sst' AND setor_id IS NULL))
    )
  )
  OR
  -- Gestor pode deletar seus subordinados
  (
    empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND grupo_acesso = 'gestor'
    )
    AND id IN (SELECT subordinado_id FROM get_subordinados(auth.uid()))
  )
);

-- Função helper para verificar se usuário pode acessar registro baseado em criador/responsável
CREATE OR REPLACE FUNCTION pode_acessar_registro(
  p_criador_id UUID,
  p_responsavel_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_grupo TEXT;
  v_user_empresa UUID;
  v_criador_empresa UUID;
BEGIN
  -- Buscar informações do usuário atual
  SELECT role, grupo_acesso, empresa_id INTO v_user_role, v_user_grupo, v_user_empresa
  FROM profiles WHERE id = v_user_id;
  
  -- admin_vertical acessa tudo
  IF v_user_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar empresa do criador
  SELECT empresa_id INTO v_criador_empresa
  FROM profiles WHERE id = p_criador_id;
  
  -- Se não é da mesma empresa, não pode acessar
  IF v_user_empresa IS DISTINCT FROM v_criador_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- Usuário é o criador ou responsável
  IF v_user_id = p_criador_id OR v_user_id = p_responsavel_id THEN
    RETURN TRUE;
  END IF;
  
  -- Administrador da empresa pode acessar tudo da empresa
  IF v_user_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor pode acessar registros de subordinados
  IF v_user_grupo = 'gestor' THEN
    IF EXISTS (SELECT 1 FROM get_subordinados(v_user_id) WHERE subordinado_id = p_criador_id) THEN
      RETURN TRUE;
    END IF;
    IF p_responsavel_id IS NOT NULL AND EXISTS (SELECT 1 FROM get_subordinados(v_user_id) WHERE subordinado_id = p_responsavel_id) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Colaborador só acessa seus próprios registros (já tratado acima)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comentário explicativo sobre o sistema de hierarquia
COMMENT ON FUNCTION pode_acessar_registro IS 'Verifica se o usuário atual pode acessar um registro baseado na hierarquia: Administrador vê tudo da empresa, Gestor vê dele e subordinados, Colaborador só vê o próprio';
COMMENT ON FUNCTION get_subordinados IS 'Retorna todos os subordinados (diretos e indiretos) de um usuário';
COMMENT ON FUNCTION get_usuarios_visiveis IS 'Retorna todos os usuários que o usuário atual pode visualizar baseado na hierarquia';
