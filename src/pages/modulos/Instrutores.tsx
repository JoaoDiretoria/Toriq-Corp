import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
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
  FileText,
  ClipboardList,
  MessageCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  User,
  MapPin,
  Phone,
  Mail,
  Car,
  FileSignature,
  Filter,
  X,
  Users,
  Eye,
  Building2,
  Wrench,
  Image,
  RefreshCw,
  Trash2,
  AlertTriangle
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

// Função para formatar CPF/CNPJ
const formatCpfCnpj = (value: string): string => {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

interface Instrutor {
  id: string;
  empresa_id: string;
  empresa_parceira_id?: string;
  user_id?: string;
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
  created_at: string;
  updated_at: string;
}

interface EmpresaParceira {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  responsavel?: string;
  tipo_fornecedor?: string;
}

interface TreinamentoVinculado {
  id: string;
  nome: string;
  norma: string;
  anexo_url?: string | null;
}

interface InstrutorFormacao {
  id: string;
  instrutor_id: string;
  nome: string;
  registro_tipo?: string | null;
  registro_numero?: string | null;
  registro_estado?: string | null;
  documento_url?: string;
  anexo_url?: string;
  treinamentos: TreinamentoVinculado[];
  created_at: string;
}

interface InstrutorTreinamento {
  id: string;
  instrutor_id: string;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma?: string;
  documento_url?: string;
  anexo_url?: string;
  created_at: string;
}

const Instrutores = () => {
  const { profile } = useAuth();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstrutor, setEditingInstrutor] = useState<Instrutor | null>(null);
  
  // Estado para persistir dados do formulário de cadastro (enquanto estiver na página)
  const [persistedFormData, setPersistedFormData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instrutorToDelete, setInstrutorToDelete] = useState<Instrutor | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [instrutorDocumentos, setInstrutorDocumentos] = useState<Instrutor | null>(null);
  const [datasIndisponiveisDialogOpen, setDatasIndisponiveisDialogOpen] = useState(false);
  const [instrutorDatasIndisponiveis, setInstrutorDatasIndisponiveis] = useState<Instrutor | null>(null);

  // Expanded row data
  const [formacoes, setFormacoes] = useState<Record<string, InstrutorFormacao[]>>({});
  const [treinamentos, setTreinamentos] = useState<Record<string, InstrutorTreinamento[]>>({});
  
  // NRs dos treinamentos para exibir na coluna (carregado para todos os instrutores)
  const [instrutorNRs, setInstrutorNRs] = useState<Record<string, string[]>>({});
  
  // Formações acadêmicas para exibir na coluna (nomes das formações)
  const [instrutorFormacoes, setInstrutorFormacoes] = useState<Record<string, string[]>>({});
  
  // Rastrear se há documentos pendentes para cada instrutor
  const [documentosPendentes, setDocumentosPendentes] = useState<Record<string, boolean>>({});
  
  // Dados das empresas parceiras
  const [empresasParceiras, setEmpresasParceiras] = useState<Record<string, EmpresaParceira>>({});
  const [empresaParceiraDialogOpen, setEmpresaParceiraDialogOpen] = useState(false);
  const [selectedEmpresaParceira, setSelectedEmpresaParceira] = useState<EmpresaParceira | null>(null);
  
  // Tab principal
  const [activeMainTab, setActiveMainTab] = useState('instrutores');
  
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
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos'); // Por padrão só exibe ativos
  const [filtroApto, setFiltroApto] = useState<'todos' | 'aptos' | 'nao_aptos'>('todos');
  const [filtroFormacao, setFiltroFormacao] = useState<string>('');
  const [filtroNR, setFiltroNR] = useState<string>('');
  const [filtroEmpresaParceira, setFiltroEmpresaParceira] = useState<string>(''); // Filtro por empresa parceira
  const [showFilters, setShowFilters] = useState(false);
  
  // Lista de empresas parceiras para o filtro
  const [listaEmpresasParceiras, setListaEmpresasParceiras] = useState<EmpresaParceira[]>([]);
  
  // Aba expandida do instrutor
  const [expandedTab, setExpandedTab] = useState<Record<string, string>>({});
  
  // Turmas do instrutor para a aba Turmas
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

  useEffect(() => {
    if (profile?.empresa_id) {
      fetchInstrutores();
      logView('Instrutores', 'Gestão de Instrutores', 'Acessou a página de gestão de instrutores');
    }
  }, [profile?.empresa_id]);

  // Buscar NRs e status de documentos de todos os instrutores
  const fetchInstrutorNRs = async (instrutorIds: string[]) => {
    if (instrutorIds.length === 0) return;

    try {
      const db = supabase as any;

      // Buscar formações com nome e anexo_url
      const { data: formacoesData, error: formacoesError } = await db
        .from('instrutor_formacoes')
        .select('instrutor_id, nome, anexo_url')
        .in('instrutor_id', instrutorIds);

      if (formacoesError) throw formacoesError;

      // Buscar vínculos formação-treinamento com anexo_url e NRs (fonte única de treinamentos)
      const { data: vinculosData, error: vinculosError } = await db
        .from('instrutor_formacao_treinamento')
        .select('instrutor_id, formacao_id, anexo_url, catalogo_treinamentos (id, nome, norma)')
        .in('instrutor_id', instrutorIds);

      if (vinculosError) console.error('Erro ao buscar vínculos:', vinculosError);

      const nrsByInstrutor: Record<string, string[]> = {};
      const pendentes: Record<string, boolean> = {};
      
      // Estruturas para calcular aptidão
      const aptidaoByInstrutor: Record<string, AptidaoInfo> = {};
      
      // Inicializar todos os instrutores
      instrutorIds.forEach(id => {
        pendentes[id] = false;
        aptidaoByInstrutor[id] = {
          apto: false,
          temFormacao: false,
          formacoesComAnexo: 0,
          formacoesSemAnexo: [],
          temTreinamento: false,
          treinamentosComAnexo: 0,
          treinamentosSemAnexo: []
        };
      });

      // Processar vínculos para NRs e verificar anexos pendentes de treinamentos
      (vinculosData || []).forEach((item: any) => {
        const instrutorId = item.instrutor_id;
        const norma = item.catalogo_treinamentos?.norma;
        const treinamentoNome = item.catalogo_treinamentos?.nome;
        
        // Verificar NRs
        if (norma) {
          if (!nrsByInstrutor[instrutorId]) {
            nrsByInstrutor[instrutorId] = [];
          }
          if (!nrsByInstrutor[instrutorId].includes(norma)) {
            nrsByInstrutor[instrutorId].push(norma);
          }
        }
        
        // Verificar anexo pendente de treinamento - só marca se não tem anexo_url
        const temAnexoTreinamento = item.anexo_url && item.anexo_url !== '';
        if (!temAnexoTreinamento) {
          pendentes[instrutorId] = true;
          if (treinamentoNome && !aptidaoByInstrutor[instrutorId].treinamentosSemAnexo.includes(`NR ${norma} - ${treinamentoNome}`)) {
            aptidaoByInstrutor[instrutorId].treinamentosSemAnexo.push(`NR ${norma} - ${treinamentoNome}`);
          }
        } else {
          aptidaoByInstrutor[instrutorId].treinamentosComAnexo++;
        }
        
        // Marcar que tem treinamento
        aptidaoByInstrutor[instrutorId].temTreinamento = true;
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
        
        // Marcar que tem formação
        aptidaoByInstrutor[instrutorId].temFormacao = true;
        
        // Só marca como pendente se a formação não tem anexo
        const temAnexoFormacao = item.anexo_url && item.anexo_url !== '';
        if (!temAnexoFormacao) {
          pendentes[instrutorId] = true;
          if (item.nome && !aptidaoByInstrutor[instrutorId].formacoesSemAnexo.includes(item.nome)) {
            aptidaoByInstrutor[instrutorId].formacoesSemAnexo.push(item.nome);
          }
        } else {
          aptidaoByInstrutor[instrutorId].formacoesComAnexo++;
        }
      });

      // Calcular aptidão final para cada instrutor
      // Um instrutor está APTO se:
      // 1. Tem pelo menos uma formação cadastrada
      // 2. Todas as formações têm anexo
      // 3. Tem pelo menos um treinamento vinculado
      // 4. Todos os treinamentos têm anexo
      instrutorIds.forEach(id => {
        const apt = aptidaoByInstrutor[id];
        apt.apto = apt.temFormacao && 
                   apt.formacoesSemAnexo.length === 0 && 
                   apt.temTreinamento && 
                   apt.treinamentosSemAnexo.length === 0;
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
      setInstrutorAptidao(aptidaoByInstrutor);
    } catch (error) {
      console.error('Erro ao buscar NRs dos instrutores:', error);
    }
  };

  const fetchInstrutores = async () => {
    if (!profile?.empresa_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instrutores')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nome');

      if (error) throw error;
      setInstrutores(data || []);
      
      // Buscar NRs para todos os instrutores
      if (data && data.length > 0) {
        fetchInstrutorNRs(data.map((i: Instrutor) => i.id));
        
        // Buscar dados das empresas parceiras para instrutores vinculados
        const empresaParceiraIds = data
          .filter((i: Instrutor) => i.empresa_parceira_id)
          .map((i: Instrutor) => i.empresa_parceira_id as string);
        
        if (empresaParceiraIds.length > 0) {
          fetchEmpresasParceiras(empresaParceiraIds);
        }
      }
      
      // Buscar lista de todas as empresas parceiras para o filtro
      fetchListaEmpresasParceiras();
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
      toast.error('Erro ao carregar instrutores');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchListaEmpresasParceiras = async () => {
    if (!profile?.empresa_id) return;
    
    try {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('id, nome, cnpj, email, telefone, responsavel, tipo_fornecedor')
        .eq('empresa_sst_id', profile.empresa_id)
        .order('nome');

      if (error) throw error;
      setListaEmpresasParceiras(data || []);
    } catch (error) {
      console.error('Erro ao buscar lista de empresas parceiras:', error);
    }
  };

  const fetchEmpresasParceiras = async (empresaParceiraIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('id, nome, cnpj, email, telefone, responsavel, tipo_fornecedor')
        .in('id', empresaParceiraIds);

      if (error) throw error;

      const empresasMap: Record<string, EmpresaParceira> = {};
      (data || []).forEach((ep: any) => {
        empresasMap[ep.id] = ep;
      });
      setEmpresasParceiras(empresasMap);
    } catch (error) {
      console.error('Erro ao buscar empresas parceiras:', error);
    }
  };

  const openEmpresaParceiraDialog = (empresaParceiraId: string) => {
    const ep = empresasParceiras[empresaParceiraId];
    if (ep) {
      setSelectedEmpresaParceira(ep);
      setEmpresaParceiraDialogOpen(true);
    }
  };

  const fetchInstrutorDetails = async (instrutorId: string) => {
    try {
      const db = supabase as any;
      
      // Fetch formações com registro info
      const { data: formacoesData, error: formacoesError } = await db
        .from('instrutor_formacoes')
        .select('id, instrutor_id, nome, registro_tipo, registro_numero, registro_estado, documento_url, anexo_url, created_at')
        .eq('instrutor_id', instrutorId);

      if (formacoesError) throw formacoesError;
      
      // Buscar vínculos formação-treinamento com anexo_url e dados do catálogo
      const { data: vinculosData } = await db
        .from('instrutor_formacao_treinamento')
        .select('formacao_id, treinamento_id, anexo_url, catalogo_treinamentos (id, nome, norma)')
        .eq('instrutor_id', instrutorId);
      
      // Mapear formações com seus treinamentos vinculados (igual ao InstrutorMeuPerfil)
      const formacoesComTreinamentos = (formacoesData || []).map((f: any) => {
        const treinamentosVinculados = (vinculosData || [])
          .filter((v: any) => v.formacao_id === f.id)
          .map((v: any) => ({
            id: v.treinamento_id,
            nome: v.catalogo_treinamentos?.nome || '',
            norma: v.catalogo_treinamentos?.norma || '',
            anexo_url: v.anexo_url || null
          }));
        
        // Ordenar treinamentos por número da NR
        treinamentosVinculados.sort((a: any, b: any) => {
          const numA = parseInt(a.norma?.replace(/\D/g, '') || '999');
          const numB = parseInt(b.norma?.replace(/\D/g, '') || '999');
          return numA - numB;
        });
        
        return {
          ...f,
          treinamentos: treinamentosVinculados
        };
      });
      
      setFormacoes(prev => ({ ...prev, [instrutorId]: formacoesComTreinamentos }));

      // Fetch treinamentos da tabela instrutor_treinamentos (para compatibilidade)
      const { data: treinamentosData, error: treinamentosError } = await supabase
        .from('instrutor_treinamentos')
        .select(`
          *,
          catalogo_treinamentos (nome, norma)
        `)
        .eq('instrutor_id', instrutorId);

      if (treinamentosError) throw treinamentosError;
      
      // Criar mapa de anexos por treinamento_id dos vínculos
      const anexosPorTreinamento: Record<string, string> = {};
      (vinculosData || []).forEach((v: any) => {
        if (v.anexo_url) {
          anexosPorTreinamento[v.treinamento_id] = v.anexo_url;
        }
      });
      
      const mappedTreinamentos = (treinamentosData || []).map((t: any) => ({
        ...t,
        treinamento_nome: t.catalogo_treinamentos?.nome || 'Treinamento não encontrado',
        treinamento_norma: t.catalogo_treinamentos?.norma || '',
        anexo_url: anexosPorTreinamento[t.treinamento_id] || t.anexo_url || null
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

  // Buscar turmas do instrutor
  const fetchInstrutorTurmas = async (instrutorId: string) => {
    if (instrutorTurmas[instrutorId]) return; // Já carregado
    
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
      
      // Buscar contagem de colaboradores para cada turma (usando turma_colaboradores)
      const turmasIds = (turmas || []).map((t: any) => t.id);
      const colaboradoresCount: Record<string, number> = {};
      
      if (turmasIds.length > 0) {
        const { data: colaboradores } = await (supabase as any)
          .from('turma_colaboradores')
          .select('turma_id')
          .in('turma_id', turmasIds);
        
        // Contar colaboradores por turma
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
    if (instrutorAssinatura[instrutorId] !== undefined) return; // Já carregado
    
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
    if (instrutorEquipamentos[instrutorId] !== undefined) return; // Já carregado
    
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
    const statusFilter = turmasStatusFilter[instrutorId] || 'ativos'; // Por padrão mostra apenas ativos
    
    return turmas.filter(t => {
      const matchesSearch = search === '' || 
        t.codigo_turma.toLowerCase().includes(search) ||
        t.treinamento_nome.toLowerCase().includes(search) ||
        t.treinamento_norma.toLowerCase().includes(search) ||
        t.cliente_nome.toLowerCase().includes(search);
      
      // Filtro de status: 'ativos' exclui rascunho e cancelado
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
      'rascunho': { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
      'agendado': { label: 'Agendado', color: 'bg-primary/10 text-primary' },
      'em_andamento': { label: 'Em Andamento', color: 'bg-warning/10 text-warning' },
      'concluido': { label: 'Concluído', color: 'bg-success/10 text-success' },
      'cancelado': { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' },
      'pendente': { label: 'Pendente', color: 'bg-muted text-muted-foreground' }
    };
    return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground' };
  };

  // Abrir diálogo de exclusão
  const openDeleteDialog = (instrutor: Instrutor) => {
    setInstrutorToDelete(instrutor);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  // Verificar se a confirmação de digitação está correta
  const isDeleteConfirmValid = () => {
    if (!instrutorToDelete) return false;
    // Usuário deve digitar o nome do instrutor exatamente
    return deleteConfirmText.trim().toLowerCase() === instrutorToDelete.nome.trim().toLowerCase();
  };

  // Função para bloquear copiar/colar no input de confirmação
  const handlePasteBlock = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copiar e colar não é permitido. Digite o nome manualmente.');
  };

  const handleDelete = async () => {
    if (!instrutorToDelete || !isDeleteConfirmValid()) return;

    setDeleting(true);

    try {
      const db = supabase as any;
      const instrutorId = instrutorToDelete.id;
      const userId = instrutorToDelete.user_id;

      // 1. Buscar e deletar anexos do Storage (formações e treinamentos)
      // Buscar URLs de anexos das formações
      const { data: formacoesData } = await db
        .from('instrutor_formacoes')
        .select('anexo_url, documento_url')
        .eq('instrutor_id', instrutorId);

      // Buscar URLs de anexos dos vínculos formação-treinamento
      const { data: vinculosData } = await db
        .from('instrutor_formacao_treinamento')
        .select('anexo_url')
        .eq('instrutor_id', instrutorId);

      // Buscar assinatura do instrutor
      const { data: instrutorData } = await db
        .from('instrutores')
        .select('assinatura_url')
        .eq('id', instrutorId)
        .single();

      // Coletar todas as URLs de arquivos para deletar
      const filesToDelete: string[] = [];
      
      (formacoesData || []).forEach((f: any) => {
        if (f.anexo_url) filesToDelete.push(f.anexo_url);
        if (f.documento_url) filesToDelete.push(f.documento_url);
      });
      
      (vinculosData || []).forEach((v: any) => {
        if (v.anexo_url) filesToDelete.push(v.anexo_url);
      });
      
      if (instrutorData?.assinatura_url) {
        filesToDelete.push(instrutorData.assinatura_url);
      }

      // Deletar arquivos do Storage (extrair path do URL)
      for (const url of filesToDelete) {
        try {
          // Extrair o path do arquivo da URL do Supabase Storage
          const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
          if (match) {
            const bucket = match[1];
            const path = match[2];
            await supabase.storage.from(bucket).remove([path]);
          }
        } catch (storageError) {
          console.warn('Erro ao deletar arquivo do storage:', storageError);
        }
      }

      // 2. Deletar vínculos formação-treinamento
      await db
        .from('instrutor_formacao_treinamento')
        .delete()
        .eq('instrutor_id', instrutorId);

      // 3. Deletar formações
      await db
        .from('instrutor_formacoes')
        .delete()
        .eq('instrutor_id', instrutorId);

      // 4. Deletar treinamentos (tabela legada)
      await db
        .from('instrutor_treinamentos')
        .delete()
        .eq('instrutor_id', instrutorId);

      // 5. Deletar equipamentos
      await db
        .from('instrutor_equipamentos')
        .delete()
        .eq('instrutor_id', instrutorId);

      // 6. Deletar datas indisponíveis
      await db
        .from('instrutor_datas_indisponiveis')
        .delete()
        .eq('instrutor_id', instrutorId);

      // 7. Deletar o instrutor
      const { error: deleteInstrutorError } = await supabase
        .from('instrutores')
        .delete()
        .eq('id', instrutorId);

      if (deleteInstrutorError) throw deleteInstrutorError;

      // 8. Se o instrutor tinha user_id, deletar o usuário via Edge Function
      if (userId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          if (accessToken) {
            // Deletar profile primeiro
            await db
              .from('profiles')
              .delete()
              .eq('id', userId);

            // Deletar usuário via Edge Function
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL || 'https://xraggzqaddfiymqgrtha.supabase.co'}/functions/v1/admin-delete-user`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ userId }),
              }
            );

            if (!response.ok) {
              console.warn('Aviso: Não foi possível deletar o usuário do auth:', await response.text());
            }
          }
        } catch (userDeleteError) {
          console.warn('Aviso: Erro ao deletar usuário:', userDeleteError);
        }
      }

      toast.success('Instrutor excluído permanentemente com sucesso!');
      logDelete('Instrutores', 'Gestão de Instrutores', `Excluiu permanentemente instrutor: ${instrutorToDelete.nome}`, { 
        id: instrutorToDelete.id, 
        nome: instrutorToDelete.nome,
        userId: userId || null,
        arquivosDeletados: filesToDelete.length
      });
      
      setDeleteDialogOpen(false);
      setInstrutorToDelete(null);
      setDeleteConfirmText('');
      fetchInstrutores();
    } catch (error: any) {
      console.error('Erro ao excluir instrutor:', error);
      toast.error('Erro ao excluir instrutor: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAtivo = async (instrutor: Instrutor) => {
    try {
      // Se está tentando desativar, verificar se tem turmas ativas
      if (instrutor.ativo) {
        const { data: turmasAtivas, error: turmasError } = await (supabase as any)
          .from('turmas_treinamento')
          .select(`
            id, 
            codigo_turma, 
            status,
            catalogo_treinamentos (nome, norma),
            clientes_sst (nome),
            turmas_treinamento_aulas (data)
          `)
          .eq('instrutor_id', instrutor.id)
          .in('status', ['agendado', 'em_andamento']);
        
        if (turmasError) {
          console.error('Erro ao verificar turmas:', turmasError);
        }
        
        if (turmasAtivas && turmasAtivas.length > 0) {
          // Formatar detalhes das turmas para facilitar a busca
          const turmasDetalhes = turmasAtivas.map((t: any) => {
            const codigo = t.codigo_turma || t.id;
            const treinamento = t.catalogo_treinamentos?.nome || '';
            const norma = t.catalogo_treinamentos?.norma || '';
            const cliente = t.clientes_sst?.nome || '';
            const datas = (t.turmas_treinamento_aulas || [])
              .map((a: any) => a.data ? new Date(a.data).toLocaleDateString('pt-BR') : '')
              .filter(Boolean)
              .slice(0, 2)
              .join(', ');
            
            return `• ${codigo} - ${norma} ${treinamento} | ${cliente}${datas ? ` | ${datas}` : ''}`;
          }).join('\n');
          
          toast.error(
            `Não é possível desativar o instrutor. Ele está vinculado a ${turmasAtivas.length} turma(s) ativa(s):\n\n${turmasDetalhes}\n\nUse os códigos acima para localizar as turmas em Gestão de Turmas.`,
            { duration: 10000 }
          );
          return;
        }
      }
      
      // Preparar dados de atualização
      const updateData: any = { ativo: !instrutor.ativo };
      
      // Se está desativando, registrar data/hora da desativação
      if (instrutor.ativo) {
        updateData.data_desativacao = new Date().toISOString();
      } else {
        // Se está reativando, limpar data de desativação
        updateData.data_desativacao = null;
      }
      
      const { error } = await supabase
        .from('instrutores')
        .update(updateData)
        .eq('id', instrutor.id);

      if (error) throw error;
      toast.success(instrutor.ativo ? 'Instrutor desativado com sucesso' : 'Instrutor reativado com sucesso');
      fetchInstrutores();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do instrutor');
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
    
    // Filtro de empresa parceira
    const matchesEmpresaParceira = filtroEmpresaParceira === '' ||
      (filtroEmpresaParceira === 'proprios' && !instrutor.empresa_parceira_id) ||
      (filtroEmpresaParceira !== 'proprios' && instrutor.empresa_parceira_id === filtroEmpresaParceira);
    
    return matchesSearch && matchesAtivo && matchesApto && matchesFormacao && matchesNR && matchesEmpresaParceira;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            fetchInstrutores();
            toast.success('Dados atualizados!');
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {activeMainTab === 'instrutores' && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Instrutor
            </Button>
          )}
        </div>
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
                        setFiltroEmpresaParceira('');
                      }}
                      className="text-xs"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    
                    {/* Filtro NR/Treinamento */}
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
                    
                    {/* Filtro Empresa Parceira */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa Parceira</label>
                      <select
                        value={filtroEmpresaParceira}
                        onChange={(e) => setFiltroEmpresaParceira(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Todas</option>
                        <option value="proprios">Próprios (sem parceira)</option>
                        {listaEmpresasParceiras.map(ep => (
                          <option key={ep.id} value={ep.id}>{ep.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Tags de filtros ativos */}
                  {(filtroAtivo !== 'ativos' || filtroApto !== 'todos' || filtroFormacao || filtroNR || filtroEmpresaParceira) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {filtroAtivo !== 'ativos' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          Status: {filtroAtivo === 'todos' ? 'Todos' : 'Inativos'}
                          <button onClick={() => setFiltroAtivo('ativos')}><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filtroApto !== 'todos' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded text-xs">
                          {filtroApto === 'aptos' ? 'Aptos' : 'Não Aptos'}
                          <button onClick={() => setFiltroApto('todos')}><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filtroFormacao && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                          {filtroFormacao}
                          <button onClick={() => setFiltroFormacao('')}><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filtroNR && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded text-xs">
                          {filtroNR}
                          <button onClick={() => setFiltroNR('')}><X className="h-3 w-3" /></button>
                        </span>
                      )}
                      {filtroEmpresaParceira && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {filtroEmpresaParceira === 'proprios' ? 'Próprios' : listaEmpresasParceiras.find(ep => ep.id === filtroEmpresaParceira)?.nome || 'Parceira'}
                          <button onClick={() => setFiltroEmpresaParceira('')}><X className="h-3 w-3" /></button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">CPF</TableHead>
                  <TableHead className="font-semibold">E-mail</TableHead>
                  <TableHead className="font-semibold">Formação Acadêmica</TableHead>
                  <TableHead className="text-center font-semibold">NR's</TableHead>
                  <TableHead className="text-center font-semibold">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help flex items-center justify-center gap-1">
                            Apto
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            <strong>Instrutor Apto:</strong> Possui formação cadastrada com anexo e treinamentos vinculados com anexos.
                            Clique no ícone para ver detalhes.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center font-semibold">Parceira</TableHead>
                  <TableHead className="text-center font-semibold">Acesso</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                  <TableHead className="w-32 text-center font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstrutores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Nenhum instrutor encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstrutores.map((instrutor) => (
                    <React.Fragment key={instrutor.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell onClick={() => toggleRowExpansion(instrutor.id)}>
                          {expandedRows.has(instrutor.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{instrutor.nome}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{formatCpfCnpj(instrutor.cpf_cnpj)}</TableCell>
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
                        {/* Coluna Apto */}
                        <TableCell className="text-center">
                          {(() => {
                            const aptidao = instrutorAptidao[instrutor.id];
                            if (!aptidao) {
                              return <span className="text-muted-foreground">-</span>;
                            }
                            return (
                              <button
                                onClick={() => {
                                  setSelectedInstrutorAptidao({ instrutor, aptidao });
                                  setAptidaoDialogOpen(true);
                                }}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                  aptidao.apto 
                                    ? 'bg-success/10 hover:bg-success/20 text-success' 
                                    : 'bg-destructive/10 hover:bg-destructive/20 text-destructive'
                                }`}
                                title={aptidao.apto ? 'Instrutor apto - clique para detalhes' : 'Instrutor não apto - clique para ver pendências'}
                              >
                                {aptidao.apto ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </button>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {instrutor.empresa_parceira_id ? (
                            <button
                              onClick={() => openEmpresaParceiraDialog(instrutor.empresa_parceira_id!)}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors"
                            >
                              Sim
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Instrutores de empresa parceira: acesso gerenciado pela parceira */}
                          {instrutor.empresa_parceira_id ? (
                            <span className="text-muted-foreground text-xs" title="Gerenciado pela empresa parceira">
                              {instrutor.user_id ? 'Sim' : 'Não'}
                            </span>
                          ) : (
                            instrutor.user_id ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/20">Sim</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Não</span>
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Instrutores de empresa parceira: ativo/inativo gerenciado pela parceira */}
                          {instrutor.empresa_parceira_id ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${instrutor.ativo ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`} title="Gerenciado pela empresa parceira">
                              {instrutor.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          ) : (
                            <Switch
                              checked={instrutor.ativo}
                              onCheckedChange={() => handleToggleAtivo(instrutor)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Só permite upload de documentos para instrutores que não são de empresa parceira */}
                            {!instrutor.empresa_parceira_id ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDocumentosDialog(instrutor)}
                                title="Upload de documentos comprobatórios"
                                className={`relative ${documentosPendentes[instrutor.id] ? 'text-warning hover:text-warning/80' : ''}`}
                              >
                                <FileUp className="h-4 w-4" />
                                {/* Ícone de alerta se falta documentos */}
                                {documentosPendentes[instrutor.id] && (
                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
                                  </span>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                title="Documentos gerenciados pela empresa parceira"
                                className={`relative ${documentosPendentes[instrutor.id] ? 'text-warning' : 'text-muted-foreground'}`}
                              >
                                <FileUp className="h-4 w-4" />
                                {documentosPendentes[instrutor.id] && (
                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
                                  </span>
                                )}
                              </Button>
                            )}
                            {/* Só permite editar/excluir instrutores que não são de empresa parceira */}
                            {!instrutor.empresa_parceira_id && (
                              <>
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
                                  onClick={() => openDeleteDialog(instrutor)}
                                  title="Excluir permanentemente"
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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
                          <TableCell colSpan={11} className="bg-muted/30 p-0">
                            <div className="flex">
                              {/* Sidebar com abas */}
                              <div className="w-48 bg-card border-r flex-shrink-0">
                                <nav className="flex flex-col">
                                  <button
                                    onClick={() => setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'pessoal' }))}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      (expandedTab[instrutor.id] || 'pessoal') === 'pessoal' 
                                        ? 'bg-primary/10 text-primary border-l-2 border-l-primary' 
                                        : 'hover:bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    <User className="h-4 w-4" />
                                    Informações Pessoais
                                  </button>
                                  <button
                                    onClick={() => setExpandedTab(prev => ({ ...prev, [instrutor.id]: 'formacao' }))}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm text-left border-b transition-colors ${
                                      expandedTab[instrutor.id] === 'formacao' 
                                        ? 'bg-success/10 text-success border-l-2 border-l-success' 
                                        : 'hover:bg-muted text-muted-foreground'
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
                                        ? 'bg-warning/10 text-warning border-l-2 border-l-warning' 
                                        : 'hover:bg-muted text-muted-foreground'
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
                                        ? 'bg-secondary text-secondary-foreground border-l-2 border-l-secondary-foreground' 
                                        : 'hover:bg-muted text-muted-foreground'
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
                                        ? 'bg-primary/10 text-primary border-l-2 border-l-primary' 
                                        : 'hover:bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    <Wrench className="h-4 w-4" />
                                    Equipamentos
                                  </button>
                                </nav>
                              </div>
                              
                              {/* Conteúdo da aba */}
                              <div className="flex-1 p-4 min-h-[200px]">
                                {/* Aba Informações Pessoais */}
                                {(expandedTab[instrutor.id] || 'pessoal') === 'pessoal' && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2 mb-4">
                                      <User className="h-5 w-5 text-primary" />
                                      Informações Pessoais
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {/* Nome */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Nome Completo</p>
                                        <p className="font-medium">{instrutor.nome}</p>
                                      </div>
                                      {/* CPF/CNPJ */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1">CPF/CNPJ</p>
                                        <p className="font-medium font-mono">{formatCpfCnpj(instrutor.cpf_cnpj)}</p>
                                      </div>
                                      {/* E-mail */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</p>
                                        <p className="font-medium">{instrutor.email}</p>
                                      </div>
                                      {/* Telefone */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</p>
                                        <p className="font-medium">{instrutor.telefone || '-'}</p>
                                      </div>
                                      {/* Data de Nascimento */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Data de Nascimento</p>
                                        <p className="font-medium">
                                          {instrutor.data_nascimento ? new Date(instrutor.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                                        </p>
                                      </div>
                                      {/* Veículo */}
                                      <div className="bg-card rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Car className="h-3 w-3" /> Veículo</p>
                                        <p className="font-medium">
                                          {instrutor.veiculo ? `${instrutor.veiculo}${instrutor.placa ? ` - ${instrutor.placa}` : ''}` : '-'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Endereço */}
                                    <div className="mt-4">
                                      <h5 className="font-medium flex items-center gap-2 mb-3">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        Endereço
                                      </h5>
                                      <div className="bg-card rounded-lg border p-4">
                                        {instrutor.logradouro ? (
                                          <div className="space-y-1">
                                            <p className="">
                                              {instrutor.logradouro}{instrutor.numero ? `, ${instrutor.numero}` : ''}
                                              {instrutor.complemento ? ` - ${instrutor.complemento}` : ''}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {instrutor.bairro && `${instrutor.bairro} - `}
                                              {instrutor.cidade && `${instrutor.cidade}`}
                                              {instrutor.uf && `/${instrutor.uf}`}
                                            </p>
                                            {instrutor.cep && (
                                              <p className="text-muted-foreground text-sm">CEP: {instrutor.cep}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-muted-foreground text-sm">Endereço não cadastrado</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Aba Formação Acadêmica */}
                                {expandedTab[instrutor.id] === 'formacao' && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <GraduationCap className="h-5 w-5 text-success" />
                                      Formações e Treinamentos
                                    </h4>
                                    
                                    {formacoes[instrutor.id]?.length > 0 ? (
                                      <div className="space-y-4">
                                        {formacoes[instrutor.id].map((f) => {
                                          const docUrl = f.anexo_url || f.documento_url;
                                          return (
                                            <div key={f.id} className="bg-card rounded-lg border p-4 hover:border-success/50 transition-colors">
                                              <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                                                  <Award className="h-5 w-5 text-success" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-semibold text-success">{f.nome}</p>
                                                  {(f.registro_tipo || f.registro_numero) && (
                                                    <p className="text-sm text-warning mt-1">
                                                      <span className="font-medium">Registro:</span> {f.registro_tipo} {f.registro_numero} {f.registro_estado ? `- ${f.registro_estado}` : ''}
                                                    </p>
                                                  )}
                                                  {docUrl ? (
                                                    <a href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                                                      <FileText className="h-4 w-4" />
                                                      Ver anexo da formação
                                                    </a>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 text-sm text-warning mt-1">
                                                      <AlertCircle className="h-4 w-4" />
                                                      Anexo pendente
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {f.treinamentos && f.treinamentos.length > 0 ? (
                                                <div className="ml-13 pl-4 border-l-2 border-primary/20">
                                                  <p className="text-xs text-muted-foreground mb-2">Treinamentos vinculados:</p>
                                                  <div className="flex flex-wrap gap-2">
                                                    {f.treinamentos.map((t: TreinamentoVinculado) => (
                                                      <div key={t.id} className="inline-flex items-center gap-1">
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                          {t.norma} - {t.nome}
                                                        </span>
                                                        {t.anexo_url ? (
                                                          <a href={t.anexo_url} target="_blank" rel="noopener noreferrer" title="Ver anexo do treinamento">
                                                            <FileText className="h-3.5 w-3.5 text-success hover:text-success/80" />
                                                          </a>
                                                        ) : (
                                                          <span title="Anexo pendente">
                                                            <AlertCircle className="h-3.5 w-3.5 text-warning" />
                                                          </span>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ) : (
                                                <p className="ml-13 pl-4 border-l-2 border-border text-xs text-muted-foreground">
                                                  Nenhum treinamento vinculado a esta formação
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="bg-card rounded-lg border p-6 text-center">
                                        <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                          Nenhuma formação cadastrada para este instrutor
                                        </p>
                                      </div>
                                    )}
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
                                        {instrutorTurmas[instrutor.id]?.length || 0} turma(s)
                                      </span>
                                    </div>
                                    
                                    {/* Busca e Filtros */}
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
                                          <tbody className="divide-y">
                                            {getFilteredTurmas(instrutor.id).map((turma) => {
                                              const statusInfo = formatTurmaStatus(turma.status);
                                              return (
                                                <tr key={turma.id} className="hover:bg-muted/50">
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
                                          {instrutorTurmas[instrutor.id]?.length === 0 
                                            ? 'Nenhuma turma vinculada a este instrutor'
                                            : 'Nenhuma turma encontrada com os filtros aplicados'}
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
                                    
                                    <div className="space-y-4">
                                      {/* Assinatura */}
                                      <div className="bg-card rounded-lg border p-4">
                                        <h5 className="font-medium flex items-center gap-2 mb-3">
                                          <FileSignature className="h-4 w-4 text-secondary-foreground" />
                                          Assinatura Digital
                                        </h5>
                                        {instrutorAssinatura[instrutor.id] ? (
                                          <div className="space-y-3">
                                            <div className="border rounded-lg p-2 bg-muted/50 inline-block">
                                              <img 
                                                src={instrutorAssinatura[instrutor.id]!} 
                                                alt="Assinatura do instrutor" 
                                                className="max-h-24 max-w-xs object-contain"
                                              />
                                            </div>
                                            <div>
                                              <a 
                                                href={instrutorAssinatura[instrutor.id]!} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                              >
                                                <Image className="h-4 w-4" />
                                                Ver anexo em tamanho original
                                              </a>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">
                                            Assinatura não cadastrada. Acesse o botão de upload de documentos na coluna de ações para gerenciar.
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Anexos de Formação */}
                                      <div className="bg-card rounded-lg border p-4">
                                        <h5 className="font-medium flex items-center gap-2 mb-3">
                                          <GraduationCap className="h-4 w-4 text-success" />
                                          Anexos de Formação
                                        </h5>
                                        {formacoes[instrutor.id]?.length > 0 ? (
                                          <div className="space-y-2">
                                            {formacoes[instrutor.id].map((f) => {
                                              const docUrl = f.anexo_url || f.documento_url;
                                              return (
                                                <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                                  <span className="text-sm">{f.nome}</span>
                                                  {docUrl ? (
                                                    <a href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                                      <FileText className="h-3.5 w-3.5" />
                                                      Ver anexo
                                                    </a>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                                                      <AlertCircle className="h-3.5 w-3.5" />
                                                      Pendente
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada</p>
                                        )}
                                      </div>
                                      
                                      {/* Anexos de Treinamentos */}
                                      <div className="bg-card rounded-lg border p-4">
                                        <h5 className="font-medium flex items-center gap-2 mb-3">
                                          <Award className="h-4 w-4 text-primary" />
                                          Anexos de Treinamentos
                                        </h5>
                                        {formacoes[instrutor.id]?.some(f => f.treinamentos?.length > 0) ? (
                                          <div className="space-y-2">
                                            {formacoes[instrutor.id].flatMap(f => 
                                              (f.treinamentos || []).map((t: TreinamentoVinculado) => (
                                                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                                  <span className="text-sm">{t.norma} - {t.nome}</span>
                                                  {t.anexo_url ? (
                                                    <a href={t.anexo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                                      <FileText className="h-3.5 w-3.5" />
                                                      Ver anexo
                                                    </a>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                                                      <AlertCircle className="h-3.5 w-3.5" />
                                                      Pendente
                                                    </span>
                                                  )}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">Nenhum treinamento vinculado</p>
                                        )}
                                      </div>
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
                                        {/* Agrupar equipamentos por treinamento */}
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
          <InstrutorSolicitacoesTab />
        </TabsContent>

        <TabsContent value="indisponibilidade" className="mt-6">
          <ControleIndisponibilidade 
            empresaSstId={profile?.empresa_id} 
            tipo="sst" 
          />
        </TabsContent>

        <TabsContent value="suporte" className="mt-6">
          <InstrutorSuporteTab />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog - Novo componente com 3 etapas */}
      <InstrutorCadastroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          fetchInstrutores();
          // Limpar dados persistidos após salvar com sucesso
          setPersistedFormData(null);
        }}
        editingInstrutor={editingInstrutor}
        persistedFormData={!editingInstrutor ? persistedFormData : null}
        onFormDataChange={(data) => {
          // Só persistir se for novo cadastro (não edição)
          if (!editingInstrutor) {
            setPersistedFormData(data);
          }
        }}
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
        onSuccess={() => {
          fetchInstrutores();
          // Atualizar detalhes se a linha estiver expandida
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
        onSuccess={() => {
          // Callback opcional para atualizar dados se necessário
        }}
      />

      {/* Empresa Parceira Dialog */}
      <AlertDialog open={empresaParceiraDialogOpen} onOpenChange={setEmpresaParceiraDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
              Empresa Parceira
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {selectedEmpresaParceira && (
                  <>
                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                      <span className="font-medium text-foreground">Nome:</span>
                      <span>{selectedEmpresaParceira.nome}</span>
                    </div>
                    {selectedEmpresaParceira.cnpj && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="font-medium text-foreground">CNPJ:</span>
                        <span>{selectedEmpresaParceira.cnpj}</span>
                      </div>
                    )}
                    {selectedEmpresaParceira.email && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="font-medium text-foreground">E-mail:</span>
                        <span>{selectedEmpresaParceira.email}</span>
                      </div>
                    )}
                    {selectedEmpresaParceira.telefone && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="font-medium text-foreground">Telefone:</span>
                        <span>{selectedEmpresaParceira.telefone}</span>
                      </div>
                    )}
                    {selectedEmpresaParceira.responsavel && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="font-medium text-foreground">Responsável:</span>
                        <span>{selectedEmpresaParceira.responsavel}</span>
                      </div>
                    )}
                    {selectedEmpresaParceira.tipo_fornecedor && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="font-medium text-foreground">Tipo:</span>
                        <span className="capitalize">{selectedEmpresaParceira.tipo_fornecedor.replace('_', ' ')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Aptidão do Instrutor */}
      <Dialog open={aptidaoDialogOpen} onOpenChange={setAptidaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedInstrutorAptidao?.aptidao.apto ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Status de Aptidão
            </DialogTitle>
            <DialogDescription>
              Instrutor: <span className="font-medium">{selectedInstrutorAptidao?.instrutor.nome}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedInstrutorAptidao && (
            <div className="space-y-4">
              {/* Status geral */}
              <div className={`p-4 rounded-lg ${selectedInstrutorAptidao.aptidao.apto ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {selectedInstrutorAptidao.aptidao.apto ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Instrutor APTO</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Instrutor NÃO APTO</span>
                    </>
                  )}
                </div>
                <p className="text-sm mt-2 text-slate-600">
                  {selectedInstrutorAptidao.aptidao.apto 
                    ? 'Este instrutor possui todas as formações e treinamentos com anexos válidos e pode ser atribuído a turmas.'
                    : 'Este instrutor possui pendências que precisam ser resolvidas antes de poder ser atribuído a turmas.'}
                </p>
              </div>

              {/* Critérios */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Critérios de Aptidão
                </h4>

                {/* Formações */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Formações Acadêmicas</span>
                    {selectedInstrutorAptidao.aptidao.temFormacao && selectedInstrutorAptidao.aptidao.formacoesSemAnexo.length === 0 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">OK</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Pendente</span>
                    )}
                  </div>
                  {!selectedInstrutorAptidao.aptidao.temFormacao ? (
                    <p className="text-sm text-red-600 mt-2">
                      ⚠️ Nenhuma formação cadastrada. Cadastre pelo menos uma formação acadêmica.
                    </p>
                  ) : selectedInstrutorAptidao.aptidao.formacoesSemAnexo.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-sm text-red-600 mb-1">⚠️ Formações sem anexo:</p>
                      <ul className="text-sm text-slate-600 list-disc list-inside">
                        {selectedInstrutorAptidao.aptidao.formacoesSemAnexo.map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedInstrutorAptidao.aptidao.formacoesComAnexo} formação(ões) com anexo válido
                    </p>
                  )}
                </div>

                {/* Treinamentos */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Treinamentos Vinculados</span>
                    {selectedInstrutorAptidao.aptidao.temTreinamento && selectedInstrutorAptidao.aptidao.treinamentosSemAnexo.length === 0 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">OK</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Pendente</span>
                    )}
                  </div>
                  {!selectedInstrutorAptidao.aptidao.temTreinamento ? (
                    <p className="text-sm text-red-600 mt-2">
                      ⚠️ Nenhum treinamento vinculado. Vincule pelo menos um treinamento às formações.
                    </p>
                  ) : selectedInstrutorAptidao.aptidao.treinamentosSemAnexo.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-sm text-red-600 mb-1">⚠️ Treinamentos sem anexo:</p>
                      <ul className="text-sm text-slate-600 list-disc list-inside">
                        {selectedInstrutorAptidao.aptidao.treinamentosSemAnexo.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedInstrutorAptidao.aptidao.treinamentosComAnexo} treinamento(s) com anexo válido
                    </p>
                  )}
                </div>
              </div>

              {/* Ação para resolver pendências */}
              {!selectedInstrutorAptidao.aptidao.apto && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Como resolver:</strong> Acesse o botão de upload de documentos (ícone de upload) na coluna de ações para anexar os documentos pendentes.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setAptidaoDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão com digitação obrigatória */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false);
          setInstrutorToDelete(null);
          setDeleteConfirmText('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Excluir Instrutor Permanentemente
            </DialogTitle>
            <DialogDescription className="text-base">
              Esta ação é <strong className="text-destructive">irreversível</strong> e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {instrutorToDelete && (
            <div className="space-y-4">
              {/* Destaque do nome do instrutor */}
              <div className="bg-muted rounded-lg p-3 border">
                <p className="text-sm text-muted-foreground">Instrutor selecionado:</p>
                <p className="text-lg font-bold text-foreground">{instrutorToDelete.nome}</p>
                <p className="text-sm text-muted-foreground">{instrutorToDelete.email}</p>
              </div>

              {/* AVISO IMPORTANTE SOBRE TURMAS - Destaque com cor warning */}
              <div className="bg-warning/10 border-2 border-warning rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-bold text-warning text-base">
                      ⚠️ INSTRUTOR SERÁ REMOVIDO DAS TURMAS
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      Se este instrutor estiver vinculado a <strong>turmas agendadas ou em andamento</strong>, 
                      ele será <strong className="text-warning">desvinculado automaticamente</strong> e as turmas 
                      ficarão <strong className="text-destructive">sem instrutor atribuído</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Você precisará atribuir outro instrutor manualmente a essas turmas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista do que será excluído */}
              <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
                <p className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Dados que serão excluídos permanentemente:
                </p>
                <ul className="text-sm space-y-1 text-foreground ml-6">
                  <li>• Todas as formações acadêmicas cadastradas</li>
                  <li>• Todos os treinamentos vinculados</li>
                  <li>• Todos os anexos e documentos (Storage)</li>
                  <li>• Assinatura digital</li>
                  <li>• Datas de indisponibilidade</li>
                  <li>• Equipamentos cadastrados</li>
                  {instrutorToDelete.user_id && (
                    <li className="text-destructive font-medium">• Conta de acesso ao sistema (login)</li>
                  )}
                </ul>
              </div>

              {/* Campo de confirmação */}
              <div className="space-y-2 bg-muted/50 rounded-lg p-4 border">
                <label className="text-sm font-medium block">
                  Para confirmar a exclusão, digite o nome completo do instrutor:
                </label>
                <p className="text-base font-bold text-primary mb-2">"{instrutorToDelete.nome}"</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  onPaste={handlePasteBlock}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  placeholder="Digite o nome exatamente como mostrado acima..."
                  className="border-destructive/50 focus:border-destructive focus:ring-destructive"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Copiar e colar está desabilitado. Digite manualmente para confirmar.
                </p>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setInstrutorToDelete(null);
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                  className="min-w-[100px]"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isDeleteConfirmValid() || deleting}
                  className="min-w-[180px]"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Permanentemente
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Instrutores;
