import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  LogOut,
  Shield,
  Package,
  ChevronDown,
  UserSearch,
  Zap,
  LayoutDashboard,
  UserCog,
  HeartHandshake,
  ClipboardList,
  Receipt,
  CreditCard,
  FileBarChart,
  Wallet,
  CheckSquare,
  BarChart3,
  Headphones,
  PenTool,
  FileText,
  Mail,
  Briefcase,
  CalendarDays,
  Megaphone,
  Layers,
  Tags,
  Radar,
  Send,
  Bot,
  KanbanSquare,
  type LucideIcon,
} from 'lucide-react';
import { NotificationPopover } from '@/components/shared/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type AdminSection =
  | 'dashboard'
  | 'empresas'
  | 'usuarios'
  | 'colaboradores'
  | 'servicos'
  | 'modulos'
  | 'tarefas'
  | 'agenda'
  | 'comercial-dashboard'
  | 'comercial'
  | 'comercial-prospeccao'
  | 'comercial-pos-venda'
  | 'comercial-cross-selling'
  | 'financeiro'
  | 'financeiro-dashboard'
  | 'financeiro-cadastros'
  | 'financeiro-contas-receber'
  | 'financeiro-contas-pagar'
  | 'financeiro-fluxo-caixa'
  | 'financeiro-dre'
  | 'estatisticas'
  | 'suporte'
  | 'conteudo-blogs'
  | 'conteudo-pesquisas'
  | 'conteudo-newsletter'
  | 'conteudo-vagas'
  | 'vendas-prospeccao'
  | 'vendas-leads'
  | 'vendas-pipeline'
  | 'vendas-segmentacao'
  | 'vendas-tags'
  | 'vendas-disparo'
  | 'vendas-sdr'
  | 'vendas-uso';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

interface NavItem {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Estrutura de navegação — cada grupo é um colapsável de PRIMEIRO nível (só um
// nível de indentação para os itens, evitando que o texto seja cortado).
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'gestao',
    label: 'Gestão Empresa TORIQ',
    icon: Building2,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'empresas', label: 'Empresas', icon: Building2 },
      { id: 'usuarios', label: 'Usuários', icon: Users },
      { id: 'colaboradores', label: 'Colaboradores', icon: UserCog },
      { id: 'servicos', label: 'Serviços', icon: Package },
      { id: 'modulos', label: 'Módulos', icon: Shield },
      { id: 'suporte', label: 'Suporte', icon: Headphones },
      { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
      { id: 'agenda', label: 'Agenda', icon: CalendarDays },
      { id: 'estatisticas', label: 'Estatísticas do Sistema', icon: BarChart3 },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: TrendingUp,
    items: [
      { id: 'comercial-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'comercial', label: 'Funil - CLOSER', icon: TrendingUp },
      { id: 'comercial-prospeccao', label: 'Prospecção (SDR)', icon: UserSearch },
      { id: 'comercial-pos-venda', label: 'Onboarding', icon: HeartHandshake },
      { id: 'comercial-cross-selling', label: 'CS / Cross-selling', icon: Zap },
    ],
  },
  {
    id: 'vendas',
    label: 'Toriq Vendas',
    icon: Megaphone,
    items: [
      { id: 'vendas-prospeccao', label: 'Prospecção', icon: Radar },
      { id: 'vendas-leads', label: 'Leads Captados', icon: Users },
      { id: 'vendas-pipeline', label: 'Pipeline & Conversas', icon: KanbanSquare },
      { id: 'vendas-disparo', label: 'Disparo em Massa', icon: Send },
      { id: 'vendas-sdr', label: 'SDR Inteligente', icon: Bot },
      { id: 'vendas-segmentacao', label: 'Segmentação', icon: Layers },
      { id: 'vendas-tags', label: 'Tags', icon: Tags },
      { id: 'vendas-uso', label: 'Uso & Contratação', icon: BarChart3 },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    items: [
      { id: 'financeiro-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'financeiro-cadastros', label: 'Cadastros', icon: ClipboardList },
      { id: 'financeiro-contas-receber', label: 'Contas a Receber', icon: Receipt },
      { id: 'financeiro-contas-pagar', label: 'Contas a Pagar', icon: CreditCard },
      { id: 'financeiro-fluxo-caixa', label: 'Fluxo de Caixa', icon: Wallet },
      { id: 'financeiro-dre', label: 'DRE', icon: FileBarChart },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    icon: PenTool,
    items: [
      { id: 'conteudo-blogs', label: 'Blogs', icon: FileText },
      { id: 'conteudo-pesquisas', label: 'Pesquisas de Opinião', icon: ClipboardList },
      { id: 'conteudo-newsletter', label: 'Newsletter', icon: Mail },
      { id: 'conteudo-vagas', label: 'Vagas', icon: Briefcase },
    ],
  },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  // Grupo que contém a tela ativa — único que começa aberto.
  const grupoAtivo =
    NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeSection))?.id ??
    'gestao';

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          <img
            src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png"
            alt="TORIQ"
            className="h-9 w-auto shrink-0"
          />
          <NotificationPopover
            onNotificacaoClick={(notificacao) => {
              if (notificacao.tela) {
                onSectionChange(notificacao.tela as AdminSection);
              }
            }}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV_GROUPS.map((grupo) => (
                <Collapsible
                  key={grupo.id}
                  defaultOpen={grupo.id === grupoAtivo}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="cursor-pointer font-medium">
                        <grupo.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{grupo.label}</span>
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mr-0 gap-0.5">
                        {grupo.items.map((item) => (
                          <SidebarMenuSubItem key={item.id}>
                            <SidebarMenuSubButton
                              onClick={() => onSectionChange(item.id)}
                              isActive={activeSection === item.id}
                              className="cursor-pointer"
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
