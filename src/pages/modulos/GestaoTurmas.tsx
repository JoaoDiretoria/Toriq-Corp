import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useAccessLog } from '@/hooks/useAccessLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Loader2, 
  Search, 
  Calendar, 
  Building2, 
  CheckCircle, 
  Clock, 
  PlayCircle,
  XCircle,
  ArrowLeft,
  FileCheck,
  Trash2,
  AlertTriangle,
  MoreHorizontal,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, parseISO, isAfter, isBefore, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Funções de formatação de CNPJ
const formatCNPJ = (cnpj: string | null): string => {
  if (!cnpj) return '-';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const cleanCNPJ = (cnpj: string): string => cnpj.replace(/\D/g, '');

// Função para obter label descritivo do tipo
const getTipoLabel = (tipo: string): string => {
  const tipoLower = tipo?.toLowerCase() || '';
  if (tipoLower.includes('inicial') || tipoLower.includes('formação') || tipoLower.includes('formacao')) {
    return 'Inicial (Formação)';
  }
  if (tipoLower.includes('periódico') || tipoLower.includes('periodico') || tipoLower.includes('reciclagem')) {
    return 'Periódico (Reciclagem)';
  }
  if (tipoLower.includes('eventual')) {
    return 'Eventual';
  }
  return tipo || 'Inicial (Formação)';
};

interface TurmaValidada {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_id: string;
  treinamento_nome: string;
  treinamento_id: string;
  tipo_treinamento: string;
  data_inicio: string;
  data_fim: string;
  instrutor_nome: string | null;
  quantidade_participantes: number;
  total_colaboradores: number;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  validado: boolean;
  tem_gestao: boolean;
  aulas: { data: string; hora_inicio: string | null; hora_fim: string | null }[];
}

interface GestaoTurmasProps {
  initialSearch?: string;
}

export default function GestaoTurmas({ initialSearch = '' }: GestaoTurmasProps) {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { logView } = useAccessLog();
  const navigate = useNavigate();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [turmas, setTurmas] = useState<TurmaValidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterTreinamento, setFilterTreinamento] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  // Estado para deletar turma
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [turmaToDelete, setTurmaToDelete] = useState<TurmaValidada | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const DELETE_CONFIRM_PHRASE = 'desejo apagar a turma e todos os dados';
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  // Filtros colapsáveis
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (empresaId) {
      fetchTurmasValidadas();
      logView('Treinamentos', 'Gestão de Turmas', 'Acessou a página de gestão de turmas');
    }
  }, [empresaId]);

  const fetchTurmasValidadas = async () => {
    if (!empresaId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          cliente_id,
          treinamento_id,
          tipo_treinamento,
          instrutor_id,
          quantidade_participantes,
          status,
          validado,
          cliente:clientes_sst!turmas_treinamento_cliente_id_fkey(
            nome,
            cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(cnpj)
          ),
          treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          instrutor:instrutores!turmas_treinamento_instrutor_id_fkey(
            nome
          ),
          aulas:turmas_treinamento_aulas(
            data,
            hora_inicio,
            hora_fim
          ),
          colaboradores:turma_colaboradores(id)
        `)
        .eq('empresa_id', empresaId)
        .eq('validado', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const turmasFormatadas: TurmaValidada[] = (data || []).map((t: any) => {
        const aulas = t.aulas || [];
        const datasOrdenadas = aulas
          .map((a: any) => a.data)
          .sort((a: string, b: string) => a.localeCompare(b));
        
        const dataInicio = datasOrdenadas[0] || '';
        const dataFim = datasOrdenadas[datasOrdenadas.length - 1] || dataInicio;

        return {
          id: t.id,
          numero_turma: t.numero_turma,
          codigo_turma: t.codigo_turma || null,
          cliente_id: t.cliente_id,
          cliente_nome: t.cliente?.nome || '',
          cliente_cnpj: t.cliente?.cliente_empresa?.cnpj || null,
          treinamento_id: t.treinamento_id,
          treinamento_nome: `NR ${t.treinamento?.norma} - ${t.treinamento?.nome}`,
          tipo_treinamento: t.tipo_treinamento || 'Inicial',
          data_inicio: dataInicio,
          data_fim: dataFim,
          instrutor_nome: t.instrutor?.nome || null,
          quantidade_participantes: t.quantidade_participantes || 0,
          total_colaboradores: t.colaboradores?.length || 0,
          status: t.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
          validado: t.validado || false,
          tem_gestao: t.instrutor_id !== null && t.quantidade_participantes > 0,
          aulas: aulas.map((a: any) => ({ data: a.data, hora_inicio: a.hora_inicio || null, hora_fim: a.hora_fim || null }))
        };
      });

      setTurmas(turmasFormatadas);
    } catch (error: any) {
      console.error('Erro ao buscar turmas validadas:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (turma: TurmaValidada) => {
    const hoje = new Date();
    const dataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : null;
    const dataFim = turma.data_fim ? parseISO(turma.data_fim) : null;

    // Status explícitos do banco de dados
    if (turma.status === 'cancelado') {
      return { label: 'Cancelado', color: 'bg-destructive/10 text-destructive', icon: XCircle };
    }
    if (turma.status === 'concluido') {
      return { label: 'Concluído', color: 'bg-success/10 text-success', icon: CheckCircle };
    }
    
    // Status calculados baseados nas datas
    if (dataInicio && dataFim) {
      if (isBefore(hoje, dataInicio)) {
        return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar };
      }
      // Se passou a data final mas não foi finalizado, mostrar "Em Andamento" (pendente finalização)
      return { label: 'Em Andamento', color: 'bg-warning/10 text-warning', icon: PlayCircle };
    }
    return { label: 'Agendado', color: 'bg-primary/10 text-primary', icon: Calendar };
  };

  const handleUpdateStatus = async (turmaId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('turmas_treinamento')
        .update({ status: novoStatus })
        .eq('id', turmaId);

      if (error) throw error;

      setTurmas(prev => prev.map(t => 
        t.id === turmaId 
          ? { ...t, status: novoStatus as any }
          : t
      ));

      toast.success('Status atualizado com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteTurma = async () => {
    if (!turmaToDelete || deleteConfirmText.toLowerCase() !== DELETE_CONFIRM_PHRASE) return;
    
    setDeleting(true);
    try {
      const turmaId = turmaToDelete.id;
      
      // 1. Buscar IDs dos colaboradores da turma para apagar presenças
      const { data: colaboradores } = await (supabase as any)
        .from('turma_colaboradores')
        .select('id')
        .eq('turma_id', turmaId);
      
      if (colaboradores && colaboradores.length > 0) {
        const colaboradorIds = colaboradores.map((c: any) => c.id);
        // Presenças dos colaboradores (inclui assinaturas, fotos de validação, etc)
        await (supabase as any)
          .from('turma_colaborador_presencas')
          .delete()
          .in('colaborador_turma_id', colaboradorIds);
      }
      
      // 2. Colaboradores da turma (vínculo turma-colaborador, NÃO apaga o colaborador em si)
      await (supabase as any)
        .from('turma_colaboradores')
        .delete()
        .eq('turma_id', turmaId);
      
      // 3. Colaboradores temporários
      await (supabase as any)
        .from('colaboradores_temporarios')
        .delete()
        .eq('turma_id', turmaId);
      
      // 4. Provas da turma
      await (supabase as any)
        .from('turma_provas')
        .delete()
        .eq('turma_id', turmaId);
      
      // 5. Aulas/datas da turma
      await (supabase as any)
        .from('turmas_treinamento_aulas')
        .delete()
        .eq('turma_id', turmaId);
      
      // 6. Anexos da turma (relatórios, documentos, etc)
      await (supabase as any)
        .from('turma_anexos')
        .delete()
        .eq('turma_id', turmaId);
      
      // 7. Cases de sucesso
      await (supabase as any)
        .from('turma_cases_sucesso')
        .delete()
        .eq('turma_id', turmaId);
      
      // 8. Avaliações de reação
      await (supabase as any)
        .from('avaliacao_reacao_respostas')
        .delete()
        .eq('turma_id', turmaId);
      
      // 9. Certificados emitidos (vínculo, não apaga o colaborador)
      await (supabase as any)
        .from('colaboradores_certificados')
        .delete()
        .eq('turma_id', turmaId);
      
      // 10. Validações digitais de certificados
      await (supabase as any)
        .from('validacao_digital_certificados')
        .delete()
        .eq('turma_id', turmaId);
      
      // 11. Reorientações de colaborador vinculadas à turma
      await (supabase as any)
        .from('reorientacoes_colaborador')
        .delete()
        .eq('turma_id', turmaId);
      
      // 12. Sinistros de colaborador vinculados à turma
      await (supabase as any)
        .from('sinistros_colaborador')
        .delete()
        .eq('turma_id', turmaId);
      
      // 13. Finalmente apagar a turma
      const { error } = await (supabase as any)
        .from('turmas_treinamento')
        .delete()
        .eq('id', turmaId);
      
      if (error) throw error;
      
      setTurmas(prev => prev.filter(t => t.id !== turmaId));
      toast.success('Turma e todos os dados relacionados foram apagados com sucesso');
      setDeleteDialogOpen(false);
      setTurmaToDelete(null);
      setDeleteConfirmText('');
    } catch (error: any) {
      console.error('Erro ao apagar turma:', error);
      toast.error('Erro ao apagar turma: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredTurmas = turmas.filter(turma => {
    // Filtro de busca por texto (inclui código da turma e CNPJ)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const searchClean = searchTerm.replace(/\D/g, '');
      const matchesSearch = 
        turma.treinamento_nome.toLowerCase().includes(searchLower) ||
        turma.cliente_nome.toLowerCase().includes(searchLower) ||
        (turma.instrutor_nome && turma.instrutor_nome.toLowerCase().includes(searchLower)) ||
        (turma.codigo_turma && turma.codigo_turma.toLowerCase().includes(searchLower)) ||
        `turma ${turma.numero_turma}`.toLowerCase().includes(searchLower) ||
        // Busca por CNPJ (com ou sem máscara)
        (turma.cliente_cnpj && (
          turma.cliente_cnpj.toLowerCase().includes(searchLower) ||
          (searchClean.length > 0 && cleanCNPJ(turma.cliente_cnpj).includes(searchClean))
        ));
      
      if (!matchesSearch) return false;
    }
    
    // Filtro de status
    if (filterStatus !== 'all') {
      const statusInfo = getStatusInfo(turma);
      if (filterStatus === 'agendado' && statusInfo.label !== 'Agendado') return false;
      if (filterStatus === 'em_andamento' && statusInfo.label !== 'Em Andamento') return false;
      if (filterStatus === 'concluido' && statusInfo.label !== 'Concluído') return false;
      if (filterStatus === 'cancelado' && statusInfo.label !== 'Cancelado') return false;
    }
    
    // Filtro de tipo de treinamento
    if (filterTipo !== 'all') {
      const tipoNormalizado = turma.tipo_treinamento?.toLowerCase() || '';
      // Inicial = Formação
      if (filterTipo === 'inicial' && !tipoNormalizado.includes('inicial') && !tipoNormalizado.includes('formação') && !tipoNormalizado.includes('formacao')) return false;
      // Periódico = Reciclagem
      if (filterTipo === 'periodico' && !tipoNormalizado.includes('periódico') && !tipoNormalizado.includes('periodico') && !tipoNormalizado.includes('reciclagem')) return false;
      // Eventual
      if (filterTipo === 'eventual' && !tipoNormalizado.includes('eventual')) return false;
    }
    
    // Filtro de treinamento específico
    if (filterTreinamento !== 'all') {
      if (turma.treinamento_id !== filterTreinamento) return false;
    }
    
    // Filtro de datas - lógica:
    // - Se só dataInicio: mostra turmas que começam a partir dessa data
    // - Se só dataFim: mostra turmas que terminam até essa data
    // - Se ambas: mostra turmas dentro do range (início >= dataInicio E fim <= dataFim)
    if (dataInicio || dataFim) {
      const turmaDataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : null;
      const turmaDataFim = turma.data_fim ? parseISO(turma.data_fim) : turmaDataInicio;
      
      // Se tem data de início do filtro, a turma deve começar a partir dessa data
      if (dataInicio && turmaDataInicio) {
        if (isBefore(turmaDataInicio, startOfDay(dataInicio))) return false;
      }
      
      // Se tem data de fim do filtro, a turma deve terminar até essa data
      if (dataFim && turmaDataFim) {
        if (isAfter(turmaDataFim, endOfDay(dataFim))) return false;
      }
    }
    
    return true;
  });

  // Função de exportação
  const handleExportar = (formato: 'excel' | 'csv') => {
    if (filteredTurmas.length === 0) {
      toast.error('Nenhuma turma para exportar');
      return;
    }

    const dados = filteredTurmas.map(turma => {
      const statusInfo = getStatusInfo(turma);
      return {
        'Código': turma.codigo_turma || `Turma ${turma.numero_turma}`,
        'Treinamento': turma.treinamento_nome,
        'Tipo': getTipoLabel(turma.tipo_treinamento),
        'Empresa': turma.cliente_nome,
        'CNPJ': formatCNPJ(turma.cliente_cnpj),
        'Data Início': turma.data_inicio ? format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        'Data Fim': turma.data_fim ? format(parseISO(turma.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        'Instrutor': turma.instrutor_nome || '-',
        'Colaboradores': turma.total_colaboradores,
        'Status': statusInfo.label,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turmas');

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 15 }, // Código
      { wch: 40 }, // Treinamento
      { wch: 20 }, // Tipo
      { wch: 30 }, // Empresa
      { wch: 20 }, // CNPJ
      { wch: 12 }, // Data Início
      { wch: 12 }, // Data Fim
      { wch: 25 }, // Instrutor
      { wch: 12 }, // Participantes
      { wch: 15 }, // Status
    ];
    ws['!cols'] = colWidths;

    const dataAtual = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
    const nomeArquivo = `turmas_${dataAtual}`;

    if (formato === 'excel') {
      XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
      toast.success(`Exportado ${filteredTurmas.length} turmas para Excel`);
    } else {
      XLSX.writeFile(wb, `${nomeArquivo}.csv`, { bookType: 'csv' });
      toast.success(`Exportado ${filteredTurmas.length} turmas para CSV`);
    }
  };

  // Paginação
  const totalPages = Math.ceil(filteredTurmas.length / itemsPerPage);
  const paginatedTurmas = filteredTurmas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Funções de navegação de páginas
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
    setPageInputValue(String(validPage));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
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

  // Resetar página quando filtros mudam
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
    setPageInputValue('1');
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = filterStatus !== 'all' || filterTipo !== 'all' || filterTreinamento !== 'all' || dataInicio || dataFim || searchTerm;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterStatus('all');
    setFilterTipo('all');
    setFilterTreinamento('all');
    setDataInicio(undefined);
    setDataFim(undefined);
    setSearchTerm('');
    setCurrentPage(1);
    setPageInputValue('1');
  };

  // Lista de treinamentos únicos para o filtro (ordenado por NR crescente, depois nome A-Z)
  const treinamentosUnicos = Array.from(
    new Map(turmas.map(t => [t.treinamento_id, { id: t.treinamento_id, nome: t.treinamento_nome }])).values()
  ).sort((a, b) => {
    // Extrair número da NR do nome (ex: "NR 10 - Segurança..." -> 10)
    const nrA = parseInt(a.nome.match(/NR\s*(\d+)/i)?.[1] || '999');
    const nrB = parseInt(b.nome.match(/NR\s*(\d+)/i)?.[1] || '999');
    
    // Primeiro ordena por NR (crescente)
    if (nrA !== nrB) return nrA - nrB;
    
    // Se mesma NR, ordena por nome (A-Z)
    return a.nome.localeCompare(b.nome);
  });

  const estatisticas = {
    total: turmas.length,
    agendados: turmas.filter(t => getStatusInfo(t).label === 'Agendado').length,
    emAndamento: turmas.filter(t => getStatusInfo(t).label === 'Em Andamento').length,
    concluidos: turmas.filter(t => getStatusInfo(t).label === 'Concluído').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/sst?section=toriq-training-dashboard', { replace: true })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              Gestão de Turmas
            </h1>
            <p className="text-sm text-muted-foreground">
              Controle de turmas validadas - prestes a ocorrer, em andamento e concluídas
            </p>
          </div>
        </div>
        
        {/* Botão Exportar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExportar('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportar('csv')}>
              <FileCheck className="h-4 w-4 mr-2" />
              Exportar CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Turmas</p>
                <p className="text-2xl font-bold text-foreground">{estatisticas.total}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">Agendadas</p>
                <p className="text-2xl font-bold text-primary">{estatisticas.agendados}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning">Em Andamento</p>
                <p className="text-2xl font-bold text-warning">{estatisticas.emAndamento}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success">Concluídas</p>
                <p className="text-2xl font-bold text-success">{estatisticas.concluidos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card principal com filtros e tabela */}
      <Card className="flex flex-col border-border">
        <CardHeader className="flex-shrink-0 pb-4">
          {/* Linha de busca e filtros */}
          <div className="flex items-center gap-3">
            {/* Busca */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por treinamento, empresa, CNPJ, código..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setPageInputValue('1'); }}
                className="pl-10 h-10"
              />
            </div>

            {/* Botão Filtros */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="default"
              className="h-10 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {[filterStatus !== 'all', filterTipo !== 'all', filterTreinamento !== 'all', dataInicio, dataFim].filter(Boolean).length}
                </Badge>
              )}
            </Button>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="default"
                className="h-10 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 mt-4 border-t">
              {/* Status */}
              <Select value={filterStatus} onValueChange={(v) => handleFilterChange(setFilterStatus, v)}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="agendado">Agendadas</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluídas</SelectItem>
                  <SelectItem value="cancelado">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Tipo */}
              <Select value={filterTipo} onValueChange={(v) => handleFilterChange(setFilterTipo, v)}>
                <SelectTrigger className="w-[200px] h-10">
                  <SelectValue placeholder="Tipo de Treinamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="inicial">Inicial (Formação)</SelectItem>
                  <SelectItem value="periodico">Periódico (Reciclagem)</SelectItem>
                  <SelectItem value="eventual">Eventual</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Treinamento */}
              <Select value={filterTreinamento} onValueChange={(v) => handleFilterChange(setFilterTreinamento, v)}>
                <SelectTrigger className="w-[280px] h-10">
                  <SelectValue placeholder="Treinamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Treinamentos</SelectItem>
                  {treinamentosUnicos.map((treinamento) => (
                    <SelectItem key={treinamento.id} value={treinamento.id}>
                      {treinamento.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Data Início */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] h-10 justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Data Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => { setDataInicio(date); setCurrentPage(1); setPageInputValue('1'); }}
                    initialFocus
                    locale={ptBR}
                  />
                  {dataInicio && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => { setDataInicio(undefined); setCurrentPage(1); setPageInputValue('1'); }}
                      >
                        Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {/* Data Fim */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] h-10 justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Data Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataFim}
                    onSelect={(date) => { setDataFim(date); setCurrentPage(1); setPageInputValue('1'); }}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => dataInicio ? isBefore(date, dataInicio) : false}
                  />
                  {dataFim && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => { setDataFim(undefined); setCurrentPage(1); setPageInputValue('1'); }}
                      >
                        Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Turma</TableHead>
                  <TableHead className="font-medium">Treinamento</TableHead>
                  <TableHead className="font-medium">Empresa</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium">Instrutor</TableHead>
                  <TableHead className="font-medium text-center">Colaboradores</TableHead>
                  <TableHead className="font-medium text-center">Status</TableHead>
                  <TableHead className="font-medium text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTurmas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Nenhuma turma encontrada com os filtros aplicados'
                        : 'Nenhuma turma validada ainda. Valide turmas na Agenda de Treinamentos.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTurmas.map(turma => {
                    const statusInfo = getStatusInfo(turma);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={turma.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {turma.codigo_turma || `Turma ${turma.numero_turma}`}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[280px]">
                            <span className="text-sm block">
                              {turma.treinamento_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">{getTipoLabel(turma.tipo_treinamento)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">{turma.cliente_nome}</span>
                            </div>
                            {turma.cliente_cnpj && (
                              <span className="text-xs text-muted-foreground ml-6">{formatCNPJ(turma.cliente_cnpj)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {turma.aulas.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {turma.aulas
                                  .sort((a, b) => a.data.localeCompare(b.data))
                                  .map((aula, idx) => (
                                    <div key={idx}>
                                      <span>{format(parseISO(aula.data), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                      {(aula.hora_inicio || aula.hora_fim) && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          {aula.hora_inicio?.slice(0, 5) || ''}{aula.hora_fim ? ` - ${aula.hora_fim.slice(0, 5)}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{turma.instrutor_nome || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{turma.total_colaboradores}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm"
                              onClick={() => window.open(`/modulos/gestao-turmas/${turma.id}`, '_blank')}
                            >
                              Gerenciar Turma
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Extrair mês e ano da data de início da turma
                                    const dataInicio = turma.data_inicio ? parseISO(turma.data_inicio) : new Date();
                                    const mes = dataInicio.getMonth();
                                    const ano = dataInicio.getFullYear();
                                    const codigo = turma.codigo_turma || '';
                                    navigate(`/sst?section=agenda-treinamentos&turmaId=${turma.id}&mes=${mes}&ano=${ano}&codigoTurma=${encodeURIComponent(codigo)}`);
                                  }}
                                >
                                  <CalendarDays className="h-4 w-4 mr-2" />
                                  Ir para Agendamento
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTurmaToDelete(turma);
                                    setDeleteConfirmText('');
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar Turma
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          {filteredTurmas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTurmas.length)} de {filteredTurmas.length} turmas</span>
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
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
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
                  title="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Página anterior"
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
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação para apagar turma */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setTurmaToDelete(null);
          setDeleteConfirmText('');
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar Turma Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a apagar a turma <strong>{turmaToDelete?.codigo_turma || `Turma ${turmaToDelete?.numero_turma}`}</strong> e <strong>TODOS os dados relacionados</strong>:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Lista de presença e assinaturas</li>
                  <li>Fotos de validação facial</li>
                  <li>Provas e resultados</li>
                  <li>Certificados emitidos</li>
                  <li>Aulas e horários</li>
                  <li>Anexos, relatórios e documentos</li>
                  <li>Avaliações de reação</li>
                  <li>Colaboradores temporários</li>
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  Obs: Não apaga instrutores, empresas ou colaboradores cadastrados - apenas os vínculos com esta turma.
                </p>
                <p className="font-medium text-destructive">
                  Esta ação é IRREVERSÍVEL!
                </p>
                <div className="pt-2">
                  <p className="text-sm mb-2">
                    Para confirmar, digite: <code className="bg-muted px-1 py-0.5 rounded text-xs">{DELETE_CONFIRM_PHRASE}</code>
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    autoComplete="off"
                    placeholder="Digite a frase de confirmação..."
                    className="text-sm"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteTurma}
              disabled={deleteConfirmText.toLowerCase() !== DELETE_CONFIRM_PHRASE || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar Turma
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
