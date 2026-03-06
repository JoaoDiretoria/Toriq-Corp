import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Check,
  Clock,
  X,
  CalendarIcon,
  MapPin,
  Loader2,
  CalendarDays,
  CalendarX,
  Package,
  PackageX,
  Search,
  ArrowUpDown,
  Calculator,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  MoreHorizontal,
  FileCheck,
  Download,
  Filter,
  MessageSquare,
  History as HistoryIcon,
  Settings,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { calculateDistancesFromInstructors, DistanceResult } from '@/lib/googleMapsService';
import { ClienteSearchPopup } from './ClienteSearchPopup';
import { TreinamentoSearchPopup } from './TreinamentoSearchPopup';
import { InstrutorFilterPopup } from './InstrutorFilterPopup';
import { TurmasAuditoriaPopup } from './TurmasAuditoriaPopup';
import { useTurmasAuditoria } from '@/hooks/useTurmasAuditoria';

interface AulaAgendadaTurma {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  horas: number;
}

interface Turma {
  id: string;
  numero_turma: number;
  codigo_turma: string | null;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_id: string;
  municipio: string;
  uf: string;
  treinamento_nome: string;
  treinamento_id: string;
  tipo_treinamento: string;
  horario: string;
  carga_horaria: string;
  instrutor_nome: string | null;
  instrutor_id: string | null;
  dias_marcados: number[];
  quantidade_participantes: number;
  data_inicio: string;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  aulas: AulaAgendadaTurma[];
  validado: boolean;
  observacoes: string | null;
}

interface Instrutor {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  treinamentos_ids: string[];
  datas_indisponiveis: string[];
  possui_equipamentos_proprios: boolean;
  equipamentos: Record<string, { nome: string; quantidade: number }[]>;
  apto: boolean; // Indica se o instrutor está apto globalmente (formações e treinamentos com anexos)
  treinamentos_aptos: string[]; // IDs dos treinamentos para os quais o instrutor tem formação + anexo
  empresa_parceira_id: string | null; // ID da empresa parceira (se for instrutor de parceira)
}

interface Cliente {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
}

interface ClienteDB {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number;
  ch_reciclagem: number;
  ch_formacao_obrigatoria: boolean;
  ch_reciclagem_obrigatoria: boolean;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const ANOS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

const DIAS_SEMANA_SIGLAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Função para formatar CNPJ
const formatarCNPJ = (cnpj: string | null): string => {
  if (!cnpj) return '';
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return cnpj;
  // Aplica máscara XX.XXX.XXX/XXXX-XX
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

// Função para remover máscara do CNPJ para comparação
const limparCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '');
};

export function SSTAgendaTreinamentos() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Ler parâmetros da URL para navegação direta
  const turmaIdFromUrl = searchParams.get('turmaId');
  const mesFromUrl = searchParams.get('mes');
  const anoFromUrl = searchParams.get('ano');
  const codigoTurmaFromUrl = searchParams.get('codigoTurma');
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [instrutores, setInstrutores] = useState<Instrutor[]>([]);
  const [instrutoresDatasIndisponiveis, setInstrutoresDatasIndisponiveis] = useState<Map<string, string[]>>(new Map());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para turma destacada (vinda da URL)
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string | null>(turmaIdFromUrl);
  
  const [mesAtual, setMesAtual] = useState(mesFromUrl ? parseInt(mesFromUrl) : new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(anoFromUrl ? parseInt(anoFromUrl) : new Date().getFullYear());
  
  // Sincronizar estados com parâmetros da URL quando mudarem
  useEffect(() => {
    if (mesFromUrl) {
      setMesAtual(parseInt(mesFromUrl));
    }
    if (anoFromUrl) {
      setAnoAtual(parseInt(anoFromUrl));
    }
    if (turmaIdFromUrl) {
      setTurmaSelecionadaId(turmaIdFromUrl);
    }
  }, [mesFromUrl, anoFromUrl, turmaIdFromUrl]);
  const [semanaAtual, setSemanaAtual] = useState('');
  const semanaInicializadaRef = useRef(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [salvando, setSalvando] = useState(false);
  
  // Estado para o dialog de atribuição de instrutor
  const [instrutorDialogOpen, setInstrutorDialogOpen] = useState(false);
  const [turmaParaAtribuirInstrutor, setTurmaParaAtribuirInstrutor] = useState<Turma | null>(null);
  const [instrutorSelecionadoTemp, setInstrutorSelecionadoTemp] = useState<string | null>(null);
  
  // Estados para busca e ordenação no dialog de instrutor
  const [instrutorBusca, setInstrutorBusca] = useState('');
  const [instrutorOrdenacao, setInstrutorOrdenacao] = useState<'distancia_asc' | 'distancia_desc' | 'equipamento' | 'nome'>('nome');
  const [calculoDistanciaIniciado, setCalculoDistanciaIniciado] = useState(false);
  
  // Estado para busca na agenda
  const [buscaAgenda, setBuscaAgenda] = useState('');
  
  // Estado para filtro por tipo
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  
  // Estado para filtro por validação
  const [filtroValidado, setFiltroValidado] = useState<string>('todos');
  
  // Estado para filtro por instrutor
  const [filtroInstrutor, setFiltroInstrutor] = useState<string>('todos');
  const [filtroInstrutorNome, setFiltroInstrutorNome] = useState<string>('Todos');
  const [instrutorFilterPopupOpen, setInstrutorFilterPopupOpen] = useState(false);
  
  // Estado para popup de auditoria
  const [auditoriaPopupOpen, setAuditoriaPopupOpen] = useState(false);
  
  // Estado para dialog de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [turmaParaDeletar, setTurmaParaDeletar] = useState<Turma | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletando, setDeletando] = useState(false);
  
  // Hook de auditoria
  const { registrarAuditoria } = useTurmasAuditoria();
  
  // Estado para exportação em background
  const [exportando, setExportando] = useState(false);
  
  // Estado para distâncias progressivas (por instrutor)
  const [distanciasProgressivas, setDistanciasProgressivas] = useState<Map<string, DistanceResult>>(new Map());
  
  interface AulaAgendada {
    id: string;
    data: string;
    inicio: string;
    fim: string;
    horas: number;
  }

  const [formData, setFormData] = useState({
    numero_turma: 0,
    treinamento_id: '',
    tipo_treinamento: '',
    carga_horaria_total: 0,
    carga_horaria_obrigatoria: false,
    cliente_id: '',
    quantidade_participantes: 0,
    observacoes: '',
    aulas: [] as AulaAgendada[]
  });

  const [novaAula, setNovaAula] = useState({
    inicio: '08:00',
    fim: '17:00',
    horas: 8
  });
  
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [editandoAulaId, setEditandoAulaId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Estados para popups de busca
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [treinamentoSearchOpen, setTreinamentoSearchOpen] = useState(false);
  const [clienteSelecionadoNome, setClienteSelecionadoNome] = useState('');
  const [treinamentoSelecionadoNome, setTreinamentoSelecionadoNome] = useState('');
  
  // Estado para distâncias dos instrutores (calculadas via Google Maps API)
  const [instrutorDistances, setInstrutorDistances] = useState<Map<string, Map<string, DistanceResult>>>(new Map());
  const [loadingDistances, setLoadingDistances] = useState<Set<string>>(new Set());
  
  // Estado para status de contato dos instrutores (turmaId -> instrutorId -> status)
  const [statusContato, setStatusContato] = useState<Map<string, Map<string, string>>>(new Map());
  
  // Opções de status de contato (ordem alfabética)
  const statusContatoOpcoes = [
    'Consegue atender mas cobra mais caro',
    'Entrar em contato em outro horário',
    'Irá ministrar o treinamento',
    'Irá verificar na agenda',
    'Não consegue atender nessa data',
    'Não respondeu o contato',
    'Não retornou o contato',
    'Tem que procurar',
  ];
  
  // Refs para evitar problemas de closure no useCallback
  const loadingDistancesRef = useRef<Set<string>>(new Set());
  const instrutorDistancesRef = useRef<Map<string, Map<string, DistanceResult>>>(new Map());

  // Função para obter as semanas do mês
  // Semana começa na segunda-feira (1) e termina no domingo (0)
  const getSemanasDoMes = () => {
    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate();
    let diaSemanaInicio = primeiroDia.getDay(); // 0=Domingo, 1=Segunda, etc.
    
    // Converter para formato onde Segunda=0, Terça=1, ..., Domingo=6
    diaSemanaInicio = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
    
    const semanas: { id: string; label: string; dias: (number | null)[] }[] = [];
    let semanaNum = 1;
    
    // Primeira semana - pode começar no meio da semana
    let semanaAtualDias: (number | null)[] = [];
    
    // Preencher dias vazios antes do dia 1
    for (let i = 0; i < diaSemanaInicio; i++) {
      semanaAtualDias.push(null);
    }
    
    // Preencher os dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      semanaAtualDias.push(dia);
      
      // Se chegou no domingo (7 dias) ou é o último dia do mês
      if (semanaAtualDias.length === 7 || dia === ultimoDia) {
        // Preencher dias vazios no final da última semana
        while (semanaAtualDias.length < 7) {
          semanaAtualDias.push(null);
        }
        
        // Encontrar primeiro e último dia real da semana
        const diasReais = semanaAtualDias.filter(d => d !== null) as number[];
        const primeiroReal = diasReais[0];
        const ultimoReal = diasReais[diasReais.length - 1];
        
        semanas.push({
          id: `semana${semanaNum}`,
          label: `${String(primeiroReal).padStart(2, '0')} à ${String(ultimoReal).padStart(2, '0')}/${String(mesAtual + 1).padStart(2, '0')}`,
          dias: semanaAtualDias
        });
        
        semanaAtualDias = [];
        semanaNum++;
      }
    }
    
    return semanas;
  };

  const semanas = getSemanasDoMes();

  // Auto-selecionar a semana que contém o dia atual ou a turma filtrada
  // Só executa na primeira vez que as turmas são carregadas ou quando mês/ano mudam
  useEffect(() => {
    // Se já foi inicializada e não mudou mês/ano, não fazer nada
    // A semana só deve ser resetada quando o mês ou ano mudam
    if (semanaInicializadaRef.current && semanaAtual) {
      return;
    }
    
    // Se veio turmaId da URL, encontrar a semana onde a turma está
    if (turmaIdFromUrl && turmas.length > 0) {
      const turmaFiltrada = turmas.find(t => t.id === turmaIdFromUrl);
      if (turmaFiltrada && turmaFiltrada.aulas && turmaFiltrada.aulas.length > 0) {
        // Pegar a primeira aula da turma para encontrar a semana
        const primeiraAula = turmaFiltrada.aulas[0];
        const dataAula = new Date(primeiraAula.data + 'T00:00:00');
        const diaAula = dataAula.getDate();
        
        const semanaCorreta = semanas.find(s => {
          const diasReais = s.dias.filter(d => d !== null) as number[];
          return diasReais.length > 0 && diaAula >= diasReais[0] && diaAula <= diasReais[diasReais.length - 1];
        });
        
        if (semanaCorreta) {
          setSemanaAtual(semanaCorreta.id);
          semanaInicializadaRef.current = true;
          return;
        }
      }
    }
    
    // Comportamento padrão: selecionar semana atual ou primeira semana
    const hoje = new Date();
    if (mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) {
      const diaHoje = hoje.getDate();
      const semanaHoje = semanas.find(s => {
        const diasReais = s.dias.filter(d => d !== null) as number[];
        return diasReais.length > 0 && diaHoje >= diasReais[0] && diaHoje <= diasReais[diasReais.length - 1];
      });
      if (semanaHoje) {
        setSemanaAtual(semanaHoje.id);
        semanaInicializadaRef.current = true;
      }
    } else {
      setSemanaAtual('semana1');
      semanaInicializadaRef.current = true;
    }
  }, [mesAtual, anoAtual, turmas, turmaIdFromUrl]);
  
  // Resetar a flag de inicialização quando mês ou ano mudam
  useEffect(() => {
    semanaInicializadaRef.current = false;
  }, [mesAtual, anoAtual]);

  useEffect(() => {
    fetchData();
  }, [empresaId, mesAtual, anoAtual]);

  const fetchData = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      // Buscar treinamentos do catálogo
      const { data: treinamentosData, error: treinamentosError } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma, ch_formacao, ch_reciclagem, ch_formacao_obrigatoria, ch_reciclagem_obrigatoria')
        .eq('empresa_id', empresaId)
        .order('norma', { ascending: true })
        .order('nome', { ascending: true });

      if (treinamentosError) {
        console.error('Erro ao buscar treinamentos:', treinamentosError);
      } else {
        const treinamentosFormatados: Treinamento[] = (treinamentosData || []).map(t => ({
          id: t.id,
          nome: t.nome,
          norma: t.norma,
          ch_formacao: t.ch_formacao || 0,
          ch_reciclagem: t.ch_reciclagem || 0,
          ch_formacao_obrigatoria: t.ch_formacao_obrigatoria || false,
          ch_reciclagem_obrigatoria: t.ch_reciclagem_obrigatoria || false
        }));
        // Ordenar numericamente por NR e depois por nome
        treinamentosFormatados.sort((a, b) => {
          const numA = parseInt(a.norma, 10) || 0;
          const numB = parseInt(b.norma, 10) || 0;
          if (numA !== numB) return numA - numB;
          return a.nome.localeCompare(b.nome);
        });
        setTreinamentos(treinamentosFormatados);
      }

      // Buscar IDs das empresas parceiras desta empresa SST
      const { data: empresasParceirasList } = await supabase
        .from('empresas_parceiras')
        .select('id')
        .eq('empresa_sst_id', empresaId);
      
      const empresaParceiraIds = (empresasParceirasList || []).map((ep: any) => ep.id);
      
      // Buscar instrutores com cidade, UF e treinamentos que ministram
      // Inclui instrutores próprios E de empresas parceiras
      const instrutoresQuery = (supabase as any)
        .from('instrutores')
        .select(`
          id, 
          nome, 
          cidade, 
          uf,
          possui_equipamentos_proprios,
          empresa_parceira_id,
          instrutor_formacao_treinamento(treinamento_id)
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      const { data: instrutoresData, error: instrutoresError } = await instrutoresQuery;

      if (instrutoresError) {
        console.error('Erro ao buscar instrutores:', instrutoresError);
      } else {
        // Buscar datas indisponíveis de todos os instrutores
        const instrutorIds = (instrutoresData || []).map((i: any) => i.id);
        const datasIndisponiveisMap = new Map<string, string[]>();
        
        if (instrutorIds.length > 0) {
          const { data: datasIndisponiveis, error: datasError } = await (supabase as any)
            .from('instrutor_datas_indisponiveis')
            .select('instrutor_id, data')
            .in('instrutor_id', instrutorIds);
          
          if (datasError) {
            console.error('Erro ao buscar datas indisponíveis:', datasError);
          } else if (datasIndisponiveis) {
            // Agrupar datas por instrutor
            datasIndisponiveis.forEach((d: any) => {
              if (!datasIndisponiveisMap.has(d.instrutor_id)) {
                datasIndisponiveisMap.set(d.instrutor_id, []);
              }
              datasIndisponiveisMap.get(d.instrutor_id)!.push(d.data);
            });
          }
        }
        
        setInstrutoresDatasIndisponiveis(datasIndisponiveisMap);
        
        // Buscar equipamentos de todos os instrutores
        const equipamentosMap = new Map<string, Record<string, { nome: string; quantidade: number }[]>>();
        if (instrutorIds.length > 0) {
          const { data: equipamentosData } = await (supabase as any)
            .from('instrutor_equipamentos')
            .select('instrutor_id, treinamento_id, equipamento_nome, quantidade')
            .in('instrutor_id', instrutorIds);
          
          if (equipamentosData) {
            equipamentosData.forEach((eq: any) => {
              if (!equipamentosMap.has(eq.instrutor_id)) {
                equipamentosMap.set(eq.instrutor_id, {});
              }
              const instEquips = equipamentosMap.get(eq.instrutor_id)!;
              if (!instEquips[eq.treinamento_id]) {
                instEquips[eq.treinamento_id] = [];
              }
              instEquips[eq.treinamento_id].push({ nome: eq.equipamento_nome, quantidade: eq.quantidade });
            });
          }
        }
        
        // Calcular aptidão dos instrutores por treinamento (formação + anexo do vínculo)
        const aptidaoMap = new Map<string, boolean>();
        const treinamentosAptosMap = new Map<string, string[]>();
        if (instrutorIds.length > 0) {
          // Buscar formações com anexo
          const { data: formacoesData } = await (supabase as any)
            .from('instrutor_formacoes')
            .select('instrutor_id, anexo_url')
            .in('instrutor_id', instrutorIds);
          
          // Buscar vínculos formação-treinamento com anexo e treinamento_id
          const { data: vinculosData } = await (supabase as any)
            .from('instrutor_formacao_treinamento')
            .select('instrutor_id, treinamento_id, anexo_url')
            .in('instrutor_id', instrutorIds);
          
          // Calcular aptidão por instrutor e por treinamento
          instrutorIds.forEach((id: string) => {
            const formacoesInstrutor = (formacoesData || []).filter((f: any) => f.instrutor_id === id);
            const vinculosInstrutor = (vinculosData || []).filter((v: any) => v.instrutor_id === id);
            
            const temFormacao = formacoesInstrutor.length > 0;
            const todasFormacoesComAnexo = formacoesInstrutor.every((f: any) => f.anexo_url && f.anexo_url !== '');
            
            // Treinamentos para os quais tem vínculo com anexo
            const treinamentosComAnexo = vinculosInstrutor
              .filter((v: any) => v.anexo_url && v.anexo_url !== '' && v.treinamento_id)
              .map((v: any) => v.treinamento_id);
            treinamentosAptosMap.set(id, treinamentosComAnexo);
            
            const temTreinamento = vinculosInstrutor.length > 0;
            const todosTreinamentosComAnexo = vinculosInstrutor.every((v: any) => v.anexo_url && v.anexo_url !== '');
            
            const apto = temFormacao && todasFormacoesComAnexo && temTreinamento && todosTreinamentosComAnexo;
            aptidaoMap.set(id, apto);
          });
        }
        
        const instrutoresFormatados = (instrutoresData || []).map((i: any) => ({
          id: i.id,
          nome: i.nome,
          cidade: i.cidade,
          uf: i.uf,
          treinamentos_ids: (i.instrutor_formacao_treinamento || []).map((t: any) => t.treinamento_id).filter(Boolean),
          datas_indisponiveis: datasIndisponiveisMap.get(i.id) || [],
          possui_equipamentos_proprios: i.possui_equipamentos_proprios || false,
          equipamentos: equipamentosMap.get(i.id) || {},
          apto: aptidaoMap.get(i.id) || false,
          treinamentos_aptos: treinamentosAptosMap.get(i.id) || [],
          empresa_parceira_id: i.empresa_parceira_id || null
        }));
        console.log('[fetchData] Instrutores carregados:', instrutoresFormatados.map(i => ({
          nome: i.nome,
          cidade: i.cidade,
          uf: i.uf,
          treinamentos: i.treinamentos_ids.length,
          datas_indisponiveis: i.datas_indisponiveis.length,
          apto: i.apto
        })));
        setInstrutores(instrutoresFormatados);
      }

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes_sst')
        .select(`
          id, 
          nome,
          cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(cidade, estado)
        `)
        .eq('empresa_sst_id', empresaId)
        .order('nome', { ascending: true });

      if (clientesError) {
        console.error('Erro ao buscar clientes:', clientesError);
      } else {
        const clientesFormatados: Cliente[] = (clientesData || []).map((c: any) => ({
          id: c.id,
          nome: c.nome,
          municipio: c.cliente_empresa?.cidade || '',
          uf: c.cliente_empresa?.estado || ''
        }));
        setClientes(clientesFormatados);
      }

      // Buscar turmas do banco de dados
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          cliente_id,
          treinamento_id,
          tipo_treinamento,
          carga_horaria_total,
          instrutor_id,
          quantidade_participantes,
          status,
          validado,
          created_at,
          observacoes,
          cliente:clientes_sst!turmas_treinamento_cliente_id_fkey(
            nome,
            cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(cidade, estado, cnpj)
          ),
          treinamento:catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(nome, norma),
          instrutor:instrutores!turmas_treinamento_instrutor_id_fkey(nome),
          aulas:turmas_treinamento_aulas(id, data, hora_inicio, hora_fim, horas)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (turmasError) {
        console.error('Erro ao buscar turmas:', turmasError);
      } else {
        console.log('[fetchData] Turmas raw data:', turmasData?.map(t => ({
          cliente_nome: (t as any).cliente?.nome,
          municipio: (t as any).cliente?.cliente_empresa?.cidade,
          uf: (t as any).cliente?.cliente_empresa?.estado
        })));
        const turmasFormatadas: Turma[] = (turmasData || []).map((t: any) => {
          const primeiraAula = t.aulas && t.aulas.length > 0 
            ? t.aulas.sort((a: any, b: any) => a.data.localeCompare(b.data))[0] 
            : null;
          
          return {
            id: t.id,
            numero_turma: t.numero_turma,
            codigo_turma: t.codigo_turma || null,
            cliente_id: t.cliente_id,
            cliente_nome: t.cliente?.nome || '',
            cliente_cnpj: t.cliente?.cliente_empresa?.cnpj || null,
            municipio: t.cliente?.cliente_empresa?.cidade || '',
            uf: t.cliente?.cliente_empresa?.estado || '',
            treinamento_id: t.treinamento_id,
            tipo_treinamento: t.tipo_treinamento || 'Inicial',
            treinamento_nome: `NR ${t.treinamento?.norma} - ${t.treinamento?.nome} (${t.tipo_treinamento})`,
            horario: primeiraAula ? `${primeiraAula.hora_inicio.substring(0,5)}-${primeiraAula.hora_fim.substring(0,5)}` : '',
            carga_horaria: `${t.carga_horaria_total}h`,
            instrutor_id: t.instrutor_id,
            instrutor_nome: t.instrutor?.nome || null,
            dias_marcados: [],
            quantidade_participantes: t.quantidade_participantes || 0,
            data_inicio: primeiraAula?.data || '',
            status: t.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
            aulas: (t.aulas || []).map((a: any) => ({
              id: a.id,
              data: a.data,
              inicio: a.hora_inicio.substring(0, 5),
              fim: a.hora_fim.substring(0, 5),
              horas: a.horas
            })),
            validado: t.validado || false,
            observacoes: t.observacoes || null
          };
        });
        setTurmas(turmasFormatadas);
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNovoAgendamento = () => {
    setEditingTurma(null);
    setFormData({
      numero_turma: turmas.length + 1,
      treinamento_id: '',
      tipo_treinamento: '',
      carga_horaria_total: 0,
      carga_horaria_obrigatoria: false,
      cliente_id: '',
      quantidade_participantes: 0,
      observacoes: '',
      aulas: []
    });
    setNovaAula({ inicio: '08:00', fim: '17:00', horas: 8 });
    setDatasSelecionadas([]);
    setEditandoAulaId(null);
    setClienteSelecionadoNome('');
    setTreinamentoSelecionadoNome('');
    setDialogOpen(true);
  };

  const handleEditTurma = (turma: Turma) => {
    setEditingTurma(turma);
    
    // Converter as aulas da turma para o formato do formulário
    const aulasFormatadas: AulaAgendada[] = turma.aulas.map(aula => ({
      id: aula.id,
      data: aula.data,
      inicio: aula.inicio,
      fim: aula.fim,
      horas: aula.horas
    }));
    
    setFormData({
      numero_turma: turma.numero_turma,
      treinamento_id: turma.treinamento_id,
      tipo_treinamento: turma.tipo_treinamento,
      carga_horaria_total: parseInt(turma.carga_horaria) || 0,
      carga_horaria_obrigatoria: false,
      cliente_id: turma.cliente_id,
      quantidade_participantes: turma.quantidade_participantes || 0,
      observacoes: turma.observacoes || '',
      aulas: aulasFormatadas
    });
    setNovaAula({ inicio: '08:00', fim: '17:00', horas: 8 });
    setDatasSelecionadas([]);
    setEditandoAulaId(null);
    setClienteSelecionadoNome(turma.cliente_nome);
    setTreinamentoSelecionadoNome(turma.treinamento_nome);
    setDialogOpen(true);
  };

  const calcularHoras = (inicio: string, fim: string, descontarAlmoco: boolean = false): number => {
    if (!inicio || !fim || !inicio.includes(':') || !fim.includes(':')) return 0;
    
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    let [hFim, mFim] = fim.split(':').map(Number);
    
    // Tratar 24:00 como meia-noite (equivalente a 00:00 do dia seguinte)
    if (hFim === 24) hFim = 24; // Manter como 24 para cálculo correto
    
    let totalMinutos = (hFim * 60 + mFim) - (hInicio * 60 + mInicio);
    
    // Se o fim for menor que o início, significa que passou da meia-noite
    if (totalMinutos < 0) {
      totalMinutos = (24 * 60 + hFim * 60 + mFim) - (hInicio * 60 + mInicio);
    }
    
    // Descontar 1h de almoço se o período for >= 8h
    if (descontarAlmoco && totalMinutos >= 480) {
      totalMinutos -= 60;
    }
    
    return Math.max(0, Math.floor(totalMinutos / 60));
  };

  const handleAdicionarAula = () => {
    if (datasSelecionadas.length === 0) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione pelo menos uma data para a aula.",
        variant: "destructive",
      });
      return;
    }

    const horasBrutas = calcularHoras(novaAula.inicio, novaAula.fim, false);
    const horasComDesconto = calcularHoras(novaAula.inicio, novaAula.fim, true);
    // Se >= 8h, desconta almoço
    const horas = horasBrutas >= 8 ? horasComDesconto : horasBrutas;

    const novasAulas: AulaAgendada[] = datasSelecionadas
      .sort((a, b) => a.getTime() - b.getTime())
      .map((data, index) => ({
        id: `${Date.now()}-${index}`,
        data: format(data, 'yyyy-MM-dd'),
        inicio: novaAula.inicio,
        fim: novaAula.fim,
        horas
      }));

    setFormData(prev => ({
      ...prev,
      aulas: [...prev.aulas, ...novasAulas]
    }));

    setDatasSelecionadas([]);
    setNovaAula({ inicio: '08:00', fim: '17:00', horas: 8 });
    setCalendarOpen(false);
  };

  const handleRemoverAula = (aulaId: string) => {
    setFormData(prev => ({
      ...prev,
      aulas: prev.aulas.filter(a => a.id !== aulaId)
    }));
  };

  const handleEditarAula = (aulaId: string) => {
    setEditandoAulaId(editandoAulaId === aulaId ? null : aulaId);
  };

  const handleSalvarEdicaoAula = (aulaId: string, novoInicio: string, novoFim: string) => {
    const horasBrutas = calcularHoras(novoInicio, novoFim, false);
    const horasComDesconto = calcularHoras(novoInicio, novoFim, true);
    const horas = horasBrutas >= 8 ? horasComDesconto : horasBrutas;

    setFormData(prev => ({
      ...prev,
      aulas: prev.aulas.map(a => 
        a.id === aulaId 
          ? { ...a, inicio: novoInicio, fim: novoFim, horas }
          : a
      )
    }));
    setEditandoAulaId(null);
  };

  const getTotalHorasAgendadas = () => {
    return formData.aulas.reduce((total, aula) => total + aula.horas, 0);
  };

  // Função para filtrar turmas da semana selecionada
  const getTurmasDaSemanaReais = () => {
    const semanaInfo = semanas.find(s => s.id === semanaAtual);
    if (!semanaInfo) return [];

    // Obter dias reais da semana (sem nulls)
    const diasReais = semanaInfo.dias.filter(d => d !== null) as number[];
    if (diasReais.length === 0) return [];

    const primeirodia = diasReais[0];
    const ultimoDia = diasReais[diasReais.length - 1];

    const dataInicioSemana = new Date(anoAtual, mesAtual, primeirodia);
    const dataFimSemana = new Date(anoAtual, mesAtual, ultimoDia, 23, 59, 59);

    // Se veio turmaId da URL, filtrar apenas essa turma
    if (turmaIdFromUrl) {
      return turmas.filter(turma => turma.id === turmaIdFromUrl);
    }
    
    // Primeiro filtrar por busca (se houver)
    let turmasFiltradas = turmas;
    if (buscaAgenda.trim()) {
      const termoBusca = buscaAgenda.toLowerCase().trim();
      turmasFiltradas = turmas.filter(turma => {
        // Buscar por código da turma
        const codigoTurma = turma.codigo_turma?.toLowerCase() || '';
        const codigoMatch = codigoTurma.includes(termoBusca);
        
        // Buscar por NR (norma do treinamento)
        const treinamento = treinamentos.find(t => t.id === turma.treinamento_id);
        const norma = treinamento?.norma?.toLowerCase() || '';
        const nrMatch = norma.includes(termoBusca) || `nr ${norma}`.includes(termoBusca) || `nr${norma}`.includes(termoBusca);
        
        // Buscar por nome do treinamento
        const treinamentoNome = turma.treinamento_nome?.toLowerCase() || '';
        const treinamentoMatch = treinamentoNome.includes(termoBusca);
        
        // Buscar por nome do cliente
        const clienteNome = turma.cliente_nome?.toLowerCase() || '';
        const clienteMatch = clienteNome.includes(termoBusca);
        
        // Buscar por CNPJ do cliente (com ou sem máscara)
        const clienteCnpj = turma.cliente_cnpj || '';
        const termoBuscaLimpo = limparCNPJ(termoBusca);
        const cnpjMatch = termoBuscaLimpo.length >= 3 && (
          limparCNPJ(clienteCnpj).includes(termoBuscaLimpo) ||
          formatarCNPJ(clienteCnpj).toLowerCase().includes(termoBusca)
        );
        
        // Buscar por instrutor
        const instrutorNome = turma.instrutor_nome?.toLowerCase() || '';
        const instrutorMatch = instrutorNome.includes(termoBusca);
        
        return codigoMatch || nrMatch || treinamentoMatch || clienteMatch || cnpjMatch || instrutorMatch;
      });
    }
    
    // Aplicar filtro por tipo
    if (filtroTipo !== 'todos') {
      turmasFiltradas = turmasFiltradas.filter(turma => turma.tipo_treinamento === filtroTipo);
    }
    
    // Aplicar filtro por validação
    if (filtroValidado !== 'todos') {
      turmasFiltradas = turmasFiltradas.filter(turma => 
        filtroValidado === 'validado' ? turma.validado : !turma.validado
      );
    }
    
    // Aplicar filtro por instrutor
    if (filtroInstrutor !== 'todos') {
      if (filtroInstrutor === 'com') {
        // Filtrar turmas que possuem instrutor
        turmasFiltradas = turmasFiltradas.filter(turma => turma.instrutor_id !== null);
      } else if (filtroInstrutor === 'sem') {
        // Filtrar turmas que não possuem instrutor
        turmasFiltradas = turmasFiltradas.filter(turma => turma.instrutor_id === null);
      } else {
        // Filtrar por ID específico do instrutor
        turmasFiltradas = turmasFiltradas.filter(turma => turma.instrutor_id === filtroInstrutor);
      }
    }
    
    return turmasFiltradas.filter(turma => {
      // Verifica se alguma aula da turma está dentro da semana
      if (turma.aulas && turma.aulas.length > 0) {
        return turma.aulas.some(aula => {
          const dataAula = new Date(aula.data + 'T00:00:00');
          return dataAula >= dataInicioSemana && dataAula <= dataFimSemana;
        });
      }
      // Fallback para data_inicio se não tiver aulas
      const dataInicio = new Date(turma.data_inicio + 'T00:00:00');
      return dataInicio >= dataInicioSemana && dataInicio <= dataFimSemana;
    });
  };

  // Função para exportar dados em Excel
  const handleExportar = async (escopo: 'semana' | 'mes' | 'tudo') => {
    setExportando(true);
    
    try {
      // Definir quais turmas exportar
      let turmasParaExportar: Turma[] = [];
      let nomeArquivo = '';
      
      if (escopo === 'semana') {
        turmasParaExportar = getTurmasDaSemanaReais();
        const semanaInfo = semanas.find(s => s.id === semanaAtual);
        nomeArquivo = `agenda_${MESES[mesAtual]}_${anoAtual}_semana${semanaInfo?.id.replace('semana', '') || ''}`;
      } else if (escopo === 'mes') {
        // Buscar todas as turmas do mês
        turmasParaExportar = turmas.filter(turma => {
          if (turma.aulas && turma.aulas.length > 0) {
            return turma.aulas.some(aula => {
              const dataAula = new Date(aula.data + 'T00:00:00');
              return dataAula.getMonth() === mesAtual && dataAula.getFullYear() === anoAtual;
            });
          }
          const dataInicio = new Date(turma.data_inicio + 'T00:00:00');
          return dataInicio.getMonth() === mesAtual && dataInicio.getFullYear() === anoAtual;
        });
        nomeArquivo = `agenda_${MESES[mesAtual]}_${anoAtual}`;
      } else {
        turmasParaExportar = [...turmas];
        nomeArquivo = `agenda_completa_${format(new Date(), 'yyyy-MM-dd')}`;
      }
      
      // Aplicar filtro por tipo se ativo
      if (filtroTipo !== 'todos') {
        turmasParaExportar = turmasParaExportar.filter(t => t.tipo_treinamento === filtroTipo);
      }
      
      if (turmasParaExportar.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há turmas para exportar com os filtros atuais.",
          variant: "destructive"
        });
        setExportando(false);
        return;
      }
      
      // Processar em background usando setTimeout para não travar a UI
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Preparar dados para Excel
      const dadosExcel = turmasParaExportar.map(turma => ({
        'Código': turma.codigo_turma || '-',
        'Cliente': turma.cliente_nome,
        'CNPJ': formatarCNPJ(turma.cliente_cnpj),
        'Município': turma.municipio,
        'UF': turma.uf,
        'Treinamento': turma.treinamento_nome,
        'Tipo': turma.tipo_treinamento === 'Inicial' ? 'Inicial (Formação)' : 
                turma.tipo_treinamento === 'Periódico' ? 'Periódico (Reciclagem)' : turma.tipo_treinamento,
        'Horário': turma.horario,
        'Carga Horária': turma.carga_horaria,
        'Instrutor': turma.instrutor_nome || '-',
        'Participantes': turma.quantidade_participantes,
        'Status': turma.status,
        'Validado': turma.validado ? 'Sim' : 'Não',
        'Datas das Aulas': turma.aulas.map(a => format(new Date(a.data + 'T00:00:00'), 'dd/MM/yyyy')).join(', ')
      }));
      
      // Definir tamanho do chunk (500 linhas por arquivo)
      const CHUNK_SIZE = 500;
      const totalChunks = Math.ceil(dadosExcel.length / CHUNK_SIZE);
      
      if (totalChunks === 1) {
        // Exportar arquivo único
        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
        
        // Ajustar largura das colunas
        const colWidths = [
          { wch: 15 }, // Código
          { wch: 30 }, // Cliente
          { wch: 20 }, // CNPJ
          { wch: 15 }, // Município
          { wch: 5 },  // UF
          { wch: 40 }, // Treinamento
          { wch: 20 }, // Tipo
          { wch: 12 }, // Horário
          { wch: 12 }, // Carga Horária
          { wch: 20 }, // Instrutor
          { wch: 12 }, // Participantes
          { wch: 12 }, // Status
          { wch: 10 }, // Validado
          { wch: 50 }, // Datas das Aulas
        ];
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
      } else {
        // Exportar em múltiplos arquivos (chunks)
        for (let i = 0; i < totalChunks; i++) {
          const chunk = dadosExcel.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const ws = XLSX.utils.json_to_sheet(chunk);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
          
          XLSX.writeFile(wb, `${nomeArquivo}_parte${i + 1}.xlsx`);
          
          // Pequeno delay entre arquivos
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        toast({
          title: "Exportação concluída",
          description: `Foram gerados ${totalChunks} arquivos Excel.`
        });
        setExportando(false);
        return;
      }
      
      toast({
        title: "Exportação concluída!",
        description: `${dadosExcel.length} turmas exportadas com sucesso.`
      });
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro na exportação",
        description: error.message || "Ocorreu um erro ao exportar os dados.",
        variant: "destructive"
      });
    } finally {
      setExportando(false);
    }
  };

  // Interface para linha da tabela (turma real ou placeholder)
  interface LinhaTabela {
    tipo: 'turma' | 'placeholder';
    numeroSemana: number;
    turma?: Turma;
  }

  // Função para obter linhas da semana (10 pré-criadas + extras se necessário)
  const getLinhasDaSemana = (): LinhaTabela[] => {
    const turmasReais = getTurmasDaSemanaReais();
    const linhas: LinhaTabela[] = [];
    
    // Numerar turmas reais de 1 a N dentro da semana
    turmasReais.forEach((turma, index) => {
      linhas.push({
        tipo: 'turma',
        numeroSemana: index + 1,
        turma
      });
    });
    
    // Se temos menos de 10 turmas, adicionar placeholders até 10
    const totalTurmas = turmasReais.length;
    if (totalTurmas < 10) {
      for (let i = totalTurmas + 1; i <= 10; i++) {
        linhas.push({
          tipo: 'placeholder',
          numeroSemana: i
        });
      }
    }
    
    return linhas;
  };

  // Função para obter os dias reais do mês em que a turma tem aulas
  const getDiasDaSemanaComAula = (turma: Turma) => {
    const semanaInfo = semanas.find(s => s.id === semanaAtual);
    if (!semanaInfo || !turma.aulas) return [];

    const diasDaSemana = semanaInfo.dias;
    const diasComAula: number[] = [];
    
    turma.aulas.forEach(aula => {
      const dataAula = new Date(aula.data + 'T00:00:00');
      const diaDoMes = dataAula.getDate();
      
      // Verifica se o dia está na semana atual
      if (diasDaSemana.includes(diaDoMes)) {
        if (!diasComAula.includes(diaDoMes)) {
          diasComAula.push(diaDoMes);
        }
      }
    });

    return diasComAula;
  };

  // Função para obter os dias da semana atual (já vem do getSemanasDoMes)
  const getDiasDaSemanaAtual = () => {
    const semanaInfo = semanas.find(s => s.id === semanaAtual);
    if (!semanaInfo) return [];
    return semanaInfo.dias;
  };

  
  // Função para atualizar status de contato de um instrutor
  const handleStatusContatoChange = (turmaId: string, instrutorId: string, status: string) => {
    setStatusContato(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(turmaId)) {
        newMap.set(turmaId, new Map());
      }
      newMap.get(turmaId)!.set(instrutorId, status);
      return newMap;
    });
  };

  // Função para obter status de contato de um instrutor
  const getStatusContato = (turmaId: string, instrutorId: string): string => {
    return statusContato.get(turmaId)?.get(instrutorId) || '';
  };

  const handleSalvar = async () => {
    if (!empresaId) {
      toast({
        title: "Erro",
        description: "Empresa não identificada.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cliente_id || !formData.treinamento_id || !formData.tipo_treinamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha Cliente, Treinamento e Tipo do Treinamento.",
        variant: "destructive",
      });
      return;
    }

    if (formData.aulas.length === 0) {
      toast({
        title: "Cronograma obrigatório",
        description: "Por favor, adicione pelo menos uma data ao cronograma.",
        variant: "destructive",
      });
      return;
    }

    // Validar se a carga horária do cronograma é igual à carga horária total
    const totalAgendado = getTotalHorasAgendadas();
    if (totalAgendado !== formData.carga_horaria_total) {
      toast({
        title: "Carga horária inválida",
        description: `O total de horas agendadas (${totalAgendado}h) deve ser igual à carga horária total do treinamento (${formData.carga_horaria_total}h).`,
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);
    try {
      if (editingTurma) {
        // Atualizar turma existente
        const { error: updateError } = await supabase
          .from('turmas_treinamento')
          .update({
            cliente_id: formData.cliente_id,
            treinamento_id: formData.treinamento_id,
            tipo_treinamento: formData.tipo_treinamento,
            carga_horaria_total: formData.carga_horaria_total,
            quantidade_participantes: formData.quantidade_participantes,
            observacoes: formData.observacoes || null,
          })
          .eq('id', editingTurma.id);

        if (updateError) throw updateError;

        // Deletar aulas antigas e inserir novas
        await supabase
          .from('turmas_treinamento_aulas')
          .delete()
          .eq('turma_id', editingTurma.id);

        const aulasParaInserir = formData.aulas.map(a => ({
          turma_id: editingTurma.id,
          data: a.data,
          hora_inicio: a.inicio,
          hora_fim: a.fim,
          horas: a.horas
        }));

        const { error: aulasError } = await supabase
          .from('turmas_treinamento_aulas')
          .insert(aulasParaInserir);

        if (aulasError) throw aulasError;

        // Registrar auditoria de atualização - usar nomes já selecionados
        const treinamentoNome = treinamentoSelecionadoNome || treinamentos.find(t => t.id === formData.treinamento_id)?.nome || '';
        const treinamentoAnteriorNome = editingTurma.treinamento_nome || treinamentos.find(t => t.id === editingTurma.treinamento_id)?.nome || '';
        const clienteNome = clienteSelecionadoNome || clientes.find(c => c.id === formData.cliente_id)?.nome || '';
        const clienteAnteriorNome = editingTurma.cliente_nome || clientes.find(c => c.id === editingTurma.cliente_id)?.nome || '';
        
        // Montar descrição e dados apenas dos campos alterados
        const alteracoes: string[] = [];
        const dadosAnteriores: Record<string, any> = { treinamento: treinamentoAnteriorNome };
        const dadosNovos: Record<string, any> = { treinamento: treinamentoNome };
        
        if (editingTurma.cliente_id !== formData.cliente_id) {
          alteracoes.push(`Mudou Cliente: ${clienteAnteriorNome} → ${clienteNome}`);
          dadosAnteriores.cliente = clienteAnteriorNome;
          dadosNovos.cliente = clienteNome;
        }
        if (editingTurma.treinamento_id !== formData.treinamento_id) {
          alteracoes.push(`Mudou Treinamento: ${treinamentoAnteriorNome} → ${treinamentoNome}`);
          dadosAnteriores.treinamento = treinamentoAnteriorNome;
          dadosNovos.treinamento = treinamentoNome;
        }
        if (editingTurma.tipo_treinamento !== formData.tipo_treinamento) {
          alteracoes.push(`Mudou Tipo: ${editingTurma.tipo_treinamento} → ${formData.tipo_treinamento}`);
          dadosAnteriores.tipo = editingTurma.tipo_treinamento;
          dadosNovos.tipo = formData.tipo_treinamento;
        }
        if (editingTurma.quantidade_participantes !== formData.quantidade_participantes) {
          alteracoes.push(`Mudou Participantes: ${editingTurma.quantidade_participantes} → ${formData.quantidade_participantes}`);
          dadosAnteriores.participantes = editingTurma.quantidade_participantes;
          dadosNovos.participantes = formData.quantidade_participantes;
        }
        // Comparar carga horária removendo 'h' se existir
        const cargaAnterior = String(editingTurma.carga_horaria || '').replace('h', '');
        const cargaNova = String(formData.carga_horaria_total || '').replace('h', '');
        if (Number(cargaAnterior) !== Number(cargaNova)) {
          alteracoes.push(`Mudou Carga Horária: ${cargaAnterior}h → ${cargaNova}h`);
          dadosAnteriores.carga_horaria = `${cargaAnterior}h`;
          dadosNovos.carga_horaria = `${cargaNova}h`;
        }
        if ((editingTurma.observacoes || '') !== (formData.observacoes || '')) {
          alteracoes.push(`Mudou Observações`);
          dadosAnteriores.observacoes = editingTurma.observacoes || '-';
          dadosNovos.observacoes = formData.observacoes || '-';
        }
        
        // Verificar se aulas mudaram
        const aulasAntigasStr = JSON.stringify(editingTurma.aulas || []);
        const aulasNovasStr = JSON.stringify(formData.aulas || []);
        if (aulasAntigasStr !== aulasNovasStr) {
          const aulasDescricao = formData.aulas.map((a, i) => 
            `${new Date(a.data).toLocaleDateString('pt-BR')} ${a.inicio}-${a.fim}`
          ).join(', ');
          alteracoes.push(`Mudou Aulas: ${aulasDescricao}`);
          dadosAnteriores.aulas = editingTurma.aulas;
          dadosNovos.aulas = formData.aulas;
        }
        
        // Só registra se houve alteração
        if (alteracoes.length > 0) {
          await registrarAuditoria({
            turmaId: editingTurma.id,
            turmaCodigo: editingTurma.codigo_turma || null,
            acao: 'atualizou',
            entidade: 'turma',
            descricao: `Atualizou turma | ${alteracoes.join(' | ')}`,
            dadosAnteriores,
            dadosNovos
          });
        }

        toast({
          title: "Turma atualizada!",
          description: "A turma foi atualizada com sucesso.",
        });
      } else {
        // Calcular número da turma automaticamente
        const { count } = await supabase
          .from('turmas_treinamento')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId);

        const novoNumeroTurma = (count || 0) + 1;

        // Inserir nova turma
        const { data: novaTurmaData, error: insertError } = await supabase
          .from('turmas_treinamento')
          .insert({
            empresa_id: empresaId,
            numero_turma: novoNumeroTurma,
            cliente_id: formData.cliente_id,
            treinamento_id: formData.treinamento_id,
            tipo_treinamento: formData.tipo_treinamento,
            carga_horaria_total: formData.carga_horaria_total,
            quantidade_participantes: formData.quantidade_participantes,
            observacoes: formData.observacoes || null,
            status: 'agendado'
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Inserir aulas da turma
        const aulasParaInserir = formData.aulas.map(a => ({
          turma_id: novaTurmaData.id,
          data: a.data,
          hora_inicio: a.inicio,
          hora_fim: a.fim,
          horas: a.horas
        }));

        const { error: aulasError } = await supabase
          .from('turmas_treinamento_aulas')
          .insert(aulasParaInserir);

        if (aulasError) throw aulasError;

        // Registrar auditoria de criação - usar nomes já selecionados
        const treinamentoNome = treinamentoSelecionadoNome || treinamentos.find(t => t.id === formData.treinamento_id)?.nome || '';
        const clienteNome = clienteSelecionadoNome || clientes.find(c => c.id === formData.cliente_id)?.nome || '';
        
        // Formatar aulas para descrição
        const aulasDescricao = formData.aulas.map((a, i) => 
          `Aula ${i + 1}: ${new Date(a.data).toLocaleDateString('pt-BR')} ${a.inicio}-${a.fim}`
        ).join(' | ');
        
        await registrarAuditoria({
          turmaId: novaTurmaData.id,
          turmaCodigo: null, // Código só é gerado na validação
          acao: 'criou',
          entidade: 'turma',
          descricao: `Criou nova turma | Treinamento: ${treinamentoNome} | Tipo: ${formData.tipo_treinamento} | Cliente: ${clienteNome} | Participantes: ${formData.quantidade_participantes} | Carga Horária: ${formData.carga_horaria_total}h | ${aulasDescricao}`,
          dadosNovos: {
            cliente: clienteNome,
            treinamento: treinamentoNome,
            tipo_treinamento: formData.tipo_treinamento,
            carga_horaria: formData.carga_horaria_total,
            quantidade_participantes: formData.quantidade_participantes,
            instrutor: 'Não atribuído',
            status: 'agendado',
            aulas: formData.aulas
          }
        });

        toast({
          title: "Turma criada!",
          description: "A nova turma foi criada com sucesso.",
        });
      }

      // Recarregar dados
      await fetchData();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // Função para abrir dialog de confirmação de exclusão
  const handleDeleteClick = (turma: Turma) => {
    // Bloquear exclusão de turmas finalizadas/concluídas
    if (turma.status === 'concluido') {
      toast({
        title: "Não é possível excluir",
        description: "Turmas finalizadas não podem ser excluídas. Os dados são mantidos para histórico e auditoria.",
        variant: "destructive",
      });
      return;
    }
    
    setTurmaParaDeletar(turma);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!turmaParaDeletar) return;
    if (deleteConfirmText !== 'desejo apagar o agendamento') {
      toast({
        title: "Confirmação inválida",
        description: "Digite exatamente: desejo apagar o agendamento",
        variant: "destructive",
      });
      return;
    }

    setDeletando(true);

    try {
      // IMPORTANTE: Registrar auditoria ANTES de deletar para manter o histórico completo
      const clienteNome = clientes.find(c => c.id === turmaParaDeletar.cliente_id)?.nome || '';
      const instrutorNome = turmaParaDeletar.instrutor_id ? instrutores.find(i => i.id === turmaParaDeletar.instrutor_id)?.nome || '' : 'Não atribuído';
      
      // Formatar aulas para descrição
      const aulasDescricao = turmaParaDeletar.aulas?.map((a: any, i: number) => 
        `Aula ${i + 1}: ${new Date(a.data).toLocaleDateString('pt-BR')} ${a.hora_inicio}-${a.hora_fim}`
      ).join(' | ') || 'Sem aulas';
      
      await registrarAuditoria({
        turmaId: turmaParaDeletar.id,
        turmaCodigo: turmaParaDeletar.codigo_turma || null,
        acao: 'deletou',
        entidade: 'turma',
        descricao: `Deletou turma | Treinamento: ${turmaParaDeletar.treinamento_nome} | Tipo: ${turmaParaDeletar.tipo_treinamento} | Cliente: ${clienteNome} | Instrutor: ${instrutorNome} | Participantes: ${turmaParaDeletar.quantidade_participantes} | Carga Horária: ${turmaParaDeletar.carga_horaria}h | ${aulasDescricao}`,
        dadosAnteriores: {
          id: turmaParaDeletar.id,
          codigo_turma: turmaParaDeletar.codigo_turma,
          cliente: clienteNome,
          cliente_id: turmaParaDeletar.cliente_id,
          treinamento: turmaParaDeletar.treinamento_nome,
          treinamento_id: turmaParaDeletar.treinamento_id,
          tipo_treinamento: turmaParaDeletar.tipo_treinamento,
          instrutor: instrutorNome,
          instrutor_id: turmaParaDeletar.instrutor_id,
          carga_horaria: turmaParaDeletar.carga_horaria,
          quantidade_participantes: turmaParaDeletar.quantidade_participantes,
          status: turmaParaDeletar.status,
          validado: turmaParaDeletar.validado,
          aulas: turmaParaDeletar.aulas
        }
      });

      // Deletar aulas primeiro (cascade deveria fazer isso, mas por segurança)
      await supabase
        .from('turmas_treinamento_aulas')
        .delete()
        .eq('turma_id', turmaParaDeletar.id);

      // Deletar turma
      const { error } = await supabase
        .from('turmas_treinamento')
        .delete()
        .eq('id', turmaParaDeletar.id);

      if (error) throw error;

      setTurmas(prev => prev.filter(t => t.id !== turmaParaDeletar.id));
      setDeleteDialogOpen(false);
      setTurmaParaDeletar(null);
      setDeleteConfirmText('');
      
      toast({
        title: "Agendamento excluído",
        description: "O agendamento e todos os dados relacionados foram excluídos permanentemente.",
      });
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletando(false);
    }
  };

  const handleSelecionarInstrutor = async (turmaId: string, instrutorId: string) => {
    try {
      // Buscar as aulas e dados da turma atual
      const { data: turmaAtualData } = await (supabase as any)
        .from('turmas_treinamento')
        .select('id, cliente_id, tipo_treinamento')
        .eq('id', turmaId)
        .single();

      const { data: aulasTurmaAtual } = await supabase
        .from('turmas_treinamento_aulas')
        .select('data, hora_inicio, hora_fim')
        .eq('turma_id', turmaId);

      if (aulasTurmaAtual && aulasTurmaAtual.length > 0) {
        // Buscar outras turmas do instrutor que não estão concluídas (incluindo cliente_id e tipo_treinamento)
        const { data: outrasTurmasInstrutor } = await (supabase as any)
          .from('turmas_treinamento')
          .select('id, codigo_turma, status, cliente_id, tipo_treinamento, turmas_treinamento_aulas(data, hora_inicio, hora_fim)')
          .eq('instrutor_id', instrutorId)
          .neq('status', 'concluido')
          .neq('id', turmaId);

        for (const outraTurma of (outrasTurmasInstrutor || [])) {
          const aulasOutraTurma = outraTurma.turmas_treinamento_aulas || [];
          
          for (const aulaAtual of aulasTurmaAtual) {
            for (const aulaOutra of aulasOutraTurma) {
              // Verificar se é no mesmo dia
              if (aulaAtual.data === aulaOutra.data) {
                // Permitir se for mesma empresa (mesmo cliente) - instrutor pode dar múltiplas turmas no mesmo dia para a mesma empresa
                const mesmaEmpresa = turmaAtualData?.cliente_id && outraTurma.cliente_id && turmaAtualData.cliente_id === outraTurma.cliente_id;

                if (mesmaEmpresa) {
                  continue;
                }

                const instrutor = instrutores.find(i => i.id === instrutorId);
                toast({
                  title: "Conflito de agenda",
                  description: `O instrutor ${instrutor?.nome || ''} já está alocado na turma "${outraTurma.codigo_turma || 'outra turma'}" no dia ${new Date(aulaAtual.data).toLocaleDateString('pt-BR')}. Um instrutor não pode estar em mais de uma turma no mesmo dia.`,
                  variant: "destructive",
                });
                return;
              }
            }
          }
        }
      }

      // Buscar dados da turma para auditoria
      const turmaAtual = turmas.find(t => t.id === turmaId);
      const instrutorAnterior = turmaAtual?.instrutor_id ? instrutores.find(i => i.id === turmaAtual.instrutor_id) : null;

      const { error } = await supabase
        .from('turmas_treinamento')
        .update({ instrutor_id: instrutorId })
        .eq('id', turmaId);

      if (error) throw error;

      const instrutor = instrutores.find(i => i.id === instrutorId);
      
      // Registrar auditoria de atribuição de instrutor
      await registrarAuditoria({
        turmaId: turmaId,
        turmaCodigo: turmaAtual?.codigo_turma || null,
        acao: 'atualizou',
        entidade: 'instrutor',
        descricao: instrutorAnterior 
          ? `Mudou Instrutor: ${instrutorAnterior.nome} → ${instrutor?.nome} | Treinamento: ${turmaAtual?.treinamento_nome}`
          : `Atribuiu Instrutor: ${instrutor?.nome} | Treinamento: ${turmaAtual?.treinamento_nome}`,
        dadosAnteriores: instrutorAnterior ? { 
          instrutor_id: instrutorAnterior.id, 
          instrutor_nome: instrutorAnterior.nome,
          treinamento: turmaAtual?.treinamento_nome
        } : null,
        dadosNovos: { 
          instrutor_id: instrutorId, 
          instrutor_nome: instrutor?.nome,
          treinamento: turmaAtual?.treinamento_nome
        }
      });

      setTurmas(prev => prev.map(t => 
        t.id === turmaId 
          ? { ...t, instrutor_id: instrutorId, instrutor_nome: instrutor?.nome || null }
          : t
      ));
      toast({
        title: "Instrutor selecionado",
        description: `${instrutor?.nome} foi atribuído à turma.`,
      });
      
      // Fechar o dialog após atribuir
      setInstrutorDialogOpen(false);
      setTurmaParaAtribuirInstrutor(null);
      setInstrutorSelecionadoTemp(null);
    } catch (error: any) {
      console.error('Erro ao selecionar instrutor:', error);
      toast({
        title: "Erro ao selecionar instrutor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para abrir o dialog de atribuição de instrutor
  const handleAbrirInstrutorDialog = (turma: Turma) => {
    setTurmaParaAtribuirInstrutor(turma);
    setInstrutorSelecionadoTemp(turma.instrutor_id);
    // Resetar estados do dialog
    setInstrutorBusca('');
    setInstrutorOrdenacao('nome');
    setCalculoDistanciaIniciado(false);
    setDistanciasProgressivas(new Map());
    // NÃO calcular distâncias automaticamente - aguardar botão
    setInstrutorDialogOpen(true);
  };

  // Função para iniciar cálculo de distâncias com callback progressivo
  const handleIniciarCalculoDistancias = async () => {
    if (!turmaParaAtribuirInstrutor) return;
    
    const turma = turmaParaAtribuirInstrutor;
    
    // Se não tem município ou UF do cliente, não calcular
    if (!turma.municipio || !turma.uf) {
      toast({
        title: "Endereço incompleto",
        description: "O cliente não possui município/UF cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setCalculoDistanciaIniciado(true);
    setDistanciasProgressivas(new Map());
    
    // Marcar como carregando
    loadingDistancesRef.current.add(turma.id);
    setLoadingDistances(prev => new Set(prev).add(turma.id));

    try {
      // Callback para atualizar progressivamente
      const onProgress = (instructorId: string, result: DistanceResult) => {
        setDistanciasProgressivas(prev => {
          const newMap = new Map(prev);
          newMap.set(instructorId, result);
          return newMap;
        });
      };

      const distances = await calculateDistancesFromInstructors(
        instrutores,
        turma.municipio,
        turma.uf,
        onProgress
      );

      // Atualizar estado final
      instrutorDistancesRef.current.set(turma.id, distances);
      setInstrutorDistances(prev => {
        const newMap = new Map(prev);
        newMap.set(turma.id, distances);
        return newMap;
      });
    } catch (error) {
      console.error('[calcularDistancias] Erro:', error);
    } finally {
      loadingDistancesRef.current.delete(turma.id);
      setLoadingDistances(prev => {
        const newSet = new Set(prev);
        newSet.delete(turma.id);
        return newSet;
      });
    }
  };

  // Função para filtrar e ordenar instrutores com busca e ordenação
  const getInstrutoresFiltradosEOrdenados = (turmaId: string, clienteMunicipio: string, clienteUf: string, treinamentoId?: string, datasAulasTurma?: string[]) => {
    // Filtrar instrutores aptos para o treinamento específico
    let instrutoresFiltrados = [...instrutores];
    
    // Filtrar apenas instrutores que ministram o treinamento específico E têm anexo do vínculo
    if (treinamentoId) {
      instrutoresFiltrados = instrutoresFiltrados.filter(inst => 
        inst.treinamentos_aptos.includes(treinamentoId)
      );
    }
    
    // Filtrar instrutores que NÃO têm datas indisponíveis nas datas das aulas da turma
    if (datasAulasTurma && datasAulasTurma.length > 0) {
      instrutoresFiltrados = instrutoresFiltrados.filter(inst => {
        const temConflito = datasAulasTurma.some(dataAula => 
          inst.datas_indisponiveis.includes(dataAula)
        );
        return !temConflito;
      });
    }
    
    // Aplicar busca por nome
    if (instrutorBusca.trim()) {
      const termoBusca = instrutorBusca.toLowerCase().trim();
      instrutoresFiltrados = instrutoresFiltrados.filter(inst => 
        inst.nome.toLowerCase().includes(termoBusca)
      );
    }
    
    // Obter distâncias (progressivas ou finais)
    const distancesFinais = instrutorDistances.get(turmaId);
    const getDistancia = (instId: string): DistanceResult | undefined => {
      return distanciasProgressivas.get(instId) || distancesFinais?.get(instId);
    };
    
    // Aplicar ordenação
    return [...instrutoresFiltrados].sort((a, b) => {
      switch (instrutorOrdenacao) {
        case 'distancia_asc': {
          const distA = getDistancia(a.id);
          const distB = getDistancia(b.id);
          if (distA && !distB) return -1;
          if (!distA && distB) return 1;
          if (distA && distB) return distA.distanceKm - distB.distanceKm;
          return a.nome.localeCompare(b.nome);
        }
        case 'distancia_desc': {
          const distA = getDistancia(a.id);
          const distB = getDistancia(b.id);
          if (distA && !distB) return -1;
          if (!distA && distB) return 1;
          if (distA && distB) return distB.distanceKm - distA.distanceKm;
          return a.nome.localeCompare(b.nome);
        }
        case 'equipamento': {
          const equipA = treinamentoId ? (a.equipamentos?.[treinamentoId]?.length || 0) : 0;
          const equipB = treinamentoId ? (b.equipamentos?.[treinamentoId]?.length || 0) : 0;
          if (equipA !== equipB) return equipB - equipA; // Mais equipamentos primeiro
          return a.nome.localeCompare(b.nome);
        }
        case 'nome':
        default:
          return a.nome.localeCompare(b.nome);
      }
    });
  };

  // Função para gerar código da turma: SIGLA + sequência + NR
  // Usa função do banco de dados para garantir unicidade e atomicidade
  const gerarCodigoTurma = async (clienteId: string, treinamentoId: string): Promise<string> => {
    // Buscar sigla do cliente
    const { data: clienteData } = await (supabase as any)
      .from('clientes_sst')
      .select('sigla, nome')
      .eq('id', clienteId)
      .single();
    
    const sigla = clienteData?.sigla || clienteData?.nome?.substring(0, 3).toUpperCase() || 'XXX';
    
    // Buscar NR do treinamento
    const { data: treinamentoData } = await supabase
      .from('catalogo_treinamentos')
      .select('norma')
      .eq('id', treinamentoId)
      .single();
    
    const nr = treinamentoData?.norma || '00';
    
    // Usar função do banco de dados para obter próximo código (atômico, evita race conditions)
    const { data: codigoData, error: codigoError } = await (supabase as any)
      .rpc('obter_proximo_codigo_turma', {
        p_cliente_id: clienteId,
        p_sigla: sigla,
        p_nr: nr
      });
    
    if (codigoError) {
      console.error('Erro ao gerar código via RPC:', codigoError);
      // Fallback: gerar código manualmente se a função falhar
      const { data: seqData } = await (supabase as any)
        .from('turma_codigo_sequencia')
        .select('ultima_sequencia')
        .eq('cliente_id', clienteId)
        .single();
      
      const sequencia = String((seqData?.ultima_sequencia || 0) + 1).padStart(3, '0');
      return `${sigla}${sequencia}-NR${nr}`;
    }
    
    return codigoData;
  };

  // Função para validar/desvalidar turma
  const handleValidarTurma = async (turmaId: string) => {
    try {
      const turma = turmas.find(t => t.id === turmaId);
      if (!turma) return;

      const novoValor = !turma.validado;
      
      // Verificar se tem instrutor escolhido antes de validar
      if (novoValor && !turma.instrutor_id) {
        toast({
          title: "Instrutor não selecionado",
          description: "É necessário escolher um instrutor antes de validar a turma.",
          variant: "destructive",
        });
        return;
      }
      
      let codigoTurma = null;
      
      // Se estiver validando, gerar código da turma
      if (novoValor) {
        codigoTurma = await gerarCodigoTurma(turma.cliente_id, turma.treinamento_id);
      }

      // Salvar no banco - ao validar, também muda status para 'em_andamento'
      const updatePayload: any = { 
        validado: novoValor,
        codigo_turma: codigoTurma
      };
      
      // Tarefa 1: Ao validar, status muda para 'em_andamento'
      if (novoValor) {
        updatePayload.status = 'em_andamento';
      } else {
        updatePayload.status = 'agendado';
      }
      
      const { data: updateData, error } = await (supabase as any)
        .from('turmas_treinamento')
        .update(updatePayload)
        .eq('id', turmaId)
        .select();

      console.log('[Validação] Resultado:', { turmaId, novoValor, codigoTurma, updateData, error });

      if (error) {
        console.error('Erro ao validar turma:', error);
        toast({
          title: "Erro ao validar turma",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Registrar auditoria de validação
      const instrutorNome = turma.instrutor_id ? instrutores.find(i => i.id === turma.instrutor_id)?.nome || '' : '';
      
      await registrarAuditoria({
        turmaId: turmaId,
        turmaCodigo: codigoTurma || turma.codigo_turma || null,
        acao: 'atualizou',
        entidade: 'turma',
        descricao: novoValor 
          ? `Validou turma | Código gerado: ${codigoTurma} | Treinamento: ${turma.treinamento_nome} | Instrutor: ${instrutorNome} | Status: agendado → em_andamento`
          : `Removeu validação da turma | Treinamento: ${turma.treinamento_nome} | Status: em_andamento → agendado`,
        dadosAnteriores: { validado: turma.validado, status: turma.status, codigo_turma: turma.codigo_turma, treinamento: turma.treinamento_nome },
        dadosNovos: { validado: novoValor, status: novoValor ? 'em_andamento' : 'agendado', codigo_turma: codigoTurma, treinamento: turma.treinamento_nome }
      });

      // Ao validar, atualizar o código da turma em TODOS os logs dessa turma (com ou sem código)
      if (novoValor && codigoTurma) {
        const { data: updatedLogs, error: updateLogsError } = await (supabase as any)
          .from('turmas_auditoria')
          .update({ turma_codigo: codigoTurma })
          .eq('turma_id', turmaId)
          .select();
        
        console.log('[Validação] Atualizando logs de auditoria:', { 
          turmaId, 
          codigoTurma, 
          registrosAtualizados: updatedLogs?.length || 0,
          updateLogsError 
        });
      }

      // Atualizar estado local
      setTurmas(prev => prev.map(t => 
        t.id === turmaId 
          ? { ...t, validado: novoValor, status: novoValor ? 'em_andamento' : 'agendado', codigo_turma: codigoTurma || t.codigo_turma }
          : t
      ));

      toast({
        title: novoValor ? "Turma validada" : "Validação removida",
        description: novoValor 
          ? `Turma validada com código: ${codigoTurma}. Status alterado para "Em andamento".` 
          : "A validação da turma foi removida. Status alterado para 'Agendado'.",
      });
    } catch (error: any) {
      console.error('Erro ao validar turma:', error);
      toast({
        title: "Erro ao validar turma",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com seleção de mês/ano e tabs de semanas em uma única linha */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={String(mesAtual)} onValueChange={(value) => setMesAtual(Number(value))}>
            <SelectTrigger className="w-[130px] font-semibold h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((mes, index) => (
                <SelectItem key={index} value={String(index)}>
                  {mes}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(anoAtual)} onValueChange={(value) => setAnoAtual(Number(value))}>
            <SelectTrigger className="w-[90px] font-semibold h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Tabs de semanas na mesma linha */}
          <Tabs value={semanaAtual} onValueChange={setSemanaAtual} className="ml-4">
            <TabsList className="bg-muted h-9">
              {semanas.map(semana => (
                <TabsTrigger 
                  key={semana.id} 
                  value={semana.id}
                  className="text-xs px-2.5 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {semana.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar NR, treinamento, cliente..."
              value={buscaAgenda}
              onChange={(e) => setBuscaAgenda(e.target.value)}
              className="pl-9 h-9 w-[200px] md:w-[280px]"
            />
            {buscaAgenda && (
              <button
                onClick={() => setBuscaAgenda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Dropdown de Configurações - agrupa Filtros, Atualizar, Auditoria, Exportar */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 relative">
                      <Settings className="h-4 w-4" />
                      {(filtroTipo !== 'todos' || filtroValidado !== 'todos' || filtroInstrutor !== 'todos') && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                          {(filtroTipo !== 'todos' ? 1 : 0) + (filtroValidado !== 'todos' ? 1 : 0) + (filtroInstrutor !== 'todos' ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Configurações e Ações</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => {
                  fetchData();
                  toast({ title: 'Dados atualizados!' });
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAuditoriaPopupOpen(true)}>
                  <HistoryIcon className="h-4 w-4 mr-2" />
                  Auditoria
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExportar('semana')} disabled={exportando}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Semana
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportar('mes')} disabled={exportando}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Mês
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportar('tudo')} disabled={exportando}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Tudo
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center justify-between">
                  Filtros
                  {(filtroTipo !== 'todos' || filtroValidado !== 'todos' || filtroInstrutor !== 'todos') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-1 text-[10px]"
                      onClick={(e) => {
                        e.preventDefault();
                        setFiltroTipo('todos');
                        setFiltroValidado('todos');
                        setFiltroInstrutor('todos');
                        setFiltroInstrutorNome('Todos');
                      }}
                    >
                      Limpar
                    </Button>
                  )}
                </DropdownMenuLabel>
                
                {/* Submenu Tipo */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    Tipo: {filtroTipo === 'todos' ? 'Todos' : filtroTipo}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setFiltroTipo('todos')}>
                      {filtroTipo === 'todos' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroTipo !== 'todos' ? 'ml-6' : ''}>Todos os Tipos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFiltroTipo('Inicial')}>
                      {filtroTipo === 'Inicial' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroTipo !== 'Inicial' ? 'ml-6' : ''}>Inicial (Formação)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFiltroTipo('Periódico')}>
                      {filtroTipo === 'Periódico' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroTipo !== 'Periódico' ? 'ml-6' : ''}>Periódico (Reciclagem)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFiltroTipo('Eventual')}>
                      {filtroTipo === 'Eventual' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroTipo !== 'Eventual' ? 'ml-6' : ''}>Eventual</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* Submenu Validação */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Validação: {filtroValidado === 'todos' ? 'Todos' : filtroValidado === 'validado' ? 'Validados' : 'Não Validados'}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setFiltroValidado('todos')}>
                      {filtroValidado === 'todos' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroValidado !== 'todos' ? 'ml-6' : ''}>Todos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFiltroValidado('validado')}>
                      {filtroValidado === 'validado' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroValidado !== 'validado' ? 'ml-6' : ''}>Validados</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFiltroValidado('nao_validado')}>
                      {filtroValidado === 'nao_validado' && <Check className="h-4 w-4 mr-2" />}
                      <span className={filtroValidado !== 'nao_validado' ? 'ml-6' : ''}>Não Validados</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* Filtro Instrutor */}
                <DropdownMenuItem onClick={() => setInstrutorFilterPopupOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Instrutor: {filtroInstrutorNome}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
          
          <Button onClick={handleNovoAgendamento} className="bg-primary hover:bg-primary/90 h-9">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Indicador de filtro por turma específica */}
      {turmaIdFromUrl && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <FileCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Exibindo apenas a turma: <strong>{codigoTurmaFromUrl || turmaIdFromUrl}</strong>
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto h-7"
            onClick={() => navigate('/sst?section=agenda-treinamentos')}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar filtro
          </Button>
        </div>
      )}

      {/* Tabela de turmas */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-max" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b sticky top-0 z-10">
                {/* Linha com títulos fixos e dias da semana (D, S, T, Q, Q, S, S) */}
                <TableRow className="bg-muted border-b-0">
                  <TableHead
                    rowSpan={2}
                    className="w-[40px] min-w-[40px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    Nº
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[120px] min-w-[120px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    CÓDIGO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[180px] min-w-[180px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    CLIENTE
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[140px] min-w-[140px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    MUNICÍPIO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[40px] min-w-[40px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    UF
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[220px] min-w-[220px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    TREINAMENTO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[90px] min-w-[90px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    TIPO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[40px] min-w-[40px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                    title="Observações"
                  >
                    OBS
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[140px] min-w-[140px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    HORÁRIO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[40px] min-w-[40px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    CH
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[160px] min-w-[160px] font-bold text-xs text-foreground border-r border-border text-center align-middle bg-muted"
                  >
                    INSTRUTOR
                  </TableHead>
                  {/* Dias da semana fixos: S T Q Q S S D */}
                  {DIAS_SEMANA_SIGLAS.map((sigla, index) => (
                    <TableHead key={index} className="w-[36px] min-w-[36px] text-center font-bold text-xs text-muted-foreground bg-orange-100 pb-0 border-x border-border">
                      {sigla}
                    </TableHead>
                  ))}
                  <TableHead
                    rowSpan={2}
                    className="w-[40px] min-w-[40px] font-bold text-xs text-foreground border-l border-border text-center align-middle bg-muted"
                  >
                    QTD
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[80px] min-w-[80px] font-bold text-xs text-foreground border-l border-border text-center align-middle bg-muted"
                  >
                    AÇÕES
                  </TableHead>
                </TableRow>
                {/* Linha com números dos dias */}
                <TableRow className="bg-muted border-b-2 border-border">
                  {getDiasDaSemanaAtual().map((dia, index) => (
                    <TableHead key={index} className="w-[36px] min-w-[36px] text-center font-bold text-xs text-foreground bg-orange-100 pt-0 border-x border-border">
                      {dia ? `${String(dia).padStart(2, '0')}` : ''}
                    </TableHead>
                  ))}
                </TableRow>
              </thead>
              <TableBody>
                {getLinhasDaSemana().map((linha) => {
                  if (linha.tipo === 'placeholder') {
                    // Linha vazia (placeholder)
                    return (
                      <TableRow key={`placeholder-${linha.numeroSemana}`} className="hover:bg-muted/50 h-9 border-b border-border">
                        <TableCell className="font-medium text-muted-foreground text-center border-r border-border">{linha.numeroSemana}</TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        <TableCell className="border-r border-border"></TableCell>
                        {getDiasDaSemanaAtual().map((dia, index) => (
                          <TableCell key={index} className="text-center bg-muted/30 border-x border-border"></TableCell>
                        ))}
                        <TableCell className="border-l border-border"></TableCell>
                        <TableCell className="border-l border-border"></TableCell>
                      </TableRow>
                    );
                  }
                  
                  // Linha com turma real
                  const turma = linha.turma!;
                  const diasComAula = getDiasDaSemanaComAula(turma);
                  return (
                    <TableRow key={turma.id} className={cn(
                      "hover:bg-primary/5 border-b border-border",
                      turmaSelecionadaId === turma.id && "bg-primary/10 ring-2 ring-primary ring-inset"
                    )}>
                      <TableCell className="font-semibold text-center border-r border-border">{linha.numeroSemana}</TableCell>
                      <TableCell className="text-center text-xs border-r border-border">
                        {turma.validado && turma.codigo_turma ? (
                          <span className="font-mono text-primary">{turma.codigo_turma}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] border-r border-border">
                        <div className="flex flex-col">
                          <span className="truncate text-sm font-medium" title={turma.cliente_nome}>{turma.cliente_nome}</span>
                          {turma.cliente_cnpj && (
                            <span className="text-[10px] text-muted-foreground">{formatarCNPJ(turma.cliente_cnpj)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm border-r border-border">{turma.municipio}</TableCell>
                      <TableCell className="text-sm border-r border-border">{turma.uf}</TableCell>
                      <TableCell className="max-w-[200px] border-r border-border">
                        <span className="truncate block text-sm" title={turma.treinamento_nome}>
                          {turma.treinamento_nome}
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-border">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                          turma.tipo_treinamento === 'Inicial' && "bg-primary/15 text-primary",
                          turma.tipo_treinamento === 'Periódico' && "bg-warning/15 text-warning",
                          turma.tipo_treinamento === 'Eventual' && "bg-info/15 text-info"
                        )}>
                          {turma.tipo_treinamento === 'Inicial' ? 'Inicial (Formação)' : 
                           turma.tipo_treinamento === 'Periódico' ? 'Periódico (Reciclagem)' : 
                           turma.tipo_treinamento}
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-border">
                        {turma.observacoes ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Observações</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{turma.observacoes}</p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm border-r border-border">
                        <div className="flex flex-col gap-0.5">
                          {turma.aulas.length > 0 ? (
                            turma.aulas
                              .sort((a, b) => a.data.localeCompare(b.data))
                              .map((aula, idx) => (
                                <span key={idx} className="text-xs whitespace-nowrap">
                                  {aula.inicio}-{aula.fim} ({format(new Date(aula.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })})
                                </span>
                              ))
                          ) : (
                            <span>{turma.horario}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-center border-r border-border">{turma.carga_horaria}</TableCell>
                      <TableCell className="border-r border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 text-xs w-[180px] justify-start ${turma.instrutor_nome ? 'border-success/50 text-success hover:bg-success/10' : 'border-destructive/50 text-destructive hover:bg-destructive/10'}`}
                            onClick={() => handleAbrirInstrutorDialog(turma)}
                          >
                            {turma.instrutor_nome ? (
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                <span>{turma.instrutor_nome?.split(' ')[0]}</span>
                                <Pencil className="h-3 w-3 text-success ml-auto" />
                              </div>
                            ) : (
                              <span className="text-destructive font-medium">Tem que procurar</span>
                            )}
                          </Button>
                        </TableCell>
                        {getDiasDaSemanaAtual().map((dia, index) => (
                          <TableCell key={index} className="text-center bg-muted/30 border-x border-border p-1">
                            {dia && diasComAula.includes(dia) && (
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-success text-success-foreground rounded font-bold text-xs">X</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-sm border-l border-border">
                          {turma.quantidade_participantes > 0 ? turma.quantidade_participantes : ''}
                        </TableCell>
                        <TableCell className="border-l border-border">
                          <div className="flex items-center justify-center gap-1">
                            {turma.validado ? (
                              <span className="inline-flex items-center h-6 px-2 text-xs text-success font-medium">
                                <Check className="h-3 w-3 mr-1" />Validado
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-warning hover:text-warning/80 hover:bg-warning/10"
                                onClick={() => handleValidarTurma(turma.id)}
                              >
                                Validar
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTurma(turma)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar Turma
                                </DropdownMenuItem>
                                {turma.validado && (
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/sst?section=gestao-turmas&search=${turma.codigo_turma || ''}`)}
                                  >
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Ir para Gestão de Turmas
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(turma)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar Agendamento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </table>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard - Resumo da Semana */}
      {(() => {
        const turmasDaSemana = getTurmasDaSemanaReais();
        const diasNumericos = getDiasDaSemanaAtual().filter((d): d is number => d !== null);
        const diasSemana = diasNumericos.map(dia => new Date(anoAtual, mesAtual, dia));
        const datasSemanaSelecionada = diasSemana.map(d => format(d, 'yyyy-MM-dd'));
        
        const instrutoresIndisponiveis = instrutores
          .filter(inst => inst.datas_indisponiveis.some(data => datasSemanaSelecionada.includes(data)))
          .map(inst => ({
            ...inst,
            datasNaSemana: inst.datas_indisponiveis.filter(data => datasSemanaSelecionada.includes(data))
          }));
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Card de Quantidade de Treinamentos */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Treinamentos da Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-primary">
                    {turmasDaSemana.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {turmasDaSemana.length === 1 ? 'treinamento agendado' : 'treinamentos agendados'}
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      Semana: {diasSemana[0] ? format(diasSemana[0], 'dd/MM', { locale: ptBR }) : ''} a {diasSemana[diasSemana.length - 1] ? format(diasSemana[diasSemana.length - 1], 'dd/MM', { locale: ptBR }) : ''}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Instrutores Indisponíveis */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                  <CalendarX className="h-4 w-4 text-warning" />
                  Instrutores Indisponíveis na Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                {instrutoresIndisponiveis.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    Todos os instrutores estão disponíveis nesta semana.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {instrutoresIndisponiveis.map(inst => (
                      <div key={inst.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning"></span>
                          <span className="text-sm font-medium text-foreground">{inst.nome}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {inst.datasNaSemana
                            .sort()
                            .map((data, idx) => (
                              <span key={idx} className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                                {format(new Date(data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Dialog de novo/editar agendamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingTurma ? 'Editar Turma' : 'Novo Agendamento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 overflow-hidden">
            {/* Linha 1: Treinamento */}
            <div className="space-y-2 overflow-hidden">
              <Label htmlFor="treinamento">Treinamento</Label>
              <div className="relative w-full overflow-hidden">
                <button
                  type="button"
                  className="w-full h-10 px-3 pr-10 text-left border rounded-md bg-background hover:bg-accent hover:text-accent-foreground text-sm overflow-hidden text-ellipsis whitespace-nowrap block"
                  onClick={() => setTreinamentoSearchOpen(true)}
                >
                  <span className={!formData.treinamento_id ? "text-muted-foreground" : ""}>
                    {treinamentoSelecionadoNome || "Clique para buscar..."}
                  </span>
                </button>
                <Search className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Linha 2: Tipo do Treinamento e Carga Horária Total */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_treinamento">Tipo do Treinamento</Label>
                <Select 
                  value={formData.tipo_treinamento} 
                  onValueChange={(value) => {
                    const treinamento = treinamentos.find(t => t.id === formData.treinamento_id);
                    let cargaHoraria = formData.carga_horaria_total;
                    let obrigatoria = formData.carga_horaria_obrigatoria;
                    
                    if (treinamento) {
                      if (value === 'Periódico') {
                        cargaHoraria = treinamento.ch_reciclagem;
                        obrigatoria = treinamento.ch_reciclagem_obrigatoria;
                      } else {
                        cargaHoraria = treinamento.ch_formacao;
                        obrigatoria = treinamento.ch_formacao_obrigatoria;
                      }
                    }
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      tipo_treinamento: value,
                      carga_horaria_total: cargaHoraria,
                      carga_horaria_obrigatoria: obrigatoria
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inicial">Inicial (Formação)</SelectItem>
                    <SelectItem value="Periódico">Periódico (Reciclagem)</SelectItem>
                    <SelectItem value="Eventual">Eventual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="carga_horaria">Carga Horária Total (h)</Label>
                <Input
                  id="carga_horaria"
                  type="number"
                  min="0"
                  value={formData.carga_horaria_total || ''}
                  onChange={(e) => {
                    if (!formData.carga_horaria_obrigatoria) {
                      setFormData(prev => ({ 
                        ...prev, 
                        carga_horaria_total: parseInt(e.target.value) || 0 
                      }));
                    }
                  }}
                  placeholder="0"
                  readOnly={formData.carga_horaria_obrigatoria}
                  className={formData.carga_horaria_obrigatoria 
                    ? "border-success bg-success/10 text-success cursor-not-allowed" 
                    : ""
                  }
                />
              </div>
            </div>

            {/* Linha 3: Cliente e Quantidade de Participantes */}
            <div className="grid grid-cols-[1fr_120px] gap-4 overflow-hidden">
              <div className="space-y-2 min-w-0 overflow-hidden">
                <Label htmlFor="cliente">Cliente</Label>
                <div className="relative w-full overflow-hidden">
                  <button
                    type="button"
                    className="w-full h-10 px-3 pr-10 text-left border rounded-md bg-background hover:bg-accent hover:text-accent-foreground text-sm overflow-hidden text-ellipsis whitespace-nowrap block"
                    onClick={() => setClienteSearchOpen(true)}
                  >
                    <span className={!formData.cliente_id ? "text-muted-foreground" : ""}>
                      {clienteSelecionadoNome || "Clique para buscar..."}
                    </span>
                  </button>
                  <Search className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_participantes">Qtd. Participantes</Label>
                <Input
                  id="quantidade_participantes"
                  type="number"
                  min="0"
                  value={formData.quantidade_participantes || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    quantidade_participantes: parseInt(e.target.value) || 0 
                  }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações sobre a turma (opcional)"
                className="w-full min-h-[60px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                rows={2}
              />
            </div>

            {/* Separador - Cronograma de Aulas */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-semibold">Cronograma de Aulas</Label>
                <span className="text-sm">
                  Total Agendado: <span className="text-success font-semibold">{getTotalHorasAgendadas()}h</span>
                  <span className="text-muted-foreground"> / Meta: {formData.carga_horaria_total}h</span>
                </span>
              </div>

              {/* Inputs para adicionar aula */}
              <div className="grid grid-cols-[1fr_80px_80px_60px_40px] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data(s)</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          datasSelecionadas.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datasSelecionadas.length === 0 
                          ? "Selecione..." 
                          : datasSelecionadas.length === 1
                            ? format(datasSelecionadas[0], "dd/MM/yyyy", { locale: ptBR })
                            : `${datasSelecionadas.length} datas`
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={datasSelecionadas}
                        onSelect={(dates) => setDatasSelecionadas(dates || [])}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input
                    type="text"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={novaAula.inicio}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d:]/g, '');
                      // Auto-adicionar : após 2 dígitos
                      if (value.length === 2 && !value.includes(':')) {
                        value = value + ':';
                      }
                      // Limitar formato HH:MM
                      if (value.length > 5) value = value.slice(0, 5);
                      setNovaAula(prev => ({ ...prev, inicio: value }));
                    }}
                    className="w-20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input
                    type="text"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={novaAula.fim}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d:]/g, '');
                      // Auto-adicionar : após 2 dígitos
                      if (value.length === 2 && !value.includes(':')) {
                        value = value + ':';
                      }
                      // Limitar formato HH:MM
                      if (value.length > 5) value = value.slice(0, 5);
                      setNovaAula(prev => ({ ...prev, fim: value }));
                    }}
                    className="w-20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Horas</Label>
                  <Input
                    type="number"
                    value={(() => {
                      const horasBrutas = calcularHoras(novaAula.inicio, novaAula.fim, false);
                      return horasBrutas >= 8 ? calcularHoras(novaAula.inicio, novaAula.fim, true) : horasBrutas;
                    })()}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAdicionarAula}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de aulas adicionadas */}
              <div className="mt-3 space-y-2">
                {formData.aulas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma data adicionada.
                  </p>
                ) : (
                  formData.aulas.map(aula => (
                    <div key={aula.id} className="p-2 bg-muted rounded-md">
                      {editandoAulaId === aula.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {format(new Date(aula.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <Input
                            type="text"
                            placeholder="HH:MM"
                            maxLength={5}
                            defaultValue={aula.inicio}
                            className="w-20 h-8"
                            id={`inicio-${aula.id}`}
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="text"
                            placeholder="HH:MM"
                            maxLength={5}
                            defaultValue={aula.fim}
                            className="w-20 h-8"
                            id={`fim-${aula.id}`}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-success hover:text-success/80"
                            onClick={() => {
                              const inicioEl = document.getElementById(`inicio-${aula.id}`) as HTMLInputElement;
                              const fimEl = document.getElementById(`fim-${aula.id}`) as HTMLInputElement;
                              handleSalvarEdicaoAula(aula.id, inicioEl.value, fimEl.value);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditandoAulaId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">
                              {format(new Date(aula.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            <span className="text-muted-foreground">{aula.inicio} - {aula.fim}</span>
                            <span className="font-medium text-success">{aula.horas}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-primary hover:text-primary/80"
                              onClick={() => handleEditarAula(aula.id)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive/80"
                              onClick={() => handleRemoverAula(aula.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSalvar} disabled={salvando} className="bg-primary hover:bg-primary/90">
              {salvando ? 'Salvando...' : (editingTurma ? 'Salvar Atualização' : 'Salvar Agendamento')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Atribuição de Instrutor */}
      <Dialog open={instrutorDialogOpen} onOpenChange={(open) => {
        setInstrutorDialogOpen(open);
        if (!open) {
          setTurmaParaAtribuirInstrutor(null);
          setInstrutorSelecionadoTemp(null);
        }
      }}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Atribuir instrutor</DialogTitle>
          </DialogHeader>
          
          {turmaParaAtribuirInstrutor && (
            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              {/* Barra de ferramentas: Busca, Ordenação e Botão de Cálculo */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Campo de busca */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar instrutor..."
                    value={instrutorBusca}
                    onChange={(e) => setInstrutorBusca(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                
                {/* Opções de ordenação */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Ordenar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <button
                        onClick={() => setInstrutorOrdenacao('nome')}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2",
                          instrutorOrdenacao === 'nome' && "bg-muted font-medium"
                        )}
                      >
                        Nome (A-Z)
                      </button>
                      <button
                        onClick={() => setInstrutorOrdenacao('distancia_asc')}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2",
                          instrutorOrdenacao === 'distancia_asc' && "bg-muted font-medium"
                        )}
                      >
                        <ArrowUp className="h-3 w-3" />
                        Menor distância
                      </button>
                      <button
                        onClick={() => setInstrutorOrdenacao('distancia_desc')}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2",
                          instrutorOrdenacao === 'distancia_desc' && "bg-muted font-medium"
                        )}
                      >
                        <ArrowDown className="h-3 w-3" />
                        Maior distância
                      </button>
                      <button
                        onClick={() => setInstrutorOrdenacao('equipamento')}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2",
                          instrutorOrdenacao === 'equipamento' && "bg-muted font-medium"
                        )}
                      >
                        <Package className="h-3 w-3" />
                        Com equipamento
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Botão para iniciar cálculo de distâncias */}
                <Button
                  variant={calculoDistanciaIniciado ? "outline" : "default"}
                  size="sm"
                  className="h-9 gap-2"
                  onClick={handleIniciarCalculoDistancias}
                  disabled={loadingDistances.has(turmaParaAtribuirInstrutor.id)}
                >
                  {loadingDistances.has(turmaParaAtribuirInstrutor.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculando... ({distanciasProgressivas.size})
                    </>
                  ) : calculoDistanciaIniciado ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      Distâncias calculadas
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4" />
                      Calcular distâncias
                    </>
                  )}
                </Button>
              </div>

              {/* Tabela de instrutores */}
              <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead className="font-medium text-muted-foreground">Instrutor</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Distância</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Equipamento</TableHead>
                      <TableHead className="font-medium text-muted-foreground text-center w-[80px]">Aprovar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getInstrutoresFiltradosEOrdenados(
                      turmaParaAtribuirInstrutor.id, 
                      turmaParaAtribuirInstrutor.municipio, 
                      turmaParaAtribuirInstrutor.uf, 
                      turmaParaAtribuirInstrutor.treinamento_id, 
                      turmaParaAtribuirInstrutor.aulas.map(a => a.data)
                    ).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-sm text-muted-foreground">
                          {instrutorBusca ? 'Nenhum instrutor encontrado com esse nome' : 'Nenhum instrutor disponível para este treinamento nas datas agendadas'}
                        </TableCell>
                      </TableRow>
                    )}
                    {getInstrutoresFiltradosEOrdenados(
                      turmaParaAtribuirInstrutor.id, 
                      turmaParaAtribuirInstrutor.municipio, 
                      turmaParaAtribuirInstrutor.uf, 
                      turmaParaAtribuirInstrutor.treinamento_id, 
                      turmaParaAtribuirInstrutor.aulas.map(a => a.data)
                    ).map(inst => {
                      // Usar distância progressiva ou final
                      const distancesFinais = instrutorDistances.get(turmaParaAtribuirInstrutor.id);
                      const distancia = distanciasProgressivas.get(inst.id) || distancesFinais?.get(inst.id);
                      const statusAtual = getStatusContato(turmaParaAtribuirInstrutor.id, inst.id);
                        
                        return (
                          <TableRow key={inst.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${instrutorSelecionadoTemp === inst.id ? 'bg-success' : 'bg-success/70'}`}></span>
                                <span className="text-sm">{inst.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={statusAtual || 'disponivel'}
                                onValueChange={(value) => handleStatusContatoChange(turmaParaAtribuirInstrutor.id, inst.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[140px]">
                                  <SelectValue placeholder="Status..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="disponivel">Disponível</SelectItem>
                                  {statusContatoOpcoes.map(opcao => (
                                    <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {distancia ? (
                                <span className="text-sm text-muted-foreground">{distancia.distanceText}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                const equipsTreinamento = inst.equipamentos?.[turmaParaAtribuirInstrutor.treinamento_id] || [];
                                if (equipsTreinamento.length > 0) {
                                  return (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/20 hover:bg-success/30 transition-colors cursor-pointer" title="Ver equipamentos">
                                          <Package className="h-4 w-4 text-success" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80 p-0" align="start">
                                        <div className="bg-success/10 px-4 py-3 border-b border-success/20">
                                          <div className="flex items-center gap-2">
                                            <Package className="h-5 w-5 text-success" />
                                            <div>
                                              <p className="font-medium text-success">Equipamentos Próprios</p>
                                              <p className="text-xs text-success/80">{equipsTreinamento.length} item(s) cadastrado(s)</p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="p-3 max-h-60 overflow-y-auto">
                                          <div className="space-y-2">
                                            {equipsTreinamento.map((eq: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-2 bg-background border rounded-lg">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-8 h-8 bg-success/20 rounded flex items-center justify-center">
                                                    <Package className="h-4 w-4 text-success" />
                                                  </div>
                                                  <span className="text-sm font-medium text-foreground">{eq.nome}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-success bg-success/10 px-2 py-1 rounded">
                                                  x{eq.quantidade}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  );
                                }
                                return (
                                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted" title="Sem equipamentos">
                                    <PackageX className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="radio"
                                name="instrutor-selecionado"
                                checked={instrutorSelecionadoTemp === inst.id}
                                onChange={() => setInstrutorSelecionadoTemp(inst.id)}
                                className="w-4 h-4 text-primary cursor-pointer"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setInstrutorDialogOpen(false);
                setTurmaParaAtribuirInstrutor(null);
                setInstrutorSelecionadoTemp(null);
              }}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (turmaParaAtribuirInstrutor && instrutorSelecionadoTemp) {
                  handleSelecionarInstrutor(turmaParaAtribuirInstrutor.id, instrutorSelecionadoTemp);
                }
              }}
              disabled={!instrutorSelecionadoTemp}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de busca de cliente */}
      <ClienteSearchPopup
        open={clienteSearchOpen}
        onOpenChange={setClienteSearchOpen}
        empresaId={empresaId || ''}
        selectedId={formData.cliente_id}
        onSelect={(cliente) => {
          setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
          setClienteSelecionadoNome(cliente.nome);
        }}
      />

      {/* Popup de busca de treinamento */}
      <TreinamentoSearchPopup
        open={treinamentoSearchOpen}
        onOpenChange={setTreinamentoSearchOpen}
        empresaId={empresaId || ''}
        selectedId={formData.treinamento_id}
        onSelect={(treinamento) => {
          const tipoAtual = formData.tipo_treinamento;
          let cargaHoraria = 0;
          let obrigatoria = false;
          
          if (tipoAtual === 'Periódico') {
            cargaHoraria = treinamento.ch_reciclagem;
            obrigatoria = treinamento.ch_reciclagem_obrigatoria;
          } else {
            cargaHoraria = treinamento.ch_formacao;
            obrigatoria = treinamento.ch_formacao_obrigatoria;
          }
          
          setFormData(prev => ({ 
            ...prev, 
            treinamento_id: treinamento.id,
            carga_horaria_total: cargaHoraria,
            carga_horaria_obrigatoria: obrigatoria
          }));
          setTreinamentoSelecionadoNome(`NR ${treinamento.norma} - ${treinamento.nome}`);
        }}
      />

      {/* Popup de filtro por instrutor */}
      <InstrutorFilterPopup
        open={instrutorFilterPopupOpen}
        onOpenChange={setInstrutorFilterPopupOpen}
        empresaId={empresaId || ''}
        selectedId={filtroInstrutor}
        onSelect={(instrutorId, instrutorNome) => {
          setFiltroInstrutor(instrutorId);
          setFiltroInstrutorNome(instrutorNome);
        }}
      />

      {/* Popup de auditoria */}
      <TurmasAuditoriaPopup
        open={auditoriaPopupOpen}
        onOpenChange={setAuditoriaPopupOpen}
        empresaId={empresaId || ''}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar Agendamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ Esta ação é IRREVERSÍVEL!
              </p>
              <p className="text-sm text-muted-foreground">
                Ao apagar este agendamento, <strong>todos os dados serão excluídos permanentemente</strong>, incluindo:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                <li>Dados da turma e aulas agendadas</li>
                <li>Colaboradores vinculados</li>
                <li>Presenças, notas e avaliações</li>
                <li>Fotos e anexos da galeria</li>
                <li>Certificados gerados</li>
              </ul>
            </div>

            {turmaParaDeletar && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p><strong>Treinamento:</strong> {turmaParaDeletar.treinamento_nome}</p>
                <p><strong>Código:</strong> {turmaParaDeletar.codigo_turma || 'Não validado'}</p>
                <p><strong>Status:</strong> {turmaParaDeletar.status}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm">
                Para confirmar, digite: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">desejo apagar o agendamento</code>
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digite a confirmação..."
                className="font-mono text-sm"
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTurmaParaDeletar(null);
                setDeleteConfirmText('');
              }}
              disabled={deletando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletando || deleteConfirmText !== 'desejo apagar o agendamento'}
            >
              {deletando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
