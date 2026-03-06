-- Habilitar extensão pg_cron se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função para gerar contas recorrentes
CREATE OR REPLACE FUNCTION public.gerar_contas_recorrentes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mes_atual INTEGER;
  v_ano_atual INTEGER;
  v_mes_ano_atual TEXT;
  v_conta RECORD;
  v_coluna_recorrente_id UUID;
  v_conta_existente UUID;
  v_novo_numero TEXT;
  v_nova_data_vencimento DATE;
  v_dia_vencimento INTEGER;
  v_contas_criadas INTEGER := 0;
  v_contas_ignoradas INTEGER := 0;
  v_total_recorrentes INTEGER := 0;
BEGIN
  -- Data atual
  v_mes_atual := EXTRACT(MONTH FROM CURRENT_DATE);
  v_ano_atual := EXTRACT(YEAR FROM CURRENT_DATE);
  v_mes_ano_atual := v_ano_atual || '-' || LPAD(v_mes_atual::TEXT, 2, '0');

  RAISE NOTICE 'Gerando contas recorrentes para %', v_mes_ano_atual;

  -- Loop por todas as contas recorrentes
  FOR v_conta IN 
    SELECT * FROM public.contas_pagar 
    WHERE frequencia_cobranca = 'recorrente'
  LOOP
    v_total_recorrentes := v_total_recorrentes + 1;

    -- Buscar coluna "Pagamentos Recorrentes" da empresa
    SELECT id INTO v_coluna_recorrente_id
    FROM public.contas_pagar_colunas
    WHERE empresa_id = v_conta.empresa_id
      AND nome = 'Pagamentos Recorrentes'
    LIMIT 1;

    IF v_coluna_recorrente_id IS NULL THEN
      RAISE NOTICE 'Empresa % não tem coluna de Pagamentos Recorrentes', v_conta.empresa_id;
      v_contas_ignoradas := v_contas_ignoradas + 1;
      CONTINUE;
    END IF;

    -- Verificar se já existe conta para este mês
    SELECT id INTO v_conta_existente
    FROM public.contas_pagar
    WHERE empresa_id = v_conta.empresa_id
      AND fornecedor_id = v_conta.fornecedor_id
      AND descricao = v_conta.descricao
      AND categoria = v_conta.categoria
      AND data_vencimento >= (v_mes_ano_atual || '-01')::DATE
      AND data_vencimento <= (v_mes_ano_atual || '-31')::DATE
      AND coluna_id = v_coluna_recorrente_id
    LIMIT 1;

    IF v_conta_existente IS NOT NULL THEN
      RAISE NOTICE 'Conta recorrente já existe para %: %', v_mes_ano_atual, v_conta.numero;
      v_contas_ignoradas := v_contas_ignoradas + 1;
      CONTINUE;
    END IF;

    -- Gerar novo número
    v_novo_numero := 'REC-' || v_mes_ano_atual || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM 8 FOR 6);

    -- Calcular data de vencimento
    v_dia_vencimento := EXTRACT(DAY FROM v_conta.data_vencimento);
    IF v_dia_vencimento > 28 THEN
      v_dia_vencimento := 28; -- Limitar para evitar problemas com fevereiro
    END IF;
    v_nova_data_vencimento := MAKE_DATE(v_ano_atual, v_mes_atual, v_dia_vencimento);

    -- Criar nova conta
    INSERT INTO public.contas_pagar (
      empresa_id,
      numero,
      fornecedor_id,
      fornecedor_nome,
      fornecedor_cnpj,
      descricao,
      valor,
      valor_pago,
      data_competencia,
      data_vencimento,
      forma_pagamento_id,
      forma_pagamento,
      centro_custo_id,
      categoria,
      conta_financeira_id,
      conta_financeira,
      frequencia_cobranca,
      tipo_valor_recorrente,
      observacoes,
      coluna_id,
      status_pagamento,
      ordem
    ) VALUES (
      v_conta.empresa_id,
      v_novo_numero,
      v_conta.fornecedor_id,
      v_conta.fornecedor_nome,
      v_conta.fornecedor_cnpj,
      v_conta.descricao,
      CASE WHEN v_conta.tipo_valor_recorrente = 'fixo' THEN v_conta.valor ELSE 0 END,
      0,
      (v_mes_ano_atual || '-01')::DATE,
      v_nova_data_vencimento,
      v_conta.forma_pagamento_id,
      v_conta.forma_pagamento,
      v_conta.centro_custo_id,
      v_conta.categoria,
      v_conta.conta_financeira_id,
      v_conta.conta_financeira,
      'unico',
      NULL,
      'Gerado automaticamente a partir da conta recorrente ' || v_conta.numero || 
        CASE WHEN v_conta.tipo_valor_recorrente = 'variavel' THEN '. (Valor variável - ajustar conforme utilização)' ELSE '' END,
      v_coluna_recorrente_id,
      'previsto',
      0
    );

    RAISE NOTICE 'Conta recorrente criada: % baseada em %', v_novo_numero, v_conta.numero;
    v_contas_criadas := v_contas_criadas + 1;

  END LOOP;

  RETURN jsonb_build_object(
    'message', 'Processamento concluído para ' || v_mes_ano_atual,
    'total_recorrentes', v_total_recorrentes,
    'contas_criadas', v_contas_criadas,
    'contas_ignoradas', v_contas_ignoradas
  );
END;
$$;

-- Agendar execução no dia 1 de cada mês às 00:01
SELECT cron.schedule(
  'gerar-contas-recorrentes-mensal',
  '1 0 1 * *', -- Minuto 1, Hora 0, Dia 1, Todo mês, Todo dia da semana
  $$SELECT public.gerar_contas_recorrentes()$$
);

-- Comentários
COMMENT ON FUNCTION public.gerar_contas_recorrentes() IS 'Gera automaticamente contas a pagar para pagamentos recorrentes no início de cada mês';
