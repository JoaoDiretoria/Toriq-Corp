// Mapeamento de todas as telas disponíveis em cada módulo
// Usado para controle granular de acesso por empresa
// IMPORTANTE: Apenas módulos que existem na sidebar devem estar aqui

import { 
  Building2, User, Settings, FolderPlus,
  Briefcase, CheckSquare, TrendingUp, FileSignature, ClipboardList, DollarSign, Wrench, Megaphone, HardHat, Receipt, Wallet, FileText, GitBranch,
  GraduationCap, CalendarDays, FileCheck, BookOpen, Grid3X3, Users, ListChecks, UserCheck, Building
} from 'lucide-react';

export interface TelaMódulo {
  id: string;
  nome: string;
  icone: string;
  descricao?: string;
  subTelas?: TelaMódulo[];
}

export interface ModuloConfig {
  id: string;
  nome: string;
  icone: string;
  descricao?: string;
  telas: TelaMódulo[];
}

// Mapeamento de nomes de módulos do banco para IDs usados no código
export const MODULO_NOME_PARA_CODIGO: Record<string, string> = {
  'Toriq Training': 'toriq_train',
  'Gestão de Treinamentos': 'toriq_train',
  'Toriq Corp': 'toriq_corp',
  'Toriq EPI': 'gestao_epi',
  'Gestão de EPI': 'gestao_epi',
};

// Configuração completa de módulos e suas telas
export const MODULOS_CONFIG: ModuloConfig[] = [
  {
    id: 'perfil_empresa',
    nome: 'Perfil da Empresa',
    icone: 'Building2',
    telas: [
      { id: 'dashboard-geral', nome: 'Dashboard Geral', icone: 'TrendingUp' },
      { id: 'meu-perfil', nome: 'Meu Perfil', icone: 'User' },
      { id: 'cadastros', nome: 'Cadastro', icone: 'FolderPlus' },
      { id: 'clientes', nome: 'Clientes', icone: 'Users' },
      { id: 'colaboradores', nome: 'Colaboradores', icone: 'UsersRound' },
      { id: 'configuracoes', nome: 'Configurações', icone: 'Settings' },
      { id: 'suporte', nome: 'Suporte', icone: 'Headphones' },
    ]
  },
  {
    id: 'toriq_corp',
    nome: 'Toriq Corp',
    icone: 'Briefcase',
    telas: [
      { id: 'toriq-corp-dashboard', nome: 'Dashboard Corp', icone: 'TrendingUp' },
      { id: 'toriq-corp-tarefas', nome: 'Tarefas', icone: 'CheckSquare' },
      { id: 'toriq-corp-contratos', nome: 'Contratos', icone: 'FileSignature' },
      { id: 'toriq-corp-setores', nome: 'Setores', icone: 'Building' },
      { 
        id: 'toriq-corp-financeiro', 
        nome: 'Financeiro', 
        icone: 'DollarSign',
        descricao: 'Gestão financeira completa',
        subTelas: [
          { id: 'toriq-corp-financeiro-dashboard', nome: 'Dashboard Financeiro', icone: 'TrendingUp' },
          { id: 'toriq-corp-financeiro-cadastros', nome: 'Cadastros Financeiros', icone: 'ClipboardList' },
          { id: 'toriq-corp-contas-receber', nome: 'Contas a Receber', icone: 'Receipt' },
          { id: 'toriq-corp-contas-pagar', nome: 'Contas a Pagar', icone: 'Receipt' },
          { id: 'toriq-corp-fluxo-caixa', nome: 'Fluxo de Caixa', icone: 'Wallet' },
          { id: 'toriq-corp-dre', nome: 'DRE', icone: 'FileText' },
        ]
      },
      { id: 'toriq-corp-controle-frota', nome: 'Controle da Frota', icone: 'Car' },
      { id: 'toriq-corp-controle-equipamentos', nome: 'Controle de Equipamentos', icone: 'HardHat' },
      { id: 'toriq-corp-configuracoes', nome: 'Configurações Corp', icone: 'Settings' },
    ]
  },
  {
    id: 'toriq_train',
    nome: 'Toriq Training',
    icone: 'GraduationCap',
    descricao: 'Gestão completa de treinamentos e capacitações',
    telas: [
      { id: 'toriq-training-dashboard', nome: 'Dashboard Training', icone: 'TrendingUp' },
      { id: 'solicitacoes-treinamentos', nome: 'Solicitação de Treinamento', icone: 'ClipboardList' },
      { id: 'agenda-treinamentos', nome: 'Agenda de Treinamentos', icone: 'CalendarDays' },
      { id: 'gestao-turmas', nome: 'Gestão de Turmas', icone: 'FileCheck' },
      { 
        id: 'cadastros-training', 
        nome: 'Cadastros Training', 
        icone: 'FolderPlus',
        descricao: 'Cadastros do módulo de treinamentos',
        subTelas: [
          { id: 'nr', nome: 'NR', icone: 'FileText' },
          { id: 'catalogo-treinamentos', nome: 'Treinamentos', icone: 'BookOpen' },
          { id: 'matriz-treinamentos', nome: 'Matriz de Treinamentos', icone: 'Grid3X3' },
          { id: 'grupos-homogeneos', nome: 'Grupo Homogêneo', icone: 'Users' },
          { id: 'declaracao-reorientacao', nome: 'Declaração de Reorientação', icone: 'FileText' },
          { id: 'modelo-relatorio', nome: 'Modelo Relatório', icone: 'FileText' },
          { id: 'avaliacao-reacao', nome: 'Avaliação de Reação', icone: 'ClipboardList' },
          { id: 'provas', nome: 'Provas', icone: 'ListChecks' },
          { id: 'instrutores', nome: 'Instrutores', icone: 'UserCheck' },
          { id: 'empresas-parceiras', nome: 'Empresas Parceiras', icone: 'Building' },
        ]
      },
    ]
  },
  {
    id: 'gestao_epi',
    nome: 'Toriq EPI',
    icone: 'Shield',
    descricao: 'Gestão completa de Equipamentos de Proteção Individual',
    telas: [
      { id: 'toriq-epi-dashboard', nome: 'Dashboard EPI', icone: 'TrendingUp' },
      { id: 'toriq-epi-catalogo', nome: 'Cadastro de EPI', icone: 'Package' },
      { id: 'toriq-epi-estoque', nome: 'Estoque', icone: 'ClipboardList' },
      { id: 'toriq-epi-entregas', nome: 'Entregas', icone: 'FileCheck' },
      { id: 'toriq-epi-ficha', nome: 'Ficha de EPI', icone: 'FileText' },
      { id: 'toriq-epi-devolucoes', nome: 'Devoluções', icone: 'UsersRound' },
      { id: 'toriq-epi-relatorios', nome: 'Relatórios', icone: 'FileText' },
    ]
  },
];

// Função para obter todas as telas de um módulo (incluindo subTelas)
export function getTodasTelasPorModulo(moduloId: string): TelaMódulo[] {
  const modulo = MODULOS_CONFIG.find(m => m.id === moduloId);
  if (!modulo) return [];
  
  const todasTelas: TelaMódulo[] = [];
  
  for (const tela of modulo.telas) {
    todasTelas.push(tela);
    if (tela.subTelas) {
      todasTelas.push(...tela.subTelas);
    }
  }
  
  return todasTelas;
}

// Função para obter IDs de todas as telas de um módulo
export function getIdsTelasPorModulo(moduloId: string): string[] {
  return getTodasTelasPorModulo(moduloId).map(t => t.id);
}

// Função para obter o módulo pelo nome
export function getModuloByNome(nome: string): ModuloConfig | undefined {
  const codigoModulo = MODULO_NOME_PARA_CODIGO[nome];
  if (!codigoModulo) return undefined;
  return MODULOS_CONFIG.find(m => m.id === codigoModulo);
}
