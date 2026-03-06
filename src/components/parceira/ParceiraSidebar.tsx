import { LogOut, Building2, UserCheck, User, Calendar, Headphones, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEmpresaWhiteLabel } from '@/hooks/useWhiteLabel';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

type ParceiraSection = 'inicio' | 'instrutores' | 'agenda' | 'meu-perfil' | 'suporte';

interface ParceiraSidebarProps {
  activeSection: string;
  onSectionChange: (section: ParceiraSection) => void;
}

export function ParceiraSidebar({ activeSection, onSectionChange }: ParceiraSidebarProps) {
  const { profile, empresa, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config: whiteLabelConfig } = useEmpresaWhiteLabel(empresa?.id);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate('/auth');
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          {whiteLabelConfig?.logoUrl ? (
            <img 
              src={whiteLabelConfig.logoUrl} 
              alt="Logo" 
              className="h-10 w-auto object-contain" 
            />
          ) : (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Painel Parceiro</h2>
            <p className="text-sm text-muted-foreground truncate">{empresa?.nome || 'Empresa não vinculada'}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Início */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSectionChange('inicio')}
                  isActive={activeSection === 'inicio'}
                  className="cursor-pointer"
                >
                  <Home className="h-4 w-4" />
                  <span>Início</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Instrutores */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSectionChange('instrutores')}
                  isActive={activeSection === 'instrutores'}
                  className="cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Instrutores</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Agenda */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSectionChange('agenda')}
                  isActive={activeSection === 'agenda'}
                  className="cursor-pointer"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Agenda</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Meu Perfil */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSectionChange('meu-perfil')}
                  isActive={activeSection === 'meu-perfil'}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Meu Perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Suporte */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSectionChange('suporte')}
                  isActive={activeSection === 'suporte'}
                  className="cursor-pointer"
                >
                  <Headphones className="h-4 w-4" />
                  <span>Suporte</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
