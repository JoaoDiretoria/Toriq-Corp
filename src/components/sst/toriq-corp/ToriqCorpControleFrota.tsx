import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Car, Plus, Edit, Trash2, Search, Download, Upload, AlertTriangle, 
  CheckCircle, CheckCircle2, Clock, Calendar as CalendarIcon, Fuel, Wrench, FileText,
  MapPin, User, Gauge, DollarSign, AlertCircle, ClipboardCheck, FileWarning, Check,
  Eye, Printer
} from 'lucide-react';

// Lista de marcas e modelos organizados por tipo de veículo
const VEICULOS_POR_TIPO: Record<string, Record<string, string[]>> = {
  'Passeio': {
    'Chevrolet': ['Onix', 'Onix Plus', 'Tracker', 'Spin', 'Cruze', 'Equinox', 'Trailblazer', 'Cobalt', 'Prisma', 'Celta', 'Corsa', 'Classic'],
    'Fiat': ['Uno', 'Mobi', 'Argo', 'Cronos', 'Pulse', 'Fastback', 'Palio', 'Siena', 'Grand Siena', 'Punto', 'Linea'],
    'Ford': ['Ka', 'Ka Sedan', 'Fiesta', 'Focus', 'EcoSport', 'Territory', 'Bronco Sport', 'Fusion', 'Edge'],
    'Volkswagen': ['Gol', 'Voyage', 'Polo', 'Virtus', 'T-Cross', 'Nivus', 'Taos', 'Tiguan', 'Fox', 'Up!', 'Jetta', 'Passat', 'Golf'],
    'Toyota': ['Corolla', 'Corolla Cross', 'Yaris', 'Yaris Sedan', 'SW4', 'RAV4', 'Camry', 'Prius', 'Etios'],
    'Honda': ['Civic', 'City', 'HR-V', 'CR-V', 'Fit', 'WR-V', 'Accord', 'ZR-V'],
    'Hyundai': ['HB20', 'HB20S', 'Creta', 'Tucson', 'Santa Fe', 'i30', 'Azera', 'IX35', 'Veloster'],
    'Renault': ['Kwid', 'Sandero', 'Logan', 'Stepway', 'Duster', 'Captur', 'Fluence'],
    'Jeep': ['Renegade', 'Compass', 'Commander', 'Wrangler', 'Grand Cherokee'],
    'Nissan': ['March', 'Versa', 'Sentra', 'Kicks', 'Leaf', 'Altima'],
    'Peugeot': ['208', '2008', '3008', '5008', '308', '408'],
    'Citroën': ['C3', 'C4 Cactus', 'C4 Lounge', 'Aircross'],
    'Mitsubishi': ['Pajero', 'Outlander', 'Eclipse Cross', 'ASX', 'Lancer'],
    'Kia': ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Sorento', 'Carnival', 'Stinger', 'Soul', 'Seltos'],
    'Mercedes-Benz': ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLB', 'GLC', 'GLE'],
    'BMW': ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5', 'X6', 'Z4'],
    'Audi': ['A3', 'A4', 'A5', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'RS3', 'RS5'],
    'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60'],
    'Suzuki': ['Swift', 'Vitara', 'Jimny', 'S-Cross', 'Ignis'],
    'Subaru': ['Impreza', 'XV', 'Forester', 'Outback', 'WRX'],
    'Outro': []
  },
  'Utilitário': {
    'Chevrolet': ['S10', 'Montana', 'Spin'],
    'Fiat': ['Strada', 'Toro', 'Fiorino', 'Doblò', 'Ducato'],
    'Ford': ['Ranger', 'Maverick', 'Transit'],
    'Volkswagen': ['Amarok', 'Saveiro'],
    'Toyota': ['Hilux'],
    'Renault': ['Oroch', 'Master', 'Kangoo'],
    'Nissan': ['Frontier'],
    'Peugeot': ['Partner', 'Expert', 'Boxer'],
    'Citroën': ['Jumpy', 'Jumper'],
    'Mitsubishi': ['L200'],
    'RAM': ['1500', '2500', '3500', 'Rampage'],
    'Jeep': ['Gladiator'],
    'Mercedes-Benz': ['Sprinter', 'Vito'],
    'Iveco': ['Daily'],
    'Outro': []
  },
  'Caminhão': {
    'Iveco': ['Daily', 'Tector', 'Hi-Way', 'Stralis'],
    'Scania': ['R', 'S', 'G', 'P'],
    'Volvo Caminhões': ['FH', 'FM', 'FMX', 'VM'],
    'MAN': ['TGX', 'TGS', 'VW Delivery', 'VW Constellation'],
    'DAF': ['XF', 'CF', 'LF'],
    'Mercedes-Benz': ['Actros', 'Atego', 'Axor', 'Accelo'],
    'Ford': ['Cargo'],
    'Volkswagen': ['Delivery', 'Constellation', 'Worker'],
    'Outro': []
  },
  'Moto': {
    'Honda': ['CG 160', 'Biz', 'Pop', 'CB 300', 'CB 500', 'XRE 190', 'XRE 300', 'Bros', 'Titan', 'Fan', 'PCX', 'Elite', 'ADV'],
    'Yamaha': ['Factor', 'Fazer', 'Crosser', 'Lander', 'MT-03', 'MT-07', 'MT-09', 'XTZ', 'Neo', 'NMAX', 'Fluo'],
    'Suzuki': ['Intruder', 'GSX', 'V-Strom', 'Burgman', 'Hayabusa'],
    'Kawasaki': ['Ninja', 'Z400', 'Z650', 'Z900', 'Versys', 'Vulcan'],
    'BMW': ['G 310', 'F 750', 'F 850', 'R 1250', 'S 1000'],
    'Harley-Davidson': ['Iron 883', 'Sportster', 'Fat Boy', 'Road King', 'Street Glide'],
    'Triumph': ['Tiger', 'Street Triple', 'Bonneville', 'Trident'],
    'Dafra': ['Apache', 'NH', 'Citycom', 'Maxsym'],
    'Shineray': ['Jet', 'Phoenix', 'Worker'],
    'Outro': []
  },
  'Outro': {
    'Outro': []
  }
};

const TIPOS_VEICULO = Object.keys(VEICULOS_POR_TIPO);

const getMarcasPorTipo = (tipo: string): string[] => {
  const marcas = VEICULOS_POR_TIPO[tipo];
  return marcas ? Object.keys(marcas).sort() : [];
};

const getModelosPorMarca = (tipo: string, marca: string): string[] => {
  const marcas = VEICULOS_POR_TIPO[tipo];
  if (!marcas) return [];
  return marcas[marca] || [];
};

export function ToriqCorpControleFrota() {
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const { config: whiteLabel } = useWhiteLabel();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<any>(null);
  const [mostrarAvisoChecklistObrigatorio, setMostrarAvisoChecklistObrigatorio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Estados para Calendário
  const [veiculosFiltroCalendario, setVeiculosFiltroCalendario] = useState<string[]>([]);
  const [todasManutencoesCalendario, setTodasManutencoesCalendario] = useState<any[]>([]);
  const [todasUtilizacoesCalendario, setTodasUtilizacoesCalendario] = useState<any[]>([]);
  
  // Estados para Utilização
  const [utilizacoes, setUtilizacoes] = useState<any[]>([]);
  const [loadingUtilizacoes, setLoadingUtilizacoes] = useState(false);
  const [savingUtilizacao, setSavingUtilizacao] = useState(false);
  const [fechandoUtilizacao, setFechandoUtilizacao] = useState<any>(null);
  const [editandoUtilizacao, setEditandoUtilizacao] = useState<any>(null);
  const [utilizacaoForm, setUtilizacaoForm] = useState({
    data_saida: format(new Date(), 'yyyy-MM-dd'),
    hora_saida: format(new Date(), 'HH:mm'),
    previsao_retorno: '',
    local_utilizacao: '',
    motorista: '',
    km_inicio: 0,
    finalidade: '',
    observacoes: ''
  });
  const [fechamentoForm, setFechamentoForm] = useState({
    data_retorno: format(new Date(), 'yyyy-MM-dd'),
    hora_retorno: format(new Date(), 'HH:mm'),
    km_rodados: 0,
    observacoes_retorno: ''
  });
  
  // Estados para Manutenção
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [loadingManutencoes, setLoadingManutencoes] = useState(false);
  const [savingManutencao, setSavingManutencao] = useState(false);
  const [editandoManutencao, setEditandoManutencao] = useState<any>(null);
  const [manutencaoForm, setManutencaoForm] = useState({
    tipo: 'Preventiva',
    data: format(new Date(), 'yyyy-MM-dd'),
    km: 0,
    servico: '',
    status: 'Agendada',
    custo: 0,
    proxima_km: 0,
    proxima_data: '',
    observacoes: ''
  });

  // Estados para Custos
  const [custos, setCustos] = useState<any[]>([]);
  const [loadingCustos, setLoadingCustos] = useState(false);
  const [savingCusto, setSavingCusto] = useState(false);
  const [custoForm, setCustoForm] = useState({
    categoria: 'Abastecimento',
    data: format(new Date(), 'yyyy-MM-dd'),
    valor: 0,
    fornecedor: '',
    observacao: ''
  });

  // Estados para Documentos
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [savingDocumento, setSavingDocumento] = useState(false);
  const [documentoArquivo, setDocumentoArquivo] = useState<File | null>(null);
  const [documentoForm, setDocumentoForm] = useState({
    tipo: 'Licenciamento',
    numero: '',
    vencimento: format(new Date(), 'yyyy-MM-dd'),
    observacoes: ''
  });

  // Estados para Ocorrências
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loadingOcorrencias, setLoadingOcorrencias] = useState(false);
  const [savingOcorrencia, setSavingOcorrencia] = useState(false);
  const [ocorrenciaVisualizacao, setOcorrenciaVisualizacao] = useState<any>(null);
  const [editandoOcorrencia, setEditandoOcorrencia] = useState<any>(null);
  const [ocorrenciaForm, setOcorrenciaForm] = useState({
    tipo: 'Avaria',
    data: format(new Date(), 'yyyy-MM-dd'),
    status: 'Aberta',
    local: '',
    descricao: '',
    custo_estimado: 0,
    responsavel: '',
    prazo: ''
  });

  // Estados para Motoristas
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [loadingMotoristas, setLoadingMotoristas] = useState(false);
  const [savingMotorista, setSavingMotorista] = useState(false);
  const [motoristaDialogOpen, setMotoristaDialogOpen] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState<any>(null);
  const [motoristaVisualizacao, setMotoristaVisualizacao] = useState<any>(null);
  const [searchMotorista, setSearchMotorista] = useState('');
  const [buscandoCepMotorista, setBuscandoCepMotorista] = useState(false);
  const [motoristaForm, setMotoristaForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    cnh_numero: '',
    cnh_categoria: '',
    cnh_validade: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: ''
  });
  const [motoristaAnexos, setMotoristaAnexos] = useState<{
    foto: File | null;
    cpf_anexo: File | null;
    rg_anexo: File | null;
    cnh_anexo: File | null;
  }>({
    foto: null,
    cpf_anexo: null,
    rg_anexo: null,
    cnh_anexo: null
  });

  // Estados para Checklist
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistVisualizacao, setChecklistVisualizacao] = useState<any>(null);
  const [checklistForm, setChecklistForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'Pré-uso',
    km: 0,
    responsavel: '',
    local: '',
    status_geral: 'Aprovado',
    observacoes: '',
    itens: {
      combustivel: false,
      luzes: false,
      buzina: false,
      parabrisa_limpadores: false,
      pneus: false,
      oleo_motor: false,
      agua_radiador: false,
      fluido_freio: false,
      fluido_direcao: false,
      bateria: false,
      cinto_seguranca: false,
      triangulo: false,
      kit_estepe: false
    }
  });

  const [formData, setFormData] = useState({
    placa: '',
    renavam: '',
    chassi: '',
    marca: '',
    modelo: '',
    ano: '',
    tipo: 'Passeio',
    combustivel: 'Flex',
    km_atual: 0,
    gestor_responsavel: '',
    motorista_padrao: '',
    observacoes: '',
    tipo_manual: '',
    marca_manual: '',
    modelo_manual: '',
    checklist_obrigatorio: false
  });

  const resetForm = () => {
    setFormData({
      placa: '',
      renavam: '',
      chassi: '',
      marca: '',
      modelo: '',
      ano: '',
      tipo: 'Passeio',
      combustivel: 'Flex',
      km_atual: 0,
      gestor_responsavel: '',
      motorista_padrao: '',
      observacoes: '',
      tipo_manual: '',
      marca_manual: '',
      modelo_manual: '',
      checklist_obrigatorio: false
    });
  };

  const openDialog = (veiculo?: any) => {
    if (veiculo) {
      setEditingVeiculo(veiculo);
      const tipoExiste = TIPOS_VEICULO.includes(veiculo.tipo);
      const marcaExiste = tipoExiste && getMarcasPorTipo(veiculo.tipo).includes(veiculo.marca);
      const modeloExiste = marcaExiste && getModelosPorMarca(veiculo.tipo, veiculo.marca).includes(veiculo.modelo);
      
      setFormData({
        placa: veiculo.placa || '',
        renavam: veiculo.renavam || '',
        chassi: veiculo.chassi || '',
        marca: marcaExiste ? veiculo.marca : (veiculo.marca ? 'Outro' : ''),
        modelo: modeloExiste ? veiculo.modelo : (veiculo.modelo ? 'Outro' : ''),
        ano: veiculo.ano || '',
        tipo: tipoExiste ? veiculo.tipo : 'Outro',
        combustivel: veiculo.combustivel || 'Flex',
        km_atual: veiculo.km_atual || 0,
        gestor_responsavel: veiculo.gestor_responsavel || '',
        motorista_padrao: veiculo.motorista_padrao || '',
        observacoes: veiculo.observacoes || '',
        tipo_manual: tipoExiste ? '' : (veiculo.tipo || ''),
        marca_manual: marcaExiste ? '' : (veiculo.marca || ''),
        modelo_manual: modeloExiste ? '' : (veiculo.modelo || ''),
        checklist_obrigatorio: veiculo.checklist_obrigatorio || false
      });
    } else {
      setEditingVeiculo(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSaveVeiculo = async () => {
    if (!formData.placa) {
      toast({ title: 'Erro', description: 'Placa é obrigatória', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      
      const dataToSave = {
        placa: formData.placa,
        renavam: formData.renavam,
        chassi: formData.chassi,
        tipo: formData.tipo === 'Outro' ? formData.tipo_manual : formData.tipo,
        marca: formData.marca === 'Outro' ? formData.marca_manual : formData.marca,
        modelo: formData.modelo === 'Outro' ? formData.modelo_manual : formData.modelo,
        ano: formData.ano,
        combustivel: formData.combustivel,
        km_atual: Number(formData.km_atual) || 0,
        gestor_responsavel: formData.gestor_responsavel,
        motorista_padrao: formData.motorista_padrao,
        observacoes: formData.observacoes,
        checklist_obrigatorio: formData.checklist_obrigatorio
      };

      if (editingVeiculo) {
        const { error } = await (supabase as any)
          .from('frota_veiculos')
          .update(dataToSave)
          .eq('id', editingVeiculo.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Veículo atualizado com sucesso' });
      } else {
        const { error } = await (supabase as any)
          .from('frota_veiculos')
          .insert({
            ...dataToSave,
            empresa_id: empresaId
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Veículo cadastrado com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      loadVeiculos();
    } catch (error: any) {
      console.error('Erro ao salvar veículo:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao salvar veículo', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (empresaId) {
      loadVeiculos();
      loadDadosCalendario();
      loadMotoristas();
    }
  }, [empresaId]);

  useEffect(() => {
    if (veiculoSelecionado?.id) {
      // Carregar dados do veículo selecionado
      const carregarDadosVeiculo = async () => {
        const veiculoId = veiculoSelecionado.id;
        
        // Carregar utilizações
        try {
          const { data } = await (supabase as any)
            .from('frota_utilizacoes')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('created_at', { ascending: false });
          setUtilizacoes(data || []);
        } catch (e) { console.error('Erro utilizações:', e); }

        // Carregar manutenções
        try {
          const { data } = await (supabase as any)
            .from('frota_manutencoes')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('data', { ascending: false });
          setManutencoes(data || []);
        } catch (e) { console.error('Erro manutenções:', e); }

        // Carregar checklists
        try {
          const { data } = await (supabase as any)
            .from('frota_checklists')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('data', { ascending: false });
          setChecklists(data || []);
        } catch (e) { console.error('Erro checklists:', e); }

        // Carregar custos
        try {
          const { data } = await (supabase as any)
            .from('frota_custos')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('data', { ascending: false });
          setCustos(data || []);
        } catch (e) { console.error('Erro custos:', e); }

        // Carregar documentos
        try {
          const { data } = await (supabase as any)
            .from('frota_documentos')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('vencimento', { ascending: true });
          setDocumentos(data || []);
        } catch (e) { console.error('Erro documentos:', e); }

        // Carregar ocorrências
        try {
          const { data } = await (supabase as any)
            .from('frota_ocorrencias')
            .select('*')
            .eq('veiculo_id', veiculoId)
            .order('data', { ascending: false });
          setOcorrencias(data || []);
        } catch (e) { console.error('Erro ocorrências:', e); }
      };

      carregarDadosVeiculo().then(() => {
        // Após carregar utilizações, atualizar o km_inicio com o último km registrado
        // Isso será feito pelo useEffect abaixo que observa as utilizações
      });

      // Reset forms com km_atual do veículo (será atualizado após carregar utilizações)
      setUtilizacaoForm({
        data_saida: format(new Date(), 'yyyy-MM-dd'),
        hora_saida: format(new Date(), 'HH:mm'),
        previsao_retorno: '',
        local_utilizacao: '',
        motorista: veiculoSelecionado?.motorista_padrao || '',
        km_inicio: veiculoSelecionado?.km_atual || 0,
        finalidade: '',
        observacoes: ''
      });
      setManutencaoForm({
        tipo: 'Preventiva',
        data: format(new Date(), 'yyyy-MM-dd'),
        km: veiculoSelecionado?.km_atual || 0,
        servico: '',
        status: 'Agendada',
        custo: 0,
        proxima_km: 0,
        proxima_data: '',
        observacoes: ''
      });
      setChecklistForm({
        data: format(new Date(), 'yyyy-MM-dd'),
        tipo: 'Pré-uso',
        km: veiculoSelecionado?.km_atual || 0,
        responsavel: '',
        local: '',
        status_geral: 'Aprovado',
        observacoes: '',
        itens: {
          combustivel: false,
          luzes: false,
          buzina: false,
          parabrisa_limpadores: false,
          pneus: false,
          oleo_motor: false,
          agua_radiador: false,
          fluido_freio: false,
          fluido_direcao: false,
          bateria: false,
          cinto_seguranca: false,
          triangulo: false,
          kit_estepe: false
        }
      });
      setCustoForm({
        categoria: 'Abastecimento',
        data: format(new Date(), 'yyyy-MM-dd'),
        valor: 0,
        fornecedor: '',
        observacao: ''
      });
      setDocumentoForm({
        tipo: 'Licenciamento',
        numero: '',
        vencimento: format(new Date(), 'yyyy-MM-dd'),
        observacoes: ''
      });
      setOcorrenciaForm({
        tipo: 'Avaria',
        data: format(new Date(), 'yyyy-MM-dd'),
        status: 'Aberta',
        local: '',
        descricao: '',
        custo_estimado: 0,
        responsavel: '',
        prazo: ''
      });
    }
  }, [veiculoSelecionado?.id]);

  // Atualizar km_inicio quando as utilizações são carregadas (para usar o último km_fim)
  useEffect(() => {
    if (veiculoSelecionado && utilizacoes.length > 0) {
      const kmAtualVeiculo = veiculoSelecionado.km_atual || 0;
      const ultimoKmFim = utilizacoes
        .filter(u => u.status === 'Concluído' && u.km_fim > 0)
        .reduce((max, u) => Math.max(max, u.km_fim || 0), 0);
      const ultimoKm = Math.max(kmAtualVeiculo, ultimoKmFim);
      
      // Só atualizar se o km_inicio atual for menor que o último km registrado
      if (utilizacaoForm.km_inicio < ultimoKm) {
        setUtilizacaoForm(prev => ({ ...prev, km_inicio: ultimoKm }));
      }
    }
  }, [utilizacoes, veiculoSelecionado]);

  const loadDadosCalendario = async () => {
    if (!empresaId) return;
    
    try {
      // Carregar todas as utilizações em uso
      const { data: utilizacoesData } = await (supabase as any)
        .from('frota_utilizacoes')
        .select('*, frota_veiculos(placa, marca, modelo)')
        .eq('empresa_id', empresaId)
        .eq('status', 'Em uso');

      // Carregar todas as manutenções agendadas ou em andamento
      const { data: manutencoesData } = await (supabase as any)
        .from('frota_manutencoes')
        .select('*, frota_veiculos(placa, marca, modelo)')
        .eq('empresa_id', empresaId)
        .in('status', ['Agendada', 'Em andamento']);

      setTodasUtilizacoesCalendario(utilizacoesData || []);
      setTodasManutencoesCalendario(manutencoesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados do calendário:', error);
    }
  };

  const loadVeiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('frota_veiculos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('placa');

      if (error) throw error;
      setVeiculos(data || []);
      if (data && data.length > 0 && !veiculoSelecionado) {
        setVeiculoSelecionado(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções de Motoristas
  const loadMotoristas = async () => {
    try {
      setLoadingMotoristas(true);
      const { data, error } = await (supabase as any)
        .from('frota_motoristas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setMotoristas(data || []);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    } finally {
      setLoadingMotoristas(false);
    }
  };

  const resetMotoristaForm = () => {
    setMotoristaForm({
      nome: '',
      cpf: '',
      rg: '',
      data_nascimento: '',
      cnh_numero: '',
      cnh_categoria: '',
      cnh_validade: '',
      telefone: '',
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      observacoes: ''
    });
    setMotoristaAnexos({
      foto: null,
      cpf_anexo: null,
      rg_anexo: null,
      cnh_anexo: null
    });
    setEditingMotorista(null);
  };

  // Função para buscar CEP do motorista
  const buscarCepMotorista = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCepMotorista(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setMotoristaForm(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || prev.complemento,
        }));
        toast({
          title: "Endereço encontrado!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        variant: "destructive",
      });
    } finally {
      setBuscandoCepMotorista(false);
    }
  };

  const handleCepMotoristaChange = (value: string) => {
    const cepLimpo = value.replace(/\D/g, '');
    let cepFormatado = cepLimpo;
    if (cepLimpo.length > 5) {
      cepFormatado = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
    }
    setMotoristaForm(prev => ({ ...prev, cep: cepFormatado }));
    
    if (cepLimpo.length === 8) {
      buscarCepMotorista(cepLimpo);
    }
  };

  // Máscara de CPF: 000.000.000-00
  const handleCpfChange = (value: string) => {
    const cpfLimpo = value.replace(/\D/g, '').slice(0, 11);
    let cpfFormatado = cpfLimpo;
    if (cpfLimpo.length > 9) {
      cpfFormatado = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9, 11)}`;
    } else if (cpfLimpo.length > 6) {
      cpfFormatado = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6)}`;
    } else if (cpfLimpo.length > 3) {
      cpfFormatado = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3)}`;
    }
    setMotoristaForm(prev => ({ ...prev, cpf: cpfFormatado }));
  };

  // Máscara de telefone: (00) 00000-0000
  const handleTelefoneChange = (value: string) => {
    const telLimpo = value.replace(/\D/g, '').slice(0, 11);
    let telFormatado = telLimpo;
    if (telLimpo.length > 6) {
      telFormatado = `(${telLimpo.slice(0, 2)}) ${telLimpo.slice(2, 7)}-${telLimpo.slice(7)}`;
    } else if (telLimpo.length > 2) {
      telFormatado = `(${telLimpo.slice(0, 2)}) ${telLimpo.slice(2)}`;
    } else if (telLimpo.length > 0) {
      telFormatado = `(${telLimpo}`;
    }
    setMotoristaForm(prev => ({ ...prev, telefone: telFormatado }));
  };

  // Verificar se motorista tem CNH válida
  const isCnhValida = (motorista: any): boolean => {
    if (!motorista?.cnh_validade) return true; // Se não tem CNH cadastrada, considera válido
    const diasParaVencer = differenceInDays(parseISO(motorista.cnh_validade), new Date());
    return diasParaVencer >= 0;
  };

  // Filtrar motoristas com CNH válida para operações
  const motoristasComCnhValida = motoristas.filter(m => isCnhValida(m));

  const handleOpenMotoristaDialog = (motorista?: any) => {
    if (motorista) {
      setEditingMotorista(motorista);
      setMotoristaForm({
        nome: motorista.nome || '',
        cpf: motorista.cpf || '',
        rg: motorista.rg || '',
        data_nascimento: motorista.data_nascimento || '',
        cnh_numero: motorista.cnh_numero || '',
        cnh_categoria: motorista.cnh_categoria || '',
        cnh_validade: motorista.cnh_validade || '',
        telefone: motorista.telefone || '',
        email: motorista.email || '',
        cep: motorista.cep || '',
        logradouro: motorista.logradouro || '',
        numero: motorista.numero || '',
        complemento: motorista.complemento || '',
        bairro: motorista.bairro || '',
        cidade: motorista.cidade || '',
        estado: motorista.estado || '',
        observacoes: motorista.observacoes || ''
      });
    } else {
      resetMotoristaForm();
    }
    setMotoristaDialogOpen(true);
  };

  const uploadMotoristaAnexo = async (file: File, tipo: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaId}/motoristas/${Date.now()}_${tipo}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error(`Erro ao fazer upload do ${tipo}:`, uploadError);
        toast({
          title: 'Erro no upload',
          description: `Não foi possível enviar o arquivo ${tipo}. O motorista será salvo sem este anexo.`,
          variant: 'destructive'
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Erro ao fazer upload do ${tipo}:`, error);
      return null;
    }
  };

  const handleSaveMotorista = async () => {
    if (!empresaId) return;
    
    if (!motoristaForm.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      setSavingMotorista(true);

      // Upload de anexos
      let fotoUrl = editingMotorista?.foto_url || null;
      let cpfAnexoUrl = editingMotorista?.cpf_anexo_url || null;
      let rgAnexoUrl = editingMotorista?.rg_anexo_url || null;
      let cnhAnexoUrl = editingMotorista?.cnh_anexo_url || null;

      if (motoristaAnexos.foto) {
        fotoUrl = await uploadMotoristaAnexo(motoristaAnexos.foto, 'foto');
      }
      if (motoristaAnexos.cpf_anexo) {
        cpfAnexoUrl = await uploadMotoristaAnexo(motoristaAnexos.cpf_anexo, 'cpf');
      }
      if (motoristaAnexos.rg_anexo) {
        rgAnexoUrl = await uploadMotoristaAnexo(motoristaAnexos.rg_anexo, 'rg');
      }
      if (motoristaAnexos.cnh_anexo) {
        cnhAnexoUrl = await uploadMotoristaAnexo(motoristaAnexos.cnh_anexo, 'cnh');
      }

      const motoristaData = {
        empresa_id: empresaId,
        nome: motoristaForm.nome.trim(),
        cpf: motoristaForm.cpf || null,
        rg: motoristaForm.rg || null,
        data_nascimento: motoristaForm.data_nascimento || null,
        cnh_numero: motoristaForm.cnh_numero || null,
        cnh_categoria: motoristaForm.cnh_categoria || null,
        cnh_validade: motoristaForm.cnh_validade || null,
        telefone: motoristaForm.telefone || null,
        email: motoristaForm.email || null,
        cep: motoristaForm.cep || null,
        logradouro: motoristaForm.logradouro || null,
        numero: motoristaForm.numero || null,
        complemento: motoristaForm.complemento || null,
        bairro: motoristaForm.bairro || null,
        cidade: motoristaForm.cidade || null,
        estado: motoristaForm.estado || null,
        observacoes: motoristaForm.observacoes || null,
        foto_url: fotoUrl,
        cpf_anexo_url: cpfAnexoUrl,
        rg_anexo_url: rgAnexoUrl,
        cnh_anexo_url: cnhAnexoUrl
      };

      if (editingMotorista) {
        const { error } = await (supabase as any)
          .from('frota_motoristas')
          .update(motoristaData)
          .eq('id', editingMotorista.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Motorista atualizado com sucesso' });
      } else {
        const { error } = await (supabase as any)
          .from('frota_motoristas')
          .insert(motoristaData);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Motorista cadastrado com sucesso' });
      }

      setMotoristaDialogOpen(false);
      resetMotoristaForm();
      loadMotoristas();
    } catch (error: any) {
      console.error('Erro ao salvar motorista:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao salvar motorista', 
        variant: 'destructive' 
      });
    } finally {
      setSavingMotorista(false);
    }
  };

  const handleDeleteMotorista = async (id: string) => {
    if (!confirm('Deseja realmente excluir este motorista?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_motoristas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Motorista excluído com sucesso' });
      loadMotoristas();
    } catch (error: any) {
      console.error('Erro ao excluir motorista:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir motorista', 
        variant: 'destructive' 
      });
    }
  };

  const filteredMotoristas = motoristas.filter(m =>
    m.nome?.toLowerCase().includes(searchMotorista.toLowerCase()) ||
    m.cpf?.includes(searchMotorista) ||
    m.cnh_numero?.includes(searchMotorista)
  );

  // Funções de Utilização
  const loadUtilizacoes = async (veiculoId: string) => {
    try {
      setLoadingUtilizacoes(true);
      const { data, error } = await (supabase as any)
        .from('frota_utilizacoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Utilizações carregadas:', data);
      setUtilizacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar utilizações:', error);
    } finally {
      setLoadingUtilizacoes(false);
    }
  };

  // Função para obter o último KM registrado (maior entre km_atual do veículo e último km_fim das utilizações)
  const getUltimoKm = (): number => {
    const kmAtualVeiculo = veiculoSelecionado?.km_atual || 0;
    
    // Buscar o maior km_fim das utilizações concluídas
    const ultimoKmFim = utilizacoes
      .filter(u => u.status === 'Concluído' && u.km_fim > 0)
      .reduce((max, u) => Math.max(max, u.km_fim || 0), 0);
    
    // Retornar o maior valor entre km_atual e último km_fim
    return Math.max(kmAtualVeiculo, ultimoKmFim);
  };

  const resetUtilizacaoForm = () => {
    const ultimoKm = getUltimoKm();
    setUtilizacaoForm({
      data_saida: format(new Date(), 'yyyy-MM-dd'),
      hora_saida: format(new Date(), 'HH:mm'),
      previsao_retorno: '',
      local_utilizacao: '',
      motorista: veiculoSelecionado?.motorista_padrao || '',
      km_inicio: ultimoKm,
      finalidade: '',
      observacoes: ''
    });
    setFechamentoForm({
      data_retorno: format(new Date(), 'yyyy-MM-dd'),
      hora_retorno: format(new Date(), 'HH:mm'),
      km_rodados: 0,
      observacoes_retorno: ''
    });
    setFechandoUtilizacao(null);
  };

  // Função para verificar se as datas de utilização coincidem com manutenções agendadas
  const verificarDatasUtilizacaoOcupadas = (dataSaida: string, previsaoRetorno: string, veiculoId: string): { ocupada: boolean; motivo: string } => {
    if (!veiculoId) return { ocupada: false, motivo: '' };

    // Verificar se a data de saída coincide com manutenção agendada/em andamento
    const manutencaoNaSaida = todasManutencoesCalendario.find(m => {
      if (m.veiculo_id !== veiculoId) return false;
      if (m.status !== 'Agendada' && m.status !== 'Em andamento') return false;
      return m.data === dataSaida;
    });

    if (manutencaoNaSaida) {
      return {
        ocupada: true,
        motivo: `A data de saída (${format(parseISO(dataSaida), 'dd/MM/yyyy', { locale: ptBR })}) coincide com uma manutenção ${manutencaoNaSaida.status?.toLowerCase() || 'agendada'} (${manutencaoNaSaida.servico || 'Serviço não especificado'}). O veículo não estará disponível nesta data.`
      };
    }

    // Se houver previsão de retorno, verificar se alguma data no período coincide com manutenção
    if (previsaoRetorno) {
      const dataRetorno = previsaoRetorno.substring(0, 10);
      
      // Verificar manutenções no período de saída até retorno
      const manutencaoNoPeriodo = todasManutencoesCalendario.find(m => {
        if (m.veiculo_id !== veiculoId) return false;
        if (m.status !== 'Agendada' && m.status !== 'Em andamento') return false;
        return m.data >= dataSaida && m.data <= dataRetorno;
      });

      if (manutencaoNoPeriodo) {
        return {
          ocupada: true,
          motivo: `Existe uma manutenção ${manutencaoNoPeriodo.status?.toLowerCase() || 'agendada'} (${manutencaoNoPeriodo.servico || 'Serviço não especificado'}) programada para ${format(parseISO(manutencaoNoPeriodo.data), 'dd/MM/yyyy', { locale: ptBR })}, dentro do período de utilização. Ajuste as datas ou reagende a manutenção.`
        };
      }
    }

    return { ocupada: false, motivo: '' };
  };

  // Estado para aviso de data ocupada na utilização
  const [avisoDataUtilizacaoOcupada, setAvisoDataUtilizacaoOcupada] = useState<string>('');

  // Verificar disponibilidade quando as datas de utilização mudam
  useEffect(() => {
    if (veiculoSelecionado && utilizacaoForm.data_saida) {
      const resultado = verificarDatasUtilizacaoOcupadas(
        utilizacaoForm.data_saida, 
        utilizacaoForm.previsao_retorno, 
        veiculoSelecionado.id
      );
      setAvisoDataUtilizacaoOcupada(resultado.ocupada ? resultado.motivo : '');
    } else {
      setAvisoDataUtilizacaoOcupada('');
    }
  }, [utilizacaoForm.data_saida, utilizacaoForm.previsao_retorno, veiculoSelecionado, todasManutencoesCalendario]);

  // Estado para aviso de checklist obrigatório
  const [avisoChecklistObrigatorio, setAvisoChecklistObrigatorio] = useState<string>('');

  // Calcular status automático do checklist baseado nos itens marcados
  useEffect(() => {
    const itens = checklistForm.itens;
    const totalItens = Object.keys(itens).length;
    const itensMarcados = Object.values(itens).filter(Boolean).length;
    
    let novoStatus: string;
    if (itensMarcados === totalItens) {
      novoStatus = 'Aprovado';
    } else if (itensMarcados === 0) {
      novoStatus = 'Reprovado';
    } else {
      novoStatus = 'Com ressalvas';
    }
    
    if (checklistForm.status_geral !== novoStatus) {
      setChecklistForm(prev => ({ ...prev, status_geral: novoStatus }));
    }
  }, [checklistForm.itens]);

  // Verificar se checklist é obrigatório e se foi realizado
  useEffect(() => {
    if (veiculoSelecionado?.checklist_obrigatorio && utilizacaoForm.data_saida) {
      const checklistHoje = checklists.find(c => 
        c.data === utilizacaoForm.data_saida && 
        (c.tipo === 'Pré-uso' || c.tipo === 'Pré-Uso')
      );
      
      if (!checklistHoje) {
        setAvisoChecklistObrigatorio('Este veículo exige checklist pré-uso antes de cada saída. Realize o checklist na aba "Checklist" antes de registrar a saída.');
      } else {
        setAvisoChecklistObrigatorio('');
      }
    } else {
      setAvisoChecklistObrigatorio('');
    }
  }, [veiculoSelecionado, utilizacaoForm.data_saida, checklists]);

  // Verificar se veículo já está em uso (tem utilização sem retorno)
  const veiculoEmUso = utilizacoes.find(u => u.status === 'Em uso');

  const handleRegistrarSaida = async () => {
    if (!veiculoSelecionado) return;
    
    // Verificar se veículo já está em uso
    if (veiculoEmUso) {
      toast({ 
        title: 'Veículo em uso', 
        description: 'Este veículo já está em uso. Registre o retorno antes de iniciar uma nova saída.', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!utilizacaoForm.data_saida) {
      toast({ title: 'Erro', description: 'Data de saída é obrigatória', variant: 'destructive' });
      return;
    }

    // Verificar se as datas coincidem com manutenções
    const verificacao = verificarDatasUtilizacaoOcupadas(
      utilizacaoForm.data_saida, 
      utilizacaoForm.previsao_retorno, 
      veiculoSelecionado.id
    );
    if (verificacao.ocupada) {
      toast({ 
        title: 'Data indisponível', 
        description: verificacao.motivo, 
        variant: 'destructive' 
      });
      return;
    }

    // Checklist pré-uso é SEMPRE obrigatório na saída
    const checklistPreUsoHoje = checklists.find(c => 
      c.data === utilizacaoForm.data_saida && 
      (c.tipo === 'Pré-uso' || c.tipo === 'Pré-Uso')
    );
    
    if (!checklistPreUsoHoje) {
      setActiveTab('checklist');
      setMostrarAvisoChecklistObrigatorio(true);
      toast({ 
        title: 'Checklist obrigatório', 
        description: 'Realize o checklist pré-uso antes de registrar a saída do veículo.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSavingUtilizacao(true);
      
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          data: utilizacaoForm.data_saida,
          data_saida: utilizacaoForm.data_saida,
          hora_saida: utilizacaoForm.hora_saida || null,
          previsao_retorno: utilizacaoForm.previsao_retorno || null,
          local_utilizacao: utilizacaoForm.local_utilizacao || null,
          motorista: utilizacaoForm.motorista || null,
          km_inicio: Number(utilizacaoForm.km_inicio) || 0,
          km_fim: 0,
          finalidade: utilizacaoForm.finalidade || null,
          observacoes: utilizacaoForm.observacoes || null,
          status: 'Em uso'
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Saída registrada com sucesso' });
      resetUtilizacaoForm();
      loadUtilizacoes(veiculoSelecionado.id);
      loadDadosCalendario();
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar saída', 
        variant: 'destructive' 
      });
    } finally {
      setSavingUtilizacao(false);
    }
  };

  const abrirEdicaoUtilizacao = (uso: any) => {
    setEditandoUtilizacao(uso);
    setUtilizacaoForm({
      data_saida: uso.data_saida || uso.data || format(new Date(), 'yyyy-MM-dd'),
      hora_saida: uso.hora_saida || '',
      previsao_retorno: uso.previsao_retorno || '',
      local_utilizacao: uso.local_utilizacao || '',
      motorista: uso.motorista || '',
      km_inicio: uso.km_inicio || 0,
      finalidade: uso.finalidade || '',
      observacoes: uso.observacoes || ''
    });
  };

  const handleSalvarEdicaoUtilizacao = async () => {
    if (!editandoUtilizacao || !veiculoSelecionado) return;

    // Verificar se as datas coincidem com manutenções
    const verificacao = verificarDatasUtilizacaoOcupadas(
      utilizacaoForm.data_saida, 
      utilizacaoForm.previsao_retorno, 
      veiculoSelecionado.id
    );
    if (verificacao.ocupada) {
      toast({ 
        title: 'Data indisponível', 
        description: verificacao.motivo, 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSavingUtilizacao(true);
      
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .update({
          data: utilizacaoForm.data_saida,
          data_saida: utilizacaoForm.data_saida,
          hora_saida: utilizacaoForm.hora_saida || null,
          previsao_retorno: utilizacaoForm.previsao_retorno || null,
          local_utilizacao: utilizacaoForm.local_utilizacao,
          motorista: utilizacaoForm.motorista,
          km_inicio: utilizacaoForm.km_inicio,
          finalidade: utilizacaoForm.finalidade,
          observacoes: utilizacaoForm.observacoes
        })
        .eq('id', editandoUtilizacao.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Utilização atualizada com sucesso' });
      setEditandoUtilizacao(null);
      resetUtilizacaoForm();
      loadDadosCalendario();
      // Forçar atualização da lista
      setUtilizacoes([]);
      await loadUtilizacoes(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao atualizar utilização:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao atualizar utilização', 
        variant: 'destructive' 
      });
    } finally {
      setSavingUtilizacao(false);
    }
  };

  const handleFecharUtilizacao = async () => {
    if (!fechandoUtilizacao || !veiculoSelecionado) return;
    
    if (!fechamentoForm.km_rodados || fechamentoForm.km_rodados <= 0) {
      toast({ title: 'Erro', description: 'Informe quantos KM foram rodados', variant: 'destructive' });
      return;
    }

    // Checklist pós-uso é SEMPRE obrigatório no retorno
    const checklistPosUsoHoje = checklists.find(c => 
      c.data === fechamentoForm.data_retorno && 
      (c.tipo === 'Pós-uso' || c.tipo === 'Pós-Uso')
    );
    
    if (!checklistPosUsoHoje) {
      setActiveTab('checklist');
      toast({ 
        title: 'Checklist obrigatório', 
        description: 'Realize o checklist pós-uso antes de registrar o retorno do veículo.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSavingUtilizacao(true);
      
      // Calcular novo KM total (km atual + km rodados)
      const kmAtual = veiculoSelecionado.km_atual || fechandoUtilizacao.km_inicio || 0;
      const novoKmTotal = kmAtual + Number(fechamentoForm.km_rodados);
      
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .update({
          data_retorno: fechamentoForm.data_retorno,
          hora_retorno: fechamentoForm.hora_retorno,
          km_fim: novoKmTotal,
          km_rodados: fechamentoForm.km_rodados,
          observacoes: (fechandoUtilizacao.observacoes || '') + (fechamentoForm.observacoes_retorno ? `\n[Retorno] ${fechamentoForm.observacoes_retorno}` : ''),
          status: 'Concluído'
        })
        .eq('id', fechandoUtilizacao.id);

      if (error) throw error;

      // Atualizar KM atual do veículo
      await (supabase as any)
        .from('frota_veiculos')
        .update({ km_atual: novoKmTotal })
        .eq('id', veiculoSelecionado.id);
      
      setVeiculoSelecionado({ ...veiculoSelecionado, km_atual: novoKmTotal });
      loadVeiculos();

      toast({ title: 'Sucesso', description: `Retorno registrado! KM atualizado para ${novoKmTotal.toLocaleString('pt-BR')}` });
      resetUtilizacaoForm();
      loadUtilizacoes(veiculoSelecionado.id);
      loadDadosCalendario();
    } catch (error: any) {
      console.error('Erro ao fechar utilização:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao fechar utilização', 
        variant: 'destructive' 
      });
    } finally {
      setSavingUtilizacao(false);
    }
  };

  const abrirFechamento = (utilizacao: any) => {
    setFechandoUtilizacao(utilizacao);
    setFechamentoForm({
      data_retorno: format(new Date(), 'yyyy-MM-dd'),
      hora_retorno: format(new Date(), 'HH:mm'),
      km_rodados: 0,
      observacoes_retorno: ''
    });
  };

  const handleDeleteUtilizacao = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_utilizacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Registro excluído com sucesso' });
      loadUtilizacoes(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao excluir utilização:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir utilização', 
        variant: 'destructive' 
      });
    }
  };

  // Funções de Manutenção
  const loadManutencoes = async (veiculoId: string) => {
    try {
      setLoadingManutencoes(true);
      const { data, error } = await (supabase as any)
        .from('frota_manutencoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('data', { ascending: false });

      if (error) throw error;
      setManutencoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
    } finally {
      setLoadingManutencoes(false);
    }
  };

  const resetManutencaoForm = () => {
    setManutencaoForm({
      tipo: 'Preventiva',
      data: format(new Date(), 'yyyy-MM-dd'),
      km: veiculoSelecionado?.km_atual || 0,
      servico: '',
      status: 'Agendada',
      custo: 0,
      proxima_km: 0,
      proxima_data: '',
      observacoes: ''
    });
  };

  // Função para verificar se a data está ocupada (veículo em uso ou outra manutenção agendada)
  const verificarDataOcupada = (dataStr: string, veiculoId: string, manutencaoIdExcluir?: string): { ocupada: boolean; motivo: string } => {
    // Verificar utilizações em andamento que cobrem essa data
    const utilizacaoOcupando = todasUtilizacoesCalendario.find(u => {
      if (u.veiculo_id !== veiculoId || u.status !== 'Em uso') return false;
      const dataSaida = u.data_saida || u.data;
      if (!dataSaida) return false;
      const previsaoRetorno = u.previsao_retorno ? u.previsao_retorno.substring(0, 10) : dataSaida;
      return dataStr >= dataSaida && dataStr <= previsaoRetorno;
    });

    if (utilizacaoOcupando) {
      return {
        ocupada: true,
        motivo: `O veículo está em uso nesta data (saída: ${utilizacaoOcupando.data_saida ? format(parseISO(utilizacaoOcupando.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : '-'}${utilizacaoOcupando.previsao_retorno ? `, previsão retorno: ${format(parseISO(utilizacaoOcupando.previsao_retorno), 'dd/MM/yyyy', { locale: ptBR })}` : ''}). Aguarde o retorno do veículo ou escolha outra data.`
      };
    }

    // Verificar outras manutenções agendadas/em andamento na mesma data
    const outraManutencao = todasManutencoesCalendario.find(m => {
      if (m.veiculo_id !== veiculoId) return false;
      if (manutencaoIdExcluir && m.id === manutencaoIdExcluir) return false;
      if (m.status !== 'Agendada' && m.status !== 'Em andamento') return false;
      return m.data === dataStr;
    });

    if (outraManutencao) {
      return {
        ocupada: true,
        motivo: `Já existe uma manutenção ${outraManutencao.status?.toLowerCase() || 'agendada'} para esta data (${outraManutencao.servico || 'Serviço não especificado'}). Escolha outra data ou conclua/cancele a manutenção existente.`
      };
    }

    return { ocupada: false, motivo: '' };
  };

  // Estado para aviso de data ocupada
  const [avisoDataOcupada, setAvisoDataOcupada] = useState<string>('');

  // Verificar disponibilidade quando a data muda
  useEffect(() => {
    if (veiculoSelecionado && manutencaoForm.data) {
      const resultado = verificarDataOcupada(manutencaoForm.data, veiculoSelecionado.id, editandoManutencao?.id);
      setAvisoDataOcupada(resultado.ocupada ? resultado.motivo : '');
    } else {
      setAvisoDataOcupada('');
    }
  }, [manutencaoForm.data, veiculoSelecionado, todasUtilizacoesCalendario, todasManutencoesCalendario, editandoManutencao]);

  const handleRegistrarManutencao = async () => {
    if (!veiculoSelecionado || !empresaId) return;

    if (!manutencaoForm.servico) {
      toast({ title: 'Erro', description: 'Serviço/Item é obrigatório', variant: 'destructive' });
      return;
    }

    // Verificar se a data está ocupada
    const verificacao = verificarDataOcupada(manutencaoForm.data, veiculoSelecionado.id);
    if (verificacao.ocupada) {
      toast({ 
        title: 'Data indisponível', 
        description: verificacao.motivo, 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSavingManutencao(true);
      
      const { error } = await (supabase as any)
        .from('frota_manutencoes')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          tipo: manutencaoForm.tipo,
          data: manutencaoForm.data,
          km: manutencaoForm.km,
          servico: manutencaoForm.servico,
          status: manutencaoForm.status,
          custo: manutencaoForm.custo,
          proxima_km: manutencaoForm.proxima_km || null,
          proxima_data: manutencaoForm.proxima_data || null,
          observacoes: manutencaoForm.observacoes
        });

      if (error) throw error;

      // Se houver custo, criar lançamento automático na aba de custos
      if (manutencaoForm.custo && manutencaoForm.custo > 0) {
        await (supabase as any)
          .from('frota_custos')
          .insert({
            veiculo_id: veiculoSelecionado.id,
            empresa_id: empresaId,
            categoria: 'Manutenção',
            data: manutencaoForm.data,
            valor: manutencaoForm.custo,
            fornecedor: null,
            observacoes: `${manutencaoForm.tipo} - ${manutencaoForm.servico}`
          });
        
        // Recarregar custos para atualizar a lista
        loadCustos(veiculoSelecionado.id);
      }

      toast({ title: 'Sucesso', description: 'Manutenção registrada com sucesso' });
      resetManutencaoForm();
      loadManutencoes(veiculoSelecionado.id);
      loadDadosCalendario();
    } catch (error: any) {
      console.error('Erro ao registrar manutenção:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar manutenção', 
        variant: 'destructive' 
      });
    } finally {
      setSavingManutencao(false);
    }
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta manutenção?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_manutencoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Manutenção excluída com sucesso' });
      loadManutencoes(veiculoSelecionado.id);
      loadDadosCalendario();
    } catch (error: any) {
      console.error('Erro ao excluir manutenção:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir manutenção', 
        variant: 'destructive' 
      });
    }
  };

  const abrirEdicaoManutencao = (manut: any) => {
    setEditandoManutencao(manut);
    setManutencaoForm({
      tipo: manut.tipo || 'Preventiva',
      data: manut.data || format(new Date(), 'yyyy-MM-dd'),
      km: manut.km || 0,
      servico: manut.servico || '',
      status: manut.status || 'Agendada',
      custo: manut.custo || 0,
      proxima_km: manut.proxima_km || 0,
      proxima_data: manut.proxima_data || '',
      observacoes: manut.observacoes || ''
    });
  };

  const handleSalvarEdicaoManutencao = async () => {
    if (!editandoManutencao || !veiculoSelecionado) return;

    // Verificar se a data está ocupada (excluindo a própria manutenção sendo editada)
    const verificacao = verificarDataOcupada(manutencaoForm.data, veiculoSelecionado.id, editandoManutencao.id);
    if (verificacao.ocupada) {
      toast({ 
        title: 'Data indisponível', 
        description: verificacao.motivo, 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSavingManutencao(true);
      
      const { error } = await (supabase as any)
        .from('frota_manutencoes')
        .update({
          tipo: manutencaoForm.tipo,
          data: manutencaoForm.data,
          km: manutencaoForm.km,
          servico: manutencaoForm.servico,
          status: manutencaoForm.status,
          custo: manutencaoForm.custo,
          proxima_km: manutencaoForm.proxima_km || null,
          proxima_data: manutencaoForm.proxima_data || null,
          observacoes: manutencaoForm.observacoes
        })
        .eq('id', editandoManutencao.id);

      if (error) throw error;

      // Se o custo mudou e é maior que zero, criar/atualizar lançamento de custo
      const custoAnterior = editandoManutencao.custo || 0;
      const custoNovo = manutencaoForm.custo || 0;
      
      if (custoNovo > 0 && custoNovo !== custoAnterior) {
        await (supabase as any)
          .from('frota_custos')
          .insert({
            veiculo_id: veiculoSelecionado.id,
            empresa_id: empresaId,
            categoria: 'Manutenção',
            data: manutencaoForm.data,
            valor: custoNovo,
            fornecedor: null,
            observacoes: `${manutencaoForm.tipo} - ${manutencaoForm.servico}`
          });
        
        loadCustos(veiculoSelecionado.id);
      }

      toast({ title: 'Sucesso', description: 'Manutenção atualizada com sucesso' });
      setEditandoManutencao(null);
      resetManutencaoForm();
      setManutencoes([]);
      loadDadosCalendario();
      await loadManutencoes(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao atualizar manutenção:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao atualizar manutenção', 
        variant: 'destructive' 
      });
    } finally {
      setSavingManutencao(false);
    }
  };

  // Funções de Checklist
  const loadChecklists = async (veiculoId: string) => {
    try {
      setLoadingChecklists(true);
      const { data, error } = await (supabase as any)
        .from('frota_checklists')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('data', { ascending: false });

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
    } finally {
      setLoadingChecklists(false);
    }
  };

  const resetChecklistForm = () => {
    setChecklistForm({
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: 'Pré-uso',
      km: veiculoSelecionado?.km_atual || 0,
      responsavel: '',
      local: '',
      status_geral: 'Aprovado',
      observacoes: '',
      itens: {
        combustivel: false,
        luzes: false,
        buzina: false,
        parabrisa_limpadores: false,
        pneus: false,
        oleo_motor: false,
        agua_radiador: false,
        fluido_freio: false,
        fluido_direcao: false,
        bateria: false,
        cinto_seguranca: false,
        triangulo: false,
        kit_estepe: false
      }
    });
  };

  const handleRegistrarChecklist = async () => {
    if (!veiculoSelecionado || !empresaId) return;

    // Validar data obrigatória
    if (!checklistForm.data) {
      toast({
        title: 'Data obrigatória',
        description: 'Informe a data do checklist.',
        variant: 'destructive'
      });
      return;
    }

    // Validar observação obrigatória quando status for "Com ressalvas"
    if (checklistForm.status_geral === 'Com ressalvas' && !checklistForm.observacoes.trim()) {
      toast({
        title: 'Observação obrigatória',
        description: 'Quando há itens desmarcados, é obrigatório descrever os problemas encontrados.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSavingChecklist(true);
      
      const itensArray = Object.entries(checklistForm.itens)
        .filter(([_, checked]) => checked)
        .map(([item]) => item);

      console.log('Salvando checklist:', {
        itens: checklistForm.itens,
        itensArray,
        local: checklistForm.local,
        responsavel: checklistForm.responsavel
      });

      const { error } = await (supabase as any)
        .from('frota_checklists')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          data: checklistForm.data,
          tipo: checklistForm.tipo,
          km: checklistForm.km || null,
          responsavel: checklistForm.responsavel || null,
          local_inspecao: checklistForm.local || null,
          status_geral: checklistForm.status_geral,
          itens_verificados: itensArray,
          observacoes: checklistForm.observacoes || null
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Checklist registrado com sucesso' });
      resetChecklistForm();
      loadChecklists(veiculoSelecionado.id);
      
      // Limpar aviso de checklist obrigatório após registro bem-sucedido
      setMostrarAvisoChecklistObrigatorio(false);
    } catch (error: any) {
      console.error('Erro ao registrar checklist:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar checklist', 
        variant: 'destructive' 
      });
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    if (!confirm('Deseja realmente excluir este checklist?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Checklist excluído com sucesso' });
      loadChecklists(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao excluir checklist:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir checklist', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusChecklistBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      'Aprovado': { className: 'bg-green-500', label: 'Aprovado' },
      'Reprovado': { className: 'bg-red-500', label: 'Reprovado' },
      'Com ressalvas': { className: 'bg-yellow-500', label: 'Com ressalvas' },
    };
    return statusMap[status] || { className: 'bg-gray-500', label: status };
  };

  const itensChecklistLabels: Record<string, string> = {
    combustivel: '⛽ Combustível suficiente',
    luzes: '🚨 Luzes (farol, lanterna, seta, freio)',
    buzina: '🔊 Buzina',
    parabrisa_limpadores: '🪟 Para-brisa e limpadores',
    pneus: '🛞 Pneus (calibragem e desgaste + estepe)',
    oleo_motor: '🛢️ Óleo do motor',
    agua_radiador: '❄️ Água do radiador / arrefecimento',
    fluido_freio: '🧴 Fluido de freio',
    fluido_direcao: '⚙️ Fluido da direção hidráulica',
    bateria: '🔋 Bateria (partida e oxidação)',
    cinto_seguranca: '🦺 Cinto de segurança',
    triangulo: '🦯 Triângulo de sinalização',
    kit_estepe: '🛞 Estepe, macaco e chave de roda'
  };

  // Funções de Custos
  const loadCustos = async (veiculoId: string) => {
    try {
      setLoadingCustos(true);
      const { data, error } = await (supabase as any)
        .from('frota_custos')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('data', { ascending: false });

      if (error) throw error;
      setCustos(data || []);
    } catch (error) {
      console.error('Erro ao carregar custos:', error);
    } finally {
      setLoadingCustos(false);
    }
  };

  const resetCustoForm = () => {
    setCustoForm({
      categoria: 'Abastecimento',
      data: format(new Date(), 'yyyy-MM-dd'),
      valor: 0,
      fornecedor: '',
      observacao: ''
    });
  };

  const handleRegistrarCusto = async () => {
    if (!veiculoSelecionado || !empresaId) return;

    try {
      setSavingCusto(true);

      const { error } = await (supabase as any)
        .from('frota_custos')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          categoria: custoForm.categoria,
          data: custoForm.data,
          valor: custoForm.valor,
          fornecedor: custoForm.fornecedor,
          observacoes: custoForm.observacao
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Custo registrado com sucesso' });
      resetCustoForm();
      loadCustos(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao registrar custo:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar custo', 
        variant: 'destructive' 
      });
    } finally {
      setSavingCusto(false);
    }
  };

  const handleDeleteCusto = async (id: string) => {
    if (!confirm('Deseja realmente excluir este custo?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_custos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Custo excluído com sucesso' });
      loadCustos(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao excluir custo:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir custo', 
        variant: 'destructive' 
      });
    }
  };

  const categoriasCusto = [
    'Abastecimento',
    'Manutenção',
    'Pedágio',
    'Seguro',
    'Peças',
    'Serviços',
    'Multa',
    'Outro'
  ];

  // Funções de Documentos
  const tiposDocumento = [
    'Licenciamento',
    'Seguro',
    'IPVA',
    'Inspeção',
    'Tacógrafo',
    'Outro'
  ];

  const loadDocumentos = async (veiculoId: string) => {
    try {
      setLoadingDocumentos(true);
      const { data, error } = await (supabase as any)
        .from('frota_documentos')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('vencimento', { ascending: true });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  const resetDocumentoForm = () => {
    setDocumentoForm({
      tipo: 'Licenciamento',
      numero: '',
      vencimento: format(new Date(), 'yyyy-MM-dd'),
      observacoes: ''
    });
    setDocumentoArquivo(null);
  };

  const handleRegistrarDocumento = async () => {
    if (!veiculoSelecionado || !empresaId) return;

    try {
      setSavingDocumento(true);

      let arquivoUrl = null;

      // Upload do arquivo se existir
      if (documentoArquivo) {
        const fileExt = documentoArquivo.name.split('.').pop();
        const fileName = `${empresaId}/${veiculoSelecionado.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('frota-documentos')
          .upload(fileName, documentoArquivo);

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          // Se o bucket não existir, continua sem o arquivo
          if (!uploadError.message.includes('Bucket not found')) {
            throw uploadError;
          }
        } else {
          // Obter URL pública do arquivo
          const { data: urlData } = supabase.storage
            .from('frota-documentos')
            .getPublicUrl(fileName);
          
          arquivoUrl = urlData?.publicUrl || null;
        }
      }

      const { error } = await (supabase as any)
        .from('frota_documentos')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          tipo: documentoForm.tipo,
          numero: documentoForm.numero,
          vencimento: documentoForm.vencimento,
          observacoes: documentoForm.observacoes,
          arquivo_url: arquivoUrl
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Documento registrado com sucesso' });
      resetDocumentoForm();
      loadDocumentos(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao registrar documento:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar documento', 
        variant: 'destructive' 
      });
    } finally {
      setSavingDocumento(false);
    }
  };

  const handleDeleteDocumento = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_documentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Documento excluído com sucesso' });
      loadDocumentos(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir documento', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusDocumento = (vencimento: string) => {
    const hoje = new Date();
    const dataVencimento = parseISO(vencimento);
    const diasRestantes = differenceInDays(dataVencimento, hoje);
    
    if (diasRestantes < 0) {
      return { className: 'bg-red-500', label: 'Vencido' };
    } else if (diasRestantes <= 30) {
      return { className: 'bg-yellow-500', label: 'Próximo' };
    } else {
      return { className: 'bg-green-500', label: 'Em dia' };
    }
  };

  // Funções de Ocorrências
  const tiposOcorrencia = [
    'Avaria',
    'Acidente',
    'Multa',
    'Falha',
    'Outro'
  ];

  const statusOcorrencia = [
    'Aberta',
    'Em análise',
    'Resolvida',
    'Pendente'
  ];

  const loadOcorrencias = async (veiculoId: string) => {
    try {
      setLoadingOcorrencias(true);
      const { data, error } = await (supabase as any)
        .from('frota_ocorrencias')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('data', { ascending: false });

      if (error) throw error;
      setOcorrencias(data || []);
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    } finally {
      setLoadingOcorrencias(false);
    }
  };

  const resetOcorrenciaForm = () => {
    setOcorrenciaForm({
      tipo: 'Avaria',
      data: format(new Date(), 'yyyy-MM-dd'),
      status: 'Aberta',
      local: '',
      descricao: '',
      custo_estimado: 0,
      responsavel: '',
      prazo: ''
    });
  };

  const handleRegistrarOcorrencia = async () => {
    if (!veiculoSelecionado || !empresaId) return;

    try {
      setSavingOcorrencia(true);

      const { error } = await (supabase as any)
        .from('frota_ocorrencias')
        .insert({
          veiculo_id: veiculoSelecionado.id,
          empresa_id: empresaId,
          tipo: ocorrenciaForm.tipo,
          data: ocorrenciaForm.data,
          status: ocorrenciaForm.status,
          local_ocorrencia: ocorrenciaForm.local,
          descricao: ocorrenciaForm.descricao,
          custo_estimado: ocorrenciaForm.custo_estimado || null,
          responsavel: ocorrenciaForm.responsavel,
          prazo: ocorrenciaForm.prazo || null
        });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Ocorrência registrada com sucesso' });
      resetOcorrenciaForm();
      loadOcorrencias(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao registrar ocorrência:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao registrar ocorrência', 
        variant: 'destructive' 
      });
    } finally {
      setSavingOcorrencia(false);
    }
  };

  const handleDeleteOcorrencia = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta ocorrência?')) return;
    
    try {
      const { error } = await (supabase as any)
        .from('frota_ocorrencias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Ocorrência excluída com sucesso' });
      loadOcorrencias(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao excluir ocorrência:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao excluir ocorrência', 
        variant: 'destructive' 
      });
    }
  };

  const handleSalvarEdicaoOcorrencia = async () => {
    if (!editandoOcorrencia || !veiculoSelecionado) return;

    try {
      setSavingOcorrencia(true);
      
      const { error } = await (supabase as any)
        .from('frota_ocorrencias')
        .update({
          tipo: ocorrenciaForm.tipo,
          data: ocorrenciaForm.data,
          status: ocorrenciaForm.status,
          local_ocorrencia: ocorrenciaForm.local,
          descricao: ocorrenciaForm.descricao,
          custo_estimado: ocorrenciaForm.custo_estimado || null,
          responsavel: ocorrenciaForm.responsavel,
          prazo: ocorrenciaForm.prazo || null
        })
        .eq('id', editandoOcorrencia.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Ocorrência atualizada com sucesso' });
      setEditandoOcorrencia(null);
      resetOcorrenciaForm();
      loadOcorrencias(veiculoSelecionado.id);
    } catch (error: any) {
      console.error('Erro ao atualizar ocorrência:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao atualizar ocorrência', 
        variant: 'destructive' 
      });
    } finally {
      setSavingOcorrencia(false);
    }
  };

  const getStatusOcorrenciaBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      'Aberta': { className: 'bg-blue-500', label: 'Aberta' },
      'Em análise': { className: 'bg-yellow-500', label: 'Em análise' },
      'Resolvida': { className: 'bg-green-500', label: 'Resolvida' },
      'Pendente': { className: 'bg-orange-500', label: 'Pendente' },
    };
    return statusMap[status] || { className: 'bg-gray-500', label: status };
  };

  const getStatusManutencaoBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      'Agendada': { className: 'bg-blue-500', label: 'Agendada' },
      'Em andamento': { className: 'bg-orange-500', label: 'Em andamento' },
      'Concluída': { className: 'bg-green-500', label: 'Concluída' },
      'Pendente': { className: 'bg-yellow-500', label: 'Pendente' },
    };
    return statusMap[status] || { className: 'bg-gray-500', label: status };
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'ok': { variant: 'default', label: 'OK' },
      'atencao': { variant: 'secondary', label: 'Atenção' },
      'critico': { variant: 'destructive', label: 'Crítico' },
      'vencido': { variant: 'destructive', label: 'Vencido' },
      'aprovado': { variant: 'default', label: 'Aprovado' },
      'reprovado': { variant: 'destructive', label: 'Reprovado' },
      'aberta': { variant: 'destructive', label: 'Aberta' },
      'resolvida': { variant: 'default', label: 'Resolvida' },
      'pendente': { variant: 'secondary', label: 'Pendente' },
      'agendada': { variant: 'outline', label: 'Agendada' },
      'concluida': { variant: 'default', label: 'Concluída' },
      'em_andamento': { variant: 'secondary', label: 'Em Andamento' },
    };
    const config = statusMap[status?.toLowerCase()] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6" />
            Gestão de Frota
          </h1>
          <p className="text-muted-foreground">
            Cadastro de veículos • Uso • Manutenção • Checklist • Custos • Documentos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Barra horizontal de seleção de veículo */}
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Veículo */}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">Veículos</span>
              <Select
                value={veiculoSelecionado?.id || ''}
                onValueChange={(value) => {
                  const v = veiculos.find(v => v.id === value);
                  setVeiculoSelecionado(v);
                }}
              >
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.placa} • {v.marca} {v.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => openDialog()} className="h-8 mt-4">
              <Plus className="h-3 w-3 mr-1" />
              Novo
            </Button>

            {/* Motoristas */}
            <Button variant="outline" size="sm" onClick={() => setActiveTab('motoristas')} className="h-8 mt-4">
              <User className="h-3 w-3 mr-1" />
              Motoristas ({motoristas.length})
            </Button>
            <Button size="sm" onClick={() => handleOpenMotoristaDialog()} className="h-8 mt-4">
              <Plus className="h-3 w-3 mr-1" />
              Novo Motorista
            </Button>

            {veiculoSelecionado && (
              <>
                {/* KPIs do Veículo */}
                <div className="flex items-center gap-1">
                  <div className="p-2 rounded-lg border bg-muted/50 text-center min-w-[80px]">
                    <div className="text-lg font-bold">{(veiculoSelecionado.km_atual || 0).toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">KM atual</div>
                  </div>
                  <div className={`p-2 rounded-lg border text-center min-w-[70px] ${
                    (documentos.filter(d => differenceInDays(parseISO(d.vencimento), new Date()) < 0).length +
                     ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length +
                     manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length) > 0
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20'
                      : 'bg-muted/50'
                  }`}>
                    <div className={`text-lg font-bold ${
                      (documentos.filter(d => differenceInDays(parseISO(d.vencimento), new Date()) < 0).length +
                       ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length +
                       manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length) > 0
                        ? 'text-red-600'
                        : ''
                    }`}>
                      {documentos.filter(d => differenceInDays(parseISO(d.vencimento), new Date()) < 0).length +
                       documentos.filter(d => {
                         const dias = differenceInDays(parseISO(d.vencimento), new Date());
                         return dias >= 0 && dias <= 30;
                       }).length +
                       ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length +
                       manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Alertas</div>
                  </div>
                  <div className="p-2 rounded-lg border bg-muted/50 text-center min-w-[80px]">
                    <div className="text-lg font-bold">
                      {formatMoney(custos.filter(c => {
                        const dataCusto = parseISO(c.data);
                        const hoje = new Date();
                        return dataCusto.getMonth() === hoje.getMonth() && dataCusto.getFullYear() === hoje.getFullYear();
                      }).reduce((acc, c) => acc + (Number(c.valor) || 0), 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Custo mês</div>
                  </div>
                </div>

                {/* Chips de Info */}
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">{veiculoSelecionado.tipo || 'Passeio'}</Badge>
                  <Badge variant="outline" className="text-xs">{veiculoSelecionado.combustivel || 'Flex'}</Badge>
                  <Badge variant="outline" className="text-xs">{veiculoSelecionado.ano || '-'}</Badge>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openDialog(veiculoSelecionado)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todos os registros do veículo serão removidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Tabs */}
      <div className="border-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList 
              className="w-full inline-flex h-10 items-center justify-start rounded-md p-1 bg-primary"
            >
              <TabsTrigger value="dashboard" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="veiculo" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Dados do Veículo
              </TabsTrigger>
              <TabsTrigger value="uso" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Utilização
              </TabsTrigger>
              <TabsTrigger value="calendario" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Calendário
              </TabsTrigger>
              <TabsTrigger value="manutencao" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Manutenção
              </TabsTrigger>
              <TabsTrigger value="checklist" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Checklist
              </TabsTrigger>
              <TabsTrigger value="custos" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Custos
              </TabsTrigger>
              <TabsTrigger value="documentos" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Documentos
              </TabsTrigger>
              <TabsTrigger value="ocorrencias" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Ocorrências
              </TabsTrigger>
              <TabsTrigger value="motoristas" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Motoristas
              </TabsTrigger>
              <TabsTrigger value="movimentacoes" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20 data-[state=active]:shadow-sm">
                Movimentações
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 border rounded-lg bg-card">
              <CardContent className="pt-6">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas e Status
                    </h3>
                    <div className="space-y-2">
                      {/* Alertas de Documentos Vencidos */}
                      {documentos.filter(d => {
                        const dias = differenceInDays(parseISO(d.vencimento), new Date());
                        return dias < 0;
                      }).length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-800 dark:text-red-400">
                            {documentos.filter(d => differenceInDays(parseISO(d.vencimento), new Date()) < 0).length} documento(s) vencido(s)
                          </span>
                        </div>
                      )}
                      
                      {/* Alertas de Documentos Próximos do Vencimento (30 dias) */}
                      {documentos.filter(d => {
                        const dias = differenceInDays(parseISO(d.vencimento), new Date());
                        return dias >= 0 && dias <= 30;
                      }).length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-400">
                            {documentos.filter(d => {
                              const dias = differenceInDays(parseISO(d.vencimento), new Date());
                              return dias >= 0 && dias <= 30;
                            }).length} documento(s) vencendo em até 30 dias
                          </span>
                        </div>
                      )}

                      {/* Alertas de Ocorrências Abertas */}
                      {ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200">
                          <FileWarning className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-800 dark:text-orange-400">
                            {ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length} ocorrência(s) em aberto
                          </span>
                        </div>
                      )}

                      {/* Alertas de Manutenções Pendentes */}
                      {manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                          <Wrench className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800 dark:text-blue-400">
                            {manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length} manutenção(ões) pendente(s)
                          </span>
                        </div>
                      )}

                      {/* Veículo em uso */}
                      {utilizacoes.filter(u => u.status === 'Em uso').length > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                          <Car className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-purple-800 dark:text-purple-400">
                            Veículo em uso - {utilizacoes.find(u => u.status === 'Em uso')?.motorista || 'Motorista não informado'}
                          </span>
                        </div>
                      )}

                      {/* Sem alertas */}
                      {documentos.filter(d => differenceInDays(parseISO(d.vencimento), new Date()) < 0).length === 0 &&
                       documentos.filter(d => {
                         const dias = differenceInDays(parseISO(d.vencimento), new Date());
                         return dias >= 0 && dias <= 30;
                       }).length === 0 &&
                       ocorrencias.filter(o => o.status === 'Aberta' || o.status === 'Em análise').length === 0 &&
                       manutencoes.filter(m => m.status === 'Agendada' || m.status === 'Em andamento').length === 0 &&
                       utilizacoes.filter(u => u.status === 'Em uso').length === 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800 dark:text-green-400">Sem alertas críticos no momento</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold mt-6 mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Próximas Ações
                    </h3>
                    <div className="space-y-2">
                      {/* Manutenções Agendadas */}
                      {manutencoes.filter(m => m.status === 'Agendada').slice(0, 3).map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded border text-sm">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3 w-3 text-muted-foreground" />
                            <span>{m.servico || 'Manutenção'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(m.data)}</span>
                        </div>
                      ))}
                      
                      {/* Documentos próximos do vencimento */}
                      {documentos.filter(d => {
                        const dias = differenceInDays(parseISO(d.vencimento), new Date());
                        return dias >= 0 && dias <= 60;
                      }).slice(0, 3).map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded border text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span>{d.tipo}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Vence: {formatDate(d.vencimento)}</span>
                        </div>
                      ))}

                      {manutencoes.filter(m => m.status === 'Agendada').length === 0 &&
                       documentos.filter(d => {
                         const dias = differenceInDays(parseISO(d.vencimento), new Date());
                         return dias >= 0 && dias <= 60;
                       }).length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          Nada pendente.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Resumo do Período</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-lg border">
                        <div className="text-2xl font-bold">{utilizacoes.length}</div>
                        <div className="text-xs text-muted-foreground">Usos registrados</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-2xl font-bold">{checklists.length}</div>
                        <div className="text-xs text-muted-foreground">Checklists</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-2xl font-bold">{manutencoes.length}</div>
                        <div className="text-xs text-muted-foreground">Manutenções</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Dica: use "Documentos" para vencimentos (licenciamento/seguro), "Custos" para abastecimentos e "Ocorrências" para avarias e multas.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Aba Dados do Veículo */}
              <TabsContent value="veiculo" className="m-0">
                {veiculoSelecionado ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Placa</Label>
                      <div className="font-medium">{veiculoSelecionado.placa || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Renavam</Label>
                      <div className="font-medium">{veiculoSelecionado.renavam || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Chassi</Label>
                      <div className="font-medium">{veiculoSelecionado.chassi || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Marca</Label>
                      <div className="font-medium">{veiculoSelecionado.marca || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Modelo</Label>
                      <div className="font-medium">{veiculoSelecionado.modelo || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Ano/Modelo</Label>
                      <div className="font-medium">{veiculoSelecionado.ano || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Tipo</Label>
                      <div className="font-medium">{veiculoSelecionado.tipo || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Combustível</Label>
                      <div className="font-medium">{veiculoSelecionado.combustivel || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">KM Atual</Label>
                      <div className="font-medium">{(veiculoSelecionado.km_atual || 0).toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Gestor Responsável</Label>
                      <div className="font-medium">{veiculoSelecionado.gestor_responsavel || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Motorista Padrão</Label>
                      <div className="font-medium">{veiculoSelecionado.motorista_padrao || '-'}</div>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-muted-foreground text-xs">Observações</Label>
                      <div className="font-medium">{veiculoSelecionado.observacoes || '-'}</div>
                    </div>
                    <div className="col-span-3 pt-2 border-t">
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox 
                          id="checklist-obrigatorio-view"
                          checked={veiculoSelecionado.checklist_obrigatorio || false}
                          disabled
                        />
                        <Label htmlFor="checklist-obrigatorio-view" className="text-sm font-medium cursor-default">
                          Checklist é obrigatório para cada uso
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {veiculoSelecionado.checklist_obrigatorio 
                          ? 'O motorista deve realizar o checklist antes de cada saída do veículo.'
                          : 'O checklist não é obrigatório para este veículo.'}
                      </p>
                    </div>
                    <div className="col-span-3 pt-4">
                      <Button variant="outline" onClick={() => openDialog(veiculoSelecionado)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Dados do Veículo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Selecione um veículo para ver os dados.</p>
                )}
              </TabsContent>

              <TabsContent value="uso" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para registrar utilização.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Formulário de Fechamento (quando há utilização em aberto) */}
                    {fechandoUtilizacao && (
                      <div className="border border-orange-300 bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-orange-700 dark:text-orange-400">
                            Fechamento de Utilização - {fechandoUtilizacao.codigo || 'Sem código'}
                          </h3>
                          <Button variant="ghost" size="sm" onClick={() => setFechandoUtilizacao(null)}>
                            Cancelar
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label>Data de Retorno</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechamentoForm.data_retorno && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {fechamentoForm.data_retorno ? format(parseISO(fechamentoForm.data_retorno), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={fechamentoForm.data_retorno ? parseISO(fechamentoForm.data_retorno) : undefined}
                                  onSelect={(date) => setFechamentoForm({ ...fechamentoForm, data_retorno: date ? format(date, 'yyyy-MM-dd') : '' })}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label>Hora de Retorno</Label>
                            <Input 
                              type="time" 
                              value={fechamentoForm.hora_retorno}
                              onChange={(e) => setFechamentoForm({ ...fechamentoForm, hora_retorno: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>KM Rodados *</Label>
                            <Input 
                              type="number" 
                              placeholder="Quantos KM rodou?" 
                              value={fechamentoForm.km_rodados || ''}
                              onChange={(e) => setFechamentoForm({ ...fechamentoForm, km_rodados: Number(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              KM atual: {(veiculoSelecionado?.km_atual || 0).toLocaleString('pt-BR')} → Novo total: {((veiculoSelecionado?.km_atual || 0) + (fechamentoForm.km_rodados || 0)).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <Label>Observações do Retorno</Label>
                            <Input 
                              placeholder="Observações..." 
                              value={fechamentoForm.observacoes_retorno}
                              onChange={(e) => setFechamentoForm({ ...fechamentoForm, observacoes_retorno: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleFecharUtilizacao} disabled={savingUtilizacao}>
                            {savingUtilizacao ? 'Fechando...' : 'Confirmar Retorno'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Formulário de Saída */}
                    {!fechandoUtilizacao && (
                      <>
                        {/* Aviso de veículo liberado após checklist */}
                        {veiculoSelecionado?.checklist_obrigatorio && !avisoChecklistObrigatorio && checklists.some(c => 
                          c.data === utilizacaoForm.data_saida && 
                          (c.tipo === 'Pré-uso' || c.tipo === 'Pré-Uso')
                        ) && (
                          <div className="flex items-start gap-3 p-4 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-400">Veículo liberado para utilização</p>
                              <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                                O checklist pré-uso foi realizado para a data de hoje. O veículo está liberado para registro de saída.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Aviso de veículo em uso */}
                        {veiculoEmUso && (
                          <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-orange-800 dark:text-orange-400">Veículo em uso</p>
                              <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">
                                Este veículo está em uso desde {veiculoEmUso.data_saida ? format(parseISO(veiculoEmUso.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : '-'} 
                                {veiculoEmUso.motorista && ` com ${veiculoEmUso.motorista}`}.
                                Registre o retorno antes de iniciar uma nova saída.
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 border-orange-400 text-orange-700 hover:bg-orange-100"
                                onClick={() => abrirFechamento(veiculoEmUso)}
                              >
                                Registrar Retorno
                              </Button>
                            </div>
                          </div>
                        )}

                        {!veiculoEmUso && (
                          <>
                            <h3 className="font-semibold">Registrar Saída do Veículo</h3>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <Label>Data de Saída *</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !utilizacaoForm.data_saida && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {utilizacaoForm.data_saida ? format(parseISO(utilizacaoForm.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={utilizacaoForm.data_saida ? parseISO(utilizacaoForm.data_saida) : undefined}
                                      onSelect={(date) => setUtilizacaoForm({ ...utilizacaoForm, data_saida: date ? format(date, 'yyyy-MM-dd') : '' })}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <Label>Hora de Saída</Label>
                                <Input 
                                  type="time" 
                                  value={utilizacaoForm.hora_saida}
                                  onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, hora_saida: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Previsão de Retorno</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !utilizacaoForm.previsao_retorno && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {utilizacaoForm.previsao_retorno ? format(parseISO(utilizacaoForm.previsao_retorno), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Selecione'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={utilizacaoForm.previsao_retorno ? parseISO(utilizacaoForm.previsao_retorno) : undefined}
                                      onSelect={(date) => setUtilizacaoForm({ ...utilizacaoForm, previsao_retorno: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <Label>KM Saída</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  value={utilizacaoForm.km_inicio || ''}
                                  onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, km_inicio: Number(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <Label>Local / Destino</Label>
                                <Input 
                                  placeholder="Cidade, obra, rota, região..." 
                                  value={utilizacaoForm.local_utilizacao}
                                  onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, local_utilizacao: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Motorista</Label>
                                <Select 
                                  value={utilizacaoForm.motorista} 
                                  onValueChange={(value) => setUtilizacaoForm({ ...utilizacaoForm, motorista: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o motorista" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {motoristasComCnhValida.length === 0 ? (
                                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                        Nenhum motorista com CNH válida
                                      </div>
                                    ) : motoristasComCnhValida.map((m) => (
                                      <SelectItem key={m.id} value={m.nome}>
                                        {m.nome} {m.cnh_categoria ? `(${m.cnh_categoria})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Finalidade</Label>
                                <Input 
                                  placeholder="Entrega, visita técnica, coleta..." 
                                  value={utilizacaoForm.finalidade}
                                  onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, finalidade: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Observações</Label>
                                <Input 
                                  placeholder="Ex.: pedágio, rota alternativa..." 
                                  value={utilizacaoForm.observacoes}
                                  onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, observacoes: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* Aviso de checklist obrigatório */}
                            {avisoChecklistObrigatorio && (
                              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-red-800 dark:text-red-400">Checklist obrigatório pendente</p>
                                  <p className="text-sm text-red-700 dark:text-red-500 mt-1">{avisoChecklistObrigatorio}</p>
                                </div>
                              </div>
                            )}

                            {/* Aviso de data ocupada na utilização */}
                            {avisoDataUtilizacaoOcupada && (
                              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-amber-800 dark:text-amber-400">Data indisponível para utilização</p>
                                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">{avisoDataUtilizacaoOcupada}</p>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button 
                                onClick={handleRegistrarSaida} 
                                disabled={savingUtilizacao || !!avisoDataUtilizacaoOcupada || !!avisoChecklistObrigatorio} 
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400"
                              >
                                {savingUtilizacao ? 'Registrando...' : 'Registrar Saída'}
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Tabela de registros */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Registros de Utilização</h3>
                      <p className="text-sm text-muted-foreground">Clique em "Fechar" para registrar o retorno do veículo.</p>
                      
                      {loadingUtilizacoes ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : utilizacoes.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum registro de utilização encontrado.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Código</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Saída</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Retorno</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Local</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Motorista</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">KM</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {utilizacoes.map((uso) => (
                                <tr key={uso.id} className="border-t">
                                  <td className="px-3 py-2 text-sm font-mono text-primary">{uso.codigo || '-'}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <Badge variant={uso.status === 'Em uso' ? 'default' : 'secondary'} className={uso.status === 'Em uso' ? 'bg-orange-500' : 'bg-green-500'}>
                                      {uso.status || 'Em uso'}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {uso.data_saida ? format(parseISO(uso.data_saida), 'dd/MM/yy', { locale: ptBR }) : '-'}
                                    {uso.hora_saida && <span className="text-muted-foreground ml-1">{uso.hora_saida.substring(0,5)}</span>}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    {uso.data_retorno ? format(parseISO(uso.data_retorno), 'dd/MM/yy', { locale: ptBR }) : '-'}
                                    {uso.hora_retorno && <span className="text-muted-foreground ml-1">{uso.hora_retorno.substring(0,5)}</span>}
                                  </td>
                                  <td className="px-3 py-2 text-sm">{uso.local_utilizacao || '-'}</td>
                                  <td className="px-3 py-2 text-sm">{uso.motorista || '-'}</td>
                                  <td className="px-3 py-2 text-sm">
                                    {uso.km_inicio?.toLocaleString('pt-BR')} → {uso.km_fim > 0 ? uso.km_fim?.toLocaleString('pt-BR') : '?'}
                                    {uso.km_fim > 0 && (
                                      <span className="text-muted-foreground ml-1">({((uso.km_fim || 0) - (uso.km_inicio || 0)).toLocaleString('pt-BR')} km)</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    <div className="flex gap-1">
                                      {uso.status === 'Em uso' && (
                                        <>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => abrirEdicaoUtilizacao(uso)}
                                            title="Editar utilização"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                            onClick={() => abrirFechamento(uso)}
                                          >
                                            Fechar
                                          </Button>
                                        </>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteUtilizacao(uso.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calendario" className="m-0">
                <div className="space-y-4">
                  {/* Filtro de Veículos */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap">Filtrar veículos:</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={veiculosFiltroCalendario.length === 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVeiculosFiltroCalendario([])}
                        >
                          Todos
                        </Button>
                        {veiculos.map((v) => (
                          <Button
                            key={v.id}
                            variant={veiculosFiltroCalendario.includes(v.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (veiculosFiltroCalendario.includes(v.id)) {
                                setVeiculosFiltroCalendario(veiculosFiltroCalendario.filter(id => id !== v.id));
                              } else {
                                setVeiculosFiltroCalendario([...veiculosFiltroCalendario, v.id]);
                              }
                            }}
                          >
                            {v.placa}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Legenda */}
                  <div className="flex gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-500"></div>
                      <span>Em uso</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-500 border-dashed"></div>
                      <span>Previsão retorno</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-500"></div>
                      <span>Manutenção agendada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-500"></div>
                      <span>Manutenção em andamento</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      className="w-full"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4 w-full",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex w-full",
                        head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                        row: "flex w-full mt-2",
                        cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                        day: "h-14 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                      components={{
                        Day: ({ date, ...props }) => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          
                          // Filtrar utilizações pelo filtro de veículos
                          const utilizacoesFiltradas = todasUtilizacoesCalendario.filter(u => 
                            veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(u.veiculo_id)
                          );
                          
                          // Filtrar manutenções pelo filtro de veículos
                          const manutencoesFiltradas = todasManutencoesCalendario.filter(m => 
                            veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(m.veiculo_id)
                          );
                          
                          // Verificar utilizações no dia
                          const utilizacaoDia = utilizacoesFiltradas.find(u => {
                            const dataSaida = u.data_saida || u.data;
                            if (!dataSaida) return false;
                            
                            if (u.status === 'Em uso') {
                              const previsaoRetorno = u.previsao_retorno ? u.previsao_retorno.substring(0, 10) : null;
                              if (previsaoRetorno) {
                                return dateStr >= dataSaida && dateStr <= previsaoRetorno;
                              }
                              return dateStr === dataSaida;
                            }
                            return false;
                          });
                          
                          // Verificar manutenções no dia
                          const manutencaoDia = manutencoesFiltradas.find(m => {
                            return m.data === dateStr;
                          });
                          
                          const isEmUso = !!utilizacaoDia;
                          const isManutencaoAgendada = manutencaoDia && manutencaoDia.status === 'Agendada';
                          const isManutencaoEmAndamento = manutencaoDia && manutencaoDia.status === 'Em andamento';
                          
                          // Verificar se é data de previsão de retorno
                          const isPrevisaoRetorno = utilizacoesFiltradas.some(u => {
                            if (u.status !== 'Em uso' || !u.previsao_retorno) return false;
                            const previsaoDate = u.previsao_retorno.substring(0, 10);
                            return dateStr === previsaoDate;
                          });
                          
                          // Contar quantos veículos estão ocupados nesse dia
                          const veiculosEmUso = utilizacoesFiltradas.filter(u => {
                            const dataSaida = u.data_saida || u.data;
                            if (!dataSaida || u.status !== 'Em uso') return false;
                            const previsaoRetorno = u.previsao_retorno ? u.previsao_retorno.substring(0, 10) : dataSaida;
                            return dateStr >= dataSaida && dateStr <= previsaoRetorno;
                          }).length;
                          
                          const veiculosManutencao = manutencoesFiltradas.filter(m => m.data === dateStr).length;
                          
                          return (
                            <div 
                              className={cn(
                                "h-14 w-full flex flex-col items-center justify-center rounded-md text-sm cursor-pointer hover:bg-accent",
                                isEmUso && !isManutencaoAgendada && !isManutencaoEmAndamento && "bg-orange-100 dark:bg-orange-950 border-2 border-orange-500",
                                isPrevisaoRetorno && isEmUso && "border-dashed",
                                isManutencaoAgendada && "bg-red-100 dark:bg-red-950 border-2 border-red-500",
                                isManutencaoEmAndamento && "bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-500"
                              )}
                            >
                              <span className={cn(
                                format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "font-bold text-primary"
                              )}>
                                {format(date, 'd')}
                              </span>
                              {veiculosEmUso > 0 && (
                                <span className="text-[9px] text-orange-600 font-medium">
                                  {veiculosEmUso} uso{veiculosEmUso > 1 ? 's' : ''}
                                </span>
                              )}
                              {veiculosManutencao > 0 && (
                                <span className={cn(
                                  "text-[9px] font-medium",
                                  isManutencaoEmAndamento ? "text-yellow-600" : "text-red-600"
                                )}>
                                  {veiculosManutencao} manut.
                                </span>
                              )}
                            </div>
                          );
                        }
                      }}
                    />
                  </div>

                  {/* Lista de eventos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Utilizações em uso */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Veículos em uso</h4>
                      {todasUtilizacoesCalendario.filter(u => 
                        u.status === 'Em uso' && 
                        (veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(u.veiculo_id))
                      ).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum veículo em uso.</p>
                      ) : (
                        <div className="space-y-2">
                          {todasUtilizacoesCalendario.filter(u => 
                            u.status === 'Em uso' && 
                            (veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(u.veiculo_id))
                          ).map((uso) => (
                            <div key={uso.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-8 rounded bg-orange-500"></div>
                                <div>
                                  <p className="font-medium">{uso.frota_veiculos?.placa || 'Veículo'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {uso.local_utilizacao || 'Sem destino'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Saída: {uso.data_saida ? format(parseISO(uso.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                    {uso.previsao_retorno && (
                                      <> • Prev: {format(parseISO(uso.previsao_retorno), 'dd/MM', { locale: ptBR })}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-orange-500">Em uso</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manutenções programadas */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Manutenções programadas</h4>
                      {todasManutencoesCalendario.filter(m => 
                        veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(m.veiculo_id)
                      ).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma manutenção programada.</p>
                      ) : (
                        <div className="space-y-2">
                          {todasManutencoesCalendario.filter(m => 
                            veiculosFiltroCalendario.length === 0 || veiculosFiltroCalendario.includes(m.veiculo_id)
                          ).map((manut) => (
                            <div 
                              key={manut.id} 
                              className={cn(
                                "flex items-center justify-between p-3 border rounded-lg",
                                manut.status === 'Agendada' ? "bg-red-50 dark:bg-red-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-8 rounded",
                                  manut.status === 'Agendada' ? "bg-red-500" : "bg-yellow-500"
                                )}></div>
                                <div>
                                  <p className="font-medium">{manut.frota_veiculos?.placa || 'Veículo'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {manut.servico || 'Manutenção'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Data: {manut.data ? format(parseISO(manut.data), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                  </p>
                                </div>
                              </div>
                              <Badge className={manut.status === 'Agendada' ? "bg-red-500" : "bg-yellow-500"}>
                                {manut.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manutencao" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para gerenciar manutenções.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Formulário de Manutenção */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Tipo</Label>
                          <Select value={manutencaoForm.tipo} onValueChange={(value) => setManutencaoForm({ ...manutencaoForm, tipo: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Preventiva">Preventiva</SelectItem>
                              <SelectItem value="Preditiva">Preditiva</SelectItem>
                              <SelectItem value="Corretiva">Corretiva</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !manutencaoForm.data && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {manutencaoForm.data ? format(parseISO(manutencaoForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={manutencaoForm.data ? parseISO(manutencaoForm.data) : undefined}
                                onSelect={(date) => setManutencaoForm({ ...manutencaoForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>KM</Label>
                          <Input 
                            type="number" 
                            placeholder="KM do veículo na data" 
                            value={manutencaoForm.km || ''}
                            onChange={(e) => setManutencaoForm({ ...manutencaoForm, km: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {/* Aviso de data ocupada */}
                      {avisoDataOcupada && (
                        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-400">Data indisponível para agendamento</p>
                            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">{avisoDataOcupada}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Serviço / Item</Label>
                          <Input 
                            placeholder="Ex.: troca de óleo, pastilhas de freio..." 
                            value={manutencaoForm.servico}
                            onChange={(e) => setManutencaoForm({ ...manutencaoForm, servico: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={manutencaoForm.status} onValueChange={(value) => setManutencaoForm({ ...manutencaoForm, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Agendada">Agendada</SelectItem>
                              <SelectItem value="Em andamento">Em andamento</SelectItem>
                              <SelectItem value="Concluída">Concluída</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Custo (R$)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0,00" 
                            value={manutencaoForm.custo || ''}
                            onChange={(e) => setManutencaoForm({ ...manutencaoForm, custo: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Próxima por KM (opcional)</Label>
                          <Input 
                            type="number" 
                            placeholder="Ex.: 10000" 
                            value={manutencaoForm.proxima_km || ''}
                            onChange={(e) => setManutencaoForm({ ...manutencaoForm, proxima_km: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Próxima por data (opcional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !manutencaoForm.proxima_data && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {manutencaoForm.proxima_data ? format(parseISO(manutencaoForm.proxima_data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={manutencaoForm.proxima_data ? parseISO(manutencaoForm.proxima_data) : undefined}
                                onSelect={(date) => setManutencaoForm({ ...manutencaoForm, proxima_data: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <Label>Observações / Diagnóstico</Label>
                        <Textarea 
                          placeholder="Ex.: desgaste irregular, vibração, ruído, risco, recomendação..." 
                          value={manutencaoForm.observacoes}
                          onChange={(e) => setManutencaoForm({ ...manutencaoForm, observacoes: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={handleRegistrarManutencao} 
                          disabled={savingManutencao || !!avisoDataOcupada} 
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400"
                        >
                          {savingManutencao ? 'Registrando...' : 'Registrar manutenção'}
                        </Button>
                      </div>
                    </div>

                    {/* Histórico de Manutenção */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Histórico de manutenção</h3>
                      
                      {loadingManutencoes ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : manutencoes.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum registro de manutenção encontrado.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Tipo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Data</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Serviço</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">KM</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Próximo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Custo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {manutencoes.map((manut) => {
                                const statusBadge = getStatusManutencaoBadge(manut.status);
                                return (
                                  <tr key={manut.id} className="hover:bg-muted/50">
                                    <td className="px-3 py-2 text-sm">
                                      <Badge variant="outline">{manut.tipo}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{formatDate(manut.data)}</td>
                                    <td className="px-3 py-2 text-sm">{manut.servico || '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{manut.km?.toLocaleString('pt-BR') || '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      {manut.proxima_km ? `${manut.proxima_km.toLocaleString('pt-BR')} km` : ''}
                                      {manut.proxima_km && manut.proxima_data ? ' / ' : ''}
                                      {manut.proxima_data ? formatDate(manut.proxima_data) : ''}
                                      {!manut.proxima_km && !manut.proxima_data ? '-' : ''}
                                    </td>
                                    <td className="px-3 py-2 text-sm">{formatMoney(manut.custo)}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          onClick={() => abrirEdicaoManutencao(manut)}
                                          title="Editar manutenção"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteManutencao(manut.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checklist" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para gerenciar checklists.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Aviso de checklist obrigatório para saída */}
                    {mostrarAvisoChecklistObrigatorio && veiculoSelecionado?.checklist_obrigatorio && (
                      <div className="flex items-start gap-3 p-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-800 dark:text-red-400">Checklist obrigatório para registrar saída</p>
                          <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                            Este veículo exige a realização do checklist pré-uso antes de cada saída. 
                            Preencha o formulário abaixo e clique em "Registrar Checklist" para liberar o registro de saída.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                            onClick={() => setMostrarAvisoChecklistObrigatorio(false)}
                          >
                            Entendi
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Formulário de Checklist */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checklistForm.data && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {checklistForm.data ? format(parseISO(checklistForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={checklistForm.data ? parseISO(checklistForm.data) : undefined}
                                onSelect={(date) => setChecklistForm({ ...checklistForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>Tipo</Label>
                          <Select value={checklistForm.tipo} onValueChange={(value) => setChecklistForm({ ...checklistForm, tipo: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pré-uso">Pré-uso</SelectItem>
                              <SelectItem value="Pós-uso">Pós-uso</SelectItem>
                              <SelectItem value="Semanal">Semanal</SelectItem>
                              <SelectItem value="Mensal">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>KM</Label>
                          <Input 
                            type="number" 
                            placeholder="KM na inspeção" 
                            value={checklistForm.km || ''}
                            onChange={(e) => setChecklistForm({ ...checklistForm, km: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Responsável</Label>
                          <Select 
                            value={checklistForm.responsavel} 
                            onValueChange={(value) => setChecklistForm({ ...checklistForm, responsavel: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {motoristas.map((m) => (
                                <SelectItem key={m.id} value={m.nome}>
                                  {m.nome} {!isCnhValida(m) && <span className="text-destructive">(CNH vencida)</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Local</Label>
                          <Input 
                            placeholder="Garagem, base, obra..." 
                            value={checklistForm.local}
                            onChange={(e) => setChecklistForm({ ...checklistForm, local: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Itens de verificação */}
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(checklistForm.itens).map(([key, checked]) => (
                          <div 
                            key={key}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                              checked ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20" : "hover:bg-muted"
                            )}
                            onClick={() => setChecklistForm({
                              ...checklistForm,
                              itens: { ...checklistForm.itens, [key]: !checked }
                            })}
                          >
                            <span className="text-sm">{itensChecklistLabels[key]}</span>
                            <div className={cn(
                              "w-5 h-5 border-2 rounded flex items-center justify-center",
                              checked ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                            )}>
                              {checked && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Status geral (automático)</Label>
                          <div className={cn(
                            "flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm font-medium",
                            checklistForm.status_geral === 'Aprovado' && "bg-emerald-50 border-emerald-200 text-emerald-700",
                            checklistForm.status_geral === 'Reprovado' && "bg-red-50 border-red-200 text-red-700",
                            checklistForm.status_geral === 'Com ressalvas' && "bg-amber-50 border-amber-200 text-amber-700"
                          )}>
                            {checklistForm.status_geral === 'Aprovado' && <CheckCircle className="h-4 w-4 mr-2" />}
                            {checklistForm.status_geral === 'Reprovado' && <AlertCircle className="h-4 w-4 mr-2" />}
                            {checklistForm.status_geral === 'Com ressalvas' && <AlertTriangle className="h-4 w-4 mr-2" />}
                            {checklistForm.status_geral}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {checklistForm.status_geral === 'Aprovado' && 'Todos os itens marcados'}
                            {checklistForm.status_geral === 'Reprovado' && 'Nenhum item marcado'}
                            {checklistForm.status_geral === 'Com ressalvas' && 'Um ou mais itens desmarcados'}
                          </p>
                        </div>
                        <div>
                          <Label>Anexo (opcional)</Label>
                          <Input type="file" className="cursor-pointer" />
                        </div>
                      </div>

                      <div>
                        <Label>
                          Observações {checklistForm.status_geral === 'Com ressalvas' && <span className="text-destructive">*</span>}
                        </Label>
                        <Textarea 
                          placeholder={checklistForm.status_geral === 'Com ressalvas' 
                            ? "Obrigatório: descreva os itens com problema (ex.: farol queimado, pneu careca...)" 
                            : "Ex.: farol queimado, pneu careca, vazamento..."
                          }
                          value={checklistForm.observacoes}
                          onChange={(e) => setChecklistForm({ ...checklistForm, observacoes: e.target.value })}
                          rows={3}
                          className={checklistForm.status_geral === 'Com ressalvas' && !checklistForm.observacoes.trim() ? 'border-destructive' : ''}
                        />
                        {checklistForm.status_geral === 'Com ressalvas' && (
                          <p className="text-xs text-destructive mt-1">
                            Observação obrigatória quando há itens desmarcados
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleRegistrarChecklist} disabled={savingChecklist} className="bg-emerald-500 hover:bg-emerald-600">
                          {savingChecklist ? 'Registrando...' : 'Registrar checklist'}
                        </Button>
                      </div>
                    </div>

                    {/* Histórico de Checklist */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Histórico de checklist</h3>
                      
                      {loadingChecklists ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : checklists.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum checklist registrado.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Data</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Tipo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Itens marcados</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Local</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">KM</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {checklists.map((check) => {
                                const statusBadge = getStatusChecklistBadge(check.status_geral);
                                const itensCount = check.itens_verificados?.length || 0;
                                return (
                                  <tr key={check.id} className="hover:bg-muted/50">
                                    <td className="px-3 py-2 text-sm">{formatDate(check.data)}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <Badge variant="outline">{check.tipo}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      <span className="text-muted-foreground">{itensCount}/9 itens</span>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{check.local_inspecao || '-'}</td>
                                    <td className="px-3 py-2 text-sm">{check.km?.toLocaleString('pt-BR') || '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-blue-600 hover:text-blue-700"
                                          onClick={() => setChecklistVisualizacao(check)}
                                          title="Visualizar checklist"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteChecklist(check.id)}
                                          title="Excluir checklist"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custos" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para gerenciar custos.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Formulário de Custo */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Categoria</Label>
                          <Select value={custoForm.categoria} onValueChange={(value) => setCustoForm({ ...custoForm, categoria: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriasCusto.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !custoForm.data && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {custoForm.data ? format(parseISO(custoForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={custoForm.data ? parseISO(custoForm.data) : undefined}
                                onSelect={(date) => setCustoForm({ ...custoForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>Valor (R$)</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0,00" 
                            value={custoForm.valor || ''}
                            onChange={(e) => setCustoForm({ ...custoForm, valor: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Fornecedor / Posto</Label>
                          <Input 
                            placeholder="Nome do fornecedor" 
                            value={custoForm.fornecedor}
                            onChange={(e) => setCustoForm({ ...custoForm, fornecedor: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Observação</Label>
                          <Input 
                            placeholder="Ex.: Diesel S10, NF 123..." 
                            value={custoForm.observacao}
                            onChange={(e) => setCustoForm({ ...custoForm, observacao: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleRegistrarCusto} disabled={savingCusto} className="bg-emerald-500 hover:bg-emerald-600">
                          {savingCusto ? 'Registrando...' : 'Registrar custo'}
                        </Button>
                      </div>
                    </div>

                    {/* Lançamentos de Custos */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Lançamentos de custos</h3>
                      
                      {loadingCustos ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : custos.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum custo registrado.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Categoria</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Data</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Valor</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Fornecedor</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Obs.</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {custos.map((custo) => (
                                <tr key={custo.id} className="hover:bg-muted/50">
                                  <td className="px-3 py-2 text-sm">
                                    <Badge variant="outline">{custo.categoria}</Badge>
                                  </td>
                                  <td className="px-3 py-2 text-sm">{formatDate(custo.data)}</td>
                                  <td className="px-3 py-2 text-sm font-medium">
                                    R$ {custo.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-sm">{custo.fornecedor || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-muted-foreground">{custo.observacao || '-'}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteCusto(custo.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documentos" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para gerenciar documentos.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Formulário de Documento */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Documento</Label>
                          <Select value={documentoForm.tipo} onValueChange={(value) => setDocumentoForm({ ...documentoForm, tipo: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposDocumento.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Número / Apólice</Label>
                          <Input 
                            placeholder="Opcional" 
                            value={documentoForm.numero}
                            onChange={(e) => setDocumentoForm({ ...documentoForm, numero: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Vencimento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !documentoForm.vencimento && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {documentoForm.vencimento ? format(parseISO(documentoForm.vencimento), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={documentoForm.vencimento ? parseISO(documentoForm.vencimento) : undefined}
                                onSelect={(date) => setDocumentoForm({ ...documentoForm, vencimento: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Observações</Label>
                          <Input 
                            placeholder="Ex.: seguradora X, cobertura Y..." 
                            value={documentoForm.observacoes}
                            onChange={(e) => setDocumentoForm({ ...documentoForm, observacoes: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Anexar Documento</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => setDocumentoArquivo(e.target.files?.[0] || null)}
                              className="flex-1"
                            />
                            {documentoArquivo && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDocumentoArquivo(null)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {documentoArquivo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Arquivo selecionado: {documentoArquivo.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleRegistrarDocumento} disabled={savingDocumento} className="bg-emerald-500 hover:bg-emerald-600">
                          {savingDocumento ? 'Registrando...' : 'Registrar documento'}
                        </Button>
                      </div>
                    </div>

                    {/* Documentos e Vencimentos */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Documentos e vencimentos</h3>
                      
                      {loadingDocumentos ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : documentos.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum documento registrado.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Documento</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Número</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Vencimento</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Obs.</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {documentos.map((doc) => {
                                const statusDoc = getStatusDocumento(doc.vencimento);
                                return (
                                  <tr key={doc.id} className="hover:bg-muted/50">
                                    <td className="px-3 py-2 text-sm">
                                      <Badge variant="outline">{doc.tipo}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{doc.numero || '-'}</td>
                                    <td className="px-3 py-2 text-sm">{formatDate(doc.vencimento)}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <Badge className={statusDoc.className}>{statusDoc.label}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-muted-foreground">{doc.observacoes || '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <div className="flex gap-1">
                                        {doc.arquivo_url && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-blue-600 hover:text-blue-700"
                                            onClick={() => window.open(doc.arquivo_url, '_blank')}
                                            title="Visualizar documento"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteDocumento(doc.id)}
                                          title="Excluir documento"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ocorrencias" className="m-0">
                {!veiculoSelecionado ? (
                  <p className="text-muted-foreground">Selecione um veículo para gerenciar ocorrências.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Formulário de Ocorrência */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Tipo</Label>
                          <Select value={ocorrenciaForm.tipo} onValueChange={(value) => setOcorrenciaForm({ ...ocorrenciaForm, tipo: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposOcorrencia.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !ocorrenciaForm.data && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {ocorrenciaForm.data ? format(parseISO(ocorrenciaForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={ocorrenciaForm.data ? parseISO(ocorrenciaForm.data) : undefined}
                                onSelect={(date) => setOcorrenciaForm({ ...ocorrenciaForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={ocorrenciaForm.status} onValueChange={(value) => setOcorrenciaForm({ ...ocorrenciaForm, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOcorrencia.map((st) => (
                                <SelectItem key={st} value={st}>{st}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Local</Label>
                          <Input 
                            placeholder="Onde ocorreu" 
                            value={ocorrenciaForm.local}
                            onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, local: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Input 
                            placeholder="Ex.: risco lateral, colisão leve..." 
                            value={ocorrenciaForm.descricao}
                            onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, descricao: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Custo estimado (R$)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0,00" 
                            value={ocorrenciaForm.custo_estimado || ''}
                            onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, custo_estimado: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Responsável</Label>
                          <Select 
                            value={ocorrenciaForm.responsavel} 
                            onValueChange={(value) => setOcorrenciaForm({ ...ocorrenciaForm, responsavel: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o motorista" />
                            </SelectTrigger>
                            <SelectContent>
                              {motoristas.length === 0 ? (
                                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                  Nenhum motorista cadastrado
                                </div>
                              ) : motoristas.map((m) => (
                                <SelectItem key={m.id} value={m.nome}>
                                  {m.nome} {m.cnh_categoria ? `(${m.cnh_categoria})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Prazo (opcional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !ocorrenciaForm.prazo && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {ocorrenciaForm.prazo ? format(parseISO(ocorrenciaForm.prazo), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={ocorrenciaForm.prazo ? parseISO(ocorrenciaForm.prazo) : undefined}
                                onSelect={(date) => setOcorrenciaForm({ ...ocorrenciaForm, prazo: date ? format(date, 'yyyy-MM-dd') : '' })}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleRegistrarOcorrencia} disabled={savingOcorrencia} className="bg-emerald-500 hover:bg-emerald-600">
                          {savingOcorrencia ? 'Registrando...' : 'Registrar ocorrência'}
                        </Button>
                      </div>
                    </div>

                    {/* Lista de Ocorrências */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Ocorrências</h3>
                      
                      {loadingOcorrencias ? (
                        <p className="text-muted-foreground">Carregando...</p>
                      ) : ocorrencias.length === 0 ? (
                        <p className="text-muted-foreground">Nenhuma ocorrência registrada.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left text-sm font-medium">Tipo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Data</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Descrição</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Local</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Prazo</th>
                                <th className="px-3 py-2 text-left text-sm font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {ocorrencias.map((ocor) => {
                                const statusBadge = getStatusOcorrenciaBadge(ocor.status);
                                return (
                                  <tr key={ocor.id} className="hover:bg-muted/50">
                                    <td className="px-3 py-2 text-sm">
                                      <Badge variant="outline">{ocor.tipo}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{formatDate(ocor.data)}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{ocor.descricao || '-'}</td>
                                    <td className="px-3 py-2 text-sm">{ocor.local_ocorrencia || '-'}</td>
                                    <td className="px-3 py-2 text-sm">{ocor.prazo ? formatDate(ocor.prazo) : '-'}</td>
                                    <td className="px-3 py-2 text-sm">
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-blue-600 hover:text-blue-700"
                                          onClick={() => setOcorrenciaVisualizacao(ocor)}
                                          title="Visualizar ocorrência"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-amber-600 hover:text-amber-700"
                                          onClick={() => {
                                            setEditandoOcorrencia(ocor);
                                            setOcorrenciaForm({
                                              tipo: ocor.tipo,
                                              data: ocor.data,
                                              status: ocor.status,
                                              local: ocor.local_ocorrencia || '',
                                              descricao: ocor.descricao || '',
                                              custo_estimado: ocor.custo_estimado || 0,
                                              responsavel: ocor.responsavel || '',
                                              prazo: ocor.prazo || ''
                                            });
                                          }}
                                          title="Editar ocorrência"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteOcorrencia(ocor.id)}
                                          title="Excluir ocorrência"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Motoristas Tab */}
              <TabsContent value="motoristas" className="m-0">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Cadastro de Motoristas
                      </h3>
                      <p className="text-sm text-muted-foreground">Gerencie os motoristas da frota</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar motorista..."
                          value={searchMotorista}
                          onChange={(e) => setSearchMotorista(e.target.value)}
                          className="pl-9 w-64"
                        />
                      </div>
                      <Button onClick={() => handleOpenMotoristaDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Motorista
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Motoristas */}
                  {loadingMotoristas ? (
                    <p className="text-muted-foreground">Carregando motoristas...</p>
                  ) : filteredMotoristas.length === 0 ? (
                    <div className="text-center py-12">
                      <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum motorista cadastrado</h3>
                      <p className="text-muted-foreground mb-4">
                        Cadastre motoristas para associar aos veículos e utilizações
                      </p>
                      <Button onClick={() => handleOpenMotoristaDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Primeiro Motorista
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredMotoristas.map((motorista) => {
                        const cnhVencida = motorista.cnh_validade && differenceInDays(parseISO(motorista.cnh_validade), new Date()) < 0;
                        const diasParaVencer = motorista.cnh_validade ? differenceInDays(parseISO(motorista.cnh_validade), new Date()) : null;
                        const cnhProximaVencer = diasParaVencer !== null && diasParaVencer <= 30 && diasParaVencer >= 0;
                        const cnhEmDia = motorista.cnh_validade && diasParaVencer !== null && diasParaVencer > 30;
                        
                        return (
                          <Card key={motorista.id} className={`hover:shadow-md transition-shadow ${cnhVencida ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${cnhVencida ? 'bg-red-100' : 'bg-primary/10'}`}>
                                  {motorista.foto_url ? (
                                    <img src={motorista.foto_url} alt={motorista.nome} className="h-12 w-12 rounded-full object-cover" />
                                  ) : (
                                    <User className={`h-6 w-6 ${cnhVencida ? 'text-red-600' : 'text-primary'}`} />
                                  )}
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold truncate">{motorista.nome}</h4>
                                    {cnhVencida && (
                                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Bloqueado
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{motorista.cpf || 'CPF não informado'}</p>
                                  
                                  {/* Status CNH */}
                                  <div className="mt-2 p-2 rounded-lg bg-muted/50">
                                    {motorista.cnh_numero ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-muted-foreground">CNH {motorista.cnh_categoria || '-'}</span>
                                          {cnhVencida && (
                                            <Badge variant="destructive" className="text-xs">
                                              <AlertCircle className="h-3 w-3 mr-1" />
                                              Vencida há {Math.abs(diasParaVencer || 0)} dias
                                            </Badge>
                                          )}
                                          {cnhProximaVencer && (
                                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                              <AlertTriangle className="h-3 w-3 mr-1" />
                                              Vence em {diasParaVencer} dias
                                            </Badge>
                                          )}
                                          {cnhEmDia && (
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              Em dia
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                          Validade: {format(parseISO(motorista.cnh_validade), 'dd/MM/yyyy')}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">CNH não cadastrada</p>
                                    )}
                                  </div>
                                  
                                  {/* Contato */}
                                  {motorista.telefone && (
                                    <p className="text-xs text-muted-foreground mt-2">{motorista.telefone}</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setMotoristaVisualizacao(motorista)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleOpenMotoristaDialog(motorista)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteMotorista(motorista.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Movimentações Tab */}
              <TabsContent value="movimentacoes" className="m-0">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Movimentações de Veículos
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Histórico de todas as utilizações de veículos
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {utilizacoes.length} movimentações
                      </Badge>
                    </div>
                  </div>

                  {/* Lista de Movimentações em Cards */}
                  {utilizacoes.length === 0 ? (
                    <div className="text-center py-12">
                      <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-semibold mb-2">Nenhuma movimentação registrada</h3>
                      <p className="text-muted-foreground mb-4">
                        As utilizações de veículos aparecerão aqui
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {utilizacoes.map((util) => {
                        const veiculo = veiculos.find(v => v.id === util.veiculo_id);
                        const kmRodados = util.km_rodados || util.km_rodado;
                        const kmDisplay = kmRodados ? Math.abs(kmRodados) : null;
                        const isEmUso = util.status === 'em_uso';
                        const isConcluido = util.status === 'finalizado' || util.status === 'concluido';
                        
                        return (
                          <div 
                            key={util.id} 
                            className={cn(
                              "border rounded-lg p-4 transition-all",
                              isEmUso && "border-blue-300 bg-blue-50/50",
                              isConcluido && "border-green-200 bg-green-50/30"
                            )}
                          >
                            {/* Header do Card */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  isEmUso ? "bg-blue-100" : isConcluido ? "bg-green-100" : "bg-gray-100"
                                )}>
                                  <Car className={cn(
                                    "h-5 w-5",
                                    isEmUso ? "text-blue-600" : isConcluido ? "text-green-600" : "text-gray-600"
                                  )} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{veiculo?.placa || 'N/A'}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {veiculo?.marca} {veiculo?.modelo}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {util.codigo || 'Sem código'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  isEmUso ? 'default' :
                                  isConcluido ? 'secondary' :
                                  util.status === 'agendado' ? 'outline' : 'outline'
                                } className={cn(
                                  isEmUso && "bg-blue-600",
                                  isConcluido && "bg-green-600 text-white"
                                )}>
                                  {isEmUso ? 'Em Uso' :
                                   isConcluido ? 'Concluído' :
                                   util.status === 'agendado' ? 'Agendado' : util.status || 'N/A'}
                                </Badge>
                                {util.funil_card_id && (
                                  <Badge 
                                    variant="outline" 
                                    className="bg-orange-50 text-orange-700 border-orange-200 cursor-pointer hover:bg-orange-100"
                                    onClick={async () => {
                                      // Buscar dados do card vinculado
                                      try {
                                        const { data: cardData, error } = await (supabase as any)
                                          .from('funil_cards')
                                          .select(`
                                            *,
                                            funil:funil_id(nome, setor_id),
                                            etapa:etapa_id(nome, cor)
                                          `)
                                          .eq('id', util.funil_card_id)
                                          .single();
                                        
                                        if (error) throw error;
                                        
                                        if (cardData) {
                                          toast({
                                            title: `Card: ${cardData.titulo}`,
                                            description: `Funil: ${cardData.funil?.nome || 'N/A'} • Etapa: ${cardData.etapa?.nome || 'N/A'}`,
                                          });
                                        }
                                      } catch (err) {
                                        console.error('Erro ao buscar card:', err);
                                        toast({
                                          title: 'Card Vinculado',
                                          description: 'Não foi possível carregar os detalhes do card.',
                                          variant: 'destructive'
                                        });
                                      }
                                    }}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Ver Card
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Informações de Saída e Retorno */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Saída */}
                              <div className="bg-white border rounded-lg p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="font-medium">Saída</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {util.data_saida ? format(parseISO(util.data_saida), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                    {util.hora_saida && (
                                      <span className="text-muted-foreground font-normal ml-2">
                                        {util.hora_saida.substring(0, 5)}
                                      </span>
                                    )}
                                  </p>
                                  {util.km_inicio && (
                                    <p className="text-sm text-muted-foreground">
                                      <Gauge className="h-3 w-3 inline mr-1" />
                                      {util.km_inicio.toLocaleString('pt-BR')} km
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Retorno */}
                              <div className={cn(
                                "border rounded-lg p-3",
                                isEmUso ? "bg-yellow-50 border-yellow-200" : "bg-white"
                              )}>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    isEmUso ? "bg-yellow-500" : "bg-green-500"
                                  )}></div>
                                  <span className="font-medium">Retorno</span>
                                </div>
                                <div className="space-y-1">
                                  {util.data_retorno ? (
                                    <>
                                      <p className="font-semibold">
                                        {format(parseISO(util.data_retorno), "dd/MM/yyyy", { locale: ptBR })}
                                        {util.hora_retorno && (
                                          <span className="text-muted-foreground font-normal ml-2">
                                            {util.hora_retorno.substring(0, 5)}
                                          </span>
                                        )}
                                      </p>
                                      {util.km_fim && (
                                        <p className="text-sm text-muted-foreground">
                                          <Gauge className="h-3 w-3 inline mr-1" />
                                          {util.km_fim.toLocaleString('pt-BR')} km
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-yellow-600 font-medium flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      Aguardando retorno
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* KM Rodados */}
                              <div className="bg-white border rounded-lg p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <Gauge className="h-3 w-3" />
                                  <span className="font-medium">KM Percorridos</span>
                                </div>
                                <div>
                                  {kmDisplay ? (
                                    <p className="text-2xl font-bold text-primary">
                                      {kmDisplay.toLocaleString('pt-BR')} <span className="text-sm font-normal text-muted-foreground">km</span>
                                    </p>
                                  ) : isEmUso ? (
                                    <p className="text-muted-foreground">Em andamento...</p>
                                  ) : (
                                    <p className="text-muted-foreground">-</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Motorista e Finalidade */}
                            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{util.motorista || 'Motorista não informado'}</span>
                                </div>
                                {util.finalidade && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span>•</span>
                                    <span>{util.finalidade}</span>
                                  </div>
                                )}
                              </div>
                              {util.observacoes && (
                                <span className="text-muted-foreground text-xs max-w-xs truncate" title={util.observacoes}>
                                  {util.observacoes}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
            </div>
          </Tabs>
        </div>

      {/* Dialog para Novo/Editar Veículo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do veículo
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Placa *</Label>
              <Input 
                placeholder="ABC-1D23" 
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>Renavam</Label>
              <Input 
                placeholder="00000000000" 
                value={formData.renavam}
                onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
              />
            </div>
            <div>
              <Label>Chassi</Label>
              <Input 
                placeholder="9BW..." 
                value={formData.chassi}
                onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value, marca: '', modelo: '', tipo_manual: '', marca_manual: '', modelo_manual: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEICULO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.tipo === 'Outro' && (
              <div>
                <Label>Tipo (manual)</Label>
                <Input 
                  placeholder="Digite o tipo do veículo" 
                  value={formData.tipo_manual}
                  onChange={(e) => setFormData({ ...formData, tipo_manual: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Marca</Label>
              {formData.tipo === 'Outro' ? (
                <Input 
                  placeholder="Digite a marca" 
                  value={formData.marca_manual}
                  onChange={(e) => setFormData({ ...formData, marca_manual: e.target.value })}
                />
              ) : (
                <Select 
                  value={formData.marca} 
                  onValueChange={(value) => setFormData({ ...formData, marca: value, modelo: '', marca_manual: '', modelo_manual: '' })}
                  disabled={!formData.tipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.tipo ? "Selecione a marca" : "Selecione o tipo primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getMarcasPorTipo(formData.tipo).map((marca) => (
                      <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {formData.marca === 'Outro' && formData.tipo !== 'Outro' && (
              <div>
                <Label>Marca (manual)</Label>
                <Input 
                  placeholder="Digite a marca" 
                  value={formData.marca_manual}
                  onChange={(e) => setFormData({ ...formData, marca_manual: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Modelo</Label>
              {formData.tipo === 'Outro' || formData.marca === 'Outro' ? (
                <Input 
                  placeholder="Digite o modelo" 
                  value={formData.modelo_manual}
                  onChange={(e) => setFormData({ ...formData, modelo_manual: e.target.value })}
                />
              ) : (
                <Select 
                  value={formData.modelo} 
                  onValueChange={(value) => setFormData({ ...formData, modelo: value, modelo_manual: '' })}
                  disabled={!formData.marca}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.marca ? "Selecione o modelo" : "Selecione a marca primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelosPorMarca(formData.tipo, formData.marca).map((modelo) => (
                      <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                    ))}
                    {formData.marca && (
                      <SelectItem value="Outro">Outro</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            {formData.modelo === 'Outro' && formData.tipo !== 'Outro' && formData.marca !== 'Outro' && (
              <div>
                <Label>Modelo (manual)</Label>
                <Input 
                  placeholder="Digite o modelo" 
                  value={formData.modelo_manual}
                  onChange={(e) => setFormData({ ...formData, modelo_manual: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Ano/Modelo</Label>
              <Input 
                placeholder="2022/2023" 
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
              />
            </div>
            <div>
              <Label>Combustível</Label>
              <Select value={formData.combustivel} onValueChange={(value) => setFormData({ ...formData, combustivel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flex">Flex</SelectItem>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Etanol">Etanol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Elétrico">Elétrico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>KM Atual</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={formData.km_atual}
                onChange={(e) => setFormData({ ...formData, km_atual: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Gestor Responsável</Label>
              <Input 
                placeholder="Nome do gestor" 
                value={formData.gestor_responsavel}
                onChange={(e) => setFormData({ ...formData, gestor_responsavel: e.target.value })}
              />
            </div>
            <div>
              <Label>Motorista Padrão</Label>
              <Select 
                value={formData.motorista_padrao} 
                onValueChange={(value) => setFormData({ ...formData, motorista_padrao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristasComCnhValida.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum motorista com CNH válida
                    </div>
                  ) : motoristasComCnhValida.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>
                      {m.nome} {m.cnh_categoria ? `(${m.cnh_categoria})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label>Observações</Label>
              <Textarea 
                placeholder="Ex.: veículo com restrição de rota, pneus novos, etc." 
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
            <div className="col-span-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="checklist-obrigatorio"
                  checked={formData.checklist_obrigatorio || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, checklist_obrigatorio: checked === true })}
                />
                <Label htmlFor="checklist-obrigatorio" className="text-sm font-medium cursor-pointer">
                  Checklist é obrigatório para cada uso
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Quando ativado, o motorista deverá realizar o checklist antes de cada saída do veículo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveVeiculo} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Utilização */}
      <Dialog open={!!editandoUtilizacao} onOpenChange={(open) => { if (!open) { setEditandoUtilizacao(null); resetUtilizacaoForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Utilização - {editandoUtilizacao?.codigo || 'Sem código'}</DialogTitle>
            <DialogDescription>
              Altere os dados da utilização do veículo
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Saída *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !utilizacaoForm.data_saida && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {utilizacaoForm.data_saida ? format(parseISO(utilizacaoForm.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={utilizacaoForm.data_saida ? parseISO(utilizacaoForm.data_saida) : undefined}
                    onSelect={(date) => setUtilizacaoForm({ ...utilizacaoForm, data_saida: date ? format(date, 'yyyy-MM-dd') : '' })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Hora de Saída</Label>
              <Input 
                type="time" 
                value={utilizacaoForm.hora_saida}
                onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, hora_saida: e.target.value })}
              />
            </div>
            <div>
              <Label>Previsão de Retorno</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !utilizacaoForm.previsao_retorno && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {utilizacaoForm.previsao_retorno ? format(parseISO(utilizacaoForm.previsao_retorno), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={utilizacaoForm.previsao_retorno ? parseISO(utilizacaoForm.previsao_retorno) : undefined}
                    onSelect={(date) => setUtilizacaoForm({ ...utilizacaoForm, previsao_retorno: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>KM Saída</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={utilizacaoForm.km_inicio || ''}
                onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, km_inicio: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Local / Destino</Label>
              <Input 
                placeholder="Cidade, obra, rota, região..." 
                value={utilizacaoForm.local_utilizacao}
                onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, local_utilizacao: e.target.value })}
              />
            </div>
            <div>
              <Label>Motorista</Label>
              <Select 
                value={utilizacaoForm.motorista} 
                onValueChange={(value) => setUtilizacaoForm({ ...utilizacaoForm, motorista: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristasComCnhValida.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum motorista com CNH válida
                    </div>
                  ) : motoristasComCnhValida.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>
                      {m.nome} {m.cnh_categoria ? `(${m.cnh_categoria})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Finalidade</Label>
              <Input 
                placeholder="Entrega, visita técnica, coleta..." 
                value={utilizacaoForm.finalidade}
                onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, finalidade: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input 
                placeholder="Ex.: pedágio, rota alternativa..." 
                value={utilizacaoForm.observacoes}
                onChange={(e) => setUtilizacaoForm({ ...utilizacaoForm, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditandoUtilizacao(null); resetUtilizacaoForm(); }} disabled={savingUtilizacao}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoUtilizacao} disabled={savingUtilizacao} className="bg-blue-500 hover:bg-blue-600">
              {savingUtilizacao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Manutenção */}
      <Dialog open={!!editandoManutencao} onOpenChange={(open) => { if (!open) { setEditandoManutencao(null); resetManutencaoForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Manutenção</DialogTitle>
            <DialogDescription>
              Altere os dados da manutenção do veículo
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={manutencaoForm.tipo} onValueChange={(value) => setManutencaoForm({ ...manutencaoForm, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Preditiva">Preditiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={manutencaoForm.status} onValueChange={(value) => setManutencaoForm({ ...manutencaoForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !manutencaoForm.data && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manutencaoForm.data ? format(parseISO(manutencaoForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={manutencaoForm.data ? parseISO(manutencaoForm.data) : undefined}
                    onSelect={(date) => setManutencaoForm({ ...manutencaoForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>KM</Label>
              <Input 
                type="number" 
                placeholder="KM do veículo na data" 
                value={manutencaoForm.km || ''}
                onChange={(e) => setManutencaoForm({ ...manutencaoForm, km: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label>Serviço / Item</Label>
              <Input 
                placeholder="Ex.: troca de óleo, pastilhas de freio..." 
                value={manutencaoForm.servico}
                onChange={(e) => setManutencaoForm({ ...manutencaoForm, servico: e.target.value })}
              />
            </div>
            <div>
              <Label>Custo (R$)</Label>
              <Input 
                type="number" 
                step="0.01"
                placeholder="0,00" 
                value={manutencaoForm.custo || ''}
                onChange={(e) => setManutencaoForm({ ...manutencaoForm, custo: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Próxima por KM (opcional)</Label>
              <Input 
                type="number" 
                placeholder="Ex.: 10000" 
                value={manutencaoForm.proxima_km || ''}
                onChange={(e) => setManutencaoForm({ ...manutencaoForm, proxima_km: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Próxima por data (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !manutencaoForm.proxima_data && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manutencaoForm.proxima_data ? format(parseISO(manutencaoForm.proxima_data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={manutencaoForm.proxima_data ? parseISO(manutencaoForm.proxima_data) : undefined}
                    onSelect={(date) => setManutencaoForm({ ...manutencaoForm, proxima_data: date ? format(date, 'yyyy-MM-dd') : '' })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2">
              <Label>Observações / Diagnóstico</Label>
              <Textarea 
                placeholder="Ex.: desgaste irregular, vibração, ruído, risco, recomendação..." 
                value={manutencaoForm.observacoes}
                onChange={(e) => setManutencaoForm({ ...manutencaoForm, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditandoManutencao(null); resetManutencaoForm(); }} disabled={savingManutencao}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoManutencao} disabled={savingManutencao} className="bg-blue-500 hover:bg-blue-600">
              {savingManutencao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização do Checklist */}
      <Dialog open={!!checklistVisualizacao} onOpenChange={(open) => !open && setChecklistVisualizacao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Checklist do Veículo
            </DialogTitle>
            <DialogDescription>
              {veiculoSelecionado?.placa} - {veiculoSelecionado?.marca} {veiculoSelecionado?.modelo}
            </DialogDescription>
          </DialogHeader>
          
          {checklistVisualizacao && (
            <div id="checklist-print-content" className="space-y-4">
              {/* Cabeçalho do Checklist */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(checklistVisualizacao.data)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{checklistVisualizacao.tipo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={getStatusChecklistBadge(checklistVisualizacao.status_geral).className}>
                    {getStatusChecklistBadge(checklistVisualizacao.status_geral).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KM</p>
                  <p className="font-medium">{checklistVisualizacao.km?.toLocaleString('pt-BR') || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-medium">{checklistVisualizacao.local_inspecao || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{checklistVisualizacao.responsavel || '-'}</p>
                </div>
              </div>

              {/* Itens Verificados */}
              <div>
                <h4 className="font-semibold mb-2">Itens Verificados</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(itensChecklistLabels).map(([key, label]) => {
                    const marcado = checklistVisualizacao.itens_verificados?.includes(key);
                    return (
                      <div 
                        key={key}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded border",
                          marcado ? "bg-green-50 border-green-300 dark:bg-green-950/20" : "bg-gray-50 border-gray-200 dark:bg-gray-900/20"
                        )}
                      >
                        {marcado ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={cn("text-sm", marcado ? "text-green-800 dark:text-green-400" : "text-gray-500")}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              {checklistVisualizacao.observacoes && (
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {checklistVisualizacao.observacoes}
                  </p>
                </div>
              )}

              {/* Resumo */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Total de itens verificados: {checklistVisualizacao.itens_verificados?.length || 0} de 9
                </span>
                <span className="text-xs text-muted-foreground">
                  Registrado em: {checklistVisualizacao.created_at ? format(parseISO(checklistVisualizacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const printContent = document.getElementById('checklist-print-content');
                if (printContent) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Checklist - ${veiculoSelecionado?.placa || ''}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                            .header h1 { margin: 0; font-size: 18px; }
                            .header p { margin: 5px 0; color: #666; }
                            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                            .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
                            .info-item label { font-size: 10px; color: #666; display: block; }
                            .info-item span { font-weight: bold; }
                            .items-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
                            .item { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
                            .item.checked { background: #e8f5e9; border-color: #4caf50; }
                            .item.unchecked { background: #fafafa; color: #999; }
                            .obs { padding: 10px; background: #f5f5f5; border-radius: 4px; margin-bottom: 20px; }
                            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; }
                            @media print { body { padding: 0; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>CHECKLIST DE VEÍCULO</h1>
                            <p>${veiculoSelecionado?.placa || ''} - ${veiculoSelecionado?.marca || ''} ${veiculoSelecionado?.modelo || ''}</p>
                          </div>
                          <div class="info-grid">
                            <div class="info-item"><label>Data</label><span>${checklistVisualizacao ? formatDate(checklistVisualizacao.data) : ''}</span></div>
                            <div class="info-item"><label>Tipo</label><span>${checklistVisualizacao?.tipo || ''}</span></div>
                            <div class="info-item"><label>Status</label><span>${checklistVisualizacao?.status_geral || ''}</span></div>
                            <div class="info-item"><label>KM</label><span>${checklistVisualizacao?.km?.toLocaleString('pt-BR') || '-'}</span></div>
                            <div class="info-item"><label>Local</label><span>${checklistVisualizacao?.local_inspecao || '-'}</span></div>
                            <div class="info-item"><label>Responsável</label><span>${checklistVisualizacao?.responsavel || '-'}</span></div>
                          </div>
                          <h3>Itens Verificados</h3>
                          <div class="items-grid">
                            ${Object.entries(itensChecklistLabels).map(([key, label]) => {
                              const marcado = checklistVisualizacao?.itens_verificados?.includes(key);
                              return `<div class="item ${marcado ? 'checked' : 'unchecked'}">${marcado ? '✓' : '○'} ${label}</div>`;
                            }).join('')}
                          </div>
                          ${checklistVisualizacao?.observacoes ? `<h3>Observações</h3><div class="obs">${checklistVisualizacao.observacoes}</div>` : ''}
                          <div class="footer">
                            Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => setChecklistVisualizacao(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização da Ocorrência */}
      <Dialog open={!!ocorrenciaVisualizacao} onOpenChange={(open) => !open && setOcorrenciaVisualizacao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detalhes da Ocorrência
            </DialogTitle>
            <DialogDescription>
              {veiculoSelecionado?.placa} - {veiculoSelecionado?.marca} {veiculoSelecionado?.modelo}
            </DialogDescription>
          </DialogHeader>
          
          {ocorrenciaVisualizacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{ocorrenciaVisualizacao.tipo}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(ocorrenciaVisualizacao.data)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={getStatusOcorrenciaBadge(ocorrenciaVisualizacao.status).className}>
                    {getStatusOcorrenciaBadge(ocorrenciaVisualizacao.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-medium">{ocorrenciaVisualizacao.local_ocorrencia || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{ocorrenciaVisualizacao.responsavel || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="font-medium">{ocorrenciaVisualizacao.prazo ? formatDate(ocorrenciaVisualizacao.prazo) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Estimado</p>
                  <p className="font-medium">
                    {ocorrenciaVisualizacao.custo_estimado 
                      ? `R$ ${Number(ocorrenciaVisualizacao.custo_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {ocorrenciaVisualizacao.descricao || 'Nenhuma descrição informada.'}
                </p>
              </div>

              <div className="text-xs text-muted-foreground text-right">
                Registrado em: {ocorrenciaVisualizacao.created_at ? format(parseISO(ocorrenciaVisualizacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOcorrenciaVisualizacao(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição da Ocorrência */}
      <Dialog open={!!editandoOcorrencia} onOpenChange={(open) => !open && setEditandoOcorrencia(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Ocorrência</DialogTitle>
            <DialogDescription>
              {veiculoSelecionado?.placa} - {veiculoSelecionado?.marca} {veiculoSelecionado?.modelo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={ocorrenciaForm.tipo} onValueChange={(value) => setOcorrenciaForm({ ...ocorrenciaForm, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Avaria">Avaria</SelectItem>
                    <SelectItem value="Acidente">Acidente</SelectItem>
                    <SelectItem value="Multa">Multa</SelectItem>
                    <SelectItem value="Falha">Falha</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !ocorrenciaForm.data && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {ocorrenciaForm.data ? format(parseISO(ocorrenciaForm.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={ocorrenciaForm.data ? parseISO(ocorrenciaForm.data) : undefined}
                      onSelect={(date) => setOcorrenciaForm({ ...ocorrenciaForm, data: date ? format(date, 'yyyy-MM-dd') : '' })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={ocorrenciaForm.status} onValueChange={(value) => setOcorrenciaForm({ ...ocorrenciaForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Local</Label>
                <Input 
                  placeholder="Local da ocorrência" 
                  value={ocorrenciaForm.local}
                  onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, local: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input 
                  placeholder="Descrição da ocorrência" 
                  value={ocorrenciaForm.descricao}
                  onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, descricao: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Custo Estimado (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="0,00" 
                  value={ocorrenciaForm.custo_estimado || ''}
                  onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, custo_estimado: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input 
                  placeholder="Quem acompanha" 
                  value={ocorrenciaForm.responsavel}
                  onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, responsavel: e.target.value })}
                />
              </div>
              <div>
                <Label>Prazo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !ocorrenciaForm.prazo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {ocorrenciaForm.prazo ? format(parseISO(ocorrenciaForm.prazo), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={ocorrenciaForm.prazo ? parseISO(ocorrenciaForm.prazo) : undefined}
                      onSelect={(date) => setOcorrenciaForm({ ...ocorrenciaForm, prazo: date ? format(date, 'yyyy-MM-dd') : '' })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditandoOcorrencia(null); resetOcorrenciaForm(); }} disabled={savingOcorrencia}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoOcorrencia} disabled={savingOcorrencia} className="bg-blue-500 hover:bg-blue-600">
              {savingOcorrencia ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Novo/Editar Motorista */}
      <Dialog open={motoristaDialogOpen} onOpenChange={(open) => {
        if (!open) resetMotoristaForm();
        setMotoristaDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do motorista
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Dados Pessoais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input 
                  placeholder="Nome completo do motorista" 
                  value={motoristaForm.nome}
                  onChange={(e) => setMotoristaForm({ ...motoristaForm, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input 
                  placeholder="000.000.000-00" 
                  value={motoristaForm.cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  maxLength={14}
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input 
                  placeholder="Número do RG" 
                  value={motoristaForm.rg}
                  onChange={(e) => setMotoristaForm({ ...motoristaForm, rg: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input 
                  type="date"
                  value={motoristaForm.data_nascimento}
                  onChange={(e) => setMotoristaForm({ ...motoristaForm, data_nascimento: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  value={motoristaForm.telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  maxLength={15}
                />
              </div>
              <div className="col-span-2">
                <Label>E-mail</Label>
                <Input 
                  type="email"
                  placeholder="email@exemplo.com" 
                  value={motoristaForm.email}
                  onChange={(e) => setMotoristaForm({ ...motoristaForm, email: e.target.value })}
                />
              </div>
            </div>

            {/* Endereço com ViaCEP */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input 
                      placeholder="00000-000" 
                      value={motoristaForm.cep}
                      onChange={(e) => handleCepMotoristaChange(e.target.value)}
                      maxLength={9}
                    />
                    {buscandoCepMotorista && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Logradouro</Label>
                  <Input 
                    placeholder="Rua, Avenida..." 
                    value={motoristaForm.logradouro}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, logradouro: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input 
                    placeholder="Nº" 
                    value={motoristaForm.numero}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, numero: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input 
                    placeholder="Apto, Bloco..." 
                    value={motoristaForm.complemento}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, complemento: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input 
                    placeholder="Bairro" 
                    value={motoristaForm.bairro}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, bairro: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input 
                    placeholder="Cidade" 
                    value={motoristaForm.cidade}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input 
                    placeholder="UF" 
                    value={motoristaForm.estado}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, estado: e.target.value })}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {/* CNH */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Carteira Nacional de Habilitação (CNH)
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Número da CNH</Label>
                  <Input 
                    placeholder="00000000000" 
                    value={motoristaForm.cnh_numero}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, cnh_numero: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={motoristaForm.cnh_categoria} onValueChange={(value) => setMotoristaForm({ ...motoristaForm, cnh_categoria: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Motos</SelectItem>
                      <SelectItem value="B">B - Carros</SelectItem>
                      <SelectItem value="AB">AB - Motos e Carros</SelectItem>
                      <SelectItem value="C">C - Caminhões</SelectItem>
                      <SelectItem value="D">D - Ônibus</SelectItem>
                      <SelectItem value="E">E - Carretas</SelectItem>
                      <SelectItem value="AC">AC - Motos e Caminhões</SelectItem>
                      <SelectItem value="AD">AD - Motos e Ônibus</SelectItem>
                      <SelectItem value="AE">AE - Motos e Carretas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Validade</Label>
                  <Input 
                    type="date"
                    value={motoristaForm.cnh_validade}
                    onChange={(e) => setMotoristaForm({ ...motoristaForm, cnh_validade: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Anexos */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Documentos e Anexos
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Foto do Motorista</Label>
                  <Input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => setMotoristaAnexos({ ...motoristaAnexos, foto: e.target.files?.[0] || null })}
                    className="cursor-pointer"
                  />
                  {editingMotorista?.foto_url && !motoristaAnexos.foto && (
                    <p className="text-xs text-muted-foreground mt-1">Foto atual anexada</p>
                  )}
                </div>
                <div>
                  <Label>Anexo CPF</Label>
                  <Input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setMotoristaAnexos({ ...motoristaAnexos, cpf_anexo: e.target.files?.[0] || null })}
                    className="cursor-pointer"
                  />
                  {editingMotorista?.cpf_anexo_url && !motoristaAnexos.cpf_anexo && (
                    <p className="text-xs text-muted-foreground mt-1">CPF anexado</p>
                  )}
                </div>
                <div>
                  <Label>Anexo RG</Label>
                  <Input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setMotoristaAnexos({ ...motoristaAnexos, rg_anexo: e.target.files?.[0] || null })}
                    className="cursor-pointer"
                  />
                  {editingMotorista?.rg_anexo_url && !motoristaAnexos.rg_anexo && (
                    <p className="text-xs text-muted-foreground mt-1">RG anexado</p>
                  )}
                </div>
                <div>
                  <Label>Anexo CNH</Label>
                  <Input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setMotoristaAnexos({ ...motoristaAnexos, cnh_anexo: e.target.files?.[0] || null })}
                    className="cursor-pointer"
                  />
                  {editingMotorista?.cnh_anexo_url && !motoristaAnexos.cnh_anexo && (
                    <p className="text-xs text-muted-foreground mt-1">CNH anexada</p>
                  )}
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea 
                placeholder="Observações adicionais sobre o motorista..." 
                value={motoristaForm.observacoes}
                onChange={(e) => setMotoristaForm({ ...motoristaForm, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMotoristaDialogOpen(false)} disabled={savingMotorista}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMotorista} disabled={savingMotorista}>
              {savingMotorista ? 'Salvando...' : editingMotorista ? 'Salvar Alterações' : 'Cadastrar Motorista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização do Motorista */}
      <Dialog open={!!motoristaVisualizacao} onOpenChange={(open) => !open && setMotoristaVisualizacao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Motorista</DialogTitle>
          </DialogHeader>
          
          {motoristaVisualizacao && (
            <div className="space-y-4">
              {/* Header com foto */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {motoristaVisualizacao.foto_url ? (
                    <img src={motoristaVisualizacao.foto_url} alt={motoristaVisualizacao.nome} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{motoristaVisualizacao.nome}</h3>
                  <p className="text-sm text-muted-foreground">{motoristaVisualizacao.cpf || 'CPF não informado'}</p>
                </div>
              </div>

              {/* Dados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">RG</p>
                  <p className="font-medium">{motoristaVisualizacao.rg || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">{motoristaVisualizacao.data_nascimento ? format(parseISO(motoristaVisualizacao.data_nascimento), 'dd/MM/yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{motoristaVisualizacao.telefone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium">{motoristaVisualizacao.email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="font-medium">
                    {motoristaVisualizacao.logradouro ? (
                      <>
                        {motoristaVisualizacao.logradouro}
                        {motoristaVisualizacao.numero && `, ${motoristaVisualizacao.numero}`}
                        {motoristaVisualizacao.complemento && ` - ${motoristaVisualizacao.complemento}`}
                        {motoristaVisualizacao.bairro && `, ${motoristaVisualizacao.bairro}`}
                        {motoristaVisualizacao.cidade && ` - ${motoristaVisualizacao.cidade}`}
                        {motoristaVisualizacao.estado && `/${motoristaVisualizacao.estado}`}
                        {motoristaVisualizacao.cep && ` - CEP: ${motoristaVisualizacao.cep}`}
                      </>
                    ) : '-'}
                  </p>
                </div>
              </div>

              {/* CNH */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">CNH</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="font-medium">{motoristaVisualizacao.cnh_numero || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <p className="font-medium">{motoristaVisualizacao.cnh_categoria || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Validade</p>
                    <p className="font-medium">{motoristaVisualizacao.cnh_validade ? format(parseISO(motoristaVisualizacao.cnh_validade), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Anexos */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Documentos Anexados</h4>
                <div className="flex flex-wrap gap-2">
                  {motoristaVisualizacao.cpf_anexo_url && (
                    <a href={motoristaVisualizacao.cpf_anexo_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        <FileText className="h-3 w-3 mr-1" />
                        CPF
                      </Badge>
                    </a>
                  )}
                  {motoristaVisualizacao.rg_anexo_url && (
                    <a href={motoristaVisualizacao.rg_anexo_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        <FileText className="h-3 w-3 mr-1" />
                        RG
                      </Badge>
                    </a>
                  )}
                  {motoristaVisualizacao.cnh_anexo_url && (
                    <a href={motoristaVisualizacao.cnh_anexo_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        <FileText className="h-3 w-3 mr-1" />
                        CNH
                      </Badge>
                    </a>
                  )}
                  {!motoristaVisualizacao.cpf_anexo_url && !motoristaVisualizacao.rg_anexo_url && !motoristaVisualizacao.cnh_anexo_url && (
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                  )}
                </div>
              </div>

              {/* Observações */}
              {motoristaVisualizacao.observacoes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground">{motoristaVisualizacao.observacoes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMotoristaVisualizacao(null)}>
              Fechar
            </Button>
            <Button onClick={() => {
              handleOpenMotoristaDialog(motoristaVisualizacao);
              setMotoristaVisualizacao(null);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
