import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Shield,
  User,
  Calendar,
  Monitor,
  Globe,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  AlertTriangle,
  Clock,
  MapPin,
  Smartphone,
  Laptop,
  Users,
  FileCheck,
  Paperclip,
  Award,
  ClipboardList,
  Star,
  PenTool,
  QrCode,
  Camera,
  Building2,
  FileBarChart
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface AuditoriaLog {
  id: string;
  turma_id: string;
  turma_codigo: string | null;
  empresa_id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  usuario_role: string | null;
  usuario_setor: string | null;
  acao: string;
  entidade: string;
  descricao: string;
  metodo_origem: string | null;
  fonte: string | null;
  colaborador_id: string | null;
  colaborador_nome: string | null;
  colaborador_cpf: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cnpj: string | null;
  cliente_razao_social: string | null;
  treinamento_id: string | null;
  treinamento_nome: string | null;
  treinamento_norma: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  dados_anteriores: any;
  dados_novos: any;
  ip_address: string | null;
  user_agent: string | null;
  dispositivo: string | null;
  navegador: string | null;
  sistema_operacional: string | null;
  created_at: string;
  // Campos de contexto da empresa SST
  empresa_sst_cnpj: string | null;
  empresa_sst_razao_social: string | null;
  // Campos do instrutor
  instrutor_id: string | null;
  instrutor_nome: string | null;
  instrutor_email: string | null;
  instrutor_cpf: string | null;
  instrutor_telefone: string | null;
  instrutor_formacao: string | null;
  // Campos de execução
  executado_por: string | null;
  executado_por_nome: string | null;
  executado_por_id: string | null;
}

interface TurmaAuditoriaTabProps {
  turmaId: string;
  turmaCodigo: string | null;
  clienteNome: string;
  treinamentoNome: string;
  treinamentoNorma: string;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function TurmaAuditoriaTab({ 
  turmaId, 
  turmaCodigo,
  clienteNome,
  treinamentoNome,
  treinamentoNorma
}: TurmaAuditoriaTabProps) {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAcao, setFilterAcao] = useState<string>('todos');
  const [filterEntidade, setFilterEntidade] = useState<string>('todos');
  const [filterUsuario, setFilterUsuario] = useState<string>('todos');
  
  // Detalhes do log
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Lista de usuários únicos para filtro
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  const fetchLogs = useCallback(async () => {
    if (!turmaId || !profile?.empresa_id) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      let query = db
        .from('turmas_auditoria')
        .select('*', { count: 'exact' })
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: false });
      
      // Aplicar filtros
      if (filterAcao !== 'todos') {
        query = query.eq('acao', filterAcao);
      }
      if (filterEntidade !== 'todos') {
        query = query.eq('entidade', filterEntidade);
      }
      if (filterUsuario !== 'todos') {
        query = query.eq('usuario_id', filterUsuario);
      }
      if (searchTerm) {
        query = query.or(`descricao.ilike.%${searchTerm}%,colaborador_nome.ilike.%${searchTerm}%,colaborador_cpf.ilike.%${searchTerm}%`);
      }
      
      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Erro ao buscar logs:', error);
        return;
      }
      
      setLogs(data || []);
      setTotalLogs(count || 0);
      
      // Buscar usuários únicos para filtro
      if (usuarios.length === 0) {
        const { data: usuariosData } = await db
          .from('turmas_auditoria')
          .select('usuario_id, usuario_nome')
          .eq('turma_id', turmaId);
        
        if (usuariosData) {
          const uniqueUsers = Array.from(
            new Map(usuariosData.map((u: any) => [u.usuario_id, u])).values()
          ) as { usuario_id: string; usuario_nome: string }[];
          setUsuarios(uniqueUsers.map(u => ({ id: u.usuario_id, nome: u.usuario_nome })));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  }, [turmaId, profile?.empresa_id, currentPage, itemsPerPage, filterAcao, filterEntidade, filterUsuario, searchTerm, usuarios.length]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page)) {
      goToPage(page);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatCPF = (cpf: string | null): string => {
    if (!cpf) return 'N/A';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const formatCNPJ = (cnpj: string | null): string => {
    if (!cnpj) return 'N/A';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  };

  const getRoleLabel = (role: string | null): string => {
    if (!role) return 'N/A';
    const roleMap: Record<string, string> = {
      'admin_vertical': 'Administrador Vertical',
      'empresa_sst': 'Administrador',
      'cliente_final': 'Cliente',
      'empresa_parceira': 'Parceiro',
      'instrutor': 'Instrutor',
      'colaborador': 'Colaborador'
    };
    return roleMap[role] || role;
  };

  const parseDescricaoToFields = (log: AuditoriaLog): Record<string, string> => {
    const fields: Record<string, string> = {};
    const desc = log.descricao;
    
    // Extrair tipo de prova
    if (log.entidade === 'prova') {
      if (desc.includes('Pré-Teste')) fields.tipo_prova = 'pre_teste';
      else if (desc.includes('Pós-Teste')) fields.tipo_prova = 'pos_teste';
      
      // Extrair nota e acertos
      const notaMatch = desc.match(/Nota:\s*(\d+)\/(\d+)/);
      if (notaMatch) {
        fields.nota = notaMatch[1];
        fields.nota_maxima = notaMatch[2];
      }
      const acertosMatch = desc.match(/Acertos:\s*(\d+)\/(\d+)/);
      if (acertosMatch) {
        fields.acertos = acertosMatch[1];
        fields.total_questoes = acertosMatch[2];
      }
      const resultadoMatch = desc.match(/Resultado:\s*(\w+)/);
      if (resultadoMatch) fields.resultado = resultadoMatch[1];
    }
    
    // Extrair dados de presença
    if (log.entidade === 'presenca') {
      const dataMatch = desc.match(/Data:\s*([\d-]+)/);
      if (dataMatch) fields.data_presenca = dataMatch[1];
      
      if (desc.includes('Reconhecimento facial')) {
        fields.metodo_validacao = 'facial';
        const simMatch = desc.match(/similaridade:\s*([\d.]+)%?/);
        if (simMatch) fields.similaridade_facial = simMatch[1];
        fields.facial_validado = desc.includes('validado') ? 'sim' : 'nao';
      } else {
        fields.metodo_validacao = 'assinatura';
      }
    }
    
    // Extrair dados de reorientação
    if (log.entidade === 'reorientacao') {
      const notaMatch = desc.match(/Nota:\s*(\d+)\/(\d+)/);
      if (notaMatch) {
        fields.nota = notaMatch[1];
        fields.nota_maxima = notaMatch[2];
      }
      const questoesMatch = desc.match(/(\d+)\s*questão/);
      if (questoesMatch) fields.questoes_incorretas = questoesMatch[1];
    }
    
    // Extrair dados de avaliação de reação
    if (log.entidade === 'avaliacao_reacao') {
      const modeloMatch = desc.match(/Modelo:\s*([^.]+)/);
      if (modeloMatch) fields.modelo_avaliacao = modeloMatch[1].trim();
      const perguntasMatch = desc.match(/Total de perguntas:\s*(\d+)/);
      if (perguntasMatch) fields.total_perguntas = perguntasMatch[1];
      fields.tem_comentarios = desc.includes('sugestões') || desc.includes('comentários') ? 'sim' : 'nao';
    }
    
    return fields;
  };

  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'criou': return <span className="text-green-500">+</span>;
      case 'atualizou': return <span className="text-blue-500">↻</span>;
      case 'deletou': return <span className="text-red-500">×</span>;
      case 'visualizou': return <Eye className="h-3 w-3 text-gray-500" />;
      case 'download': return <Download className="h-3 w-3 text-purple-500" />;
      case 'upload': return <span className="text-cyan-500">↑</span>;
      case 'validou': return <span className="text-green-600">✓</span>;
      case 'invalidou': return <span className="text-orange-500">!</span>;
      case 'finalizou': return <span className="text-emerald-600">✔</span>;
      case 'gerou': return <FileText className="h-3 w-3 text-indigo-500" />;
      default: return <span className="text-gray-400">•</span>;
    }
  };

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'criou': return 'bg-green-100 text-green-800 border-green-200';
      case 'atualizou': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deletou': return 'bg-red-100 text-red-800 border-red-200';
      case 'visualizou': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'download': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'upload': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'validou': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'invalidou': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'finalizou': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'gerou': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEntidadeIcon = (entidade: string) => {
    switch (entidade) {
      case 'turma': return <FileCheck className="h-4 w-4" />;
      case 'colaborador': return <Users className="h-4 w-4" />;
      case 'presenca': return <ClipboardList className="h-4 w-4" />;
      case 'prova': return <ClipboardList className="h-4 w-4" />;
      case 'certificado': return <Award className="h-4 w-4" />;
      case 'anexo': return <Paperclip className="h-4 w-4" />;
      case 'lista_presenca': return <ClipboardList className="h-4 w-4" />;
      case 'avaliacao_reacao': return <Star className="h-4 w-4" />;
      case 'reorientacao': return <FileText className="h-4 w-4" />;
      case 'relatorio': return <FileText className="h-4 w-4" />;
      case 'foto': return <Camera className="h-4 w-4" />;
      case 'assinatura': return <PenTool className="h-4 w-4" />;
      case 'qrcode': return <QrCode className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDispositivoIcon = (dispositivo: string | null) => {
    switch (dispositivo) {
      case 'Mobile': return <Smartphone className="h-4 w-4" />;
      case 'Tablet': return <Smartphone className="h-4 w-4" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    setExporting(true);
    
    try {
      // Coletar IDs únicos para buscar dados complementares
      const empresaIds = [...new Set(logs.map(l => l.empresa_id).filter(Boolean))];
      const clienteIds = [...new Set(logs.map(l => l.cliente_id).filter(Boolean))];
      const instrutorIds = [...new Set(logs.map(l => l.instrutor_id).filter(Boolean))];
      
      // Buscar dados das empresas SST
      const empresasMap: Record<string, { cnpj: string; razao_social: string }> = {};
      if (empresaIds.length > 0) {
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('id, cnpj, razao_social')
          .in('id', empresaIds);
        empresasData?.forEach(e => {
          empresasMap[e.id] = { cnpj: e.cnpj || '', razao_social: e.razao_social || '' };
        });
      }
      
      // Buscar dados dos clientes (cliente_empresa_id via clientes_sst)
      const clientesMap: Record<string, { nome: string; cnpj: string; razao_social: string }> = {};
      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('clientes_sst')
          .select('id, nome, cliente_empresa_id')
          .in('id', clienteIds);
        
        // Buscar dados das empresas cliente
        const clienteEmpresaIds = clientesData?.map(c => c.cliente_empresa_id).filter(Boolean) || [];
        if (clienteEmpresaIds.length > 0) {
          const { data: clienteEmpresasData } = await supabase
            .from('empresas')
            .select('id, cnpj, razao_social')
            .in('id', clienteEmpresaIds);
          
          const clienteEmpresasMap: Record<string, { cnpj: string; razao_social: string }> = {};
          clienteEmpresasData?.forEach(e => {
            clienteEmpresasMap[e.id] = { cnpj: e.cnpj || '', razao_social: e.razao_social || '' };
          });
          
          clientesData?.forEach(c => {
            const empresaCliente = c.cliente_empresa_id ? clienteEmpresasMap[c.cliente_empresa_id] : null;
            clientesMap[c.id] = {
              nome: c.nome || '',
              cnpj: empresaCliente?.cnpj || '',
              razao_social: empresaCliente?.razao_social || ''
            };
          });
        }
      }
      
      // Buscar dados dos instrutores
      const instrutoresMap: Record<string, { nome: string; email: string; cpf: string; telefone: string; formacao: string }> = {};
      if (instrutorIds.length > 0) {
        const { data: instrutoresData } = await supabase
          .from('instrutores')
          .select('id, nome, email, cpf_cnpj, telefone, formacao_academica')
          .in('id', instrutorIds);
        instrutoresData?.forEach(i => {
          instrutoresMap[i.id] = {
            nome: i.nome || '',
            email: i.email || '',
            cpf: i.cpf_cnpj || '',
            telefone: i.telefone || '',
            formacao: i.formacao_academica || ''
          };
        });
      }
      
      // Montar dados de exportação com dados complementares
      const dataExport = logs.map(log => {
        const parsedFields = parseDescricaoToFields(log);
        const cpfFormatado = log.colaborador_cpf ? formatCPF(log.colaborador_cpf) : 'N/A';
        
        // Dados da empresa SST (do log ou buscados)
        const empresaSst = log.empresa_id ? empresasMap[log.empresa_id] : null;
        const empresaSstRazaoSocial = log.empresa_sst_razao_social || empresaSst?.razao_social || 'N/A';
        const empresaSstCnpj = log.empresa_sst_cnpj || empresaSst?.cnpj || '';
        
        // Dados do cliente (do log ou buscados)
        const cliente = log.cliente_id ? clientesMap[log.cliente_id] : null;
        const clienteRazaoSocial = log.cliente_razao_social || cliente?.razao_social || log.cliente_nome || 'N/A';
        const clienteCnpj = log.cliente_cnpj || cliente?.cnpj || '';
        
        // Dados do instrutor (do log ou buscados)
        const instrutor = log.instrutor_id ? instrutoresMap[log.instrutor_id] : null;
        const instrutorNome = log.instrutor_nome || instrutor?.nome || 'N/A';
        const instrutorEmail = log.instrutor_email || instrutor?.email || 'N/A';
        const instrutorCpf = log.instrutor_cpf || instrutor?.cpf || '';
        const instrutorTelefone = log.instrutor_telefone || instrutor?.telefone || 'N/A';
        const instrutorFormacao = log.instrutor_formacao || instrutor?.formacao || 'N/A';
        
        return {
          // Identificação do registro
          'ID_Registro': log.id,
          'Data_Hora': formatDateTime(log.created_at),
          'Turma_Codigo': log.turma_codigo || 'N/A',
          
          // Empresa SST
          'Empresa_SST_Razao_Social': empresaSstRazaoSocial,
          'Empresa_SST_CNPJ': empresaSstCnpj ? formatCNPJ(empresaSstCnpj) : 'N/A',
          
          // Cliente
          'Cliente_Nome': log.cliente_nome || cliente?.nome || 'N/A',
          'Cliente_Razao_Social': clienteRazaoSocial,
          'Cliente_CNPJ': clienteCnpj ? formatCNPJ(clienteCnpj) : 'N/A',
          
          // Treinamento
          'Treinamento_Nome': log.treinamento_nome || 'N/A',
          'Treinamento_Norma': log.treinamento_norma || 'N/A',
          
          // Instrutor
          'Instrutor_Nome': instrutorNome,
          'Instrutor_Email': instrutorEmail,
          'Instrutor_CPF': instrutorCpf ? formatCPF(instrutorCpf) : 'N/A',
          'Instrutor_Telefone': instrutorTelefone,
          'Instrutor_Formacao': instrutorFormacao,
          
          // Usuário que executou
          'Usuario_Nome': log.usuario_nome || 'N/A',
          'Usuario_Email': log.usuario_email || 'N/A',
          'Usuario_Role': getRoleLabel(log.usuario_role),
          'Usuario_Setor': log.usuario_setor || 'N/A',
          
          // Ação
          'Acao': log.acao,
          'Entidade': log.entidade,
          'Metodo_Origem': log.metodo_origem || 'sistema',
          'Executado_Por': log.executado_por || 'usuario',
          'Executado_Por_Nome': log.executado_por_nome || log.usuario_nome || 'N/A',
          
          // Colaborador envolvido
          'Colaborador_Nome': log.colaborador_nome || 'N/A',
          'Colaborador_CPF': cpfFormatado,
          'Colaborador_CPF_Numerico': log.colaborador_cpf?.replace(/\D/g, '') || '',
          
          // Campos extraídos da descrição (normalizados)
          'Tipo_Prova': parsedFields.tipo_prova || '',
          'Nota': parsedFields.nota || '',
          'Nota_Maxima': parsedFields.nota_maxima || '',
          'Acertos': parsedFields.acertos || '',
          'Total_Questoes': parsedFields.total_questoes || '',
          'Resultado_Prova': parsedFields.resultado || '',
          'Data_Presenca': parsedFields.data_presenca || '',
          'Metodo_Validacao': parsedFields.metodo_validacao || '',
          'Similaridade_Facial': parsedFields.similaridade_facial || '',
          'Facial_Validado': parsedFields.facial_validado || '',
          'Questoes_Incorretas': parsedFields.questoes_incorretas || '',
          'Modelo_Avaliacao': parsedFields.modelo_avaliacao || '',
          'Total_Perguntas': parsedFields.total_perguntas || '',
          'Tem_Comentarios': parsedFields.tem_comentarios || '',
          
          // Descrição completa (para referência)
          'Descricao_Completa': log.descricao,
          
          // Informações técnicas
          'IP_Address': log.ip_address || 'N/A',
          'Dispositivo': log.dispositivo || 'N/A',
          'Navegador': log.navegador || 'N/A',
          'Sistema_Operacional': log.sistema_operacional || 'N/A',
          'User_Agent': log.user_agent || 'N/A'
        };
      });
    
    const ws = XLSX.utils.json_to_sheet(dataExport);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 36 }, // ID_Registro
      { wch: 20 }, // Data_Hora
      { wch: 15 }, // Turma_Codigo
      { wch: 40 }, // Empresa_SST_Razao_Social
      { wch: 20 }, // Empresa_SST_CNPJ
      { wch: 40 }, // Cliente_Nome
      { wch: 40 }, // Cliente_Razao_Social
      { wch: 20 }, // Cliente_CNPJ
      { wch: 40 }, // Treinamento_Nome
      { wch: 10 }, // Treinamento_Norma
      { wch: 30 }, // Instrutor_Nome
      { wch: 30 }, // Instrutor_Email
      { wch: 15 }, // Instrutor_CPF
      { wch: 15 }, // Instrutor_Telefone
      { wch: 40 }, // Instrutor_Formacao
      { wch: 30 }, // Usuario_Nome
      { wch: 30 }, // Usuario_Email
      { wch: 20 }, // Usuario_Role
      { wch: 20 }, // Usuario_Setor
      { wch: 12 }, // Acao
      { wch: 20 }, // Entidade
      { wch: 12 }, // Metodo_Origem
      { wch: 15 }, // Executado_Por
      { wch: 30 }, // Executado_Por_Nome
      { wch: 30 }, // Colaborador_Nome
      { wch: 15 }, // Colaborador_CPF
      { wch: 12 }, // Colaborador_CPF_Numerico
      { wch: 12 }, // Tipo_Prova
      { wch: 6 },  // Nota
      { wch: 10 }, // Nota_Maxima
      { wch: 8 },  // Acertos
      { wch: 14 }, // Total_Questoes
      { wch: 12 }, // Resultado_Prova
      { wch: 12 }, // Data_Presenca
      { wch: 15 }, // Metodo_Validacao
      { wch: 18 }, // Similaridade_Facial
      { wch: 14 }, // Facial_Validado
      { wch: 18 }, // Questoes_Incorretas
      { wch: 20 }, // Modelo_Avaliacao
      { wch: 14 }, // Total_Perguntas
      { wch: 14 }, // Tem_Comentarios
      { wch: 80 }, // Descricao_Completa
      { wch: 15 }, // IP_Address
      { wch: 10 }, // Dispositivo
      { wch: 12 }, // Navegador
      { wch: 12 }, // Sistema_Operacional
      { wch: 80 }, // User_Agent
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `auditoria_${turmaCodigo || turmaId}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterAcao('todos');
    setFilterEntidade('todos');
    setFilterUsuario('todos');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || filterAcao !== 'todos' || filterEntidade !== 'todos' || filterUsuario !== 'todos';

  // Verificar se usuário tem permissão (apenas empresa_sst e admin_vertical)
  if (profile?.role !== 'empresa_sst' && profile?.role !== 'admin_vertical') {
    return (
      <Card>
        <CardContent className="py-20">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Os logs de auditoria são restritos à empresa SST responsável pela turma.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com informações e aviso */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <CardTitle className="text-lg text-amber-800">Auditoria de Segurança</CardTitle>
              <CardDescription className="text-amber-700">
                Registro completo de todas as ações realizadas nesta turma para fins de resguardo legal e jurídico.
                Estes dados são confidenciais e restritos à empresa SST.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, colaborador ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterAcao} onValueChange={setFilterAcao}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Ações</SelectItem>
                <SelectItem value="criou">Criou</SelectItem>
                <SelectItem value="atualizou">Atualizou</SelectItem>
                <SelectItem value="deletou">Deletou</SelectItem>
                <SelectItem value="visualizou">Visualizou</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="validou">Validou</SelectItem>
                <SelectItem value="gerou">Gerou</SelectItem>
                <SelectItem value="finalizou">Finalizou</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterEntidade} onValueChange={setFilterEntidade}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Entidades</SelectItem>
                <SelectItem value="turma">Turma</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
                <SelectItem value="presenca">Presença</SelectItem>
                <SelectItem value="prova">Prova</SelectItem>
                <SelectItem value="certificado">Certificado</SelectItem>
                <SelectItem value="anexo">Anexo</SelectItem>
                <SelectItem value="lista_presenca">Lista Presença</SelectItem>
                <SelectItem value="avaliacao_reacao">Avaliação Reação</SelectItem>
                <SelectItem value="reorientacao">Reorientação</SelectItem>
                <SelectItem value="relatorio">Relatório</SelectItem>
                <SelectItem value="foto">Foto</SelectItem>
                <SelectItem value="assinatura">Assinatura</SelectItem>
                <SelectItem value="qrcode">QR Code</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterUsuario} onValueChange={setFilterUsuario}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Usuários</SelectItem>
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`/relatorio/auditoria?turmaId=${turmaId}`, '_blank')} 
                disabled={logs.length === 0}
              >
                <FileBarChart className="h-4 w-4 mr-1" />
                Relatório
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={logs.length === 0 || exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {hasActiveFilters ? 'Nenhum registro encontrado com os filtros aplicados' : 'Nenhum registro de auditoria encontrado'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As ações nesta turma serão registradas automaticamente
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead className="w-[180px]">Usuário</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                    <TableHead className="w-[120px]">Entidade</TableHead>
                    <TableHead className="min-w-[300px]">Descrição</TableHead>
                    <TableHead className="w-[100px]">Método</TableHead>
                    <TableHead className="w-[100px]">Dispositivo</TableHead>
                    <TableHead className="w-[80px]">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={log.id} className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                      <TableCell className="text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDateTime(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{log.usuario_nome}</div>
                            {log.usuario_role && (
                              <div className="text-[10px] text-primary font-medium">
                                {log.usuario_role}{log.usuario_setor ? ` - ${log.usuario_setor}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getAcaoColor(log.acao)}`}>
                          {getAcaoIcon(log.acao)}
                          <span className="ml-1 capitalize">{log.acao}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          {getEntidadeIcon(log.entidade)}
                          <span className="capitalize">{log.entidade.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[400px]">
                          <p className="truncate" title={log.descricao}>{log.descricao}</p>
                          {log.colaborador_nome && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium">Colaborador:</span> {log.colaborador_nome}
                              {log.colaborador_cpf && ` (${log.colaborador_cpf})`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.metodo_origem && (
                          <Badge variant="secondary" className="text-[10px]">
                            {log.metodo_origem === 'qrcode' && <QrCode className="h-3 w-3 mr-1" />}
                            {log.metodo_origem === 'empresa' && <Building2 className="h-3 w-3 mr-1" />}
                            {log.metodo_origem}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getDispositivoIcon(log.dispositivo)}
                          <span>{log.dispositivo || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {logs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalLogs)} de {totalLogs.toLocaleString('pt-BR')} registros</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Por página:</span>
            <Select 
              value={String(itemsPerPage)} 
              onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); setPageInputValue('1'); }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 mx-2">
              <span className="text-sm text-muted-foreground">Página</span>
              <Input
                type="text"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                className="w-14 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">de {totalPages || 1}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de detalhes - Layout institucional/formal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 px-6 pt-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-amber-900">
                  Registro de Auditoria
                </DialogTitle>
                <DialogDescription className="text-xs text-amber-700">
                  Documento para fins de rastreabilidade, perícia e solicitação judicial
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-5 pt-4 text-sm">
              {/* Cabeçalho do registro */}
              <div className="bg-slate-50 rounded-lg p-4 border">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Identificação do Registro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">ID do Registro</span>
                    <span className="font-mono text-xs">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Data/Hora</span>
                    <span className="font-medium">{formatDateTime(selectedLog.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Código da Turma</span>
                    <span className="font-medium">{selectedLog.turma_codigo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Ação / Entidade</span>
                    <span className="font-medium uppercase">{selectedLog.acao}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="capitalize">{selectedLog.entidade.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              
              {/* Descrição */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Descrição da Ação
                </h4>
                <p className="text-sm leading-relaxed text-blue-900">{selectedLog.descricao}</p>
              </div>

              {/* Grid de 2 colunas para informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empresa SST */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Empresa SST Responsável
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block">Razão Social</span>
                      <span className="font-medium">{selectedLog.empresa_sst_razao_social || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">CNPJ</span>
                      <span className="font-mono text-sm">{selectedLog.empresa_sst_cnpj ? formatCNPJ(selectedLog.empresa_sst_cnpj) : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Cliente */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Empresa Cliente
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block">Nome / Razão Social</span>
                      <span className="font-medium">{selectedLog.cliente_razao_social || selectedLog.cliente_nome || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">CNPJ</span>
                      <span className="font-mono text-sm">{selectedLog.cliente_cnpj ? formatCNPJ(selectedLog.cliente_cnpj) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Treinamento */}
              {(selectedLog.treinamento_nome || selectedLog.instrutor_nome) && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Contexto do Treinamento
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">Treinamento</span>
                      <span className="font-medium">{selectedLog.treinamento_nome || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Norma</span>
                      <span className="font-medium">{selectedLog.treinamento_norma || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Instrutor</span>
                      <span className="font-medium">{selectedLog.instrutor_nome || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Email Instrutor</span>
                      <span className="font-medium text-xs">{selectedLog.instrutor_email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">CPF Instrutor</span>
                      <span className="font-mono text-xs">{selectedLog.instrutor_cpf ? formatCPF(selectedLog.instrutor_cpf) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Telefone Instrutor</span>
                      <span className="font-medium">{selectedLog.instrutor_telefone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Formação</span>
                      <span className="font-medium text-xs">{selectedLog.instrutor_formacao || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Usuário responsável */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Usuário Responsável pelo Registro
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Nome</span>
                    <span className="font-medium">{selectedLog.usuario_nome || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">E-mail</span>
                    <span className="font-medium text-xs">{selectedLog.usuario_email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Perfil de Acesso</span>
                    <span className="font-medium">{getRoleLabel(selectedLog.usuario_role)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Setor</span>
                    <span className="font-medium">{selectedLog.usuario_setor || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              {/* Origem da execução */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Origem da Execução
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Executado via</span>
                    <span className="font-medium">
                      {selectedLog.executado_por === 'usuario' && 'Sistema (usuário logado)'}
                      {selectedLog.executado_por === 'colaborador' && 'QR Code / Formulário'}
                      {selectedLog.executado_por === 'instrutor' && 'Aplicativo do Instrutor'}
                      {selectedLog.executado_por === 'sistema' && 'Processo automático'}
                      {!selectedLog.executado_por && 'Sistema'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Nome do Executor</span>
                    <span className="font-medium">{selectedLog.executado_por_nome || selectedLog.usuario_nome || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Método</span>
                    <Badge variant="outline" className="capitalize">{selectedLog.metodo_origem || 'sistema'}</Badge>
                  </div>
                </div>
              </div>
              
              {/* Colaborador envolvido */}
              {selectedLog.colaborador_nome && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Colaborador Envolvido
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Nome Completo</span>
                      <span className="font-medium text-green-900">{selectedLog.colaborador_nome}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">CPF</span>
                      <span className="font-mono text-green-900">{formatCPF(selectedLog.colaborador_cpf)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Valores alterados */}
              {(selectedLog.valor_anterior || selectedLog.valor_novo) && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                  <h4 className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Valores Alterados
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Valor Anterior</span>
                      <span className="font-medium">{selectedLog.valor_anterior || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Valor Novo</span>
                      <span className="font-medium">{selectedLog.valor_novo || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Informações técnicas */}
              <div className="bg-slate-100 rounded-lg p-4 border">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Informações Técnicas de Acesso
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Endereço IP</span>
                    <span className="font-mono text-xs">{selectedLog.ip_address || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Dispositivo</span>
                    <div className="flex items-center gap-1">
                      {getDispositivoIcon(selectedLog.dispositivo)}
                      <span className="font-medium">{selectedLog.dispositivo || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Navegador</span>
                    <span className="font-medium">{selectedLog.navegador || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Sistema Operacional</span>
                    <span className="font-medium">{selectedLog.sistema_operacional || 'N/A'}</span>
                  </div>
                </div>
                {selectedLog.user_agent && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">User Agent</span>
                    <code className="text-[10px] bg-slate-200 p-2 rounded block break-all">{selectedLog.user_agent}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      </div>
  );
}
