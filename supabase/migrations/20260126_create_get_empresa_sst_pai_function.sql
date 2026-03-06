-- Criar função para retornar a empresa SST pai para herança de white label
-- Esta função é usada pelo sistema de White Label para determinar qual empresa SST
-- deve fornecer as configurações de estilo para empresas herdeiras (clientes, parceiras, instrutores)

CREATE OR REPLACE FUNCTION public.get_empresa_sst_pai(p_empresa_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo tipo_empresa;
  v_empresa_sst_id UUID;
BEGIN
  -- Buscar tipo da empresa
  SELECT tipo INTO v_tipo FROM empresas WHERE id = p_empresa_id;
  
  -- Se não encontrou a empresa, retornar NULL
  IF v_tipo IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Se é vertical_on (Toriq), não tem SST pai - usa tema padrão
  IF v_tipo = 'vertical_on' THEN
    RETURN NULL;
  END IF;
  
  -- Se é empresa_sst, ela mesma é a SST (retorna ela própria)
  IF v_tipo = 'sst' THEN
    RETURN p_empresa_id;
  END IF;
  
  -- Se é cliente_final, buscar via tabela clientes_sst
  IF v_tipo = 'cliente_final' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM clientes_sst
    WHERE cliente_empresa_id = p_empresa_id
    LIMIT 1;
    
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Se é empresa_parceira, buscar via tabela empresas_parceiras
  IF v_tipo = 'empresa_parceira' THEN
    SELECT empresa_sst_id INTO v_empresa_sst_id
    FROM empresas_parceiras
    WHERE parceira_empresa_id = p_empresa_id
    LIMIT 1;
    
    RETURN v_empresa_sst_id;
  END IF;
  
  -- Fallback: tipo desconhecido, sem SST pai
  RETURN NULL;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.get_empresa_sst_pai IS 
'Retorna a empresa SST pai para herança de configurações White Label. 
Retorna NULL para vertical_on (tema padrão), 
retorna a própria empresa para tipo sst, 
busca via clientes_sst para cliente_final,
busca via empresas_parceiras para empresa_parceira.';
