-- Migration: Notificações com Hierarquia
-- Data: 2026-01-30
-- Descrição: Implementa hierarquia nas notificações para que empresas SST vejam notificações de seus clientes e parceiras

-- Função para verificar se o usuário pode ver notificações de uma empresa
-- Respeita a hierarquia: SST vê notificações de seus clientes e parceiras
CREATE OR REPLACE FUNCTION public.pode_ver_notificacao_empresa(p_notificacao_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_empresa_id UUID;
  v_user_role TEXT;
  v_user_tipo tipo_empresa;
  v_notificacao_empresa_sst_pai UUID;
BEGIN
  -- Buscar dados do usuário atual
  SELECT empresa_id, role INTO v_user_empresa_id, v_user_role
  FROM profiles
  WHERE id = (SELECT auth.uid());
  
  -- Admin vertical vê tudo
  IF v_user_role = 'admin_vertical' THEN
    RETURN TRUE;
  END IF;
  
  -- Se a notificação é da própria empresa do usuário
  IF p_notificacao_empresa_id = v_user_empresa_id THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar tipo da empresa do usuário
  SELECT tipo INTO v_user_tipo FROM empresas WHERE id = v_user_empresa_id;
  
  -- Se o usuário é de uma empresa SST, pode ver notificações de:
  -- 1. Seus clientes finais (via clientes_sst)
  -- 2. Suas empresas parceiras (via empresas_parceiras)
  IF v_user_tipo = 'sst' THEN
    -- Verificar se a empresa da notificação é cliente desta SST
    IF EXISTS (
      SELECT 1 FROM clientes_sst 
      WHERE empresa_sst_id = v_user_empresa_id 
      AND cliente_empresa_id = p_notificacao_empresa_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Verificar se a empresa da notificação é parceira desta SST
    IF EXISTS (
      SELECT 1 FROM empresas_parceiras 
      WHERE empresa_sst_id = v_user_empresa_id 
      AND parceira_empresa_id = p_notificacao_empresa_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Caso contrário, não pode ver
  RETURN FALSE;
END;
$$;

-- Remover políticas antigas
DROP POLICY IF EXISTS "notificacoes_select_policy" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update_policy" ON notificacoes;
DROP POLICY IF EXISTS "Usuarios podem inserir notificacoes da propria empresa" ON notificacoes;

-- Criar nova política de SELECT com hierarquia
CREATE POLICY "notificacoes_select_hierarquia" ON notificacoes
FOR SELECT TO authenticated
USING (
  public.pode_ver_notificacao_empresa(empresa_id)
);

-- Criar nova política de UPDATE com hierarquia
CREATE POLICY "notificacoes_update_hierarquia" ON notificacoes
FOR UPDATE TO authenticated
USING (
  public.pode_ver_notificacao_empresa(empresa_id)
);

-- Criar nova política de INSERT (mantém lógica original - só pode inserir na própria empresa ou admin)
CREATE POLICY "notificacoes_insert_hierarquia" ON notificacoes
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin_vertical'
  OR empresa_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
  OR empresa_id IN (
    -- SST pode inserir notificações para seus clientes
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
  )
  OR empresa_id IN (
    -- SST pode inserir notificações para suas parceiras
    SELECT parceira_empresa_id FROM empresas_parceiras 
    WHERE empresa_sst_id = (SELECT empresa_id FROM profiles WHERE id = (SELECT auth.uid()))
  )
);

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.pode_ver_notificacao_empresa IS 'Verifica se o usuário atual pode ver notificações de uma empresa, respeitando a hierarquia SST > Cliente/Parceira';

-- Atualizar função criar_notificacao para também notificar a empresa SST pai
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_empresa_id UUID,
  p_tipo TEXT,
  p_categoria TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_usuario_id UUID DEFAULT NULL,
  p_usuario_nome TEXT DEFAULT NULL,
  p_modulo TEXT DEFAULT NULL,
  p_tela TEXT DEFAULT NULL,
  p_referencia_tipo TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_dados JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notificacao_id UUID;
  v_empresa_sst_pai UUID;
  v_empresa_tipo tipo_empresa;
BEGIN
  -- Criar notificação para a empresa original
  INSERT INTO notificacoes (
    empresa_id,
    usuario_id,
    usuario_nome,
    tipo,
    categoria,
    titulo,
    mensagem,
    modulo,
    tela,
    referencia_tipo,
    referencia_id,
    referencia_dados
  ) VALUES (
    p_empresa_id,
    p_usuario_id,
    p_usuario_nome,
    p_tipo,
    p_categoria,
    p_titulo,
    p_mensagem,
    p_modulo,
    p_tela,
    p_referencia_tipo,
    p_referencia_id,
    p_referencia_dados
  )
  RETURNING id INTO v_notificacao_id;
  
  -- Buscar tipo da empresa
  SELECT tipo INTO v_empresa_tipo FROM empresas WHERE id = p_empresa_id;
  
  -- Se a empresa é cliente_final ou empresa_parceira, também notificar a SST pai
  IF v_empresa_tipo IN ('cliente_final', 'empresa_parceira') THEN
    -- Buscar empresa SST pai
    v_empresa_sst_pai := get_empresa_sst_pai(p_empresa_id);
    
    -- Se encontrou SST pai e é diferente da empresa original, criar notificação para ela também
    IF v_empresa_sst_pai IS NOT NULL AND v_empresa_sst_pai != p_empresa_id THEN
      INSERT INTO notificacoes (
        empresa_id,
        usuario_id,
        usuario_nome,
        tipo,
        categoria,
        titulo,
        mensagem,
        modulo,
        tela,
        referencia_tipo,
        referencia_id,
        referencia_dados
      ) VALUES (
        v_empresa_sst_pai,
        p_usuario_id,
        p_usuario_nome,
        p_tipo,
        p_categoria,
        '[Cliente] ' || p_titulo,
        p_mensagem,
        p_modulo,
        p_tela,
        p_referencia_tipo,
        p_referencia_id,
        p_referencia_dados || jsonb_build_object('empresa_origem_id', p_empresa_id)
      );
    END IF;
  END IF;
  
  RETURN v_notificacao_id;
END;
$$;

COMMENT ON FUNCTION public.criar_notificacao IS 'Cria notificação para a empresa e também para a SST pai (se aplicável) respeitando hierarquia';
