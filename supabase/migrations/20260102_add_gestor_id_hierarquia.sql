-- Adicionar coluna gestor_id na tabela profiles para hierarquia de subordinação
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Criar índice para melhor performance nas consultas de hierarquia
CREATE INDEX IF NOT EXISTS idx_profiles_gestor_id ON profiles(gestor_id);

-- Comentário explicativo
COMMENT ON COLUMN profiles.gestor_id IS 'ID do gestor direto do usuário para hierarquia de acesso';

-- Função para obter todos os subordinados de um usuário (recursivo)
CREATE OR REPLACE FUNCTION get_subordinados(p_user_id UUID)
RETURNS TABLE(subordinado_id UUID) AS $$
WITH RECURSIVE subordinados AS (
  -- Base: subordinados diretos
  SELECT id FROM profiles WHERE gestor_id = p_user_id
  UNION ALL
  -- Recursivo: subordinados dos subordinados
  SELECT p.id FROM profiles p
  INNER JOIN subordinados s ON p.gestor_id = s.id
)
SELECT id as subordinado_id FROM subordinados;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função para verificar se um usuário pode acessar dados de outro baseado na hierarquia
CREATE OR REPLACE FUNCTION pode_acessar_usuario(p_viewer_id UUID, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_viewer_grupo TEXT;
  v_viewer_empresa UUID;
  v_target_empresa UUID;
BEGIN
  -- Buscar informações do viewer
  SELECT grupo_acesso, empresa_id INTO v_viewer_grupo, v_viewer_empresa
  FROM profiles WHERE id = p_viewer_id;
  
  -- Buscar empresa do target
  SELECT empresa_id INTO v_target_empresa
  FROM profiles WHERE id = p_target_id;
  
  -- Se não são da mesma empresa, não pode acessar
  IF v_viewer_empresa IS DISTINCT FROM v_target_empresa THEN
    RETURN FALSE;
  END IF;
  
  -- Usuário sempre pode ver seus próprios dados
  IF p_viewer_id = p_target_id THEN
    RETURN TRUE;
  END IF;
  
  -- Administrador pode ver todos da empresa
  IF v_viewer_grupo = 'administrador' THEN
    RETURN TRUE;
  END IF;
  
  -- Gestor pode ver seus subordinados (diretos e indiretos)
  IF v_viewer_grupo = 'gestor' THEN
    RETURN EXISTS (
      SELECT 1 FROM get_subordinados(p_viewer_id) WHERE subordinado_id = p_target_id
    );
  END IF;
  
  -- Colaborador só vê a si mesmo (já tratado acima)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função para obter IDs de usuários que o usuário atual pode visualizar
CREATE OR REPLACE FUNCTION get_usuarios_visiveis(p_user_id UUID)
RETURNS TABLE(usuario_id UUID) AS $$
DECLARE
  v_grupo TEXT;
  v_empresa_id UUID;
BEGIN
  -- Buscar grupo e empresa do usuário
  SELECT grupo_acesso, empresa_id INTO v_grupo, v_empresa_id
  FROM profiles WHERE id = p_user_id;
  
  -- Administrador vê todos da empresa
  IF v_grupo = 'administrador' THEN
    RETURN QUERY SELECT id FROM profiles WHERE empresa_id = v_empresa_id;
  -- Gestor vê a si mesmo + subordinados
  ELSIF v_grupo = 'gestor' THEN
    RETURN QUERY 
      SELECT p_user_id
      UNION
      SELECT subordinado_id FROM get_subordinados(p_user_id);
  -- Colaborador só vê a si mesmo
  ELSE
    RETURN QUERY SELECT p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função auxiliar para verificar se usuário é admin_vertical ou administrador da empresa
CREATE OR REPLACE FUNCTION is_admin_or_empresa_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_grupo TEXT;
BEGIN
  SELECT role, grupo_acesso INTO v_role, v_grupo
  FROM profiles WHERE id = p_user_id;
  
  RETURN v_role = 'admin_vertical' OR v_grupo = 'administrador';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
