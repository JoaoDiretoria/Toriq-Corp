-- Função para deletar empresa e todos os dados relacionados (incluindo usuários do auth.users)
-- Esta função deve ser executada pelo admin_vertical apenas

CREATE OR REPLACE FUNCTION public.delete_empresa_cascade(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_nome TEXT;
  v_empresa_tipo TEXT;
  v_user_ids UUID[];
  v_user_count INT := 0;
  v_deleted_users INT := 0;
  v_current_user_role TEXT;
  v_user_id UUID;
BEGIN
  -- Verificar se o usuário atual é admin_vertical
  SELECT role INTO v_current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_current_user_role IS NULL OR v_current_user_role != 'admin_vertical' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Apenas administradores podem excluir empresas'
    );
  END IF;

  -- Buscar dados da empresa
  SELECT nome, tipo INTO v_empresa_nome, v_empresa_tipo
  FROM public.empresas
  WHERE id = p_empresa_id;
  
  IF v_empresa_nome IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Empresa não encontrada'
    );
  END IF;
  
  -- Não permitir excluir empresa vertical_on
  IF v_empresa_tipo = 'vertical_on' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não é possível excluir a empresa Vertical On'
    );
  END IF;

  -- Buscar todos os usuários da empresa
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM public.profiles
  WHERE empresa_id = p_empresa_id;
  
  v_user_count := COALESCE(array_length(v_user_ids, 1), 0);

  -- Deletar usuários do auth.users (isso vai cascade para profiles)
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      BEGIN
        DELETE FROM auth.users WHERE id = v_user_id;
        v_deleted_users := v_deleted_users + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Continuar mesmo se falhar em um usuário
        RAISE NOTICE 'Erro ao deletar usuário %: %', v_user_id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- Deletar a empresa (cascade vai cuidar das demais tabelas)
  DELETE FROM public.empresas WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Empresa "%s" excluída com sucesso', v_empresa_nome),
    'totalUsersDeleted', v_deleted_users,
    'empresa_nome', v_empresa_nome
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', format('Erro ao excluir empresa: %s', SQLERRM)
  );
END;
$$;

-- Dar permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.delete_empresa_cascade(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_empresa_cascade IS 'Deleta uma empresa e todos os dados relacionados incluindo usuários. Apenas admin_vertical pode executar.';
