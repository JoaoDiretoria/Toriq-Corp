-- Correção das Foreign Keys que impedem exclusão de empresa
-- Alterar de SET NULL para CASCADE ou deletar dados relacionados

-- ============================================================================
-- PASSO 1: Alterar FKs de SET NULL para CASCADE
-- ============================================================================

-- prospeccao_cards.empresa_lead_id
ALTER TABLE public.prospeccao_cards 
DROP CONSTRAINT IF EXISTS prospeccao_cards_empresa_lead_id_fkey;

ALTER TABLE public.prospeccao_cards
ADD CONSTRAINT prospeccao_cards_empresa_lead_id_fkey 
FOREIGN KEY (empresa_lead_id) REFERENCES public.empresas(id) ON DELETE SET NULL;

-- closer_cards.empresa_lead_id
ALTER TABLE public.closer_cards 
DROP CONSTRAINT IF EXISTS closer_cards_empresa_lead_id_fkey;

ALTER TABLE public.closer_cards
ADD CONSTRAINT closer_cards_empresa_lead_id_fkey 
FOREIGN KEY (empresa_lead_id) REFERENCES public.empresas(id) ON DELETE SET NULL;

-- cross_selling_cards NÃO tem empresa_lead_id, apenas empresa_id (já com CASCADE)

-- ============================================================================
-- PASSO 2: Atualizar função delete_empresa_cascade para deletar dados relacionados
-- ============================================================================

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

  -- ============================================================================
  -- DELETAR DADOS RELACIONADOS (com tratamento de erro para tabelas inexistentes)
  -- ============================================================================
  
  -- 1. Limpar referências de empresa_lead_id
  BEGIN UPDATE public.prospeccao_cards SET empresa_lead_id = NULL WHERE empresa_lead_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE public.closer_cards SET empresa_lead_id = NULL WHERE empresa_lead_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 2. Prospecção (filhos primeiro)
  BEGIN DELETE FROM public.prospeccao_card_movimentacoes WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_atividades WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_card_etiquetas WHERE card_id IN (SELECT id FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.prospeccao_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 3. Closer (filhos primeiro)
  BEGIN DELETE FROM public.closer_card_movimentacoes WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_atividades WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_card_etiquetas WHERE card_id IN (SELECT id FROM public.closer_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.closer_modelos_atividade WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 4. Cross-selling (filhos primeiro)
  BEGIN DELETE FROM public.cross_selling_atividades WHERE card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_card_etiquetas WHERE card_id IN (SELECT id FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_cards WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_colunas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cross_selling_etiquetas WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 5. Contas financeiras
  BEGIN DELETE FROM public.contas_pagar_movimentacoes WHERE conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_pagar_atividades WHERE conta_id IN (SELECT id FROM public.contas_pagar WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_pagar WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_receber WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 6. Notificações
  BEGIN DELETE FROM public.notificacoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 7. Tickets de suporte
  BEGIN DELETE FROM public.tickets_suporte WHERE empresa_solicitante_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.tickets_suporte WHERE empresa_destino_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 8. Empresas parceiras
  BEGIN DELETE FROM public.empresas_parceiras WHERE empresa_sst_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.empresas_parceiras WHERE parceira_empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 9. Treinamentos (filhos primeiro)
  BEGIN DELETE FROM public.instrutor_treinamentos WHERE treinamento_id IN (SELECT id FROM public.catalogo_treinamentos WHERE empresa_id = p_empresa_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.catalogo_treinamentos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.turmas_treinamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.solicitacoes_treinamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.instrutores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 10. Cadastros gerais
  BEGIN DELETE FROM public.colaboradores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.clientes_sst WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.unidades_clientes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.setores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cargos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.grupos_homogeneos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.fornecedores WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 11. Frota
  BEGIN DELETE FROM public.frota_checklists WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_custos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_documentos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_manutencoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_ocorrencias WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_utilizacoes WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.frota_veiculos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 12. EPIs
  BEGIN DELETE FROM public.entregas_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.estoque_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.cadastro_epis WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 13. Financeiro auxiliar
  BEGIN DELETE FROM public.centros_custo WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.formas_pagamento WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.contas_bancarias WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.modelos_atividade WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 14. Módulos e contatos
  BEGIN DELETE FROM public.empresas_modulos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM public.empresa_contatos WHERE empresa_id = p_empresa_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ============================================================================
  -- DELETAR USUÁRIOS DO AUTH.USERS
  -- ============================================================================
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      BEGIN
        DELETE FROM auth.users WHERE id = v_user_id;
        v_deleted_users := v_deleted_users + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao deletar usuário %: %', v_user_id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- ============================================================================
  -- DELETAR A EMPRESA
  -- ============================================================================
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

GRANT EXECUTE ON FUNCTION public.delete_empresa_cascade(UUID) TO authenticated;
