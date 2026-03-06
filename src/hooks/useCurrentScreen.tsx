import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MODULOS_CONFIG } from '@/config/modulosTelas';

interface ScreenInfo {
  moduloId: string;
  moduloNome: string;
  telaId: string;
  telaNome: string;
  painel: string; // 'admin' | 'sst' | 'cliente' | 'instrutor' | 'parceira'
}

interface CurrentScreenContextType {
  screenInfo: ScreenInfo;
  setCurrentScreen: (telaId: string, painel?: string, telaNomeOverride?: string) => void;
}

const defaultScreenInfo: ScreenInfo = {
  moduloId: '',
  moduloNome: 'Não identificado',
  telaId: '',
  telaNome: 'Não identificada',
  painel: '',
};

const CurrentScreenContext = createContext<CurrentScreenContextType>({
  screenInfo: defaultScreenInfo,
  setCurrentScreen: () => {},
});

export function CurrentScreenProvider({ children }: { children: ReactNode }) {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(defaultScreenInfo);

  const setCurrentScreen = useCallback((telaId: string, painel: string = '', telaNomeOverride?: string) => {
    // Buscar módulo e tela pelo ID
    let moduloEncontrado = '';
    let moduloNome = 'Não identificado';
    let telaNome = telaNomeOverride || telaId || 'Não identificada';

    // Procurar em MODULOS_CONFIG
    for (const modulo of MODULOS_CONFIG) {
      // Verificar telas principais
      for (const tela of modulo.telas) {
        if (tela.id === telaId) {
          moduloEncontrado = modulo.id;
          moduloNome = modulo.nome;
          if (!telaNomeOverride) telaNome = tela.nome;
          break;
        }
        // Verificar subTelas
        if (tela.subTelas) {
          for (const subTela of tela.subTelas) {
            if (subTela.id === telaId) {
              moduloEncontrado = modulo.id;
              moduloNome = modulo.nome;
              if (!telaNomeOverride) telaNome = subTela.nome;
              break;
            }
          }
        }
      }
      if (moduloEncontrado) break;
    }

    // Fallback: tentar identificar pelo prefixo do telaId
    if (!moduloEncontrado && telaId) {
      if (telaId.startsWith('toriq-corp-')) {
        moduloEncontrado = 'toriq_corp';
        moduloNome = 'Toriq Corp';
        if (!telaNomeOverride) {
          telaNome = telaId
            .replace('toriq-corp-', '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      } else if (['meu-perfil', 'cadastros', 'configuracoes', 'suporte'].includes(telaId)) {
        moduloEncontrado = 'perfil_empresa';
        moduloNome = 'Perfil da Empresa';
        if (!telaNomeOverride) {
          const nomes: Record<string, string> = {
            'meu-perfil': 'Meu Perfil',
            'cadastros': 'Cadastros',
            'configuracoes': 'Configurações',
            'suporte': 'Suporte',
          };
          telaNome = nomes[telaId] || telaId;
        }
      } else if (['inicio', 'turmas', 'agenda', 'perfil', 'gestao-turmas', 'indisponibilidade', 'suporte'].includes(telaId) && (painel === 'instrutor' || !painel)) {
        // Telas do Portal do Instrutor
        moduloEncontrado = 'portal_instrutor';
        moduloNome = 'Portal do Instrutor';
        if (!telaNomeOverride) {
          const nomes: Record<string, string> = {
            'inicio': 'Início',
            'turmas': 'Gestão de Turmas',
            'gestao-turmas': 'Gestão de Turmas',
            'agenda': 'Agenda de Treinamentos',
            'indisponibilidade': 'Solicitar Indisponibilidade',
            'perfil': 'Meu Perfil',
            'suporte': 'Suporte',
          };
          telaNome = nomes[telaId] || telaId;
        }
      } else if (['dashboard', 'empresas', 'usuarios', 'modulos', 'estatisticas'].includes(telaId)) {
        // Telas do Admin
        moduloEncontrado = 'admin';
        moduloNome = 'Painel Admin';
        if (!telaNomeOverride) {
          const nomes: Record<string, string> = {
            'dashboard': 'Dashboard',
            'empresas': 'Empresas',
            'usuarios': 'Usuários',
            'modulos': 'Módulos',
            'estatisticas': 'Estatísticas',
          };
          telaNome = nomes[telaId] || telaId;
        }
      } else if (['instrutores', 'lista-turmas', 'meu-perfil', 'agenda', 'suporte'].includes(telaId) && painel === 'parceira') {
        // Telas do Portal Parceiro
        moduloEncontrado = 'portal_parceiro';
        moduloNome = 'Portal Parceiro';
        if (!telaNomeOverride) {
          const nomes: Record<string, string> = {
            'instrutores': 'Instrutores',
            'lista-turmas': 'Lista de Turmas',
            'agenda': 'Agenda',
            'meu-perfil': 'Meu Perfil',
            'suporte': 'Suporte',
          };
          telaNome = nomes[telaId] || telaId;
        }
      } else if (['modulos', 'financeiro', 'perfil', 'colaboradores', 'setores', 'cargos', 'solicitacao-treinamento', 'meu-perfil', 'turmas', 'relatorios-certificados', 'controle-validade', 'suporte'].includes(telaId) && painel === 'cliente') {
        // Telas do Portal do Cliente
        moduloEncontrado = 'portal_cliente';
        moduloNome = 'Portal do Cliente';
        if (!telaNomeOverride) {
          const nomes: Record<string, string> = {
            'modulos': 'Módulos',
            'financeiro': 'Financeiro',
            'perfil': 'Perfil da Empresa',
            'colaboradores': 'Colaboradores',
            'setores': 'Setores',
            'cargos': 'Cargos',
            'solicitacao-treinamento': 'Solicitação de Treinamento',
            'meu-perfil': 'Meu Perfil',
            'turmas': 'Turmas',
            'relatorios-certificados': 'Relatórios e Certificados',
            'controle-validade': 'Controle de Validade',
            'suporte': 'Suporte',
          };
          telaNome = nomes[telaId] || telaId;
        }
      }
    }

    // Identificar painel se não fornecido
    let painelFinal = painel;
    if (!painelFinal) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/admin')) painelFinal = 'admin';
        else if (path.includes('/sst')) painelFinal = 'sst';
        else if (path.includes('/cliente')) painelFinal = 'cliente';
        else if (path.includes('/instrutor')) painelFinal = 'instrutor';
        else if (path.includes('/parceira')) painelFinal = 'parceira';
      }
    }

    setScreenInfo({
      moduloId: moduloEncontrado,
      moduloNome,
      telaId,
      telaNome,
      painel: painelFinal,
    });
  }, []);

  return (
    <CurrentScreenContext.Provider value={{ screenInfo, setCurrentScreen }}>
      {children}
    </CurrentScreenContext.Provider>
  );
}

export function useCurrentScreen() {
  return useContext(CurrentScreenContext);
}
