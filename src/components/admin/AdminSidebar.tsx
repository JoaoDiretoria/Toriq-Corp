import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { Building2, Users, TrendingUp, DollarSign, LogOut, Shield, Package, ChevronDown, UserSearch, Zap, LayoutDashboard, UserCog, HeartHandshake, ClipboardList, Receipt, CreditCard, FileBarChart, Wallet, CheckSquare, BarChart3, Database, Headphones, PenTool, FileText, Mail, Briefcase } from 'lucide-react';
import { NotificationPopover } from '@/components/shared/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type AdminSection = 'dashboard' | 'empresas' | 'usuarios' | 'colaboradores' | 'servicos' | 'modulos' | 'tarefas' | 'comercial-dashboard' | 'comercial' | 'comercial-prospeccao' | 'comercial-pos-venda' | 'comercial-cross-selling' | 'financeiro' | 'financeiro-dashboard' | 'financeiro-cadastros' | 'financeiro-contas-receber' | 'financeiro-contas-pagar' | 'financeiro-fluxo-caixa' | 'financeiro-dre' | 'estatisticas' | 'suporte' | 'conteudo-blogs' | 'conteudo-pesquisas' | 'conteudo-newsletter' | 'conteudo-vagas';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const menuItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'usuarios' as const, label: 'Usuários', icon: Users },
  { id: 'colaboradores' as const, label: 'Colaboradores', icon: UserCog },
  { id: 'servicos' as const, label: 'Serviços', icon: Package },
  { id: 'modulos' as const, label: 'Módulos', icon: Shield },
  { id: 'suporte' as const, label: 'Suporte', icon: Headphones },
];

const empresasSubItems = [
  { id: 'empresas' as const, label: 'Empresas', icon: Building2 },
];

const comercialSubItems = [
  { id: 'comercial-dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'comercial' as const, label: 'Funil - CLOSER', icon: TrendingUp },
  { id: 'comercial-prospeccao' as const, label: 'Prospecção (SDR)', icon: UserSearch },
  { id: 'comercial-pos-venda' as const, label: 'Onboarding', icon: HeartHandshake },
  { id: 'comercial-cross-selling' as const, label: 'CS / Cross-selling', icon: Zap },
];

const financeiroSubItems = [
  { id: 'financeiro-dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'financeiro-cadastros' as const, label: 'Cadastros', icon: ClipboardList },
  { id: 'financeiro-contas-receber' as const, label: 'Contas a Receber', icon: Receipt },
  { id: 'financeiro-contas-pagar' as const, label: 'Contas a Pagar', icon: CreditCard },
  { id: 'financeiro-fluxo-caixa' as const, label: 'Fluxo de Caixa', icon: Wallet },
  { id: 'financeiro-dre' as const, label: 'DRE', icon: FileBarChart },
];

const conteudoSubItems = [
  { id: 'conteudo-blogs' as const, label: 'Blogs', icon: FileText },
  { id: 'conteudo-pesquisas' as const, label: 'Pesquisas de Opinião', icon: ClipboardList },
  { id: 'conteudo-newsletter' as const, label: 'Newsletter', icon: Mail },
  { id: 'conteudo-vagas' as const, label: 'Vagas', icon: Briefcase },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 items-center justify-center">
              <img src="/IDTORIQCOMPLETA/LOGO%20PNG/PRETA-HORIZONTAL.png" alt="TORIQ" className="h-10 w-auto" />
            </div>
          </div>
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
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="cursor-pointer">
                      <Building2 className="h-4 w-4" />
                      <span>Gestão Empresa TORIQ</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Dashboard */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => onSectionChange('dashboard')}
                          isActive={activeSection === 'dashboard'}
                          className="cursor-pointer"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Dashboard</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      
                      {/* Empresas com submenu */}
                      <Collapsible defaultOpen className="group/empresas">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton className="cursor-pointer">
                              <Building2 className="h-4 w-4" />
                              <span>Empresas</span>
                              <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/empresas:rotate-180" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-4 border-l pl-2">
                              {empresasSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onSectionChange(subItem.id)}
                                    isActive={activeSection === subItem.id}
                                    className="cursor-pointer text-xs"
                                  >
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
                      
                      {/* Outros itens do menu */}
                      {menuItems.filter(item => item.id !== 'dashboard').map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton
                            onClick={() => onSectionChange(item.id)}
                            isActive={activeSection === item.id}
                            className="cursor-pointer"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}

                      {/* Tarefas - abaixo de Módulos */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => onSectionChange('tarefas')}
                          isActive={activeSection === 'tarefas'}
                          className="cursor-pointer"
                        >
                          <CheckSquare className="h-4 w-4" />
                          <span>Tarefas</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      
                      {/* Comercial com submenu */}
                      <Collapsible defaultOpen className="group/comercial">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton className="cursor-pointer">
                              <TrendingUp className="h-4 w-4" />
                              <span>Comercial</span>
                              <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/comercial:rotate-180" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-4 border-l pl-2">
                              {comercialSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onSectionChange(subItem.id)}
                                    isActive={activeSection === subItem.id}
                                    className="cursor-pointer text-xs"
                                  >
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>

                      {/* Financeiro com submenu */}
                      <Collapsible defaultOpen className="group/financeiro">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton className="cursor-pointer">
                              <DollarSign className="h-4 w-4" />
                              <span>Financeiro</span>
                              <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/financeiro:rotate-180" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-4 border-l pl-2">
                              {financeiroSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onSectionChange(subItem.id)}
                                    isActive={activeSection === subItem.id}
                                    className="cursor-pointer text-xs"
                                  >
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>

                      {/* Criação de Conteúdo com submenu */}
                      <Collapsible defaultOpen className="group/conteudo">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton className="cursor-pointer">
                              <PenTool className="h-4 w-4" />
                              <span>Conteúdo</span>
                              <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/conteudo:rotate-180" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-4 border-l pl-2">
                              {conteudoSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => onSectionChange(subItem.id)}
                                    isActive={activeSection === subItem.id}
                                    className="cursor-pointer text-xs"
                                  >
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>

                      {/* Estatísticas do Sistema */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => onSectionChange('estatisticas')}
                          isActive={activeSection === 'estatisticas'}
                          className="cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Estatísticas do Sistema</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
