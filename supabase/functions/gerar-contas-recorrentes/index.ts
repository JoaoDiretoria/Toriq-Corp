import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Data atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1; // 1-12
    const anoAtual = hoje.getFullYear();
    const mesAnoAtual = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}`;

    console.log(`Gerando contas recorrentes para ${mesAnoAtual}`);

    // Buscar todas as contas com frequência recorrente
    const { data: contasRecorrentes, error: fetchError } = await adminClient
      .from('contas_pagar')
      .select('*')
      .eq('frequencia_cobranca', 'recorrente');

    if (fetchError) {
      console.error('Erro ao buscar contas recorrentes:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar contas recorrentes', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contasRecorrentes || contasRecorrentes.length === 0) {
      console.log('Nenhuma conta recorrente encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma conta recorrente encontrada', created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontradas ${contasRecorrentes.length} contas recorrentes`);

    // Agrupar contas por empresa_id para buscar a coluna "Pagamentos Recorrentes" de cada empresa
    const empresaIds = [...new Set(contasRecorrentes.map(c => c.empresa_id))];
    
    // Buscar colunas "Pagamentos Recorrentes" para cada empresa
    const { data: colunasRecorrentes, error: colunasError } = await adminClient
      .from('contas_pagar_colunas')
      .select('id, empresa_id')
      .eq('nome', 'Pagamentos Recorrentes')
      .in('empresa_id', empresaIds);

    if (colunasError) {
      console.error('Erro ao buscar colunas:', colunasError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar colunas de pagamentos recorrentes', details: colunasError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar mapa de empresa_id -> coluna_id
    const colunasPorEmpresa: Record<string, string> = {};
    colunasRecorrentes?.forEach(col => {
      colunasPorEmpresa[col.empresa_id] = col.id;
    });

    let contasCriadas = 0;
    let contasIgnoradas = 0;
    const erros: string[] = [];

    for (const contaOriginal of contasRecorrentes) {
      try {
        // Verificar se a empresa tem coluna de pagamentos recorrentes
        const colunaRecorrenteId = colunasPorEmpresa[contaOriginal.empresa_id];
        if (!colunaRecorrenteId) {
          console.log(`Empresa ${contaOriginal.empresa_id} não tem coluna de Pagamentos Recorrentes`);
          contasIgnoradas++;
          continue;
        }

        // Verificar se já existe uma conta para este mês baseada nesta conta original
        // Usamos uma combinação de campos para identificar duplicatas
        const { data: contaExistente, error: checkError } = await adminClient
          .from('contas_pagar')
          .select('id')
          .eq('empresa_id', contaOriginal.empresa_id)
          .eq('fornecedor_id', contaOriginal.fornecedor_id)
          .eq('descricao', contaOriginal.descricao)
          .eq('categoria', contaOriginal.categoria)
          .gte('data_vencimento', `${mesAnoAtual}-01`)
          .lte('data_vencimento', `${mesAnoAtual}-31`)
          .eq('coluna_id', colunaRecorrenteId)
          .maybeSingle();

        if (checkError) {
          console.error('Erro ao verificar conta existente:', checkError);
          erros.push(`Erro ao verificar conta ${contaOriginal.numero}: ${checkError.message}`);
          continue;
        }

        if (contaExistente) {
          console.log(`Conta recorrente já existe para ${mesAnoAtual}: ${contaOriginal.numero}`);
          contasIgnoradas++;
          continue;
        }

        // Gerar novo número para a conta
        const novoNumero = `REC-${mesAnoAtual}-${Date.now().toString().slice(-6)}`;

        // Calcular data de vencimento (dia 1 do mês atual ou manter o dia original)
        const dataVencimentoOriginal = new Date(contaOriginal.data_vencimento);
        const diaVencimento = dataVencimentoOriginal.getDate();
        const novaDataVencimento = new Date(anoAtual, mesAtual - 1, Math.min(diaVencimento, 28)); // Limitar a 28 para evitar problemas com fevereiro

        // Criar nova conta na coluna "Pagamentos Recorrentes"
        const { error: insertError } = await adminClient
          .from('contas_pagar')
          .insert({
            empresa_id: contaOriginal.empresa_id,
            numero: novoNumero,
            fornecedor_id: contaOriginal.fornecedor_id,
            fornecedor_nome: contaOriginal.fornecedor_nome,
            fornecedor_cnpj: contaOriginal.fornecedor_cnpj,
            descricao: contaOriginal.descricao,
            valor: contaOriginal.tipo_valor_recorrente === 'fixo' ? contaOriginal.valor : 0, // Se variável, valor começa em 0
            valor_pago: 0,
            data_competencia: `${mesAnoAtual}-01`,
            data_vencimento: novaDataVencimento.toISOString().split('T')[0],
            forma_pagamento_id: contaOriginal.forma_pagamento_id,
            forma_pagamento: contaOriginal.forma_pagamento,
            centro_custo_id: contaOriginal.centro_custo_id,
            categoria: contaOriginal.categoria,
            conta_financeira_id: contaOriginal.conta_financeira_id,
            conta_financeira: contaOriginal.conta_financeira,
            frequencia_cobranca: 'unico', // A nova conta gerada é única (não gera mais recorrências)
            tipo_valor_recorrente: null,
            observacoes: `Gerado automaticamente a partir da conta recorrente ${contaOriginal.numero}. ${contaOriginal.tipo_valor_recorrente === 'variavel' ? '(Valor variável - ajustar conforme utilização)' : ''}`,
            coluna_id: colunaRecorrenteId,
            status_pagamento: 'previsto',
            ordem: 0,
          });

        if (insertError) {
          console.error('Erro ao criar conta recorrente:', insertError);
          erros.push(`Erro ao criar conta para ${contaOriginal.numero}: ${insertError.message}`);
          continue;
        }

        console.log(`Conta recorrente criada: ${novoNumero} baseada em ${contaOriginal.numero}`);
        contasCriadas++;

      } catch (err) {
        console.error('Erro ao processar conta:', err);
        erros.push(`Erro ao processar conta ${contaOriginal.numero}: ${err}`);
      }
    }

    const resultado = {
      message: `Processamento concluído para ${mesAnoAtual}`,
      total_recorrentes: contasRecorrentes.length,
      contas_criadas: contasCriadas,
      contas_ignoradas: contasIgnoradas,
      erros: erros.length > 0 ? erros : undefined,
    };

    console.log('Resultado:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
