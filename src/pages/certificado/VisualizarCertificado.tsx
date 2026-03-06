import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Printer, CheckCircle, ChevronLeft, ChevronRight, PlayCircle, RefreshCw, Shield, ImageOff, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, parseISO, addYears, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { assinarPdfComIcpBrasil, blobToBase64, base64ToBlob } from '@/services/pdfSignatureService';
import JSZip from 'jszip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileArchive, ChevronDown } from 'lucide-react';

const db = supabase as any;

function validadeParaMeses(validade: string | null | undefined): number {
  if (!validade) return 12;
  const v = validade.toLowerCase().trim();
  if (v === 'semestral') return 6;
  if (v === 'anual') return 12;
  if (v === 'bienal') return 24;
  if (v === 'trienal') return 36;
  const parsed = parseInt(validade);
  if (!isNaN(parsed)) return parsed;
  return 12;
}

interface Assinatura {
  nome: string;
  cargo: string;
  formacao: string;
  registro: string;
  assinatura_url?: string | null;
}

interface AssinaturaCompleta {
  nome: string;
  cargo: string;
  formacao: string;
  registro_tipo: string;
  registro_numero: string;
  registro_estado: string;
  assinatura_url: string | null;
}

interface DadosCertificado {
  colaborador: {
    nome: string;
    cpf: string;
    empresa_nome: string;
    empresa_endereco: string;
    empresa_cidade: string;
    empresa_estado: string;
  };
  treinamento: {
    nome: string;
    norma: string;
    carga_horaria: number;
    conteudo_programatico: string;
    validade_meses: number;
  };
  turma: {
    data_inicio: string;
    data_fim: string;
    todas_datas: string[];
    instrutor_nome: string;
    tipo_treinamento: string;
    local_treinamento: string;
    carga_horaria_total: number | null;
    codigo_turma: string;
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
  empresa_sst: {
    nome: string;
    endereco: string;
    logo_url?: string | null;
    cidade?: string;
    cnpj?: string;
  };
  colaborador_assinatura?: string | null;
  assinaturas: Assinatura[];
  diretor_tecnico: AssinaturaCompleta | null;
  instrutor_assinatura: AssinaturaCompleta | null;
  modelo: {
    id: string;
    nome: string;
    largura: number;
    altura: number;
    paginas: Array<{
      id: string;
      numero: number;
      nome: string;
      conteudo: string;
      moldura_url: string | null;
      justify_content?: string;
      align_items?: string;
      flex_direction?: string;
      padding?: number;
      text_align?: string;
      blocos?: Array<{
        id: string;
        ordem: number;
        nome: string;
        conteudo: string;
        largura?: string;
        altura?: string;
        justify_content?: string;
        align_items?: string;
        text_align?: string;
        padding?: number;
        margin_top?: number;
        margin_bottom?: number;
        font_size?: number;
        font_weight?: string;
        background_color?: string;
        border?: boolean;
        border_radius?: number;
      }>;
    }>;
  } | null;
}

export default function VisualizarCertificado() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { setCurrentScreen } = useCurrentScreen();
  const turmaId = searchParams.get('turmaId');
  const colaboradorId = searchParams.get('colaboradorId');
  const colaboradoresParam = searchParams.get('colaboradores'); // Lista de IDs separados por vírgula
  
  // Registrar tela atual para o widget de suporte
  useEffect(() => {
    setCurrentScreen('visualizar-certificado', 'sst');
  }, [setCurrentScreen]);
  
  // Apenas empresa_sst, instrutor e admin_vertical podem validar certificados
  const canValidate = profile?.role === 'empresa_sst' || profile?.role === 'instrutor' || profile?.role === 'admin_vertical';
  
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<DadosCertificado | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [certificadoValidado, setCertificadoValidado] = useState(false);
  const [turmaFinalizada, setTurmaFinalizada] = useState(false);
  
  // Estados para múltiplos colaboradores
  const [colaboradoresIds, setColaboradoresIds] = useState<string[]>([]);
  const [colaboradorAtualIndex, setColaboradorAtualIndex] = useState(0);
  const [validandoTodos, setValidandoTodos] = useState(false);
  const [progressoValidacao, setProgressoValidacao] = useState(0);
  const [certificadosValidadosLote, setCertificadosValidadosLote] = useState<string[]>([]);
  
  const certificadoRef = useRef<HTMLDivElement>(null);
  const [revalidarDialogOpen, setRevalidarDialogOpen] = useState(false);
  const [ocultarMoldura, setOcultarMoldura] = useState(false);

  // Colaborador atual baseado no índice ou no parâmetro único
  const colaboradorAtualId = colaboradoresIds.length > 0 
    ? colaboradoresIds[colaboradorAtualIndex] 
    : colaboradorId;

  const handleVoltar = () => {
    // Se abriu em nova aba (sem histórico), navegar para a turma ou fechar
    if (window.history.length <= 2 && turmaId) {
      // Aberto em nova aba - navegar para a turma
      navigate(`/modulos/gestao-turmas/${turmaId}`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/sst');
    }
  };

  // Inicializar lista de colaboradores
  useEffect(() => {
    if (colaboradoresParam) {
      const ids = colaboradoresParam.split(',').filter(id => id.trim());
      setColaboradoresIds(ids);
      setColaboradorAtualIndex(0);
    } else if (colaboradorId) {
      setColaboradoresIds([colaboradorId]);
    }
  }, [colaboradoresParam, colaboradorId]);

  useEffect(() => {
    if (turmaId && colaboradorAtualId) {
      fetchDadosCertificado();
      verificarCertificadoValidado();
      verificarTurmaFinalizada();
    }
  }, [turmaId, colaboradorAtualId]);

  // Verificar se o certificado já foi validado e se tem assinatura ICP-Brasil
  const [assinadoIcpBrasil, setAssinadoIcpBrasil] = useState(false);
  const [icpBrasilCn, setIcpBrasilCn] = useState<string>('');
  
  const verificarCertificadoValidado = async () => {
    if (!turmaId || !colaboradorAtualId) return;
    
    const { data } = await db
      .from('colaboradores_certificados')
      .select('id, arquivo_url, observacoes')
      .eq('colaborador_id', colaboradorAtualId)
      .eq('turma_id', turmaId)
      .maybeSingle();
    
    setCertificadoValidado(!!data);
    const temIcp = !!data?.observacoes?.includes('ICP-Brasil');
    setAssinadoIcpBrasil(temIcp);
    if (temIcp && data?.observacoes) {
      const match = data.observacoes.match(/Assinado ICP-Brasil:\s*(.+?)(?:\s*\||$)/);
      setIcpBrasilCn(match?.[1]?.trim() || 'Certificado A1');
    } else {
      setIcpBrasilCn('');
    }
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

  // Função para validar e salvar o certificado
  const handleValidarCertificado = async () => {
    if (!certificadoRef.current || !dados) return;

    try {
      setValidando(true);
      
      // Gerar PDF com frente e verso - usando JPEG comprimido para reduzir tamanho
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1123, 794],
        compress: true
      });

      // Página 1 - Frente
      setPaginaAtual(0);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvasFrente = await html2canvas(certificadoRef.current, {
        scale: 1.5, // Reduzido de 2 para 1.5 para menor tamanho
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Usar JPEG com qualidade 0.8 ao invés de PNG para compressão
      const imgFrente = canvasFrente.toDataURL('image/jpeg', 0.8);
      pdf.addImage(imgFrente, 'JPEG', 0, 0, 1123, 794, undefined, 'FAST');

      // Página 2 - Verso
      setPaginaAtual(1);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvasVerso = await html2canvas(certificadoRef.current, {
        scale: 1.5, // Reduzido de 2 para 1.5 para menor tamanho
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Usar JPEG com qualidade 0.8 ao invés de PNG para compressão
      const imgVerso = canvasVerso.toDataURL('image/jpeg', 0.8);
      pdf.addPage([1123, 794]);
      pdf.addImage(imgVerso, 'JPEG', 0, 0, 1123, 794, undefined, 'FAST');

      // Converter PDF para blob
      let pdfBlob = pdf.output('blob');
      let assinadoComIcpBrasil = false;
      let certificadoIcpInfo: { cn: string; emissor: string; serialNumber: string } | null = null;
      let codigoDocumentoIcp: string | undefined;
      let hashDocumentoIcp: string | undefined;
      
      // Tentar assinar com certificado ICP-Brasil A1 da empresa
      try {
        const pdfBase64 = await blobToBase64(pdfBlob);
        const documentoTipo = `Certificado NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`;
        
        // Buscar empresa_id da turma para assinar com o certificado correto
        const { data: turmaEmpresa } = await db
          .from('turmas_treinamento')
          .select('empresa_id')
          .eq('id', turmaId)
          .single();
        
        if (turmaEmpresa?.empresa_id) {
          const resultadoAssinatura = await assinarPdfComIcpBrasil(
            pdfBase64,
            turmaEmpresa.empresa_id,
            documentoTipo,
            `Certificado de Treinamento ${dados.treinamento.norma} - ${dados.colaborador.nome}`
          );
          
          if (resultadoAssinatura.success && resultadoAssinatura.pdfAssinadoBase64) {
            pdfBlob = base64ToBlob(resultadoAssinatura.pdfAssinadoBase64);
            assinadoComIcpBrasil = true;
            certificadoIcpInfo = resultadoAssinatura.certificadoInfo || null;
            codigoDocumentoIcp = resultadoAssinatura.codigoDocumento;
            hashDocumentoIcp = resultadoAssinatura.hashDocumento;
            console.log('PDF assinado com certificado ICP-Brasil:', certificadoIcpInfo?.cn, 'Codigo:', codigoDocumentoIcp);
          } else {
            console.log('Certificado não assinado com ICP-Brasil:', resultadoAssinatura.error || 'Empresa sem certificado configurado');
          }
        }
      } catch (assinaturaError) {
        console.warn('Não foi possível assinar com ICP-Brasil, continuando sem assinatura digital:', assinaturaError);
      }
      
      // Nome do arquivo - remover acentos e caracteres especiais
      const nomeNormalizado = dados.colaborador.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      const sufixoAssinatura = assinadoComIcpBrasil ? '_ICP' : '';
      const nomeArquivo = `certificado_${nomeNormalizado}_${dados.treinamento.norma}${sufixoAssinatura}_${Date.now()}.pdf`;
      const arquivoPath = `${colaboradorId}/${nomeArquivo}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('certificados-colaboradores')
        .upload(arquivoPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('certificados-colaboradores')
        .getPublicUrl(arquivoPath);

      // Calcular data de validade baseada na data fim da turma + validade do treinamento
      const dataEmissao = new Date();
      const dataFimTurma = dados.turma.data_fim ? parseISO(dados.turma.data_fim) : dataEmissao;
      const validadeMeses = dados.treinamento.validade_meses || 12;
      const dataValidade = addMonths(dataFimTurma, validadeMeses);

      // Verificar se já existe um certificado para este colaborador/turma (para substituir)
      const { data: existingCertificado } = await db
        .from('colaboradores_certificados')
        .select('id')
        .eq('colaborador_id', colaboradorAtualId)
        .eq('turma_id', turmaId)
        .maybeSingle();

      if (existingCertificado) {
        // Atualizar o existente
        const { error: updateError } = await db
          .from('colaboradores_certificados')
          .update({
            nome: `Certificado NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            arquivo_url: urlData.publicUrl,
            arquivo_path: arquivoPath,
            data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
            data_validade: format(dataValidade, 'yyyy-MM-dd'),
            observacoes: `Tipo: ${dados.turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação'}${assinadoComIcpBrasil ? ' | Assinado ICP-Brasil: ' + (certificadoIcpInfo?.cn || 'A1') + (codigoDocumentoIcp ? ' | Codigo: ' + codigoDocumentoIcp : '') + (hashDocumentoIcp ? ' | Hash: ' + hashDocumentoIcp : '') : ''} | Atualizado em ${format(dataEmissao, 'dd/MM/yyyy HH:mm')}`
          })
          .eq('id', existingCertificado.id);

        if (updateError) throw updateError;
      } else {
        // Inserir novo
        const { error: insertError } = await db
          .from('colaboradores_certificados')
          .insert({
            colaborador_id: colaboradorAtualId,
            turma_id: turmaId,
            nome: `Certificado NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`,
            arquivo_url: urlData.publicUrl,
            arquivo_path: arquivoPath,
            data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
            data_validade: format(dataValidade, 'yyyy-MM-dd'),
            observacoes: `Tipo: ${dados.turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' : 'Formação'}${assinadoComIcpBrasil ? ' | Assinado ICP-Brasil: ' + (certificadoIcpInfo?.cn || 'A1') + (codigoDocumentoIcp ? ' | Codigo: ' + codigoDocumentoIcp : '') + (hashDocumentoIcp ? ' | Hash: ' + hashDocumentoIcp : '') : ''}`
          });

        if (insertError) throw insertError;
      }

      setCertificadoValidado(true);
      setCertificadosValidadosLote(prev => [...prev, colaboradorAtualId!]);
      setPaginaAtual(0);
      
      if (assinadoComIcpBrasil) {
        toast.success(`Certificado validado com assinatura digital ICP-Brasil! (${certificadoIcpInfo?.cn || 'Certificado A1'})`);
      } else {
        toast.success('Certificado validado e arquivado com sucesso!');
      }
      
    } catch (error: any) {
      console.error('Erro ao validar certificado:', error);
      toast.error('Erro ao validar certificado: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setValidando(false);
      setPaginaAtual(0);
    }
  };

  // Estado para controlar o índice durante validação em lote
  const [loteEmAndamento, setLoteEmAndamento] = useState(false);
  const [loteIndiceAtual, setLoteIndiceAtual] = useState(0);
  const [loteTotalValidados, setLoteTotalValidados] = useState(0);
  const [loteTotalErros, setLoteTotalErros] = useState(0);

  // Função para buscar dados de um colaborador específico
  const buscarDadosColaborador = async (colabId: string): Promise<DadosCertificado | null> => {
    try {
      // Buscar dados da turma
      const { data: turmaData } = await db
        .from('turmas_treinamento')
        .select('id, treinamento_id, cliente_id, instrutor_id, empresa_id, tipo_treinamento, carga_horaria_total, codigo_turma')
        .eq('id', turmaId)
        .single();

      if (!turmaData) return null;

      // Buscar aulas
      const { data: aulasData } = await db
        .from('turmas_treinamento_aulas')
        .select('data')
        .eq('turma_id', turmaId)
        .order('data');

      const datasOrdenadas = (aulasData || []).map((a: any) => a.data).filter(Boolean).sort();
      const dataInicio = datasOrdenadas[0] || '';
      const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

      // Buscar colaborador
      const { data: colaboradorData } = await db
        .from('colaboradores')
        .select('nome, cpf')
        .eq('id', colabId)
        .single();

      if (!colaboradorData) return null;

      // Buscar assinatura
      const { data: turmaColabData } = await db
        .from('turma_colaboradores')
        .select('assinatura_certificado')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colabId)
        .single();

      // Buscar cliente
      const { data: clienteData } = await db
        .from('clientes_sst')
        .select('nome, cliente_empresa_id')
        .eq('id', turmaData.cliente_id)
        .single();

      // Buscar empresa do cliente
      let empresaCidade = '', empresaEstado = '', empresaEndereco = '';
      if (clienteData?.cliente_empresa_id) {
        const { data: empresaData } = await db
          .from('empresas')
          .select('cidade, estado, endereco, numero, bairro, cep')
          .eq('id', clienteData.cliente_empresa_id)
          .single();
        if (empresaData) {
          empresaCidade = empresaData.cidade || '';
          empresaEstado = empresaData.estado || '';
          // Montar endereço completo: Rua, Número - Bairro, Cidade/Estado
          const enderecoBase = empresaData.endereco?.replace(/,\s*$/, '') || ''; // Remove vírgula final
          const enderecoComNumero = empresaData.numero ? `${enderecoBase}, ${empresaData.numero}` : enderecoBase;
          const enderecoComBairro = empresaData.bairro ? `${enderecoComNumero} - ${empresaData.bairro}` : enderecoComNumero;
          const cidadeEstado = [empresaData.cidade, empresaData.estado].filter(Boolean).join('/');
          empresaEndereco = cidadeEstado ? `${enderecoComBairro}, ${cidadeEstado}` : enderecoComBairro;
        }
      }

      // Buscar treinamento
      const { data: treinamentoData } = await db
        .from('catalogo_treinamentos')
        .select('nome, norma, ch_formacao, ch_reciclagem, validade, conteudo_programatico')
        .eq('id', turmaData.treinamento_id)
        .single();

      // Buscar instrutor
      let instrutorNome = '';
      if (turmaData.instrutor_id) {
        const { data: instrutorData } = await db
          .from('instrutores')
          .select('nome')
          .eq('id', turmaData.instrutor_id)
          .single();
        instrutorNome = instrutorData?.nome || '';
      }

      // Buscar empresa SST
      let empresaSSTNome = '', empresaSSTLogo = '', empresaSSTCidade = '';
      if (turmaData.empresa_id) {
        const { data: empresaSSTData } = await db
          .from('empresas')
          .select('nome, cidade, logo_url')
          .eq('id', turmaData.empresa_id)
          .single();
        if (empresaSSTData) {
          empresaSSTNome = empresaSSTData.nome || '';
          empresaSSTLogo = empresaSSTData.logo_url || '';
          empresaSSTCidade = empresaSSTData.cidade || '';
        }
        const { data: infoEmpresa } = await db
          .from('informacoes_empresa')
          .select('logo_pequena_url')
          .eq('empresa_id', turmaData.empresa_id)
          .maybeSingle();
        if (infoEmpresa?.logo_pequena_url) empresaSSTLogo = infoEmpresa.logo_pequena_url;
      }

      // Buscar modelo de certificado
      const { data: modelosData } = await db
        .from('modelo_relatorios')
        .select(`id, nome, largura, altura, selecao_treinamento, treinamentos:modelo_relatorio_treinamentos(treinamento_id), paginas:modelo_relatorio_paginas(*, blocos:modelo_relatorio_blocos(*))`)
        .eq('empresa_id', turmaData.empresa_id)
        .eq('tipo', 'certificado')
        .eq('ativo', true);

      let modeloAplicavel = null;
      let modeloTodos = null;
      if (modelosData && modelosData.length > 0) {
        for (const modelo of modelosData) {
          if (modelo.selecao_treinamento === 'individual') {
            const treinamentosIds = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
            if (treinamentosIds.includes(turmaData.treinamento_id)) {
              modeloAplicavel = modelo;
              break;
            }
          } else if (modelo.selecao_treinamento === 'todos_exceto') {
            const treinamentosExcluidos = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
            if (!treinamentosExcluidos.includes(turmaData.treinamento_id)) {
              if (!modeloAplicavel) modeloAplicavel = modelo;
            }
          } else if (modelo.selecao_treinamento === 'todos') {
            modeloTodos = modelo;
          }
        }
        if (!modeloAplicavel) modeloAplicavel = modeloTodos;
      }

      if (!modeloAplicavel) return null;

      const validadeMeses = validadeParaMeses(treinamentoData?.validade);
      const cargaHoraria = turmaData.tipo_treinamento === 'reciclagem' 
        ? (treinamentoData?.ch_reciclagem || 0) 
        : (treinamentoData?.ch_formacao || 0);

      const formatCPF = (cpf: string) => {
        const cleaned = cpf?.replace(/\D/g, '') || '';
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      };

      return {
        colaborador: {
          nome: colaboradorData.nome,
          cpf: formatCPF(colaboradorData.cpf),
          empresa_nome: clienteData?.nome || '',
          empresa_endereco: empresaEndereco,
          empresa_cidade: empresaCidade,
          empresa_estado: empresaEstado
        },
        treinamento: {
          nome: treinamentoData?.nome || '',
          norma: treinamentoData?.norma || '',
          carga_horaria: cargaHoraria,
          conteudo_programatico: treinamentoData?.conteudo_programatico || '',
          validade_meses: validadeMeses
        },
        turma: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          todas_datas: datasOrdenadas,
          instrutor_nome: instrutorNome,
          tipo_treinamento: turmaData.tipo_treinamento || 'formacao',
          local_treinamento: empresaEndereco,
          carga_horaria_total: turmaData.carga_horaria_total,
          codigo_turma: turmaData.codigo_turma || ''
        },
        empresa_sst: {
          nome: empresaSSTNome,
          endereco: '',
          logo_url: empresaSSTLogo,
          cidade: empresaSSTCidade
        },
        colaborador_assinatura: turmaColabData?.assinatura_certificado || null,
        assinaturas: [],
        diretor_tecnico: null,
        instrutor_assinatura: null,
        modelo: {
          id: modeloAplicavel.id,
          nome: modeloAplicavel.nome,
          largura: modeloAplicavel.largura || 1123,
          altura: modeloAplicavel.altura || 794,
          paginas: (modeloAplicavel.paginas || []).sort((a: any, b: any) => a.numero - b.numero)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      return null;
    }
  };

  // Função para validar todos - SÍNCRONA, um a um
  const handleValidarTodos = async () => {
    if (colaboradoresIds.length === 0) return;
    
    // Reset safety: garantir que validando não está preso de operação anterior
    setValidando(false);
    setValidandoTodos(true);
    setProgressoValidacao(0);
    setCertificadosValidadosLote([]);
    setLoteEmAndamento(true);
    setLoteTotalValidados(0);
    setLoteTotalErros(0);
    
    let validados = 0;
    let erros = 0;
    
    for (let i = 0; i < colaboradoresIds.length; i++) {
      const colabId = colaboradoresIds[i];
      
      // Atualizar UI
      setColaboradorAtualIndex(i);
      setLoteIndiceAtual(i);
      setProgressoValidacao((i / colaboradoresIds.length) * 100);
      
      try {
        console.log(`[${i + 1}/${colaboradoresIds.length}] Buscando dados para:`, colabId);
        
        // 1. BUSCAR DADOS DO COLABORADOR
        const dadosColab = await buscarDadosColaborador(colabId);
        if (!dadosColab) {
          console.error('Dados não encontrados para:', colabId);
          erros++;
          setLoteTotalErros(erros);
          continue;
        }
        
        console.log(`[${i + 1}/${colaboradoresIds.length}] Dados carregados:`, dadosColab.colaborador.nome);
        
        // Atualizar dados na tela para visualização
        setDados(dadosColab);
        setPaginaAtual(0);
        await new Promise(r => setTimeout(r, 500));
        
        // 2. GERAR PDF
        const numPaginas = dadosColab.modelo?.paginas?.length || 2;
        const largura = dadosColab.modelo?.largura || 1123;
        const altura = dadosColab.modelo?.altura || 794;
        
        const pdf = new jsPDF({
          orientation: largura > altura ? 'landscape' : 'portrait',
          unit: 'px',
          format: [largura, altura],
          compress: true
        });
        
        // Gerar FRENTE (página 0)
        console.log(`[${i + 1}/${colaboradoresIds.length}] Gerando frente...`);
        setPaginaAtual(0);
        await new Promise(r => setTimeout(r, 1000));
        
        if (!certificadoRef.current) {
          throw new Error('Ref do certificado não disponível');
        }
        
        const canvasFrente = await html2canvas(certificadoRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        const imgFrente = canvasFrente.toDataURL('image/jpeg', 0.8);
        pdf.addImage(imgFrente, 'JPEG', 0, 0, largura, altura, undefined, 'FAST');
        
        // Gerar VERSO (página 1) se existir
        if (numPaginas > 1) {
          console.log(`[${i + 1}/${colaboradoresIds.length}] Gerando verso...`);
          setPaginaAtual(1);
          await new Promise(r => setTimeout(r, 1000));
          
          const canvasVerso = await html2canvas(certificadoRef.current, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          const imgVerso = canvasVerso.toDataURL('image/jpeg', 0.8);
          pdf.addPage([largura, altura]);
          pdf.addImage(imgVerso, 'JPEG', 0, 0, largura, altura, undefined, 'FAST');
        }
        
        // 3. GERAR BLOB DO PDF
        console.log(`[${i + 1}/${colaboradoresIds.length}] Gerando PDF...`);
        let pdfBlob = pdf.output('blob');
        let assinadoComIcpBrasil = false;
        let certificadoIcpInfo: { cn: string; emissor: string; serialNumber: string } | null = null;
        let codigoDocumentoLote: string | undefined;
        let hashDocumentoLote: string | undefined;
        
        // 3.5. TENTAR ASSINAR COM ICP-BRASIL
        try {
          const pdfBase64Lote = await blobToBase64(pdfBlob);
          const docTipo = `Certificado NR-${dadosColab.treinamento.norma} - ${dadosColab.treinamento.nome}`;
          
          const { data: turmaEmpresa } = await db
            .from('turmas_treinamento')
            .select('empresa_id')
            .eq('id', turmaId)
            .single();
          
          if (turmaEmpresa?.empresa_id) {
            const resultadoAssinatura = await assinarPdfComIcpBrasil(
              pdfBase64Lote,
              turmaEmpresa.empresa_id,
              docTipo,
              `Certificado de Treinamento ${dadosColab.treinamento.norma} - ${dadosColab.colaborador.nome}`
            );
            
            if (resultadoAssinatura.success && resultadoAssinatura.pdfAssinadoBase64) {
              pdfBlob = base64ToBlob(resultadoAssinatura.pdfAssinadoBase64);
              assinadoComIcpBrasil = true;
              certificadoIcpInfo = resultadoAssinatura.certificadoInfo || null;
              codigoDocumentoLote = resultadoAssinatura.codigoDocumento;
              hashDocumentoLote = resultadoAssinatura.hashDocumento;
              console.log(`[${i + 1}/${colaboradoresIds.length}] PDF assinado com ICP-Brasil:`, certificadoIcpInfo?.cn, 'Codigo:', codigoDocumentoLote);
            } else {
              console.log(`[${i + 1}/${colaboradoresIds.length}] Sem assinatura ICP-Brasil:`, resultadoAssinatura.error);
            }
          }
        } catch (assinaturaError) {
          console.warn(`[${i + 1}/${colaboradoresIds.length}] Não foi possível assinar com ICP-Brasil:`, assinaturaError);
        }
        
        // 4. FAZER UPLOAD
        const nomeNormalizado = dadosColab.colaborador.nome
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        const sufixoIcp = assinadoComIcpBrasil ? '_ICP' : '';
        const nomeArquivo = `certificado_${nomeNormalizado}_${dadosColab.treinamento.norma}${sufixoIcp}_${Date.now()}.pdf`;
        const arquivoPath = `${colabId}/${nomeArquivo}`;
        
        console.log(`[${i + 1}/${colaboradoresIds.length}] Fazendo upload...`);
        const { error: uploadError } = await db.storage
          .from('certificados-colaboradores')
          .upload(arquivoPath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) {
          throw new Error('Erro no upload: ' + uploadError.message);
        }
        
        // 5. OBTER URL PÚBLICA
        const { data: urlData } = db.storage
          .from('certificados-colaboradores')
          .getPublicUrl(arquivoPath);
        
        console.log(`[${i + 1}/${colaboradoresIds.length}] URL:`, urlData.publicUrl);
        
        // 6. SALVAR NO BANCO
        const dataEmissao = new Date();
        const dataFimTurma = dadosColab.turma.data_fim ? parseISO(dadosColab.turma.data_fim) : dataEmissao;
        const dataValidade = addMonths(dataFimTurma, dadosColab.treinamento.validade_meses || 12);
        const obsAssinatura = assinadoComIcpBrasil 
          ? ` | Assinado ICP-Brasil: ${certificadoIcpInfo?.cn || 'A1'}${codigoDocumentoLote ? ' | Codigo: ' + codigoDocumentoLote : ''}${hashDocumentoLote ? ' | Hash: ' + hashDocumentoLote : ''}`
          : '';
        
        const { data: existingCert } = await db
          .from('colaboradores_certificados')
          .select('id')
          .eq('colaborador_id', colabId)
          .eq('turma_id', turmaId)
          .maybeSingle();
        
        if (existingCert) {
          await db
            .from('colaboradores_certificados')
            .update({
              nome: `Certificado NR-${dadosColab.treinamento.norma} - ${dadosColab.treinamento.nome}`,
              arquivo_url: urlData.publicUrl,
              arquivo_path: arquivoPath,
              data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
              data_validade: format(dataValidade, 'yyyy-MM-dd'),
              observacoes: `Gerado em lote em ${format(dataEmissao, 'dd/MM/yyyy HH:mm')}${obsAssinatura}`
            })
            .eq('id', existingCert.id);
        } else {
          await db
            .from('colaboradores_certificados')
            .insert({
              colaborador_id: colabId,
              turma_id: turmaId,
              nome: `Certificado NR-${dadosColab.treinamento.norma} - ${dadosColab.treinamento.nome}`,
              arquivo_url: urlData.publicUrl,
              arquivo_path: arquivoPath,
              data_emissao: format(dataEmissao, 'yyyy-MM-dd'),
              data_validade: format(dataValidade, 'yyyy-MM-dd'),
              observacoes: `Gerado em lote em ${format(dataEmissao, 'dd/MM/yyyy HH:mm')}${obsAssinatura}`
            });
        }
        
        console.log(`[${i + 1}/${colaboradoresIds.length}] ✓ Certificado salvo com sucesso!`);
        validados++;
        setLoteTotalValidados(validados);
        setCertificadosValidadosLote(prev => [...prev, colabId]);
        setProgressoValidacao(((i + 1) / colaboradoresIds.length) * 100);
        
      } catch (error: any) {
        console.error(`[${i + 1}/${colaboradoresIds.length}] ✗ Erro:`, error?.message || error);
        erros++;
        setLoteTotalErros(erros);
      }
      
      // Pequena pausa antes do próximo
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Finalizar
    setValidandoTodos(false);
    setLoteEmAndamento(false);
    setPaginaAtual(0);
    
    if (erros === 0) {
      toast.success(`${validados} certificado(s) validado(s) com sucesso!`);
    } else {
      toast.warning(`${validados} validado(s), ${erros} erro(s)`);
    }
  };

  // Navegação entre colaboradores
  const handleProximoColaborador = () => {
    if (colaboradorAtualIndex < colaboradoresIds.length - 1) {
      setColaboradorAtualIndex(prev => prev + 1);
      setPaginaAtual(0);
      setCertificadoValidado(false);
    }
  };

  const handleColaboradorAnterior = () => {
    if (colaboradorAtualIndex > 0) {
      setColaboradorAtualIndex(prev => prev - 1);
      setPaginaAtual(0);
      setCertificadoValidado(false);
    }
  };

  const fetchDadosCertificado = async () => {
    try {
      setLoading(true);

      // Buscar dados da turma
      const { data: turmaData, error: turmaError } = await db
        .from('turmas_treinamento')
        .select(`
          id,
          treinamento_id,
          cliente_id,
          instrutor_id,
          empresa_id,
          tipo_treinamento,
          carga_horaria_total,
          codigo_turma,
          created_at,
          categorizacao_tecnica
        `)
        .eq('id', turmaId)
        .single();

      if (turmaError) throw turmaError;

      // Buscar aulas da turma para pegar as datas
      const { data: aulasData } = await db
        .from('turmas_treinamento_aulas')
        .select('data')
        .eq('turma_id', turmaId)
        .order('data');

      let datasOrdenadas = (aulasData || []).map((a: any) => a.data).filter(Boolean).sort();
      
      // Se não há aulas cadastradas, usar a data de criação da turma como fallback
      if (datasOrdenadas.length === 0 && turmaData.created_at) {
        const dataCriacao = turmaData.created_at.split('T')[0]; // Pegar apenas a data (YYYY-MM-DD)
        datasOrdenadas = [dataCriacao];
      }
      
      const dataInicio = datasOrdenadas[0] || '';
      const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;
      const todasDatas = datasOrdenadas; // Todas as datas do treinamento
      // Local vem da turma (campo local_treinamento), não das aulas
      const localTreinamento = turmaData.local_treinamento || turmaData.local || '';

      // Buscar dados do colaborador
      const { data: colaboradorData, error: colaboradorError } = await db
        .from('colaboradores')
        .select('nome, cpf')
        .eq('id', colaboradorAtualId)
        .single();

      if (colaboradorError) throw colaboradorError;

      // Buscar assinatura do certificado do colaborador na turma
      let colaboradorAssinatura: string | null = null;
      const { data: turmaColaboradorData } = await db
        .from('turma_colaboradores')
        .select('assinatura_certificado')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorAtualId)
        .single();
      
      if (turmaColaboradorData?.assinatura_certificado) {
        colaboradorAssinatura = turmaColaboradorData.assinatura_certificado;
      }

      // Buscar dados do cliente (empresa do colaborador) através da turma
      const { data: clienteData } = await db
        .from('clientes_sst')
        .select('nome, cliente_empresa_id')
        .eq('id', turmaData.cliente_id)
        .single();

      // Buscar endereço da empresa do cliente
      let empresaEndereco = '';
      let empresaCidade = '';
      let empresaEstado = '';
      if (clienteData?.cliente_empresa_id) {
        const { data: empresaData } = await db
          .from('empresas')
          .select('endereco, numero, bairro, cidade, estado, cep')
          .eq('id', clienteData.cliente_empresa_id)
          .single();
        
        if (empresaData) {
          empresaCidade = empresaData.cidade || '';
          empresaEstado = empresaData.estado || '';
          
          // Montar endereço completo: Rua, Número - Bairro, Cidade/Estado
          const enderecoBase = empresaData.endereco?.replace(/,\s*$/, '') || ''; // Remove vírgula final
          const enderecoComNumero = empresaData.numero ? `${enderecoBase}, ${empresaData.numero}` : enderecoBase;
          const enderecoComBairro = empresaData.bairro ? `${enderecoComNumero} - ${empresaData.bairro}` : enderecoComNumero;
          const cidadeEstado = [empresaData.cidade, empresaData.estado].filter(Boolean).join('/');
          empresaEndereco = cidadeEstado ? `${enderecoComBairro}, ${cidadeEstado}` : enderecoComBairro;
        }
      }

      // Buscar dados do treinamento (incluindo conteúdo programático e validade)
      const { data: treinamentoData, error: treinamentoError } = await db
        .from('catalogo_treinamentos')
        .select('nome, norma, ch_formacao, ch_reciclagem, conteudo_programatico, validade')
        .eq('id', turmaData.treinamento_id)
        .single();

      if (treinamentoError) throw treinamentoError;

      // Buscar instrutor com dados completos
      let instrutorNome = '';
      let instrutorAssinatura = '';
      let instrutorAssinaturaCompleta: AssinaturaCompleta | null = null;
      
      if (turmaData.instrutor_id) {
        const { data: instrutorData } = await db
          .from('instrutores')
          .select('nome, assinatura_url')
          .eq('id', turmaData.instrutor_id)
          .single();
        
        instrutorNome = instrutorData?.nome || '';
        instrutorAssinatura = instrutorData?.assinatura_url || '';
        
        // Buscar formação do instrutor vinculada ao treinamento da turma
        const { data: formacaoVinculada } = await db
          .from('instrutor_formacao_treinamento')
          .select('formacao_id')
          .eq('instrutor_id', turmaData.instrutor_id)
          .eq('treinamento_id', turmaData.treinamento_id)
          .limit(1)
          .maybeSingle();
        
        let formacaoNome = '';
        let registroTipo = '';
        let registroNumero = '';
        let registroEstado = '';
        
        if (formacaoVinculada?.formacao_id) {
          // Buscar dados da formação
          const { data: formacaoData } = await db
            .from('instrutor_formacoes')
            .select('nome, registro_tipo, registro_numero, registro_estado')
            .eq('id', formacaoVinculada.formacao_id)
            .single();
          
          if (formacaoData) {
            formacaoNome = formacaoData.nome || '';
            registroTipo = formacaoData.registro_tipo || '';
            registroNumero = formacaoData.registro_numero || '';
            registroEstado = formacaoData.registro_estado || '';
          }
        }
        
        // Sempre criar o objeto do instrutor se tiver nome
        if (instrutorNome) {
          instrutorAssinaturaCompleta = {
            nome: instrutorNome,
            cargo: 'Instrutor',
            formacao: formacaoNome,
            registro_tipo: registroTipo,
            registro_numero: registroNumero,
            registro_estado: registroEstado,
            assinatura_url: instrutorAssinatura
          };
        }
      }

      // Buscar dados da empresa SST
      let empresaSSTNome = '';
      let empresaSSTEndereco = '';
      let empresaSSTLogo = '';
      let empresaSSTCidade = '';
      let diretorTecnico: AssinaturaCompleta | null = null;
      
      let empresaSSTCnpj = '';
      if (turmaData.empresa_id) {
        const { data: empresaSSTData } = await db
          .from('empresas')
          .select('nome, endereco, numero, bairro, cidade, estado, cep, logo_url, cnpj')
          .eq('id', turmaData.empresa_id)
          .single();
        
        if (empresaSSTData) {
          empresaSSTNome = empresaSSTData.nome || '';
          empresaSSTLogo = (empresaSSTData as any).logo_url || '';
          empresaSSTCidade = empresaSSTData.cidade || '';
          empresaSSTCnpj = (empresaSSTData as any).cnpj || '';
          const partes = [
            empresaSSTData.endereco,
            empresaSSTData.numero,
            empresaSSTData.bairro,
            empresaSSTData.cidade,
            empresaSSTData.estado,
            empresaSSTData.cep ? `CEP ${empresaSSTData.cep}` : ''
          ].filter(Boolean);
          empresaSSTEndereco = partes.join(' – ');
        }
        
        // Buscar dados do diretor técnico e logo da empresa SST
        const { data: infoEmpresa } = await db
          .from('informacoes_empresa')
          .select(`
            logo_pequena_url,
            diretor_tecnico_nome,
            diretor_tecnico_formacao,
            diretor_tecnico_registro_tipo,
            diretor_tecnico_registro_numero,
            diretor_tecnico_registro_estado,
            diretor_tecnico_assinatura_url
          `)
          .eq('empresa_id', turmaData.empresa_id)
          .maybeSingle();
        
        if (infoEmpresa) {
          // Usar logo de informacoes_empresa se disponível
          if (infoEmpresa.logo_pequena_url) {
            empresaSSTLogo = infoEmpresa.logo_pequena_url;
          }
          
          if (infoEmpresa.diretor_tecnico_nome) {
            diretorTecnico = {
              nome: infoEmpresa.diretor_tecnico_nome,
              cargo: 'Diretor/Responsável Técnico',
              formacao: infoEmpresa.diretor_tecnico_formacao || '',
              registro_tipo: infoEmpresa.diretor_tecnico_registro_tipo || '',
              registro_numero: infoEmpresa.diretor_tecnico_registro_numero || '',
              registro_estado: infoEmpresa.diretor_tecnico_registro_estado || '',
              assinatura_url: infoEmpresa.diretor_tecnico_assinatura_url || null
            };
          }
        }
      }

      // Montar array de assinaturas usando diretor técnico e instrutor diretamente
      const assinaturas: Assinatura[] = [];
      
      // Adicionar diretor técnico
      if (diretorTecnico) {
        assinaturas.push({
          nome: diretorTecnico.nome,
          cargo: diretorTecnico.cargo,
          formacao: diretorTecnico.formacao,
          registro: diretorTecnico.registro_numero ? `${diretorTecnico.registro_tipo} nº ${diretorTecnico.registro_numero}/${diretorTecnico.registro_estado}` : '',
          assinatura_url: diretorTecnico.assinatura_url
        });
      }
      
      // Adicionar instrutor
      if (instrutorNome) {
        assinaturas.push({
          nome: instrutorNome,
          cargo: 'Instrutor',
          formacao: instrutorAssinaturaCompleta?.formacao || '',
          registro: instrutorAssinaturaCompleta?.registro_numero || '',
          assinatura_url: instrutorAssinatura
        });
      }

      // Buscar modelo de certificado vinculado ao treinamento
      const { data: modelosData } = await db
        .from('modelo_relatorios')
        .select(`
          id,
          nome,
          largura,
          altura,
          selecao_treinamento,
          treinamentos:modelo_relatorio_treinamentos(treinamento_id),
          paginas:modelo_relatorio_paginas(*, blocos:modelo_relatorio_blocos(*))
        `)
        .eq('empresa_id', turmaData.empresa_id)
        .eq('tipo', 'certificado')
        .eq('ativo', true);

      // Encontrar o modelo que se aplica a este treinamento
      // Prioridade: individual > todos_exceto > todos
      let modeloAplicavel = null;
      let modeloTodos = null;
      if (modelosData && modelosData.length > 0) {
        for (const modelo of modelosData) {
          if (modelo.selecao_treinamento === 'individual') {
            const treinamentosIds = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
            if (treinamentosIds.includes(turmaData.treinamento_id)) {
              modeloAplicavel = modelo;
              break; // Modelo específico tem prioridade máxima
            }
          } else if (modelo.selecao_treinamento === 'todos_exceto') {
            const treinamentosExcluidos = modelo.treinamentos?.map((t: any) => t.treinamento_id) || [];
            if (!treinamentosExcluidos.includes(turmaData.treinamento_id)) {
              if (!modeloAplicavel) modeloAplicavel = modelo;
            }
          } else if (modelo.selecao_treinamento === 'todos') {
            modeloTodos = modelo;
          }
        }
        // Se não encontrou modelo específico, usar o "todos"
        if (!modeloAplicavel) modeloAplicavel = modeloTodos;
      }

      // Calcular validade em meses
      const validadeMeses = validadeParaMeses(treinamentoData.validade);

      setDados({
        colaborador: {
          nome: colaboradorData.nome,
          cpf: formatCPF(colaboradorData.cpf),
          empresa_nome: clienteData?.nome || '',
          empresa_endereco: empresaEndereco,
          empresa_cidade: empresaCidade,
          empresa_estado: empresaEstado
        },
        treinamento: {
          nome: treinamentoData.nome,
          norma: treinamentoData.norma,
          carga_horaria: treinamentoData.ch_formacao || treinamentoData.ch_reciclagem || 0,
          conteudo_programatico: treinamentoData.conteudo_programatico || '',
          validade_meses: validadeMeses
        },
        turma: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          todas_datas: todasDatas,
          instrutor_nome: instrutorNome,
          tipo_treinamento: turmaData.tipo_treinamento || 'formacao',
          local_treinamento: empresaEndereco, // Sempre usar endereço da empresa cliente
          carga_horaria_total: turmaData.carga_horaria_total || null,
          codigo_turma: turmaData.codigo_turma || '',
          categorizacao_tecnica: turmaData.categorizacao_tecnica || null
        },
        empresa_sst: {
          nome: empresaSSTNome,
          endereco: empresaSSTEndereco,
          logo_url: empresaSSTLogo,
          cidade: empresaSSTCidade,
          cnpj: empresaSSTCnpj
        },
        colaborador_assinatura: colaboradorAssinatura,
        assinaturas: assinaturas,
        diretor_tecnico: diretorTecnico,
        instrutor_assinatura: instrutorAssinaturaCompleta,
        modelo: modeloAplicavel ? {
          id: modeloAplicavel.id,
          nome: modeloAplicavel.nome,
          largura: modeloAplicavel.largura || 800,
          altura: modeloAplicavel.altura || 600,
          paginas: (modeloAplicavel.paginas || []).sort((a: any, b: any) => a.numero - b.numero)
        } : null
      });

    } catch (error: any) {
      console.error('Erro ao buscar dados do certificado:', error);
      toast.error('Erro ao carregar dados do certificado');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Formatar conteúdo programático para HTML - cada bloco vira uma coluna
  const formatarConteudoProgramatico = (json: string): string => {
    if (!json) return '';
    try {
      const blocos = JSON.parse(json) as Array<{ titulo: string; itens: string }>;
      
      // Se só tem um bloco, renderiza normalmente
      if (blocos.length === 1) {
        const bloco = blocos[0];
        const itensArray = bloco.itens.split('\n').filter(i => i.trim());
        const itensHtml = itensArray.map(item => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('');
        return `
          <div style="margin-bottom: 12px;">
            ${bloco.titulo ? `<p style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">${bloco.titulo}:</p>` : ''}
            <ul style="list-style: none; padding-left: 8px; margin: 0;">${itensHtml}</ul>
          </div>
        `;
      }
      
      // Múltiplos blocos: renderiza em colunas lado a lado
      const colunasHtml = blocos.map(bloco => {
        const itensArray = bloco.itens.split('\n').filter(i => i.trim());
        const itensHtml = itensArray.map(item => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('');
        return `
          <div style="flex: 1; min-width: 0; padding: 0 8px;">
            ${bloco.titulo ? `<p style="font-weight: bold; margin-bottom: 6px; text-decoration: underline; text-align: center;">${bloco.titulo}</p>` : ''}
            <ul style="list-style: none; padding-left: 0; margin: 0;">${itensHtml}</ul>
          </div>
        `;
      }).join('');
      
      return `<div style="display: flex; gap: 16px; width: 100%;">${colunasHtml}</div>`;
    } catch {
      // Formato antigo: texto simples separado por ponto e vírgula
      const itens = json.split(';').filter(i => i.trim());
      return `<ul style="list-style: none; padding-left: 8px; margin: 0;">${itens.map(item => `<li style="margin-bottom: 2px;">✓ ${item.trim()}</li>`).join('')}</ul>`;
    }
  };

  const substituirVariaveis = (texto: string, blocos?: Array<{
    id: string;
    ordem: number;
    nome: string;
    conteudo: string;
    largura?: string;
    altura?: string;
    justify_content?: string;
    align_items?: string;
    text_align?: string;
    padding?: number;
    margin_top?: number;
    margin_bottom?: number;
    font_size?: number;
    font_weight?: string;
    background_color?: string;
    border?: boolean;
    border_radius?: number;
  }>): string => {
    if (!dados) return texto;

    const dataFim = dados.turma.data_fim ? parseISO(dados.turma.data_fim) : new Date();
    const validade = addMonths(dataFim, dados.treinamento.validade_meses || 12);

    const conteudoProgramaticoHtml = formatarConteudoProgramatico(dados.treinamento.conteudo_programatico);

    // Gerar HTML do bloco de categorização técnica
    const gerarBlocoCategorizacaoTecnica = (): string => {
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

      const empresaCliente = dados.colaborador.empresa_nome || '';

      return `<div style="box-sizing: border-box; border: 1px solid #000; padding: 10px 14px; margin: 8px 0; font-family: 'Times New Roman', Times, serif; font-size: 11px; line-height: 1.5; max-width: 100%;">
        ${espacosTexto ? `<div style="margin-bottom: 10px;"><strong>Tipo de Espaço Confinado:</strong> ${espacosTexto}.</div>` : ''}
        ${atividadesTexto ? `<div style="margin-bottom: 10px;"><strong>Tipo de trabalho:</strong> ${atividadesTexto}.</div>` : ''}
        ${responsaveis.length > 0 ? `<div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; line-height: 1.4;">
          ${responsaveisHtml}
          <div style="margin-top: 4px; font-size: 11px;">Responsável pelos Espaços Confinados da<br/>${empresaCliente}.</div>
        </div>` : ''}
      </div>`;
    };

    // Gerar HTML do bloco de assinaturas
    const gerarBlocoAssinaturas = (): string => {
      const diretor = dados.diretor_tecnico;
      const instrutor = dados.instrutor_assinatura;
      
      const gerarAssinaturaHtml = (assinatura: AssinaturaCompleta | null, titulo: string): string => {
        if (!assinatura || !assinatura.nome) return '';
        
        const registro = assinatura.registro_tipo && assinatura.registro_numero 
          ? `${assinatura.registro_tipo} nº ${assinatura.registro_numero}${assinatura.registro_estado ? '/' + assinatura.registro_estado : ''}`
          : '';
        
        const assinaturaImg = assinatura.assinatura_url 
          ? `<img src="${assinatura.assinatura_url}" alt="Assinatura" style="height:60px;max-width:180px;object-fit:contain;" crossorigin="anonymous" />`
          : `<div style="height:60px;width:180px;"></div>`;
        
        return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
          ${assinaturaImg}
          <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
          <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">${assinatura.nome}</p>
          <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">${titulo}</p>
          ${assinatura.formacao ? `<p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">${assinatura.formacao}</p>` : ''}
          ${registro ? `<p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">${registro}</p>` : ''}
        </div>`;
      };
      
      const diretorHtml = gerarAssinaturaHtml(diretor, 'Responsável Técnico');
      const instrutorHtml = gerarAssinaturaHtml(instrutor, 'Instrutor');
      
      return `<div style="display:flex;justify-content:center;align-items:flex-start;width:100%;gap:60px;flex-wrap:wrap;">${diretorHtml}${instrutorHtml}</div>`;
    };

    // Gerar HTML da assinatura do responsável técnico (separada)
    const gerarAssinaturaResponsavelTecnico = (): string => {
      const diretor = dados.diretor_tecnico;
      if (!diretor || !diretor.nome) return '';
      
      const registro = diretor.registro_tipo && diretor.registro_numero 
        ? `${diretor.registro_tipo} nº ${diretor.registro_numero}${diretor.registro_estado ? '/' + diretor.registro_estado : ''}`
        : '';
      
      const assinaturaImg = diretor.assinatura_url 
        ? `<img src="${diretor.assinatura_url}" alt="Assinatura" style="height:60px;max-width:180px;object-fit:contain;" crossorigin="anonymous" />`
        : `<div style="height:60px;width:180px;"></div>`;
      
      return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
        ${assinaturaImg}
        <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
        <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">${diretor.nome}</p>
        <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Responsável Técnico</p>
        ${diretor.formacao ? `<p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">${diretor.formacao}</p>` : ''}
        ${registro ? `<p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">${registro}</p>` : ''}
      </div>`;
    };

    // Gerar HTML da assinatura do instrutor (separada)
    const gerarAssinaturaInstrutor = (): string => {
      const instrutor = dados.instrutor_assinatura;
      if (!instrutor || !instrutor.nome) return '';
      
      const registro = instrutor.registro_tipo && instrutor.registro_numero 
        ? `${instrutor.registro_tipo} nº ${instrutor.registro_numero}${instrutor.registro_estado ? '/' + instrutor.registro_estado : ''}`
        : '';
      
      const assinaturaImg = instrutor.assinatura_url 
        ? `<img src="${instrutor.assinatura_url}" alt="Assinatura" style="height:60px;max-width:180px;object-fit:contain;" crossorigin="anonymous" />`
        : `<div style="height:60px;width:180px;"></div>`;
      
      return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;min-width:240px;">
        ${assinaturaImg}
        <div style="width:200px;border-bottom:1px solid #333;margin:6px 0;"></div>
        <p style="margin:0;font-weight:bold;font-size:13px;line-height:1.3;">${instrutor.nome}</p>
        <p style="margin:2px 0 0 0;font-size:11px;color:#444;line-height:1.3;">Instrutor</p>
        ${instrutor.formacao ? `<p style="margin:2px 0 0 0;font-size:11px;color:#555;line-height:1.3;">${instrutor.formacao}</p>` : ''}
        ${registro ? `<p style="margin:2px 0 0 0;font-size:10px;color:#666;line-height:1.3;">${registro}</p>` : ''}
      </div>`;
    };

    // Gerar HTML da logo da empresa
    const logoHtml = dados.empresa_sst.logo_url 
      ? `<img src="${dados.empresa_sst.logo_url}" alt="Logo" style="max-height:80px;max-width:200px;object-fit:contain;" crossorigin="anonymous" />`
      : '';

    // Gerar HTML da assinatura do colaborador
    const assinaturaColaboradorHtml = dados.colaborador_assinatura 
      ? `<img src="${dados.colaborador_assinatura}" alt="Assinatura" style="max-height:60px;max-width:200px;object-fit:contain;" />`
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

    let resultado = texto
      .replace(/{LOGO_EMPRESA}/g, logoHtml)
      .replace(/{COLABORADOR_NOME}/g, dados.colaborador.nome)
      .replace(/{COLABORADOR_CPF}/g, dados.colaborador.cpf)
      .replace(/{COLABORADOR_EMPRESA}/g, dados.colaborador.empresa_nome)
      .replace(/{COLABORADOR_LOCAL}/g, dados.colaborador.empresa_endereco)
      .replace(/{COLABORADOR_ASSINATURA}/g, assinaturaColaboradorHtml)
      .replace(/{TREINAMENTO_NOME}/g, dados.treinamento.nome)
      .replace(/{TREINAMENTO_NR}/g, `NR-${dados.treinamento.norma}`)
      .replace(/{TREINAMENTO_CH}/g, String(dados.turma.carga_horaria_total || dados.treinamento.carga_horaria || 0))
      .replace(/{TREINAMENTO_DATA}/g, dados.turma.data_fim ? format(parseISO(dados.turma.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : '')
      .replace(/{TREINAMENTO_CP}/g, conteudoProgramaticoHtml)
      .replace(/{TREINAMENTO_VALIDADE}/g, format(validade, 'dd/MM/yyyy', { locale: ptBR }))
      .replace(/{TURMA_TIPO}/g, formatarTipoTurma(dados.turma.tipo_treinamento))
      .replace(/{TURMA_CODIGO}/g, dados.turma.codigo_turma || '')
      .replace(/{INSTRUTOR_NOME}/g, dados.turma.instrutor_nome)
      .replace(/{DATA_ATUAL}/g, format(new Date(), 'dd/MM/yyyy', { locale: ptBR }))
      .replace(/{EMPRESA_SST_NOME}/g, dados.empresa_sst.nome || '')
      .replace(/{EMPRESA_SST_CNPJ}/g, dados.empresa_sst.cnpj || '')
      .replace(/{EMPRESA_SST_ENDERECO}/g, dados.empresa_sst.endereco || '')
      .replace(/{ASSINATURAS}/g, gerarBlocoAssinaturas())
      .replace(/{ASSINATURA_RESPONSAVEL_TECNICO}/g, gerarAssinaturaResponsavelTecnico())
      .replace(/{ASSINATURA_INSTRUTOR}/g, gerarAssinaturaInstrutor())
      .replace(/{CATEGORIZACAO_TECNICA}/g, gerarBlocoCategorizacaoTecnica());

    // Processar referências de blocos [BLOCO:nome]
    if (blocos && blocos.length > 0) {
      resultado = resultado.replace(/\[BLOCO:([^\]]+)\]/g, (match, nomeBloco) => {
        const bloco = blocos.find(b => b.nome === nomeBloco);
        if (bloco) {
          const conteudoBloco = substituirVariaveis(bloco.conteudo || '', []);
          return `<div style="
            width: ${bloco.largura || '100%'};
            height: ${bloco.altura === 'auto' ? 'auto' : bloco.altura};
            display: flex;
            flex-direction: column;
            justify-content: ${bloco.justify_content || 'center'};
            align-items: ${bloco.align_items || 'center'};
            text-align: ${bloco.text_align || 'center'};
            padding: ${bloco.padding || 16}px;
            margin-top: ${bloco.margin_top || 8}px;
            margin-bottom: ${bloco.margin_bottom || 8}px;
            font-size: ${bloco.font_size || 14}px;
            font-weight: ${bloco.font_weight || 'normal'};
            ${bloco.border ? 'border: 1px solid #ccc;' : ''}
            border-radius: ${bloco.border_radius || 0}px;
            background-color: ${bloco.background_color || 'transparent'};
          "><div style="text-align: ${bloco.text_align || 'center'};">${conteudoBloco}</div></div>`;
        }
        return match;
      });
    }

    return resultado;
  };

  const handleDownloadPDF = async () => {
    if (!certificadoRef.current || !dados?.modelo) return;

    try {
      setGerando(true);
      
      const pdf = new jsPDF({
        orientation: dados.modelo.largura > dados.modelo.altura ? 'landscape' : 'portrait',
        unit: 'px',
        format: [dados.modelo.largura, dados.modelo.altura],
        compress: true
      });

      // Gerar cada página
      for (let i = 0; i < dados.modelo.paginas.length; i++) {
        setPaginaAtual(i);
        
        // Aguardar renderização
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(certificadoRef.current, {
          scale: 1.5, // Reduzido para menor tamanho
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Usar JPEG com qualidade 0.85 para compressão
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        
        if (i > 0) {
          pdf.addPage([dados.modelo.largura, dados.modelo.altura]);
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, dados.modelo.largura, dados.modelo.altura, undefined, 'FAST');
      }

      // Tentar assinar com ICP-Brasil antes do download
      let pdfBlob = pdf.output('blob');
      let foiAssinado = false;
      
      try {
        const pdfBase64Download = await blobToBase64(pdfBlob);
        const docTipo = `Certificado NR-${dados.treinamento.norma} - ${dados.treinamento.nome}`;
        
        const { data: turmaEmpresa } = await db
          .from('turmas_treinamento')
          .select('empresa_id')
          .eq('id', turmaId)
          .single();
        
        if (turmaEmpresa?.empresa_id) {
          const resultadoAssinatura = await assinarPdfComIcpBrasil(
            pdfBase64Download,
            turmaEmpresa.empresa_id,
            docTipo,
            `Certificado de Treinamento ${dados.treinamento.norma} - ${dados.colaborador.nome}`
          );
          
          if (resultadoAssinatura.success && resultadoAssinatura.pdfAssinadoBase64) {
            pdfBlob = base64ToBlob(resultadoAssinatura.pdfAssinadoBase64);
            foiAssinado = true;
          }
        }
      } catch (assinaturaError) {
        console.warn('Não foi possível assinar PDF para download:', assinaturaError);
      }
      
      // Download
      const sufixoIcp = foiAssinado ? '_ICP' : '';
      const nomeArquivo = `certificado_${dados.colaborador.nome.replace(/\s+/g, '_')}_${dados.treinamento.norma}${sufixoIcp}.pdf`;
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (foiAssinado) {
        toast.success('Certificado baixado com assinatura digital ICP-Brasil!');
      } else {
        toast.success('Certificado baixado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do certificado');
    } finally {
      setGerando(false);
      setPaginaAtual(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Estado para controlar download em lote
  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const [progressoBaixar, setProgressoBaixar] = useState(0);
  const [statusBaixar, setStatusBaixar] = useState('');

  // Função para aguardar renderização completa do certificado
  const aguardarRenderizacao = async (nomeColaborador: string, maxTentativas = 20): Promise<boolean> => {
    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!certificadoRef.current) continue;
      
      // Verificar se o conteúdo do certificado está renderizado
      const conteudo = certificadoRef.current.innerText || '';
      const temConteudo = conteudo.length > 100; // Certificado tem bastante texto
      const temNome = conteudo.includes(nomeColaborador.split(' ')[0]); // Verifica se tem o primeiro nome
      
      if (temConteudo && temNome) {
        // Aguardar mais um pouco para garantir que imagens/fontes carregaram
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
    }
    return false;
  };

  // Função para baixar todos os certificados em ZIP
  const handleDownloadAllPDF = async () => {
    if (colaboradoresIds.length === 0) return;
    
    setBaixandoTodos(true);
    setProgressoBaixar(0);
    setStatusBaixar('Iniciando...');
    
    const zip = new JSZip();
    const originalIndex = colaboradorAtualIndex;
    const originalDados = dados;
    let sucessos = 0;
    let erros = 0;
    
    try {
      for (let i = 0; i < colaboradoresIds.length; i++) {
        const colabId = colaboradoresIds[i];
        const progresso = ((i) / colaboradoresIds.length) * 100;
        setProgressoBaixar(progresso);
        
        try {
          // Buscar dados do colaborador
          setStatusBaixar(`Buscando dados (${i + 1}/${colaboradoresIds.length})...`);
          const dadosColab = await buscarDadosColaborador(colabId);
          if (!dadosColab || !dadosColab.modelo) {
            console.error('Dados não encontrados para:', colabId);
            erros++;
            continue;
          }
          
          setStatusBaixar(`Renderizando: ${dadosColab.colaborador.nome.split(' ')[0]}...`);
          
          // Atualizar dados na tela para renderização
          setDados(dadosColab);
          setColaboradorAtualIndex(i);
          setPaginaAtual(0);
          
          // Aguardar renderização completa da primeira página
          const renderizou = await aguardarRenderizacao(dadosColab.colaborador.nome);
          if (!renderizou) {
            console.error('Timeout na renderização para:', dadosColab.colaborador.nome);
            erros++;
            continue;
          }
          
          // Gerar PDF
          const pdf = new jsPDF({
            orientation: dadosColab.modelo.largura > dadosColab.modelo.altura ? 'landscape' : 'portrait',
            unit: 'px',
            format: [dadosColab.modelo.largura, dadosColab.modelo.altura],
            compress: true
          });
          
          // Gerar cada página
          for (let p = 0; p < dadosColab.modelo.paginas.length; p++) {
            setStatusBaixar(`${dadosColab.colaborador.nome.split(' ')[0]} - Página ${p + 1}/${dadosColab.modelo.paginas.length}`);
            setPaginaAtual(p);
            
            // Aguardar renderização da página
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!certificadoRef.current) {
              console.error('Ref não disponível para página', p);
              continue;
            }
            
            // Verificar se o elemento tem dimensões válidas
            const rect = certificadoRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              console.error('Elemento com dimensões inválidas');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const canvas = await html2canvas(certificadoRef.current, {
              scale: 1.5,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false,
              width: dadosColab.modelo.largura,
              height: dadosColab.modelo.altura
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            
            if (p > 0) {
              pdf.addPage([dadosColab.modelo.largura, dadosColab.modelo.altura]);
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, dadosColab.modelo.largura, dadosColab.modelo.altura, undefined, 'FAST');
          }
          
          // Tentar assinar com ICP-Brasil
          let pdfBlob = pdf.output('blob');
          let foiAssinado = false;
          
          try {
            const pdfBase64 = await blobToBase64(pdfBlob);
            const docTipo = `Certificado NR-${dadosColab.treinamento.norma} - ${dadosColab.treinamento.nome}`;
            
            const { data: turmaEmpresa } = await db
              .from('turmas_treinamento')
              .select('empresa_id')
              .eq('id', turmaId)
              .single();
            
            if (turmaEmpresa?.empresa_id) {
              const resultadoAssinatura = await assinarPdfComIcpBrasil(
                pdfBase64,
                turmaEmpresa.empresa_id,
                docTipo,
                `Certificado de Treinamento ${dadosColab.treinamento.norma} - ${dadosColab.colaborador.nome}`
              );
              
              if (resultadoAssinatura.success && resultadoAssinatura.pdfAssinadoBase64) {
                pdfBlob = base64ToBlob(resultadoAssinatura.pdfAssinadoBase64);
                foiAssinado = true;
              }
            }
          } catch (assinaturaError) {
            console.warn('Não foi possível assinar PDF:', assinaturaError);
          }
          
          // Adicionar ao ZIP
          const nomeNormalizado = dadosColab.colaborador.nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_');
          const sufixoIcp = foiAssinado ? '_ICP' : '';
          const nomeArquivo = `certificado_${nomeNormalizado}_${dadosColab.treinamento.norma}${sufixoIcp}.pdf`;
          
          zip.file(nomeArquivo, pdfBlob);
          sucessos++;
          
        } catch (error) {
          console.error('Erro ao gerar PDF para colaborador:', colabId, error);
          erros++;
        }
      }
      
      // Gerar e baixar ZIP
      if (sucessos > 0) {
        setStatusBaixar('Gerando arquivo ZIP...');
        setProgressoBaixar(100);
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificados_turma_${dados?.turma.codigo_turma || turmaId}_${format(new Date(), 'yyyy-MM-dd')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`${sucessos} certificado(s) baixado(s) com sucesso!${erros > 0 ? ` (${erros} erro(s))` : ''}`);
      } else {
        toast.error('Não foi possível gerar nenhum certificado');
      }
      
    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast.error('Erro ao gerar arquivo ZIP');
    } finally {
      // Restaurar estado original
      setColaboradorAtualIndex(originalIndex);
      setPaginaAtual(0);
      setBaixandoTodos(false);
      setProgressoBaixar(0);
      setStatusBaixar('');
      
      // Recarregar dados do colaborador original
      if (colaboradoresIds[originalIndex]) {
        const dadosOriginal = await buscarDadosColaborador(colaboradoresIds[originalIndex]);
        if (dadosOriginal) setDados(dadosOriginal);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600">Carregando certificado...</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Não foi possível carregar os dados do certificado.</p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Verificar se há modelo cadastrado
  if (!dados.modelo || !dados.modelo.paginas || dados.modelo.paginas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Modelo de Certificado não encontrado</h2>
            <p className="text-slate-600 mb-6">
              Não há modelo de certificado cadastrado para o treinamento <strong>NR-{dados.treinamento.norma}</strong>.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Para gerar certificados, é necessário cadastrar um modelo em <strong>Modelo Relatório</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-primary"
                onClick={() => navigate('/sst/modelo-relatorio')}
              >
                Ir para Modelo Relatório
              </Button>
              <Button variant="outline" onClick={handleVoltar} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dados da página atual do modelo
  const totalPaginasModelo = dados.modelo.paginas.length;
  const totalPaginas = totalPaginasModelo + (assinadoIcpBrasil ? 1 : 0);
  const isPaginaAssinatura = assinadoIcpBrasil && paginaAtual === totalPaginasModelo;
  const paginaAtualData = isPaginaAssinatura ? null : dados.modelo.paginas[paginaAtual];

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Barra de progresso de validação em lote */}
      {validandoTodos && (
        <div className="print:hidden fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Validando certificados em lote...</span>
              <span>{colaboradorAtualIndex + 1} de {colaboradoresIds.length}</span>
            </div>
            <Progress value={progressoValidacao} className="h-2 bg-emerald-800" />
          </div>
        </div>
      )}
      
      {/* Barra de Ações - não aparece na impressão */}
      <div className={`print:hidden sticky ${validandoTodos ? 'top-16' : 'top-0'} z-50 bg-white shadow-md p-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleVoltar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="font-semibold text-slate-800">{dados.colaborador.nome}</h1>
              <p className="text-sm text-slate-500">NR-{dados.treinamento.norma} - {dados.treinamento.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Navegação entre colaboradores */}
            {colaboradoresIds.length > 1 && (
              <div className="flex items-center gap-2 mr-4 border-r pr-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleColaboradorAnterior}
                  disabled={colaboradorAtualIndex === 0 || validandoTodos}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[80px] text-center">
                  {colaboradorAtualIndex + 1} de {colaboradoresIds.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProximoColaborador}
                  disabled={colaboradorAtualIndex === colaboradoresIds.length - 1 || validandoTodos}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {!turmaFinalizada && (
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white ml-2"
                    size="sm"
                    onClick={handleValidarTodos}
                    disabled={validandoTodos}
                  >
                    {validandoTodos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Validar Todos
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            {/* Navegação de páginas */}
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.max(0, paginaAtual - 1))}
                  disabled={paginaAtual === 0 || gerando}
                >
                  ←
                </Button>
                <span className="text-sm text-slate-600">
                  Página {paginaAtual + 1} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.min(totalPaginas - 1, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas - 1 || gerando}
                >
                  →
                </Button>
              </div>
            )}
            <Button 
              variant={ocultarMoldura ? "default" : "outline"}
              onClick={() => setOcultarMoldura(!ocultarMoldura)}
              disabled={gerando}
              className={ocultarMoldura ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
              title={ocultarMoldura ? "Exibir moldura" : "Ocultar moldura"}
            >
              {ocultarMoldura ? (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Exibir Moldura
                </>
              ) : (
                <>
                  <ImageOff className="h-4 w-4 mr-2" />
                  Sem Moldura
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={gerando || baixandoTodos}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            {/* Botão de download - com dropdown quando há múltiplos colaboradores */}
            {colaboradoresIds.length > 1 ? (
              baixandoTodos ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-md border border-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{statusBaixar}</span>
                    <div className="w-24 h-1.5 bg-amber-200 rounded-full mt-1">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                        style={{ width: `${progressoBaixar}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      disabled={gerando || validando}
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
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar este certificado
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAllPDF}>
                      <FileArchive className="h-4 w-4 mr-2" />
                      Baixar todos ({colaboradoresIds.length}) em ZIP
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : (
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleDownloadPDF}
                disabled={gerando || validando}
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
            )}
            {certificadoValidado ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRevalidarDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Validado</span>
                </button>
                {assinadoIcpBrasil && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">ICP-Brasil</span>
                  </div>
                )}
              </div>
            ) : turmaFinalizada ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 rounded-md">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Turma Finalizada</span>
              </div>
            ) : canValidate ? (
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleValidarCertificado}
                disabled={gerando || validando}
              >
                {validando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validar Certificado
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Área do Certificado */}
      <div className="p-8 print:p-0">
        <div className="mx-auto" style={{ maxWidth: '900px' }}>
          {/* Modelo Configurado */}
          <div 
            ref={certificadoRef}
            className="bg-white shadow-2xl print:shadow-none mx-auto"
            style={{
              width: `${dados.modelo.largura}px`,
              height: `${dados.modelo.altura}px`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Página de Assinatura Digital ICP-Brasil */}
            {isPaginaAssinatura ? (
              <div className="absolute inset-0 flex flex-col p-12" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {/* Cabeçalho */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold" style={{ color: '#1a4d8f' }}>
                    PÁGINA DE ASSINATURA DIGITAL
                  </h1>
                  <p className="text-xs mt-1" style={{ color: '#666' }}>
                    Documento assinado digitalmente conforme MP 2.200-2/2001 e Portaria 211/2019
                  </p>
                </div>
                
                <div className="border-t-2 mb-6" style={{ borderColor: '#336db5' }} />
                
                {/* Informações do Documento */}
                <div className="mb-6">
                  <h2 className="text-sm font-bold mb-3" style={{ color: '#333' }}>INFORMAÇÕES DO DOCUMENTO</h2>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="font-bold w-20" style={{ color: '#555' }}>Tipo:</span>
                      <span style={{ color: '#333' }}>Certificado NR-{dados.treinamento.norma} - {dados.treinamento.nome}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold w-20" style={{ color: '#555' }}>Empresa:</span>
                      <span style={{ color: '#333' }}>{dados.empresa_sst?.nome || ''}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold w-20" style={{ color: '#555' }}>Participante:</span>
                      <span style={{ color: '#333' }}>{dados.colaborador.nome}</span>
                    </div>
                  </div>
                </div>
                
                {/* Selo Visual da Assinatura */}
                <div 
                  className="rounded-md p-5 mb-6 max-w-sm"
                  style={{ backgroundColor: '#f7f7f7', border: '2px solid #336db5' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded" style={{ backgroundColor: '#2d7a2d' }}>
                      <span className="text-white text-xs font-bold">ICP</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#1a4d8f' }}>ASSINATURA DIGITAL ICP-Brasil</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-1">
                      <span className="font-bold" style={{ color: '#555' }}>Assinado por:</span>
                      <span style={{ color: '#333' }}>{icpBrasilCn}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold" style={{ color: '#555' }}>Data:</span>
                      <span style={{ color: '#333' }}>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold" style={{ color: '#555' }}>Razão:</span>
                      <span style={{ color: '#333' }}>Certificado de Treinamento SST</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="font-bold" style={{ color: '#555' }}>Padrão:</span>
                      <span style={{ color: '#333' }}>PAdES (PDF Advanced Electronic Signature)</span>
                    </div>
                  </div>
                </div>
                
                {/* Informações Técnicas */}
                <div className="mb-6">
                  <h2 className="text-sm font-bold mb-2" style={{ color: '#333' }}>INFORMAÇÕES TÉCNICAS</h2>
                  <div className="space-y-1 text-xs" style={{ color: '#555' }}>
                    <p>Padrão de Assinatura: PAdES (PDF Advanced Electronic Signature)</p>
                    <p>Conformidade: ICP-Brasil / ABNT NBR ISO 19005-1 (PDF/A-1)</p>
                  </div>
                </div>
                
                {/* Verificação de Autenticidade */}
                <div 
                  className="rounded-md p-4 mb-3"
                  style={{ backgroundColor: '#edf7ee', border: '1.5px solid #38a349' }}
                >
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#1a5c28' }}>VERIFICAÇÃO DE AUTENTICIDADE</h3>
                  <p className="text-xs mb-1" style={{ color: '#333' }}>
                    Para verificar a autenticidade desta assinatura digital, acesse o site oficial do Governo Federal:
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#0056b3' }}>
                    https://validar.iti.gov.br/index.html
                  </p>
                </div>
                
                {/* Aviso Legal */}
                <div 
                  className="rounded-md p-4 mt-auto"
                  style={{ backgroundColor: '#f0f4ff', border: '1px solid #c8d6ee' }}
                >
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#2d4a7a' }}>AVISO LEGAL</h3>
                  <p className="text-xs" style={{ color: '#555' }}>
                    Este documento foi assinado digitalmente com certificado ICP-Brasil, conforme MP 2.200-2/2001.
                    A assinatura digital garante autenticidade, integridade e validade jurídica ao documento.
                  </p>
                </div>
              </div>
            ) : (
            <>
            {/* Moldura de fundo */}
            {paginaAtualData?.moldura_url && !ocultarMoldura && (
              <img 
                src={paginaAtualData.moldura_url}
                alt="Moldura"
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            )}
            
            {/* Conteúdo do certificado com layout flexbox */}
            {paginaAtualData && (
              <div 
                className="absolute inset-0 flex"
                style={{
                  fontFamily: 'Georgia, serif',
                  display: 'flex',
                  flexDirection: (paginaAtualData.flex_direction as any) || 'column',
                  justifyContent: paginaAtualData.justify_content || 'center',
                  alignItems: paginaAtualData.align_items || 'center',
                  textAlign: (paginaAtualData.text_align || 'center') as any,
                  padding: `${paginaAtualData.padding || 48}px`,
                }}
              >
                {/* Se tem blocos, renderiza os blocos, senão renderiza conteúdo direto */}
                {paginaAtualData.blocos && paginaAtualData.blocos.length > 0 ? (
                  <div className="w-full h-full flex flex-col">
                    {paginaAtualData.blocos
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((bloco, idx) => (
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
                            __html: substituirVariaveis(bloco.conteudo || '')
                              .replace(/\n/g, '<br/>')
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    style={{ 
                      width: '100%',
                      height: '100%'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: substituirVariaveis(paginaAtualData.conteudo, paginaAtualData.blocos)
                    }}
                  />
                )}
              </div>
            )}
            </>
            )}
          </div>

          {/* Info adicional - não aparece na impressão */}
          <div className="print:hidden mt-6 text-center text-sm text-slate-500">
            <p>Modelo: {dados.modelo.nome}</p>
            <p>Dimensões: {dados.modelo.largura}px × {dados.modelo.altura}px</p>
          </div>
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
            size: ${dados.modelo.largura}px ${dados.modelo.altura}px;
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
              Certificado Validado
            </DialogTitle>
            <DialogDescription>
              Este certificado já foi validado anteriormente. O que deseja fazer?
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
                <p className="text-xs text-muted-foreground">Manter o certificado atual sem alterações</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4 border-amber-200 hover:bg-amber-50"
              disabled={validando}
              onClick={async () => {
                setRevalidarDialogOpen(false);
                setCertificadoValidado(false);
                await handleValidarCertificado();
              }}
            >
              {validando ? (
                <Loader2 className="h-5 w-5 mr-3 text-amber-600 flex-shrink-0 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-3 text-amber-600 flex-shrink-0" />
              )}
              <div className="text-left">
                <p className="font-medium text-amber-700">Revalidar com Alterações</p>
                <p className="text-xs text-muted-foreground">Gerar novo certificado substituindo o anterior</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
