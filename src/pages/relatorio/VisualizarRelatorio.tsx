import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { useGerenciarTurmaAuditoria } from '@/hooks/useGerenciarTurmaAuditoria';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Printer, FileText, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const db = supabase as any;

// Função para formatar telefone com máscara
const formatarTelefone = (telefone: string | undefined | null): string => {
  if (!telefone) return '';
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return telefone;
};

// Função para formatar tipo de treinamento
const formatarTipoTreinamento = (tipo: string): string => {
  const tipoLower = tipo?.toLowerCase() || '';
  if (tipoLower === 'periódico' || tipoLower === 'periodico' || tipoLower === 'reciclagem') {
    return 'Periódico (Reciclagem)';
  }
  if (tipoLower === 'inicial' || tipoLower === 'formação inicial' || tipoLower === 'formacao inicial') {
    return 'Formação Inicial';
  }
  return tipo || 'Não informado';
};

interface Assinatura {
  nome: string;
  cargo: string;
  formacao: string;
  registro: string;
  assinatura_url?: string | null;
}

interface DadosRelatorio {
  turma: {
    id: string;
    codigo_turma: string;
    numero_turma: number;
    data_inicio: string;
    data_fim: string;
    tipo_treinamento: string;
    local_treinamento: string;
    categorizacao_tecnica?: {
      tipos_espaco_confinado?: Array<{ id: string; nome: string }>;
      tipos_atividade?: Array<{ id: string; nome: string }>;
      responsaveis_tecnicos?: Array<{
        id: string;
        nome: string;
        cargo: string;
        sigla_conselho: string;
        numero_registro: string;
        estado: string;
      }>;
    } | null;
  };
  treinamento: {
    id: string;
    nome: string;
    norma: string;
    carga_horaria: number;
    conteudo_programatico?: string;
    validade?: string;
  };
  cliente: {
    nome: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
  };
  instrutor: {
    id: string;
    nome: string;
    formacao_academica?: string;
    email?: string;
    telefone?: string;
    assinatura_url?: string;
  };
  empresaSst: {
    nome: string;
    cnpj?: string;
    logo_url?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
  };
  infoEmpresa: {
    missao?: string;
    visao?: string;
    valores?: string;
    logo_pequena_url?: string;
    diretor_tecnico_nome?: string;
    diretor_tecnico_formacao?: string;
    diretor_tecnico_registro_tipo?: string;
    diretor_tecnico_registro_numero?: string;
    diretor_tecnico_registro_estado?: string;
    diretor_tecnico_assinatura_url?: string;
  };
  colaboradores: Array<{
    id?: string;
    nome: string;
    cpf: string;
    assinaturas: Record<string, string | null>;
    assinatura_certificado?: string | null;
    temSinistro?: boolean;
  }>;
  colaboradoresParaCertificado?: Array<{
    id?: string;
    nome: string;
    cpf: string;
    assinaturas: Record<string, string | null>;
    assinatura_certificado?: string | null;
    temSinistro?: boolean;
  }>;
  avaliacoes: Array<{
    nome: string;
    cpf: string;
    notaPre: number | null;
    notaPos: number | null;
    resultado: string;
    temSinistro?: boolean;
  }>;
  fotos: Array<{
    url: string;
    nome: string;
    descricao?: string;
    data_foto?: string;
    created_at?: string;
  }>;
  avaliacoesReacao: Array<{
    id: string;
    colaborador_nome: string;
    colaborador_cpf: string;
    sugestoes_comentarios: string;
    created_at: string;
    is_case_sucesso?: boolean;
  }>;
  casesSucesso: Array<{
    id: string;
    colaborador_nome: string;
    colaborador_cpf: string;
    sugestoes_comentarios: string;
    created_at: string;
  }>;
  modeloCertificado?: {
    id: string;
    nome: string;
    largura: number;
    altura: number;
    moldura_url?: string;
    paginas: Array<{
      numero: number;
      nome: string;
      conteudo: string;
      moldura_url?: string;
    }>;
  };
  estatisticasReacao?: {
    totalRespostas: number;
    categorias: Array<{
      categoria: string;
      tipo: string;
      qtd_opcoes: number;
      itens: Array<{
        pergunta: string;
        respostas: Record<string, number>;
        media?: number;
      }>;
      opcoes?: Array<{
        valor: number;
        texto: string;
      }>;
    }>;
  };
  reorientacoes: Array<{
    id: string;
    colaborador_id: string;
    colaborador_nome: string;
    colaborador_cpf: string;
    empresa_nome: string;
    treinamento_nome: string;
    data_treinamento: string;
    nota: number;
    total_questoes: number;
    acertos: number;
    questoes_incorretas: Array<{
      questao_id: string;
      numero: number;
      pergunta: string;
      alternativa_selecionada: string;
      alternativa_selecionada_texto: string;
      alternativa_correta: string;
      alternativa_correta_texto: string;
    }>;
    assinatura_digital: string | null;
    assinado_em: string | null;
    created_at: string;
  }>;
  formacoesInstrutor: Array<{
    id: string;
    nome: string;
    registro_tipo?: string;
    registro_numero?: string;
    registro_estado?: string;
    formacao_anexo_url?: string;
    treinamento_anexo_url?: string;
  }>;
  datasAulas: string[];
  assinaturas: Assinatura[];
  estatisticas: {
    mediaPreTeste: number;
    mediaPosTeste: number;
    taxaAprovacao: number;
    totalParticipantes: number;
    menorNotaPre: number;
    maiorNotaPre: number;
    menorNotaPos: number;
    maiorNotaPos: number;
  };
}

export default function VisualizarRelatorio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { setCurrentScreen } = useCurrentScreen();
  const turmaId = searchParams.get('turmaId');
  
  // Registrar tela atual para o widget de suporte
  useEffect(() => {
    setCurrentScreen('visualizar-relatorio', 'sst');
  }, [setCurrentScreen]);
  
  // Apenas empresa_sst, instrutor e admin_vertical podem validar relatórios
  const canValidate = profile?.role === 'empresa_sst' || profile?.role === 'instrutor' || profile?.role === 'admin_vertical';
  
  const auditoria = useGerenciarTurmaAuditoria();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [relatorioValidado, setRelatorioValidado] = useState(false);
  const [turmaFinalizada, setTurmaFinalizada] = useState(false);
  const [revalidarDialogOpen, setRevalidarDialogOpen] = useState(false);
  const [semPermissao, setSemPermissao] = useState(false);
  
  const relatorioRef = useRef<HTMLDivElement>(null);

  // Verificar autenticação - redirecionar para login se não estiver logado
  // Aguardar um tempo para o profile carregar antes de redirecionar
  useEffect(() => {
    // Não fazer nada enquanto está carregando
    if (authLoading) return;
    
    // Se já tem profile, está ok
    if (profile) return;
    
    // Aguardar um pouco para o profile carregar (pode haver delay no fetchProfile)
    const timeout = setTimeout(() => {
      if (!profile) {
        toast.error('Você precisa estar logado para acessar este relatório');
        navigate('/auth');
      }
    }, 2000); // Aguardar 2 segundos antes de redirecionar
    
    return () => clearTimeout(timeout);
  }, [authLoading, profile, navigate]);

  const handleVoltar = () => {
    if (window.history.length <= 2 && turmaId) {
      navigate(`/modulos/gestao-turmas/${turmaId}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/sst');
    }
  };

  useEffect(() => {
    // Só buscar dados se estiver autenticado
    if (turmaId && profile) {
      fetchDadosRelatorio();
      verificarRelatorioValidado();
      verificarTurmaFinalizada();
    }
  }, [turmaId, profile]);

  // Verificar se a turma está finalizada
  const verificarTurmaFinalizada = async () => {
    if (!turmaId) return;
    
    const { data } = await db
      .from('turmas_treinamento')
      .select('status')
      .eq('id', turmaId)
      .maybeSingle();
    
    setTurmaFinalizada(data?.status === 'concluido');
  };

  // Verificar se o usuário tem permissão para acessar a turma
  // Quem consegue ver a turma deve conseguir ver o relatório
  const verificarPermissao = async (turmaData: any): Promise<boolean> => {
    if (!profile) {
      console.log('[Permissão] Sem profile');
      return false;
    }
    
    console.log('[Permissão] Verificando...', {
      role: profile.role,
      profileEmpresaId: profile.empresa_id,
      turmaEmpresaId: turmaData.empresa_id,
      profileId: profile.id
    });
    
    // Admin da plataforma tem acesso a tudo
    if (profile.role === 'admin_vertical') {
      console.log('[Permissão] Admin - OK');
      return true;
    }
    
    // Empresa SST - verifica se a turma pertence à empresa do usuário
    // Usuários empresa_sst sempre podem ver relatórios de turmas da sua empresa
    if (profile.role === 'empresa_sst') {
      console.log('[Permissão] Empresa SST - verificando empresa_id');
      
      // Verificar diretamente se a empresa_id da turma bate
      if (turmaData.empresa_id === profile.empresa_id) {
        console.log('[Permissão] Empresa SST - match direto OK');
        return true;
      }
      
      // Verificar se o usuário pertence à empresa dona da turma
      const { data: empresaData } = await db
        .from('empresas')
        .select('id')
        .eq('id', turmaData.empresa_id)
        .maybeSingle();
      
      // Se a turma tem uma empresa válida e o usuário é empresa_sst dessa empresa
      if (empresaData) {
        const { data: userProfile } = await db
          .from('profiles')
          .select('empresa_id')
          .eq('id', profile.id)
          .maybeSingle();
        
        console.log('[Permissão] Empresa SST - userProfile:', userProfile);
        
        if (userProfile?.empresa_id === turmaData.empresa_id) {
          console.log('[Permissão] Empresa SST - match via profiles OK');
          return true;
        }
      }
      
      // Fallback: Se o usuário é empresa_sst e a turma existe, permitir acesso
      // (a RLS do Supabase já filtra as turmas que o usuário pode ver)
      console.log('[Permissão] Empresa SST - permitindo acesso (RLS já filtra)');
      return true;
    }
    
    // Instrutor - verifica se é o instrutor da turma
    if (profile.role === 'instrutor') {
      const { data: instrutorData } = await db
        .from('instrutores')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (instrutorData && turmaData.instrutor_id === instrutorData.id) return true;
    }
    
    // Cliente final - verifica se está vinculado à empresa cliente da turma
    if (profile.role === 'cliente_final') {
      const { data: clienteSst } = await db
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', turmaData.cliente_id)
        .maybeSingle();
      
      if (clienteSst?.cliente_empresa_id && profile.empresa_id === clienteSst.cliente_empresa_id) return true;
    }
    
    // Empresa parceira - não tem acesso direto às turmas (não há coluna empresa_parceira_id)
    // Se necessário no futuro, adicionar a coluna na tabela turmas_treinamento
    
    return false;
  };

  const fetchDadosRelatorio = async () => {
    try {
      setLoading(true);

      // Buscar dados da turma com carga horária definida na agenda
      const { data: turmaData, error: turmaError } = await db
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          numero_turma,
          tipo_treinamento,
          empresa_id,
          treinamento_id,
          cliente_id,
          instrutor_id,
          carga_horaria_total,
          created_at,
          categorizacao_tecnica
        `)
        .eq('id', turmaId)
        .single();

      if (turmaError) throw turmaError;

      // Verificar permissão de acesso
      const temPermissao = await verificarPermissao(turmaData);
      if (!temPermissao) {
        setSemPermissao(true);
        setLoading(false);
        toast.error('Você não tem permissão para acessar este relatório');
        return;
      }

      // Buscar aulas para pegar datas
      const { data: aulasData } = await db
        .from('turmas_treinamento_aulas')
        .select('data')
        .eq('turma_id', turmaId)
        .order('data');

      const datasOrdenadas = (aulasData || []).map((a: any) => a.data).filter(Boolean).sort();
      const dataInicio = datasOrdenadas[0] || turmaData.created_at?.split('T')[0] || '';
      const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

      // Buscar treinamento com conteúdo programático e validade
      const { data: treinamentoData } = await db
        .from('catalogo_treinamentos')
        .select('nome, norma, ch_formacao, ch_reciclagem, conteudo_programatico, validade')
        .eq('id', turmaData.treinamento_id)
        .single();

      // Buscar cliente SST com dados da empresa cliente vinculada
      const { data: clienteSstData } = await db
        .from('clientes_sst')
        .select('nome, cliente_empresa_id')
        .eq('id', turmaData.cliente_id)
        .single();

      // Buscar dados completos da empresa cliente (se houver cliente_empresa_id)
      let clienteData: any = { nome: clienteSstData?.nome || '' };
      if (clienteSstData?.cliente_empresa_id) {
        const { data: empresaClienteData } = await db
          .from('empresas')
          .select('nome, cnpj, endereco, numero, bairro, cidade, estado, telefone, email')
          .eq('id', clienteSstData.cliente_empresa_id)
          .single();
        
        if (empresaClienteData) {
          // Montar endereço completo: Rua, Número - Bairro, Cidade/Estado
          const enderecoBase = empresaClienteData.endereco?.replace(/,\s*$/, '') || '';
          const enderecoComNumero = empresaClienteData.numero ? `${enderecoBase}, ${empresaClienteData.numero}` : enderecoBase;
          const enderecoComBairro = empresaClienteData.bairro ? `${enderecoComNumero} - ${empresaClienteData.bairro}` : enderecoComNumero;
          const cidadeEstado = [empresaClienteData.cidade, empresaClienteData.estado].filter(Boolean).join('/');
          const enderecoCompleto = cidadeEstado ? `${enderecoComBairro}, ${cidadeEstado}` : enderecoComBairro;
          
          clienteData = {
            ...empresaClienteData,
            endereco: enderecoCompleto // Substituir pelo endereço formatado
          };
        }
      }

      // Buscar instrutor com assinatura
      const { data: instrutorData } = await db
        .from('instrutores')
        .select('id, nome, formacao_academica, email, telefone, assinatura_url')
        .eq('id', turmaData.instrutor_id)
        .single();

      // Buscar formações do instrutor vinculadas ao treinamento específico
      const { data: formacaoTreinamentoData } = await db
        .from('instrutor_formacao_treinamento')
        .select(`
          id,
          formacao_id,
          treinamento_id,
          anexo_url,
          formacao:instrutor_formacoes(
            id, nome, registro_tipo, registro_numero, registro_estado, anexo_url
          )
        `)
        .eq('instrutor_id', turmaData.instrutor_id)
        .eq('treinamento_id', turmaData.treinamento_id);

      // Mapear formações vinculadas ao treinamento
      const formacoesInstrutor = (formacaoTreinamentoData || []).map((ft: any) => ({
        id: ft.formacao?.id || '',
        nome: ft.formacao?.nome || '',
        registro_tipo: ft.formacao?.registro_tipo,
        registro_numero: ft.formacao?.registro_numero,
        registro_estado: ft.formacao?.registro_estado,
        formacao_anexo_url: ft.formacao?.anexo_url,
        treinamento_anexo_url: ft.anexo_url
      }));

      // Buscar empresa SST completa
      const { data: empresaData } = await db
        .from('empresas')
        .select('nome, cnpj, logo_url, endereco, cidade, estado, telefone, email')
        .eq('id', turmaData.empresa_id)
        .single();

      // Buscar informações da empresa incluindo diretor técnico e logo
      const { data: infoEmpresaData } = await db
        .from('informacoes_empresa')
        .select(`
          missao, visao, valores,
          logo_pequena_url,
          diretor_tecnico_nome, diretor_tecnico_formacao,
          diretor_tecnico_registro_tipo, diretor_tecnico_registro_numero,
          diretor_tecnico_registro_estado, diretor_tecnico_assinatura_url
        `)
        .eq('empresa_id', turmaData.empresa_id)
        .maybeSingle();

      // Buscar colaboradores da turma via turma_colaboradores
      const { data: colaboradoresData } = await db
        .from('turma_colaboradores')
        .select(`
          id,
          colaborador_id,
          nota_pre_teste,
          nota_pos_teste,
          resultado,
          assinatura_certificado,
          colaborador:colaboradores(nome, cpf, cargo)
        `)
        .eq('turma_id', turmaId);

      // Buscar sinistros da turma para identificar colaboradores reprovados por sinistro
      const { data: sinistrosData } = await db
        .from('sinistros_colaborador')
        .select('turma_colaborador_id')
        .eq('turma_id', turmaId);
      
      const colaboradoresComSinistro = new Set((sinistrosData || []).map((s: any) => s.turma_colaborador_id));

      // Buscar presenças/assinaturas dos colaboradores
      const colaboradorTurmaIds = (colaboradoresData || []).map((c: any) => c.id);
      const { data: presencasData } = await db
        .from('turma_colaborador_presencas')
        .select('colaborador_turma_id, data_aula, presente, assinatura')
        .in('colaborador_turma_id', colaboradorTurmaIds);

      // Mapear assinaturas por colaborador_turma_id
      const assinaturasPorColaborador: Record<string, Record<string, string | null>> = {};
      (presencasData || []).forEach((p: any) => {
        if (!assinaturasPorColaborador[p.colaborador_turma_id]) {
          assinaturasPorColaborador[p.colaborador_turma_id] = {};
        }
        assinaturasPorColaborador[p.colaborador_turma_id][p.data_aula] = p.assinatura || null;
      });

      const colaboradores = (colaboradoresData || []).map((c: any) => ({
        id: c.id,
        nome: c.colaborador?.nome || '',
        cpf: c.colaborador?.cpf || '',
        assinaturas: assinaturasPorColaborador[c.id] || {},
        assinatura_certificado: c.assinatura_certificado || null,
        temSinistro: colaboradoresComSinistro.has(c.id)
      }));

      // Filtrar colaboradores aprovados (sem sinistro) para certificados
      const colaboradoresParaCertificado = colaboradores.filter((c: any) => 
        !c.temSinistro && 
        (colaboradoresData || []).find((cd: any) => cd.id === c.id)?.nota_pos_teste >= 7
      );

      // Montar avaliações a partir dos dados de turma_colaboradores
      const avaliacoes = (colaboradoresData || []).map((c: any) => {
        const temSinistro = colaboradoresComSinistro.has(c.id);
        return {
          nome: c.colaborador?.nome || 'N/A',
          cpf: c.colaborador?.cpf || '',
          notaPre: c.nota_pre_teste,
          notaPos: c.nota_pos_teste,
          resultado: temSinistro ? 'reprovado_sinistro' : (c.resultado || 'aguardando'),
          temSinistro
        };
      });

      // Calcular estatísticas
      const notasPre = avaliacoes.map((a: any) => a.notaPre).filter((n: any) => n !== null);
      const notasPos = avaliacoes.map((a: any) => a.notaPos).filter((n: any) => n !== null);
      const aprovados = avaliacoes.filter((a: any) => a.resultado === 'aprovado').length;

      const estatisticas = {
        mediaPreTeste: notasPre.length > 0 ? notasPre.reduce((a: number, b: number) => a + b, 0) / notasPre.length : 0,
        mediaPosTeste: notasPos.length > 0 ? notasPos.reduce((a: number, b: number) => a + b, 0) / notasPos.length : 0,
        taxaAprovacao: colaboradores.length > 0 ? (aprovados / colaboradores.length) * 100 : 0,
        totalParticipantes: colaboradores.length,
        menorNotaPre: notasPre.length > 0 ? Math.min(...notasPre) : 0,
        maiorNotaPre: notasPre.length > 0 ? Math.max(...notasPre) : 0,
        menorNotaPos: notasPos.length > 0 ? Math.min(...notasPos) : 0,
        maiorNotaPos: notasPos.length > 0 ? Math.max(...notasPos) : 0
      };

      // Buscar fotos da galeria
      const { data: fotosData } = await db
        .from('turma_anexos')
        .select('url, nome, descricao, data_foto, created_at')
        .eq('turma_id', turmaId)
        .eq('tipo', 'galeria');

      // Buscar cases de sucesso selecionados
      const { data: casesSucessoData } = await db
        .from('turma_cases_sucesso')
        .select('avaliacao_resposta_id')
        .eq('turma_id', turmaId);
      const casesSucessoIds = (casesSucessoData || []).map((c: any) => c.avaliacao_resposta_id);

      // Buscar avaliações de reação com comentários
      let avaliacoesReacao: any[] = [];
      let casesSucesso: any[] = [];
      let estatisticasReacao: any = null;
      try {
        // Buscar todas as respostas de avaliação de reação
        const { data: avaliacoesReacaoData } = await db
          .from('avaliacao_reacao_respostas')
          .select('id, sugestoes_comentarios, created_at, colaborador_id, respostas, modelo_id')
          .eq('turma_id', turmaId);

        // Buscar nomes dos colaboradores separadamente
        if (avaliacoesReacaoData && avaliacoesReacaoData.length > 0) {
          const colaboradorIds = avaliacoesReacaoData.map((a: any) => a.colaborador_id).filter(Boolean);
          const { data: colaboradoresReacao } = await db
            .from('colaboradores')
            .select('id, nome, cpf')
            .in('id', colaboradorIds);

          const colaboradoresMap = new Map((colaboradoresReacao || []).map((c: any) => [c.id, c]));

          // Buscar categorias e itens do modelo de avaliação
          const modeloId = avaliacoesReacaoData[0]?.modelo_id;
          let perguntasModelo: any[] = [];
          if (modeloId) {
            // Buscar categorias do modelo
            const { data: categoriasData } = await db
              .from('avaliacao_reacao_categorias')
              .select('id, nome, qtd_opcoes_resposta, ordem')
              .eq('modelo_id', modeloId)
              .order('ordem');

            if (categoriasData && categoriasData.length > 0) {
              // Buscar itens de todas as categorias
              const categoriaIds = categoriasData.map((c: any) => c.id);
              const { data: itensData } = await db
                .from('avaliacao_reacao_itens')
                .select('id, categoria_id, texto, ordem')
                .in('categoria_id', categoriaIds)
                .order('ordem');

              // Buscar opções de resposta de todas as categorias
              const { data: opcoesData } = await db
                .from('avaliacao_reacao_opcoes_resposta')
                .select('id, categoria_id, valor, texto')
                .in('categoria_id', categoriaIds);

              // Montar estrutura de perguntas por categoria
              perguntasModelo = categoriasData.map((cat: any) => {
                const itens = (itensData || []).filter((i: any) => i.categoria_id === cat.id);
                const opcoes = (opcoesData || []).filter((o: any) => o.categoria_id === cat.id);
                return {
                  id: cat.id,
                  categoria: cat.nome,
                  qtd_opcoes: cat.qtd_opcoes_resposta,
                  itens: itens.map((i: any) => ({ id: i.id, texto: i.texto })),
                  opcoes: opcoes.map((o: any) => ({ valor: o.valor, texto: o.texto }))
                };
              });
            }
          }

          // Calcular estatísticas de reação por CATEGORIA (gráfico completo por página)
          if (perguntasModelo.length > 0) {
            const categoriaStats: any[] = [];
            
            perguntasModelo.forEach((cat: any) => {
              const itensStats = cat.itens.map((item: any) => {
                const respostasCount: Record<string, number> = {};
                let soma = 0;
                let count = 0;
                
                avaliacoesReacaoData.forEach((a: any) => {
                  const resposta = a.respostas?.[item.id];
                  if (resposta !== undefined && resposta !== null) {
                    const valor = parseInt(resposta);
                    if (!isNaN(valor)) {
                      soma += valor;
                      count++;
                    }
                    respostasCount[resposta] = (respostasCount[resposta] || 0) + 1;
                  }
                });

                return {
                  pergunta: item.texto,
                  respostas: respostasCount,
                  media: count > 0 ? soma / count : undefined
                };
              });

              categoriaStats.push({
                categoria: cat.categoria,
                tipo: cat.qtd_opcoes <= 2 ? 'sim_nao' : 'escala',
                qtd_opcoes: cat.qtd_opcoes,
                itens: itensStats,
                opcoes: cat.opcoes || []
              });
            });

            estatisticasReacao = {
              totalRespostas: avaliacoesReacaoData.length,
              categorias: categoriaStats
            };
          }

          avaliacoesReacao = avaliacoesReacaoData
            .filter((a: any) => a.sugestoes_comentarios && a.sugestoes_comentarios.trim())
            .map((a: any) => {
              const colab = colaboradoresMap.get(a.colaborador_id);
              return {
                id: a.id,
                colaborador_nome: colab?.nome || '',
                colaborador_cpf: colab?.cpf || '',
                sugestoes_comentarios: a.sugestoes_comentarios,
                created_at: a.created_at,
                is_case_sucesso: casesSucessoIds.includes(a.id)
              };
            });

          // Filtrar apenas os cases de sucesso selecionados
          casesSucesso = avaliacoesReacao.filter((a: any) => a.is_case_sucesso);
        }
      } catch (e) {
        console.warn('Erro ao buscar avaliações de reação:', e);
      }

      // Buscar modelo de certificado para o treinamento
      let modeloCertificado: any = null;
      try {
        // Buscar TODOS os modelos de certificado ativos com seus treinamentos vinculados
        const { data: modelosData } = await db
          .from('modelo_relatorios')
          .select(`
            id, nome, largura, altura, moldura_url, selecao_treinamento,
            treinamentos:modelo_relatorio_treinamentos(treinamento_id)
          `)
          .eq('empresa_id', turmaData.empresa_id)
          .eq('tipo', 'certificado')
          .eq('ativo', true);

        // Encontrar o modelo que se aplica a este treinamento (mesma lógica de VisualizarCertificado)
        let modeloAplicavel: any = null;
        let modeloTodos: any = null;
        if (modelosData && modelosData.length > 0) {
          for (const modelo of modelosData) {
            if (modelo.selecao_treinamento === 'individual') {
              const treinamentosIds = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
              if (treinamentosIds.includes(turmaData.treinamento_id)) {
                modeloAplicavel = modelo;
                break; // Modelo específico tem prioridade
              }
            } else if (modelo.selecao_treinamento === 'todos_exceto') {
              const treinamentosExcluidos = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
              if (!treinamentosExcluidos.includes(turmaData.treinamento_id)) {
                modeloAplicavel = modelo;
              }
            } else if (modelo.selecao_treinamento === 'todos') {
              modeloTodos = modelo;
            }
          }
          // Se não encontrou modelo específico, usar o "todos"
          if (!modeloAplicavel) modeloAplicavel = modeloTodos;
        }

        if (modeloAplicavel) {
          const modeloId = modeloAplicavel.id;

          const { data: paginasData } = await db
            .from('modelo_relatorio_paginas')
            .select('id, numero, nome, conteudo, moldura_url, justify_content, align_items, flex_direction, padding, text_align')
            .eq('modelo_id', modeloId)
            .order('numero');

          // Buscar blocos de cada página
          if (paginasData && paginasData.length > 0) {
            const paginaIds = paginasData.map((p: any) => p.id);
            const { data: blocosData } = await db
              .from('modelo_relatorio_blocos')
              .select('*')
              .in('pagina_id', paginaIds)
              .order('ordem');

            // Associar blocos às páginas
            const paginasComBlocos = paginasData.map((p: any) => ({
              ...p,
              blocos: (blocosData || []).filter((b: any) => b.pagina_id === p.id)
            }));

            modeloCertificado = {
              ...modeloAplicavel,
              paginas: paginasComBlocos
            };
          } else {
            modeloCertificado = {
              ...modeloAplicavel,
              paginas: []
            };
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar modelo de certificado:', e);
      }

      // Buscar reorientações dos colaboradores
      let reorientacoes: any[] = [];
      try {
        const { data: reorientacoesData } = await db
          .from('reorientacoes_colaborador')
          .select('*')
          .eq('turma_id', turmaId)
          .order('created_at', { ascending: true });

        if (reorientacoesData) {
          reorientacoes = reorientacoesData;
        }
      } catch (e) {
        console.warn('Erro ao buscar reorientações:', e);
      }

      // Montar local do treinamento (endereço já está formatado completo)
      const localTreinamento = clienteData?.endereco || '';

      // Montar assinaturas para o certificado
      const assinaturas: Assinatura[] = [];
      
      // Diretor Técnico
      if (infoEmpresaData?.diretor_tecnico_nome) {
        assinaturas.push({
          nome: infoEmpresaData.diretor_tecnico_nome,
          cargo: 'Diretor Técnico',
          formacao: infoEmpresaData.diretor_tecnico_formacao || '',
          registro: infoEmpresaData.diretor_tecnico_registro_numero 
            ? `${infoEmpresaData.diretor_tecnico_registro_tipo || ''} ${infoEmpresaData.diretor_tecnico_registro_numero}${infoEmpresaData.diretor_tecnico_registro_estado ? `/${infoEmpresaData.diretor_tecnico_registro_estado}` : ''}`
            : '',
          assinatura_url: infoEmpresaData.diretor_tecnico_assinatura_url
        });
      }

      // Instrutor
      if (instrutorData?.nome) {
        const primeiraFormacao = formacoesInstrutor[0];
        assinaturas.push({
          nome: instrutorData.nome,
          cargo: 'Instrutor',
          formacao: primeiraFormacao?.nome || instrutorData.formacao_academica || '',
          registro: primeiraFormacao?.registro_numero 
            ? `${primeiraFormacao.registro_tipo || ''} ${primeiraFormacao.registro_numero}${primeiraFormacao.registro_estado ? `/${primeiraFormacao.registro_estado}` : ''}`
            : '',
          assinatura_url: instrutorData.assinatura_url
        });
      }

      setDados({
        turma: {
          id: turmaData.id,
          codigo_turma: turmaData.codigo_turma || `T${turmaData.numero_turma}`,
          numero_turma: turmaData.numero_turma,
          data_inicio: dataInicio,
          data_fim: dataFim,
          tipo_treinamento: turmaData.tipo_treinamento,
          local_treinamento: localTreinamento,
          categorizacao_tecnica: turmaData.categorizacao_tecnica || null
        },
        treinamento: {
          id: turmaData.treinamento_id,
          nome: treinamentoData?.nome || '',
          norma: treinamentoData?.norma || '',
          carga_horaria: turmaData.carga_horaria_total || (turmaData.tipo_treinamento?.toLowerCase() === 'periódico' || turmaData.tipo_treinamento?.toLowerCase() === 'periodico' || turmaData.tipo_treinamento === 'reciclagem'
            ? (treinamentoData?.ch_reciclagem || 0) 
            : (treinamentoData?.ch_formacao || 0)),
          conteudo_programatico: treinamentoData?.conteudo_programatico || '',
          validade: treinamentoData?.validade || 'Anual'
        },
        cliente: {
          nome: clienteData?.nome || '',
          cnpj: clienteData?.cnpj,
          endereco: clienteData?.endereco,
          cidade: clienteData?.cidade,
          estado: clienteData?.estado,
          telefone: clienteData?.telefone,
          email: clienteData?.email
        },
        instrutor: instrutorData ? { 
          id: turmaData.instrutor_id, 
          nome: instrutorData.nome,
          formacao_academica: instrutorData.formacao_academica,
          email: instrutorData.email,
          telefone: instrutorData.telefone,
          assinatura_url: instrutorData.assinatura_url
        } : { id: '', nome: '' },
        empresaSst: {
          nome: empresaData?.nome || '',
          cnpj: empresaData?.cnpj,
          logo_url: empresaData?.logo_url,
          endereco: empresaData?.endereco,
          cidade: empresaData?.cidade,
          estado: empresaData?.estado,
          telefone: empresaData?.telefone,
          email: empresaData?.email
        },
        infoEmpresa: infoEmpresaData || {},
        colaboradores,
        colaboradoresParaCertificado,
        avaliacoes,
        avaliacoesReacao,
        casesSucesso,
        fotos: fotosData || [],
        formacoesInstrutor,
        datasAulas: datasOrdenadas,
        assinaturas,
        estatisticas,
        modeloCertificado,
        estatisticasReacao,
        reorientacoes
      });

    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  // Constantes de paginação
  const COLAB_POR_PAG_PRESENCA = 12;
  const COLAB_POR_PAG_PROVAS = 18;

  // Definir páginas do relatório
  const getPaginas = () => {
    if (!dados) return [];
    
    const paginas: Array<{ id: string; nome: string; tipo: 'capa' | 'pagina' | 'certificado' }> = [];
    
    // CAPA 1 - Relatório de Treinamento
    paginas.push({ id: 'capa-relatorio', nome: 'Capa - Relatório', tipo: 'capa' });
    
    // Índice
    paginas.push({ id: 'indice', nome: 'Índice', tipo: 'pagina' });
    
    // Empresa SST
    paginas.push({ id: 'empresa-sst', nome: 'Empresa SST', tipo: 'pagina' });
    
    // Empresa Cliente
    paginas.push({ id: 'empresa-cliente', nome: 'Empresa Cliente', tipo: 'pagina' });
    
    // Informações do Treinamento
    paginas.push({ id: 'info-treinamento', nome: 'Informações do Treinamento', tipo: 'pagina' });
    
    // Informações da Turma
    paginas.push({ id: 'info-turma', nome: 'Informações da Turma', tipo: 'pagina' });
    
    // Informações do Instrutor
    paginas.push({ id: 'info-instrutor', nome: 'Informações do Instrutor', tipo: 'pagina' });
    
    // CAPA 2 - Lista de Presença
    paginas.push({ id: 'capa-presenca', nome: 'Capa - Lista de Presença', tipo: 'capa' });
    
    // Páginas de presença (paginadas)
    const totalPaginasPresenca = Math.ceil(dados.colaboradores.length / COLAB_POR_PAG_PRESENCA);
    for (let i = 0; i < totalPaginasPresenca; i++) {
      paginas.push({ id: `presenca-${i}`, nome: `Lista de Presença ${i + 1}/${totalPaginasPresenca}`, tipo: 'pagina' });
    }
    
    // CAPA 3 - Provas
    paginas.push({ id: 'capa-provas', nome: 'Capa - Provas', tipo: 'capa' });
    
    // Página de gráficos de provas
    paginas.push({ id: 'provas-graficos', nome: 'Gráficos de Provas', tipo: 'pagina' });
    
    // Páginas de notas (paginadas)
    const totalPaginasProvas = Math.ceil(dados.colaboradores.length / COLAB_POR_PAG_PROVAS);
    for (let i = 0; i < totalPaginasProvas; i++) {
      paginas.push({ id: `provas-lista-${i}`, nome: `Notas ${i + 1}/${totalPaginasProvas}`, tipo: 'pagina' });
    }
    
    // CAPA 4 - Reorientação (se houver reorientações)
    if (dados.reorientacoes && dados.reorientacoes.length > 0) {
      paginas.push({ id: 'capa-reorientacao', nome: 'Capa - Reorientação', tipo: 'capa' });
      paginas.push({ id: 'reorientacao-explicacao', nome: 'O que é Reorientação', tipo: 'pagina' });
      paginas.push({ id: 'reorientacao-lista', nome: 'Colaboradores Reorientados', tipo: 'pagina' });
      // Uma página por reorientação
      dados.reorientacoes.forEach((_, idx) => {
        paginas.push({ id: `reorientacao-${idx}`, nome: `Reorientação ${idx + 1}`, tipo: 'pagina' });
      });
    }
    
    // CAPA 5 - Cases de Sucesso (se houver cases selecionados)
    if (dados.casesSucesso.length > 0) {
      paginas.push({ id: 'capa-cases-sucesso', nome: 'Capa - Cases de Sucesso', tipo: 'capa' });
      paginas.push({ id: 'cases-sucesso', nome: 'Cases de Sucesso', tipo: 'pagina' });
    }
    
    // CAPA 5 - Avaliação de Reação - Estatísticas (se houver estatísticas)
    if (dados.estatisticasReacao && dados.estatisticasReacao.categorias.length > 0) {
      paginas.push({ id: 'capa-avaliacao-reacao', nome: 'Capa - Avaliação de Reação', tipo: 'capa' });
      // Uma página por CATEGORIA (gráfico completo)
      dados.estatisticasReacao.categorias.forEach((cat, idx) => {
        paginas.push({ id: `reacao-grafico-${idx}`, nome: `${cat.categoria}`, tipo: 'pagina' });
      });
    }
    
    // CAPA 6 - Imagens do Treinamento (se houver fotos)
    if (dados.fotos.length > 0) {
      paginas.push({ id: 'capa-imagens', nome: 'Capa - Imagens', tipo: 'capa' });
      dados.fotos.forEach((_, idx) => {
        paginas.push({ id: `foto-${idx}`, nome: `Foto ${idx + 1}`, tipo: 'pagina' });
      });
    }
    
    // CAPA 6 - Certificados (apenas colaboradores aprovados sem sinistro)
    const colaboradoresCert = (dados as any).colaboradoresParaCertificado || dados.colaboradores.filter((c: any) => !c.temSinistro);
    if (colaboradoresCert.length > 0) {
      paginas.push({ id: 'capa-certificados', nome: 'Capa - Certificados', tipo: 'capa' });
      
      // Certificados dos colaboradores aprovados (sem sinistro)
      colaboradoresCert.forEach((_: any, idx: number) => {
        paginas.push({ id: `certificado-frente-${idx}`, nome: `Certificado ${idx + 1} - Frente`, tipo: 'certificado' });
        paginas.push({ id: `certificado-verso-${idx}`, nome: `Certificado ${idx + 1} - Verso`, tipo: 'certificado' });
      });
    }
    
    // CAPA 7 - Instrutor (formações e anexos)
    if (dados.formacoesInstrutor.length > 0) {
      paginas.push({ id: 'capa-instrutor', nome: 'Capa - Instrutor', tipo: 'capa' });
      paginas.push({ id: 'instrutor-resumo', nome: 'Resumo do Instrutor', tipo: 'pagina' });
      dados.formacoesInstrutor.forEach((f, idx) => {
        if (f.formacao_anexo_url) {
          paginas.push({ id: `instrutor-formacao-${idx}`, nome: `Formação ${idx + 1}`, tipo: 'pagina' });
        }
        if (f.treinamento_anexo_url) {
          paginas.push({ id: `instrutor-treinamento-${idx}`, nome: `Treinamento ${idx + 1}`, tipo: 'pagina' });
        }
      });
    }
    
    // CAPA 8 - Agradecimentos
    paginas.push({ id: 'capa-agradecimentos', nome: 'Capa - Agradecimentos', tipo: 'capa' });
    paginas.push({ id: 'agradecimentos', nome: 'Agradecimentos', tipo: 'pagina' });

    return paginas;
  };

  // Verificar se a página é de certificado (horizontal)
  const isPaginaCertificado = (paginaId: string) => {
    return paginaId.startsWith('certificado-frente-') || paginaId.startsWith('certificado-verso-');
  };

  // Verificar se relatório já foi validado
  const verificarRelatorioValidado = async () => {
    if (!turmaId) return;
    
    const { data } = await db
      .from('turma_anexos')
      .select('id')
      .eq('turma_id', turmaId)
      .eq('tipo', 'relatorio')
      .maybeSingle();
    
    setRelatorioValidado(!!data);
  };

  // Função para validar e salvar o relatório no storage
  const handleValidarRelatorio = async () => {
    if (!relatorioRef.current || !dados || !turmaId) return;

    try {
      setValidando(true);
      toast.info('Gerando e salvando relatório... Aguarde.');
      
      const paginas = getPaginas();
      
      // Iniciar com a orientação da primeira página
      const primeiraPaginaHorizontal = isPaginaCertificado(paginas[0]?.id || '');
      const pdf = new jsPDF({
        orientation: primeiraPaginaHorizontal ? 'landscape' : 'portrait',
        unit: 'px',
        format: primeiraPaginaHorizontal ? [1123, 794] : [794, 1123],
        compress: true
      });

      for (let i = 0; i < paginas.length; i++) {
        const paginaId = paginas[i].id;
        const isHorizontal = isPaginaCertificado(paginaId);
        
        setPaginaAtual(i);
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(relatorioRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        
        if (i > 0) {
          if (isHorizontal) {
            pdf.addPage([1123, 794], 'landscape');
          } else {
            pdf.addPage([794, 1123], 'portrait');
          }
        }
        
        if (isHorizontal) {
          pdf.addImage(imgData, 'JPEG', 0, 0, 1123, 794, undefined, 'FAST');
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
        }
      }

      // Converter PDF para blob
      const pdfBlob = pdf.output('blob');
      
      // Nome do arquivo
      const nomeArquivo = `relatorio_${dados.turma.codigo_turma || dados.turma.numero_turma}_${dados.treinamento.norma}_${Date.now()}.pdf`;
      const arquivoPath = `${turmaId}/${nomeArquivo}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('turma-anexos')
        .upload(arquivoPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('turma-anexos')
        .getPublicUrl(arquivoPath);

      // Verificar se já existe um relatório para esta turma (para substituir)
      const { data: existingRelatorio } = await db
        .from('turma_anexos')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('tipo', 'relatorio')
        .maybeSingle();

      if (existingRelatorio) {
        // Atualizar o existente
        const { error: updateError } = await db
          .from('turma_anexos')
          .update({
            nome: `Relatório NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma} | Cliente: ${dados.cliente.nome}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRelatorio.id);

        if (updateError) throw updateError;
      } else {
        // Inserir novo
        const { error: insertError } = await db
          .from('turma_anexos')
          .insert({
            turma_id: turmaId,
            tipo: 'relatorio',
            nome: `Relatório NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma} | Cliente: ${dados.cliente.nome}`
          });

        if (insertError) throw insertError;
      }

      setRelatorioValidado(true);
      setPaginaAtual(0);
      toast.success('Relatório validado e arquivado com sucesso!');
      
      // Registrar auditoria diretamente (usando empresa_id da turma)
      if (turmaId && dados && profile) {
        try {
          // Buscar empresa_id da turma
          const { data: turmaInfo } = await db
            .from('turmas_treinamento')
            .select('empresa_id')
            .eq('id', turmaId)
            .single();
          
          if (turmaInfo?.empresa_id) {
            await db.from('turmas_auditoria').insert({
              empresa_id: turmaInfo.empresa_id,
              turma_id: turmaId,
              turma_codigo: dados.turma.codigo_turma || `Turma ${dados.turma.numero_turma}`,
              usuario_id: profile.id,
              usuario_nome: profile.nome || 'Usuário',
              usuario_email: profile.email,
              usuario_role: profile.role,
              acao: 'validou',
              entidade: 'relatorio',
              descricao: `Relatório de Treinamento validado (${dados.colaboradores.length} colaboradores)`,
              cliente_nome: dados.cliente.nome,
              treinamento_nome: dados.treinamento.nome,
              treinamento_norma: dados.treinamento.norma,
              user_agent: navigator.userAgent
            });
          }
        } catch (auditError) {
          console.error('Erro ao registrar auditoria:', auditError);
        }
      }
    } catch (error: any) {
      console.error('Erro ao validar relatório:', error);
      toast.error('Erro ao validar relatório: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setValidando(false);
      setPaginaAtual(0);
    }
  };

  const handleDownloadPDF = async () => {
    if (!relatorioRef.current || !dados) return;

    try {
      setGerando(true);
      toast.info('Gerando PDF... Aguarde.');
      
      const paginas = getPaginas();
      
      // Iniciar com a orientação da primeira página
      const primeiraPaginaHorizontal = isPaginaCertificado(paginas[0]?.id || '');
      const pdf = new jsPDF({
        orientation: primeiraPaginaHorizontal ? 'landscape' : 'portrait',
        unit: 'px',
        format: primeiraPaginaHorizontal ? [1123, 794] : [794, 1123],
        compress: true
      });

      for (let i = 0; i < paginas.length; i++) {
        const paginaId = paginas[i].id;
        const isHorizontal = isPaginaCertificado(paginaId);
        
        setPaginaAtual(i);
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(relatorioRef.current, {
          scale: 1.5, // Reduzido de 2 para 1.5 para menor tamanho
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Usar JPEG com qualidade 0.75 para compressão
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        
        if (i > 0) {
          // Adicionar página com orientação correta
          if (isHorizontal) {
            pdf.addPage([1123, 794], 'landscape');
          } else {
            pdf.addPage([794, 1123], 'portrait');
          }
        }
        
        // Ajustar dimensões da imagem conforme orientação - usar FAST para compressão
        if (isHorizontal) {
          pdf.addImage(imgData, 'JPEG', 0, 0, 1123, 794, undefined, 'FAST');
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
        }
      }

      const nomeArquivo = `relatorio_${dados.turma.codigo_turma}_${dados.treinamento.norma || 'treinamento'}.pdf`;
      pdf.save(nomeArquivo);
      
      toast.success('Relatório baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do relatório');
    } finally {
      setGerando(false);
      setPaginaAtual(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
    try {
      return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (semPermissao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6">
            Você não tem permissão para acessar este relatório. 
            Apenas usuários vinculados à turma podem visualizá-lo.
          </p>
          <Button onClick={handleVoltar} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Não foi possível carregar os dados do relatório.</p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const paginas = getPaginas();
  const paginaAtualData = paginas[paginaAtual];
  // Montar endereço completo da empresa SST
  const enderecoEmpresa = [
    dados.empresaSst?.endereco,
    dados.empresaSst?.cidade,
    dados.empresaSst?.estado
  ].filter(Boolean).join(', ') || '';
  // Priorizar logo_pequena_url de infoEmpresa, senão usar logo_url da empresa
  const logoUrl = dados.infoEmpresa?.logo_pequena_url || dados.empresaSst?.logo_url;

  // Estilos base do relatório - design profissional e limpo
  const estilos = {
    pagina: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif', background: '#fff' },
    header: { background: '#1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerLogo: { height: '40px', objectFit: 'contain' as const },
    headerTexto: { color: '#fff', fontSize: '14px', fontWeight: '500' as const },
    titulo: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' },
    tituloH2: { fontSize: '24px', fontWeight: '600' as const, color: '#1e293b', margin: 0 },
    subtitulo: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    conteudo: { flex: 1, padding: '24px 32px', overflow: 'hidden' as const },
    rodape: { background: '#1e293b', color: '#94a3b8', padding: '12px 32px', fontSize: '11px', textAlign: 'center' as const },
    label: { fontSize: '10px', fontWeight: '600' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' },
    valor: { fontSize: '14px', color: '#1e293b', fontWeight: '500' as const },
    card: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' },
    tabela: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
    thTabela: { background: '#f1f5f9', padding: '10px 12px', textAlign: 'left' as const, fontWeight: '600' as const, color: '#475569', borderBottom: '2px solid #e2e8f0' },
    tdTabela: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#374151' },
  };

  // Renderizar conteúdo da página atual
  const renderPagina = () => {
    const paginaId = paginaAtualData?.id || 'capa';

    // Componente de cabeçalho reutilizável (sem logo - logo apenas na capa)
    const Header = () => (
      <div style={estilos.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...estilos.headerTexto, fontSize: '14px', fontWeight: '600' }}>{dados.empresaSst.nome}</span>
          <span style={{ ...estilos.headerTexto, fontSize: '10px', opacity: 0.8 }}>CNPJ: {dados.empresaSst.cnpj || '-'}</span>
        </div>
        <span style={estilos.headerTexto}>{dados.turma.codigo_turma}</span>
      </div>
    );

    // Componente de rodapé reutilizável
    const Rodape = () => (
      <div style={{ 
        background: '#1e293b',
        padding: '10px 24px',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        minHeight: '48px'
      }}>
        {/* Lado esquerdo - Informações da empresa SST */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '10px' }}>
          <span style={{ fontWeight: '600', color: '#fff' }}>{dados.empresaSst.nome}</span>
          {dados.empresaSst.email && (
            <>
              <span style={{ color: '#475569' }}>|</span>
              <span>{dados.empresaSst.email}</span>
            </>
          )}
          {dados.empresaSst.telefone && (
            <>
              <span style={{ color: '#475569' }}>|</span>
              <span>{formatarTelefone(dados.empresaSst.telefone)}</span>
            </>
          )}
        </div>
        {/* Lado direito - Informações da página */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', fontSize: '10px' }}>
          <span style={{ color: '#cbd5e1' }}>{paginaAtualData?.nome || 'Página'}</span>
          <span style={{ background: '#334155', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#fff' }}>
            {paginaAtual + 1} / {paginas.length}
          </span>
        </div>
      </div>
    );

    // Componente de Capa genérico
    const RenderCapa = ({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) => (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
        <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {logoUrl ? <img src={logoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} crossOrigin="anonymous" /> : <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', textAlign: 'center' }}>{dados.empresaSst.nome}</div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '300', color: '#fff', textAlign: 'center', marginBottom: '12px', letterSpacing: '2px' }}>{titulo}</h1>
          {subtitulo && <p style={{ fontSize: '16px', color: '#94a3b8', textAlign: 'center' }}>{subtitulo}</p>}
          <div style={{ width: '80px', height: '3px', background: '#3b82f6', marginTop: '24px' }} />
        </div>
        <div style={{ padding: '32px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', color: '#fff' }}>
            <div><div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase' }}>Treinamento</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.treinamento.nome}</div></div>
            <div><div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase' }}>Turma</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.turma.codigo_turma}</div></div>
            <div><div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase' }}>Cliente</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.cliente.nome}</div></div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{dados.empresaSst.nome} | CNPJ: {dados.empresaSst.cnpj || '-'}</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{enderecoEmpresa}</div>
          </div>
        </div>
      </div>
    );

    // CAPAS
    if (paginaId === 'capa-relatorio') return <RenderCapa titulo="Relatório de Treinamento" />;
    if (paginaId === 'capa-presenca') return <RenderCapa titulo="Lista de Presença" subtitulo="Registro de frequência dos colaboradores" />;
    if (paginaId === 'capa-provas') return <RenderCapa titulo="Provas" subtitulo="Avaliações pré-teste e pós-teste" />;
    if (paginaId === 'capa-reorientacao') return <RenderCapa titulo="Reorientação" subtitulo="Colaboradores que necessitaram de reorientação" />;
    if (paginaId === 'capa-avaliacao-reacao') return <RenderCapa titulo="Avaliação de Reação" subtitulo="Gráficos e estatísticas do treinamento" />;
    if (paginaId === 'capa-cases-sucesso') return <RenderCapa titulo="Cases de Sucesso" subtitulo="Feedback e sugestões dos colaboradores" />;
    if (paginaId === 'capa-imagens') return <RenderCapa titulo="Imagens do Treinamento" subtitulo="Registro fotográfico" />;
    if (paginaId === 'capa-certificados') return <RenderCapa titulo="Certificados" subtitulo="Certificados de conclusão" />;
    if (paginaId === 'capa-instrutor') return <RenderCapa titulo="Instrutor" subtitulo="Formações e certificações" />;
    if (paginaId === 'capa-agradecimentos') return <RenderCapa titulo="Agradecimentos" />;

    // ÍNDICE
    if (paginaId === 'indice') {
      // Calcular seções dinâmicas baseadas nas capas
      const secoes: Array<{ nome: string; capaId: string; paginaInicio: number; paginaFim: number }> = [];
      
      // Encontrar todas as capas e calcular suas páginas
      let capaAtual: { nome: string; capaId: string; paginaInicio: number } | null = null;
      
      paginas.forEach((pag, idx) => {
        if (pag.tipo === 'capa') {
          // Se já tinha uma capa anterior, fechar ela
          if (capaAtual) {
            secoes.push({
              ...capaAtual,
              paginaFim: idx // A página anterior à nova capa
            });
          }
          // Iniciar nova seção
          const nomeSecao = pag.nome.replace('Capa - ', '');
          capaAtual = {
            nome: nomeSecao,
            capaId: pag.id,
            paginaInicio: idx + 1 // +1 porque páginas são 1-indexed para o usuário
          };
        }
      });
      
      // Fechar a última seção
      if (capaAtual) {
        secoes.push({
          ...capaAtual,
          paginaFim: paginas.length
        });
      }

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Índice</h2>
            <p style={estilos.subtitulo}>Sumário do relatório</p>
          </div>
          <div style={estilos.conteudo}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '2px solid #1e293b', fontSize: '12px', fontWeight: '600', color: '#1e293b', textTransform: 'uppercase' }}>Seção</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '2px solid #1e293b', fontSize: '12px', fontWeight: '600', color: '#1e293b', width: '100px' }}>Páginas</th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((secao, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      {secao.nome}
                    </td>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                        {secao.paginaInicio === secao.paginaFim 
                          ? secao.paginaInicio 
                          : `${secao.paginaInicio} - ${secao.paginaFim}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '24px', padding: '12px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Total de páginas: <strong style={{ color: '#1e293b' }}>{paginas.length}</strong>
              </p>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // CAPA ANTIGA (mantida para compatibilidade)
    if (paginaId === 'capa') {
      return (
        <div style={{ ...estilos.pagina, background: '#fff' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
            {/* Logo */}
            <div style={{ marginBottom: '40px' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: '120px', objectFit: 'contain' }} crossOrigin="anonymous" />
              ) : (
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{dados.empresaSst.nome}</div>
              )}
            </div>

            {/* Título */}
            <h1 style={{ fontSize: '36px', fontWeight: '300', color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Relatório de Treinamento
            </h1>
            <div style={{ width: '60px', height: '3px', background: '#3b82f6', marginBottom: '40px' }} />

            {/* Informações principais */}
            <div style={{ width: '100%', maxWidth: '480px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <p style={estilos.label}>Treinamento</p>
                <p style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.nome}</p>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Norma Regulamentadora: {dados.treinamento.norma}</p>
              </div>
              
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <p style={estilos.label}>Empresa Cliente</p>
                <p style={{ fontSize: '18px', fontWeight: '500', color: '#1e293b', margin: 0 }}>{dados.cliente.nome}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={estilos.label}>Turma</p>
                  <p style={{ ...estilos.valor, fontSize: '16px' }}>{dados.turma.codigo_turma}</p>
                </div>
                <div>
                  <p style={estilos.label}>Data</p>
                  <p style={{ ...estilos.valor, fontSize: '16px' }}>
                    {formatarData(dados.turma.data_inicio)}
                    {dados.turma.data_fim && dados.turma.data_fim !== dados.turma.data_inicio && ` - ${formatarData(dados.turma.data_fim)}`}
                  </p>
                </div>
                <div>
                  <p style={estilos.label}>Carga Horária</p>
                  <p style={{ ...estilos.valor, fontSize: '16px' }}>{dados.treinamento.carga_horaria}h</p>
                </div>
                <div>
                  <p style={estilos.label}>Participantes</p>
                  <p style={{ ...estilos.valor, fontSize: '16px' }}>{dados.estatisticas.totalParticipantes}</p>
                </div>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // EMPRESA SST
    if (paginaId === 'empresa-sst') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Empresa de SST</h2>
            <p style={estilos.subtitulo}>Informações da empresa prestadora de serviços de segurança do trabalho</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Dados da empresa */}
              <div style={{ ...estilos.card, display: 'flex', alignItems: 'center', gap: '20px' }}>
                {logoUrl && (
                  <div style={{ flexShrink: 0 }}>
                    <img src={logoUrl} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} crossOrigin="anonymous" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', margin: 0, marginBottom: '4px' }}>{dados.empresaSst.nome}</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{enderecoEmpresa}</p>
                </div>
              </div>

              {/* Diretor Técnico */}
              <div style={estilos.card}>
                <p style={{ ...estilos.label, marginBottom: '8px' }}>Responsável Técnico</p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                  {dados.infoEmpresa?.diretor_tecnico_nome || 'Não informado'}
                </p>
                {dados.infoEmpresa?.diretor_tecnico_formacao && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{dados.infoEmpresa.diretor_tecnico_formacao}</p>
                )}
                {dados.infoEmpresa?.diretor_tecnico_registro_numero && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {dados.infoEmpresa.diretor_tecnico_registro_tipo} {dados.infoEmpresa.diretor_tecnico_registro_numero}
                    {dados.infoEmpresa.diretor_tecnico_registro_estado && `/${dados.infoEmpresa.diretor_tecnico_registro_estado}`}
                  </p>
                )}
              </div>

              {/* Missão, Visão, Valores */}
              {(dados.infoEmpresa?.missao || dados.infoEmpresa?.visao || dados.infoEmpresa?.valores) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ ...estilos.card, borderLeft: '3px solid #3b82f6' }}>
                    <p style={{ ...estilos.label, color: '#3b82f6' }}>Missão</p>
                    <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: 0 }}>{dados.infoEmpresa?.missao || '-'}</p>
                  </div>
                  <div style={{ ...estilos.card, borderLeft: '3px solid #22c55e' }}>
                    <p style={{ ...estilos.label, color: '#22c55e' }}>Visão</p>
                    <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: 0 }}>{dados.infoEmpresa?.visao || '-'}</p>
                  </div>
                  <div style={{ ...estilos.card, borderLeft: '3px solid #f59e0b' }}>
                    <p style={{ ...estilos.label, color: '#f59e0b' }}>Valores</p>
                    <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>{dados.infoEmpresa?.valores || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // EMPRESA CLIENTE (novo ID)
    if (paginaId === 'empresa-cliente') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Empresa Cliente</h2>
            <p style={estilos.subtitulo}>Informações da empresa contratante do treinamento</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ ...estilos.card, maxWidth: '600px' }}>
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <p style={estilos.label}>Razão Social / Nome</p>
                <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.cliente.nome || 'Não informado'}</h3>
                {dados.cliente.cnpj && <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>CNPJ: {dados.cliente.cnpj}</p>}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <p style={estilos.label}>Endereço</p>
                <p style={estilos.valor}>{dados.cliente.endereco || 'Não informado'}</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={estilos.label}>Cidade</p>
                  <p style={estilos.valor}>{dados.cliente.cidade || 'Não informado'}</p>
                </div>
                <div>
                  <p style={estilos.label}>Estado</p>
                  <p style={estilos.valor}>{dados.cliente.estado || 'Não informado'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={estilos.label}>Telefone</p>
                  <p style={estilos.valor}>{formatarTelefone(dados.cliente.telefone) || 'Não informado'}</p>
                </div>
                <div>
                  <p style={estilos.label}>E-mail</p>
                  <p style={estilos.valor}>{dados.cliente.email || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // CLIENTE/EMPRESA (mantido para compatibilidade)
    if (paginaId === 'cliente-empresa') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Cliente/Empresa</h2>
            <p style={estilos.subtitulo}>Informações da empresa contratante do treinamento</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ ...estilos.card, maxWidth: '600px' }}>
              {/* Nome da Empresa */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <p style={estilos.label}>Razão Social / Nome</p>
                <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                  {dados.cliente.nome || 'Não informado'}
                </h3>
              </div>
              
              {/* Endereço */}
              <div style={{ marginBottom: '16px' }}>
                <p style={estilos.label}>Endereço</p>
                <p style={estilos.valor}>
                  {dados.cliente.endereco || 'Não informado'}
                </p>
              </div>
              
              {/* Cidade e Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={estilos.label}>Cidade</p>
                  <p style={estilos.valor}>{dados.cliente.cidade || 'Não informado'}</p>
                </div>
                <div>
                  <p style={estilos.label}>Estado</p>
                  <p style={estilos.valor}>{dados.cliente.estado || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // INFO TREINAMENTO (novo ID)
    if (paginaId === 'info-treinamento') {
      const formatarConteudo = (json: string): string[] => {
        if (!json) return [];
        try {
          const blocos = JSON.parse(json) as Array<{ titulo: string; itens: string }>;
          return blocos.flatMap(bloco => {
            const itens = bloco.itens.split('\n').filter((i: string) => i.trim());
            return bloco.titulo ? [`**${bloco.titulo}**`, ...itens] : itens;
          });
        } catch {
          return json.split(';').filter((i: string) => i.trim());
        }
      };
      const conteudoItems = formatarConteudo(dados.treinamento.conteudo_programatico || '');

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Informações do Treinamento</h2>
            <p style={estilos.subtitulo}>Detalhes técnicos e conteúdo programático</p>
          </div>
          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                <div style={estilos.card}><p style={estilos.label}>Nome do Treinamento</p><p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.nome}</p></div>
                <div style={estilos.card}><p style={estilos.label}>Norma Regulamentadora</p><p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.norma}</p></div>
                <div style={estilos.card}><p style={estilos.label}>Carga Horária</p><p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.carga_horaria} horas</p></div>
              </div>
              <div style={estilos.card}>
                <p style={{ ...estilos.label, marginBottom: '12px' }}>Conteúdo Programático</p>
                {conteudoItems.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '12px', color: '#374151' }}>
                    {conteudoItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        {item.startsWith('**') ? <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.replace(/\*\*/g, '')}</span> : <><span style={{ color: '#3b82f6', flexShrink: 0 }}>•</span><span>{item}</span></>}
                      </div>
                    ))}
                  </div>
                ) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Conteúdo programático não disponível</p>}
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // INFO TURMA (novo ID)
    if (paginaId === 'info-turma') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Informações da Turma</h2>
            <p style={estilos.subtitulo}>Dados da turma de treinamento</p>
          </div>
          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={estilos.card}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Dados da Turma</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div><p style={estilos.label}>Código da Turma</p><p style={estilos.valor}>{dados.turma.codigo_turma}</p></div>
                  <div><p style={estilos.label}>Tipo de Treinamento</p><p style={estilos.valor}>{formatarTipoTreinamento(dados.turma.tipo_treinamento)}</p></div>
                  <div><p style={estilos.label}>Período</p><p style={estilos.valor}>{formatarData(dados.turma.data_inicio)}{dados.turma.data_fim && dados.turma.data_fim !== dados.turma.data_inicio && ` a ${formatarData(dados.turma.data_fim)}`}</p></div>
                  <div><p style={estilos.label}>Local</p><p style={estilos.valor}>{dados.turma.local_treinamento || 'Não informado'}</p></div>
                  <div><p style={estilos.label}>Total de Participantes</p><p style={{ ...estilos.valor, fontSize: '18px', fontWeight: '600' }}>{dados.estatisticas.totalParticipantes}</p></div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ ...estilos.card, borderLeft: '3px solid #3b82f6' }}><p style={estilos.label}>Empresa Prestadora</p><p style={{ ...estilos.valor, fontWeight: '600' }}>{dados.empresaSst.nome}</p></div>
                <div style={{ ...estilos.card, borderLeft: '3px solid #f59e0b' }}><p style={estilos.label}>Empresa Cliente</p><p style={{ ...estilos.valor, fontWeight: '600' }}>{dados.cliente.nome}</p></div>
                <div style={{ ...estilos.card, borderLeft: '3px solid #22c55e' }}><p style={estilos.label}>Responsável Técnico</p><p style={{ ...estilos.valor, fontWeight: '600' }}>{dados.infoEmpresa?.diretor_tecnico_nome || '-'}</p></div>
                <div style={{ ...estilos.card, borderLeft: '3px solid #8b5cf6' }}><p style={estilos.label}>Instrutor</p><p style={{ ...estilos.valor, fontWeight: '600' }}>{dados.instrutor.nome}</p></div>
              </div>
            </div>
            <div style={{ ...estilos.card, marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Colaboradores Participantes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                {dados.colaboradores.slice(0, 21).map((c, idx) => (
                  <div key={idx} style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}><span style={{ fontWeight: '500', color: '#374151' }}>{idx + 1}. {c.nome}</span></div>
                ))}
                {dados.colaboradores.length > 21 && <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', textAlign: 'center', color: '#64748b' }}>+ {dados.colaboradores.length - 21} colaboradores</div>}
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // INFO INSTRUTOR (novo ID)
    if (paginaId === 'info-instrutor') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Informações do Instrutor</h2>
            <p style={estilos.subtitulo}>Dados e qualificações do instrutor responsável</p>
          </div>
          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              <div style={{ ...estilos.card, textAlign: 'center', padding: '24px' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: '600', margin: '0 auto 16px' }}>{dados.instrutor.nome?.charAt(0)?.toUpperCase() || 'I'}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px' }}>{dados.instrutor.nome}</h3>
                {dados.instrutor.formacao_academica && <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0 }}>{dados.instrutor.formacao_academica}</p>}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                  {dados.instrutor.email && <p style={{ margin: '4px 0' }}>{dados.instrutor.email}</p>}
                  {dados.instrutor.telefone && <p style={{ margin: '4px 0' }}>{formatarTelefone(dados.instrutor.telefone)}</p>}
                </div>
              </div>
              <div style={estilos.card}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Formações para este Treinamento</h4>
                {dados.formacoesInstrutor.length > 0 ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {dados.formacoesInstrutor.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px' }}>{idx + 1}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '500', color: '#1e293b', margin: 0, fontSize: '13px' }}>{f.nome}</p>
                          {f.registro_tipo && f.registro_numero && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{f.registro_tipo} {f.registro_numero}{f.registro_estado ? `/${f.registro_estado}` : ''}</p>}
                        </div>
                        <div style={{ color: '#16a34a', fontWeight: '500', fontSize: '12px' }}>✓ Certificado</div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>Nenhuma formação vinculada</p>}
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // TREINAMENTO (mantido para compatibilidade)
    if (paginaId === 'treinamento') {
      // Formatar conteúdo programático
      const formatarConteudo = (json: string): string[] => {
        if (!json) return [];
        try {
          const blocos = JSON.parse(json) as Array<{ titulo: string; itens: string }>;
          return blocos.flatMap(bloco => {
            const itens = bloco.itens.split('\n').filter((i: string) => i.trim());
            return bloco.titulo ? [`**${bloco.titulo}**`, ...itens] : itens;
          });
        } catch {
          return json.split(';').filter((i: string) => i.trim());
        }
      };

      const conteudoItems = formatarConteudo(dados.treinamento.conteudo_programatico || '');

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Informações do Treinamento</h2>
            <p style={estilos.subtitulo}>Detalhes técnicos e conteúdo programático</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Dados do treinamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                <div style={estilos.card}>
                  <p style={estilos.label}>Nome do Treinamento</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.nome}</p>
                </div>
                <div style={estilos.card}>
                  <p style={estilos.label}>Norma Regulamentadora</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.norma}</p>
                </div>
                <div style={estilos.card}>
                  <p style={estilos.label}>Carga Horária</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{dados.treinamento.carga_horaria} horas</p>
                </div>
              </div>

              {/* Conteúdo Programático */}
              <div style={estilos.card}>
                <p style={{ ...estilos.label, marginBottom: '12px' }}>Conteúdo Programático</p>
                {conteudoItems.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '12px', color: '#374151' }}>
                    {conteudoItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        {item.startsWith('**') ? (
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.replace(/\*\*/g, '')}</span>
                        ) : (
                          <>
                            <span style={{ color: '#3b82f6', flexShrink: 0 }}>•</span>
                            <span>{item}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Conteúdo programático não disponível</p>
                )}
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // TURMA E INSTRUTOR
    if (paginaId === 'turma-instrutor') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Turma e Instrutor</h2>
            <p style={estilos.subtitulo}>Informações da turma e do instrutor responsável</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Dados da Turma */}
              <div style={estilos.card}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Dados da Turma</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <p style={estilos.label}>Código da Turma</p>
                    <p style={estilos.valor}>{dados.turma.codigo_turma}</p>
                  </div>
                  <div>
                    <p style={estilos.label}>Tipo de Treinamento</p>
                    <p style={estilos.valor}>{formatarTipoTreinamento(dados.turma.tipo_treinamento)}</p>
                  </div>
                  <div>
                    <p style={estilos.label}>Período</p>
                    <p style={estilos.valor}>
                      {formatarData(dados.turma.data_inicio)}
                      {dados.turma.data_fim && dados.turma.data_fim !== dados.turma.data_inicio && ` a ${formatarData(dados.turma.data_fim)}`}
                    </p>
                  </div>
                  <div>
                    <p style={estilos.label}>Local</p>
                    <p style={estilos.valor}>{dados.turma.local_treinamento || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={estilos.label}>Total de Participantes</p>
                    <p style={estilos.valor}>{dados.estatisticas.totalParticipantes}</p>
                  </div>
                </div>
              </div>

              {/* Dados do Instrutor */}
              <div style={estilos.card}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Instrutor</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <p style={estilos.label}>Nome</p>
                    <p style={{ ...estilos.valor, fontSize: '16px', fontWeight: '600' }}>{dados.instrutor.nome}</p>
                  </div>
                  {dados.instrutor.formacao_academica && (
                    <div>
                      <p style={estilos.label}>Formação Acadêmica</p>
                      <p style={estilos.valor}>{dados.instrutor.formacao_academica}</p>
                    </div>
                  )}
                  {dados.formacoesInstrutor.length > 0 && (
                    <div>
                      <p style={estilos.label}>Formações para este Treinamento</p>
                      {dados.formacoesInstrutor.map((f, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
                          <span style={{ fontWeight: '500' }}>{f.nome}</span>
                          {f.registro_numero && (
                            <span style={{ color: '#64748b', marginLeft: '8px' }}>
                              ({f.registro_tipo} {f.registro_numero}{f.registro_estado && `/${f.registro_estado}`})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Colaboradores */}
            <div style={{ ...estilos.card, marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Colaboradores Participantes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                {dados.colaboradores.map((c, idx) => (
                  <div key={idx} style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>{idx + 1}. {c.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // LISTA DE PRESENÇA PAGINADA
    if (paginaId.startsWith('presenca-')) {
      const pagIdx = parseInt(paginaId.replace('presenca-', ''));
      const inicio = pagIdx * COLAB_POR_PAG_PRESENCA;
      const colabsPag = dados.colaboradores.slice(inicio, inicio + COLAB_POR_PAG_PRESENCA);
      const totalPags = Math.ceil(dados.colaboradores.length / COLAB_POR_PAG_PRESENCA);

      const formatarCPFPresenca = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
        }
        return cpf;
      };

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Lista de Presença</h2>
            <p style={estilos.subtitulo}>{dados.treinamento.nome} - {dados.turma.codigo_turma} | Página {pagIdx + 1} de {totalPags}</p>
          </div>

          <div style={estilos.conteudo}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={{ ...estilos.thTabela, width: '30px', textAlign: 'center' }}>#</th>
                  <th style={estilos.thTabela}>Nome do Colaborador</th>
                  <th style={{ ...estilos.thTabela, width: '100px' }}>CPF</th>
                  {dados.datasAulas.map((data, idx) => (
                    <th key={idx} style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>
                      {format(parseISO(data), 'dd/MM', { locale: ptBR })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colabsPag.map((colab, idx) => (
                  <tr key={idx}>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#64748b' }}>{inicio + idx + 1}</td>
                    <td style={{ ...estilos.tdTabela, fontWeight: '500', fontSize: '11px' }}>{colab.nome}</td>
                    <td style={{ ...estilos.tdTabela, fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{formatarCPFPresenca(colab.cpf)}</td>
                    {dados.datasAulas.map((dataAula, dataIdx) => {
                      const assinatura = colab.assinaturas?.[dataAula];
                      return (
                        <td key={dataIdx} style={estilos.tdTabela}>
                          <div style={{ 
                            height: '32px', 
                            border: `1px solid ${assinatura ? '#86efac' : '#e2e8f0'}`, 
                            borderRadius: '4px', 
                            background: assinatura ? '#f0fdf4' : '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {assinatura && (
                              <img 
                                src={assinatura} 
                                alt="Assinatura" 
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                crossOrigin="anonymous"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total de Participantes: <strong style={{ color: '#1e293b' }}>{dados.estatisticas.totalParticipantes}</strong></span>
              <span>Exibindo {inicio + 1} a {Math.min(inicio + COLAB_POR_PAG_PRESENCA, dados.colaboradores.length)}</span>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // LISTA DE PRESENÇA ANTIGA (mantida para compatibilidade)
    if (paginaId === 'presenca') {
      const formatarCPFPresenca = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
        }
        return cpf;
      };

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Lista de Presença</h2>
            <p style={estilos.subtitulo}>{dados.treinamento.nome} - {dados.turma.codigo_turma}</p>
          </div>

          <div style={estilos.conteudo}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={{ ...estilos.thTabela, width: '30px', textAlign: 'center' }}>#</th>
                  <th style={estilos.thTabela}>Nome do Colaborador</th>
                  <th style={{ ...estilos.thTabela, width: '110px' }}>CPF</th>
                  {dados.datasAulas.map((data, idx) => (
                    <th key={idx} style={{ ...estilos.thTabela, width: '90px', textAlign: 'center' }}>
                      {format(parseISO(data), 'dd/MM', { locale: ptBR })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.colaboradores.map((colab, idx) => (
                  <tr key={idx}>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ ...estilos.tdTabela, fontWeight: '500' }}>{colab.nome}</td>
                    <td style={{ ...estilos.tdTabela, fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{formatarCPFPresenca(colab.cpf)}</td>
                    {dados.datasAulas.map((dataAula, dataIdx) => {
                      const assinatura = colab.assinaturas?.[dataAula];
                      return (
                        <td key={dataIdx} style={estilos.tdTabela}>
                          <div style={{ 
                            height: '36px', 
                            border: `1px solid ${assinatura ? '#86efac' : '#e2e8f0'}`, 
                            borderRadius: '4px', 
                            background: assinatura ? '#f0fdf4' : '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {assinatura && (
                              <img 
                                src={assinatura} 
                                alt="Assinatura" 
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                crossOrigin="anonymous"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              Total de Participantes: <strong style={{ color: '#1e293b' }}>{dados.estatisticas.totalParticipantes}</strong>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // GRÁFICOS DE PROVAS
    if (paginaId === 'provas-graficos') {
      const maxNota = 10;
      const barHeight = 120;
      const evolucao = dados.estatisticas.mediaPreTeste > 0 
        ? ((dados.estatisticas.mediaPosTeste - dados.estatisticas.mediaPreTeste) / dados.estatisticas.mediaPreTeste * 100) 
        : 0;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Resultados das Avaliações</h2>
            <p style={estilos.subtitulo}>Comparativo de desempenho pré-teste e pós-teste</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Gráfico de barras */}
              <div style={estilos.card}>
                <p style={{ ...estilos.label, marginBottom: '20px', textAlign: 'center' }}>Comparativo de Médias</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '60px', height: `${barHeight + 50}px` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>{dados.estatisticas.mediaPreTeste.toFixed(1)}</span>
                    <div style={{ width: '60px', height: `${(dados.estatisticas.mediaPreTeste / maxNota) * barHeight}px`, background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '6px 6px 0 0', minHeight: '20px' }} />
                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', fontWeight: '500' }}>Pré-Teste</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>{dados.estatisticas.mediaPosTeste.toFixed(1)}</span>
                    <div style={{ width: '60px', height: `${(dados.estatisticas.mediaPosTeste / maxNota) * barHeight}px`, background: 'linear-gradient(180deg, #22c55e, #16a34a)', borderRadius: '6px 6px 0 0', minHeight: '20px' }} />
                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', fontWeight: '500' }}>Pós-Teste</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px', padding: '12px', background: evolucao >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px' }}>
                  <span style={{ fontSize: '14px', color: evolucao >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                    Evolução: {evolucao >= 0 ? '+' : ''}{evolucao.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Estatísticas detalhadas */}
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ ...estilos.card, borderLeft: '4px solid #3b82f6' }}>
                  <p style={estilos.label}>Média Pré-Teste</p>
                  <p style={{ fontSize: '28px', fontWeight: '600', color: '#3b82f6', margin: 0 }}>{dados.estatisticas.mediaPreTeste.toFixed(1)}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Min: {dados.estatisticas.menorNotaPre.toFixed(1)} | Max: {dados.estatisticas.maiorNotaPre.toFixed(1)}</p>
                </div>
                <div style={{ ...estilos.card, borderLeft: '4px solid #22c55e' }}>
                  <p style={estilos.label}>Média Pós-Teste</p>
                  <p style={{ fontSize: '28px', fontWeight: '600', color: '#22c55e', margin: 0 }}>{dados.estatisticas.mediaPosTeste.toFixed(1)}</p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Min: {dados.estatisticas.menorNotaPos.toFixed(1)} | Max: {dados.estatisticas.maiorNotaPos.toFixed(1)}</p>
                </div>
                <div style={{ ...estilos.card, borderLeft: '4px solid #f59e0b' }}>
                  <p style={estilos.label}>Taxa de Aprovação</p>
                  <p style={{ fontSize: '28px', fontWeight: '600', color: '#f59e0b', margin: 0 }}>{dados.estatisticas.taxaAprovacao.toFixed(0)}%</p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{Math.round(dados.estatisticas.totalParticipantes * dados.estatisticas.taxaAprovacao / 100)} de {dados.estatisticas.totalParticipantes} aprovados</p>
                </div>
                <div style={{ ...estilos.card, borderLeft: '4px solid #8b5cf6' }}>
                  <p style={estilos.label}>Total de Participantes</p>
                  <p style={{ fontSize: '28px', fontWeight: '600', color: '#8b5cf6', margin: 0 }}>{dados.estatisticas.totalParticipantes}</p>
                </div>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // LISTA DE NOTAS PAGINADA
    if (paginaId.startsWith('provas-lista-')) {
      const pagIdx = parseInt(paginaId.replace('provas-lista-', ''));
      const inicio = pagIdx * COLAB_POR_PAG_PROVAS;
      const avaliacoesPag = dados.avaliacoes.slice(inicio, inicio + COLAB_POR_PAG_PROVAS);
      const totalPags = Math.ceil(dados.avaliacoes.length / COLAB_POR_PAG_PROVAS);

      const formatarCPF = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
        }
        return cpf;
      };

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Notas dos Colaboradores</h2>
            <p style={estilos.subtitulo}>Página {pagIdx + 1} de {totalPags}</p>
          </div>

          <div style={estilos.conteudo}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={{ ...estilos.thTabela, width: '30px', textAlign: 'center' }}>#</th>
                  <th style={estilos.thTabela}>Colaborador</th>
                  <th style={{ ...estilos.thTabela, width: '110px', textAlign: 'center' }}>CPF</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Pré-Teste</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Pós-Teste</th>
                  <th style={{ ...estilos.thTabela, width: '90px', textAlign: 'center' }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoesPag.map((av, idx) => (
                  <tr key={idx}>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#64748b' }}>{inicio + idx + 1}</td>
                    <td style={{ ...estilos.tdTabela, fontWeight: '500', fontSize: '12px' }}>{av.nome}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{formatarCPF(av.cpf)}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '600', color: '#3b82f6' }}>{av.notaPre?.toFixed(1) || '-'}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '600', color: '#22c55e' }}>{av.notaPos?.toFixed(1) || '-'}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        fontWeight: '600',
                        background: av.resultado === 'aprovado' ? '#dcfce7' 
                          : (av.resultado === 'reprovado' || av.resultado === 'reprovado_sinistro' || av.temSinistro) ? '#fee2e2' 
                          : '#f1f5f9',
                        color: av.resultado === 'aprovado' ? '#16a34a' 
                          : (av.resultado === 'reprovado' || av.resultado === 'reprovado_sinistro' || av.temSinistro) ? '#dc2626' 
                          : '#64748b'
                      }}>
                        {av.resultado === 'aprovado' ? 'Aprovado' 
                          : (av.resultado === 'reprovado_sinistro' || av.temSinistro) ? 'Reprovado (Sinistro)' 
                          : av.resultado === 'reprovado' ? 'Reprovado' 
                          : 'Aguardando'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total: <strong style={{ color: '#1e293b' }}>{dados.avaliacoes.length}</strong> colaboradores</span>
              <span>Exibindo {inicio + 1} a {Math.min(inicio + COLAB_POR_PAG_PROVAS, dados.avaliacoes.length)}</span>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // PÁGINA EXPLICATIVA DE REORIENTAÇÃO
    if (paginaId === 'reorientacao-explicacao') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>O que é Reorientação?</h2>
            <p style={estilos.subtitulo}>Entenda quando e por que a reorientação é aplicada</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ ...estilos.card, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '32px', height: '32px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</span>
                Definição
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                A <strong>Reorientação</strong> é um processo educacional aplicado aos colaboradores que obtiveram nota entre 7 e 9 no pós-teste. 
                Este processo visa reforçar os conhecimentos nas questões em que o colaborador apresentou dificuldade, garantindo a 
                compreensão completa do conteúdo do treinamento.
              </p>
            </div>

            <div style={{ ...estilos.card, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🎯</span>
                Quando se Aplica
              </h3>
              <ul style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
                <li><strong>Nota 10:</strong> Aprovado diretamente, sem necessidade de reorientação</li>
                <li><strong>Nota entre 7 e 9:</strong> Aprovado após reorientação obrigatória</li>
                <li><strong>Nota abaixo de 7:</strong> Reprovado, deve refazer o pós-teste</li>
              </ul>
            </div>

            <div style={{ ...estilos.card, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '32px', height: '32px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✅</span>
                Processo
              </h3>
              <ol style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
                <li>O instrutor identifica as questões que o colaborador errou</li>
                <li>O colaborador é orientado sobre as respostas corretas</li>
                <li>O colaborador assina o termo de reorientação, confirmando que foi orientado</li>
                <li>Após a assinatura, o colaborador é considerado <strong>Aprovado</strong></li>
              </ol>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <span>A reorientação garante que todos os colaboradores tenham pleno entendimento do conteúdo, mesmo que tenham cometido alguns erros no pós-teste.</span>
              </p>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // LISTA DE COLABORADORES REORIENTADOS
    if (paginaId === 'reorientacao-lista') {
      const reorientacoes = dados.reorientacoes || [];
      const formatarCPF = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cpf;
      };
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Colaboradores Reorientados</h2>
            <p style={estilos.subtitulo}>{reorientacoes.length} colaborador(es) passaram pelo processo de reorientação</p>
          </div>

          <div style={estilos.conteudo}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={{ ...estilos.thTabela, width: '30px', textAlign: 'center' }}>#</th>
                  <th style={estilos.thTabela}>Colaborador</th>
                  <th style={{ ...estilos.thTabela, width: '110px', textAlign: 'center' }}>CPF</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Nota</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Questões Erradas</th>
                  <th style={{ ...estilos.thTabela, width: '100px', textAlign: 'center' }}>Data</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Assinado</th>
                </tr>
              </thead>
              <tbody>
                {reorientacoes.map((reor, idx) => (
                  <tr key={idx}>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ ...estilos.tdTabela, fontWeight: '500', fontSize: '12px' }}>{reor.colaborador_nome}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{formatarCPF(reor.colaborador_cpf)}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '600', color: '#f59e0b' }}>{reor.nota?.toFixed(1) || '-'}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#ef4444' }}>{reor.questoes_incorretas?.length || 0}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontSize: '11px', color: '#64748b' }}>{reor.assinado_em ? formatarData(reor.assinado_em) : '-'}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        fontWeight: '600',
                        background: reor.assinatura_digital ? '#dcfce7' : '#fee2e2',
                        color: reor.assinatura_digital ? '#16a34a' : '#dc2626'
                      }}>
                        {reor.assinatura_digital ? 'Sim' : 'Não'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Rodape />
        </div>
      );
    }

    // PÁGINA INDIVIDUAL DE REORIENTAÇÃO
    if (paginaId.startsWith('reorientacao-')) {
      const reorIdx = parseInt(paginaId.replace('reorientacao-', ''));
      const reorientacao = (dados.reorientacoes || [])[reorIdx];
      
      if (!reorientacao) return null;

      const formatarCPF = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cpf;
      };

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Termo de Reorientação</h2>
            <p style={estilos.subtitulo}>{reorientacao.colaborador_nome}</p>
          </div>

          <div style={estilos.conteudo}>
            {/* Informações do colaborador */}
            <div style={{ ...estilos.card, marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>COLABORADOR</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{reorientacao.colaborador_nome}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>CPF</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', margin: 0, fontFamily: 'monospace' }}>{formatarCPF(reorientacao.colaborador_cpf)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>EMPRESA</p>
                  <p style={{ fontSize: '13px', color: '#1e293b', margin: 0 }}>{reorientacao.empresa_nome}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>TREINAMENTO</p>
                  <p style={{ fontSize: '13px', color: '#1e293b', margin: 0 }}>{reorientacao.treinamento_nome}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>NOTA NO PÓS-TESTE</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>{reorientacao.nota?.toFixed(1) || '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>DATA DA REORIENTAÇÃO</p>
                  <p style={{ fontSize: '13px', color: '#1e293b', margin: 0 }}>{reorientacao.assinado_em ? formatarData(reorientacao.assinado_em) : '-'}</p>
                </div>
              </div>
            </div>

            {/* Questões incorretas */}
            {reorientacao.questoes_incorretas && reorientacao.questoes_incorretas.length > 0 && (
              <div style={{ ...estilos.card, marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                  Questões que necessitaram reorientação ({reorientacao.questoes_incorretas.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reorientacao.questoes_incorretas.map((q: any, qIdx: number) => (
                    <div key={qIdx} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                        Questão {q.numero}: {q.pergunta}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '4px' }}>
                          <p style={{ fontSize: '9px', color: '#991b1b', marginBottom: '2px', fontWeight: '600' }}>RESPOSTA ENVIADA</p>
                          <p style={{ fontSize: '11px', color: '#dc2626', margin: 0 }}>
                            {q.alternativa_selecionada}) {q.alternativa_selecionada_texto}
                          </p>
                        </div>
                        <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '4px' }}>
                          <p style={{ fontSize: '9px', color: '#166534', marginBottom: '2px', fontWeight: '600' }}>RESPOSTA CORRETA</p>
                          <p style={{ fontSize: '11px', color: '#16a34a', margin: 0 }}>
                            {q.alternativa_correta}) {q.alternativa_correta_texto}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco de assinatura */}
            <div style={{ ...estilos.card, background: '#f8fafc', border: '2px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
                Declaro que fui devidamente orientado(a) sobre as questões acima mencionadas, compreendendo as respostas corretas 
                e os conceitos relacionados ao treinamento <strong>{reorientacao.treinamento_nome}</strong>.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', minWidth: '250px' }}>
                  {reorientacao.assinatura_digital ? (
                    <div style={{ marginBottom: '8px' }}>
                      <img 
                        src={reorientacao.assinatura_digital} 
                        alt="Assinatura" 
                        style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }}
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div style={{ height: '60px', marginBottom: '8px' }} />
                  )}
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{reorientacao.colaborador_nome}</p>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>Colaborador</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // GRÁFICOS DE AVALIAÇÃO DE REAÇÃO (1 categoria completa por página - estilo barras empilhadas)
    if (paginaId.startsWith('reacao-grafico-')) {
      const graficoIdx = parseInt(paginaId.replace('reacao-grafico-', ''));
      const categoria = dados.estatisticasReacao?.categorias[graficoIdx];
      
      if (!categoria) return null;

      // Função para determinar cor semântica baseada no texto da opção (igual ao AvaliacaoReacaoResultados)
      const getSemanticColor = (texto: string, valor: number, totalOpcoes: number): string => {
        const textoLower = texto.toLowerCase().trim();
        
        // Cores para Sim/Não
        if (textoLower === 'sim') return '#22c55e'; // Verde
        if (textoLower === 'não' || textoLower === 'nao') return '#ef4444'; // Vermelho
        
        // Cores para Ótimo/Bom/Ruim (escala de 3)
        if (textoLower === 'ótimo' || textoLower === 'otimo' || textoLower === 'excelente') return '#22c55e'; // Verde
        if (textoLower === 'bom' || textoLower === 'regular') return '#eab308'; // Amarelo
        if (textoLower === 'ruim' || textoLower === 'péssimo' || textoLower === 'pessimo') return '#ef4444'; // Vermelho
        
        // Fallback baseado no valor (quanto maior, mais verde)
        if (totalOpcoes <= 2) {
          return valor === 1 ? '#22c55e' : '#ef4444';
        }
        if (valor === totalOpcoes) return '#22c55e';
        if (valor === 1) return '#ef4444';
        return '#eab308';
      };

      // Criar mapa de opções: valor -> {texto, cor}
      const opcoesMap: Record<string, { texto: string; cor: string }> = {};
      const categoriaOpcoes = (categoria as any).opcoes || [];
      categoriaOpcoes.forEach((opcao: any) => {
        opcoesMap[String(opcao.valor)] = {
          texto: opcao.texto,
          cor: getSemanticColor(opcao.texto, opcao.valor, categoriaOpcoes.length || 3)
        };
      });

      // Fallback se não tiver opções
      if (Object.keys(opcoesMap).length === 0) {
        if (categoria.tipo === 'sim_nao') {
          opcoesMap['1'] = { texto: 'Sim', cor: '#22c55e' };
          opcoesMap['2'] = { texto: 'Não', cor: '#ef4444' };
        } else {
          opcoesMap['1'] = { texto: 'Ruim', cor: '#ef4444' };
          opcoesMap['2'] = { texto: 'Bom', cor: '#eab308' };
          opcoesMap['3'] = { texto: 'Ótimo', cor: '#22c55e' };
        }
      }

      // Calcular total de respostas e totais por opção para a categoria
      const totalRespostas = dados.estatisticasReacao?.totalRespostas || 0;
      
      // Calcular totais gerais por opção de resposta
      const totaisPorOpcao: Record<string, number> = {};
      categoria.itens.forEach(item => {
        Object.entries(item.respostas).forEach(([opcao, count]) => {
          totaisPorOpcao[opcao] = (totaisPorOpcao[opcao] || 0) + count;
        });
      });
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Avaliação de Reação</h2>
            <p style={estilos.subtitulo}>{categoria.categoria}</p>
          </div>

          <div style={estilos.conteudo}>
            {/* Cards de estatísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#166534', marginBottom: '4px', fontWeight: '500' }}>RESPOSTAS</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#15803d', margin: 0 }}>{totalRespostas}</p>
                <p style={{ fontSize: '10px', color: '#166534', marginTop: '2px' }}>colaboradores</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', border: '1px solid #fde047', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#854d0e', marginBottom: '4px', fontWeight: '500' }}>ITENS AVALIADOS</p>
                <p style={{ fontSize: '28px', fontWeight: '700', color: '#a16207', margin: 0 }}>{categoria.itens.length}</p>
                <p style={{ fontSize: '10px', color: '#854d0e', marginTop: '2px' }}>perguntas</p>
              </div>
            </div>

            {/* Gráfico com barras horizontais empilhadas */}
            <div style={estilos.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{categoria.categoria}</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{categoria.itens.length} itens avaliados</span>
              </div>

              {/* Barras empilhadas para cada item */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoria.itens.map((item, itemIdx) => {
                  const totalItem = Object.values(item.respostas).reduce((a, b) => a + b, 0);
                  // Ordenar respostas por valor crescente (1=Ruim primeiro, depois 2=Bom, depois 3=Ótimo)
                  const respostasOrdenadas = Object.entries(item.respostas).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
                  
                  return (
                    <div key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Label da pergunta */}
                      <div style={{ width: '180px', flexShrink: 0 }}>
                        <p style={{ fontSize: '11px', color: '#374151', margin: 0, lineHeight: 1.3 }}>{item.pergunta}</p>
                      </div>
                      
                      {/* Barra empilhada horizontal */}
                      <div style={{ flex: 1, height: '32px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                        {respostasOrdenadas.map(([opcao, count]) => {
                          const porcentagem = totalItem > 0 ? (count / totalItem) * 100 : 0;
                          if (porcentagem === 0) return null;
                          const opcaoInfo = opcoesMap[opcao];
                          return (
                            <div 
                              key={opcao}
                              style={{ 
                                width: `${porcentagem}%`, 
                                height: '100%', 
                                background: opcaoInfo?.cor || '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: porcentagem > 8 ? '30px' : '0'
                              }}
                            >
                              {porcentagem > 8 && (
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{count}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda dinâmica baseada nas opções */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                {Object.entries(opcoesMap)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([valor, info]) => (
                    <div key={valor} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: info.cor }} />
                      <span style={{ fontSize: '11px', color: '#374151' }}>{info.texto}: {totaisPorOpcao[valor] || 0}</span>
                    </div>
                  ))
                }
              </div>

            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // CASES DE SUCESSO
    if (paginaId === 'cases-sucesso') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Cases de Sucesso</h2>
            <p style={estilos.subtitulo}>Feedback e sugestões dos colaboradores</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {dados.casesSucesso.map((cs, idx) => (
                <div key={idx} style={{ 
                  ...estilos.card, 
                  borderLeft: '4px solid #22c55e',
                  background: 'linear-gradient(to right, #f0fdf4, #fff)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', height: '40px', 
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
                        borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: '600', fontSize: '16px'
                      }}>
                        {cs.colaborador_nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{cs.colaborador_nome}</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>CPF: {cs.colaborador_cpf}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontWeight: '500' }}>
                        Case de Sucesso
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatarData(cs.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ 
                    padding: '16px', 
                    background: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0'
                  }}>
                    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                      "{cs.sugestoes_comentarios}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {dados.casesSucesso.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                <p>Nenhum case de sucesso selecionado</p>
              </div>
            )}
          </div>

          <Rodape />
        </div>
      );
    }

    // AVALIAÇÕES ANTIGAS (mantida para compatibilidade)
    if (paginaId === 'avaliacoes') {
      const formatarCPF = (cpf: string) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
        }
        return cpf;
      };

      const maxNota = 10;
      const barHeight = 100;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Avaliações do Treinamento</h2>
            <p style={estilos.subtitulo}>Resultados das avaliações pré e pós-teste</p>
          </div>

          <div style={estilos.conteudo}>
            {/* Gráfico e Estatísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Gráfico de barras */}
              <div style={estilos.card}>
                <p style={{ ...estilos.label, marginBottom: '16px' }}>Comparativo de Médias</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '48px', height: `${barHeight + 40}px` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>{dados.estatisticas.mediaPreTeste.toFixed(1)}</span>
                    <div style={{ 
                      width: '48px', 
                      height: `${(dados.estatisticas.mediaPreTeste / maxNota) * barHeight}px`, 
                      background: '#3b82f6', 
                      borderRadius: '4px 4px 0 0',
                      minHeight: '16px'
                    }} />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Pré-Teste</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>{dados.estatisticas.mediaPosTeste.toFixed(1)}</span>
                    <div style={{ 
                      width: '48px', 
                      height: `${(dados.estatisticas.mediaPosTeste / maxNota) * barHeight}px`, 
                      background: '#22c55e', 
                      borderRadius: '4px 4px 0 0',
                      minHeight: '16px'
                    }} />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Pós-Teste</span>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
                  Evolução: +{((dados.estatisticas.mediaPosTeste - dados.estatisticas.mediaPreTeste) / (dados.estatisticas.mediaPreTeste || 1) * 100).toFixed(0)}%
                </p>
              </div>

              {/* Estatísticas */}
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ ...estilos.card, borderLeft: '3px solid #3b82f6' }}>
                  <p style={estilos.label}>Média Pré-Teste</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6', margin: 0 }}>{dados.estatisticas.mediaPreTeste.toFixed(1)}</p>
                </div>
                <div style={{ ...estilos.card, borderLeft: '3px solid #22c55e' }}>
                  <p style={estilos.label}>Média Pós-Teste</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#22c55e', margin: 0 }}>{dados.estatisticas.mediaPosTeste.toFixed(1)}</p>
                </div>
                <div style={{ ...estilos.card, borderLeft: '3px solid #f59e0b' }}>
                  <p style={estilos.label}>Taxa de Aprovação</p>
                  <p style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b', margin: 0 }}>{dados.estatisticas.taxaAprovacao.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Tabela de Notas */}
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={{ ...estilos.thTabela, width: '30px', textAlign: 'center' }}>#</th>
                  <th style={estilos.thTabela}>Colaborador</th>
                  <th style={{ ...estilos.thTabela, width: '120px', textAlign: 'center' }}>CPF</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Pré-Teste</th>
                  <th style={{ ...estilos.thTabela, width: '80px', textAlign: 'center' }}>Pós-Teste</th>
                </tr>
              </thead>
              <tbody>
                {dados.avaliacoes.map((av, idx) => (
                  <tr key={idx}>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '500', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ ...estilos.tdTabela, fontWeight: '500' }}>{av.nome}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{formatarCPF(av.cpf)}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '600', color: '#3b82f6' }}>{av.notaPre?.toFixed(1) || '-'}</td>
                    <td style={{ ...estilos.tdTabela, textAlign: 'center', fontWeight: '600', color: '#22c55e' }}>{av.notaPos?.toFixed(1) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Rodape />
        </div>
      );
    }

    // FOTOS
    if (paginaId.startsWith('foto-')) {
      const fotoIdx = parseInt(paginaId.replace('foto-', ''));
      const foto = dados.fotos[fotoIdx];
      
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Registro Fotográfico</h2>
            <p style={estilos.subtitulo}>Imagem {fotoIdx + 1} de {dados.fotos.length}</p>
          </div>

          <div style={{ ...estilos.conteudo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '550px', width: '100%' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={foto?.url} 
                  alt={foto?.nome}
                  style={{ width: '100%', height: 'auto', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22%3E%3Crect fill=%22%23f8fafc%22 width=%22800%22 height=%22600%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2220%22%3EImagem não disponível%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              
              {/* Informações da foto */}
              <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {foto?.descricao && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Descrição</p>
                    <p style={{ fontSize: '13px', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{foto.descricao}</p>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                  {foto?.data_foto && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Data do Registro</p>
                      <p style={{ fontSize: '12px', color: '#1e293b', fontWeight: '500', margin: 0 }}>
                        {formatarData(foto.data_foto)}
                      </p>
                    </div>
                  )}
                  {foto?.created_at && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Data de Envio</p>
                      <p style={{ fontSize: '12px', color: '#1e293b', fontWeight: '500', margin: 0 }}>
                        {formatarData(foto.created_at)}
                      </p>
                    </div>
                  )}
                </div>
                
                {!foto?.descricao && !foto?.data_foto && !foto?.created_at && foto?.nome && (
                  <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: 0 }}>{foto.nome}</p>
                )}
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // Função para substituir variáveis do modelo de certificado
    const substituirVariaveisCertificado = (conteudo: string, colaborador: any): string => {
      const todasDatasFormatadas = dados.datasAulas.length > 0 
        ? dados.datasAulas.map(d => format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR })).join(', ')
        : dados.turma.data_inicio ? format(parseISO(dados.turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '';
      
      const formatCPFVar = (cpf: string) => {
        const cleaned = cpf?.replace(/\D/g, '') || '';
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      };

      // Calcular validade baseado na validade do treinamento cadastrado
      const dataBase = dados.turma.data_fim || dados.turma.data_inicio;
      const validadeTreinamento = dados.treinamento.validade || 'Anual';
      const validadeParaMeses = (val: string): number => {
        switch (val?.toLowerCase()) {
          case 'anual': return 12;
          case 'bienal': return 24;
          case 'trienal': return 36;
          case 'quadrienal': return 48;
          case 'quinquenal': return 60;
          default: return 12;
        }
      };
      const dataValidade = dataBase ? format(addMonths(parseISO(dataBase), validadeParaMeses(validadeTreinamento)), 'dd/MM/yyyy', { locale: ptBR }) : '';

      // Formatar conteúdo programático - cada bloco vira uma coluna
      const formatarCP = (json: string): string => {
        if (!json) return '';
        try {
          const blocos = JSON.parse(json) as Array<{ titulo: string; itens: string }>;
          
          // Se só tem um bloco, renderiza normalmente
          if (blocos.length === 1) {
            const bloco = blocos[0];
            const itensArray = bloco.itens.split('\n').filter((i: string) => i.trim());
            const itensHtml = itensArray.map((item: string) => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('');
            return `<div style="margin-bottom: 8px;">${bloco.titulo ? `<p style="font-weight: bold; margin-bottom: 4px;">${bloco.titulo}:</p>` : ''}<ul style="list-style: none; padding-left: 8px; margin: 0;">${itensHtml}</ul></div>`;
          }
          
          // Múltiplos blocos: renderiza em colunas lado a lado
          const colunasHtml = blocos.map(bloco => {
            const itensArray = bloco.itens.split('\n').filter((i: string) => i.trim());
            const itensHtml = itensArray.map((item: string) => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('');
            return `<div style="flex: 1; min-width: 0; padding: 0 8px;">${bloco.titulo ? `<p style="font-weight: bold; margin-bottom: 6px; text-decoration: underline; text-align: center;">${bloco.titulo}</p>` : ''}<ul style="list-style: none; padding-left: 0; margin: 0;">${itensHtml}</ul></div>`;
          }).join('');
          
          return `<div style="display: flex; gap: 16px; width: 100%;">${colunasHtml}</div>`;
        } catch {
          const itens = json.split(';').filter((i: string) => i.trim());
          return `<ul style="list-style: none; padding-left: 8px; margin: 0;">${itens.map((item: string) => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('')}</ul>`;
        }
      };

      // Gerar bloco de categorização técnica
      const gerarCategorizacaoTecnica = (): string => {
        const cat = dados.turma.categorizacao_tecnica;
        if (!cat) return '';

        const tiposEspaco = cat.tipos_espaco_confinado || [];
        const tiposAtividade = cat.tipos_atividade || [];
        const responsaveis = cat.responsaveis_tecnicos || [];

        if (tiposEspaco.length === 0 && tiposAtividade.length === 0 && responsaveis.length === 0) {
          return '';
        }

        const espacosTexto = tiposEspaco.map(e => e.nome).join(' e ');
        const atividadesTexto = tiposAtividade.map(a => a.nome).join(' e ');

        let responsaveisHtml = '';
        if (responsaveis.length > 0) {
          responsaveisHtml = responsaveis.map(resp => {
            const registro = resp.sigla_conselho && resp.numero_registro 
              ? `${resp.sigla_conselho} Nº ${resp.numero_registro}${resp.estado ? '/' + resp.estado : ''}`
              : '';
            return `<div style="font-weight: bold; font-size: 11px;">${resp.nome}</div>
              <div style="font-size: 11px;">${resp.cargo}</div>
              ${registro ? `<div style="font-size: 11px;">${registro}</div>` : ''}`;
          }).join('<div style="height: 6px;"></div>');
        }

        const empresaCliente = dados.cliente.nome || '';

        return `<div style="box-sizing: border-box; border: 1px solid #000; padding: 10px 14px; margin: 8px 0; font-family: 'Times New Roman', Times, serif; font-size: 11px; line-height: 1.5; max-width: 100%;">
          ${espacosTexto ? `<div style="margin-bottom: 10px;"><strong>Tipo de Espaço Confinado:</strong> ${espacosTexto}.</div>` : ''}
          ${atividadesTexto ? `<div style="margin-bottom: 10px;"><strong>Tipo de trabalho:</strong> ${atividadesTexto}.</div>` : ''}
          ${responsaveis.length > 0 ? `<div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; line-height: 1.4;">
            ${responsaveisHtml}
            <div style="margin-top: 4px; font-size: 11px;">Responsável pelos Espaços Confinados da<br/>${empresaCliente}.</div>
          </div>` : ''}
        </div>`;
      };

      // Gerar bloco de assinaturas
      const gerarAssinaturas = (): string => {
        return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px;">
          ${dados.assinaturas.slice(0, 2).map(ass => `
            <div style="text-align: center;">
              <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
                ${ass.assinatura_url ? `<img src="${ass.assinatura_url}" style="max-height: 100%; max-width: 100%; object-fit: contain;" crossorigin="anonymous" />` : ''}
              </div>
              <div style="border-top: 1px solid #333; margin-bottom: 4px;"></div>
              <div style="font-size: 11px; line-height: 1.3;">
                <div style="font-weight: 700;">${ass.nome}</div>
                <div>${ass.cargo}</div>
                <div>${ass.formacao}</div>
                <div>${ass.registro}</div>
              </div>
            </div>
          `).join('')}
        </div>`;
      };

      // Gerar assinatura do responsável técnico (separada)
      const gerarAssinaturaResponsavelTecnico = (): string => {
        const responsavel = dados.assinaturas.find(a => a.cargo === 'Diretor Técnico' || a.cargo === 'Responsável Técnico');
        if (!responsavel) return '';
        
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
          <div style="height:60px;display:flex;align-items:center;justify-content:center;">
            ${responsavel.assinatura_url ? `<img src="${responsavel.assinatura_url}" style="max-height:100%;max-width:180px;object-fit:contain;" crossorigin="anonymous" />` : ''}
          </div>
          <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
          <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">${responsavel.nome}</p>
          <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Responsável Técnico</p>
          ${responsavel.formacao ? `<p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">${responsavel.formacao}</p>` : ''}
          ${responsavel.registro ? `<p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">${responsavel.registro}</p>` : ''}
        </div>`;
      };

      // Gerar assinatura do instrutor (separada)
      const gerarAssinaturaInstrutor = (): string => {
        const instrutor = dados.assinaturas.find(a => a.cargo === 'Instrutor');
        if (!instrutor) return '';
        
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
          <div style="height:60px;display:flex;align-items:center;justify-content:center;">
            ${instrutor.assinatura_url ? `<img src="${instrutor.assinatura_url}" style="max-height:100%;max-width:180px;object-fit:contain;" crossorigin="anonymous" />` : ''}
          </div>
          <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
          <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">${instrutor.nome}</p>
          <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Instrutor</p>
          ${instrutor.formacao ? `<p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">${instrutor.formacao}</p>` : ''}
          ${instrutor.registro ? `<p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">${instrutor.registro}</p>` : ''}
        </div>`;
      };

      // Gerar HTML da assinatura do colaborador (se existir)
      const assinaturaColaboradorHtml = colaborador.assinatura_certificado 
        ? `<img src="${colaborador.assinatura_certificado}" alt="Assinatura" style="max-height:60px;max-width:200px;object-fit:contain;" />`
        : '';

      // Formatar tipo de treinamento da turma
      const formatarTipoTurma = (tipo: string): string => {
        const tipoLower = tipo?.toLowerCase() || '';
        if (tipoLower === 'periódico' || tipoLower === 'periodico' || tipoLower === 'reciclagem') {
          return 'Periódico (Reciclagem)';
        }
        if (tipoLower === 'inicial' || tipoLower === 'formação inicial' || tipoLower === 'formacao inicial') {
          return 'Inicial (Formação)';
        }
        if (tipoLower === 'eventual') {
          return 'Eventual';
        }
        return tipo || '';
      };

      // Substituir variáveis
      const resultado = conteudo
        .replace(/{LOGO_EMPRESA}/g, logoUrl ? `<img src="${logoUrl}" style="max-height: 80px; max-width: 200px; object-fit: contain;" crossorigin="anonymous" />` : `<div style="font-weight: 700; font-size: 18px;">${dados.empresaSst.nome}</div>`)
        .replace(/{COLABORADOR_NOME}/g, colaborador.nome || '')
        .replace(/{COLABORADOR_CPF}/g, formatCPFVar(colaborador.cpf))
        .replace(/{COLABORADOR_EMPRESA}/g, dados.cliente.nome || '')
        .replace(/{COLABORADOR_LOCAL}/g, dados.turma.local_treinamento || '')
        .replace(/{COLABORADOR_ASSINATURA}/g, assinaturaColaboradorHtml)
        .replace(/{TREINAMENTO_NOME}/g, dados.treinamento.nome || '')
        .replace(/{TREINAMENTO_NR}/g, `NR ${dados.treinamento.norma}` || '')
        .replace(/{TREINAMENTO_CH}/g, String(dados.treinamento.carga_horaria || 0))
        .replace(/{TREINAMENTO_DATA}/g, todasDatasFormatadas)
        .replace(/{TREINAMENTO_CP}/g, formatarCP(dados.treinamento.conteudo_programatico || ''))
        .replace(/{TREINAMENTO_VALIDADE}/g, dataValidade)
        .replace(/{TURMA_TIPO}/g, formatarTipoTurma(dados.turma.tipo_treinamento))
        .replace(/{TURMA_CODIGO}/g, dados.turma.codigo_turma || '')
        .replace(/{INSTRUTOR_NOME}/g, dados.instrutor.nome || '')
        .replace(/{DATA_ATUAL}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
        .replace(/{QRCODE_VALIDACAO}/g, '')
        .replace(/{ASSINATURAS}/g, gerarAssinaturas())
        .replace(/{ASSINATURA_RESPONSAVEL_TECNICO}/g, gerarAssinaturaResponsavelTecnico())
        .replace(/{ASSINATURA_INSTRUTOR}/g, gerarAssinaturaInstrutor())
        .replace(/{EMPRESA_SST_NOME}/g, dados.empresaSst.nome || '')
        .replace(/{EMPRESA_SST_CNPJ}/g, dados.empresaSst.cnpj || '')
        .replace(/{EMPRESA_SST_ENDERECO}/g, enderecoEmpresa)
        .replace(/{CATEGORIZACAO_TECNICA}/g, gerarCategorizacaoTecnica());

      return resultado;
    };

    // CERTIFICADO DO COLABORADOR - FRENTE (Horizontal A4)
    if (paginaId.startsWith('certificado-frente-')) {
      const certIdx = parseInt(paginaId.replace('certificado-frente-', ''));
      // Usar colaboradoresParaCertificado (sem sinistro) se disponível
      const colaboradoresCertificado = (dados as any).colaboradoresParaCertificado || dados.colaboradores.filter((c: any) => !c.temSinistro);
      const colaborador = colaboradoresCertificado[certIdx];
      
      if (!colaborador) return null;

      // Se tem modelo de certificado definido, usar ele
      if (dados.modeloCertificado && dados.modeloCertificado.paginas.length > 0) {
        const paginaModelo = dados.modeloCertificado.paginas[0]; // Primeira página = frente
        const blocos = paginaModelo.blocos || [];
        
        return (
          <div style={{ 
            width: `${dados.modeloCertificado.largura}px`, 
            height: `${dados.modeloCertificado.altura}px`, 
            position: 'relative',
            overflow: 'hidden',
            background: '#fff'
          }}>
            {/* Moldura do modelo */}
            {paginaModelo.moldura_url && (
              <img 
                src={paginaModelo.moldura_url} 
                alt="Moldura" 
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                crossOrigin="anonymous"
              />
            )}
            {/* Conteúdo do certificado com layout flexbox */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                fontFamily: 'Georgia, serif',
                flexDirection: (paginaModelo.flex_direction as any) || 'column',
                justifyContent: paginaModelo.justify_content || 'center',
                alignItems: paginaModelo.align_items || 'center',
                textAlign: (paginaModelo.text_align || 'center') as any,
                padding: `${paginaModelo.padding || 48}px`,
              }}
            >
              {/* Se tem blocos, renderiza os blocos, senão renderiza conteúdo direto */}
              {blocos.length > 0 ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {blocos
                    .sort((a: any, b: any) => a.ordem - b.ordem)
                    .map((bloco: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        width: bloco.largura || '100%',
                        height: bloco.altura === 'auto' ? 'auto' : bloco.altura,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: bloco.justify_content || 'center',
                        alignItems: bloco.align_items || 'center',
                        textAlign: (bloco.text_align || 'center') as any,
                        padding: `${bloco.padding || 16}px`,
                        marginTop: `${bloco.margin_top || 8}px`,
                        marginBottom: `${bloco.margin_bottom || 8}px`,
                        fontSize: `${bloco.font_size || 14}px`,
                        fontWeight: bloco.font_weight || 'normal',
                        border: bloco.border ? '1px solid #ccc' : 'none',
                        borderRadius: `${bloco.border_radius || 0}px`,
                        backgroundColor: bloco.background_color || 'transparent',
                      }}
                    >
                      <div 
                        style={{ 
                          textAlign: (bloco.text_align || 'center') as any,
                          whiteSpace: 'pre-wrap'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: substituirVariaveisCertificado(bloco.conteudo || '', colaborador)
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  style={{ width: '100%', height: '100%' }}
                  dangerouslySetInnerHTML={{
                    __html: substituirVariaveisCertificado(paginaModelo.conteudo || '', colaborador)
                  }}
                />
              )}
            </div>
          </div>
        );
      }

      // Certificado padrão (fallback)
      const tipoTreinamento = dados.turma.tipo_treinamento?.toLowerCase() === 'periódico' || dados.turma.tipo_treinamento?.toLowerCase() === 'periodico' || dados.turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação';
      const todasDatasFormatadas = dados.datasAulas.length > 0 
        ? dados.datasAulas.map(d => format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR })).join(', ')
        : dados.turma.data_inicio ? format(parseISO(dados.turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '';
      const cidadeEmissao = dados.empresaSst.cidade || 'São Paulo';
      const dataEmissao = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

      const formatCPF = (cpf: string) => {
        const cleaned = cpf?.replace(/\D/g, '') || '';
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      };
      
      return (
        <div style={{ 
          width: '1123px', 
          height: '794px', 
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Montserrat", system-ui, -apple-system, Segoe UI, Arial, sans-serif',
          background: '#fff'
        }}>
          {/* Moldura externa */}
          <div style={{
            position: 'absolute',
            inset: '14px',
            border: '10px solid #c26b2a',
            borderRadius: '8px',
            pointerEvents: 'none',
          }} />
          {/* Moldura interna */}
          <div style={{
            position: 'absolute',
            inset: '28px',
            border: '6px solid #6b6b6b',
            borderRadius: '6px',
            pointerEvents: 'none',
          }} />

          {/* FRENTE */}
          <div style={{ position: 'absolute', inset: '70px' }}>
            {/* Topo - Logo + CERTIFICADO */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              {/* Logo no canto superior direito */}
              <div style={{ 
                position: 'absolute',
                top: 0,
                right: 0,
                height: '70px', 
                maxWidth: '280px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end' 
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{ textAlign: 'right', lineHeight: 1.1, fontWeight: 700, letterSpacing: '1px', color: '#c26b2a' }}>
                    <div style={{ fontSize: '28px', letterSpacing: '3px', fontFamily: '"Cinzel", Georgia, serif' }}>
                      {dados.empresaSst.nome.split(' ')[0]?.toUpperCase() || 'EMPRESA'}
                    </div>
                  </div>
                )}
              </div>

              {/* CERTIFICADO centralizado */}
              <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                <h1 style={{
                  fontFamily: '"Cinzel", Georgia, serif',
                  fontWeight: 700,
                  fontSize: '64px',
                  letterSpacing: '6px',
                  margin: 0,
                  lineHeight: 1,
                  color: '#8B4513',
                  textShadow: '2px 2px 4px rgba(0,0,0,.15)',
                }}>
                  CERTIFICADO
                </h1>
              </div>
            </div>

            {/* Certificamos */}
            <div style={{ textAlign: 'center', margin: '18px 0 8px', fontWeight: 800, letterSpacing: '1px', fontSize: '18px' }}>
              CERTIFICAMOS
            </div>

            {/* Nome e CPF */}
            <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
              <span style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {colaborador.nome}
              </span>
              <span style={{ fontSize: '22px' }}> - </span>
              <span style={{ fontWeight: 800, fontSize: '22px', fontStyle: 'italic' }}>
                CPF: {formatCPF(colaborador.cpf)}
              </span>
              <span style={{ fontSize: '22px' }}>,</span>
            </div>

            {/* Texto principal */}
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.62 }}>
              <span>Colaborador(a) da empresa </span>
              <span style={{ fontWeight: 800 }}>{dados.cliente.nome}</span>,
              <span> concluiu a </span>
              <span style={{ fontWeight: 800 }}>{tipoTreinamento}</span>
              <span> do </span>
              <span style={{ fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: '3px' }}>"{dados.treinamento.nome}"</span>,
              <span> de acordo com a Norma Regulamentadora </span>
              <span style={{ fontWeight: 800 }}>NR – {dados.treinamento.norma}</span>
              <span> da </span>
              <span style={{ fontWeight: 800 }}>Portaria 3.214 do MTE</span>
              <span>, com carga horária de </span>
              <span style={{ fontWeight: 800 }}>{String(dados.treinamento.carga_horaria).padStart(2, '0')}</span>
              <span> horas tendo aproveitamento satisfatório, conforme registro no verso deste.</span>
            </p>

            {/* Data e Local */}
            <div style={{ marginTop: '14px' }}>
              <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.62 }}>
                <span style={{ fontWeight: 800 }}>Data: </span>
                <span style={{ fontWeight: 800 }}>{todasDatasFormatadas}</span>
              </p>
              <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.62 }}>
                <span style={{ fontWeight: 800 }}>Local: </span>
                <span>{dados.turma.local_treinamento}</span>
              </p>
            </div>

            {/* Emissão */}
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '18px' }}>
              {cidadeEmissao}, {dataEmissao}.
            </div>

            {/* Assinaturas - apenas 2 colunas */}
            <div style={{
              position: 'absolute',
              left: '80px',
              right: '80px',
              bottom: '18px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '80px',
              alignItems: 'end',
            }}>
              {[0, 1].map((idx) => {
                const assinatura = dados.assinaturas[idx];
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{ height: '70px', borderRadius: '4px', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                      {assinatura?.assinatura_url && (
                        <img src={assinatura.assinatura_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #333', width: '100%', marginBottom: '6px' }} />
                    <div style={{ fontSize: '11px', lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 700 }}>{assinatura?.nome || ''}</div>
                      <div>{assinatura?.cargo || ''}</div>
                      <div>{assinatura?.formacao || ''}</div>
                      <div>{assinatura?.registro || ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // CERTIFICADO DO COLABORADOR - VERSO (Horizontal A4)
    if (paginaId.startsWith('certificado-verso-')) {
      const certIdx = parseInt(paginaId.replace('certificado-verso-', ''));
      // Usar colaboradoresParaCertificado (sem sinistro) se disponível
      const colaboradoresCertificado = (dados as any).colaboradoresParaCertificado || dados.colaboradores.filter((c: any) => !c.temSinistro);
      const colaborador = colaboradoresCertificado[certIdx];
      
      if (!colaborador) return null;

      // Se tem modelo de certificado definido com página de verso, usar ele
      if (dados.modeloCertificado && dados.modeloCertificado.paginas.length > 1) {
        const paginaModelo = dados.modeloCertificado.paginas[1]; // Segunda página = verso
        const blocos = paginaModelo.blocos || [];
        
        return (
          <div style={{ 
            width: `${dados.modeloCertificado.largura}px`, 
            height: `${dados.modeloCertificado.altura}px`, 
            position: 'relative',
            overflow: 'hidden',
            background: '#fff'
          }}>
            {/* Moldura do modelo */}
            {paginaModelo.moldura_url && (
              <img 
                src={paginaModelo.moldura_url} 
                alt="Moldura" 
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                crossOrigin="anonymous"
              />
            )}
            {/* Conteúdo do certificado com layout flexbox */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                fontFamily: 'Georgia, serif',
                flexDirection: (paginaModelo.flex_direction as any) || 'column',
                justifyContent: paginaModelo.justify_content || 'center',
                alignItems: paginaModelo.align_items || 'center',
                textAlign: (paginaModelo.text_align || 'center') as any,
                padding: `${paginaModelo.padding || 48}px`,
              }}
            >
              {blocos.length > 0 ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {blocos
                    .sort((a: any, b: any) => a.ordem - b.ordem)
                    .map((bloco: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        width: bloco.largura || '100%',
                        height: bloco.altura === 'auto' ? 'auto' : bloco.altura,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: bloco.justify_content || 'center',
                        alignItems: bloco.align_items || 'center',
                        textAlign: (bloco.text_align || 'center') as any,
                        padding: `${bloco.padding || 16}px`,
                        marginTop: `${bloco.margin_top || 8}px`,
                        marginBottom: `${bloco.margin_bottom || 8}px`,
                        fontSize: `${bloco.font_size || 14}px`,
                        fontWeight: bloco.font_weight || 'normal',
                        border: bloco.border ? '1px solid #ccc' : 'none',
                        borderRadius: `${bloco.border_radius || 0}px`,
                        backgroundColor: bloco.background_color || 'transparent',
                      }}
                    >
                      <div 
                        style={{ 
                          textAlign: (bloco.text_align || 'center') as any,
                          whiteSpace: 'pre-wrap'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: substituirVariaveisCertificado(bloco.conteudo || '', colaborador)
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  style={{ width: '100%', height: '100%' }}
                  dangerouslySetInnerHTML={{
                    __html: substituirVariaveisCertificado(paginaModelo.conteudo || '', colaborador)
                  }}
                />
              )}
            </div>
          </div>
        );
      }

      // Certificado padrão (fallback)
      // Formatar conteúdo programático
      const formatarConteudoProgramatico = (json: string): string => {
        if (!json) return '<p style="color: #6b7280; text-align: center;">Conteúdo programático não disponível</p>';
        try {
          const blocos = JSON.parse(json) as Array<{ titulo: string; itens: string }>;
          return blocos.map(bloco => {
            const itensArray = bloco.itens.split('\n').filter((i: string) => i.trim());
            const itensHtml = itensArray.map((item: string) => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('');
            return `
              <div style="margin-bottom: 12px;">
                ${bloco.titulo ? `<p style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">${bloco.titulo}:</p>` : ''}
                <ul style="list-style: none; padding-left: 8px; margin: 0;">${itensHtml}</ul>
              </div>
            `;
          }).join('');
        } catch {
          const itens = json.split(';').filter((i: string) => i.trim());
          return `<ul style="list-style: none; padding-left: 8px; margin: 0;">${itens.map((item: string) => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('')}</ul>`;
        }
      };
      
      return (
        <div style={{ 
          width: '1123px', 
          height: '794px', 
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Montserrat", system-ui, -apple-system, Segoe UI, Arial, sans-serif',
          background: '#fff'
        }}>
          {/* Moldura externa */}
          <div style={{
            position: 'absolute',
            inset: '14px',
            border: '10px solid #c26b2a',
            borderRadius: '8px',
            pointerEvents: 'none',
          }} />
          {/* Moldura interna */}
          <div style={{
            position: 'absolute',
            inset: '28px',
            border: '6px solid #6b6b6b',
            borderRadius: '6px',
            pointerEvents: 'none',
          }} />

          {/* VERSO */}
          <div style={{ position: 'absolute', inset: '70px', display: 'flex', flexDirection: 'column' }}>
            {/* Título */}
            <h2 style={{
              margin: '0 0 24px 0',
              textAlign: 'center',
              fontFamily: '"Cinzel", Georgia, serif',
              fontSize: '32px',
              letterSpacing: '4px',
              color: '#444',
              textTransform: 'uppercase',
            }}>
              CONTEÚDO PROGRAMÁTICO
            </h2>

            {/* Conteúdo em duas colunas */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              flex: 1, 
              fontSize: '11px', 
              lineHeight: 1.5 
            }}>
              <div 
                style={{ overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: formatarConteudoProgramatico(dados.treinamento.conteudo_programatico || '') }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Informações adicionais */}
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#374151' }}>Informações do Treinamento</h4>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Treinamento:</strong> {dados.treinamento.nome}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Norma:</strong> NR {dados.treinamento.norma}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Carga Horária:</strong> {dados.treinamento.carga_horaria} horas</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Turma:</strong> {dados.turma.codigo_turma}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Instrutor:</strong> {dados.instrutor.nome}</p>
                </div>

                {/* Logo da empresa */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: '80px', objectFit: 'contain' }} crossOrigin="anonymous" />
                  )}
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>{dados.empresaSst.nome}</p>
                  {dados.empresaSst.endereco && (
                    <p style={{ fontSize: '10px', color: '#9ca3af' }}>{dados.empresaSst.endereco}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do verso */}
            <div style={{ 
              marginTop: 'auto', 
              paddingTop: '16px', 
              borderTop: '2px solid #e5e7eb', 
              textAlign: 'center',
              fontSize: '10px',
              color: '#6b7280'
            }}>
              Certificado {certIdx + 1} de {dados.colaboradores.length} | {colaborador.nome} | Turma: {dados.turma.codigo_turma}
            </div>
          </div>
        </div>
      );
    }

    // RESUMO DO INSTRUTOR (nova página)
    if (paginaId === 'instrutor-resumo') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Instrutor</h2>
            <p style={estilos.subtitulo}>Informações e qualificações do instrutor responsável</p>
          </div>

          <div style={estilos.conteudo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              {/* Card do Instrutor */}
              <div style={{ ...estilos.card, textAlign: 'center', padding: '24px' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: '600', margin: '0 auto 16px' }}>
                  {dados.instrutor.nome?.charAt(0)?.toUpperCase() || 'I'}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px' }}>{dados.instrutor.nome}</h3>
                {dados.instrutor.formacao_academica && <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0 }}>{dados.instrutor.formacao_academica}</p>}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                  {dados.instrutor.email && <p style={{ margin: '4px 0' }}>{dados.instrutor.email}</p>}
                  {dados.instrutor.telefone && <p style={{ margin: '4px 0' }}>{formatarTelefone(dados.instrutor.telefone)}</p>}
                </div>
              </div>

              {/* Formações */}
              <div style={estilos.card}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Formações para este Treinamento</h4>
                {dados.formacoesInstrutor.length > 0 ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {dados.formacoesInstrutor.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '14px' }}>{idx + 1}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '500', color: '#1e293b', margin: 0, fontSize: '13px' }}>{f.nome}</p>
                          {f.registro_tipo && f.registro_numero && (
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{f.registro_tipo} {f.registro_numero}{f.registro_estado ? `/${f.registro_estado}` : ''}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {f.formacao_anexo_url && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px' }}>Formação</span>}
                          {f.treinamento_anexo_url && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px' }}>Treinamento</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>Nenhuma formação vinculada a este treinamento</p>
                )}
              </div>
            </div>

            {/* Assinatura do Instrutor */}
            {dados.instrutor.assinatura_url && (
              <div style={{ ...estilos.card, marginTop: '20px', textAlign: 'center' }}>
                <p style={{ ...estilos.label, marginBottom: '12px' }}>Assinatura do Instrutor</p>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={dados.instrutor.assinatura_url} alt="Assinatura" style={{ maxHeight: '100%', maxWidth: '200px', objectFit: 'contain' }} crossOrigin="anonymous" />
                </div>
                <div style={{ borderTop: '1px solid #1e293b', width: '200px', margin: '8px auto 0' }} />
                <p style={{ fontSize: '12px', color: '#1e293b', fontWeight: '500', marginTop: '4px' }}>{dados.instrutor.nome}</p>
              </div>
            )}
          </div>

          <Rodape />
        </div>
      );
    }

    // ANEXO DE FORMAÇÃO DO INSTRUTOR
    if (paginaId.startsWith('instrutor-formacao-')) {
      const formIdx = parseInt(paginaId.replace('instrutor-formacao-', ''));
      const formacao = dados.formacoesInstrutor[formIdx];
      
      if (!formacao?.formacao_anexo_url) return null;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Certificado de Formação</h2>
            <p style={estilos.subtitulo}>{formacao.nome} - {dados.instrutor.nome}</p>
          </div>

          <div style={{ ...estilos.conteudo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '600px', width: '100%' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={formacao.formacao_anexo_url} 
                  alt={formacao.nome}
                  style={{ width: '100%', height: 'auto', maxHeight: '520px', objectFit: 'contain', display: 'block' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  {formacao.registro_tipo && formacao.registro_numero && `${formacao.registro_tipo} ${formacao.registro_numero}${formacao.registro_estado ? `/${formacao.registro_estado}` : ''}`}
                </p>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // ANEXO DE TREINAMENTO DO INSTRUTOR
    if (paginaId.startsWith('instrutor-treinamento-')) {
      const formIdx = parseInt(paginaId.replace('instrutor-treinamento-', ''));
      const formacao = dados.formacoesInstrutor[formIdx];
      
      if (!formacao?.treinamento_anexo_url) return null;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Certificado de Treinamento</h2>
            <p style={estilos.subtitulo}>{formacao.nome} - {dados.instrutor.nome}</p>
          </div>

          <div style={{ ...estilos.conteudo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '600px', width: '100%' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={formacao.treinamento_anexo_url} 
                  alt={formacao.nome}
                  style={{ width: '100%', height: 'auto', maxHeight: '520px', objectFit: 'contain', display: 'block' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Anexo de treinamento vinculado à formação: {formacao.nome}
                </p>
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    // DADOS DO INSTRUTOR (mantida para compatibilidade)
    if (paginaId === 'instrutor') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ background: 'linear-gradient(to right, #d97706, #ea580c)', padding: '16px', display: 'flex', justifyContent: 'center' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} crossOrigin="anonymous" />
            ) : (
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{dados.empresaSst.nome}</span>
            )}
          </div>

          <div style={{ background: '#fef3c7', borderBottom: '4px solid #d97706', padding: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e', margin: 0, fontFamily: 'Georgia, serif' }}>Dados do Instrutor</h2>
          </div>

          <div style={{ flex: 1, padding: '32px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)', borderRadius: '16px', border: '2px solid #93c5fd', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ width: '96px', height: '96px', background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px', fontWeight: 'bold' }}>
                    {dados.instrutor.nome?.charAt(0)?.toUpperCase() || 'I'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>{dados.instrutor.nome || 'Instrutor não informado'}</h3>
                    {dados.instrutor.formacao_academica && (
                      <p style={{ fontSize: '16px', color: '#1d4ed8', fontWeight: '500' }}>{dados.instrutor.formacao_academica}</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {dados.instrutor.email && (
                    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>E-MAIL</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{dados.instrutor.email}</p>
                    </div>
                  )}
                  {dados.instrutor.telefone && (
                    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>TELEFONE</p>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>{formatarTelefone(dados.instrutor.telefone)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Formações e Certificações */}
              <div style={{ marginTop: '24px', background: 'white', borderRadius: '12px', border: '2px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(to right, #d97706, #ea580c)', color: 'white', padding: '16px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Formações e Certificações para este Treinamento</h4>
                </div>
                <div style={{ padding: '24px' }}>
                  {dados.formacoesInstrutor.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dados.formacoesInstrutor.map((formacao, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(to bottom right, #f59e0b, #ea580c)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{idx + 1}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', color: '#1f2937' }}>{formacao.nome}</p>
                            {formacao.registro_tipo && formacao.registro_numero && (
                              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                {formacao.registro_tipo} {formacao.registro_numero}{formacao.registro_estado ? `/${formacao.registro_estado}` : ''}
                              </p>
                            )}
                          </div>
                          <div style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>✓ Certificado</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                      <p>Nenhum documento anexado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(to right, #d97706, #ea580c)', color: 'white', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>{enderecoEmpresa}</p>
          </div>
        </div>
      );
    }

    // DIPLOMA/CERTIFICADO DO INSTRUTOR
    if (paginaId.startsWith('diploma-instrutor-')) {
      const diplomaIdx = parseInt(paginaId.replace('diploma-instrutor-', ''));
      const formacao = dados.formacoesInstrutor[diplomaIdx];
      
      if (!formacao) return null;

      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)'
        }}>
          <div style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)', padding: '16px', display: 'flex', justifyContent: 'center' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} crossOrigin="anonymous" />
            ) : (
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{dados.empresaSst.nome}</span>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            {/* Título */}
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', textAlign: 'center' }}>
              CERTIFICADO DE FORMAÇÃO
            </h1>
            <p style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '16px' }}>
              Instrutor Habilitado para o Treinamento
            </p>
            
            {/* Nome do Instrutor */}
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px', textAlign: 'center' }}>
              {dados.instrutor.nome}
            </h2>
            
            {/* Formação */}
            <div style={{ background: 'white', padding: '16px 32px', borderRadius: '12px', border: '3px solid #3b82f6', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>FORMAÇÃO</p>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>{formacao.nome}</h3>
              {formacao.registro_tipo && formacao.registro_numero && (
                <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>
                  Registro: {formacao.registro_tipo} {formacao.registro_numero}{formacao.registro_estado ? `/${formacao.registro_estado}` : ''}
                </p>
              )}
            </div>
            
            {/* Treinamento */}
            <p style={{ fontSize: '14px', color: '#374151', textAlign: 'center', maxWidth: '500px', lineHeight: '1.5', marginBottom: '16px' }}>
              Habilitado para ministrar o treinamento de <strong>{dados.treinamento.nome}</strong> ({dados.treinamento.norma})
            </p>
            
            {/* Anexos - Formação e Treinamento lado a lado */}
            <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '700px' }}>
              {/* Anexo da Formação */}
              {formacao.formacao_anexo_url && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textAlign: 'center', fontWeight: '600' }}>Certificado de Formação:</p>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '8px', border: '2px solid #93c5fd' }}>
                    <img 
                      src={formacao.formacao_anexo_url} 
                      alt="Certificado de Formação"
                      style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px' }}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Anexo do Treinamento */}
              {formacao.treinamento_anexo_url && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textAlign: 'center', fontWeight: '600' }}>Certificado do Treinamento:</p>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                    <img 
                      src={formacao.treinamento_anexo_url} 
                      alt="Certificado do Treinamento"
                      style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px' }}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Mensagem se não houver anexos */}
            {!formacao.formacao_anexo_url && !formacao.treinamento_anexo_url && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
                <p>Nenhum documento anexado</p>
              </div>
            )}
          </div>
          
          {/* Rodapé */}
          <div style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white', padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px' }}>Formação {diplomaIdx + 1} de {dados.formacoesInstrutor.length} | {dados.empresaSst.nome}</p>
          </div>
        </div>
      );
    }

    // AGRADECIMENTOS
    if (paginaId === 'agradecimentos') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Agradecimentos</h2>
            <p style={estilos.subtitulo}>Reconhecimento e compromisso com a segurança</p>
          </div>

          <div style={estilos.conteudo}>
            {/* Grid de agradecimentos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Agradecimento à Empresa Cliente */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                <div style={{ width: '100%', height: '3px', background: '#3b82f6', borderRadius: '2px', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  À Empresa Cliente
                </h3>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>{dados.cliente.nome}</p>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Agradecemos a confiança depositada em nossos serviços. É uma honra contribuir para o 
                  desenvolvimento e capacitação de sua equipe, fortalecendo a cultura de segurança.
                </p>
              </div>

              {/* Agradecimento aos Colaboradores */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                <div style={{ width: '100%', height: '3px', background: '#22c55e', borderRadius: '2px', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Aos Colaboradores
                </h3>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e', marginBottom: '8px' }}>{dados.estatisticas.totalParticipantes} participantes</p>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Nosso sincero agradecimento pelo comprometimento e dedicação. Vocês são fundamentais 
                  para construirmos juntos um ambiente de trabalho mais seguro.
                </p>
              </div>
            </div>

            {/* Agradecimento ao Instrutor */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ width: '100%', height: '3px', background: '#8b5cf6', borderRadius: '2px', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ao Instrutor
              </h3>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>{dados.instrutor?.nome || 'Instrutor'}</p>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Agradecemos pela dedicação e profissionalismo na condução deste treinamento, 
                transmitindo conhecimentos essenciais para a segurança de todos os participantes.
              </p>
            </div>

            {/* Chamado à Segurança */}
            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '24px', marginBottom: '20px', color: '#fff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Compromisso com a Segurança
              </h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '16px' }}>
                A segurança no trabalho é uma responsabilidade de todos. Aplique os conhecimentos 
                adquiridos neste treinamento no seu dia a dia, identifique riscos, utilize os EPIs 
                corretamente e comunique situações de perigo.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ fontSize: '14px', fontWeight: '500', fontStyle: 'italic', margin: 0, color: '#f8fafc' }}>
                  "Segurança não é apenas uma regra, é um valor que protege vidas."
                </p>
              </div>
            </div>

            {/* Informações da Empresa SST */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} crossOrigin="anonymous" />}
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{dados.empresaSst.nome}</p>
                  {dados.empresaSst.cnpj && <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>CNPJ: {dados.empresaSst.cnpj}</p>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                {enderecoEmpresa && (
                  <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '500' }}>Endereço</p>
                    <p style={{ fontSize: '11px', color: '#374151', margin: 0 }}>{enderecoEmpresa}</p>
                  </div>
                )}
                {dados.empresaSst.telefone && (
                  <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '500' }}>Telefone</p>
                    <p style={{ fontSize: '11px', color: '#374151', margin: 0 }}>{dados.empresaSst.telefone}</p>
                  </div>
                )}
                {dados.empresaSst.email && (
                  <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '500' }}>E-mail</p>
                    <p style={{ fontSize: '11px', color: '#374151', margin: 0 }}>{dados.empresaSst.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Rodape />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleVoltar}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Relatório de Treinamento
                </h1>
                <p className="text-sm text-slate-500">
                  {dados.turma.codigo_turma} - {dados.treinamento.nome}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Navegação de páginas */}
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaginaAtual(Math.max(0, paginaAtual - 1))}
                  disabled={paginaAtual === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <select
                  value={paginaAtual}
                  onChange={(e) => setPaginaAtual(parseInt(e.target.value))}
                  className="h-9 px-3 py-1 text-sm border rounded-md bg-white text-slate-700 min-w-[180px] cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {paginas.map((pagina, idx) => (
                    <option key={pagina.id} value={idx}>
                      {idx + 1}. {pagina.nome}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-slate-500">
                  / {paginas.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaginaAtual(Math.min(paginas.length - 1, paginaAtual + 1))}
                  disabled={paginaAtual === paginas.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                disabled={gerando || validando}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {gerando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              {relatorioValidado ? (
                <button
                  onClick={() => setRevalidarDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Validado</span>
                </button>
              ) : turmaFinalizada ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Turma Finalizada</span>
                </div>
              ) : canValidate ? (
                <Button 
                  onClick={handleValidarRelatorio} 
                  disabled={validando || gerando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {validando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validar Relatório
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <div 
            ref={relatorioRef}
            className="bg-white shadow-2xl print:shadow-none"
            style={{
              width: isPaginaCertificado(paginaAtualData?.id || '') ? '1123px' : '794px',
              height: isPaginaCertificado(paginaAtualData?.id || '') ? '794px' : '1123px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {renderPagina()}
          </div>
        </div>

        {/* Info da página */}
        <div className="print:hidden mt-6 text-center text-sm text-slate-500">
          <p>Página: {paginaAtualData?.nome || 'Capa'}</p>
          <p>Dimensões: {isPaginaCertificado(paginaAtualData?.id || '') ? 'A4 Paisagem (1123px × 794px)' : 'A4 Retrato (794px × 1123px)'}</p>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: 794px 1123px;
            margin: 0;
          }
        }
      `}</style>

      {/* Dialog de Revalidação */}
      <Dialog open={revalidarDialogOpen} onOpenChange={setRevalidarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Relatório Validado
            </DialogTitle>
            <DialogDescription>
              Este relatório já foi validado anteriormente. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => setRevalidarDialogOpen(false)}
            >
              <CheckCircle className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">Manter</p>
                <p className="text-xs text-muted-foreground">Manter o relatório atual sem alterações</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 border-amber-200 hover:bg-amber-50"
              disabled={validando}
              onClick={async () => {
                setRevalidarDialogOpen(false);
                setRelatorioValidado(false);
                await handleValidarRelatorio();
              }}
            >
              {validando ? (
                <Loader2 className="h-5 w-5 mr-3 text-amber-600 flex-shrink-0 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-3 text-amber-600 flex-shrink-0" />
              )}
              <div className="text-left">
                <p className="font-medium text-amber-700">Revalidar com Alterações</p>
                <p className="text-xs text-muted-foreground">Gerar novo relatório substituindo o anterior</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
