import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGerenciarTurmaAuditoria } from '@/hooks/useGerenciarTurmaAuditoria';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Printer, FileText, ChevronLeft, ChevronRight, AlertTriangle, Camera, User, Building, GraduationCap, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const db = supabase as any;

interface SinistroFoto {
  id: string;
  foto_url: string;
  descricao: string | null;
  data_captura: string;
}

interface TipoSinistro {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  acao_padrao: string;
}

interface Sinistro {
  id: string;
  turma_colaborador_id: string;
  tipo_sinistro_id: string;
  tipo_sinistro?: TipoSinistro;
  acao: string;
  descricao: string | null;
  fotos: SinistroFoto[];
  created_at: string;
  registrado_por?: string;
  instrutor?: { nome: string; email?: string };
  colaborador?: {
    id: string;
    nome: string;
    cpf: string;
    foto_url: string | null;
    matricula: string | null;
  };
}

interface DadosRelatorioSinistros {
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
  sinistros: Sinistro[];
}

export default function VisualizarRelatorioSinistros() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const turmaId = searchParams.get('turmaId');
  
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosRelatorioSinistros | null>(null);
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

  useEffect(() => {
    if (authLoading) return;
    if (profile) return;
    
    const timeout = setTimeout(() => {
      if (!profile) {
        toast.error('Você precisa estar logado para acessar este relatório');
        navigate('/auth');
      }
    }, 2000);
    
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
    if (turmaId && profile) {
      fetchDadosRelatorio();
      verificarRelatorioValidado();
      verificarTurmaFinalizada();
    }
  }, [turmaId, profile]);

  // Verificar se relatório de sinistros já foi validado
  const verificarRelatorioValidado = async () => {
    if (!turmaId) return;
    const { data } = await db
      .from('turma_anexos')
      .select('id')
      .eq('turma_id', turmaId)
      .eq('tipo', 'relatorio_sinistros')
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

  // Função para validar e salvar o relatório de sinistros no storage
  const handleValidarRelatorio = async () => {
    if (!relatorioRef.current || !dados || !turmaId) return;

    try {
      setValidando(true);
      toast.info('Gerando e salvando relatório de sinistros... Aguarde.');
      
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
      const nomeArquivo = `relatorio_sinistros_${dados.turma.codigo_turma || dados.turma.numero_turma}_${dados.treinamento.norma}_${Date.now()}.pdf`;
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
        .eq('tipo', 'relatorio_sinistros')
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await db
          .from('turma_anexos')
          .update({
            nome: `Relatório de Sinistros NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório de sinistros gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await db
          .from('turma_anexos')
          .insert({
            turma_id: turmaId,
            tipo: 'relatorio_sinistros',
            nome: `Relatório de Sinistros NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            url: urlData.publicUrl,
            file_path: arquivoPath,
            descricao: `Relatório de sinistros gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Turma: ${dados.turma.codigo_turma || dados.turma.numero_turma}`
          });
        if (insertError) throw insertError;
      }

      setRelatorioValidado(true);
      setPaginaAtual(0);
      toast.success('Relatório de sinistros validado e arquivado com sucesso!');
      
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
              descricao: `Relatório de Sinistros validado (${dados.sinistros.length} ocorrência(s))`,
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
      console.error('Erro ao validar relatório de sinistros:', error);
      toast.error('Erro ao validar relatório: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setValidando(false);
      setPaginaAtual(0);
    }
  };

  const verificarPermissao = async (turmaData: any): Promise<boolean> => {
    if (!profile) return false;
    if (profile.role === 'admin_vertical') return true;
    
    if (profile.role === 'empresa_sst') {
      if (turmaData.empresa_id === profile.empresa_id) return true;
      return true;
    }
    
    if (profile.role === 'instrutor') {
      const { data: instrutorData } = await db
        .from('instrutores')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (instrutorData && turmaData.instrutor_id === instrutorData.id) return true;
    }
    
    return false;
  };

  const fetchDadosRelatorio = async () => {
    try {
      setLoading(true);

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
      if (clienteSstData?.cliente_empresa_id) {
        const { data: empresaClienteData } = await db
          .from('empresas')
          .select('nome, cnpj')
          .eq('id', clienteSstData.cliente_empresa_id)
          .single();
        if (empresaClienteData) clienteData = empresaClienteData;
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

      // Buscar sinistros da turma
      const { data: sinistrosData } = await db
        .from('sinistros_colaborador')
        .select(`
          id,
          turma_colaborador_id,
          tipo_sinistro_id,
          acao,
          descricao,
          created_at,
          registrado_por,
          tipos_sinistro(id, codigo, nome, descricao, acao_padrao),
          sinistro_fotos(id, foto_url, descricao, data_captura)
        `)
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false });

      // Buscar colaboradores da turma
      const { data: colaboradoresData } = await db
        .from('turma_colaboradores')
        .select(`
          id,
          colaborador:colaboradores(id, nome, cpf, foto_url, matricula)
        `)
        .eq('turma_id', turmaId);

      // Mapear colaboradores por turma_colaborador_id
      const colaboradoresMap: Record<string, any> = {};
      (colaboradoresData || []).forEach((c: any) => {
        colaboradoresMap[c.id] = c.colaborador;
      });

      // Buscar nomes dos instrutores que registraram
      const registradoPorIds = [...new Set((sinistrosData || []).map((s: any) => s.registrado_por).filter(Boolean))];
      const instrutoresMap: Record<string, { nome: string; email?: string }> = {};
      
      if (registradoPorIds.length > 0) {
        const { data: profilesData } = await db
          .from('profiles')
          .select('id, nome, email')
          .in('id', registradoPorIds);
        
        (profilesData || []).forEach((p: any) => {
          instrutoresMap[p.id] = { nome: p.nome, email: p.email };
        });
      }

      // Montar sinistros
      const sinistros: Sinistro[] = (sinistrosData || []).map((s: any) => ({
        id: s.id,
        turma_colaborador_id: s.turma_colaborador_id,
        tipo_sinistro_id: s.tipo_sinistro_id,
        tipo_sinistro: s.tipos_sinistro,
        acao: s.acao,
        descricao: s.descricao,
        fotos: s.sinistro_fotos || [],
        created_at: s.created_at,
        registrado_por: s.registrado_por,
        instrutor: s.registrado_por ? instrutoresMap[s.registrado_por] : undefined,
        colaborador: colaboradoresMap[s.turma_colaborador_id]
      }));

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
        sinistros
      });

    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  const getPaginas = () => {
    if (!dados) return [];
    
    const paginas: Array<{ id: string; nome: string; tipo: 'capa' | 'pagina' }> = [];
    
    // CAPA
    paginas.push({ id: 'capa', nome: 'Capa', tipo: 'capa' });
    
    // Índice
    paginas.push({ id: 'indice', nome: 'Índice', tipo: 'pagina' });
    
    // Resumo de sinistros
    paginas.push({ id: 'resumo-sinistros', nome: 'Resumo de Sinistros', tipo: 'pagina' });
    
    // Uma página por sinistro
    dados.sinistros.forEach((sinistro, idx) => {
      paginas.push({ 
        id: `sinistro-${idx}`, 
        nome: `Sinistro - ${sinistro.colaborador?.nome || 'Colaborador'}`, 
        tipo: 'pagina' 
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

      const nomeArquivo = `relatorio_sinistros_${dados.turma.codigo_turma}_${dados.treinamento.norma || 'treinamento'}.pdf`;
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

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';
    const nums = cpf.replace(/\D/g, '');
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando relatório de sinistros...</p>
        </div>
      </div>
    );
  }

  if (semPermissao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
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

  if (dados.sinistros.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Nenhum Sinistro Registrado</h2>
          <p className="text-slate-600 mb-6">
            Esta turma não possui sinistros registrados. Isso é uma boa notícia!
          </p>
          <Button onClick={handleVoltar} variant="outline">
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

  const estilos = {
    pagina: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, fontFamily: '"Segoe UI", system-ui, sans-serif', background: '#fff' },
    header: { background: '#7f1d1d', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTexto: { color: '#fff', fontSize: '14px', fontWeight: '500' as const },
    titulo: { background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '20px 32px' },
    tituloH2: { fontSize: '24px', fontWeight: '600' as const, color: '#7f1d1d', margin: 0 },
    subtitulo: { fontSize: '13px', color: '#991b1b', marginTop: '4px' },
    conteudo: { flex: 1, padding: '24px 32px', overflow: 'hidden' as const },
    label: { fontSize: '10px', fontWeight: '600' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' },
    valor: { fontSize: '14px', color: '#1e293b', fontWeight: '500' as const },
    card: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' },
  };

  const Header = () => (
    <div style={estilos.header}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...estilos.headerTexto, fontSize: '14px', fontWeight: '600' }}>{dados.empresaSst.nome}</span>
        <span style={{ ...estilos.headerTexto, fontSize: '10px', opacity: 0.8 }}>CNPJ: {dados.empresaSst.cnpj || '-'}</span>
      </div>
      <span style={estilos.headerTexto}>{dados.turma.codigo_turma}</span>
    </div>
  );

  const Rodape = () => (
    <div style={{ 
      background: '#7f1d1d',
      padding: '10px 24px',
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      minHeight: '48px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '10px' }}>
        <span style={{ fontWeight: '600', color: '#fff' }}>{dados.empresaSst.nome}</span>
        {dados.empresaSst.email && <><span style={{ color: '#991b1b' }}>|</span><span>{dados.empresaSst.email}</span></>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fca5a5', fontSize: '10px' }}>
        <span style={{ color: '#fecaca' }}>{paginaAtualData?.nome || 'Página'}</span>
        <span style={{ background: '#991b1b', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#fff' }}>
          {paginaAtual + 1} / {paginas.length}
        </span>
      </div>
    </div>
  );

  const renderPagina = () => {
    const paginaId = paginaAtualData?.id || 'capa';

    // CAPA PRINCIPAL
    if (paginaId === 'capa') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' }}>
          <div style={{ padding: '32px', textAlign: 'center' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} crossOrigin="anonymous" /> : <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{dados.empresaSst.nome}</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <AlertTriangle style={{ width: '64px', height: '64px', color: '#fff', marginBottom: '24px', opacity: 0.9 }} />
            <h1 style={{ fontSize: '42px', fontWeight: '300', color: '#fff', textAlign: 'center', marginBottom: '12px', letterSpacing: '2px' }}>Relatório de Sinistros</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>Ocorrências Registradas na Turma</p>
            <div style={{ width: '80px', height: '3px', background: '#fff', marginTop: '24px', opacity: 0.5 }} />
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px 24px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>{dados.sinistros.length}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Sinistro{dados.sinistros.length > 1 ? 's' : ''}</div>
              </div>
            </div>
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

    // ÍNDICE
    if (paginaId === 'indice') {
      const secoes = [
        { nome: 'Resumo de Sinistros', pagina: 3 },
        ...dados.sinistros.map((sinistro, idx) => ({
          nome: `Sinistro - ${sinistro.colaborador?.nome || 'Colaborador'}`,
          pagina: 4 + idx
        }))
      ];

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Índice</h2>
            <p style={estilos.subtitulo}>Sumário do relatório de sinistros</p>
          </div>
          <div style={estilos.conteudo}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '2px solid #7f1d1d', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', textTransform: 'uppercase' }}>Seção</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '2px solid #7f1d1d', fontSize: '12px', fontWeight: '600', color: '#7f1d1d', width: '100px' }}>Página</th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((secao, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #fecaca', fontSize: '14px', color: '#374151', fontWeight: '500' }}>{secao.nome}</td>
                    <td style={{ padding: '14px 0', borderBottom: '1px solid #fecaca', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#991b1b', fontFamily: 'monospace' }}>{secao.pagina}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '24px', padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{dados.sinistros.length}</div>
                  <div style={{ fontSize: '11px', color: '#991b1b' }}>Sinistros</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{new Set(dados.sinistros.map(s => s.turma_colaborador_id)).size}</div>
                  <div style={{ fontSize: '11px', color: '#991b1b' }}>Colaboradores</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{paginas.length}</div>
                  <div style={{ fontSize: '11px', color: '#991b1b' }}>Total de Páginas</div>
                </div>
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      );
    }

    // RESUMO DE SINISTROS
    if (paginaId === 'resumo-sinistros') {
      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Resumo de Sinistros</h2>
            <p style={estilos.subtitulo}>Visão geral das ocorrências registradas</p>
          </div>
          <div style={estilos.conteudo}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>#</th>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Colaborador</th>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>CPF</th>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Motivo</th>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Ação</th>
                  <th style={{ background: '#fef2f2', padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#7f1d1d', borderBottom: '2px solid #fecaca' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.sinistros.map((sinistro, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fef2f2' }}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', color: '#991b1b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', fontWeight: '500', color: '#7f1d1d' }}>{sinistro.colaborador?.nome || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', fontFamily: 'monospace', fontSize: '10px', color: '#991b1b' }}>{formatarCPF(sinistro.colaborador?.cpf || '')}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', color: '#374151' }}>{sinistro.tipo_sinistro?.nome || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', textAlign: 'center' }}>
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '10px' }}>
                        {sinistro.acao === 'reprovacao' ? 'Reprovação' : sinistro.acao}
                      </span>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #fecaca', textAlign: 'center', fontSize: '10px', color: '#991b1b' }}>
                      {format(parseISO(sinistro.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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

    // PÁGINA DE SINISTRO INDIVIDUAL
    if (paginaId.startsWith('sinistro-')) {
      const sinistroIdx = parseInt(paginaId.split('-')[1]);
      const sinistro = dados.sinistros[sinistroIdx];
      
      if (!sinistro) return null;

      return (
        <div style={estilos.pagina}>
          <Header />
          <div style={estilos.titulo}>
            <h2 style={estilos.tituloH2}>Detalhes do Sinistro</h2>
            <p style={estilos.subtitulo}>Ocorrência #{sinistroIdx + 1} - {format(parseISO(sinistro.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          <div style={estilos.conteudo}>
            {/* Info do sinistro */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ ...estilos.card, background: '#fef2f2', borderColor: '#fecaca' }}>
                <p style={{ ...estilos.label, color: '#991b1b' }}>Motivo do Sinistro</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#7f1d1d', margin: 0 }}>{sinistro.tipo_sinistro?.nome || 'Não especificado'}</p>
              </div>
              <div style={{ ...estilos.card, background: '#fee2e2', borderColor: '#fca5a5' }}>
                <p style={{ ...estilos.label, color: '#991b1b' }}>Ação Aplicada</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', margin: 0 }}>
                  {sinistro.acao === 'reprovacao' ? 'REPROVAÇÃO' : sinistro.acao.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Descrição */}
            {sinistro.descricao && (
              <div style={{ ...estilos.card, marginBottom: '20px', background: '#fef2f2', borderColor: '#fecaca' }}>
                <p style={{ ...estilos.label, color: '#991b1b' }}>Descrição da Ocorrência</p>
                <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{sinistro.descricao}</p>
              </div>
            )}

            {/* Colaborador e Instrutor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Colaborador */}
              <div style={estilos.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <User style={{ width: '16px', height: '16px', color: '#64748b' }} />
                  <p style={{ ...estilos.label, margin: 0 }}>Colaborador</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {sinistro.colaborador?.foto_url ? (
                    <img src={sinistro.colaborador.foto_url} alt="Foto" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #fecaca' }} crossOrigin="anonymous" />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: '700' }}>
                      {sinistro.colaborador?.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{sinistro.colaborador?.nome || '-'}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0', fontFamily: 'monospace' }}>CPF: {formatarCPF(sinistro.colaborador?.cpf || '')}</p>
                    {sinistro.colaborador?.matricula && (
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>Matrícula: {sinistro.colaborador.matricula}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Instrutor */}
              <div style={estilos.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <GraduationCap style={{ width: '16px', height: '16px', color: '#64748b' }} />
                  <p style={{ ...estilos.label, margin: 0 }}>Registrado por</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{sinistro.instrutor?.nome || 'Não identificado'}</p>
                {sinistro.instrutor?.email && (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>{sinistro.instrutor.email}</p>
                )}
              </div>
            </div>

            {/* Fotos do sinistro */}
            {sinistro.fotos && sinistro.fotos.length > 0 && (
              <div style={estilos.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Camera style={{ width: '16px', height: '16px', color: '#64748b' }} />
                  <p style={{ ...estilos.label, margin: 0 }}>Fotos Anexadas ({sinistro.fotos.length})</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {sinistro.fotos.map((foto, fotoIdx) => (
                    <div key={foto.id}>
                      <div style={{ aspectRatio: '4/3', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '2px solid #fecaca' }}>
                        <img src={foto.foto_url} alt={`Foto ${fotoIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      </div>
                      {foto.descricao && (
                        <p style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>{foto.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info da turma */}
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
      <div className="bg-white border-b shadow-sm print:hidden sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleVoltar}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Relatório de Sinistros
                </h1>
                <p className="text-sm text-slate-500">
                  {dados.turma.codigo_turma} - {dados.treinamento.nome}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
                  className="h-9 px-3 py-1 text-sm border rounded-md bg-white text-slate-700 min-w-[180px] cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="bg-red-600 hover:bg-red-700"
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

        <div className="print:hidden mt-6 text-center text-sm text-slate-500">
          <p>Página: {paginaAtualData?.nome || 'Capa'}</p>
          <p>Dimensões: A4 Retrato (794px × 1123px)</p>
        </div>
      </div>

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
              Relatório de Sinistros Validado
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
