import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { useCurrentScreen } from '@/hooks/useCurrentScreen';
import { useModulosAtivos } from '@/hooks/useModulosAtivos';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SSTSidebar } from '@/components/sst/SSTSidebar';
import { SSTClientes } from '@/components/sst/SSTClientes';
import { SSTNormasRegulamentadoras } from '@/components/sst/SSTNormasRegulamentadoras';
import { SSTEmpresasParceiras } from '@/components/sst/SSTEmpresasParceiras';
import { SSTPerfilEmpresa } from '@/components/sst/SSTPerfilEmpresa';
import { SSTMeuPerfil } from '@/components/sst/SSTMeuPerfil';
import { SSTUsuarios } from '@/components/sst/SSTUsuarios';
import { SSTSolicitacoesTreinamentos } from '@/components/sst/SSTSolicitacoesTreinamentos';
import { SSTAgendaTreinamentos } from '@/components/sst/SSTAgendaTreinamentos';
import { SSTProvas } from '@/components/sst/SSTProvas';
import { SSTDeclaracaoReorientacao } from '@/components/sst/SSTDeclaracaoReorientacao';
import GestaoEPI from '@/pages/modulos/GestaoEPI';
import SaudeOcupacional from '@/pages/modulos/SaudeOcupacional';
import GestaoTreinamentos from '@/pages/modulos/GestaoTreinamentos';
import GestaoTerceiros from '@/pages/modulos/GestaoTerceiros';
import GestaoTurmas from '@/pages/modulos/GestaoTurmas';
import CatalogoTreinamentos from '@/pages/modulos/CatalogoTreinamentos';
import MatrizTreinamentos from '@/pages/modulos/MatrizTreinamentos';
import GruposHomogeneos from '@/pages/modulos/GruposHomogeneos';
import Instrutores from '@/pages/modulos/Instrutores';
import AvaliacaoReacao from '@/pages/modulos/AvaliacaoReacao';
import { SSTModeloRelatorio } from '@/components/sst/SSTModeloRelatorio';
import { SSTInformacoesEmpresa } from '@/components/sst/SSTInformacoesEmpresa';
import { SSTConfiguracoes } from '@/components/sst/SSTConfiguracoes';
import { SSTCadastros } from '@/components/sst/SSTCadastros';
import { SSTDashboardGeral } from '@/components/sst/SSTDashboardGeral';
import SuporteTickets from '@/pages/shared/SuporteTickets';
import { 
  ToriqCorpComercial, 
  ToriqCorpAdministrativo, 
  ToriqCorpFinanceiro, 
  ToriqCorpTecnico, 
  ToriqCorpMarketing, 
  ToriqCorpConfiguracoes,
  ToriqCorpContratos,
  FunilKanban,
  ToriqCorpTarefas,
  ToriqCorpControleEquipamentos,
  ToriqCorpControleFrota,
  SSTDRE,
  ToriqCorpDashboard
} from '@/components/sst/toriq-corp';
import { SetorDashboard } from '@/components/sst/toriq-corp/SetorDashboard';
import { ToriqCorpSetores } from '@/components/sst/toriq-corp/ToriqCorpSetores';
import { ToriqCorpFinanceiroCadastros } from '@/components/sst/toriq-corp/ToriqCorpFinanceiroCadastros';
import { ToriqCorpFinanceiroDashboard } from '@/components/sst/toriq-corp/ToriqCorpFinanceiroDashboard';
import { ToriqCorpContasReceber } from '@/components/sst/toriq-corp/ToriqCorpContasReceber';
import { SSTContasPagar } from '@/components/sst/toriq-corp/SSTContasPagar';
import { SSTFluxoCaixa } from '@/components/sst/toriq-corp/SSTFluxoCaixa';
import {
  ToriqEPIDashboard,
  ToriqEPICatalogo,
  ToriqEPIEstoque,
  ToriqEPIEntregas,
  ToriqEPIFicha,
  ToriqEPIDevolucoes,
  ToriqEPIRelatorios
} from '@/components/sst/toriq-epi';
import { ToriqTrainingDashboard } from '@/components/sst/toriq-training';
import { supabase } from '@/integrations/supabase/client';

interface Modulo {
  id: string;
  nome: string;
  icone: string | null;
  rota: string;
}

interface Funil {
  id: string;
  nome: string;
  setor_id: string;
  setor?: { nome: string };
}

interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
}

// Mapeamento de seções para módulos
const SECAO_PARA_MODULO: Record<string, string> = {
  // Toriq Corp
  'toriq-corp-tarefas': 'toriq_corp',
  'toriq-corp-comercial': 'toriq_corp',
  'toriq-corp-contratos': 'toriq_corp',
  'toriq-corp-administrativo': 'toriq_corp',
  'toriq-corp-financeiro': 'toriq_corp',
  'toriq-corp-tecnico': 'toriq_corp',
  'toriq-corp-marketing': 'toriq_corp',
  'toriq-corp-controle-frota': 'toriq_corp',
  'toriq-corp-controle-equipamentos': 'toriq_corp',
  'toriq-corp-configuracoes': 'toriq_corp',
  // Toriq Training
  'toriq-training-dashboard': 'toriq_train',
  'solicitacoes-treinamentos': 'toriq_train',
  'agenda-treinamentos': 'toriq_train',
  'gestao-turmas': 'toriq_train',
  'provas': 'toriq_train',
  'declaracao-reorientacao': 'toriq_train',
  'avaliacao-reacao': 'toriq_train',
  'nr': 'toriq_train',
  'catalogo-treinamentos': 'toriq_train',
  'matriz-treinamentos': 'toriq_train',
  'grupos-homogeneos': 'toriq_train',
  'instrutores': 'toriq_train',
  'empresas-parceiras': 'toriq_train',
  'modelo-relatorio': 'toriq_train',
  // Toriq EPI
  'toriq-epi-dashboard': 'gestao_epi',
  'toriq-epi-catalogo': 'gestao_epi',
  'toriq-epi-estoque': 'gestao_epi',
  'toriq-epi-entregas': 'gestao_epi',
  'toriq-epi-ficha': 'gestao_epi',
  'toriq-epi-devolucoes': 'gestao_epi',
  'toriq-epi-relatorios': 'gestao_epi',
};

const SSTDashboard = () => {
  const { user, profile, empresa, loading } = useAuth();
  const { logView } = useAccessLog();
  const { setCurrentScreen } = useCurrentScreen();
  const { isModuloAtivo, loading: loadingModulosGlobal } = useModulosAtivos();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>(() => {
    // Ler seção inicial da URL se existir
    const sectionFromUrl = searchParams.get('section');
    return sectionFromUrl || 'dashboard-geral';
  });
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  // Sincronizar seção com URL quando mudar via parâmetro
  useEffect(() => {
    const sectionFromUrl = searchParams.get('section');
    if (sectionFromUrl && sectionFromUrl !== activeSection) {
      setActiveSection(sectionFromUrl);
      // NÃO limpar os parâmetros da URL - eles são usados pelos componentes filhos
    }
  }, [searchParams]);

  // Redirecionar para dashboard geral se o módulo da seção atual for desativado
  useEffect(() => {
    if (loadingModulosGlobal) return;
    
    const moduloDaSecao = SECAO_PARA_MODULO[activeSection];
    if (moduloDaSecao && !isModuloAtivo(moduloDaSecao)) {
      // Módulo foi desativado, redirecionar para dashboard geral
      setActiveSection('dashboard-geral');
    }
  }, [activeSection, isModuloAtivo, loadingModulosGlobal]);

  // Atualizar tela atual quando a seção mudar
  useEffect(() => {
    setCurrentScreen(activeSection, 'sst');
  }, [activeSection, setCurrentScreen]);
  const [modulosAtivos, setModulosAtivos] = useState<Modulo[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(true);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [setoresPersonalizados, setSetoresPersonalizados] = useState<Setor[]>([]);

  const empresaIdEfetivo = empresa?.id;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && user && profile) {
      logView('Dashboard', 'SST Dashboard', 'Acessou o painel SST');
    }
  }, [user, loading, navigate, profile]);

  useEffect(() => {
    if (!loading && profile && profile.role !== 'empresa_sst') {
      if (profile.role === 'admin_vertical') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    const fetchModulosAtivos = async () => {
      if (!empresaIdEfetivo) return;

      try {
        const { data, error } = await supabase
          .from('empresas_modulos')
          .select(`
            modulo_id,
            modulos (
              id,
              nome,
              icone,
              rota
            )
          `)
          .eq('empresa_id', empresaIdEfetivo)
          .eq('ativo', true);

        if (error) throw error;

        const modulos = data
          ?.map((item: any) => item.modulos)
          .filter((m: any) => m !== null) as Modulo[];

        setModulosAtivos(modulos || []);
      } catch (error) {
        console.error('Erro ao buscar módulos:', error);
      } finally {
        setLoadingModulos(false);
      }
    };

    if (empresaIdEfetivo) {
      fetchModulosAtivos();
    }
  }, [empresaIdEfetivo]);

  // Carregar funis para navegação
  useEffect(() => {
    const fetchFunis = async () => {
      if (!empresaIdEfetivo) return;

      try {
        const { data, error } = await (supabase as any)
          .from('funis')
          .select('id, nome, setor_id, setor:setores(nome)')
          .eq('empresa_id', empresaIdEfetivo)
          .eq('ativo', true);

        if (error) throw error;
        setFunis(data || []);
      } catch (error) {
        console.error('Erro ao buscar funis:', error);
      }
    };

    if (empresaIdEfetivo) {
      fetchFunis();
    }
  }, [empresaIdEfetivo]);

  // Função para carregar setores
  const fetchSetores = async () => {
    if (!empresaIdEfetivo) return;

    try {
      const { data, error } = await (supabase as any)
        .from('setores')
        .select('id, nome, descricao')
        .eq('empresa_id', empresaIdEfetivo)
        .eq('ativo', true);

      if (error) throw error;
      
      // Filtrar todos os setores exceto Financeiro (que tem página dedicada)
      const setoresDinamicos = (data || []).filter((s: Setor) => 
        s.nome.toLowerCase() !== 'financeiro'
      );
      setSetoresPersonalizados(setoresDinamicos);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    }
  };

  // Carregar todos os setores (exceto Financeiro que tem página dedicada)
  useEffect(() => {
    if (empresaIdEfetivo) {
      fetchSetores();
    }
  }, [empresaIdEfetivo]);

  // Listener para atualizar setores quando são criados/excluídos
  useEffect(() => {
    const handleSetoresUpdate = () => {
      fetchSetores();
    };

    window.addEventListener('setores-updated', handleSetoresUpdate);
    return () => window.removeEventListener('setores-updated', handleSetoresUpdate);
  }, [empresaIdEfetivo]);

  // Mapeamento de setor para section
  const getSetorSection = (setorNome: string | undefined): string => {
    if (!setorNome) return 'toriq-corp-comercial';
    const map: Record<string, string> = {
      'comercial': 'toriq-corp-comercial',
      'administrativo': 'toriq-corp-administrativo',
      'financeiro': 'toriq-corp-financeiro',
      'técnico': 'toriq-corp-tecnico',
      'tecnico': 'toriq-corp-tecnico',
      'marketing': 'toriq-corp-marketing',
    };
    return map[setorNome.toLowerCase()] || 'toriq-corp-comercial';
  };

  const getFunilBackSection = (funilId: string): string => {
    const funil = funis.find(f => f.id === funilId);
    if (funil?.setor_id) {
      // Verificar se é um setor padrão mapeado
      const setorNome = funil.setor?.nome?.toLowerCase();
      const setoresPadrao = ['comercial', 'administrativo', 'financeiro', 'técnico', 'tecnico', 'marketing'];
      if (setorNome && setoresPadrao.includes(setorNome)) {
        return getSetorSection(funil.setor.nome);
      }
      // Setor personalizado - retornar setor-{id}
      return `setor-${funil.setor_id}`;
    }
    return 'toriq-corp-comercial';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canAccess = profile?.role === 'empresa_sst';
  
  if (!profile || !canAccess) {
    return null;
  }

  const renderModuloComponent = (rota: string) => {
    switch (rota) {
      case '/modulos/gestao-epi':
        return <GestaoEPI />;
      case '/modulos/saude-ocupacional':
        return <SaudeOcupacional />;
      case '/modulos/treinamentos':
        return <GestaoTreinamentos />;
      case '/modulos/terceiros':
        return <GestaoTerceiros />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Módulo não encontrado
          </div>
        );
    }
  };

  const renderSection = () => {
    // Dashboard Geral - Tela padrão
    if (activeSection === 'dashboard-geral') {
      return <SSTDashboardGeral onNavigate={setActiveSection} modulosAtivos={modulosAtivos} />;
    }

    if (activeSection === 'clientes') {
      return <SSTClientes />;
    }

    if (activeSection === 'nr') {
      return <SSTNormasRegulamentadoras />;
    }

    if (activeSection === 'catalogo-treinamentos') {
      return <CatalogoTreinamentos />;
    }

    if (activeSection === 'matriz-treinamentos') {
      return <MatrizTreinamentos />;
    }

    if (activeSection === 'grupos-homogeneos') {
      return <GruposHomogeneos />;
    }

    if (activeSection === 'instrutores') {
      return <Instrutores />;
    }

    if (activeSection === 'empresas-parceiras') {
      return <SSTEmpresasParceiras />;
    }

    if (activeSection === 'perfil-empresa') {
      return <SSTPerfilEmpresa />;
    }

    if (activeSection === 'meu-perfil') {
      return <SSTMeuPerfil />;
    }

    if (activeSection === 'usuarios') {
      return <SSTUsuarios />;
    }

    if (activeSection === 'solicitacoes-treinamentos') {
      return <SSTSolicitacoesTreinamentos />;
    }

    if (activeSection === 'agenda-treinamentos') {
      return <SSTAgendaTreinamentos />;
    }

    if (activeSection === 'gestao-turmas') {
      const searchFromUrl = searchParams.get('search') || '';
      return <GestaoTurmas initialSearch={searchFromUrl} />;
    }

    if (activeSection === 'provas') {
      return <SSTProvas />;
    }

    if (activeSection === 'declaracao-reorientacao') {
      return <SSTDeclaracaoReorientacao />;
    }

    if (activeSection === 'avaliacao-reacao') {
      return <AvaliacaoReacao />;
    }

    if (activeSection === 'modelo-relatorio') {
      return <SSTModeloRelatorio />;
    }

    
    if (activeSection === 'informacoes-empresa') {
      return <SSTInformacoesEmpresa />;
    }

    if (activeSection === 'configuracoes') {
      return <SSTConfiguracoes />;
    }

    // Configurações com seção específica (ex: configuracoes-aparencia, configuracoes-atalhos)
    if (activeSection.startsWith('configuracoes-')) {
      const configSection = activeSection.replace('configuracoes-', '');
      return <SSTConfiguracoes initialSection={configSection} />;
    }

    if (activeSection === 'cadastros') {
      return <SSTCadastros />;
    }

    if (activeSection === 'suporte') {
      return <SuporteTickets />;
    }

    // ========== TORIQ CORP ==========
    if (activeSection === 'toriq-corp-dashboard') {
      return <ToriqCorpDashboard onNavigate={setActiveSection} />;
    }

    if (activeSection === 'toriq-corp-tarefas') {
      return <ToriqCorpTarefas onNavigate={(section, cardId) => {
        if (cardId) setPendingCardId(cardId);
        setActiveSection(section);
      }} />;
    }

    if (activeSection === 'toriq-corp-contratos') {
      return <ToriqCorpContratos />;
    }

    if (activeSection === 'toriq-corp-financeiro') {
      return <ToriqCorpFinanceiro onNavigate={(section) => setActiveSection(section)} />;
    }

    if (activeSection === 'toriq-corp-financeiro-dashboard') {
      return <ToriqCorpFinanceiroDashboard />;
    }

    if (activeSection === 'toriq-corp-financeiro-cadastros') {
      return <ToriqCorpFinanceiroCadastros />;
    }

    if (activeSection === 'toriq-corp-contas-receber') {
      return <ToriqCorpContasReceber />;
    }

    if (activeSection === 'toriq-corp-contas-pagar') {
      return <SSTContasPagar />;
    }

    if (activeSection === 'toriq-corp-fluxo-caixa') {
      return <SSTFluxoCaixa />;
    }

    if (activeSection === 'toriq-corp-dre') {
      return <SSTDRE />;
    }

    if (activeSection === 'toriq-corp-configuracoes') {
      return <ToriqCorpConfiguracoes />;
    }

    if (activeSection === 'toriq-corp-controle-equipamentos') {
      return <ToriqCorpControleEquipamentos />;
    }

    if (activeSection === 'toriq-corp-controle-frota') {
      return <ToriqCorpControleFrota />;
    }

    // ========== SETORES PADRÃO DO TORIQ CORP ==========
    if (activeSection === 'toriq-corp-comercial') {
      return (
        <ToriqCorpComercial 
          onNavigateToFunil={(funilId) => setActiveSection(`funil-${funilId}`)}
          onBack={() => setActiveSection('toriq-corp-setores')}
        />
      );
    }

    if (activeSection === 'toriq-corp-administrativo') {
      return (
        <ToriqCorpAdministrativo 
          onNavigateToFunil={(funilId) => setActiveSection(`funil-${funilId}`)}
          onBack={() => setActiveSection('toriq-corp-setores')}
        />
      );
    }

    if (activeSection === 'toriq-corp-tecnico') {
      return (
        <ToriqCorpTecnico 
          onNavigateToFunil={(funilId) => setActiveSection(`funil-${funilId}`)}
          onBack={() => setActiveSection('toriq-corp-setores')}
        />
      );
    }

    if (activeSection === 'toriq-corp-marketing') {
      return (
        <ToriqCorpMarketing 
          onNavigateToFunil={(funilId) => setActiveSection(`funil-${funilId}`)}
          onBack={() => setActiveSection('toriq-corp-setores')}
        />
      );
    }

    // ========== PÁGINA SETORES (lista todos os setores) ==========
    if (activeSection === 'toriq-corp-setores') {
      return (
        <ToriqCorpSetores 
          onNavigateToSetor={(setorId) => setActiveSection(`setor-${setorId}`)} 
        />
      );
    }

    // ========== TORIQ TRAINING ==========
    if (activeSection === 'toriq-training-dashboard') {
      return <ToriqTrainingDashboard onNavigate={setActiveSection} />;
    }

    // ========== TORIQ EPI ==========
    if (activeSection === 'toriq-epi-dashboard') {
      return <ToriqEPIDashboard />;
    }

    if (activeSection === 'toriq-epi-catalogo') {
      return <ToriqEPICatalogo />;
    }

    if (activeSection === 'toriq-epi-estoque') {
      return <ToriqEPIEstoque />;
    }

    if (activeSection === 'toriq-epi-entregas') {
      return <ToriqEPIEntregas />;
    }

    if (activeSection === 'toriq-epi-ficha') {
      return <ToriqEPIFicha />;
    }

    if (activeSection === 'toriq-epi-devolucoes') {
      return <ToriqEPIDevolucoes />;
    }

    if (activeSection === 'toriq-epi-relatorios') {
      return <ToriqEPIRelatorios />;
    }

    // ========== SETORES PERSONALIZADOS ==========
    if (activeSection.startsWith('setor-')) {
      const setorId = activeSection.replace('setor-', '');
      const setor = setoresPersonalizados.find(s => s.id === setorId);
      if (setor) {
        return (
          <SetorDashboard
            titulo={setor.nome}
            descricao={setor.descricao || `Gestão do setor ${setor.nome}`}
            setorNome={setor.nome}
            icon={Briefcase}
            onNavigateToFunil={(funilId) => setActiveSection(`funil-${funilId}`)}
            onBack={() => setActiveSection('toriq-corp-setores')}
          />
        );
      } else {
        // Setor foi excluído, redirecionar para clientes
        setActiveSection('clientes');
        return null;
      }
    }

    // ========== FUNIS DINÂMICOS ==========
    if (activeSection.startsWith('funil-')) {
      const funilId = activeSection.replace('funil-', '');
      const backSection = getFunilBackSection(funilId);
      return (
        <FunilKanban 
          funilId={funilId} 
          onBack={() => setActiveSection(backSection)}
          initialCardId={pendingCardId}
          onCardOpened={() => setPendingCardId(null)}
        />
      );
    }

    // Verificar se é um módulo ativo
    const modulo = modulosAtivos.find(m => m.id === activeSection);
    if (modulo) {
      return renderModuloComponent(modulo.rota);
    }

    return <SSTClientes />;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <div className="flex flex-1">
          <SSTSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
            modulosAtivos={modulosAtivos}
            loadingModulos={loadingModulos}
          />
          <main className="flex-1 p-6 overflow-auto">
            {renderSection()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SSTDashboard;
