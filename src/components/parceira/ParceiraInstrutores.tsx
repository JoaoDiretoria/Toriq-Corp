import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';
import { 
  UserCheck, 
  Loader2, 
  Plus, 
  Pencil, 
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  GraduationCap,
  Award,
  FileUp,
  AlertCircle,
  Key,
  KeyRound,
  User,
  FileText,
  Users,
  Eye,
  Wrench,
  Image,
  MapPin,
  Phone,
  Mail,
  Building2,
  ClipboardList,
  MessageCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  Filter,
  X,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstrutorCadastroDialog } from '@/components/sst/InstrutorCadastroDialog';
import { InstrutorDocumentosDialog } from '@/components/sst/InstrutorDocumentosDialog';
import { InstrutorDatasIndisponiveisDialog } from '@/components/sst/InstrutorDatasIndisponiveisDialog';
import { InstrutorSolicitacoesTab } from '@/components/sst/InstrutorSolicitacoesTab';
import { InstrutorSuporteTab } from '@/components/sst/InstrutorSuporteTab';
import { ControleIndisponibilidade } from '@/components/shared/ControleIndisponibilidade';
import { CalendarX } from 'lucide-react';

interface Instrutor {
  id: string;
  empresa_id: string;
  empresa_parceira_id: string | null;
  user_id?: string | null;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  veiculo?: string;
  placa?: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  formacao_academica?: string;
  formacoes_count: number;
  treinamentos_count: number;
  ativo: boolean;
  apto?: boolean;
  created_at: string;
  updated_at: string;
}

interface InstrutorFormacao {
  id: string;
  instrutor_id: string;
  nome: string;
  documento_url?: string;
  created_at: string;
}

interface InstrutorTreinamento {
  id: string;
  instrutor_id: string;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma?: string;
  documento_url?: string;
  created_at: string;
}

export function ParceiraInstrutores() {
  const { profile, empresa, loading: authLoading } = useAuth();
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [empresaParceiraId, setEmpresaParceiraId] = useState<string | null>(null);
  const [empresaSstId, setEmpresaSstId] = useState<string | null>(null);
  
  // Tab principal
  const [activeMainTab, setActiveMainTab] = useState('instrutores');
  
  // Formações acadêmicas para exibir na coluna (nomes das formações)
  const [instrutorFormacoes, setInstrutorFormacoes] = useState<Record<string, string[]>>({});
  
  // Estado para aptidão dos instrutores
  interface AptidaoInfo {
    apto: boolean;
    temFormacao: boolean;
    formacoesComAnexo: number;
    formacoesSemAnexo: string[];
    temTreinamento: boolean;
    treinamentosComAnexo: number;
    treinamentosSemAnexo: string[];
  }
  const [instrutorAptidao, setInstrutorAptidao] = useState<Record<string, AptidaoInfo>>({});
  
  // Dialog para mostrar detalhes de aptidão
  const [aptidaoDialogOpen, setAptidaoDialogOpen] = useState(false);
  const [selectedInstrutorAptidao, setSelectedInstrutorAptidao] = useState<{instrutor: Instrutor; aptidao: AptidaoInfo} | null>(null);
  
  // Filtros da tabela
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const [filtroApto, setFiltroApto] = useState<'todos' | 'aptos' | 'nao_aptos'>('todos');
  const [filtroFormacao, setFiltroFormacao] = useState<string>('');
  const [filtroNR, setFiltroNR] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstrutor, setEditingInstrutor] = useState<Instrutor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instrutorToDelete, setInstrutorToDelete] = useState<Instrutor | null>(null);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [instrutorDocumentos, setInstrutorDocumentos] = useState<Instrutor | null>(null);
  const [datasIndisponiveisDialogOpen, setDatasIndisponiveisDialogOpen] = useState(false);
  const [instrutorDatasIndisponiveis, setInstrutorDatasIndisponiveis] = useState<Instrutor | null>(null);
  
  // Dialog de acesso
  const [acessoDialogOpen, setAcessoDialogOpen] = useState(false);
  const [instrutorAcesso, setInstrutorAcesso] = useState<Instrutor | null>(null);
  const [acessoSenha, setAcessoSenha] = useState('');
  const [criandoAcesso, setCriandoAcesso] = useState(false);

  // Expanded row data
  const [formacoes, setFormacoes] = useState<Record<string, InstrutorFormacao[]>>({});
  const [treinamentos, setTreinamentos] = useState<Record<string, InstrutorTreinamento[]>>({});
  
  // NRs dos treinamentos para exibir na coluna
  const [instrutorNRs, setInstrutorNRs] = useState<Record<string, string[]>>({});
  
  // Rastrear se há documentos pendentes para cada instrutor
  const [documentosPendentes, setDocumentosPendentes] = useState<Record<string, boolean>>({});
  
  // Aba expandida do instrutor
  const [expandedTab, setExpandedTab] = useState<Record<string, string>>({});
  
  // Turmas do instrutor
  interface TurmaInstrutor {
    id: string;
    codigo_turma: string;
    status: string;
    treinamento_nome: string;
    treinamento_norma: string;
    cliente_nome: string;
    total_colaboradores: number;
    datas: string[];
  }
  const [instrutorTurmas, setInstrutorTurmas] = useState<Record<string, TurmaInstrutor[]>>({});
  const [turmasSearchTerm, setTurmasSearchTerm] = useState<Record<string, string>>({});
  const [turmasStatusFilter, setTurmasStatusFilter] = useState<Record<string, string>>({});
  const [loadingTurmas, setLoadingTurmas] = useState<Record<string, boolean>>({});
  
  // Assinatura do instrutor
  const [instrutorAssinatura, setInstrutorAssinatura] = useState<Record<string, string | null>>({});
  
  // Equipamentos do instrutor
  interface EquipamentoInstrutor {
    treinamento_id: string;
    treinamento_nome: string;
    treinamento_norma: string;
    equipamento_nome: string;
    quantidade: number;
  }
  const [instrutorEquipamentos, setInstrutorEquipamentos] = useState<Record<string, EquipamentoInstrutor[]>>({});
  const [loadingEquipamentos, setLoadingEquipamentos] = useState<Record<string, boolean>>({});

  // Buscar o ID da empresa_parceira vinculada a esta empresa
  useEffect(() => {
    const fetchEmpresaParceiraId = async () => {
      // Usar empresa?.id ou profile?.empresa_id como fallback
      const empresaIdToUse = empresa?.id || profile?.empresa_id;
      
      // Se auth ainda está carregando, aguardar
      if (authLoading) {
        console.log('[ParceiraInstrutores] Auth ainda carregando...');
        return;
      }
      
      if (!empresaIdToUse) {
        console.log('[ParceiraInstrutores] Nenhum empresa_id disponível');
        setLoading(false);
        return;
      }

      console.log('[ParceiraInstrutores] Buscando vínculo para empresa_id:', empresaIdToUse);

      try {
        // Buscar o registro em empresas_parceiras onde parceira_empresa_id = empresa.id
        const { data, error } = await supabase
          .from('empresas_parceiras')
          .select('id, empresa_sst_id')
          .eq('parceira_empresa_id', empresaIdToUse)
          .maybeSingle();

        if (error) throw error;
        
        console.log('[ParceiraInstrutores] Resultado da busca:', data);
        
        if (data) {
          setEmpresaParceiraId(data.id);
          setEmpresaSstId(data.empresa_sst_id);
        } else {
          // Não encontrou vínculo - parar loading
          console.log('[ParceiraInstrutores] Nenhum vínculo encontrado');
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa parceira:', error);
        setLoading(false);
      }
    };

    fetchEmpresaParceiraId();
  }, [empresa?.id, profile?.empresa_id, authLoading]);

  useEffect(() => {
    if (empresaParceiraId) {
      fetchInstrutores();
    }
  }, [empresaParceiraId]);

  // Buscar NRs e status de documentos de todos os instrutores
  const fetchInstrutorNRs = async (instrutorIds: string[]) => {
    if (instrutorIds.length === 0) return;

    try {
      const db = supabase as any;

      // Buscar formações com anexo_url e nome
      const { data: formacoesData, error: formacoesError } = await db
        .from('instrutor_formacoes')
        .select('instrutor_id, nome, anexo_url')
        .in('instrutor_id', instrutorIds);

      if (formacoesError) throw formacoesError;

      // Buscar vínculos formação-treinamento com anexo_url e NRs (fonte única de treinamentos)
      const { data: vinculosData, error: vinculosError } = await db
        .from('instrutor_formacao_treinamento')
        .select('instrutor_id, anexo_url, catalogo_treinamentos (norma)')
        .in('instrutor_id', instrutorIds);

      if (vinculosError) console.error('Erro ao buscar vínculos:', vinculosError);

      const nrsByInstrutor: Record<string, string[]> = {};
      const pendentes: Record<string, boolean> = {};
      
      // Inicializar todos os instrutores como sem pendências
      instrutorIds.forEach(id => {
        pendentes[id] = false;
      });

      // Processar vínculos para NRs e verificar anexos pendentes de treinamentos
      (vinculosData || []).forEach((item: any) => {
        const instrutorId = item.instrutor_id;
        const norma = item.catalogo_treinamentos?.norma;
        
        // Verificar NRs
        if (norma) {
          if (!nrsByInstrutor[instrutorId]) {
            nrsByInstrutor[instrutorId] = [];
          }
          if (!nrsByInstrutor[instrutorId].includes(norma)) {
            nrsByInstrutor[instrutorId].push(norma);
          }
        }
        
        // Verificar anexo pendente de treinamento
        if (item.anexo_url === null || item.anexo_url === undefined || item.anexo_url === '') {
          pendentes[instrutorId] = true;
        }
      });

      // Processar formações - verificar anexo pendente e coletar nomes
      const formacoesByInstrutor: Record<string, string[]> = {};
      
      (formacoesData || []).forEach((item: any) => {
        const instrutorId = item.instrutor_id;
        
        // Coletar nomes das formações
        if (item.nome) {
          if (!formacoesByInstrutor[instrutorId]) {
            formacoesByInstrutor[instrutorId] = [];
          }
          if (!formacoesByInstrutor[instrutorId].includes(item.nome)) {
            formacoesByInstrutor[instrutorId].push(item.nome);
          }
        }
        
        // Verificar anexo pendente
        if (item.anexo_url === null || item.anexo_url === undefined || item.anexo_url === '') {
          pendentes[instrutorId] = true;
        }
      });

      // Ordenar NRs por número
      Object.keys(nrsByInstrutor).forEach(id => {
        nrsByInstrutor[id].sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '') || '999');
          const numB = parseInt(b.replace(/\D/g, '') || '999');
          return numA - numB;
        });
      });

      setInstrutorNRs(nrsByInstrutor);
      setInstrutorFormacoes(formacoesByInstrutor);
      setDocumentosPendentes(pendentes);
    } catch (error) {
      console.error('Erro ao buscar NRs dos instrutores:', error);
    }
  };

  const fetchInstrutores = async () => {
    if (!empresaParceiraId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instrutores')
        .select('*')
        .eq('empresa_parceira_id', empresaParceiraId)
        .order('nome');

      if (error) throw error;
      setInstrutores(data || []);
      
      // Buscar NRs para todos os instrutores
      if (data && data.length > 0) {
        fetchInstrutorNRs(data.map((i: Instrutor) => i.id));
      }
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
      toast.error('Erro ao carregar instrutores');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstrutorDetails = async (instrutorId: string) => {
    try {
      console.log('[ParceiraInstrutores] Buscando detalhes do instrutor:', instrutorId);
      
      // Fetch formações
      const { data: formacoesData, error: formacoesError } = await supabase
        .from('instrutor_formacoes')
        .select('*')
        .eq('instrutor_id', instrutorId);

      console.log('[ParceiraInstrutores] Formações:', formacoesData, 'Erro:', formacoesError);
      if (formacoesError) throw formacoesError;
      setFormacoes(prev => ({ ...prev, [instrutorId]: formacoesData || [] }));

      // Fetch treinamentos com nome e norma do catálogo
      const { data: treinamentosData, error: treinamentosError } = await supabase
        .from('instrutor_treinamentos')
        .select(`
          *,
          catalogo_treinamentos (nome, norma)
        `)
        .eq('instrutor_id', instrutorId);

      console.log('[ParceiraInstrutores] Treinamentos:', treinamentosData, 'Erro:', treinamentosError);
      if (treinamentosError) throw treinamentosError;
      
      const mappedTreinamentos = (treinamentosData || []).map((t: any) => ({
        ...t,
        treinamento_nome: t.catalogo_treinamentos?.nome || 'Treinamento não encontrado',
        treinamento_norma: t.catalogo_treinamentos?.norma || ''
      }));
      
      // Ordenar por número da NR
      mappedTreinamentos.sort((a: any, b: any) => {
        const numA = parseInt(a.treinamento_norma?.replace(/\D/g, '') || '999');
        const numB = parseInt(b.treinamento_norma?.replace(/\D/g, '') || '999');
        return numA - numB;
      });
      
      setTreinamentos(prev => ({ ...prev, [instrutorId]: mappedTreinamentos }));
    } catch (error) {
      console.error('Erro ao buscar detalhes do instrutor:', error);
    }
  };

  // Buscar turmas do instrutor
  const fetchInstrutorTurmas = async (instrutorId: string) => {
    if (instrutorTurmas[instrutorId]) return;
    
    setLoadingTurmas(prev => ({ ...prev, [instrutorId]: true }));
    
    try {
      const { data: turmas, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          status,
          cliente_id,
          catalogo_treinamentos (nome, norma),
          turmas_treinamento_aulas (data)
        `)
        .eq('instrutor_id', instrutorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Buscar nomes dos clientes
      const clienteIds = [...new Set((turmas || []).map((t: any) => t.cliente_id).filter(Boolean))];
      const clientesMap: Record<string, string> = {};
      
      if (clienteIds.length > 0) {
        const { data: clientes } = await (supabase as any)
          .from('clientes_sst')
          .select('id, nome')
          .in('id', clienteIds);
        
        (clientes || []).forEach((c: any) => {
          clientesMap[c.id] = c.nome;
        });
      }
      
      // Buscar contagem de colaboradores
      const turmasIds = (turmas || []).map((t: any) => t.id);
      const colaboradoresCount: Record<string, number> = {};
      
      if (turmasIds.length > 0) {
        const { data: colaboradores } = await (supabase as any)
          .from('turma_colaboradores')
          .select('turma_id')
          .in('turma_id', turmasIds);
        
        (colaboradores || []).forEach((c: any) => {
          colaboradoresCount[c.turma_id] = (colaboradoresCount[c.turma_id] || 0) + 1;
        });
      }
      
      const turmasFormatadas: TurmaInstrutor[] = (turmas || []).map((t: any) => ({
        id: t.id,
        codigo_turma: t.codigo_turma || '-',
        status: t.status,
        treinamento_nome: t.catalogo_treinamentos?.nome || '-',
        treinamento_norma: t.catalogo_treinamentos?.norma || '-',
        cliente_nome: clientesMap[t.cliente_id] || '-',
        total_colaboradores: colaboradoresCount[t.id] || 0,
        datas: (t.turmas_treinamento_aulas || []).map((a: any) => a.data).filter(Boolean).sort()
      }));
      
      setInstrutorTurmas(prev => ({ ...prev, [instrutorId]: turmasFormatadas }));
    } catch (error) {
      console.error('Erro ao buscar turmas do instrutor:', error);
    } finally {
      setLoadingTurmas(prev => ({ ...prev, [instrutorId]: false }));
    }
  };

  // Buscar assinatura do instrutor
  const fetchInstrutorAssinatura = async (instrutorId: string) => {
    if (instrutorAssinatura[instrutorId] !== undefined) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('instrutores')
        .select('assinatura_url')
        .eq('id', instrutorId)
        .single();
      
      if (error) throw error;
      setInstrutorAssinatura(prev => ({ ...prev, [instrutorId]: data?.assinatura_url || null }));
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      setInstrutorAssinatura(prev => ({ ...prev, [instrutorId]: null }));
    }
  };

  // Buscar equipamentos do instrutor
  const fetchInstrutorEquipamentos = async (instrutorId: string) => {
    if (instrutorEquipamentos[instrutorId] !== undefined) return;
    
    setLoadingEquipamentos(prev => ({ ...prev, [instrutorId]: true }));
    
    try {
      const { data, error } = await (supabase as any)
        .from('instrutor_equipamentos')
        .select(`
          treinamento_id,
          equipamento_nome,
          quantidade,
          catalogo_treinamentos (nome, norma)
        `)
        .eq('instrutor_id', instrutorId);
      
      if (error) throw error;
      
      const equipamentosFormatados: EquipamentoInstrutor[] = (data || []).map((e: any) => ({
        treinamento_id: e.treinamento_id,
        treinamento_nome: e.catalogo_treinamentos?.nome || '-',
        treinamento_norma: e.catalogo_treinamentos?.norma || '-',
        equipamento_nome: e.equipamento_nome,
        quantidade: e.quantidade
      }));
      
      setInstrutorEquipamentos(prev => ({ ...prev, [instrutorId]: equipamentosFormatados }));
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
      setInstrutorEquipamentos(prev => ({ ...prev, [instrutorId]: [] }));
    } finally {
      setLoadingEquipamentos(prev => ({ ...prev, [instrutorId]: false }));
    }
  };

  // Filtrar turmas do instrutor
  const getFilteredTurmas = (instrutorId: string) => {
    const turmas = instrutorTurmas[instrutorId] || [];
    const search = (turmasSearchTerm[instrutorId] || '').toLowerCase();
    const statusFilter = turmasStatusFilter[instrutorId] || 'ativos';
    
    return turmas.filter(t => {
      const matchesSearch = search === '' || 
        t.codigo_turma.toLowerCase().includes(search) ||
        t.treinamento_nome.toLowerCase().includes(search) ||
        t.treinamento_norma.toLowerCase().includes(search) ||
        t.cliente_nome.toLowerCase().includes(search);
      
      let matchesStatus = true;
      if (statusFilter === 'ativos') {
        matchesStatus = !['rascunho', 'cancelado'].includes(t.status);
      } else if (statusFilter !== 'todos') {
        matchesStatus = t.status === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
  };

  // Formatar status da turma
  const formatTurmaStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'agendado': { label: 'Agendado', color: 'bg-primary/10 text-primary' },
      'em_andamento': { label: 'Em Andamento', color: 'bg-warning/10 text-warning' },
      'concluido': { label: 'Concluído', color: 'bg-success/10 text-success' },
      'cancelado': { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' },
      'pendente': { label: 'Pendente', color: 'bg-muted text-muted-foreground' }
    };
    return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground' };
  };

  const toggleRowExpansion = (instrutorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(instrutorId)) {
      newExpanded.delete(instrutorId);
    } else {
      newExpanded.add(instrutorId);
      if (!formacoes[instrutorId] && !treinamentos[instrutorId]) {
        fetchInstrutorDetails(instrutorId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingInstrutor(null);
    setDialogOpen(true);
  };

  const openEditDialog = (instrutor: Instrutor) => {
    setEditingInstrutor(instrutor);
    setDialogOpen(true);
  };

  const openDocumentosDialog = (instrutor: Instrutor) => {
    setInstrutorDocumentos(instrutor);
    setDocumentosDialogOpen(true);
  };

  const openDatasIndisponiveisDialog = (instrutor: Instrutor) => {
    setInstrutorDatasIndisponiveis(instrutor);
    setDatasIndisponiveisDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!instrutorToDelete) return;

    try {
      const { error } = await supabase
        .from('instrutores')
        .delete()
        .eq('id', instrutorToDelete.id);

      if (error) throw error;
      toast.success('Instrutor excluído com sucesso!');
      setDeleteDialogOpen(false);
      setInstrutorToDelete(null);
      fetchInstrutores();
    } catch (error) {
      console.error('Erro ao excluir instrutor:', error);
      toast.error('Erro ao excluir instrutor');
    }
  };

  const handleToggleAtivo = async (instrutor: Instrutor) => {
    try {
      // Se está desativando, verificar se tem turmas ativas
      if (instrutor.ativo) {
        const { data: turmasAtivas, error: turmasError } = await (supabase as any)
          .from('turmas_treinamento')
          .select(`
            id,
            codigo_turma,
            status,
            cliente_id,
            catalogo_treinamentos (nome, norma),
            turmas_treinamento_aulas (data)
          `)
          .eq('instrutor_id', instrutor.id)
          .in('status', ['agendado', 'em_andamento']);

        if (turmasError) throw turmasError;

        // Buscar nomes dos clientes separadamente
        const clientesMap: Record<string, string> = {};
        if (turmasAtivas && turmasAtivas.length > 0) {
          const clienteIds = [...new Set(turmasAtivas.map((t: any) => t.cliente_id).filter(Boolean))];
          if (clienteIds.length > 0) {
            const { data: clientes } = await (supabase as any)
              .from('clientes_sst')
              .select('id, nome')
              .in('id', clienteIds);
            (clientes || []).forEach((c: any) => { clientesMap[c.id] = c.nome; });
          }
        }

        if (turmasAtivas && turmasAtivas.length > 0) {
          const turmasInfo = turmasAtivas.map((t: any) => {
            const datas = (t.turmas_treinamento_aulas || [])
              .map((a: any) => new Date(a.data).toLocaleDateString('pt-BR'))
              .join(', ');
            return `• ${t.codigo_turma || 'Sem código'} - ${t.catalogo_treinamentos?.norma || ''} ${t.catalogo_treinamentos?.nome || ''} - ${clientesMap[t.cliente_id] || 'Cliente não identificado'} (${datas || 'Sem datas'})`;
          }).join('\n');

          toast.error(
            `Não é possível desativar este instrutor. Ele está vinculado a ${turmasAtivas.length} turma(s) ativa(s):\n\n${turmasInfo}`,
            { duration: 10000 }
          );
          return;
        }
      }

      // Atualizar status com data de desativação
      const updateData: any = { 
        ativo: !instrutor.ativo,
        data_desativacao: instrutor.ativo ? new Date().toISOString() : null
      };

      const { error } = await (supabase as any)
        .from('instrutores')
        .update(updateData)
        .eq('id', instrutor.id);

      if (error) throw error;
      toast.success(instrutor.ativo ? 'Instrutor inativado' : 'Instrutor ativado');
      fetchInstrutores();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do instrutor');
    }
  };

  const openAcessoDialog = (instrutor: Instrutor) => {
    setInstrutorAcesso(instrutor);
    setAcessoSenha('');
    setAcessoDialogOpen(true);
  };

  const handleCriarAcesso = async () => {
    if (!instrutorAcesso || !acessoSenha) return;
    
    if (acessoSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCriandoAcesso(true);

    try {
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      // Chamar Edge Function para criar usuário
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: instrutorAcesso.email,
          password: acessoSenha,
          nome: instrutorAcesso.nome,
          role: 'instrutor',
          empresa_id: instrutorAcesso.empresa_id,
          send_invite: true,
        }),
      });

      const adminResponse = await response.json();
      console.log('[ParceiraInstrutores] Resposta criar acesso:', { status: response.status, adminResponse });

      if (!response.ok || adminResponse?.error) {
        toast.error('Erro ao criar acesso: ' + (adminResponse.error || `HTTP ${response.status}`));
        return;
      }

      if (adminResponse?.user?.id) {
        // Vincular o user_id ao instrutor
        const { error: updateError } = await (supabase as any)
          .from('instrutores')
          .update({ user_id: adminResponse.user.id })
          .eq('id', instrutorAcesso.id);

        if (updateError) {
          console.error('Erro ao vincular usuário:', updateError);
          toast.error('Usuário criado mas houve erro ao vincular ao instrutor');
        } else {
          toast.success('Acesso criado com sucesso! O instrutor pode fazer login com o email e senha definidos.');
          setAcessoDialogOpen(false);
          setInstrutorAcesso(null);
          setAcessoSenha('');
          fetchInstrutores();
        }
      }
    } catch (error: any) {
      console.error('Erro ao criar acesso:', error);
      toast.error('Erro ao criar acesso: ' + error.message);
    } finally {
      setCriandoAcesso(false);
    }
  };

  const handleRemoverAcesso = async (instrutor: Instrutor) => {
    if (!instrutor.user_id) return;

    try {
      // Apenas remover o vínculo do user_id no instrutor
      // O usuário continua existindo mas não está mais vinculado
      const { error } = await (supabase as any)
        .from('instrutores')
        .update({ user_id: null })
        .eq('id', instrutor.id);

      if (error) throw error;
      toast.success('Acesso removido do instrutor');
      fetchInstrutores();
    } catch (error) {
      console.error('Erro ao remover acesso:', error);
      toast.error('Erro ao remover acesso do instrutor');
    }
  };

  // Função para obter lista única de formações para o filtro
  const getFormacoesUnicas = () => {
    const todasFormacoes = new Set<string>();
    Object.values(instrutorFormacoes).forEach(formacoes => {
      formacoes.forEach(f => todasFormacoes.add(f));
    });
    return Array.from(todasFormacoes).sort();
  };

  // Função para obter lista única de NRs para o filtro
  const getNRsUnicas = () => {
    const todasNRs = new Set<string>();
    Object.values(instrutorNRs).forEach(nrs => {
      nrs.forEach(nr => todasNRs.add(nr));
    });
    return Array.from(todasNRs).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '999');
      const numB = parseInt(b.replace(/\D/g, '') || '999');
      return numA - numB;
    });
  };

  // Filtro de instrutores com todos os critérios
  const filteredInstrutores = instrutores.filter(instrutor => {
    // Filtro de busca por texto
    const matchesSearch = searchTerm === '' || 
      instrutor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instrutor.cpf_cnpj.includes(searchTerm) ||
      instrutor.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status ativo/inativo
    const matchesAtivo = filtroAtivo === 'todos' || 
      (filtroAtivo === 'ativos' && instrutor.ativo) ||
      (filtroAtivo === 'inativos' && !instrutor.ativo);
    
    // Filtro de aptidão
    const aptidao = instrutorAptidao[instrutor.id];
    const matchesApto = filtroApto === 'todos' ||
      (filtroApto === 'aptos' && aptidao?.apto) ||
      (filtroApto === 'nao_aptos' && !aptidao?.apto);
    
    // Filtro de formação
    const matchesFormacao = filtroFormacao === '' ||
      (instrutorFormacoes[instrutor.id]?.includes(filtroFormacao));
    
    // Filtro de NR/treinamento
    const matchesNR = filtroNR === '' ||
      (instrutorNRs[instrutor.id]?.includes(filtroNR));
    
    return matchesSearch && matchesAtivo && matchesApto && matchesFormacao && matchesNR;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!empresaParceiraId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Empresa não vinculada</h3>
          <p className="text-muted-foreground">
            Sua empresa não está vinculada como parceira de nenhuma empresa SST.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Instrutores
          </h1>
          <p className="text-muted-foreground">
            Aqui é feito o cadastro e edição de instrutores e a listagem de todos os instrutores cadastrados.
          </p>
        </div>
        {activeMainTab === 'instrutores' && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Instrutor
          </Button>
        )}
      </div>

      {/* Tabs principais */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList>
          <TabsTrigger value="instrutores" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Instrutores Cadastrados
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Solicitações de Cadastro
          </TabsTrigger>
          <TabsTrigger value="indisponibilidade" className="flex items-center gap-2">
            <CalendarX className="h-4 w-4" />
            Controle de Indisponibilidade
          </TabsTrigger>
          <TabsTrigger value="suporte" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Suporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instrutores" className="mt-6">
          {/* Search and Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg">
                  {filteredInstrutores.length} instrutor(es) {filtroAtivo === 'ativos' ? 'ativo(s)' : filtroAtivo === 'inativos' ? 'inativo(s)' : 'cadastrado(s)'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    title="Filtros"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Área de Filtros */}
              {showFilters && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFiltroAtivo('ativos');
                        setFiltroApto('todos');
                        setFiltroFormacao('');
                        setFiltroNR('');
                      }}
                      className="text-xs"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filtro Status */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                      <select
                        value={filtroAtivo}
                        onChange={(e) => setFiltroAtivo(e.target.value as 'todos' | 'ativos' | 'inativos')}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="ativos">Ativos</option>
                        <option value="inativos">Inativos</option>
                        <option value="todos">Todos</option>
                      </select>
                    </div>
                    {/* Filtro Aptidão */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Aptidão</label>
                      <select
                        value={filtroApto}
                        onChange={(e) => setFiltroApto(e.target.value as 'todos' | 'aptos' | 'nao_aptos')}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="todos">Todos</option>
                        <option value="aptos">Aptos</option>
                        <option value="nao_aptos">Não Aptos</option>
                      </select>
                    </div>
                    {/* Filtro Formação */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Formação</label>
                      <select
                        value={filtroFormacao}
                        onChange={(e) => setFiltroFormacao(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Todas</option>
                        {getFormacoesUnicas().map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    {/* Filtro NR */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">NR/Treinamento</label>
                      <select
                        value={filtroNR}
                        onChange={(e) => setFiltroNR(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Todos</option>
                        {getNRsUnicas().map(nr => (
                          <option key={nr} value={nr}>{nr}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Formação Acadêmica</TableHead>
                  <TableHead className="text-center">Treinamentos que ministra (NR's)</TableHead>
                  <TableHead className="text-center">Ativo?</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstrutores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum instrutor encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstrutores.map((instrutor) => (
                    <React.Fragment key={instrutor.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => toggleRowExpansion(instrutor.id)}>
                          {expandedRows.has(instrutor.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{instrutor.nome}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{instrutor.cpf_cnpj}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{instrutor.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[250px]">
                          {instrutorFormacoes[instrutor.id]?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {instrutorFormacoes[instrutor.id].slice(0, 2).map((formacao, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/20 truncate max-w-[120px]" title={formacao}>
                                  {formacao}
                                </span>
                              ))}
                              {instrutorFormacoes[instrutor.id].length > 2 && (
                                <span className="text-xs text-muted-foreground">+{instrutorFormacoes[instrutor.id].length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {instrutorNRs[instrutor.id]?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {instrutorNRs[instrutor.id].slice(0, 3).map((nr, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                  {nr}
                                </span>
                              ))}
                              {instrutorNRs[instrutor.id].length > 3 && (
                                <span className="text-xs text-muted-foreground">+{instrutorNRs[instrutor.id].length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={instrutor.ativo}
                            onCheckedChange={() => handleToggleAtivo(instrutor)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDocumentosDialog(instrutor)}
                              title="Upload de documentos comprobatórios"
                              className="relative"
                            >
                              <FileUp className="h-4 w-4" />
                              {documentosPendentes[instrutor.id] && (
                                <AlertCircle className="h-3 w-3 text-destructive absolute -top-1 -right-1" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(instrutor)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDatasIndisponiveisDialog(instrutor)}
                              title="Cadastrar datas indisponíveis para ministrar treinamentos"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(instrutor.id) && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/50 p-0">
                            <div className="flex min-h-[400px]">
                              {/* Sidebar com abas */}
                              <div className="w-48 bg-card border-r flex-shrink-0">
                                <nav className="flex flex-col">
                                  <button
                                    onClick={() => setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'pessoais' }))}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      (!expandedTab[instrutor.id] || expandedTab[instrutor.id] === 'pessoais')
                                        ? 'bg-primary/5 text-primary border-l-2 border-l-primary' 
                                        : 'hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    <User className="h-4 w-4" />
                                    Informações Pessoais
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'formacao' }));
                                      if (!formacoes[instrutor.id]) fetchInstrutorDetails(instrutor.id);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      expandedTab[instrutor.id] === 'formacao' 
                                        ? 'bg-primary/5 text-primary border-l-2 border-l-primary' 
                                        : 'hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    <GraduationCap className="h-4 w-4" />
                                    Formação Acadêmica
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'turmas' }));
                                      fetchInstrutorTurmas(instrutor.id);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      expandedTab[instrutor.id] === 'turmas' 
                                        ? 'bg-warning/5 text-warning border-l-2 border-l-warning' 
                                        : 'hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    <Users className="h-4 w-4" />
                                    Turmas
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'documentos' }));
                                      fetchInstrutorAssinatura(instrutor.id);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      expandedTab[instrutor.id] === 'documentos' 
                                        ? 'bg-secondary/10 text-secondary-foreground border-l-2 border-l-secondary' 
                                        : 'hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    <FileText className="h-4 w-4" />
                                    Documentos
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'equipamentos' }));
                                      fetchInstrutorEquipamentos(instrutor.id);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      expandedTab[instrutor.id] === 'equipamentos' 
                                        ? 'bg-primary/5 text-primary border-l-2 border-l-primary' 
                                        : 'hover:bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    <Wrench className="h-4 w-4" />
                                    Equipamentos
                                  </button>
                                </nav>
                              </div>

                              {/* Conteúdo das abas */}
                              <div className="flex-1 p-4 overflow-auto">
                                {/* Aba Informações Pessoais */}
                                {(!expandedTab[instrutor.id] || expandedTab[instrutor.id] === 'pessoais') && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <User className="h-5 w-5 text-primary" />
                                      Informações Pessoais
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-card rounded-lg border p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Nome:</span>
                                          <span className="font-medium">{instrutor.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">CPF/CNPJ:</span>
                                          <span className="font-medium">{instrutor.cpf_cnpj}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Mail className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">E-mail:</span>
                                          <span className="font-medium">{instrutor.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Phone className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Telefone:</span>
                                          <span className="font-medium">{instrutor.telefone || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-muted-foreground">Data Nasc.:</span>
                                          <span className="font-medium">
                                            {instrutor.data_nascimento 
                                              ? new Date(instrutor.data_nascimento).toLocaleDateString('pt-BR')
                                              : '-'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="bg-card rounded-lg border p-4 space-y-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground" />
                                          Endereço
                                        </h5>
                                        <div className="text-sm space-y-1">
                                          <p>{instrutor.logradouro ? `${instrutor.logradouro}, ${instrutor.numero || 'S/N'}` : '-'}</p>
                                          {instrutor.complemento && <p>{instrutor.complemento}</p>}
                                          <p>{instrutor.bairro || '-'}</p>
                                          <p>{instrutor.cidade && instrutor.uf ? `${instrutor.cidade} - ${instrutor.uf}` : '-'}</p>
                                          <p>CEP: {instrutor.cep || '-'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Aba Formação Acadêmica */}
                                {expandedTab[instrutor.id] === 'formacao' && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <GraduationCap className="h-5 w-5 text-primary" />
                                      Formação Acadêmica e Treinamentos
                                    </h4>
                                    
                                    <div className="bg-card rounded-lg border p-4">
                                      <p className="text-sm text-muted-foreground mb-2">Formação:</p>
                                      <p className="font-medium">{instrutor.formacao_academica || 'Não informada'}</p>
                                    </div>

                                    {/* Formações */}
                                    <div className="space-y-2">
                                      <h5 className="font-medium flex items-center gap-2">
                                        <Award className="h-4 w-4 text-warning" />
                                        Habilitações/Qualificações
                                      </h5>
                                      {formacoes[instrutor.id]?.length > 0 ? (
                                        <div className="grid gap-2">
                                          {formacoes[instrutor.id].map((f) => (
                                            <div key={f.id} className="flex items-center gap-3 bg-card rounded-lg border p-3">
                                              {f.documento_url ? (
                                                <a href={f.documento_url} target="_blank" rel="noopener noreferrer">
                                                  <img src={f.documento_url} alt={f.nome} className="w-10 h-10 object-cover rounded border" />
                                                </a>
                                              ) : (
                                                <div className="w-10 h-10 rounded border border-dashed border-destructive/30 bg-destructive/5 flex items-center justify-center">
                                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                                </div>
                                              )}
                                              <span className={!f.documento_url ? 'text-destructive' : ''}>{f.nome}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada</p>
                                      )}
                                    </div>

                                    {/* Treinamentos */}
                                    <div className="space-y-2">
                                      <h5 className="font-medium flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-success" />
                                        Treinamentos que Ministra
                                      </h5>
                                      {treinamentos[instrutor.id]?.length > 0 ? (
                                        <div className="grid gap-2">
                                          {treinamentos[instrutor.id].map((t) => (
                                            <div key={t.id} className="flex items-center gap-3 bg-card rounded-lg border p-3">
                                              {t.documento_url ? (
                                                <a href={t.documento_url} target="_blank" rel="noopener noreferrer">
                                                  <img src={t.documento_url} alt={t.treinamento_nome} className="w-10 h-10 object-cover rounded border" />
                                                </a>
                                              ) : (
                                                <div className="w-10 h-10 rounded border border-dashed border-destructive/30 bg-destructive/5 flex items-center justify-center">
                                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                                </div>
                                              )}
                                              <span className={!t.documento_url ? 'text-destructive' : ''}>
                                                {t.treinamento_norma} - {t.treinamento_nome}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Aba Turmas */}
                                {expandedTab[instrutor.id] === 'turmas' && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-warning" />
                                        Turmas do Instrutor
                                      </h4>
                                      <span className="text-sm text-muted-foreground">
                                        {getFilteredTurmas(instrutor.id).length} turma(s)
                                      </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                          placeholder="Buscar por código, treinamento, empresa..."
                                          value={turmasSearchTerm[instrutor.id] || ''}
                                          onChange={(e) => setTurmasSearchTerm(prev => ({ ...prev, [instrutor.id]: e.target.value }))}
                                          className="pl-9 h-9"
                                        />
                                      </div>
                                      <select
                                        value={turmasStatusFilter[instrutor.id] || 'ativos'}
                                        onChange={(e) => setTurmasStatusFilter(prev => ({ ...prev, [instrutor.id]: e.target.value }))}
                                        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                                      >
                                        <option value="ativos">Todos os status</option>
                                        <option value="agendado">Agendado</option>
                                        <option value="em_andamento">Em Andamento</option>
                                        <option value="concluido">Concluído</option>
                                        <option value="cancelado">Cancelado</option>
                                      </select>
                                    </div>
                                    
                                    {loadingTurmas[instrutor.id] ? (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-warning" />
                                      </div>
                                    ) : getFilteredTurmas(instrutor.id).length > 0 ? (
                                      <div className="bg-card rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-muted/50">
                                            <tr>
                                              <th className="px-3 py-2 text-left font-medium">Código</th>
                                              <th className="px-3 py-2 text-left font-medium">Treinamento</th>
                                              <th className="px-3 py-2 text-left font-medium">Empresa</th>
                                              <th className="px-3 py-2 text-center font-medium">Datas</th>
                                              <th className="px-3 py-2 text-center font-medium">Colab.</th>
                                              <th className="px-3 py-2 text-center font-medium">Status</th>
                                              <th className="px-3 py-2 text-center font-medium">Ação</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {getFilteredTurmas(instrutor.id).map((turma) => {
                                              const statusInfo = formatTurmaStatus(turma.status);
                                              return (
                                                <tr key={turma.id} className="border-t hover:bg-muted/50">
                                                  <td className="px-3 py-2 font-mono text-xs">{turma.codigo_turma}</td>
                                                  <td className="px-3 py-2">
                                                    <span className="text-warning font-medium">{turma.treinamento_norma}</span>
                                                    <span className="text-muted-foreground ml-1">{turma.treinamento_nome}</span>
                                                  </td>
                                                  <td className="px-3 py-2 text-muted-foreground">{turma.cliente_nome}</td>
                                                  <td className="px-3 py-2 text-center text-xs">
                                                    {turma.datas.length > 0 ? (
                                                      <span title={turma.datas.map(d => new Date(d).toLocaleDateString('pt-BR')).join(', ')}>
                                                        {new Date(turma.datas[0]).toLocaleDateString('pt-BR')}
                                                        {turma.datas.length > 1 && ` (+${turma.datas.length - 1})`}
                                                      </span>
                                                    ) : '-'}
                                                  </td>
                                                  <td className="px-3 py-2 text-center">{turma.total_colaboradores}</td>
                                                  <td className="px-3 py-2 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                                                      {statusInfo.label}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-center">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => window.open(`/modulos/gestao-turmas/${turma.id}`, '_blank')}
                                                      title="Visualizar turma"
                                                    >
                                                      <Eye className="h-4 w-4" />
                                                    </Button>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="bg-card rounded-lg border p-6 text-center">
                                        <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                          Nenhuma turma encontrada com os filtros aplicados
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Aba Documentos */}
                                {expandedTab[instrutor.id] === 'documentos' && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <FileText className="h-5 w-5 text-secondary-foreground" />
                                      Documentos
                                    </h4>
                                    
                                    {/* Assinatura */}
                                    <div className="bg-card rounded-lg border p-4">
                                      <h5 className="font-medium mb-3 flex items-center gap-2">
                                        <Image className="h-4 w-4 text-secondary-foreground" />
                                        Assinatura Digital
                                      </h5>
                                      {instrutorAssinatura[instrutor.id] ? (
                                        <div className="flex items-center gap-4">
                                          <img 
                                            src={instrutorAssinatura[instrutor.id]!} 
                                            alt="Assinatura" 
                                            className="max-h-24 border rounded p-2 bg-background"
                                          />
                                          <a 
                                            href={instrutorAssinatura[instrutor.id]!} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline flex items-center gap-1"
                                          >
                                            <Eye className="h-4 w-4" />
                                            Ver anexo
                                          </a>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Nenhuma assinatura cadastrada</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Aba Equipamentos */}
                                {expandedTab[instrutor.id] === 'equipamentos' && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <Wrench className="h-5 w-5 text-primary" />
                                      Equipamentos do Instrutor
                                    </h4>
                                    
                                    {loadingEquipamentos[instrutor.id] ? (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                      </div>
                                    ) : (instrutorEquipamentos[instrutor.id] || []).length > 0 ? (
                                      <div className="space-y-4">
                                        {Object.entries(
                                          (instrutorEquipamentos[instrutor.id] || []).reduce((acc, equip) => {
                                            const key = `${equip.treinamento_norma} - ${equip.treinamento_nome}`;
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(equip);
                                            return acc;
                                          }, {} as Record<string, EquipamentoInstrutor[]>)
                                        ).map(([treinamento, equipamentos]) => (
                                          <div key={treinamento} className="bg-card rounded-lg border p-4">
                                            <h5 className="font-medium text-primary mb-3 flex items-center gap-2">
                                              <Award className="h-4 w-4" />
                                              {treinamento}
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                              {equipamentos.map((equip, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-primary/5 rounded px-3 py-2">
                                                  <span className="text-sm">{equip.equipamento_nome}</span>
                                                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                    Qtd: {equip.quantidade}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="bg-card rounded-lg border p-6 text-center">
                                        <Wrench className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                          Este instrutor não possui equipamentos próprios cadastrados.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solicitacoes" className="mt-6">
          <InstrutorSolicitacoesTab empresaParceiraId={empresaParceiraId} />
        </TabsContent>

        <TabsContent value="indisponibilidade" className="mt-6">
          <ControleIndisponibilidade 
            empresaParceiraId={empresaParceiraId} 
            tipo="parceira" 
          />
        </TabsContent>

        <TabsContent value="suporte" className="mt-6">
          <InstrutorSuporteTab empresaParceiraId={empresaParceiraId} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <InstrutorCadastroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchInstrutores}
        editingInstrutor={editingInstrutor}
        empresaParceiraId={empresaParceiraId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o instrutor "{instrutorToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Documentos Dialog */}
      <InstrutorDocumentosDialog
        open={documentosDialogOpen}
        onOpenChange={setDocumentosDialogOpen}
        instrutor={instrutorDocumentos}
        empresaIdOverride={empresaSstId || undefined}
        onSuccess={() => {
          fetchInstrutores();
          if (instrutorDocumentos && expandedRows.has(instrutorDocumentos.id)) {
            fetchInstrutorDetails(instrutorDocumentos.id);
          }
        }}
      />

      {/* Datas Indisponíveis Dialog */}
      <InstrutorDatasIndisponiveisDialog
        open={datasIndisponiveisDialogOpen}
        onOpenChange={setDatasIndisponiveisDialogOpen}
        instrutor={instrutorDatasIndisponiveis}
        onSuccess={() => {}}
      />

      {/* Dialog para criar acesso */}
      <AlertDialog open={acessoDialogOpen} onOpenChange={setAcessoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Criar Acesso para Instrutor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Crie um acesso para que o instrutor <strong>{instrutorAcesso?.nome}</strong> possa 
              fazer login no sistema usando o email <strong>{instrutorAcesso?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Senha de acesso</label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={acessoSenha}
              onChange={(e) => setAcessoSenha(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              O instrutor usará o email cadastrado e esta senha para fazer login.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={criandoAcesso}>Cancelar</AlertDialogCancel>
            <Button 
              onClick={handleCriarAcesso} 
              disabled={criandoAcesso || acessoSenha.length < 6}
            >
              {criandoAcesso ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Acesso'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
