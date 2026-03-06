import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { useAccessLog } from '@/hooks/useAccessLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Mail, 
  FileText, 
  Users, 
  Building2,
  Globe,
  Lock,
  Database,
  Zap,
  Plus,
  Edit,
  Trash2,
  Search,
  Layers,
  Key,
  Eye,
  Pencil,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Tags,
  Activity,
  Monitor,
  Smartphone,
  Tablet,
  LogIn,
  LogOut,
  Filter,
  Calendar,
  RefreshCw,
  User,
  Clock,
  Package,
  UsersRound,
  AlertTriangle,
  Loader2,
  ScanFace,
  Keyboard,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WhiteLabelConfig } from './WhiteLabelConfig';
import { ProdutosServicos } from './toriq-corp/configuracoes/ProdutosServicos';
import { SSTUsuarios } from './SSTUsuarios';
import { SSTInformacoesEmpresa } from './SSTInformacoesEmpresa';
import { ReconhecimentoFacialConfig } from './ReconhecimentoFacialConfig';
import { CertificadoA1Config } from './CertificadoA1Config';

interface Setor {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoriaCliente {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface OrigemContato {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ModuloPagina {
  id: string;
  nome: string;
  descricao?: string;
}

interface Modulo {
  id: string;
  nome: string;
  icone?: string;
  paginas: ModuloPagina[];
}

interface PermissaoSetor {
  setor_id: string;
  modulo_id: string;
  pagina_id: string;
  visualizar: boolean;
  editar: boolean;
  criar: boolean;
}

interface AccessLog {
  id: string;
  empresa_id: string;
  user_id: string | null;
  user_email: string | null;
  user_nome: string | null;
  acao: string;
  modulo: string | null;
  pagina: string | null;
  descricao: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

type GovbrEnvironment = 'staging' | 'production';
type EsocialAmbiente = '1' | '2';
type EsocialTipoInscricao = '1' | '2' | '3' | '4' | '5' | '6';

interface EmpresaIntegracaoPublicView {
  empresaId: string;
  govbrClientId: string | null;
  govbrRedirectUri: string | null;
  govbrEnvironment: GovbrEnvironment;
  hasGovbrClientSecret: boolean;
  govbrClientSecretMasked: string | null;
  hasEsocialCert: boolean;
  hasEsocialCertPassword: boolean;
  esocialTipoInscricao: EsocialTipoInscricao;
  esocialNrInscricao: string | null;
  esocialAmbiente: EsocialAmbiente;
  certificadoAlias: string | null;
  certificadoValidoAte: string | null;
  updatedAt: string | null;
}

interface IntegracaoEsocialFormState {
  govbrClientId: string;
  govbrClientSecret: string;
  govbrRedirectUri: string;
  govbrEnvironment: GovbrEnvironment;
  esocialCertBase64: string;
  esocialCertPassword: string;
  esocialTipoInscricao: EsocialTipoInscricao;
  esocialNrInscricao: string;
  esocialAmbiente: EsocialAmbiente;
  certificadoAlias: string;
  certificadoValidoAte: string;
  clearGovbrClientSecret: boolean;
  clearEsocialCert: boolean;
  clearEsocialCertPassword: boolean;
}

const DEFAULT_INTEGRACAO_ESOCIAL_FORM: IntegracaoEsocialFormState = {
  govbrClientId: '',
  govbrClientSecret: '',
  govbrRedirectUri: '',
  govbrEnvironment: 'staging',
  esocialCertBase64: '',
  esocialCertPassword: '',
  esocialTipoInscricao: '1',
  esocialNrInscricao: '',
  esocialAmbiente: '2',
  certificadoAlias: '',
  certificadoValidoAte: '',
  clearGovbrClientSecret: false,
  clearEsocialCert: false,
  clearEsocialCertPassword: false,
};

// Estrutura BASE de módulos do sistema - será combinada com setores dinâmicos
const MODULOS_SISTEMA_BASE: Modulo[] = [
  {
    id: 'perfil_empresa',
    nome: 'Perfil da Empresa',
    paginas: [
      { id: 'meu_perfil', nome: 'Meu Perfil' },
      { id: 'usuarios', nome: 'Usuários' },
      { id: 'meus_clientes', nome: 'Meus Clientes' },
      { id: 'informacoes_empresa', nome: 'Informações Empresa' },
      { id: 'configuracoes', nome: 'Configurações' },
      { id: 'cadastros', nome: 'Cadastros' },
    ]
  },
  {
    id: 'toriq_corp',
    nome: 'Toriq Corp (Gestão Empresarial)',
    paginas: [
      { id: 'toriq_corp_tarefas', nome: 'Tarefas' },
      { id: 'toriq_corp_contratos', nome: 'Contratos' },
      { id: 'toriq_corp_financeiro', nome: 'Financeiro' },
      { id: 'toriq_corp_controle_frota', nome: 'Controle de Frota' },
      { id: 'toriq_corp_controle_equipamentos', nome: 'Controle de Equipamentos' },
      { id: 'toriq_corp_configuracoes', nome: 'Configurações do Módulo' },
      // Setores dinâmicos serão adicionados aqui
    ]
  },
];

// Função para gerar módulos com setores dinâmicos
const gerarModulosComSetores = (setoresDinamicos: Setor[]): Modulo[] => {
  return MODULOS_SISTEMA_BASE.map(modulo => {
    if (modulo.id === 'toriq_corp') {
      // Adicionar setores dinâmicos como páginas no Toriq Corp
      const paginasSetores: ModuloPagina[] = setoresDinamicos.map(setor => ({
        id: `setor_${setor.id}`,
        nome: `Setor: ${setor.nome}`,
        descricao: `Acesso ao setor ${setor.nome} e seus funis`
      }));
      
      return {
        ...modulo,
        paginas: [...modulo.paginas, ...paginasSetores]
      };
    }
    return modulo;
  });
};

type ConfigSection = 'geral' | 'notificacoes' | 'seguranca' | 'aparencia' | 'integracao' | 'atalhos' | 'documentos' | 'setores' | 'acessos' | 'categorias' | 'origens-contato' | 'produtos-servicos' | 'usuarios';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  section: ConfigSection;
  activeSection: ConfigSection;
  onClick: (section: ConfigSection) => void;
}

const MenuItem = ({ icon, label, section, activeSection, onClick }: MenuItemProps) => (
  <button
    onClick={() => onClick(section)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all ${
      activeSection === section
        ? 'bg-primary text-white'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

// Componente de Configuração de Atalhos
function AtalhosConfig() {
  const { toast } = useToast();
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem('system-shortcuts');
      return saved ? JSON.parse(saved) : {
        quickSearch: { key: 's', alt: true, ctrl: false, label: 'Busca Rápida' },
        toggleSidebar: { key: 'b', alt: false, ctrl: true, label: 'Abrir/Fechar Menu' },
      };
    } catch {
      return {
        quickSearch: { key: 's', alt: true, ctrl: false, label: 'Busca Rápida' },
        toggleSidebar: { key: 'b', alt: false, ctrl: true, label: 'Abrir/Fechar Menu' },
      };
    }
  });
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [tempAlt, setTempAlt] = useState(false);
  const [tempCtrl, setTempCtrl] = useState(false);

  const handleEditShortcut = (shortcutId: string) => {
    const shortcut = shortcuts[shortcutId];
    setTempKey(shortcut.key);
    setTempAlt(shortcut.alt);
    setTempCtrl(shortcut.ctrl);
    setEditingShortcut(shortcutId);
  };

  const handleSaveShortcut = (shortcutId: string) => {
    if (!tempKey) {
      toast({
        title: "Erro",
        description: "A tecla não pode estar vazia",
        variant: "destructive"
      });
      return;
    }

    const newShortcuts = {
      ...shortcuts,
      [shortcutId]: {
        ...shortcuts[shortcutId],
        key: tempKey.toLowerCase(),
        alt: tempAlt,
        ctrl: tempCtrl,
      }
    };

    setShortcuts(newShortcuts);
    localStorage.setItem('system-shortcuts', JSON.stringify(newShortcuts));
    setEditingShortcut(null);

    toast({
      title: "Atalho salvo",
      description: "O atalho foi atualizado com sucesso. Recarregue a página para aplicar.",
    });
  };

  const handleCancelEdit = () => {
    setEditingShortcut(null);
    setTempKey('');
    setTempAlt(false);
    setTempCtrl(false);
  };

  const handleResetDefaults = () => {
    const defaults = {
      quickSearch: { key: 's', alt: true, ctrl: false, label: 'Busca Rápida' },
      toggleSidebar: { key: 'b', alt: false, ctrl: true, label: 'Abrir/Fechar Menu' },
    };
    setShortcuts(defaults);
    localStorage.setItem('system-shortcuts', JSON.stringify(defaults));
    toast({
      title: "Atalhos restaurados",
      description: "Os atalhos foram restaurados para os valores padrão.",
    });
  };

  const formatShortcut = (shortcut: { key: string; alt: boolean; ctrl: boolean }) => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  const shortcutsList = [
    { id: 'quickSearch', icon: <Search className="h-5 w-5" />, description: 'Abrir modal de busca para navegar entre telas' },
    { id: 'toggleSidebar', icon: <Layers className="h-5 w-5" />, description: 'Abrir ou fechar o menu lateral (sidebar)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Atalhos de Teclado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure os atalhos de teclado para acessar rapidamente as funcionalidades do sistema.
        </p>
      </div>

      <div className="space-y-3">
        {shortcutsList.map((item) => {
          const shortcut = shortcuts[item.id];
          const isEditing = editingShortcut === item.id;

          return (
            <div 
              key={item.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <Label className="text-base font-medium">{shortcut?.label || item.id}</Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={tempCtrl}
                        onChange={(e) => setTempCtrl(e.target.checked)}
                        className="rounded border-border"
                      />
                      Ctrl
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={tempAlt}
                        onChange={(e) => setTempAlt(e.target.checked)}
                        className="rounded border-border"
                      />
                      Alt
                    </label>
                    <span className="text-muted-foreground">+</span>
                    <Input
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value.slice(-1))}
                      className="w-16 text-center uppercase font-mono"
                      maxLength={1}
                      placeholder="?"
                    />
                  </div>
                  <Button size="sm" onClick={() => handleSaveShortcut(item.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {shortcut?.ctrl && (
                      <kbd className="inline-flex h-8 items-center rounded border border-border bg-muted px-2.5 font-mono text-sm">
                        Ctrl
                      </kbd>
                    )}
                    {shortcut?.alt && (
                      <>
                        {shortcut?.ctrl && <span className="text-muted-foreground mx-1">+</span>}
                        <kbd className="inline-flex h-8 items-center rounded border border-border bg-muted px-2.5 font-mono text-sm">
                          Alt
                        </kbd>
                      </>
                    )}
                    <span className="text-muted-foreground mx-1">+</span>
                    <kbd className="inline-flex h-8 items-center rounded border border-border bg-muted px-2.5 font-mono text-sm uppercase">
                      {shortcut?.key || '?'}
                    </kbd>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditShortcut(item.id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Restaurar Padrões</h4>
          <p className="text-sm text-muted-foreground">Restaurar todos os atalhos para os valores padrão</p>
        </div>
        <Button variant="outline" onClick={handleResetDefaults}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar
        </Button>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          Dica
        </h4>
        <p className="text-sm text-muted-foreground">
          Após alterar um atalho, pode ser necessário recarregar a página para que as mudanças tenham efeito.
          Use os atalhos para navegar rapidamente entre as telas do sistema.
        </p>
      </div>
    </div>
  );
}

interface SSTConfiguracoesProps {
  initialSection?: string;
}

// Função para mapear seção inicial para ConfigSection válida
const mapToConfigSection = (section: string | undefined): ConfigSection => {
  if (section) {
    const validSections: ConfigSection[] = ['geral', 'notificacoes', 'seguranca', 'aparencia', 'integracao', 'atalhos', 'documentos', 'setores', 'acessos', 'categorias', 'origens-contato', 'produtos-servicos', 'usuarios'];
    if (validSections.includes(section as ConfigSection)) {
      return section as ConfigSection;
    }
    // Mapear nomes alternativos
    const sectionMap: Record<string, ConfigSection> = {
      'origens': 'origens-contato',
      'produtos': 'produtos-servicos',
    };
    if (sectionMap[section]) {
      return sectionMap[section];
    }
  }
  return 'geral';
};

export function SSTConfiguracoes({ initialSection }: SSTConfiguracoesProps) {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { logCreate, logUpdate, logDelete } = useAccessLog();
  const [activeSection, setActiveSection] = useState<ConfigSection>(() => mapToConfigSection(initialSection));
  
  // Atualizar seção quando initialSection mudar (navegação via QuickSearch)
  useEffect(() => {
    if (initialSection) {
      setActiveSection(mapToConfigSection(initialSection));
    }
  }, [initialSection]);
  
  // Empresa ID efetivo
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const esocialBackendBaseUrl = (import.meta.env.VITE_ESOCIAL_BACKEND_URL || '').replace(/\/+$/, '');
  const esocialConfigApiKey = import.meta.env.VITE_ESOCIAL_CONFIG_API_KEY || '';
  
  // Estados para configurações gerais
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [idioma, setIdioma] = useState('pt-BR');
  const [fusoHorario, setFusoHorario] = useState('America/Sao_Paulo');
  
  // Estados para notificações
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSistema, setNotifSistema] = useState(true);
  const [notifTreinamentos, setNotifTreinamentos] = useState(true);
  const [notifVencimentos, setNotifVencimentos] = useState(true);
  const [notifDocumentos, setNotifDocumentos] = useState(true);
  
  // Estados para segurança
  const [autenticacao2FA, setAutenticacao2FA] = useState(false);
  const [sessaoTimeout, setSessaoTimeout] = useState('30');
  const [logAcessos, setLogAcessos] = useState(true);
  
  // Estados para aparência
  const [tema, setTema] = useState('system');
  const [corPrimaria, setCorPrimaria] = useState('#8b5cf6');
  
  // Estados para documentos
  const [modeloCertificado, setModeloCertificado] = useState('padrao');
  const [assinaturaDigital, setAssinaturaDigital] = useState(false);
  const [rodapePadrao, setRodapePadrao] = useState('');
  
  // Estados para formato de data e moeda
  const [formatoData, setFormatoData] = useState('dd/MM/yyyy');
  const [formatoMoeda, setFormatoMoeda] = useState('BRL');
  
  // Estados de loading e saving para configurações
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Estados para integração eSocial + gov.br
  const [integracaoEsocialForm, setIntegracaoEsocialForm] = useState<IntegracaoEsocialFormState>(
    DEFAULT_INTEGRACAO_ESOCIAL_FORM
  );
  const [integracaoEsocialPublicView, setIntegracaoEsocialPublicView] = useState<EmpresaIntegracaoPublicView | null>(null);
  const [loadingIntegracaoEsocial, setLoadingIntegracaoEsocial] = useState(false);
  const [savingIntegracaoEsocial, setSavingIntegracaoEsocial] = useState(false);
  const [certificadoArquivoSelecionado, setCertificadoArquivoSelecionado] = useState<string>('');

  // Estados para Setores
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(false);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [setorForm, setSetorForm] = useState({ nome: '', descricao: '', ativo: true });
  const [savingSetor, setSavingSetor] = useState(false);
  const [deleteSetorDialogOpen, setDeleteSetorDialogOpen] = useState(false);
  const [setorToDelete, setSetorToDelete] = useState<Setor | null>(null);
  const [searchSetor, setSearchSetor] = useState('');
  const [deleteSetorStep, setDeleteSetorStep] = useState(1);
  const [deleteSetorConfirmText, setDeleteSetorConfirmText] = useState('');
  const [deletingSetor, setDeletingSetor] = useState(false);

  // Estados para Acessos
  const [setoresAcessos, setSetoresAcessos] = useState<Setor[]>([]);
  const [selectedSetorAcesso, setSelectedSetorAcesso] = useState<string>('');
  const [permissoes, setPermissoes] = useState<PermissaoSetor[]>([]);
  const [loadingPermissoes, setLoadingPermissoes] = useState(false);
  const [savingPermissoes, setSavingPermissoes] = useState(false);
  const [expandedModulos, setExpandedModulos] = useState<string[]>([]);
  const [permissoesSalvas, setPermissoesSalvas] = useState<{setor: Setor; grupo_acesso: string; permissoes: PermissaoSetor[]}[]>([]);
  const [loadingPermissoesSalvas, setLoadingPermissoesSalvas] = useState(false);
  const [editandoSetor, setEditandoSetor] = useState<string | null>(null);
  const [grupoAcessoSelecionado, setGrupoAcessoSelecionado] = useState<'administrador' | 'gestor' | 'colaborador' | null>(null);
  const [novaPermissaoDialogOpen, setNovaPermissaoDialogOpen] = useState(false);
  
  // Lista de módulos dinâmica (inclui setores da empresa)
  const [modulosSistema, setModulosSistema] = useState<Modulo[]>(MODULOS_SISTEMA_BASE);

  // Estados para Categorias de Clientes
  const [categorias, setCategorias] = useState<CategoriaCliente[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCliente | null>(null);
  const [categoriaForm, setCategoriaForm] = useState({ nome: '', descricao: '', cor: '#6366f1', ativo: true });
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [deleteCategoriaDialogOpen, setDeleteCategoriaDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaCliente | null>(null);
  const [searchCategoria, setSearchCategoria] = useState('');

  // Estados para Origens de Contato
  const [origensContato, setOrigensContato] = useState<OrigemContato[]>([]);
  const [loadingOrigensContato, setLoadingOrigensContato] = useState(false);
  const [origemContatoDialogOpen, setOrigemContatoDialogOpen] = useState(false);
  const [editingOrigemContato, setEditingOrigemContato] = useState<OrigemContato | null>(null);
  const [origemContatoForm, setOrigemContatoForm] = useState({ nome: '', descricao: '', cor: '#6366f1', ativo: true });
  const [savingOrigemContato, setSavingOrigemContato] = useState(false);
  const [deleteOrigemContatoDialogOpen, setDeleteOrigemContatoDialogOpen] = useState(false);
  const [origemContatoToDelete, setOrigemContatoToDelete] = useState<OrigemContato | null>(null);
  const [searchOrigemContato, setSearchOrigemContato] = useState('');

  // Estado para Reconhecimento Facial
  const [showReconhecimentoFacial, setShowReconhecimentoFacial] = useState(false);

  // Estados para Logs de Acesso
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFilter, setLogsFilter] = useState({
    acao: '',
    usuario: '',
    dataInicio: '',
    dataFim: '',
    modulo: ''
  });
  const [logsStats, setLogsStats] = useState({
    totalLogins: 0,
    totalAcoes: 0,
    usuariosAtivos: 0,
    dispositivosUnicos: 0
  });

  // Carregar configurações da empresa do Supabase
  const loadConfiguracoes = async () => {
    if (!empresaId) return;
    setLoadingConfig(true);
    try {
      const { data, error } = await (supabase as any)
        .from('empresa_configuracoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      if (data) {
        // Configurações Gerais
        setNomeFantasia(data.nome_fantasia || '');
        setIdioma(data.idioma || 'pt-BR');
        setFusoHorario(data.fuso_horario || 'America/Sao_Paulo');
        setFormatoData(data.formato_data || 'dd/MM/yyyy');
        setFormatoMoeda(data.formato_moeda || 'BRL');
        
        // Notificações
        setNotifEmail(data.notif_email ?? true);
        setNotifSistema(data.notif_sistema ?? true);
        setNotifTreinamentos(data.notif_treinamentos ?? true);
        setNotifVencimentos(data.notif_vencimentos ?? true);
        setNotifDocumentos(data.notif_documentos ?? true);
        
        // Segurança
        setAutenticacao2FA(data.autenticacao_2fa ?? false);
        setSessaoTimeout(String(data.sessao_timeout || 30));
        setLogAcessos(data.log_acessos ?? true);
        
        // Aparência
        setTema(data.tema || 'system');
        setCorPrimaria(data.cor_primaria || '#8b5cf6');
        
        // Documentos
        setModeloCertificado(data.modelo_certificado || 'padrao');
        setAssinaturaDigital(data.assinatura_digital ?? false);
        setRodapePadrao(data.rodape_padrao || '');
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Salvar configurações da empresa no Supabase
  const saveConfiguracoes = async () => {
    if (!empresaId) return;
    setSavingConfig(true);
    try {
      const configData = {
        empresa_id: empresaId,
        nome_fantasia: nomeFantasia || null,
        idioma,
        fuso_horario: fusoHorario,
        formato_data: formatoData,
        formato_moeda: formatoMoeda,
        notif_email: notifEmail,
        notif_sistema: notifSistema,
        notif_treinamentos: notifTreinamentos,
        notif_vencimentos: notifVencimentos,
        notif_documentos: notifDocumentos,
        autenticacao_2fa: autenticacao2FA,
        sessao_timeout: parseInt(sessaoTimeout) || 30,
        log_acessos: logAcessos,
        tema,
        cor_primaria: corPrimaria,
        modelo_certificado: modeloCertificado,
        assinatura_digital: assinaturaDigital,
        rodape_padrao: rodapePadrao || null,
        updated_at: new Date().toISOString()
      };

      // Tentar atualizar primeiro, se não existir, inserir
      const { data: existing } = await (supabase as any)
        .from('empresa_configuracoes')
        .select('id')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('empresa_configuracoes')
          .update(configData)
          .eq('empresa_id', empresaId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('empresa_configuracoes')
          .insert(configData);
        if (error) throw error;
      }

      // Registrar log de atualização
      logUpdate('Configurações', 'Configurações Gerais', 'Configurações da empresa atualizadas');

      toast({ title: 'Configurações salvas', description: 'Suas configurações foram atualizadas com sucesso.' });
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const getIntegracaoConfigEndpoint = (): string => {
    if (!esocialBackendBaseUrl) return '/api/esocial/config';
    return `${esocialBackendBaseUrl}/api/esocial/config`;
  };

  const isPlaceholderEsocialBackendUrl = (): boolean => {
    return /seu-backend-esocial/i.test(esocialBackendBaseUrl);
  };

  const buildIntegracaoHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Empresa-ID': empresaId || '',
    };

    if (esocialConfigApiKey) {
      headers['X-API-Key'] = esocialConfigApiKey;
    }

    return headers;
  };

  const parseBackendErrorMessage = async (response: Response): Promise<string> => {
    let raw = '';

    try {
      raw = await response.text();
    } catch {
      return `Erro HTTP ${response.status}`;
    }

    if (!raw) return `Erro HTTP ${response.status}`;

    try {
      const payload = JSON.parse(raw);
      return payload?.error || payload?.message || `Erro HTTP ${response.status}`;
    } catch {
      if (raw.trim().startsWith('<')) {
        // Erro silencioso - provavelmente problema de CORS ou proxy
        throw new Error('Failed to fetch');
      }
      return `Erro HTTP ${response.status}`;
    }
  };

  const parseSuccessJson = async (response: Response): Promise<any> => {
    const raw = await response.text();

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      if (raw.trim().startsWith('<')) {
        // Erro silencioso - provavelmente problema de CORS ou proxy
        throw new Error('Failed to fetch');
      }
      throw new Error('Resposta inválida do backend de integração.');
    }
  };

  const loadIntegracaoEsocial = async () => {
    if (!empresaId) return;

    setLoadingIntegracaoEsocial(true);
    try {
      if (isPlaceholderEsocialBackendUrl()) {
        throw new Error('VITE_ESOCIAL_BACKEND_URL está com valor de exemplo. Configure a URL real do backend eSocial na VPS.');
      }

      const response = await fetch(getIntegracaoConfigEndpoint(), {
        method: 'GET',
        headers: buildIntegracaoHeaders(),
      });

      if (response.status === 404) {
        setIntegracaoEsocialPublicView(null);
        setIntegracaoEsocialForm(DEFAULT_INTEGRACAO_ESOCIAL_FORM);
        setCertificadoArquivoSelecionado('');
        return;
      }

      if (!response.ok) {
        throw new Error(await parseBackendErrorMessage(response));
      }

      const payload = await parseSuccessJson(response);
      const config = payload?.config as EmpresaIntegracaoPublicView;

      if (!config) {
        setIntegracaoEsocialPublicView(null);
        setIntegracaoEsocialForm(DEFAULT_INTEGRACAO_ESOCIAL_FORM);
        setCertificadoArquivoSelecionado('');
        return;
      }

      setIntegracaoEsocialPublicView(config);
      setIntegracaoEsocialForm({
        govbrClientId: config.govbrClientId || '',
        govbrClientSecret: '',
        govbrRedirectUri: config.govbrRedirectUri || '',
        govbrEnvironment: config.govbrEnvironment || 'staging',
        esocialCertBase64: '',
        esocialCertPassword: '',
        esocialTipoInscricao: config.esocialTipoInscricao || '1',
        esocialNrInscricao: config.esocialNrInscricao || '',
        esocialAmbiente: config.esocialAmbiente || '2',
        certificadoAlias: config.certificadoAlias || '',
        certificadoValidoAte: config.certificadoValidoAte || '',
        clearGovbrClientSecret: false,
        clearEsocialCert: false,
        clearEsocialCertPassword: false,
      });
      setCertificadoArquivoSelecionado('');
    } catch (e: any) {
      console.error('Erro ao carregar integração eSocial:', e);
      // Só mostrar toast se não for erro de CORS/conexão (evita spam de erros)
      const mensagem = e?.message || '';
      const isErroConexao = mensagem.includes('Failed to fetch') || 
                            mensagem.includes('CORS') || 
                            mensagem.includes('NetworkError');
      if (!isErroConexao) {
        toast({
          title: 'Erro ao carregar integração',
          description: mensagem || 'Falha ao carregar configuração eSocial/gov.br',
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingIntegracaoEsocial(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Falha ao converter certificado para Base64'));
          return;
        }
        const [, base64] = result.split(',');
        if (!base64) {
          reject(new Error('Arquivo inválido para conversão Base64'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo de certificado'));
      reader.readAsDataURL(file);
    });
  };

  const handleCertificadoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pfx') && !fileName.endsWith('.p12')) {
      toast({
        title: 'Formato inválido',
        description: 'Envie um arquivo de certificado .pfx ou .p12.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      setIntegracaoEsocialForm(prev => ({
        ...prev,
        esocialCertBase64: base64,
        clearEsocialCert: false,
      }));
      setCertificadoArquivoSelecionado(file.name);
      toast({
        title: 'Certificado carregado',
        description: 'Informe a senha e clique em "Validar" para extrair os dados automaticamente.',
      });
    } catch (e: any) {
      console.error('Erro ao processar certificado:', e);
      toast({
        title: 'Erro ao processar certificado',
        description: e?.message || 'Não foi possível ler o certificado.',
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  // Validar certificado e extrair dados automaticamente (alias, validade, etc)
  const [validandoCertificado, setValidandoCertificado] = useState(false);
  
  // Estados para seções colapsáveis
  const [govbrExpanded, setGovbrExpanded] = useState(false);
  const [esocialExpanded, setEsocialExpanded] = useState(false);
  
  const validarEExtrairDadosCertificado = async () => {
    if (!integracaoEsocialForm.esocialCertBase64 || !integracaoEsocialForm.esocialCertPassword) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione o certificado e informe a senha para validar.',
        variant: 'destructive',
      });
      return;
    }

    setValidandoCertificado(true);
    try {
      const esocialBackendUrl = import.meta.env.VITE_ESOCIAL_BACKEND_URL;
      if (!esocialBackendUrl || esocialBackendUrl.includes('seu-backend-esocial')) {
        throw new Error('Backend não configurado');
      }

      const response = await fetch(`${esocialBackendUrl}/api/pdf/validate-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfxBase64: integracaoEsocialForm.esocialCertBase64,
          senha: integracaoEsocialForm.esocialCertPassword,
        }),
      });

      const resultado = await response.json();

      if (resultado.success && resultado.valido) {
        // Extrair CN como alias e validade
        const cert = resultado.certificado;
        setIntegracaoEsocialForm(prev => ({
          ...prev,
          certificadoAlias: cert.cn || prev.certificadoAlias,
          certificadoValidoAte: cert.validoAte ? cert.validoAte.split('T')[0] : prev.certificadoValidoAte,
        }));
        toast({
          title: 'Certificado válido!',
          description: `Titular: ${cert.cn} | Válido até: ${cert.validoAte ? new Date(cert.validoAte).toLocaleDateString('pt-BR') : 'N/A'}`,
        });
      } else {
        toast({
          title: 'Certificado inválido',
          description: resultado.mensagem || resultado.error || 'Senha incorreta ou certificado corrompido',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      console.error('Erro ao validar certificado:', e);
      toast({
        title: 'Erro ao validar',
        description: e?.message || 'Não foi possível validar o certificado',
        variant: 'destructive',
      });
    } finally {
      setValidandoCertificado(false);
    }
  };

  const saveIntegracaoEsocial = async () => {
    if (!empresaId) return;

    setSavingIntegracaoEsocial(true);
    try {
      if (isPlaceholderEsocialBackendUrl()) {
        throw new Error('VITE_ESOCIAL_BACKEND_URL está com valor de exemplo. Configure a URL real do backend eSocial na VPS.');
      }

      const payload: Record<string, unknown> = {
        govbrClientId: integracaoEsocialForm.govbrClientId.trim() || null,
        govbrRedirectUri: integracaoEsocialForm.govbrRedirectUri.trim() || null,
        govbrEnvironment: integracaoEsocialForm.govbrEnvironment,
        esocialTipoInscricao: integracaoEsocialForm.esocialTipoInscricao,
        esocialNrInscricao: integracaoEsocialForm.esocialNrInscricao.trim() || null,
        esocialAmbiente: integracaoEsocialForm.esocialAmbiente,
        certificadoAlias: integracaoEsocialForm.certificadoAlias.trim() || null,
        certificadoValidoAte: integracaoEsocialForm.certificadoValidoAte || null,
        clearGovbrClientSecret: integracaoEsocialForm.clearGovbrClientSecret,
        clearEsocialCert: integracaoEsocialForm.clearEsocialCert,
        clearEsocialCertPassword: integracaoEsocialForm.clearEsocialCertPassword,
      };

      if (integracaoEsocialForm.govbrClientSecret.trim()) {
        payload.govbrClientSecret = integracaoEsocialForm.govbrClientSecret.trim();
      }

      if (integracaoEsocialForm.esocialCertBase64.trim()) {
        payload.esocialCertBase64 = integracaoEsocialForm.esocialCertBase64.trim();
      }

      if (integracaoEsocialForm.esocialCertPassword.trim()) {
        payload.esocialCertPassword = integracaoEsocialForm.esocialCertPassword.trim();
      }

      const response = await fetch(getIntegracaoConfigEndpoint(), {
        method: 'PUT',
        headers: buildIntegracaoHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseBackendErrorMessage(response));
      }

      toast({
        title: 'Integração atualizada',
        description: 'Credenciais e certificado foram salvos com sucesso.',
      });

      logUpdate('Configurações', 'Integrações', 'Configuração eSocial/gov.br atualizada');

      setIntegracaoEsocialForm(prev => ({
        ...prev,
        govbrClientSecret: '',
        esocialCertBase64: '',
        esocialCertPassword: '',
        clearGovbrClientSecret: false,
        clearEsocialCert: false,
        clearEsocialCertPassword: false,
      }));
      setCertificadoArquivoSelecionado('');

      await loadIntegracaoEsocial();
    } catch (e: any) {
      console.error('Erro ao salvar integração eSocial:', e);
      toast({
        title: 'Erro ao salvar integração',
        description: e?.message || 'Não foi possível salvar os dados da integração.',
        variant: 'destructive',
      });
    } finally {
      setSavingIntegracaoEsocial(false);
    }
  };

  // Carregar logs de acesso
  const loadAccessLogs = async () => {
    if (!empresaId) return;
    setLoadingLogs(true);
    try {
      let query = (supabase as any)
        .from('access_logs')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (logsFilter.acao) {
        query = query.eq('acao', logsFilter.acao);
      }
      if (logsFilter.usuario) {
        query = query.or(`user_nome.ilike.%${logsFilter.usuario}%,user_email.ilike.%${logsFilter.usuario}%`);
      }
      if (logsFilter.modulo) {
        query = query.eq('modulo', logsFilter.modulo);
      }
      if (logsFilter.dataInicio) {
        query = query.gte('created_at', logsFilter.dataInicio);
      }
      if (logsFilter.dataFim) {
        query = query.lte('created_at', logsFilter.dataFim + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      setAccessLogs(data || []);

      // Calcular estatísticas
      const allLogs = data || [];
      const logins = allLogs.filter((l: AccessLog) => l.acao === 'login').length;
      const usuarios = new Set(allLogs.map((l: AccessLog) => l.user_id).filter(Boolean)).size;
      const dispositivos = new Set(allLogs.map((l: AccessLog) => l.device_type).filter(Boolean)).size;
      
      setLogsStats({
        totalLogins: logins,
        totalAcoes: allLogs.length,
        usuariosAtivos: usuarios,
        dispositivosUnicos: dispositivos
      });
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
      toast({ title: 'Erro ao carregar logs de acesso', variant: 'destructive' });
    } finally {
      setLoadingLogs(false);
    }
  };

  // Abrir dialog de logs
  const handleOpenLogsDialog = () => {
    setLogsDialogOpen(true);
    loadAccessLogs();
  };

  // Obter ícone da ação
  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'login': return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout': return <LogOut className="h-4 w-4 text-red-500" />;
      case 'view': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'create': return <Plus className="h-4 w-4 text-emerald-500" />;
      case 'update': return <Edit className="h-4 w-4 text-amber-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Obter ícone do dispositivo
  const getDeviceIcon = (device: string | null) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  // Obter label da ação
  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'logout': 'Logout',
      'view': 'Visualização',
      'create': 'Criação',
      'update': 'Atualização',
      'delete': 'Exclusão'
    };
    return labels[acao] || acao;
  };

  const loadSetores = async () => {
    if (!empresaId) return;
    setLoadingSetores(true);
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      setSetores(data || []);
    } catch (e) {
      console.error('Erro ao carregar setores:', e);
      toast({ title: 'Erro ao carregar setores', variant: 'destructive' });
    } finally {
      setLoadingSetores(false);
    }
  };

  // Funções para Categorias de Clientes
  const loadCategorias = async () => {
    if (!empresaId) return;
    setLoadingCategorias(true);
    try {
      const { data, error } = await (supabase as any)
        .from('categorias_clientes_empresa')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      setCategorias(data || []);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
      toast({ title: 'Erro ao carregar categorias', variant: 'destructive' });
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleOpenCategoriaDialog = (categoria?: CategoriaCliente) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setCategoriaForm({ nome: categoria.nome, descricao: categoria.descricao || '', cor: categoria.cor || '#6366f1', ativo: categoria.ativo });
    } else {
      setEditingCategoria(null);
      setCategoriaForm({ nome: '', descricao: '', cor: '#6366f1', ativo: true });
    }
    setCategoriaDialogOpen(true);
  };

  const handleSaveCategoria = async () => {
    if (!categoriaForm.nome.trim()) {
      toast({ title: 'Nome da categoria é obrigatório', variant: 'destructive' });
      return;
    }
    if (!empresaId) return;

    setSavingCategoria(true);
    try {
      if (editingCategoria) {
        const { error } = await (supabase as any)
          .from('categorias_clientes_empresa')
          .update({
            nome: categoriaForm.nome.trim(),
            descricao: categoriaForm.descricao.trim() || null,
            cor: categoriaForm.cor,
            ativo: categoriaForm.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategoria.id);
        if (error) throw error;
        logUpdate('Configurações', 'Categorias', `Categoria "${categoriaForm.nome}" atualizada`);
        toast({ title: 'Categoria atualizada com sucesso!' });
      } else {
        const { error } = await (supabase as any)
          .from('categorias_clientes_empresa')
          .insert({
            empresa_id: empresaId,
            nome: categoriaForm.nome.trim(),
            descricao: categoriaForm.descricao.trim() || null,
            cor: categoriaForm.cor,
            ativo: categoriaForm.ativo
          });
        if (error) throw error;
        logCreate('Configurações', 'Categorias', `Categoria "${categoriaForm.nome}" criada`);
        toast({ title: 'Categoria criada com sucesso!' });
      }
      setCategoriaDialogOpen(false);
      loadCategorias();
    } catch (e) {
      console.error('Erro ao salvar categoria:', e);
      toast({ title: 'Erro ao salvar categoria', variant: 'destructive' });
    } finally {
      setSavingCategoria(false);
    }
  };

  const handleDeleteCategoria = async () => {
    if (!categoriaToDelete) return;
    try {
      const { error } = await (supabase as any)
        .from('categorias_clientes_empresa')
        .delete()
        .eq('id', categoriaToDelete.id);
      if (error) throw error;
      logDelete('Configurações', 'Categorias', `Categoria "${categoriaToDelete.nome}" excluída`);
      toast({ title: 'Categoria excluída com sucesso!' });
      setDeleteCategoriaDialogOpen(false);
      setCategoriaToDelete(null);
      loadCategorias();
    } catch (e) {
      console.error('Erro ao excluir categoria:', e);
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' });
    }
  };

  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(searchCategoria.toLowerCase()) ||
    (c.descricao && c.descricao.toLowerCase().includes(searchCategoria.toLowerCase()))
  );

  const CORES_CATEGORIAS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#64748b'
  ];

  // Funções para Origens de Contato
  const loadOrigensContato = async () => {
    if (!empresaId) return;
    setLoadingOrigensContato(true);
    try {
      const { data, error } = await (supabase as any)
        .from('origens_contato')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      setOrigensContato(data || []);
    } catch (e) {
      console.error('Erro ao carregar origens de contato:', e);
      toast({ title: 'Erro ao carregar origens de contato', variant: 'destructive' });
    } finally {
      setLoadingOrigensContato(false);
    }
  };

  const handleOpenOrigemContatoDialog = (origem?: OrigemContato) => {
    if (origem) {
      setEditingOrigemContato(origem);
      setOrigemContatoForm({ nome: origem.nome, descricao: origem.descricao || '', cor: origem.cor || '#6366f1', ativo: origem.ativo });
    } else {
      setEditingOrigemContato(null);
      setOrigemContatoForm({ nome: '', descricao: '', cor: '#6366f1', ativo: true });
    }
    setOrigemContatoDialogOpen(true);
  };

  const handleSaveOrigemContato = async () => {
    if (!origemContatoForm.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    setSavingOrigemContato(true);
    try {
      if (editingOrigemContato) {
        const { error } = await (supabase as any)
          .from('origens_contato')
          .update({
            nome: origemContatoForm.nome.trim(),
            descricao: origemContatoForm.descricao.trim() || null,
            cor: origemContatoForm.cor,
            ativo: origemContatoForm.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOrigemContato.id);
        if (error) throw error;
        logUpdate('Configurações', 'Origens de Contato', `Origem "${origemContatoForm.nome}" atualizada`);
        toast({ title: 'Origem de contato atualizada com sucesso!' });
      } else {
        const { error } = await (supabase as any)
          .from('origens_contato')
          .insert({
            empresa_id: empresaId,
            nome: origemContatoForm.nome.trim(),
            descricao: origemContatoForm.descricao.trim() || null,
            cor: origemContatoForm.cor,
            ativo: origemContatoForm.ativo
          });
        if (error) throw error;
        logCreate('Configurações', 'Origens de Contato', `Origem "${origemContatoForm.nome}" criada`);
        toast({ title: 'Origem de contato criada com sucesso!' });
      }
      setOrigemContatoDialogOpen(false);
      loadOrigensContato();
    } catch (e) {
      console.error('Erro ao salvar origem de contato:', e);
      toast({ title: 'Erro ao salvar origem de contato', variant: 'destructive' });
    } finally {
      setSavingOrigemContato(false);
    }
  };

  const handleDeleteOrigemContato = async () => {
    if (!origemContatoToDelete) return;
    try {
      const { error } = await (supabase as any)
        .from('origens_contato')
        .delete()
        .eq('id', origemContatoToDelete.id);
      if (error) throw error;
      logDelete('Configurações', 'Origens de Contato', `Origem "${origemContatoToDelete.nome}" excluída`);
      toast({ title: 'Origem de contato excluída com sucesso!' });
      setDeleteOrigemContatoDialogOpen(false);
      setOrigemContatoToDelete(null);
      loadOrigensContato();
    } catch (e) {
      console.error('Erro ao excluir origem de contato:', e);
      toast({ title: 'Erro ao excluir origem de contato', variant: 'destructive' });
    }
  };

  const filteredOrigensContato = origensContato.filter(o => 
    o.nome.toLowerCase().includes(searchOrigemContato.toLowerCase()) ||
    (o.descricao && o.descricao.toLowerCase().includes(searchOrigemContato.toLowerCase()))
  );

  // Funções para Acessos
  const loadSetoresAcessos = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setSetoresAcessos(data || []);
      // Atualizar módulos com setores dinâmicos
      setModulosSistema(gerarModulosComSetores(data || []));
      // Carregar permissões salvas de todos os setores
      loadTodasPermissoesSalvas(data || []);
    } catch (e) {
      console.error('Erro ao carregar setores para acessos:', e);
    }
  };

  // Carregar configurações e dados quando necessário
  useEffect(() => {
    if (empresaId) {
      loadConfiguracoes();
    }
  }, [empresaId]);

  useEffect(() => {
    if (activeSection === 'setores' && empresaId) {
      loadSetores();
    }
    if (activeSection === 'acessos' && empresaId) {
      loadSetoresAcessos();
    }
    if (activeSection === 'categorias' && empresaId) {
      loadCategorias();
    }
    if (activeSection === 'origens-contato' && empresaId) {
      loadOrigensContato();
    }
    if (activeSection === 'integracao' && empresaId) {
      loadIntegracaoEsocial();
    }
  }, [activeSection, empresaId]);

  const loadTodasPermissoesSalvas = async (setoresList: Setor[]) => {
    if (setoresList.length === 0) return;
    setLoadingPermissoesSalvas(true);
    try {
      const setorIds = setoresList.map(s => s.id);
      const { data, error } = await (supabase as any)
        .from('setor_permissoes')
        .select('*')
        .in('setor_id', setorIds);
      
      if (error) throw error;
      
      // Agrupar permissões por setor + grupo de acesso
      const gruposAcesso = ['administrador', 'gestor', 'colaborador'];
      const permissoesPorSetorGrupo: {setor: Setor; grupo_acesso: string; permissoes: PermissaoSetor[]}[] = [];
      
      setoresList.forEach(setor => {
        gruposAcesso.forEach(grupo => {
          const permsDoGrupo = (data || []).filter(
            (p: any) => p.setor_id === setor.id && (p.grupo_acesso || 'colaborador') === grupo
          );
          if (permsDoGrupo.length > 0) {
            permissoesPorSetorGrupo.push({
              setor,
              grupo_acesso: grupo,
              permissoes: permsDoGrupo
            });
          }
        });
      });
      
      setPermissoesSalvas(permissoesPorSetorGrupo);
    } catch (e) {
      console.error('Erro ao carregar permissões salvas:', e);
      setPermissoesSalvas([]);
    } finally {
      setLoadingPermissoesSalvas(false);
    }
  };

  const loadPermissoesSetor = async (setorId: string) => {
    if (!empresaId || !setorId) return;
    setLoadingPermissoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('setor_permissoes')
        .select('*')
        .eq('setor_id', setorId);
      if (error) throw error;
      setPermissoes(data || []);
    } catch (e) {
      console.error('Erro ao carregar permissões:', e);
      setPermissoes([]);
    } finally {
      setLoadingPermissoes(false);
    }
  };

  const loadPermissoesSetorGrupo = async (setorId: string, grupoAcesso: string) => {
    if (!empresaId || !setorId) return;
    setLoadingPermissoes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('setor_permissoes')
        .select('*')
        .eq('setor_id', setorId)
        .eq('grupo_acesso', grupoAcesso);
      if (error) throw error;
      setPermissoes(data || []);
    } catch (e) {
      console.error('Erro ao carregar permissões:', e);
      setPermissoes([]);
    } finally {
      setLoadingPermissoes(false);
    }
  };

  const handleSetorAcessoChange = (setorId: string) => {
    setSelectedSetorAcesso(setorId);
    setGrupoAcessoSelecionado(null); // Resetar grupo ao mudar de setor
    if (setorId) {
      loadPermissoesSetor(setorId);
      // Expandir todos os módulos por padrão
      setExpandedModulos(modulosSistema.map(m => m.id));
    } else {
      setPermissoes([]);
    }
  };

  const toggleModulo = (moduloId: string) => {
    setExpandedModulos(prev => 
      prev.includes(moduloId) 
        ? prev.filter(id => id !== moduloId)
        : [...prev, moduloId]
    );
  };

  const getPermissao = (moduloId: string, paginaId: string): PermissaoSetor | undefined => {
    return permissoes.find(p => p.modulo_id === moduloId && p.pagina_id === paginaId);
  };

  // Verifica se todas as páginas de um módulo têm uma permissão específica
  const isModuloAllChecked = (moduloId: string, tipo: 'visualizar' | 'editar' | 'criar'): boolean => {
    const modulo = modulosSistema.find(m => m.id === moduloId);
    if (!modulo) return false;
    return modulo.paginas.every(pagina => {
      const perm = getPermissao(moduloId, pagina.id);
      return perm?.[tipo] === true;
    });
  };

  // Seleciona/deseleciona todas as páginas de um módulo para uma permissão específica
  const handleModuloAllChange = (moduloId: string, tipo: 'visualizar' | 'editar' | 'criar', valor: boolean) => {
    const modulo = modulosSistema.find(m => m.id === moduloId);
    if (!modulo) return;

    setPermissoes(prev => {
      const newPermissoes = [...prev];
      modulo.paginas.forEach(pagina => {
        const existenteIndex = newPermissoes.findIndex(p => p.modulo_id === moduloId && p.pagina_id === pagina.id);
        const existente = existenteIndex >= 0 ? newPermissoes[existenteIndex] : null;
        
        // Lógica de dependência igual ao handlePermissaoChange
        const novaPermissao = {
          setor_id: selectedSetorAcesso,
          modulo_id: moduloId,
          pagina_id: pagina.id,
          visualizar: existente?.visualizar || false,
          editar: existente?.editar || false,
          criar: existente?.criar || false
        };

        if (tipo === 'criar') {
          novaPermissao.criar = valor;
          if (valor) {
            novaPermissao.editar = true;
            novaPermissao.visualizar = true;
          }
        } else if (tipo === 'editar') {
          novaPermissao.editar = valor;
          if (valor) {
            novaPermissao.visualizar = true;
          } else {
            novaPermissao.criar = false;
          }
        } else if (tipo === 'visualizar') {
          novaPermissao.visualizar = valor;
          if (!valor) {
            novaPermissao.editar = false;
            novaPermissao.criar = false;
          }
        }

        if (existenteIndex >= 0) {
          newPermissoes[existenteIndex] = novaPermissao;
        } else {
          newPermissoes.push(novaPermissao);
        }
      });
      return newPermissoes;
    });
  };

  const handlePermissaoChange = (moduloId: string, paginaId: string, tipo: 'visualizar' | 'editar' | 'criar', valor: boolean) => {
    setPermissoes(prev => {
      const existente = prev.find(p => p.modulo_id === moduloId && p.pagina_id === paginaId);
      
      // Lógica de dependência:
      // - Criar = true -> Editar = true, Visualizar = true
      // - Editar = true -> Visualizar = true
      // - Visualizar = false -> Editar = false, Criar = false
      // - Editar = false -> Criar = false
      const novaPermissao = {
        setor_id: selectedSetorAcesso,
        modulo_id: moduloId,
        pagina_id: paginaId,
        visualizar: existente?.visualizar || false,
        editar: existente?.editar || false,
        criar: existente?.criar || false
      };

      if (tipo === 'criar') {
        novaPermissao.criar = valor;
        if (valor) {
          novaPermissao.editar = true;
          novaPermissao.visualizar = true;
        }
      } else if (tipo === 'editar') {
        novaPermissao.editar = valor;
        if (valor) {
          novaPermissao.visualizar = true;
        } else {
          novaPermissao.criar = false;
        }
      } else if (tipo === 'visualizar') {
        novaPermissao.visualizar = valor;
        if (!valor) {
          novaPermissao.editar = false;
          novaPermissao.criar = false;
        }
      }

      if (existente) {
        return prev.map(p => 
          p.modulo_id === moduloId && p.pagina_id === paginaId
            ? novaPermissao
            : p
        );
      } else {
        return [...prev, novaPermissao];
      }
    });
  };

  const handleSavePermissoes = async () => {
    if (!selectedSetorAcesso) {
      toast({ title: 'Selecione um setor primeiro', variant: 'destructive' });
      return;
    }
    
    if (!grupoAcessoSelecionado) {
      toast({ title: 'Selecione um grupo de acesso', description: 'Escolha Administrador, Gestor ou Colaborador.', variant: 'destructive' });
      return;
    }
    
    // Verificar se há pelo menos uma permissão ativa
    const permissoesAtivas = permissoes.filter(p => p.visualizar || p.editar || p.criar);
    if (permissoesAtivas.length === 0) {
      toast({ title: 'Selecione pelo menos uma permissão', description: 'Marque Ver, Editar ou Criar em pelo menos uma página.', variant: 'destructive' });
      return;
    }
    
    setSavingPermissoes(true);
    try {
      // Deletar permissões existentes do setor + grupo de acesso
      await (supabase as any)
        .from('setor_permissoes')
        .delete()
        .eq('setor_id', selectedSetorAcesso)
        .eq('grupo_acesso', grupoAcessoSelecionado);

      // Verificar se alguma permissão de setor dinâmico foi marcada (setor_uuid)
      const temPermissaoSetorDinamico = permissoesAtivas.some(p => p.pagina_id.startsWith('setor_'));
      
      // Preparar permissões para inserir
      const permissoesParaInserir = permissoesAtivas.map(p => ({
        setor_id: selectedSetorAcesso,
        modulo_id: p.modulo_id,
        pagina_id: p.pagina_id,
        visualizar: p.visualizar,
        editar: p.editar,
        criar: p.criar,
        grupo_acesso: grupoAcessoSelecionado || 'colaborador'
      }));
      
      // Se tem permissão para algum setor dinâmico, adicionar permissão para a tela wrapper toriq-corp-setores
      if (temPermissaoSetorDinamico) {
        const jaTemPermissaoWrapper = permissoesParaInserir.some(p => p.pagina_id === 'toriq_corp_setores');
        if (!jaTemPermissaoWrapper) {
          permissoesParaInserir.push({
            setor_id: selectedSetorAcesso,
            modulo_id: 'toriq_corp',
            pagina_id: 'toriq_corp_setores',
            visualizar: true,
            editar: false,
            criar: false,
            grupo_acesso: grupoAcessoSelecionado || 'colaborador'
          });
        }
      }

      // Inserir novas permissões com grupo de acesso
      const { error } = await (supabase as any)
        .from('setor_permissoes')
        .insert(permissoesParaInserir);
      if (error) throw error;
      toast({ title: 'Permissões salvas com sucesso!' });
      // Recarregar permissões salvas e limpar formulário
      await loadTodasPermissoesSalvas(setoresAcessos);
      setSelectedSetorAcesso('');
      setPermissoes([]);
      setEditandoSetor(null);
      setGrupoAcessoSelecionado(null);
    } catch (e: any) {
      console.error('Erro ao salvar permissões:', e);
      toast({ title: 'Erro ao salvar permissões', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPermissoes(false);
    }
  };

  const handleEditarPermissoes = (setorId: string, grupoAcesso?: string) => {
    setEditandoSetor(setorId);
    setSelectedSetorAcesso(setorId);
    if (grupoAcesso) {
      setGrupoAcessoSelecionado(grupoAcesso as 'administrador' | 'gestor' | 'colaborador');
      loadPermissoesSetorGrupo(setorId, grupoAcesso);
    } else {
      loadPermissoesSetor(setorId);
    }
    setExpandedModulos(modulosSistema.map(m => m.id));
  };

  const handleCancelarEdicao = () => {
    setEditandoSetor(null);
    setSelectedSetorAcesso('');
    setPermissoes([]);
    setGrupoAcessoSelecionado(null);
  };

  // Função para aplicar grupo de acesso Administrador - acesso total a tudo
  const aplicarGrupoAdministrador = () => {
    if (!selectedSetorAcesso) {
      toast({ title: 'Selecione um setor primeiro', variant: 'destructive' });
      return;
    }
    
    const novasPermissoes: PermissaoSetor[] = [];
    modulosSistema.forEach(modulo => {
      modulo.paginas.forEach(pagina => {
        novasPermissoes.push({
          setor_id: selectedSetorAcesso,
          modulo_id: modulo.id,
          pagina_id: pagina.id,
          visualizar: true,
          editar: true,
          criar: true
        });
      });
    });
    
    setPermissoes(novasPermissoes);
    setGrupoAcessoSelecionado('administrador');
    toast({ 
      title: 'Grupo Administrador aplicado', 
      description: 'Acesso total ao sistema foi configurado. O administrador pode adicionar ou remover permissões manualmente.' 
    });
  };

  // Função para aplicar grupo de acesso Gestor - acesso total ao setor selecionado
  const aplicarGrupoGestor = () => {
    if (!selectedSetorAcesso) {
      toast({ title: 'Selecione um setor primeiro', variant: 'destructive' });
      return;
    }
    
    // Obter o nome do setor selecionado para fazer o match com as páginas
    const setorSelecionado = setoresAcessos.find(s => s.id === selectedSetorAcesso);
    const nomeSetor = setorSelecionado?.nome?.toLowerCase() || '';
    
    const novasPermissoes: PermissaoSetor[] = [];
    modulosSistema.forEach(modulo => {
      modulo.paginas.forEach(pagina => {
        // Verifica se o nome da página corresponde ao setor (ex: "Administrativo" no setor "Administrativo")
        const paginaCorrespondeAoSetor = pagina.nome.toLowerCase().includes(nomeSetor) || 
                                          pagina.id.toLowerCase().includes(nomeSetor.replace(/\s+/g, '_'));
        
        novasPermissoes.push({
          setor_id: selectedSetorAcesso,
          modulo_id: modulo.id,
          pagina_id: pagina.id,
          visualizar: paginaCorrespondeAoSetor,
          editar: paginaCorrespondeAoSetor,
          criar: paginaCorrespondeAoSetor
        });
      });
    });
    
    setPermissoes(novasPermissoes);
    setGrupoAcessoSelecionado('gestor');
    toast({ 
      title: 'Grupo Gestor aplicado', 
      description: `Acesso total às páginas do setor "${setorSelecionado?.nome}" foi configurado. O administrador pode adicionar mais permissões manualmente.` 
    });
  };

  // Função para aplicar grupo de acesso Colaborador - acesso ao setor apenas para suas responsabilidades
  const aplicarGrupoColaborador = () => {
    if (!selectedSetorAcesso) {
      toast({ title: 'Selecione um setor primeiro', variant: 'destructive' });
      return;
    }
    
    // Obter o nome do setor selecionado para fazer o match com as páginas
    const setorSelecionado = setoresAcessos.find(s => s.id === selectedSetorAcesso);
    const nomeSetor = setorSelecionado?.nome?.toLowerCase() || '';
    
    const novasPermissoes: PermissaoSetor[] = [];
    let paginasEncontradas = 0;
    modulosSistema.forEach(modulo => {
      modulo.paginas.forEach(pagina => {
        // Verifica se o nome da página corresponde ao setor (ex: "Administrativo" no setor "Administrativo")
        const paginaCorrespondeAoSetor = pagina.nome.toLowerCase().includes(nomeSetor) || 
                                          pagina.id.toLowerCase().includes(nomeSetor.replace(/\s+/g, '_'));
        
        if (paginaCorrespondeAoSetor) {
          paginasEncontradas++;
        }
        
        // Colaborador: apenas visualização, sem edição ou criação
        novasPermissoes.push({
          setor_id: selectedSetorAcesso,
          modulo_id: modulo.id,
          pagina_id: pagina.id,
          visualizar: paginaCorrespondeAoSetor,
          editar: false,
          criar: false
        });
      });
    });
    
    setPermissoes(novasPermissoes);
    setGrupoAcessoSelecionado('colaborador');
    toast({ 
      title: 'Grupo Colaborador aplicado', 
      description: `Acesso às páginas do setor "${setorSelecionado?.nome}" foi configurado. O colaborador só visualiza o que é de sua responsabilidade.` 
    });
  };

  const getModuloNome = (moduloId: string): string => {
    return modulosSistema.find(m => m.id === moduloId)?.nome || moduloId;
  };

  const getPaginaNome = (moduloId: string, paginaId: string): string => {
    const modulo = modulosSistema.find(m => m.id === moduloId);
    return modulo?.paginas.find(p => p.id === paginaId)?.nome || paginaId;
  };

  const handleOpenSetorDialog = (setor?: Setor) => {
    if (setor) {
      setEditingSetor(setor);
      setSetorForm({ nome: setor.nome, descricao: setor.descricao || '', ativo: setor.ativo });
    } else {
      setEditingSetor(null);
      setSetorForm({ nome: '', descricao: '', ativo: true });
    }
    setSetorDialogOpen(true);
  };

  const handleSaveSetor = async () => {
    if (!setorForm.nome.trim()) {
      toast({ title: 'Nome do setor é obrigatório', variant: 'destructive' });
      return;
    }
    if (!empresaId) return;

    setSavingSetor(true);
    try {
      if (editingSetor) {
        const { error } = await supabase
          .from('setores')
          .update({
            nome: setorForm.nome.trim(),
            descricao: setorForm.descricao.trim() || null,
            ativo: setorForm.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSetor.id);
        if (error) throw error;
        logUpdate('Configurações', 'Setores', `Setor "${setorForm.nome}" atualizado`);
        toast({ title: 'Setor atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('setores')
          .insert({
            empresa_id: empresaId,
            nome: setorForm.nome.trim(),
            descricao: setorForm.descricao.trim() || null,
            ativo: setorForm.ativo
          });
        if (error) throw error;
        logCreate('Configurações', 'Setores', `Setor "${setorForm.nome}" criado`);
        toast({ title: 'Setor criado com sucesso!' });
      }
      setSetorDialogOpen(false);
      loadSetores();
    } catch (e) {
      console.error('Erro ao salvar setor:', e);
      toast({ title: 'Erro ao salvar setor', variant: 'destructive' });
    } finally {
      setSavingSetor(false);
    }
  };

  // Setores fixos que não podem ser excluídos (apenas Financeiro)
  const SETORES_FIXOS = ['Financeiro'];

  const isSetorFixo = (nomeSetor: string): boolean => {
    return SETORES_FIXOS.some(fixo => fixo.toLowerCase() === nomeSetor.toLowerCase());
  };

  const FRASE_CONFIRMACAO_EXCLUSAO = 'Quero apagar esse setor e excluir todos os dados';

  const resetDeleteSetorDialog = () => {
    setDeleteSetorDialogOpen(false);
    setSetorToDelete(null);
    setDeleteSetorStep(1);
    setDeleteSetorConfirmText('');
  };

  const handleDeleteSetor = async () => {
    if (!setorToDelete) return;

    // Verificar se é setor fixo
    if (isSetorFixo(setorToDelete.nome)) {
      toast({ 
        title: 'Não é possível excluir este setor', 
        description: 'Setores padrão do sistema não podem ser excluídos.',
        variant: 'destructive' 
      });
      resetDeleteSetorDialog();
      return;
    }

    // Verificar se a frase de confirmação está correta
    if (deleteSetorConfirmText !== FRASE_CONFIRMACAO_EXCLUSAO) {
      toast({
        title: 'Frase incorreta',
        description: 'Digite a frase de confirmação corretamente.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setDeletingSetor(true);
      
      // 1. Buscar funis do setor
      const { data: funisDoSetor } = await (supabase as any)
        .from('funis')
        .select('id')
        .eq('setor_id', setorToDelete.id);

      if (funisDoSetor && funisDoSetor.length > 0) {
        const funilIds = funisDoSetor.map((f: any) => f.id);

        // 2. Buscar cards dos funis
        const { data: cardsDosFunis } = await (supabase as any)
          .from('funil_cards')
          .select('id')
          .in('funil_id', funilIds);

        if (cardsDosFunis && cardsDosFunis.length > 0) {
          const cardIds = cardsDosFunis.map((c: any) => c.id);

          // 3. Excluir atividades dos cards
          await (supabase as any)
            .from('funil_card_atividades')
            .delete()
            .in('card_id', cardIds);

          // 4. Excluir movimentações dos cards
          await (supabase as any)
            .from('funil_card_movimentacoes')
            .delete()
            .in('card_id', cardIds);

          // 5. Excluir orçamentos dos cards
          await (supabase as any)
            .from('funil_card_orcamentos')
            .delete()
            .in('card_id', cardIds);

          // 6. Excluir comparações dos cards
          await (supabase as any)
            .from('funil_card_comparacoes')
            .delete()
            .in('card_id', cardIds);

          // 7. Excluir cards
          await (supabase as any)
            .from('funil_cards')
            .delete()
            .in('funil_id', funilIds);
        }

        // 8. Excluir etapas dos funis
        await (supabase as any)
          .from('funil_etapas')
          .delete()
          .in('funil_id', funilIds);

        // 9. Excluir automações dos funis
        await (supabase as any)
          .from('automacoes')
          .delete()
          .in('funil_id', funilIds);

        // 10. Excluir configurações dos funis
        await (supabase as any)
          .from('funis_configuracoes')
          .delete()
          .in('funil_id', funilIds);

        // 11. Excluir etiquetas dos funis
        await (supabase as any)
          .from('funil_etiquetas')
          .delete()
          .in('funil_id', funilIds);

        // 12. Excluir funis
        await (supabase as any)
          .from('funis')
          .delete()
          .eq('setor_id', setorToDelete.id);
      }

      // 13. Excluir setor
      const { error } = await supabase
        .from('setores')
        .delete()
        .eq('id', setorToDelete.id);
      
      if (error) throw error;

      logDelete('Configurações', 'Setores', `Setor "${setorToDelete.nome}" excluído com todos os funis e cards`);
      toast({ title: 'Setor excluído com sucesso!', description: 'Todos os funis e cards foram removidos.' });
      resetDeleteSetorDialog();
      loadSetores();
      
      // Disparar evento para atualizar sidebar
      window.dispatchEvent(new Event('setores-updated'));
    } catch (e) {
      console.error('Erro ao excluir setor:', e);
      toast({ title: 'Erro ao excluir setor', description: 'Não foi possível excluir o setor.', variant: 'destructive' });
    } finally {
      setDeletingSetor(false);
    }
  };

  const filteredSetores = setores.filter(s => 
    s.nome.toLowerCase().includes(searchSetor.toLowerCase()) ||
    (s.descricao && s.descricao.toLowerCase().includes(searchSetor.toLowerCase()))
  );

  const handleSave = () => {
    saveConfiguracoes();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'geral':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input
                    id="nomeFantasia"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome fantasia da empresa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idioma">Idioma do Sistema</Label>
                    <Select value={idioma} onValueChange={setIdioma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fusoHorario">Fuso Horário</Label>
                    <Select value={fusoHorario} onValueChange={setFusoHorario}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fuso horário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                        <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                        <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                        <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Preferências de Exibição</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Formato de Data</Label>
                    <p className="text-sm text-muted-foreground">Como as datas serão exibidas no sistema</p>
                  </div>
                  <Select value={formatoData} onValueChange={setFormatoData}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                      <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Formato de Moeda</Label>
                    <p className="text-sm text-muted-foreground">Moeda padrão para valores monetários</p>
                  </div>
                  <Select value={formatoMoeda} onValueChange={setFormatoMoeda}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">R$ (Real)</SelectItem>
                      <SelectItem value="USD">$ (Dólar)</SelectItem>
                      <SelectItem value="EUR">€ (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
              <p className="text-sm text-muted-foreground mb-4">Configure a missão, visão, valores, dados do diretor técnico e imagens da empresa</p>
              <SSTInformacoesEmpresa />
            </div>
          </div>
        );

      case 'notificacoes':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Canais de Notificação</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notificações por E-mail</Label>
                      <p className="text-sm text-muted-foreground">Receber alertas por e-mail</p>
                    </div>
                  </div>
                  <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notificações do Sistema</Label>
                      <p className="text-sm text-muted-foreground">Alertas dentro do sistema</p>
                    </div>
                  </div>
                  <Switch checked={notifSistema} onCheckedChange={setNotifSistema} />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Tipos de Notificação</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Treinamentos</Label>
                    <p className="text-sm text-muted-foreground">Novos treinamentos, turmas e certificados</p>
                  </div>
                  <Switch checked={notifTreinamentos} onCheckedChange={setNotifTreinamentos} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Vencimentos</Label>
                    <p className="text-sm text-muted-foreground">Alertas de vencimento de certificados e documentos</p>
                  </div>
                  <Switch checked={notifVencimentos} onCheckedChange={setNotifVencimentos} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Documentos</Label>
                    <p className="text-sm text-muted-foreground">Novos documentos e atualizações</p>
                  </div>
                  <Switch checked={notifDocumentos} onCheckedChange={setNotifDocumentos} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'seguranca':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Autenticação</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Autenticação em Dois Fatores (2FA)</Label>
                      <p className="text-sm text-muted-foreground">Adiciona uma camada extra de segurança</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {autenticacao2FA && <Badge variant="secondary">Ativo</Badge>}
                    <Switch checked={autenticacao2FA} onCheckedChange={setAutenticacao2FA} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Tempo de Sessão</Label>
                    <p className="text-sm text-muted-foreground">Tempo de inatividade antes do logout automático</p>
                  </div>
                  <Select value={sessaoTimeout} onValueChange={setSessaoTimeout}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Auditoria</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Log de Acessos</Label>
                      <p className="text-sm text-muted-foreground">Registrar todas as atividades dos usuários</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleOpenLogsDialog}
                      className="flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      Ver Logs
                    </Button>
                    <Switch checked={logAcessos} onCheckedChange={setLogAcessos} />
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Política de Senhas</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Força Mínima da Senha</Label>
                    <p className="text-sm text-muted-foreground">Nível de complexidade exigido</p>
                  </div>
                  <Select defaultValue="media">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Expiração de Senha</Label>
                    <p className="text-sm text-muted-foreground">Período para troca obrigatória</p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="never">Nunca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'aparencia':
        return <WhiteLabelConfig />;

      case 'integracao':
        // Se estiver mostrando reconhecimento facial, renderizar o componente
        if (showReconhecimentoFacial) {
          return (
            <ReconhecimentoFacialConfig 
              onBack={() => setShowReconhecimentoFacial(false)} 
            />
          );
        }
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Integrações Disponíveis</h3>
              <div className="space-y-4">
                {/* Reconhecimento Facial - Ativo */}
                <div 
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setShowReconhecimentoFacial(true)}
                >
                  <div className="flex items-center gap-3">
                    <ScanFace className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="cursor-pointer">Reconhecimento Facial</Label>
                      <p className="text-sm text-muted-foreground">Configurar reconhecimento facial para marcação de presença em treinamentos</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Disponível</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Certificado Digital A1 ICP-Brasil */}
            {empresaId && (
              <CertificadoA1Config empresaId={empresaId} />
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-muted/20">
                <div>
                  <h3 className="text-lg font-semibold">eSocial + Assinatura gov.br</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure as credenciais por empresa para envio de eventos SST e assinatura digital.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Endpoint: {esocialBackendBaseUrl || 'mesma origem do frontend'} /api/esocial/config
                  </p>
                  {!esocialConfigApiKey && (
                    <p className="text-xs text-amber-600 mt-1">
                      VITE_ESOCIAL_CONFIG_API_KEY não definida. Se o backend exigir API key, configure no ambiente do frontend.
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={loadIntegracaoEsocial}
                  disabled={loadingIntegracaoEsocial}
                >
                  {loadingIntegracaoEsocial ? 'Carregando...' : 'Recarregar'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Client Secret gov.br</Label>
                  <div className="mt-1">
                    {integracaoEsocialPublicView?.hasGovbrClientSecret ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Configurado</Badge>
                    ) : (
                      <Badge variant="outline">Não configurado</Badge>
                    )}
                  </div>
                  {integracaoEsocialPublicView?.govbrClientSecretMasked && (
                    <p className="text-xs text-muted-foreground mt-1">{integracaoEsocialPublicView.govbrClientSecretMasked}</p>
                  )}
                </div>
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Certificado eSocial</Label>
                  <div className="mt-1">
                    {integracaoEsocialPublicView?.hasEsocialCert ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Configurado</Badge>
                    ) : (
                      <Badge variant="outline">Não configurado</Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Última atualização</Label>
                  <p className="text-sm mt-1">
                    {integracaoEsocialPublicView?.updatedAt
                      ? format(new Date(integracaoEsocialPublicView.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : 'Sem registro'}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGovbrExpanded(!govbrExpanded)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">Credenciais gov.br</h4>
                    {integracaoEsocialPublicView?.hasGovbrClientSecret ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Desconectado</Badge>
                    )}
                  </div>
                  {govbrExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </button>
                {govbrExpanded && (
                  <div className="p-4 pt-0 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="govbr-client-id">Client ID</Label>
                        <Input
                          id="govbr-client-id"
                          value={integracaoEsocialForm.govbrClientId}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({ ...prev, govbrClientId: e.target.value }))}
                          placeholder="Client ID OAuth2 do gov.br"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="govbr-client-secret">Client Secret (opcional para manter o atual)</Label>
                        <Input
                          id="govbr-client-secret"
                          type="password"
                          value={integracaoEsocialForm.govbrClientSecret}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({
                            ...prev,
                            govbrClientSecret: e.target.value,
                            clearGovbrClientSecret: false,
                          }))}
                          placeholder="Digite somente se quiser atualizar"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Deixe em branco para preservar o segredo atual.</p>
                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={integracaoEsocialForm.clearGovbrClientSecret}
                              onCheckedChange={(checked) =>
                                setIntegracaoEsocialForm(prev => ({
                                  ...prev,
                                  clearGovbrClientSecret: checked,
                                  govbrClientSecret: checked ? '' : prev.govbrClientSecret,
                                }))
                              }
                            />
                            Limpar segredo
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="govbr-redirect-uri">Redirect URI</Label>
                        <Input
                          id="govbr-redirect-uri"
                          value={integracaoEsocialForm.govbrRedirectUri}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({ ...prev, govbrRedirectUri: e.target.value }))}
                          placeholder="https://seu-dominio/callback/govbr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ambiente gov.br</Label>
                        <Select
                          value={integracaoEsocialForm.govbrEnvironment}
                          onValueChange={(value: GovbrEnvironment) =>
                            setIntegracaoEsocialForm(prev => ({ ...prev, govbrEnvironment: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staging">Homologação (staging)</SelectItem>
                            <SelectItem value="production">Produção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEsocialExpanded(!esocialExpanded)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">Configuração eSocial</h4>
                    {integracaoEsocialPublicView?.hasEsocialCert ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Desconectado</Badge>
                    )}
                  </div>
                  {esocialExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </button>
                {esocialExpanded && (
                  <div className="p-4 pt-0 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="esocial-certificado">Certificado digital (.pfx/.p12)</Label>
                        <Input
                          id="esocial-certificado"
                          type="file"
                          accept=".pfx,.p12,application/x-pkcs12"
                          onChange={handleCertificadoUpload}
                        />
                        <p className="text-xs text-muted-foreground">
                          {certificadoArquivoSelecionado
                            ? `Arquivo carregado para envio: ${certificadoArquivoSelecionado}`
                            : 'Se nenhum arquivo for enviado, o certificado atual será mantido.'}
                        </p>
                        <label className="text-xs flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={integracaoEsocialForm.clearEsocialCert}
                            onCheckedChange={(checked) =>
                              setIntegracaoEsocialForm(prev => ({
                                ...prev,
                                clearEsocialCert: checked,
                                esocialCertBase64: checked ? '' : prev.esocialCertBase64,
                              }))
                            }
                          />
                          Limpar certificado salvo
                        </label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="esocial-cert-password">Senha do certificado (opcional para manter a atual)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="esocial-cert-password"
                            type="password"
                            value={integracaoEsocialForm.esocialCertPassword}
                            onChange={(e) => setIntegracaoEsocialForm(prev => ({
                              ...prev,
                              esocialCertPassword: e.target.value,
                              clearEsocialCertPassword: false,
                            }))}
                            placeholder="Digite somente se quiser atualizar"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant={integracaoEsocialForm.esocialCertBase64 && integracaoEsocialForm.esocialCertPassword ? 'default' : 'outline'}
                            onClick={validarEExtrairDadosCertificado}
                            disabled={validandoCertificado || !integracaoEsocialForm.esocialCertBase64 || !integracaoEsocialForm.esocialCertPassword}
                            title={!integracaoEsocialForm.esocialCertBase64 ? 'Carregue um certificado primeiro' : !integracaoEsocialForm.esocialCertPassword ? 'Digite a senha do certificado' : 'Validar certificado'}
                          >
                            {validandoCertificado ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                Validando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Validar
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {!integracaoEsocialForm.esocialCertBase64 
                            ? '⚠️ Carregue um certificado .pfx/.p12 acima para habilitar a validação'
                            : !integracaoEsocialForm.esocialCertPassword 
                              ? '⚠️ Digite a senha do certificado para habilitar a validação'
                              : '✓ Clique em "Validar" para extrair automaticamente o alias e validade do certificado'}
                        </p>
                        <label className="text-xs flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={integracaoEsocialForm.clearEsocialCertPassword}
                            onCheckedChange={(checked) =>
                              setIntegracaoEsocialForm(prev => ({
                                ...prev,
                                clearEsocialCertPassword: checked,
                                esocialCertPassword: checked ? '' : prev.esocialCertPassword,
                              }))
                            }
                          />
                          Limpar senha salva
                        </label>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de inscrição</Label>
                        <Select
                          value={integracaoEsocialForm.esocialTipoInscricao}
                          onValueChange={(value: EsocialTipoInscricao) =>
                            setIntegracaoEsocialForm(prev => ({ ...prev, esocialTipoInscricao: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - CNPJ</SelectItem>
                            <SelectItem value="2">2 - CPF</SelectItem>
                            <SelectItem value="3">3 - CAEPF</SelectItem>
                            <SelectItem value="4">4 - CNO</SelectItem>
                            <SelectItem value="5">5 - CEI</SelectItem>
                            <SelectItem value="6">6 - CNO obra própria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="esocial-nr-inscricao">Número de inscrição</Label>
                        <Input
                          id="esocial-nr-inscricao"
                          value={integracaoEsocialForm.esocialNrInscricao}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({ ...prev, esocialNrInscricao: e.target.value }))}
                          placeholder="Somente números"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Ambiente eSocial</Label>
                        <Select
                          value={integracaoEsocialForm.esocialAmbiente}
                          onValueChange={(value: EsocialAmbiente) =>
                            setIntegracaoEsocialForm(prev => ({ ...prev, esocialAmbiente: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 - Produção Restrita (Homologação)</SelectItem>
                            <SelectItem value="1">1 - Produção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="certificado-alias">Alias do certificado</Label>
                        <Input
                          id="certificado-alias"
                          value={integracaoEsocialForm.certificadoAlias}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({ ...prev, certificadoAlias: e.target.value }))}
                          placeholder="Ex.: Certificado Matriz"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="certificado-validade">Validade do certificado</Label>
                        <Input
                          id="certificado-validade"
                          type="date"
                          value={integracaoEsocialForm.certificadoValidoAte}
                          onChange={(e) => setIntegracaoEsocialForm(prev => ({ ...prev, certificadoValidoAte: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (integracaoEsocialPublicView) {
                      setIntegracaoEsocialForm({
                        govbrClientId: integracaoEsocialPublicView.govbrClientId || '',
                        govbrClientSecret: '',
                        govbrRedirectUri: integracaoEsocialPublicView.govbrRedirectUri || '',
                        govbrEnvironment: integracaoEsocialPublicView.govbrEnvironment || 'staging',
                        esocialCertBase64: '',
                        esocialCertPassword: '',
                        esocialTipoInscricao: integracaoEsocialPublicView.esocialTipoInscricao || '1',
                        esocialNrInscricao: integracaoEsocialPublicView.esocialNrInscricao || '',
                        esocialAmbiente: integracaoEsocialPublicView.esocialAmbiente || '2',
                        certificadoAlias: integracaoEsocialPublicView.certificadoAlias || '',
                        certificadoValidoAte: integracaoEsocialPublicView.certificadoValidoAte || '',
                        clearGovbrClientSecret: false,
                        clearEsocialCert: false,
                        clearEsocialCertPassword: false,
                      });
                    } else {
                      setIntegracaoEsocialForm(DEFAULT_INTEGRACAO_ESOCIAL_FORM);
                    }
                    setCertificadoArquivoSelecionado('');
                  }}
                  disabled={savingIntegracaoEsocial}
                >
                  Descartar edição
                </Button>
                <Button onClick={saveIntegracaoEsocial} disabled={savingIntegracaoEsocial || loadingIntegracaoEsocial}>
                  {savingIntegracaoEsocial ? 'Salvando...' : 'Salvar credenciais'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'atalhos':
        return <AtalhosConfig />;

      case 'documentos':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Modelos de Documentos</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Modelo de Certificado</Label>
                  <Select value={modeloCertificado} onValueChange={setModeloCertificado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="moderno">Moderno</SelectItem>
                      <SelectItem value="classico">Clássico</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Assinatura Digital</Label>
                    <p className="text-sm text-muted-foreground">Habilitar assinatura digital nos documentos</p>
                  </div>
                  <Switch checked={assinaturaDigital} onCheckedChange={setAssinaturaDigital} />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Rodapé Padrão</h3>
              <div className="space-y-2">
                <Label>Texto do Rodapé</Label>
                <Textarea
                  value={rodapePadrao}
                  onChange={(e) => setRodapePadrao(e.target.value)}
                  placeholder="Texto que aparecerá no rodapé dos documentos gerados..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Este texto será incluído automaticamente em todos os documentos gerados pelo sistema.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Logotipo</h3>
              <div className="p-4 border rounded-lg border-dashed">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Arraste uma imagem ou clique para fazer upload
                  </p>
                  <Button variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'setores':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={() => handleOpenSetorDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Setor
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar setores..."
                value={searchSetor}
                onChange={(e) => setSearchSetor(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingSetores ? (
              <div className="text-center py-8 text-muted-foreground">Carregando setores...</div>
            ) : filteredSetores.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {searchSetor ? 'Nenhum setor encontrado' : 'Nenhum setor cadastrado'}
                </p>
                {!searchSetor && (
                  <Button variant="outline" className="mt-4" onClick={() => handleOpenSetorDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro setor
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSetores.map((setor) => (
                      <TableRow key={setor.id}>
                        <TableCell className="font-medium">{setor.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {setor.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={setor.ativo ? 'default' : 'secondary'}>
                            {setor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenSetorDialog(setor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!isSetorFixo(setor.nome) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSetorToDelete(setor);
                                  setDeleteSetorDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Total: {filteredSetores.length} setor(es)
            </div>
          </div>
        );

      case 'acessos':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={() => {
                setSelectedSetorAcesso('');
                setGrupoAcessoSelecionado(null);
                setPermissoes([]);
                setNovaPermissaoDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Permissão
              </Button>
            </div>

            {/* Tabela de Permissões Configuradas */}
            {loadingPermissoesSalvas ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando permissões...
              </div>
            ) : permissoesSalvas.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-semibold">Permissões Configuradas ({permissoesSalvas.length})</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setor</TableHead>
                        <TableHead>Grupo de Acesso</TableHead>
                        <TableHead>Módulos com Acesso</TableHead>
                        <TableHead>Total de Páginas</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissoesSalvas.map(({ setor, grupo_acesso, permissoes: perms }) => {
                        const modulosUnicos = [...new Set(perms.map(p => p.modulo_id))];
                        const paginasComVisualizacao = perms.filter(p => p.visualizar).length;
                        const paginasComEdicao = perms.filter(p => p.editar).length;
                        const paginasComCriacao = perms.filter(p => p.criar).length;
                        
                        // Determinar variante do badge baseado no grupo de acesso
                        let grupoVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
                        const grupoNome = grupo_acesso.charAt(0).toUpperCase() + grupo_acesso.slice(1);
                        
                        if (grupo_acesso === 'administrador') {
                          grupoVariant = 'destructive';
                        } else if (grupo_acesso === 'gestor') {
                          grupoVariant = 'default';
                        } else if (grupo_acesso === 'colaborador') {
                          grupoVariant = 'secondary';
                        }
                        
                        return (
                          <TableRow key={`${setor.id}-${grupo_acesso}`}>
                            <TableCell className="font-medium">{setor.nome}</TableCell>
                            <TableCell>
                              <Badge variant={grupoVariant}>
                                {grupoNome}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {modulosUnicos.slice(0, 3).map(moduloId => (
                                  <Badge key={moduloId} variant="outline" className="text-xs">
                                    {getModuloNome(moduloId)}
                                  </Badge>
                                ))}
                                {modulosUnicos.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{modulosUnicos.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> {paginasComVisualizacao}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Pencil className="h-3 w-3" /> {paginasComEdicao}
                                </span>
                                <span className="flex items-center gap-1">
                                  <PlusCircle className="h-3 w-3" /> {paginasComCriacao}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleEditarPermissoes(setor.id, grupo_acesso);
                                  setNovaPermissaoDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : setoresAcessos.length > 0 ? (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Clique em "Nova Permissão" para configurar os acessos de um setor
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhuma permissão configurada ainda
                </p>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum setor cadastrado
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre setores na seção "Setores" primeiro
                </p>
              </div>
            )}
          </div>
        );

      case 'categorias':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={() => handleOpenCategoriaDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categorias..."
                value={searchCategoria}
                onChange={(e) => setSearchCategoria(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tabela de Categorias */}
            {loadingCategorias ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando categorias...
              </div>
            ) : filteredCategorias.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {categorias.length === 0 
                    ? 'Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.'
                    : 'Nenhuma categoria encontrada com esse filtro.'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategorias.map((categoria) => (
                      <TableRow key={categoria.id}>
                        <TableCell>
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: categoria.cor }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{categoria.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {categoria.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={categoria.ativo ? 'default' : 'secondary'}>
                            {categoria.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoriaDialog(categoria)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCategoriaToDelete(categoria);
                                setDeleteCategoriaDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );

      case 'origens-contato':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={() => handleOpenOrigemContatoDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Origem
              </Button>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar origens de contato..."
                value={searchOrigemContato}
                onChange={(e) => setSearchOrigemContato(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tabela de Origens de Contato */}
            {loadingOrigensContato ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando origens de contato...
              </div>
            ) : filteredOrigensContato.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {origensContato.length === 0 
                    ? 'Nenhuma origem de contato cadastrada. Clique em "Nova Origem" para começar.'
                    : 'Nenhuma origem de contato encontrada com esse filtro.'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrigensContato.map((origem) => (
                      <TableRow key={origem.id}>
                        <TableCell>
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: origem.cor }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{origem.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {origem.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={origem.ativo ? 'default' : 'secondary'}>
                            {origem.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenOrigemContatoDialog(origem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOrigemContatoToDelete(origem);
                                setDeleteOrigemContatoDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );

      case 'produtos-servicos':
        return <ProdutosServicos />;

      case 'usuarios':
        return <SSTUsuarios />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações Gerais</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Menu Lateral */}
        <Card className="w-64 h-fit sticky top-6">
          <CardContent className="p-4">
            <nav className="space-y-1">
              <MenuItem
                icon={<Settings className="h-4 w-4" />}
                label="Geral"
                section="geral"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Bell className="h-4 w-4" />}
                label="Notificações"
                section="notificacoes"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Shield className="h-4 w-4" />}
                label="Segurança"
                section="seguranca"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Palette className="h-4 w-4" />}
                label="Aparência"
                section="aparencia"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Zap className="h-4 w-4" />}
                label="Integrações"
                section="integracao"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Keyboard className="h-4 w-4" />}
                label="Atalhos do Sistema"
                section="atalhos"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<FileText className="h-4 w-4" />}
                label="Documentos"
                section="documentos"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Layers className="h-4 w-4" />}
                label="Setores"
                section="setores"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Key className="h-4 w-4" />}
                label="Acessos"
                section="acessos"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Tags className="h-4 w-4" />}
                label="Categoria da Empresa"
                section="categorias"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Globe className="h-4 w-4" />}
                label="Origem Contato"
                section="origens-contato"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<Package className="h-4 w-4" />}
                label="Produtos e Serviços"
                section="produtos-servicos"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
              <MenuItem
                icon={<UsersRound className="h-4 w-4" />}
                label="Usuários"
                section="usuarios"
                activeSection={activeSection}
                onClick={setActiveSection}
              />
            </nav>
          </CardContent>
        </Card>

        {/* Conteúdo */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeSection === 'geral' && <Settings className="h-5 w-5" />}
              {activeSection === 'notificacoes' && <Bell className="h-5 w-5" />}
              {activeSection === 'seguranca' && <Shield className="h-5 w-5" />}
              {activeSection === 'aparencia' && <Palette className="h-5 w-5" />}
              {activeSection === 'integracao' && <Zap className="h-5 w-5" />}
              {activeSection === 'atalhos' && <Keyboard className="h-5 w-5" />}
              {activeSection === 'documentos' && <FileText className="h-5 w-5" />}
              {activeSection === 'setores' && <Layers className="h-5 w-5" />}
              {activeSection === 'acessos' && <Key className="h-5 w-5" />}
              {activeSection === 'categorias' && <Tags className="h-5 w-5" />}
              {activeSection === 'origens-contato' && <Globe className="h-5 w-5" />}
              {activeSection === 'produtos-servicos' && <Package className="h-5 w-5" />}
              {activeSection === 'usuarios' && <UsersRound className="h-5 w-5" />}
              {activeSection === 'geral' && 'Configurações Gerais'}
              {activeSection === 'notificacoes' && 'Notificações'}
              {activeSection === 'seguranca' && 'Segurança'}
              {activeSection === 'aparencia' && 'Aparência'}
              {activeSection === 'integracao' && 'Integrações'}
              {activeSection === 'atalhos' && 'Atalhos do Sistema'}
              {activeSection === 'documentos' && 'Documentos'}
              {activeSection === 'setores' && 'Setores'}
              {activeSection === 'acessos' && 'Controle de Acessos'}
              {activeSection === 'categorias' && 'Categoria da Empresa'}
              {activeSection === 'origens-contato' && 'Origens de Contato'}
              {activeSection === 'produtos-servicos' && 'Produtos e Serviços'}
              {activeSection === 'usuarios' && 'Usuários'}
            </CardTitle>
            <CardDescription>
              {activeSection === 'geral' && 'Configure as informações básicas e preferências do sistema'}
              {activeSection === 'notificacoes' && 'Gerencie como você recebe alertas e notificações'}
              {activeSection === 'seguranca' && 'Configure opções de segurança e autenticação'}
              {activeSection === 'aparencia' && 'Personalize a aparência do sistema'}
              {activeSection === 'integracao' && 'Configure integrações com outros sistemas'}
              {activeSection === 'atalhos' && 'Configure os atalhos de teclado do sistema'}
              {activeSection === 'documentos' && 'Configure modelos e preferências de documentos'}
              {activeSection === 'setores' && 'Gerencie os setores e departamentos da empresa'}
              {activeSection === 'acessos' && 'Gerencie as permissões de acesso por setor'}
              {activeSection === 'categorias' && 'Gerencie as categorias para classificar seus clientes'}
              {activeSection === 'origens-contato' && 'Gerencie as origens de contato para seus clientes'}
              {activeSection === 'produtos-servicos' && 'Cadastre seus produtos e serviços'}
              {activeSection === 'usuarios' && 'Gerencie os usuários da empresa'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
            
            {activeSection !== 'setores' && activeSection !== 'acessos' && activeSection !== 'categorias' && activeSection !== 'origens-contato' && activeSection !== 'produtos-servicos' && activeSection !== 'usuarios' && activeSection !== 'integracao' && (
              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button onClick={handleSave} disabled={savingConfig || loadingConfig}>
                  {savingConfig ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Criar/Editar Setor */}
      <Dialog open={setorDialogOpen} onOpenChange={setSetorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSetor ? 'Editar Setor' : 'Novo Setor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="setorNome">Nome do Setor *</Label>
              <Input
                id="setorNome"
                value={setorForm.nome}
                onChange={(e) => setSetorForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Administrativo, Operacional, RH..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setorDescricao">Descrição</Label>
              <Textarea
                id="setorDescricao"
                value={setorForm.descricao}
                onChange={(e) => setSetorForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do setor (opcional)"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">Setor ativo no sistema</p>
              </div>
              <Switch
                checked={setorForm.ativo}
                onCheckedChange={(checked) => setSetorForm(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetorDialogOpen(false)} disabled={savingSetor}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSetor} disabled={savingSetor}>
              {savingSetor ? 'Salvando...' : editingSetor ? 'Salvar Alterações' : 'Criar Setor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão em Etapas */}
      <Dialog open={deleteSetorDialogOpen} onOpenChange={(open) => {
        if (!open) resetDeleteSetorDialog();
        else setDeleteSetorDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Setor - Etapa {deleteSetorStep} de 4
            </DialogTitle>
          </DialogHeader>

          {/* Etapa 1: Confirmação inicial */}
          {deleteSetorStep === 1 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja apagar o setor <strong>"{setorToDelete?.nome}"</strong>?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteSetorDialog}>
                  Não, cancelar
                </Button>
                <Button variant="destructive" onClick={() => setDeleteSetorStep(2)}>
                  Sim, continuar
                </Button>
              </div>
            </div>
          )}

          {/* Etapa 2: Aviso sobre exclusão em cascata */}
          {deleteSetorStep === 2 && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-2">⚠️ Atenção!</p>
                <p className="text-sm text-muted-foreground">
                  Você tem ciência que apagando o setor <strong>"{setorToDelete?.nome}"</strong> você apaga também:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Todos os <strong>funis</strong> criados neste setor</li>
                  <li>Todos os <strong>cards</strong> dos funis</li>
                  <li>Todas as <strong>automações</strong> configuradas</li>
                  <li>Todo o <strong>histórico de atividades</strong></li>
                  <li>Todo o <strong>histórico de movimentações</strong> dos cards</li>
                  <li>Todos os <strong>orçamentos</strong> vinculados aos cards</li>
                  <li>Todas as <strong>etiquetas</strong> dos funis</li>
                  <li>Todas as <strong>etapas</strong> dos funis</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteSetorDialog}>
                  Não, cancelar
                </Button>
                <Button variant="destructive" onClick={() => setDeleteSetorStep(3)}>
                  Sim, tenho ciência
                </Button>
              </div>
            </div>
          )}

          {/* Etapa 3: Confirmação final */}
          {deleteSetorStep === 3 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Ainda deseja apagar o setor <strong>"{setorToDelete?.nome}"</strong> e todos os seus dados?
              </p>
              <p className="text-sm text-destructive font-medium">
                Esta ação é irreversível!
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteSetorDialog}>
                  Não, cancelar
                </Button>
                <Button variant="destructive" onClick={() => setDeleteSetorStep(4)}>
                  Sim, quero apagar
                </Button>
              </div>
            </div>
          )}

          {/* Etapa 4: Digitar frase de confirmação */}
          {deleteSetorStep === 4 && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium mb-2">
                  Para confirmar a exclusão, digite a frase abaixo:
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded select-all">
                  {FRASE_CONFIRMACAO_EXCLUSAO}
                </p>
              </div>
              <Input
                placeholder="Digite a frase de confirmação..."
                value={deleteSetorConfirmText}
                onChange={(e) => setDeleteSetorConfirmText(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                autoComplete="off"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Ao fazer isso você confirma que deseja apagar o setor e todos os dados em cadeia serão excluídos.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteSetorDialog} disabled={deletingSetor}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSetor}
                  disabled={deleteSetorConfirmText !== FRASE_CONFIRMACAO_EXCLUSAO || deletingSetor}
                >
                  {deletingSetor ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir Setor Permanentemente'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar/Editar Categoria */}
      <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoriaNome">Nome da Categoria *</Label>
              <Input
                id="categoriaNome"
                value={categoriaForm.nome}
                onChange={(e) => setCategoriaForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Premium, Básico, VIP..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoriaDescricao">Descrição</Label>
              <Textarea
                id="categoriaDescricao"
                value={categoriaForm.descricao}
                onChange={(e) => setCategoriaForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição da categoria (opcional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Categoria</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_CATEGORIAS.map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCategoriaForm(prev => ({ ...prev, cor }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      categoriaForm.cor === cor 
                        ? 'ring-2 ring-offset-2 ring-primary' 
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">Categoria ativa no sistema</p>
              </div>
              <Switch
                checked={categoriaForm.ativo}
                onCheckedChange={(checked) => setCategoriaForm(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoriaDialogOpen(false)} disabled={savingCategoria}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategoria} disabled={savingCategoria}>
              {savingCategoria ? 'Salvando...' : editingCategoria ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Categoria */}
      <AlertDialog open={deleteCategoriaDialogOpen} onOpenChange={setDeleteCategoriaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoriaToDelete?.nome}"? 
              Esta ação não pode ser desfeita. Clientes vinculados a esta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoriaToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategoria}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Criar/Editar Origem de Contato */}
      <Dialog open={origemContatoDialogOpen} onOpenChange={setOrigemContatoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOrigemContato ? 'Editar Origem de Contato' : 'Nova Origem de Contato'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="origem-nome">Nome *</Label>
              <Input
                id="origem-nome"
                value={origemContatoForm.nome}
                onChange={(e) => setOrigemContatoForm({ ...origemContatoForm, nome: e.target.value })}
                placeholder="Ex: Indicação, Google, LinkedIn..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem-descricao">Descrição</Label>
              <Textarea
                id="origem-descricao"
                value={origemContatoForm.descricao}
                onChange={(e) => setOrigemContatoForm({ ...origemContatoForm, descricao: e.target.value })}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_CATEGORIAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      origemContatoForm.cor === cor ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setOrigemContatoForm({ ...origemContatoForm, cor })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="origem-ativo"
                checked={origemContatoForm.ativo}
                onCheckedChange={(checked) => setOrigemContatoForm({ ...origemContatoForm, ativo: checked })}
              />
              <Label htmlFor="origem-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrigemContatoDialogOpen(false)} disabled={savingOrigemContato}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOrigemContato} disabled={savingOrigemContato}>
              {savingOrigemContato ? 'Salvando...' : editingOrigemContato ? 'Salvar Alterações' : 'Criar Origem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Origem de Contato */}
      <AlertDialog open={deleteOrigemContatoDialogOpen} onOpenChange={setDeleteOrigemContatoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Origem de Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a origem "{origemContatoToDelete?.nome}"? 
              Esta ação não pode ser desfeita. Clientes vinculados a esta origem ficarão sem origem de contato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrigemContatoToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrigemContato}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Nova Permissão */}
      <Dialog open={novaPermissaoDialogOpen} onOpenChange={(open) => {
        setNovaPermissaoDialogOpen(open);
        if (!open) {
          setSelectedSetorAcesso('');
          setGrupoAcessoSelecionado(null);
          setPermissoes([]);
          setEditandoSetor(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoSetor ? 'Editar Permissões' : 'Nova Permissão'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Seletor de Setor */}
            <div className="space-y-2">
              <Label>Selecione o Setor</Label>
              <Select 
                value={selectedSetorAcesso || "none"} 
                onValueChange={(value) => handleSetorAcessoChange(value === "none" ? "" : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um setor para configurar acessos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um setor...</SelectItem>
                  {setoresAcessos.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {setoresAcessos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum setor cadastrado. Cadastre setores na seção "Setores" primeiro.
                </p>
              )}
            </div>

            {/* Grupo de Acesso */}
            <div className="space-y-3">
              <Label>Grupo de Acesso</Label>
              <p className="text-xs text-muted-foreground">
                Selecione um grupo para pré-definir os acessos mínimos. O administrador pode adicionar mais permissões manualmente.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  className={`p-4 border rounded-lg transition-colors text-left ${
                    grupoAcessoSelecionado === 'administrador' 
                      ? 'bg-green-100 border-green-400' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={aplicarGrupoAdministrador}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                      <Shield className="h-4 w-4 text-red-600" />
                    </div>
                    <h4 className="font-semibold">Administrador</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tem acesso total ao sistema e às atividades e relatórios de todos os usuários.
                  </p>
                </button>

                <button
                  type="button"
                  className={`p-4 border rounded-lg transition-colors text-left ${
                    grupoAcessoSelecionado === 'gestor' 
                      ? 'bg-green-100 border-green-400' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={aplicarGrupoGestor}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Gestor</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tem acesso total referente ao seu setor, consegue visualizar as atividades e relatórios de todos os usuários do setor.
                  </p>
                </button>

                <button
                  type="button"
                  className={`p-4 border rounded-lg transition-colors text-left ${
                    grupoAcessoSelecionado === 'colaborador' 
                      ? 'bg-green-100 border-green-400' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={aplicarGrupoColaborador}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <h4 className="font-semibold">Colaborador</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Só tem acesso às atividades que são de sua responsabilidade.
                  </p>
                </button>
              </div>
            </div>

            {/* Lista de Módulos e Permissões */}
            {selectedSetorAcesso && (
              <>
                {loadingPermissoes ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando permissões...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cabeçalho da tabela de permissões */}
                    <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-4 py-2 bg-muted rounded-lg font-medium text-sm">
                      <div>Módulo / Página</div>
                      <div className="text-center flex items-center justify-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>Ver</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1">
                        <Pencil className="h-4 w-4" />
                        <span>Editar</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1">
                        <PlusCircle className="h-4 w-4" />
                        <span>Criar</span>
                      </div>
                    </div>

                    {/* Lista de Módulos */}
                    <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                      {modulosSistema.map((modulo) => (
                        <div key={modulo.id}>
                          {/* Cabeçalho do Módulo com checkboxes para selecionar todos */}
                          <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center">
                            <button
                              type="button"
                              onClick={() => toggleModulo(modulo.id)}
                              className="flex items-center gap-2 text-left"
                            >
                              {expandedModulos.includes(modulo.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">{modulo.nome}</span>
                              <Badge variant="secondary">
                                {modulo.paginas.length} página(s)
                              </Badge>
                            </button>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={isModuloAllChecked(modulo.id, 'visualizar')}
                                onChange={(e) => handleModuloAllChange(modulo.id, 'visualizar', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                title="Selecionar todas as páginas para visualização"
                              />
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={isModuloAllChecked(modulo.id, 'editar')}
                                onChange={(e) => handleModuloAllChange(modulo.id, 'editar', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                title="Selecionar todas as páginas para edição"
                              />
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={isModuloAllChecked(modulo.id, 'criar')}
                                onChange={(e) => handleModuloAllChange(modulo.id, 'criar', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                title="Selecionar todas as páginas para criação"
                              />
                            </div>
                          </div>

                          {/* Páginas do Módulo */}
                          {expandedModulos.includes(modulo.id) && (
                            <div className="bg-muted/30">
                              {modulo.paginas.map((pagina) => {
                                const permissao = getPermissao(modulo.id, pagina.id);
                                return (
                                  <div
                                    key={pagina.id}
                                    className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-4 py-2 pl-10 border-t border-muted items-center"
                                  >
                                    <div className="text-sm">{pagina.nome}</div>
                                    <div className="flex justify-center">
                                      <input
                                        type="checkbox"
                                        checked={permissao?.visualizar || false}
                                        onChange={(e) => handlePermissaoChange(modulo.id, pagina.id, 'visualizar', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                    </div>
                                    <div className="flex justify-center">
                                      <input
                                        type="checkbox"
                                        checked={permissao?.editar || false}
                                        onChange={(e) => handlePermissaoChange(modulo.id, pagina.id, 'editar', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                    </div>
                                    <div className="flex justify-center">
                                      <input
                                        type="checkbox"
                                        checked={permissao?.criar || false}
                                        onChange={(e) => handlePermissaoChange(modulo.id, pagina.id, 'criar', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaPermissaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                await handleSavePermissoes();
                setNovaPermissaoDialogOpen(false);
              }} 
              disabled={savingPermissoes || !selectedSetorAcesso}
            >
              {savingPermissoes ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Logs de Acesso */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Log de Acessos
            </DialogTitle>
            <DialogDescription>
              Visualize todas as atividades dos usuários no sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <LogIn className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{logsStats.totalLogins}</p>
                      <p className="text-xs text-muted-foreground">Logins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{logsStats.totalAcoes}</p>
                      <p className="text-xs text-muted-foreground">Total de Ações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{logsStats.usuariosAtivos}</p>
                      <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Monitor className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{logsStats.dispositivosUnicos}</p>
                      <p className="text-xs text-muted-foreground">Dispositivos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Filtros</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Ação</Label>
                    <Select 
                      value={logsFilter.acao || 'all'} 
                      onValueChange={(v) => setLogsFilter(f => ({ ...f, acao: v === 'all' ? '' : v }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="logout">Logout</SelectItem>
                        <SelectItem value="view">Visualização</SelectItem>
                        <SelectItem value="create">Criação</SelectItem>
                        <SelectItem value="update">Atualização</SelectItem>
                        <SelectItem value="delete">Exclusão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Usuário</Label>
                    <Input 
                      placeholder="Nome ou email..."
                      value={logsFilter.usuario}
                      onChange={(e) => setLogsFilter(f => ({ ...f, usuario: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data Início</Label>
                    <Input 
                      type="date"
                      value={logsFilter.dataInicio}
                      onChange={(e) => setLogsFilter(f => ({ ...f, dataInicio: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data Fim</Label>
                    <Input 
                      type="date"
                      value={logsFilter.dataFim}
                      onChange={(e) => setLogsFilter(f => ({ ...f, dataFim: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={loadAccessLogs} 
                      disabled={loadingLogs}
                      className="h-9"
                    >
                      {loadingLogs ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="ml-2">Buscar</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setLogsFilter({ acao: '', usuario: '', dataInicio: '', dataFim: '', modulo: '' });
                        loadAccessLogs();
                      }}
                      className="h-9"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Logs */}
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="w-[120px]">Ação</TableHead>
                        <TableHead>Módulo/Página</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[100px]">Dispositivo</TableHead>
                        <TableHead className="w-[120px]">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLogs ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground">Carregando logs...</p>
                          </TableCell>
                        </TableRow>
                      ) : accessLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhum log encontrado</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Os logs serão registrados conforme os usuários utilizarem o sistema
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        accessLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{log.user_nome || 'Usuário'}</p>
                                  <p className="text-xs text-muted-foreground">{log.user_email || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getAcaoIcon(log.acao)}
                                <Badge variant="outline" className="text-xs">
                                  {getAcaoLabel(log.acao)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {log.modulo && <span className="font-medium">{log.modulo}</span>}
                                {log.pagina && <span className="text-muted-foreground"> / {log.pagina}</span>}
                                {!log.modulo && !log.pagina && <span className="text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]" title={log.descricao || ''}>
                                {log.descricao || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(log.device_type)}
                                <span className="text-xs capitalize">{log.device_type || 'desktop'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                {log.ip_address || '-'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                Exibindo {accessLogs.length} registros
              </p>
              <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
