import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  History, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  X,
  Plus,
  Pencil,
  Trash2,
  User,
  Calendar,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Settings,
  Save
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useEmpresaWhiteLabel } from '@/hooks/useWhiteLabel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportJobToast, useExportJobs, ExportJob } from './ExportJobToast';
import * as XLSX from 'xlsx';

interface AuditoriaLog {
  id: string;
  turma_id: string | null;
  turma_codigo: string | null;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  usuario_role: string | null;
  usuario_setor: string | null;
  acao: 'criou' | 'atualizou' | 'deletou';
  entidade: string;
  descricao: string;
  dados_anteriores: any;
  dados_novos: any;
  created_at: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
}

interface TurmasAuditoriaPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
}

export function TurmasAuditoriaPopup({ 
  open, 
  onOpenChange, 
  empresaId
}: TurmasAuditoriaPopupProps) {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  // White Label da empresa
  const { config: whiteLabel } = useEmpresaWhiteLabel(empresaId);
  
  // Sistema de exportação em background
  const { jobs, addJob, updateJob, removeJob } = useExportJobs();
  
  // Filtros
  const [filtroAcao, setFiltroAcao] = useState<string>('todos');
  const [filtroEntidade, setFiltroEntidade] = useState<string>('todos');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('');
  const [filtroUsuarioNome, setFiltroUsuarioNome] = useState<string>('');
  const [filtroTurmaCodigo, setFiltroTurmaCodigo] = useState<string>('');
  const [filtroTurmaId, setFiltroTurmaId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Popup de seleção de usuário
  const [usuarioPopupOpen, setUsuarioPopupOpen] = useState(false);
  
  // Popup de configurações de auditoria
  const [configPopupOpen, setConfigPopupOpen] = useState(false);
  const [diasExpiracao, setDiasExpiracao] = useState<number>(60);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [carregandoConfig, setCarregandoConfig] = useState(false);
  
  // Popup de descrição completa
  const [descricaoPopupOpen, setDescricaoPopupOpen] = useState(false);
  const [descricaoSelecionada, setDescricaoSelecionada] = useState<AuditoriaLog | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuarioBusca, setUsuarioBusca] = useState('');
  const [usuarioPage, setUsuarioPage] = useState(1);
  const [usuarioTotalCount, setUsuarioTotalCount] = useState(0);
  const debouncedUsuarioBusca = useDebounce(usuarioBusca, 300);
  
  const debouncedSearch = useDebounce(search, 300);
  const debouncedTurmaCodigo = useDebounce(filtroTurmaCodigo, 300);

  const fetchLogs = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = db
        .from('turmas_auditoria')
        .select('*', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      
      // Aplicar filtros
      if (filtroAcao !== 'todos') {
        query = query.eq('acao', filtroAcao);
      }
      
      if (filtroEntidade !== 'todos') {
        query = query.eq('entidade', filtroEntidade);
      }
      
      if (filtroUsuarioId.trim()) {
        query = query.eq('usuario_id', filtroUsuarioId);
      }
      
      if (debouncedTurmaCodigo.trim()) {
        query = query.ilike('turma_codigo', `%${debouncedTurmaCodigo}%`);
      }
      
      if (filtroTurmaId.trim()) {
        query = query.eq('turma_id', filtroTurmaId);
      }
      
      if (debouncedSearch.trim()) {
        query = query.or(`descricao.ilike.%${debouncedSearch}%,usuario_nome.ilike.%${debouncedSearch}%,turma_codigo.ilike.%${debouncedSearch}%`);
      }
      
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, currentPage, itemsPerPage, filtroAcao, filtroEntidade, filtroUsuarioId, debouncedTurmaCodigo, filtroTurmaId, debouncedSearch]);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filtroAcao, filtroEntidade, filtroUsuarioId, debouncedTurmaCodigo, filtroTurmaId]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Funções de navegação de página
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    setPageInputValue(String(validPage));
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

  // Atualizar pageInputValue quando currentPage muda
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'criou':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'atualizou':
        return <Pencil className="h-4 w-4 text-blue-600" />;
      case 'deletou':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'criou':
        return 'bg-green-100 text-green-800';
      case 'atualizou':
        return 'bg-blue-100 text-blue-800';
      case 'deletou':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Função de exportação em background com suporte a CSV e Excel
  const startExport = async (formatType: 'csv' | 'excel') => {
    const jobId = addJob({
      name: `Auditoria ${format(new Date(), 'dd/MM HH:mm')}`,
      status: 'processing',
      progress: 0,
      format: formatType
    });
    
    // Executar em background usando setTimeout para não bloquear UI
    setTimeout(async () => {
      try {
        const db = supabase as any;
        
        updateJob(jobId, { progress: 10 });
        
        // Buscar todos os logs com os filtros atuais (sem paginação)
        let query = db
          .from('turmas_auditoria')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false });
        
        if (filtroAcao !== 'todos') {
          query = query.eq('acao', filtroAcao);
        }
        
        if (filtroEntidade !== 'todos') {
          query = query.eq('entidade', filtroEntidade);
        }
        
        if (filtroUsuarioId) {
          query = query.eq('usuario_id', filtroUsuarioId);
        }
        
        if (debouncedTurmaCodigo.trim()) {
          query = query.ilike('turma_codigo', `%${debouncedTurmaCodigo}%`);
        }
        
        if (debouncedSearch.trim()) {
          query = query.or(`descricao.ilike.%${debouncedSearch}%,usuario_nome.ilike.%${debouncedSearch}%,turma_codigo.ilike.%${debouncedSearch}%`);
        }
        
        updateJob(jobId, { progress: 30 });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        updateJob(jobId, { progress: 50, totalRecords: data?.length || 0 });
        
        // Preparar dados
        const headers = ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Entidade', 'Treinamento', 'Código Turma', 'Descrição'];
        const rows = (data || []).map((log: AuditoriaLog, index: number) => {
          const dados = log.dados_novos || log.dados_anteriores;
          let dadosParsed = {};
          try {
            dadosParsed = typeof dados === 'string' ? JSON.parse(dados) : (dados || {});
          } catch {
            dadosParsed = {};
          }
          const treinamento = (dadosParsed as any)?.treinamento || '-';
          
          // Atualizar progresso a cada 100 registros
          if (index % 100 === 0) {
            updateJob(jobId, { 
              progress: 50 + Math.floor((index / (data?.length || 1)) * 40),
              processedRecords: index
            });
          }
          
          return {
            'Data/Hora': formatDateTime(log.created_at),
            'Usuário': log.usuario_nome,
            'Email': log.usuario_email || '',
            'Ação': log.acao,
            'Entidade': log.entidade,
            'Treinamento': treinamento,
            'Código Turma': log.turma_codigo || '',
            'Descrição': log.descricao
          };
        });
        
        updateJob(jobId, { progress: 90, processedRecords: data?.length || 0 });
        
        let blob: Blob;
        let fileName: string;
        
        if (formatType === 'excel') {
          // Criar Excel
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
          
          // Ajustar largura das colunas
          const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
          ws['!cols'] = colWidths;
          
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          fileName = `auditoria_turmas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
        } else {
          // Criar CSV
          const csvRows = rows.map(row => 
            headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(';')
          );
          const csvContent = [headers.join(';'), ...csvRows].join('\n');
          blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
          fileName = `auditoria_turmas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        }
        
        // Criar URL para download
        const downloadUrl = URL.createObjectURL(blob);
        
        updateJob(jobId, { 
          status: 'completed', 
          progress: 100, 
          downloadUrl,
          processedRecords: data?.length || 0,
          totalRecords: data?.length || 0
        });
        
        // Auto-download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.click();
        
      } catch (error: any) {
        console.error('Erro ao exportar:', error);
        updateJob(jobId, { 
          status: 'error', 
          error: error?.message || 'Erro ao exportar dados'
        });
      }
    }, 100);
  };
  
  // Função para download de job concluído
  const handleDownloadJob = (job: ExportJob) => {
    if (job.downloadUrl) {
      const link = document.createElement('a');
      link.href = job.downloadUrl;
      link.download = `auditoria_turmas_${format(job.createdAt, 'yyyy-MM-dd_HH-mm')}.${job.format === 'excel' ? 'xlsx' : 'csv'}`;
      link.click();
    }
  };

  const clearFilters = () => {
    setFiltroAcao('todos');
    setFiltroEntidade('todos');
    setFiltroUsuarioId('');
    setFiltroUsuarioNome('');
    setFiltroTurmaCodigo('');
    setFiltroTurmaId('');
    setSearch('');
  };

  const hasActiveFilters = filtroAcao !== 'todos' || filtroEntidade !== 'todos' || filtroUsuarioId.trim() || filtroTurmaCodigo.trim() || filtroTurmaId.trim() || search.trim();
  
  // Função para filtrar por turma_id (rastrear todas as ações de uma turma)
  const handleFilterByTurmaId = (turmaId: string | null) => {
    if (turmaId) {
      setFiltroTurmaId(turmaId);
      setShowFilters(true);
    }
  };

  // Buscar usuários da empresa
  const fetchUsuarios = useCallback(async () => {
    if (!empresaId) return;
    
    setUsuariosLoading(true);
    try {
      const USUARIOS_PER_PAGE = 10;
      const from = (usuarioPage - 1) * USUARIOS_PER_PAGE;
      const to = from + USUARIOS_PER_PAGE - 1;
      
      let query = supabase
        .from('profiles')
        .select('id, nome, email, cpf', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });
      
      if (debouncedUsuarioBusca.trim()) {
        query = query.or(`nome.ilike.%${debouncedUsuarioBusca}%,cpf.ilike.%${debouncedUsuarioBusca}%,email.ilike.%${debouncedUsuarioBusca}%`);
      }
      
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setUsuarios(data || []);
      setUsuarioTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setUsuariosLoading(false);
    }
  }, [empresaId, usuarioPage, debouncedUsuarioBusca]);

  useEffect(() => {
    if (usuarioPopupOpen) {
      fetchUsuarios();
    }
  }, [usuarioPopupOpen, fetchUsuarios]);

  useEffect(() => {
    setUsuarioPage(1);
  }, [debouncedUsuarioBusca]);

  const usuarioTotalPages = Math.ceil(usuarioTotalCount / 10);

  const handleSelectUsuario = (usuario: Usuario) => {
    setFiltroUsuarioId(usuario.id);
    setFiltroUsuarioNome(usuario.nome);
    setUsuarioPopupOpen(false);
    setUsuarioBusca('');
  };

  // Carregar configurações de auditoria
  const fetchConfig = useCallback(async () => {
    if (!empresaId) return;
    
    setCarregandoConfig(true);
    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('auditoria_config')
        .select('dias_expiracao')
        .eq('empresa_id', empresaId)
        .single();
      
      if (data) {
        setDiasExpiracao(data.dias_expiracao);
      } else {
        // Valor padrão se não existir configuração
        setDiasExpiracao(60);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setDiasExpiracao(60);
    } finally {
      setCarregandoConfig(false);
    }
  }, [empresaId]);

  // Salvar configurações de auditoria
  const handleSalvarConfig = async () => {
    if (!empresaId) return;
    
    setSalvandoConfig(true);
    try {
      const db = supabase as any;
      
      // Upsert - insere ou atualiza
      const { error } = await db
        .from('auditoria_config')
        .upsert({
          empresa_id: empresaId,
          dias_expiracao: diasExpiracao,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'empresa_id'
        });
      
      if (error) throw error;
      
      setConfigPopupOpen(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSalvandoConfig(false);
    }
  };

  // Carregar config quando abrir o popup
  useEffect(() => {
    if (configPopupOpen) {
      fetchConfig();
    }
  }, [configPopupOpen, fetchConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-6 w-6" />
              Auditoria de Agendamentos
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigPopupOpen(true)}
                title="Configurações de Auditoria"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-accent' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    !
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => startExport('csv')}>
                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startExport('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Exportar Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>
        
        {/* Área de filtros */}
        {showFilters && (
          <div className="px-6 py-4 bg-muted/30 border-b">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Busca geral */}
              <div className="md:col-span-2">
                <Label className="text-xs font-medium mb-1.5 block">Busca geral</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar em descrição, usuário, código..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Filtro por ação */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Ação</Label>
                <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="criou">Criou</SelectItem>
                    <SelectItem value="atualizou">Atualizou</SelectItem>
                    <SelectItem value="deletou">Deletou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por entidade */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Entidade</Label>
                <Select value={filtroEntidade} onValueChange={setFiltroEntidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="turma">Turma</SelectItem>
                    <SelectItem value="aula">Aula</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="presenca">Presença</SelectItem>
                    <SelectItem value="instrutor">Instrutor</SelectItem>
                    <SelectItem value="certificado">Certificado</SelectItem>
                    <SelectItem value="prova">Prova</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por usuário */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Usuário</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal h-10"
                  onClick={() => setUsuarioPopupOpen(true)}
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  {filtroUsuarioNome || 'Selecionar usuário...'}
                  {filtroUsuarioId && (
                    <X 
                      className="h-4 w-4 ml-auto hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiltroUsuarioId('');
                        setFiltroUsuarioNome('');
                      }}
                    />
                  )}
                </Button>
              </div>
              
              {/* Filtro por código da turma */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Código da Turma</Label>
                <Input
                  placeholder="Ex: T-2026-001"
                  value={filtroTurmaCodigo}
                  onChange={(e) => setFiltroTurmaCodigo(e.target.value)}
                />
              </div>
              
              {/* Filtro por ID da turma */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">ID da Turma</Label>
                <Input
                  placeholder="Cole o ID aqui"
                  value={filtroTurmaId}
                  onChange={(e) => setFiltroTurmaId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              
              {/* Botão limpar filtros */}
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tabela de logs */}
        <div className="flex-1 overflow-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {hasActiveFilters ? 'Nenhum registro encontrado com os filtros aplicados' : 'Nenhum registro de auditoria encontrado'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As ações em turmas serão registradas automaticamente aqui
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-0 overflow-x-auto">
                <div className="min-w-max" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted border-b border-border">
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[150px] min-w-[150px]">Data/Hora</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[240px] min-w-[240px]">Usuário</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[100px] min-w-[100px]">Ação</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[100px] min-w-[100px]">Entidade</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[220px] min-w-[220px]">Treinamento</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[120px] min-w-[120px]">Código</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[280px] min-w-[280px]">ID Turma</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground border-r border-border text-center align-middle bg-muted w-[100px] min-w-[100px]">Rastrear</th>
                        <th className="h-11 px-4 font-semibold text-xs text-foreground text-center align-middle bg-muted w-[250px] min-w-[250px]">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={log.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                          <td className="py-2.5 px-4 text-xs whitespace-nowrap border-r border-border text-center align-middle bg-inherit">
                            <div className="flex items-center justify-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDateTime(log.created_at)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-xs border-r border-border align-middle bg-inherit">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{log.usuario_nome}</div>
                                {(log.usuario_role || log.usuario_setor) && (
                                  <div className="text-[10px] text-primary font-medium">
                                    {log.usuario_role || ''}{log.usuario_role && log.usuario_setor ? ' - ' : ''}{log.usuario_setor || ''}
                                  </div>
                                )}
                                {log.usuario_email && (
                                  <div className="text-[10px] text-muted-foreground truncate">{log.usuario_email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-xs border-r border-border text-center align-middle bg-inherit">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${getAcaoColor(log.acao)}`}>
                              {getAcaoIcon(log.acao)}
                              {log.acao.charAt(0).toUpperCase() + log.acao.slice(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs border-r border-border text-center align-middle bg-inherit">
                            <span className="capitalize">{log.entidade}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs border-r border-border align-middle bg-inherit">
                            {(() => {
                              const dados = log.dados_novos || log.dados_anteriores;
                              let dadosParsed = {};
                              try {
                                dadosParsed = typeof dados === 'string' ? JSON.parse(dados) : (dados || {});
                              } catch { dadosParsed = {}; }
                              const treinamento = (dadosParsed as any)?.treinamento || '-';
                              return (
                                <span className="truncate block max-w-[200px]" title={treinamento}>
                                  {treinamento}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-mono font-semibold border-r border-border text-center align-middle bg-inherit">
                            {log.turma_codigo || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-mono text-muted-foreground border-r border-border text-center align-middle bg-inherit">
                            {log.turma_id ? (
                              <span title={log.turma_id} className="text-[10px]">
                                {log.turma_id}
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-xs border-r border-border text-center align-middle bg-inherit">
                            {log.turma_id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1"
                                onClick={() => handleFilterByTurmaId(log.turma_id)}
                                title="Ver todas as ações desta turma"
                              >
                                <Search className="h-3 w-3" />
                                Rastrear
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-xs align-middle bg-inherit">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-0.5 px-1.5 text-left justify-start font-normal hover:bg-muted max-w-full"
                              onClick={() => {
                                setDescricaoSelecionada(log);
                                setDescricaoPopupOpen(true);
                              }}
                            >
                              <div className="truncate text-xs max-w-[200px]">
                                {log.descricao.length > 50 ? log.descricao.substring(0, 50) + '...' : log.descricao}
                              </div>
                              <FileText className="h-3 w-3 ml-1 flex-shrink-0 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Paginação estilo SSTClientes */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount.toLocaleString('pt-BR')} registros</span>
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
                  <SelectItem value="20">20</SelectItem>
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
                disabled={currentPage === 1 || loading}
                title="Primeira página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || loading}
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
                disabled={currentPage >= totalPages || loading}
                title="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages || loading}
                title="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Popup de seleção de usuário */}
      <Dialog open={usuarioPopupOpen} onOpenChange={setUsuarioPopupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Selecionar Usuário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={usuarioBusca}
                onChange={(e) => setUsuarioBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Lista de usuários */}
            <div className="border rounded-md max-h-[300px] overflow-auto">
              {usuariosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {usuarios.map((usuario) => (
                    <button
                      key={usuario.id}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                      onClick={() => handleSelectUsuario(usuario)}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{usuario.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {usuario.email}
                          {usuario.cpf && ` • CPF: ${usuario.cpf}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Paginação */}
            {usuarioTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {usuarioTotalCount} usuário{usuarioTotalCount !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsuarioPage(p => Math.max(1, p - 1))}
                    disabled={usuarioPage === 1 || usuariosLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs px-2">
                    {usuarioPage} / {usuarioTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsuarioPage(p => Math.min(usuarioTotalPages, p + 1))}
                    disabled={usuarioPage === usuarioTotalPages || usuariosLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de descrição completa */}
      <Dialog open={descricaoPopupOpen} onOpenChange={setDescricaoPopupOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Ação
            </DialogTitle>
          </DialogHeader>
          
          {descricaoSelecionada && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data/Hora:</span>
                  <p className="font-medium">
                    {format(new Date(descricaoSelecionada.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>
                  <p className="font-medium">{descricaoSelecionada.usuario_nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ação:</span>
                  <p className="font-medium capitalize">{descricaoSelecionada.acao}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entidade:</span>
                  <p className="font-medium capitalize">{descricaoSelecionada.entidade}</p>
                </div>
                {descricaoSelecionada.turma_id && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ID da Turma:</span>
                    <p className="font-mono text-xs">{descricaoSelecionada.turma_id}</p>
                  </div>
                )}
                {descricaoSelecionada.turma_codigo && (
                  <div>
                    <span className="text-muted-foreground">Código da Turma:</span>
                    <p className="font-mono font-semibold">{descricaoSelecionada.turma_codigo}</p>
                  </div>
                )}
              </div>
              
              {/* Descrição completa */}
              <div>
                <span className="text-muted-foreground text-sm">Descrição:</span>
                <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                  {descricaoSelecionada.descricao}
                </div>
              </div>
              
              {/* Dados anteriores */}
              {descricaoSelecionada.dados_anteriores && (() => {
                // Parse se for string
                const dados = typeof descricaoSelecionada.dados_anteriores === 'string' 
                  ? JSON.parse(descricaoSelecionada.dados_anteriores) 
                  : descricaoSelecionada.dados_anteriores;
                if (!dados || Object.keys(dados).length === 0) return null;
                
                // Filtrar campos _id se já existir o campo sem _id
                const camposParaExibir = Object.entries(dados).filter(([key]) => {
                  if (key.endsWith('_id')) {
                    const campoNome = key.replace('_id', '');
                    return !dados[campoNome];
                  }
                  return true;
                });
                
                // Mapa de labels amigáveis
                const labelMap: Record<string, string> = {
                  cliente: 'Cliente',
                  treinamento: 'Treinamento',
                  tipo_treinamento: 'Tipo',
                  carga_horaria: 'Carga Horária',
                  carga_horaria_total: 'Carga Horária',
                  quantidade_participantes: 'Participantes',
                  instrutor: 'Instrutor',
                  instrutor_nome: 'Instrutor',
                  status: 'Status',
                  validado: 'Validado',
                  aulas: 'Aulas',
                  observacoes: 'Observações'
                };
                
                return (
                  <div>
                    <span className="text-muted-foreground text-sm font-medium">Dados Anteriores:</span>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-sm space-y-2">
                      {camposParaExibir.map(([key, value]) => {
                        const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        let displayValue = '';
                        if (value === null || value === undefined) {
                          displayValue = '-';
                        } else if (Array.isArray(value)) {
                          displayValue = value.map((item: any, i: number) => {
                            if (typeof item === 'object' && item !== null) {
                              if (item.data) {
                                return `Aula ${i + 1}: ${new Date(item.data).toLocaleDateString('pt-BR')} ${item.hora_inicio || item.inicio || ''}-${item.hora_fim || item.fim || ''}`;
                              }
                              return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
                            }
                            return String(item);
                          }).join('\n');
                        } else if (typeof value === 'object') {
                          displayValue = Object.entries(value as object).map(([k, v]) => `${k}: ${v}`).join(', ');
                        } else if (typeof value === 'boolean') {
                          displayValue = value ? 'Sim' : 'Não';
                        } else {
                          displayValue = String(value);
                        }
                        return (
                          <div key={key} className="border-b border-red-200 pb-1 last:border-0 last:pb-0">
                            <span className="text-red-700 font-semibold">{label}:</span>
                            <p className="text-red-900 whitespace-pre-wrap ml-2">{displayValue}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Dados novos */}
              {descricaoSelecionada.dados_novos && (() => {
                // Parse se for string
                const dados = typeof descricaoSelecionada.dados_novos === 'string' 
                  ? JSON.parse(descricaoSelecionada.dados_novos) 
                  : descricaoSelecionada.dados_novos;
                if (!dados || Object.keys(dados).length === 0) return null;
                
                // Filtrar campos _id se já existir o campo sem _id
                const camposParaExibir = Object.entries(dados).filter(([key]) => {
                  if (key.endsWith('_id')) {
                    const campoNome = key.replace('_id', '');
                    return !dados[campoNome];
                  }
                  return true;
                });
                
                // Mapa de labels amigáveis
                const labelMap: Record<string, string> = {
                  cliente: 'Cliente',
                  treinamento: 'Treinamento',
                  tipo_treinamento: 'Tipo',
                  carga_horaria: 'Carga Horária',
                  carga_horaria_total: 'Carga Horária',
                  quantidade_participantes: 'Participantes',
                  instrutor: 'Instrutor',
                  instrutor_nome: 'Instrutor',
                  status: 'Status',
                  validado: 'Validado',
                  aulas: 'Aulas',
                  observacoes: 'Observações',
                  codigo_turma: 'Código da Turma'
                };
                
                return (
                  <div>
                    <span className="text-muted-foreground text-sm font-medium">Dados Novos:</span>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md text-sm space-y-2">
                      {camposParaExibir.map(([key, value]) => {
                        const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        let displayValue = '';
                        if (value === null || value === undefined) {
                          displayValue = '-';
                        } else if (Array.isArray(value)) {
                          displayValue = value.map((item: any, i: number) => {
                            if (typeof item === 'object' && item !== null) {
                              if (item.data) {
                                return `Aula ${i + 1}: ${new Date(item.data).toLocaleDateString('pt-BR')} ${item.hora_inicio || item.inicio || ''}-${item.hora_fim || item.fim || ''}`;
                              }
                              return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
                            }
                            return String(item);
                          }).join('\n');
                        } else if (typeof value === 'object') {
                          displayValue = Object.entries(value as object).map(([k, v]) => `${k}: ${v}`).join(', ');
                        } else if (typeof value === 'boolean') {
                          displayValue = value ? 'Sim' : 'Não';
                        } else {
                          displayValue = String(value);
                        }
                        return (
                          <div key={key} className="border-b border-green-200 pb-1 last:border-0 last:pb-0">
                            <span className="text-green-700 font-semibold">{label}:</span>
                            <p className="text-green-900 whitespace-pre-wrap ml-2">{displayValue}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Toast de exportação em background */}
      <ExportJobToast 
        jobs={jobs} 
        onRemoveJob={removeJob} 
        onDownload={handleDownloadJob} 
      />
      
      {/* Popup de configurações de auditoria */}
      <Dialog open={configPopupOpen} onOpenChange={setConfigPopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Auditoria
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {carregandoConfig ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Tempo de Expiração dos Logs
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Logs de auditoria mais antigos que o período selecionado serão automaticamente removidos diariamente.
                  </p>
                  <Select
                    value={String(diasExpiracao)}
                    onValueChange={(value) => setDiasExpiracao(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="45">45 dias</SelectItem>
                      <SelectItem value="60">60 dias (padrão)</SelectItem>
                      <SelectItem value="75">75 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Atenção:</strong> Uma rotina automática é executada diariamente para remover logs com mais de {diasExpiracao} dias. 
                    Esta ação é irreversível.
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setConfigPopupOpen(false)}
              disabled={salvandoConfig}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarConfig}
              disabled={salvandoConfig || carregandoConfig}
              className="bg-primary hover:bg-primary/90"
            >
              {salvandoConfig ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
