import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGerenciarTurmaAuditoria } from '@/hooks/useGerenciarTurmaAuditoria';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Printer, FileText, ChevronLeft, ChevronRight, CheckCircle, Users, Camera, PenTool, ScanFace, RefreshCw, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const db = supabase as any;

interface ColaboradorPresenca {
  id: string;
  colaborador_id: string;
  nome: string;
  cpf: string;
  foto_url: string | null;
  presencas: Record<string, {
    presente: boolean;
    assinatura: string | null;
    foto_validacao: string | null;
    hora_validacao: string | null;
    similaridade_facial: number | null;
  }>;
}

interface DadosRelatorioPresencas {
  turma: {
    id: string;
    codigo_turma: string;
    numero_turma: number;
    data_inicio: string;
    data_fim: string;
  };
  treinamento: {
    nome: string;
    norma: string;
    carga_horaria: number;
  };
  cliente: {
    nome: string;
    cnpj?: string;
  };
  empresaSst: {
    nome: string;
    cnpj?: string;
    logo_url?: string;
    endereco?: string;
    email?: string;
    telefone?: string;
  };
  infoEmpresa: {
    logo_pequena_url?: string;
  };
  colaboradores: ColaboradorPresenca[];
  datasAulas: string[];
  reconhecimentoFacialAtivo: boolean;
}

export default function VisualizarRelatorioPresencas() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const turmaId = searchParams.get('turmaId');
  
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosRelatorioPresencas | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [relatorioValidado, setRelatorioValidado] = useState(false);
  const [turmaFinalizada, setTurmaFinalizada] = useState(false);
  const [revalidarDialogOpen, setRevalidarDialogOpen] = useState(false);
  const [semPermissao, setSemPermissao] = useState(false);
  
  // Apenas empresa_sst, instrutor e admin_vertical podem validar
  const canValidate = profile?.role === 'empresa_sst' || profile?.role === 'instrutor' || profile?.role === 'admin_vertical';
  
  const auditoria = useGerenciarTurmaAuditoria();
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

  // Verificar se relatório de presenças já foi validado
  const verificarRelatorioValidado = async () => {
    if (!turmaId) return;
    const { data } = await db
      .from('turma_anexos')
      .select('id')
      .eq('turma_id', turmaId)
      .eq('tipo', 'relatorio_presencas')
      .maybeSingle();
    setRelatorioValidado(!!data);
  };

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

  // Função para validar e salvar o relatório de presenças no storage
  const handleValidarRelatorio = async () => {
    if (!relatorioRef.current || !dados || !turmaId) return;

    try {
      setValidando(true);
      toast.info('Gerando e salvando relatório de presenças... Aguarde.');
      
      const paginas = getPaginas();
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123],
        compress: true
      });

      for (let i = 0; i < paginas.length; i++) {
        setPaginaAtual(i);
        await new Promise(resolve => setTimeout(resolve, 400));

        const canvas = await html2canvas(relatorioRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        
        if (i > 0) {
          pdf.addPage([794, 1123], 'portrait');
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const nomeArquivo = `relatorio_presencas_${dados.turma.codigo_turma || dados.turma.numero_turma}_${dados.treinamento.norma}_${Date.now()}.pdf`;
      const arquivoPath = `${turmaId}/${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from('turma-anexos')
        .upload(arquivoPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('turma-anexos')
        .getPublicUrl(arquivoPath);

      // Verificar se já existe
      const { data: existing } = await db
        .from('turma_anexos')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('tipo', 'relatorio_presencas')
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await db
          .from('turma_anexos')
          .update({
            nome: `Relatório de Presenças NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório de presenças gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await db
          .from('turma_anexos')
          .insert({
            turma_id: turmaId,
            tipo: 'relatorio_presencas',
            nome: `Relatório de Presenças NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório de presenças gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma}`
          });
        if (insertError) throw insertError;
      }

      setRelatorioValidado(true);
      setPaginaAtual(0);
      toast.success('Relatório de presenças validado e arquivado com sucesso!');
      
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
              descricao: `Relatório de Presenças validado (${dados.colaboradores.length} colaboradores)`,
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
      console.error('Erro ao validar relatório de presenças:', error);
      toast.error('Erro ao validar relatório: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setValidando(false);
      setPaginaAtual(0);
    }
  };

  // Verificar se o usuário tem permissão para acessar a turma
  // Quem consegue ver a turma deve conseguir ver o relatório
  const verificarPermissao = async (turmaData: any): Promise<boolean> => {
    if (!profile) return false;
    
    // Admin da plataforma tem acesso a tudo
    if (profile.role === 'admin_vertical') return true;
    
    // Empresa SST - verifica se a turma pertence à empresa do usuário
    // Usuários empresa_sst sempre podem ver relatórios de turmas da sua empresa
    if (profile.role === 'empresa_sst') {
      // Verificar diretamente se a empresa_id da turma bate
      if (turmaData.empresa_id === profile.empresa_id) return true;
      
      // Verificar se o usuário pertence à empresa dona da turma
      const { data: userProfile } = await db
        .from('profiles')
        .select('empresa_id')
        .eq('id', profile.id)
        .maybeSingle();
      
      if (userProfile?.empresa_id === turmaData.empresa_id) return true;
      
      // Fallback: Se o usuário é empresa_sst e a turma existe, permitir acesso
      // (a RLS do Supabase já filtra as turmas que o usuário pode ver)
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

      // Buscar dados da turma
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
          carga_horaria_total
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
      const dataInicio = datasOrdenadas[0] || '';
      const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

      // Buscar treinamento
      const { data: treinamentoData } = await db
        .from('catalogo_treinamentos')
        .select('nome, norma, ch_formacao, ch_reciclagem')
        .eq('id', turmaData.treinamento_id)
        .single();

      // Buscar cliente
      const { data: clienteSstData } = await db
        .from('clientes_sst')
        .select('nome, cliente_empresa_id')
        .eq('id', turmaData.cliente_id)
        .single();

      let clienteData: any = { nome: clienteSstData?.nome || '' };
      let clienteEmpresaId: string | null = null;
      if (clienteSstData?.cliente_empresa_id) {
        clienteEmpresaId = clienteSstData.cliente_empresa_id;
        const { data: empresaClienteData } = await db
          .from('empresas')
          .select('nome, cnpj')
          .eq('id', clienteSstData.cliente_empresa_id)
          .single();
        if (empresaClienteData) clienteData = empresaClienteData;
      }

      // Verificar se reconhecimento facial está ativo para esta empresa cliente
      let reconhecimentoFacialAtivo = false;
      if (turmaData.empresa_id && clienteEmpresaId) {
        const { data: configData } = await db
          .from('reconhecimento_facial_config')
          .select('ativo')
          .eq('empresa_sst_id', turmaData.empresa_id)
          .eq('cliente_empresa_id', clienteEmpresaId)
          .maybeSingle();
        reconhecimentoFacialAtivo = configData?.ativo || false;
      }

      // Buscar empresa SST
      const { data: empresaData } = await db
        .from('empresas')
        .select('nome, cnpj, logo_url, endereco, cidade, estado, telefone, email')
        .eq('id', turmaData.empresa_id)
        .single();

      // Buscar info empresa
      const { data: infoEmpresaData } = await db
        .from('informacoes_empresa')
        .select('logo_pequena_url')
        .eq('empresa_id', turmaData.empresa_id)
        .maybeSingle();

      // Buscar colaboradores da turma
      const { data: colaboradoresData } = await db
        .from('turma_colaboradores')
        .select(`
          id,
          colaborador_id,
          colaborador:colaboradores(id, nome, cpf, foto_url)
        `)
        .eq('turma_id', turmaId);

      // Buscar presenças dos colaboradores
      const colaboradorTurmaIds = (colaboradoresData || []).map((c: any) => c.id);
      const { data: presencasData } = await db
        .from('turma_colaborador_presencas')
        .select('colaborador_turma_id, data_aula, presente, assinatura, foto_validacao, hora_validacao, similaridade_facial')
        .in('colaborador_turma_id', colaboradorTurmaIds);

      // Mapear presenças por colaborador
      const presencasPorColaborador: Record<string, Record<string, any>> = {};
      (presencasData || []).forEach((p: any) => {
        if (!presencasPorColaborador[p.colaborador_turma_id]) {
          presencasPorColaborador[p.colaborador_turma_id] = {};
        }
        presencasPorColaborador[p.colaborador_turma_id][p.data_aula] = {
          presente: p.presente,
          assinatura: p.assinatura,
          foto_validacao: p.foto_validacao,
          hora_validacao: p.hora_validacao,
          similaridade_facial: p.similaridade_facial
        };
      });

      // Montar colaboradores ordenados alfabeticamente
      const colaboradores: ColaboradorPresenca[] = (colaboradoresData || [])
        .map((c: any) => ({
          id: c.id,
          colaborador_id: c.colaborador_id,
          nome: c.colaborador?.nome || '',
          cpf: c.colaborador?.cpf || '',
          foto_url: c.colaborador?.foto_url || null,
          presencas: presencasPorColaborador[c.id] || {}
        }))
        .sort((a: ColaboradorPresenca, b: ColaboradorPresenca) => a.nome.localeCompare(b.nome));

      const enderecoCompleto = empresaData?.endereco 
        ? `${empresaData.endereco}${empresaData.cidade ? `, ${empresaData.cidade}` : ''}${empresaData.estado ? `/${empresaData.estado}` : ''}`
        : '';

      setDados({
        turma: {
          id: turmaData.id,
          codigo_turma: turmaData.codigo_turma || `T${turmaData.numero_turma}`,
          numero_turma: turmaData.numero_turma,
          data_inicio: dataInicio,
          data_fim: dataFim
        },
        treinamento: {
          nome: treinamentoData?.nome || '',
          norma: treinamentoData?.norma || '',
          carga_horaria: turmaData.carga_horaria_total || (turmaData.tipo_treinamento === 'reciclagem' 
            ? (treinamentoData?.ch_reciclagem || 0) 
            : (treinamentoData?.ch_formacao || 0))
        },
        cliente: clienteData,
        empresaSst: {
          nome: empresaData?.nome || '',
          cnpj: empresaData?.cnpj,
          logo_url: empresaData?.logo_url,
          endereco: enderecoCompleto,
          email: empresaData?.email,
          telefone: empresaData?.telefone
        },
        infoEmpresa: infoEmpresaData || {},
        colaboradores,
        datasAulas: datasOrdenadas,
        reconhecimentoFacialAtivo
      });

    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  // Definir páginas do relatório
  const getPaginas = () => {
    if (!dados) return [];
    
    const paginas: Array<{ id: string; nome: string; tipo: 'capa' | 'pagina' }> = [];
    
    // CAPA
    paginas.push({ id: 'capa', nome: 'Capa', tipo: 'capa' });
    
    // Índice
    paginas.push({ id: 'indice', nome: 'Índice', tipo: 'pagina' });
    
    // Tabela resumo de presenças
    paginas.push({ id: 'resumo-presencas', nome: 'Resumo de Presenças', tipo: 'pagina' });
    
    // Documentos comprobatórios por dia - colaborador por colaborador
    dados.datasAulas.forEach((data, dataIdx) => {
      // Capa do dia
      paginas.push({ id: `capa-dia-${dataIdx}`, nome: `Capa - ${format(parseISO(data), 'dd/MM/yyyy')}`, tipo: 'capa' });
      
      // Uma página por colaborador para cada dia
      dados.colaboradores.forEach((colab, colabIdx) => {
        paginas.push({ 
          id: `comprovante-${dataIdx}-${colabIdx}`, 
          nome: `${colab.nome} - ${format(parseISO(data), 'dd/MM')}`, 
          tipo: 'pagina' 
        });
      });
    });
    
    return paginas;
  };

  const handleDownloadPDF = async () => {
    if (!relatorioRef.current || !dados) return;

    try {
      setGerando(true);
      toast.info('Gerando PDF... Aguarde.');
      
      const paginas = getPaginas();
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123],
        compress: true
      });

      for (let i = 0; i < paginas.length; i++) {
        setPaginaAtual(i);
        await new Promise(resolve => setTimeout(resolve, 400));

        const canvas = await html2canvas(relatorioRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        
        if (i > 0) {
          pdf.addPage([794, 1123], 'portrait');
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      }

      const nomeArquivo = `relatorio_presencas_${dados.turma.codigo_turma}_${dados.treinamento.norma || 'treinamento'}.pdf`;
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

  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
    try {
      return format(parseISO(dataStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dataStr;
    }
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';
    const nums = cpf.replace(/\D/g, '');
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando relatório de presenças...</p>
        </div>
      </div>
    );
  }

  if (semPermissao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-red-600" />
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
  const logoUrl = dados.infoEmpresa?.logo_pequena_url || dados.empresaSst?.logo_url;

  // Estilos
  const estilos = {
    pagina: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, fontFamily: '"Segoe UI", system-ui, sans-serif', background: '#fff' },
    header: { background: '#1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTexto: { color: '#fff', fontSize: '14px', fontWeight: '500' as const },
    titulo: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' },
    tituloH2: { fontSize: '24px', fontWeight: '600' as const, color: '#1e293b', margin: 0 },
    subtitulo: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    conteudo: { flex: 1, padding: '24px 32px', overflow: 'hidden' as const },
    label: { fontSize: '10px', fontWeight: '600' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' },
    valor: { fontSize: '14px', color: '#1e293b', fontWeight: '500' as const },
    card: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' },
  };

  // Header
  const Header = () => (
    <div style={estilos.header}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...estilos.headerTexto, fontSize: '14px', fontWeight: '600' }}>{dados.empresaSst.nome}</span>
        <span style={{ ...estilos.headerTexto, fontSize: '10px', opacity: 0.8 }}>CNPJ: {dados.empresaSst.cnpj || '-'}</span>
      </div>
      <span style={estilos.headerTexto}>{dados.turma.codigo_turma}</span>
    </div>
  );

  // Rodapé
  const Rodape = () => (
    <div style={{ 
      background: '#1e293b',
      padding: '10px 24px',
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      minHeight: '48px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '10px' }}>
        <span style={{ fontWeight: '600', color: '#fff' }}>{dados.empresaSst.nome}</span>
        {dados.empresaSst.email && <><span style={{ color: '#475569' }}>|</span><span>{dados.empresaSst.email}</span></>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', fontSize: '10px' }}>
        <span style={{ color: '#cbd5e1' }}>{paginaAtualData?.nome || 'Página'}</span>
        <span style={{ background: '#334155', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#fff' }}>
          {paginaAtual + 1} / {paginas.length}
        </span>
      </div>
    </div>
  );

  // Renderizar página
  const renderPagina = () => {
    const paginaId = paginaAtualData?.id || 'capa';

    // CAPA PRINCIPAL
    if (paginaId === 'capa') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
          <div style={{ padding: '32px', textAlign: 'center' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} crossOrigin="anonymous" /> : <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{dados.empresaSst.nome}</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <Users style={{ width: '64px', height: '64px', color: '#fff', marginBottom: '24px', opacity: 0.9 }} />
            <h1 style={{ fontSize: '42px', fontWeight: '300', color: '#fff', textAlign: 'center', marginBottom: '12px', letterSpacing: '2px' }}>Relatório de Presenças</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>Documentos Comprobatórios de Presença</p>
            <div style={{ width: '80px', height: '3px', background: '#fff', marginTop: '24px', opacity: 0.5 }} />
          </div>
          <div style={{ padding: '32px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', color: '#fff' }}>
              <div><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px', textTransform: 'uppercase' }}>Treinamento</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.treinamento.nome}</div></div>
              <div><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px', textTransform: 'uppercase' }}>Turma</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.turma.codigo_turma}</div></div>
              <div><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px', textTransform: 'uppercase' }}>Cliente</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.cliente.nome}</div></div>
            </div>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>{dados.empresaSst.nome} | CNPJ: {dados.empresaSst.cnpj || '-'}</div>
            </div>
          </div>
        </div>
      );
    }

    // CAPA DE DIA
    if (paginaId.startsWith('capa-dia-')) {
      const dataIdx = parseInt(paginaId.split('-')[2]);
      const data = dados.datasAulas[dataIdx];
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
          <div style={{ padding: '32px', textAlign: 'center' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} crossOrigin="anonymous" /> : <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{dados.empresaSst.nome}</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '300', color: '#fff', textAlign: 'center', marginBottom: '12px', letterSpacing: '2px' }}>
              {format(parseISO(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>Comprovantes de Presença</p>
            <div style={{ width: '80px', height: '3px', background: '#fff', marginTop: '24px', opacity: 0.5 }} />
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px 24px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>{dados.colaboradores.length}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Colaboradores</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '32px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', color: '#fff' }}>
              <div><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px', textTransform: 'uppercase' }}>Treinamento</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.treinamento.nome}</div></div>
              <div><div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px', textTransform: 'uppercase' }}>Turma</div><div style={{ fontSize: '12px', fontWeight: '500' }}>{dados.turma.codigo_turma}</div></div>
            </div>
          </div>
        </div>
      );
    }

    // ÍNDICE
    if (paginaId === 'indice') {
      const secoes = [
        { nome: 'Resumo de Presenças', pagina: 3 },
        ...dados.datasAulas.map((data, idx) => ({
          nome: `Comprovantes - ${format(parseISO(data), 'dd/MM/yyyy')}`,
          pagina: 4 + idx * (dados.colaboradores.length + 1)
        }))
      ];

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Índice</h2>
            <p style={estilos.subtitulo}>Sumário do relatório de presenças</p>
          </div>
          <div style={estilos.conteudo}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '2px solid #1e293b', fontSize: '12px', fontWeight: '600', color: '#1e293b', textTransform: 'uppercase' }}>Seção</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '2px solid #1e293b', fontSize: '12px', fontWeight: '600', color: '#1e293b', width: '100px' }}>Página</th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((secao, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#374151', fontWeight: '500' }}>{secao.nome}</td>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{secao.pagina}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '24px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>{dados.colaboradores.length}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Colaboradores</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>{dados.datasAulas.length}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Dias de Aula</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>{paginas.length}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Total de Páginas</div>
                </div>
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // RESUMO DE PRESENÇAS
    if (paginaId === 'resumo-presencas') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Resumo de Presenças</h2>
            <p style={estilos.subtitulo}>Visão geral da frequência dos colaboradores</p>
          </div>
          <div style={estilos.conteudo}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>#</th>
                  <th style={{ background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Colaborador</th>
                  <th style={{ background: '#f1f5f9', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>CPF</th>
                  {dados.datasAulas.map((data, idx) => (
                    <th key={idx} style={{ background: '#f1f5f9', padding: '10px 4px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: '10px' }}>
                      {format(parseISO(data), 'dd/MM')}
                    </th>
                  ))}
                  <th style={{ background: '#f1f5f9', padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Presenças</th>
                  <th style={{ background: '#f1f5f9', padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Faltas</th>
                </tr>
              </thead>
              <tbody>
                {dados.colaboradores.map((colab, idx) => {
                  const presencas = dados.datasAulas.filter(d => colab.presencas[d]?.presente).length;
                  const faltas = dados.datasAulas.length - presencas;
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b' }}>{colab.nome}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{formatarCPF(colab.cpf)}</td>
                      {dados.datasAulas.map((data, dataIdx) => {
                        const presenca = colab.presencas[data];
                        const presente = presenca?.presente;
                        return (
                          <td key={dataIdx} style={{ padding: '4px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <div style={{ 
                              width: '20px', height: '20px', borderRadius: '4px', margin: '0 auto',
                              background: presente ? '#dcfce7' : '#fee2e2',
                              border: `1px solid ${presente ? '#86efac' : '#fca5a5'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: '600', color: presente ? '#16a34a' : '#dc2626'
                            }}>
                              {presente ? '✓' : '✗'}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '11px' }}>{presencas}</span>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span style={{ background: faltas > 0 ? '#fee2e2' : '#f1f5f9', color: faltas > 0 ? '#dc2626' : '#64748b', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '11px' }}>{faltas}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Rodape />
        </div>
      );
    }

    // COMPROVANTE DE PRESENÇA
    if (paginaId.startsWith('comprovante-')) {
      const parts = paginaId.split('-');
      const dataIdx = parseInt(parts[1]);
      const colabIdx = parseInt(parts[2]);
      const data = dados.datasAulas[dataIdx];
      const colab = dados.colaboradores[colabIdx];
      const presenca = colab.presencas[data];
      const presente = presenca?.presente;
      const temFotoValidacao = presenca?.foto_validacao;
      const temAssinatura = presenca?.assinatura;
      const similaridade = presenca?.similaridade_facial;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Comprovante de Presença</h2>
            <p style={estilos.subtitulo}>{format(parseISO(data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <div style={estilos.conteudo}>
            {/* Info do colaborador */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={estilos.card}>
                <p style={estilos.label}>Colaborador</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{colab.nome}</p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>CPF: {formatarCPF(colab.cpf)}</p>
              </div>
              <div style={{ ...estilos.card, background: presente ? '#f0fdf4' : '#fef2f2', borderColor: presente ? '#86efac' : '#fca5a5' }}>
                <p style={estilos.label}>Status</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: presente ? '#16a34a' : '#dc2626', margin: 0 }}>
                  {presente ? '✓ PRESENTE' : '✗ AUSENTE'}
                </p>
                {presenca?.hora_validacao && (
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Validado às {format(parseISO(presenca.hora_validacao), 'HH:mm:ss')}
                  </p>
                )}
              </div>
            </div>

            {/* Fotos e assinatura */}
            {presente && (
              <div style={{ display: 'grid', gridTemplateColumns: dados.reconhecimentoFacialAtivo ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px' }}>
                {/* Foto cadastrada - só exibe se reconhecimento facial está ativo */}
                {dados.reconhecimentoFacialAtivo && (
                  <div style={estilos.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Camera style={{ width: '16px', height: '16px', color: '#64748b' }} />
                      <p style={{ ...estilos.label, margin: 0 }}>Foto Cadastrada</p>
                    </div>
                    <div style={{ aspectRatio: '3/4', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                      {colab.foto_url ? (
                        <img src={colab.foto_url} alt="Foto cadastrada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <Camera style={{ width: '48px', height: '48px' }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Foto da validação - só exibe se reconhecimento facial está ativo */}
                {dados.reconhecimentoFacialAtivo && (
                  <div style={estilos.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ScanFace style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                      <p style={{ ...estilos.label, margin: 0 }}>Foto da Validação</p>
                    </div>
                    <div style={{ aspectRatio: '3/4', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '2px solid #3b82f6' }}>
                      {temFotoValidacao ? (
                        <img src={presenca.foto_validacao!} alt="Foto validação" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <ScanFace style={{ width: '48px', height: '48px' }} />
                        </div>
                      )}
                    </div>
                    {similaridade !== null && similaridade !== undefined && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#dcfce7', borderRadius: '4px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                          Similaridade: {(similaridade * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Assinatura - sempre exibe */}
                <div style={{ ...estilos.card, gridColumn: dados.reconhecimentoFacialAtivo ? 'auto' : 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <PenTool style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                    <p style={{ ...estilos.label, margin: 0 }}>Assinatura Digital</p>
                  </div>
                  <div style={{ aspectRatio: dados.reconhecimentoFacialAtivo ? '3/4' : '16/9', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {temAssinatura ? (
                      <img src={presenca.assinatura!} alt="Assinatura" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} crossOrigin="anonymous" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <PenTool style={{ width: '48px', height: '48px' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info do treinamento */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '12px' }}>
                <div>
                  <p style={{ ...estilos.label, marginBottom: '2px' }}>Treinamento</p>
                  <p style={{ margin: 0, fontWeight: '500', color: '#1e293b' }}>{dados.treinamento.nome}</p>
                </div>
                <div>
                  <p style={{ ...estilos.label, marginBottom: '2px' }}>Norma</p>
                  <p style={{ margin: 0, fontWeight: '500', color: '#1e293b' }}>{dados.treinamento.norma}</p>
                </div>
                <div>
                  <p style={{ ...estilos.label, marginBottom: '2px' }}>Turma</p>
                  <p style={{ margin: 0, fontWeight: '500', color: '#1e293b' }}>{dados.turma.codigo_turma}</p>
                </div>
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
    <div className="min-h-screen bg-slate-200 print:bg-white">
      {/* Header - mesma estrutura do relatório principal */}
      <div className="bg-white border-b shadow-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleVoltar}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Relatório de Presenças
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
                  disabled={paginaAtual === 0 || gerando}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <select
                  value={paginaAtual}
                  onChange={(e) => setPaginaAtual(parseInt(e.target.value))}
                  className="h-9 px-3 py-1 text-sm border rounded-md bg-white text-slate-700 min-w-[180px] cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={gerando}
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
                  disabled={paginaAtual === paginas.length - 1 || gerando}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                disabled={gerando}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {gerando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando... ({paginaAtual + 1}/{paginas.length})
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
                      Validando... ({paginaAtual + 1}/{paginas.length})
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
              width: '794px',
              height: '1123px',
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
          <p>Dimensões: A4 Retrato (794px × 1123px)</p>
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
              Relatório de Presenças Validado
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
