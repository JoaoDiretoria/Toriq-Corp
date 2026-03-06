import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

// Tipos de ação para auditoria
export type AcaoAuditoria = 
  | 'criou' 
  | 'atualizou' 
  | 'deletou' 
  | 'visualizou'
  | 'download'
  | 'upload'
  | 'validou'
  | 'invalidou'
  | 'finalizou'
  | 'reabriu'
  | 'gerou'
  | 'enviou'
  | 'aprovou'
  | 'rejeitou';

// Tipos de entidade para auditoria
export type EntidadeAuditoria = 
  | 'turma'
  | 'colaborador'
  | 'presenca'
  | 'prova'
  | 'certificado'
  | 'anexo'
  | 'lista_presenca'
  | 'avaliacao_reacao'
  | 'reorientacao'
  | 'relatorio'
  | 'foto'
  | 'assinatura'
  | 'qrcode'
  | 'documento'
  | 'sinistro';

// Métodos de origem
export type MetodoOrigem = 
  | 'empresa'        // Adicionado pela empresa SST
  | 'qrcode'         // Via QR Code
  | 'formulario'     // Via formulário público
  | 'instrutor'      // Pelo instrutor
  | 'sistema'        // Automático pelo sistema
  | 'api'            // Via API
  | 'importacao';    // Via importação em lote

// Fonte da ação
export type FonteAcao = 
  | 'web'            // Navegador web
  | 'mobile'         // App mobile
  | 'api'            // API externa
  | 'cron'           // Job agendado
  | 'instrutor_app'; // App do instrutor

// Tipo de executor da ação
export type ExecutadoPor = 
  | 'usuario'       // Admin/SST pelo sistema
  | 'colaborador'   // Colaborador via QR Code/formulário
  | 'instrutor'     // Instrutor pelo app/sistema
  | 'sistema';      // Automático pelo sistema

interface RegistrarAuditoriaParams {
  turmaId: string;
  turmaCodigo?: string | null;
  acao: AcaoAuditoria;
  entidade: EntidadeAuditoria;
  descricao: string;
  metodoOrigem?: MetodoOrigem;
  fonte?: FonteAcao;
  colaboradorId?: string | null;
  colaboradorNome?: string | null;
  colaboradorCpf?: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  treinamentoId?: string | null;
  treinamentoNome?: string | null;
  treinamentoNorma?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  dadosAnteriores?: any;
  dadosNovos?: any;
  // Novos campos para contexto completo
  instrutorId?: string | null;
  instrutorNome?: string | null;
  executadoPor?: ExecutadoPor;
  executadoPorNome?: string | null;
  executadoPorId?: string | null;
}

// Função para obter informações do dispositivo
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  // Detectar navegador
  let navegador = 'Desconhecido';
  if (ua.includes('Firefox')) navegador = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) navegador = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) navegador = 'Safari';
  else if (ua.includes('Edg')) navegador = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) navegador = 'Opera';
  
  // Detectar sistema operacional
  let sistemaOperacional = 'Desconhecido';
  if (ua.includes('Windows')) sistemaOperacional = 'Windows';
  else if (ua.includes('Mac OS')) sistemaOperacional = 'macOS';
  else if (ua.includes('Linux')) sistemaOperacional = 'Linux';
  else if (ua.includes('Android')) sistemaOperacional = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) sistemaOperacional = 'iOS';
  
  // Detectar tipo de dispositivo
  let dispositivo = 'Desktop';
  if (/Mobi|Android/i.test(ua)) dispositivo = 'Mobile';
  else if (/Tablet|iPad/i.test(ua)) dispositivo = 'Tablet';
  
  return { navegador, sistemaOperacional, dispositivo };
}

// Função para obter IP público (via API externa)
async function getPublicIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(3000) 
    });
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

// Mapear role para nome amigável
const roleMap: Record<string, string> = {
  'admin_vertical': 'Admin Vertical',
  'empresa_sst': 'Administrador',
  'gestor': 'Gestor',
  'operador': 'Operador',
  'visualizador': 'Visualizador',
  'cliente_final': 'Cliente',
  'empresa_parceira': 'Parceiro',
  'instrutor': 'Instrutor'
};

export function useGerenciarTurmaAuditoria() {
  const { user, profile } = useAuth();

  const registrarAuditoria = useCallback(async ({
    turmaId,
    turmaCodigo,
    acao,
    entidade,
    descricao,
    metodoOrigem = 'empresa',
    fonte = 'web',
    colaboradorId,
    colaboradorNome,
    colaboradorCpf,
    clienteId,
    clienteNome,
    treinamentoId,
    treinamentoNome,
    treinamentoNorma,
    valorAnterior,
    valorNovo,
    dadosAnteriores,
    dadosNovos,
    instrutorId,
    instrutorNome,
    executadoPor,
    executadoPorNome,
    executadoPorId
  }: RegistrarAuditoriaParams) => {
    console.log('[Auditoria] Iniciando registro:', { turmaId, acao, entidade, descricao });
    
    if (!user || !profile?.empresa_id) {
      console.warn('[Auditoria] Usuário ou empresa não identificados', { user: !!user, empresaId: profile?.empresa_id });
      return;
    }

    try {
      const db = supabase as any;
      
      // Obter informações do dispositivo
      const { navegador, sistemaOperacional, dispositivo } = getDeviceInfo();
      
      // Obter IP público (não bloqueia se falhar)
      const ipAddress = await getPublicIP();
      
      // Obter role amigável
      const roleDisplay = profile.role ? (roleMap[profile.role] || profile.role) : null;
      
      // Buscar nome do setor se o usuário tiver setor_id
      let setorDisplay: string | null = null;
      const setorId = (profile as any).setor_id;
      if (setorId) {
        const { data: setorData } = await db
          .from('setores')
          .select('nome')
          .eq('id', setorId)
          .maybeSingle();
        setorDisplay = setorData?.nome || null;
      }
      
      const { error } = await db.from('turmas_auditoria').insert({
        empresa_id: profile.empresa_id,
        turma_id: turmaId,
        turma_codigo: turmaCodigo || null,
        usuario_id: user.id,
        usuario_nome: profile.nome || user.email?.split('@')[0] || 'Usuário',
        usuario_email: user.email,
        usuario_role: roleDisplay,
        usuario_setor: setorDisplay,
        acao,
        entidade,
        descricao,
        metodo_origem: metodoOrigem,
        fonte,
        colaborador_id: colaboradorId || null,
        colaborador_nome: colaboradorNome || null,
        colaborador_cpf: colaboradorCpf || null,
        cliente_id: clienteId || null,
        cliente_nome: clienteNome || null,
        treinamento_id: treinamentoId || null,
        treinamento_nome: treinamentoNome || null,
        treinamento_norma: treinamentoNorma || null,
        valor_anterior: valorAnterior || null,
        valor_novo: valorNovo || null,
        dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        dispositivo,
        navegador,
        sistema_operacional: sistemaOperacional,
        // Novos campos de contexto
        instrutor_id: instrutorId || null,
        instrutor_nome: instrutorNome || null,
        executado_por: executadoPor || null,
        executado_por_nome: executadoPorNome || null,
        executado_por_id: executadoPorId || null
      });

      if (error) {
        console.error('[Auditoria] Erro ao registrar:', error);
      } else {
        console.log('[Auditoria] Registro salvo com sucesso:', { turmaId, acao, entidade });
      }
    } catch (err) {
      console.error('[Auditoria] Erro ao registrar:', err);
    }
  }, [user, profile]);

  // Funções auxiliares para ações comuns
  const auditarColaborador = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    metodo: MetodoOrigem,
    descricaoExtra?: string,
    instrutor?: { id?: string; nome: string } | null,
    executadoPor?: ExecutadoPor,
    executadoPorInfo?: { id?: string; nome: string } | null
  ) => {
    const acaoTexto = {
      'criou': 'adicionado à',
      'deletou': 'removido da',
      'atualizou': 'atualizado na',
      'rejeitou': 'recusado para'
    }[acao] || acao;
    
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'colaborador',
      descricao: `Colaborador ${colaborador.nome} (CPF: ${colaborador.cpf}) ${acaoTexto} turma. ${descricaoExtra || ''}`.trim(),
      metodoOrigem: metodo,
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      instrutorId: instrutor?.id,
      instrutorNome: instrutor?.nome,
      executadoPor: executadoPor || 'usuario',
      executadoPorNome: executadoPorInfo?.nome,
      executadoPorId: executadoPorInfo?.id
    });
  }, [registrarAuditoria]);

  const auditarPresenca = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    metodo: 'assinatura' | 'facial' | 'manual' | 'qrcode' | 'empresa',
    dataPresenca: string,
    descricaoExtra?: string,
    instrutor?: { id?: string; nome: string } | null,
    executadoPor?: ExecutadoPor,
    executadoPorInfo?: { id?: string; nome: string } | null
  ) => {
    const metodoTexto = {
      'assinatura': 'Assinatura digital',
      'facial': 'Reconhecimento facial + assinatura',
      'manual': 'Registro manual pelo sistema',
      'qrcode': 'QR Code (colaborador)',
      'empresa': 'Sistema (empresa SST)'
    }[metodo] || metodo;
    
    const executorTexto = executadoPor === 'colaborador' 
      ? `pelo próprio colaborador via QR Code` 
      : executadoPor === 'instrutor'
      ? `pelo instrutor ${instrutor?.nome || ''}`
      : `pelo usuário do sistema`;
    
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'presenca',
      descricao: `Presença ${acao === 'criou' ? 'registrada' : acao === 'deletou' ? 'removida' : 'atualizada'} para ${colaborador.nome} (CPF: ${colaborador.cpf}) em ${dataPresenca}. Método: ${metodoTexto}. Executado ${executorTexto}. ${descricaoExtra || ''}`.trim(),
      metodoOrigem: metodo === 'qrcode' ? 'qrcode' : metodo === 'manual' || metodo === 'empresa' ? 'empresa' : 'sistema',
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      valorNovo: `Data: ${dataPresenca}, Método: ${metodoTexto}`,
      instrutorId: instrutor?.id,
      instrutorNome: instrutor?.nome,
      executadoPor: executadoPor || 'usuario',
      executadoPorNome: executadoPorInfo?.nome || colaborador.nome,
      executadoPorId: executadoPorInfo?.id || colaborador.id
    });
  }, [registrarAuditoria]);

  const auditarProva = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    tipoProva: 'pre_teste' | 'pos_teste',
    nota?: number | null,
    resultado?: string | null,
    descricaoExtra?: string,
    instrutor?: { id?: string; nome: string } | null,
    executadoPor?: ExecutadoPor,
    executadoPorInfo?: { id?: string; nome: string } | null,
    metodo?: 'sistema' | 'qrcode' | 'instrutor'
  ) => {
    const metodoTexto = metodo === 'qrcode' 
      ? 'via QR Code pelo colaborador' 
      : metodo === 'instrutor' 
      ? `pelo instrutor ${instrutor?.nome || ''}` 
      : 'pelo sistema (empresa SST)';
    
    const acaoTexto = acao === 'criou' ? 'realizado' : acao === 'deletou' ? 'apagado' : 'atualizado';
    
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'prova',
      descricao: `${tipoProva === 'pre_teste' ? 'Pré-teste' : 'Pós-teste'} ${acaoTexto} ${metodoTexto}. Colaborador: ${colaborador.nome} (CPF: ${colaborador.cpf}). ${nota !== null && nota !== undefined ? `Nota: ${nota}.` : ''} ${resultado ? `Resultado: ${resultado}.` : ''} ${descricaoExtra || ''}`.trim(),
      metodoOrigem: metodo === 'qrcode' ? 'qrcode' : metodo === 'instrutor' ? 'instrutor' : 'empresa',
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      valorNovo: nota !== null && nota !== undefined ? `Nota: ${nota}, Tipo: ${tipoProva}` : null,
      instrutorId: instrutor?.id,
      instrutorNome: instrutor?.nome,
      executadoPor: executadoPor || (metodo === 'qrcode' ? 'colaborador' : metodo === 'instrutor' ? 'instrutor' : 'usuario'),
      executadoPorNome: executadoPorInfo?.nome || (metodo === 'qrcode' ? colaborador.nome : undefined),
      executadoPorId: executadoPorInfo?.id || (metodo === 'qrcode' ? colaborador.id : undefined)
    });
  }, [registrarAuditoria]);

  const auditarCertificado = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    descricaoExtra?: string
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'certificado',
      descricao: `Certificado ${acao === 'validou' ? 'validado' : acao === 'invalidou' ? 'invalidado' : acao === 'gerou' ? 'gerado' : acao === 'download' ? 'baixado' : acao} para ${colaborador.nome} (CPF: ${colaborador.cpf}). ${descricaoExtra || ''}`.trim(),
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarAnexo = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    nomeArquivo: string,
    tipoArquivo: string,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string }
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'anexo',
      descricao: `Anexo "${nomeArquivo}" (${tipoArquivo}) ${acao === 'upload' ? 'enviado' : acao === 'download' ? 'baixado' : acao === 'deletou' ? 'removido' : acao}.`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      valorNovo: `Arquivo: ${nomeArquivo}, Tipo: ${tipoArquivo}`
    });
  }, [registrarAuditoria]);

  const auditarRelatorio = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    tipoRelatorio: string,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string }
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'relatorio',
      descricao: `Relatório "${tipoRelatorio}" ${acao === 'gerou' ? 'gerado' : acao === 'download' ? 'baixado' : acao === 'visualizou' ? 'visualizado' : acao}.`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarTurma = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    descricaoExtra?: string,
    valorAnterior?: string,
    valorNovo?: string
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'turma',
      descricao: `Turma ${turmaCodigo || turmaId} ${acao === 'finalizou' ? 'finalizada' : acao === 'reabriu' ? 'reaberta' : acao === 'atualizou' ? 'atualizada' : acao}. ${descricaoExtra || ''}`.trim(),
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      valorAnterior,
      valorNovo
    });
  }, [registrarAuditoria]);

  const auditarListaPresenca = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    descricaoExtra?: string
  ) => {
    const acaoLabel = acao === 'gerou' ? 'gerada' : acao === 'download' ? 'baixada' : acao === 'visualizou' ? 'visualizada' : acao;
    let descricao = `Lista de presença ${acaoLabel}`;
    if (descricaoExtra) {
      descricao += ` - ${descricaoExtra}`;
    }
    
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'lista_presenca',
      descricao,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarAvaliacaoReacao = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string } | null,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    descricaoExtra?: string
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'avaliacao_reacao',
      descricao: `Avaliação de reação ${acao === 'criou' ? 'respondida' : acao === 'visualizou' ? 'visualizada' : acao}${colaborador ? ` por ${colaborador.nome} (CPF: ${colaborador.cpf})` : ''}. ${descricaoExtra || ''}`.trim(),
      colaboradorId: colaborador?.id,
      colaboradorNome: colaborador?.nome,
      colaboradorCpf: colaborador?.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarFoto = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string } | null,
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    tipoFoto: 'colaborador' | 'turma' | 'evidencia' | 'galeria',
    descricaoExtra?: string
  ) => {
    const tipoLabel = tipoFoto === 'galeria' ? 'da galeria' : tipoFoto === 'turma' ? 'da turma' : tipoFoto === 'colaborador' ? 'do colaborador' : 'de evidência';
    const acaoLabel = acao === 'criou' ? 'adicionada' : acao === 'deletou' ? 'removida' : acao === 'atualizou' ? 'atualizada' : acao;
    
    let descricao = `Foto ${tipoLabel} ${acaoLabel}`;
    if (colaborador) {
      descricao += ` - ${colaborador.nome} (CPF: ${colaborador.cpf})`;
    }
    if (descricaoExtra) {
      descricao += `. ${descricaoExtra}`;
    }
    
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'foto',
      descricao,
      colaboradorId: colaborador?.id,
      colaboradorNome: colaborador?.nome,
      colaboradorCpf: colaborador?.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarAssinatura = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string },
    dataPresenca: string
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'assinatura',
      descricao: `Assinatura ${acao === 'criou' ? 'registrada' : acao === 'atualizou' ? 'atualizada' : acao} para ${colaborador.nome} (CPF: ${colaborador.cpf}) em ${dataPresenca}.`,
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma,
      valorNovo: `Data: ${dataPresenca}`
    });
  }, [registrarAuditoria]);

  const auditarQRCode = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    tipoQRCode: 'inscricao' | 'presenca' | 'prova',
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string }
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'qrcode',
      descricao: `QR Code de ${tipoQRCode} ${acao === 'gerou' ? 'gerado' : acao === 'visualizou' ? 'visualizado' : acao === 'download' ? 'baixado' : acao}.`,
      metodoOrigem: 'qrcode',
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  const auditarReorientacao = useCallback((
    turmaId: string,
    turmaCodigo: string | null,
    acao: AcaoAuditoria,
    colaborador: { id?: string; nome: string; cpf: string },
    cliente: { id?: string; nome: string },
    treinamento: { id?: string; nome: string; norma: string }
  ) => {
    return registrarAuditoria({
      turmaId,
      turmaCodigo,
      acao,
      entidade: 'reorientacao',
      descricao: `Reorientação ${acao === 'upload' ? 'enviada' : acao === 'download' ? 'baixada' : acao === 'visualizou' ? 'visualizada' : acao} para ${colaborador.nome} (CPF: ${colaborador.cpf}).`,
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      colaboradorCpf: colaborador.cpf,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      treinamentoId: treinamento.id,
      treinamentoNome: treinamento.nome,
      treinamentoNorma: treinamento.norma
    });
  }, [registrarAuditoria]);

  return {
    registrarAuditoria,
    auditarColaborador,
    auditarPresenca,
    auditarProva,
    auditarCertificado,
    auditarAnexo,
    auditarRelatorio,
    auditarTurma,
    auditarListaPresenca,
    auditarAvaliacaoReacao,
    auditarFoto,
    auditarAssinatura,
    auditarQRCode,
    auditarReorientacao
  };
}
