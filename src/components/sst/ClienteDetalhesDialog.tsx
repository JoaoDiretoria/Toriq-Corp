import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Users, GraduationCap, Mail, Phone, MapPin, FileText, Loader2, Plus, Pencil, Trash2, Search, Stethoscope, HardHat, Briefcase, FolderTree, Download, Upload, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ColaboradorDetalhesDialog } from './ColaboradorDetalhesDialog';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  sigla: string | null;
  cnpj: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  email: string | null;
  telefone: string | null;
  cliente_empresa_id: string | null;
  cliente_empresa?: Empresa | null;
}

interface Colaborador {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  matricula: string | null;
  ativo: boolean;
  empresa_id: string;
  grupo_homogeneo_id: string | null;
}

interface Turma {
  id: string;
  numero_turma: number;
  tipo_treinamento: string;
  carga_horaria_total: number;
  status: string;
  created_at: string;
  treinamento?: {
    nome: string;
    norma: string;
  };
  instrutor?: {
    nome: string;
  };
  aulas?: {
    data: string;
  }[];
}

// Interfaces para Unidades
interface Unidade {
  id: string;
  empresa_id: string;
  cliente_id: string;
  tipo_inscricao: string;
  numero_inscricao: string | null;
  nome_referencia: string | null;
  razao_social: string;
  cnae: string | null;
  cnae_atividade: string | null;
  grau_risco: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  status: string;
}

// Interfaces para Profissionais
interface ProfissionalSaude {
  id: string;
  especialidade: string;
  nome: string;
  cpf: string;
  conselho: string;
  nr_conselho: string;
  uf_conselho: string;
  cliente_id: string | null;
}

interface ProfissionalSeguranca {
  id: string;
  especialidade: string;
  nome: string;
  cpf: string;
  conselho: string;
  nr_conselho: string;
  uf_conselho: string;
  cliente_id: string | null;
}

// Interfaces para Setor e Cargo
interface Setor {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ambiente?: string | null;
  turnos_horarios?: string | null;
  descricao_ambiente?: string | null;
  epc_existentes?: string | null;
  epi_obrigatorios?: string | null;
  evidencias_visita?: string | null;
  escala?: string | null;
  turno?: string | null;
  horarios?: string | null;
  construcao?: string | null;
  construcao_obs?: string | null;
  piso?: string | null;
  piso_obs?: string | null;
  ventilacao?: string | null;
  ventilacao_obs?: string | null;
  iluminacao?: string | null;
  iluminacao_obs?: string | null;
  layout_setor?: string | null;
  layout_setor_obs?: string | null;
  condicoes_gerais?: string | null;
  condicoes_gerais_obs?: string | null;
  processo_trabalho?: string | null;
  processo_trabalho_obs?: string | null;
  maquinas_equipamentos?: string | null;
  maquinas_equipamentos_obs?: string | null;
  organizacao_trabalho?: string | null;
  organizacao_trabalho_obs?: string | null;
  acesso_circulacao?: string | null;
  acesso_circulacao_obs?: string | null;
}

interface Funcao {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  cbo?: string | null;
}

interface CBOOcupacao {
  id: number;
  codigo: string;
  codigo_formatado: string;
  descricao: string;
}

// Interface para Matriz de EPI
interface MatrizEPI {
  id: string;
  empresa_id: string;
  cargo_id: string;
  epi_id: string | null;
  tipo_epi_nr6: string | null;
  obrigatorio: boolean;
  observacao: string | null;
  cargo?: {
    id: string;
    nome: string;
  };
  epi?: {
    id: string;
    nome_modelo: string;
    tipo_epi: string;
    numero_ca: string;
  } | null;
}

interface CadastroEPI {
  id: string;
  nome_modelo: string;
  tipo_epi: string;
  numero_ca: string;
  fabricante: string;
  protecao_para: string;
  ativo: boolean;
}

// Interface para Perigo
interface Perigo {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
}

// Interface para Risco
interface Risco {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  severidade: string | null;
  probabilidade: string | null;
  ativo: boolean;
}

// Constantes
const TIPOS_INSCRICAO = [
  { value: '1', label: '1-CNPJ' },
  { value: '2', label: '2-CPF' },
  { value: '3', label: '3-CAEPF' },
  { value: '4', label: '4-CNO' },
  { value: '5', label: '5-CGC' },
  { value: '6', label: '6-CEI' },
];

// Função para formatar CNPJ para exibição
const formatarCnpjExibicao = (cnpj: string | null): string => {
  if (!cnpj) return '-';
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return cnpj;
  return numeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

// Função para formatar número de inscrição conforme o tipo
const formatarNumeroInscricao = (valor: string, tipo: string): string => {
  const numeros = valor.replace(/\D/g, '');
  
  switch (tipo) {
    case '1': // CNPJ: 00.000.000/0000-00
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 18);
    case '2': // CPF: 000.000.000-00
      return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .substring(0, 14);
    case '3': // CAEPF: 000.000.000/000-00
      return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .substring(0, 18);
    case '4': // CNO: 00.000.00000/00
      return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{5})(\d)/, '$1/$2')
        .substring(0, 15);
    case '5': // CGC: 00.000.000/0000-00 (mesmo formato do CNPJ)
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 18);
    case '6': // CEI: 00.000.00000/00
      return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{5})(\d)/, '$1/$2')
        .substring(0, 15);
    default:
      return valor;
  }
};

// Função para obter placeholder conforme o tipo
const getPlaceholderInscricao = (tipo: string): string => {
  switch (tipo) {
    case '1': return '00.000.000/0000-00'; // CNPJ
    case '2': return '000.000.000-00'; // CPF
    case '3': return '000.000.000/000-00'; // CAEPF
    case '4': return '00.000.00000/00'; // CNO
    case '5': return '00.000.000/0000-00'; // CGC
    case '6': return '00.000.00000/00'; // CEI
    default: return '';
  }
};

// Função para obter tamanho máximo de dígitos conforme o tipo
const getMaxDigitosInscricao = (tipo: string): number => {
  switch (tipo) {
    case '1': return 14; // CNPJ
    case '2': return 11; // CPF
    case '3': return 14; // CAEPF
    case '4': return 12; // CNO
    case '5': return 14; // CGC
    case '6': return 12; // CEI
    default: return 14;
  }
};

const ESPECIALIDADES_SAUDE = [
  'Médico(a)',
  'Enfermeiro(a)',
  'Técnico(a) de Enfermagem',
  'Fonoaudiólogo(a)',
];

const CONSELHOS_SAUDE = [
  { value: 'CRM', label: 'CRM' },
  { value: 'CRO', label: 'CRO' },
  { value: 'RMS', label: 'RMS' },
  { value: 'CRFa', label: 'CRFa' },
];

// Categorias de EPC (Equipamentos de Proteção Coletiva)
const CATEGORIAS_EPC = [
  {
    categoria: 'Proteção contra quedas e trabalhos em altura',
    itens: [
      'Guarda-corpos e rodapés',
      'Corrimãos',
      'Plataformas e passarelas',
      'Redes de proteção',
      'Linhas de vida coletivas',
      'Tampas e grades em aberturas no piso',
    ]
  },
  {
    categoria: 'Proteção de máquinas e equipamentos',
    itens: [
      'Proteções fixas (grades, carenagens)',
      'Proteções móveis com intertravamento',
      'Cortinas de luz',
      'Comandos bimanuais',
      'Barreiras físicas',
      'Sensores de presença',
    ]
  },
  {
    categoria: 'Proteção contra agentes físicos - Ruído',
    itens: [
      'Cabines acústicas',
      'Barreiras acústicas',
    ]
  },
  {
    categoria: 'Proteção contra agentes físicos - Calor',
    itens: [
      'Isolamento térmico',
      'Barreiras térmicas',
      'Ventilação/exaustão forçada',
    ]
  },
  {
    categoria: 'Proteção contra agentes físicos - Radiação',
    itens: [
      'Blindagens contra radiação ionizante',
      'Cortinas e telas de solda',
      'Barreiras contra radiação não ionizante',
    ]
  },
  {
    categoria: 'Proteção contra agentes químicos',
    itens: [
      'Sistemas de exaustão local (capelas, coifas)',
      'Ventilação geral diluidora',
      'Cabines de pintura',
      'Enclausuramento de processos',
      'Sistemas de contenção de vazamentos',
    ]
  },
  {
    categoria: 'Proteção contra agentes biológicos',
    itens: [
      'Cabines de segurança biológica',
      'Barreiras físicas (vidros, divisórias)',
      'Sistemas de ventilação com filtros HEPA',
      'Autoclaves (controle coletivo do risco biológico)',
    ]
  },
  {
    categoria: 'Proteção contra incêndio e explosão',
    itens: [
      'Extintores de incêndio',
      'Sistemas de hidrantes e mangotinhos',
      'Chuveiros automáticos (sprinklers)',
      'Detectores de fumaça e calor',
      'Sistemas de alarme e iluminação de emergência',
      'Portas corta-fogo',
    ]
  },
  {
    categoria: 'Proteção elétrica',
    itens: [
      'Isolamento de partes energizadas',
      'Barreiras e invólucros',
      'Aterramento elétrico',
      'Dispositivos DR',
      'Sinalização de segurança elétrica',
    ]
  },
  {
    categoria: 'Sinalização e organização do ambiente',
    itens: [
      'Placas de segurança (NR-26)',
      'Faixas e demarcações de solo',
      'Semáforos industriais',
      'Espelhos convexos',
      'Alertas sonoros e visuais',
    ]
  },
  {
    categoria: 'Ergonomia e conforto coletivo',
    itens: [
      'Mesas e bancadas ajustáveis',
      'Apoios de pés coletivos',
      'Assentos industriais',
      'Tapetes antifadiga',
      'Climatização do ambiente',
    ]
  },
];

// Categorias de EPI (Equipamentos de Proteção Individual) conforme NR-6 - Anexo I
const CATEGORIAS_EPI = [
  {
    categoria: 'A — EPI PARA PROTEÇÃO DA CABEÇA',
    subcategorias: [
      {
        nome: 'A.1 — Capacete',
        itens: [
          'Capacete para proteção contra impactos de objetos sobre o crânio',
          'Capacete para proteção contra choques elétricos',
          'Capacete para proteção do crânio e face contra agentes térmicos',
        ]
      },
      {
        nome: 'A.2 — Capuz ou balaclava',
        itens: [
          'Capuz para proteção do crânio e pescoço contra agentes térmicos',
          'Capuz para proteção do crânio, face e pescoço contra agentes químicos',
          'Capuz para proteção do crânio e pescoço contra agentes abrasivos e escoriantes',
          'Capuz para proteção do crânio e pescoço contra umidade proveniente de operações com utilização de água',
        ]
      },
    ]
  },
  {
    categoria: 'B — EPI PARA PROTEÇÃO DOS OLHOS E FACE',
    subcategorias: [
      {
        nome: 'B.1 — Óculos',
        itens: [
          'Óculos para proteção dos olhos contra impactos de partículas volantes',
          'Óculos para proteção dos olhos contra luminosidade intensa',
          'Óculos para proteção dos olhos contra radiação ultravioleta',
          'Óculos para proteção dos olhos contra radiação infravermelha',
          'Óculos de tela para proteção limitada dos olhos contra impactos de partículas volantes',
        ]
      },
      {
        nome: 'B.2 — Protetor facial',
        itens: [
          'Protetor facial para proteção da face contra impactos de partículas volantes',
          'Protetor facial para proteção dos olhos contra luminosidade intensa',
          'Protetor facial para proteção da face contra radiação infravermelha',
          'Protetor facial para proteção da face contra radiação ultravioleta',
          'Protetor facial para proteção da face contra agentes térmicos',
        ]
      },
      {
        nome: 'B.3 — Máscara de solda',
        itens: [
          'Máscara de solda para proteção dos olhos e face contra impactos de partículas volantes, radiação ultravioleta, radiação infravermelha e luminosidade intensa',
        ]
      },
    ]
  },
  {
    categoria: 'C — EPI PARA PROTEÇÃO AUDITIVA',
    subcategorias: [
      {
        nome: 'C.1 — Protetor auditivo',
        itens: [
          'Protetor auditivo circum-auricular para proteção do sistema auditivo contra níveis de pressão sonora superiores ao estabelecido na NR-15',
          'Protetor auditivo de inserção para proteção do sistema auditivo contra níveis de pressão sonora superiores ao estabelecido na NR-15',
          'Protetor auditivo semiauricular para proteção do sistema auditivo contra níveis de pressão sonora superiores ao estabelecido na NR-15',
        ]
      },
    ]
  },
  {
    categoria: 'D — EPI PARA PROTEÇÃO RESPIRATÓRIA',
    subcategorias: [
      {
        nome: 'D.1 — Respirador purificador de ar não motorizado',
        itens: [
          'Peça semifacial filtrante PFF1 para proteção das vias respiratórias contra poeiras e névoas',
          'Peça semifacial filtrante PFF2 para proteção das vias respiratórias contra poeiras, névoas e fumos',
          'Peça semifacial filtrante PFF3 para proteção das vias respiratórias contra poeiras, névoas, fumos e radionuclídeos',
          'Peça um quarto facial ou semifacial com filtros para partículas classe P1, para proteção contra poeiras e névoas',
          'Peça um quarto facial, semifacial ou facial inteira com filtros para partículas classe P2/P3',
          'Peça um quarto facial, semifacial ou facial inteira com filtros químicos para proteção contra gases e vapores',
        ]
      },
      {
        nome: 'D.2 — Respirador purificador de ar motorizado',
        itens: [
          'Respirador motorizado sem vedação facial tipo touca/capuz/capacete com filtros para partículas',
          'Respirador motorizado com vedação facial tipo peça semifacial ou facial inteira com filtros',
        ]
      },
      {
        nome: 'D.3 — Respirador de adução de ar tipo linha de ar comprimido',
        itens: [
          'Linha de ar comprimido sem vedação facial de fluxo contínuo tipo capuz/protetor facial/capacete',
          'Linha de ar comprimido sem vedação facial para operações de jateamento',
          'Linha de ar comprimido com vedação facial de fluxo contínuo tipo peça semifacial ou facial inteira',
          'Linha de ar comprimido de demanda com ou sem pressão positiva, com peça semifacial ou facial inteira',
          'Linha de ar comprimido de demanda com pressão positiva, com peça facial inteira, combinado com cilindro auxiliar para fuga (atmosferas IPVS)',
        ]
      },
      {
        nome: 'D.4 — Respirador de adução de ar tipo máscara autônoma',
        itens: [
          'Máscara autônoma de circuito aberto de demanda com pressão positiva, com peça facial inteira (atmosferas IPVS)',
          'Máscara autônoma de circuito fechado de demanda com pressão positiva, com peça facial inteira (atmosferas IPVS)',
        ]
      },
      {
        nome: 'D.5 — Respirador de fuga',
        itens: [
          'Respirador purificador de ar para fuga, com bocal e pinça nasal, capuz ou peça facial',
          'Máscara autônoma para fuga, com bocal e pinça nasal, capuz ou peça facial inteira (atmosferas IPVS)',
        ]
      },
    ]
  },
  {
    categoria: 'E — EPI PARA PROTEÇÃO DO TRONCO',
    subcategorias: [
      {
        nome: 'E.1 — Vestimentas',
        itens: [
          'Vestimenta para proteção do tronco contra agentes térmicos',
          'Vestimenta para proteção do tronco contra agentes mecânicos',
          'Vestimenta para proteção do tronco contra agentes químicos',
          'Vestimenta para proteção do tronco contra radiação ionizante',
          'Vestimenta para proteção do tronco contra umidade proveniente de precipitação pluviométrica',
          'Vestimenta para proteção do tronco contra umidade proveniente de operações com utilização de água',
        ]
      },
      {
        nome: 'E.2 — Colete à prova de balas',
        itens: [
          'Colete à prova de balas de uso permitido para vigilantes que trabalhem portando arma de fogo',
        ]
      },
    ]
  },
  {
    categoria: 'F — EPI PARA PROTEÇÃO DOS MEMBROS SUPERIORES',
    subcategorias: [
      {
        nome: 'F.1 — Luvas',
        itens: [
          'Luvas para proteção das mãos contra agentes abrasivos e escoriantes',
          'Luvas para proteção das mãos contra agentes cortantes e perfurantes',
          'Luvas para proteção das mãos contra choques elétricos',
          'Luvas para proteção das mãos contra agentes térmicos',
          'Luvas para proteção das mãos contra agentes biológicos',
          'Luvas para proteção das mãos contra agentes químicos',
          'Luvas para proteção das mãos contra vibrações',
          'Luvas para proteção contra umidade proveniente de operações com utilização de água',
          'Luvas para proteção das mãos contra radiação ionizante',
        ]
      },
      {
        nome: 'F.2 — Creme protetor de segurança',
        itens: [
          'Creme protetor de segurança para proteção dos membros superiores contra agentes químicos',
        ]
      },
      {
        nome: 'F.3 — Manga',
        itens: [
          'Manga para proteção do braço e do antebraço contra choques elétricos',
          'Manga para proteção do braço e do antebraço contra agentes abrasivos e escoriantes',
          'Manga para proteção do braço e do antebraço contra agentes cortantes e perfurantes',
          'Manga para proteção do braço e do antebraço contra umidade proveniente de operações com utilização de água',
          'Manga para proteção do braço e do antebraço contra agentes térmicos',
          'Manga para proteção do braço e do antebraço contra agentes químicos',
        ]
      },
      {
        nome: 'F.4 — Braçadeira',
        itens: [
          'Braçadeira para proteção do antebraço contra agentes cortantes',
          'Braçadeira para proteção do antebraço contra agentes escoriantes',
        ]
      },
      {
        nome: 'F.5 — Dedeira',
        itens: [
          'Dedeira para proteção dos dedos contra agentes abrasivos e escoriantes',
        ]
      },
    ]
  },
  {
    categoria: 'G — EPI PARA PROTEÇÃO DOS MEMBROS INFERIORES',
    subcategorias: [
      {
        nome: 'G.1 — Calçado',
        itens: [
          'Calçado para proteção contra impactos de quedas de objetos sobre os artelhos',
          'Calçado para proteção dos pés contra choques elétricos',
          'Calçado para proteção dos pés contra agentes térmicos',
          'Calçado para proteção dos pés contra agentes abrasivos e escoriantes',
          'Calçado para proteção dos pés contra agentes cortantes e perfurantes',
          'Calçado para proteção dos pés e pernas contra umidade proveniente de operações com utilização de água',
          'Calçado para proteção dos pés e pernas contra agentes químicos',
        ]
      },
      {
        nome: 'G.2 — Meia',
        itens: [
          'Meia para proteção dos pés contra baixas temperaturas',
        ]
      },
      {
        nome: 'G.3 — Perneira',
        itens: [
          'Perneira para proteção da perna contra agentes abrasivos e escoriantes',
          'Perneira para proteção da perna contra agentes cortantes e perfurantes',
          'Perneira para proteção da perna contra agentes térmicos',
          'Perneira para proteção da perna contra agentes químicos',
          'Perneira para proteção da perna contra umidade proveniente de operações com utilização de água',
        ]
      },
      {
        nome: 'G.4 — Calça',
        itens: [
          'Calça para proteção das pernas contra agentes abrasivos e escoriantes',
          'Calça para proteção das pernas contra agentes cortantes e perfurantes',
          'Calça para proteção das pernas contra agentes químicos',
          'Calça para proteção das pernas contra agentes térmicos',
          'Calça para proteção das pernas contra umidade proveniente de operações com utilização de água',
          'Calça para proteção das pernas contra umidade proveniente de precipitação pluviométrica',
        ]
      },
    ]
  },
  {
    categoria: 'H — EPI PARA PROTEÇÃO DO CORPO INTEIRO',
    subcategorias: [
      {
        nome: 'H.1 — Macacão',
        itens: [
          'Macacão para proteção do tronco e membros superiores e inferiores contra agentes térmicos',
          'Macacão para proteção do tronco e membros superiores e inferiores contra agentes químicos',
          'Macacão para proteção do tronco e membros superiores e inferiores contra umidade proveniente de operações com utilização de água',
          'Macacão para proteção do tronco e membros superiores e inferiores contra umidade proveniente de precipitação pluviométrica',
        ]
      },
      {
        nome: 'H.2 — Vestimenta de corpo inteiro',
        itens: [
          'Vestimenta para proteção de todo o corpo contra agentes químicos',
          'Vestimenta condutiva para proteção de todo o corpo contra choques elétricos',
          'Vestimenta para proteção de todo o corpo contra umidade proveniente de operações com utilização de água',
          'Vestimenta para proteção de todo o corpo contra umidade proveniente de precipitação pluviométrica',
        ]
      },
    ]
  },
  {
    categoria: 'I — EPI PARA PROTEÇÃO CONTRA QUEDAS COM DIFERENÇA DE NÍVEL',
    subcategorias: [
      {
        nome: 'I.1 — Cinturão de segurança com dispositivo trava-queda',
        itens: [
          'Cinturão de segurança com dispositivo trava-queda para proteção do usuário contra quedas em operações com movimentação vertical ou horizontal',
        ]
      },
      {
        nome: 'I.2 — Cinturão de segurança com talabarte',
        itens: [
          'Cinturão de segurança com talabarte para proteção do usuário contra riscos de queda em trabalhos em altura',
          'Cinturão de segurança com talabarte para proteção do usuário contra riscos de queda no posicionamento em trabalhos em altura',
        ]
      },
    ]
  },
];

// Opções de Escala de trabalho
const OPCOES_ESCALA = [
  'Segunda a sexta-feira',
  '6x1',
  '5x1',
  '5x2',
  '12x36',
  'Revezamento',
];

// Opções de Turno de trabalho
const OPCOES_TURNO = [
  'Administrativo',
  'Manhã',
  'Tarde',
  'Noturno',
  'Alternado',
];

// Opções de Horários de trabalho
const OPCOES_HORARIOS = [
  '08:00 às 17:00',
  '09:00 às 18:00',
  '07:30 às 16:30',
  '08:30 às 17:30',
  '06:00 às 14:00',
  '14:00 às 22:00',
  '22:00 às 05:00',
  '22:00 às 06:00',
  '07:00 às 19:00',
  '19:00 às 07:00',
];

// Opções para características do ambiente
const OPCOES_CONSTRUCAO = [
  'Alvenaria',
  'Estrutura metálica',
  'Estrutura mista (alvenaria + metálica)',
  'Concreto armado',
  'Madeira',
  'Contêiner / módulo pré-fabricado',
  'Galpão industrial',
  'Área aberta / céu aberto',
  'Área parcialmente coberta',
  'Edificação provisória',
];

const OPCOES_PISO = [
  'Concreto liso',
  'Concreto rugoso',
  'Concreto com pintura epóxi',
  'Piso cerâmico',
  'Piso antiderrapante',
  'Piso metálico',
  'Piso emborrachado',
  'Piso de madeira',
  'Piso de terra / solo natural',
  'Piso elevado / passarela',
  'Piso irregular',
  'Piso escorregadio (em condições específicas)',
  'Piso molhado com frequência',
];

const OPCOES_VENTILACAO = [
  'Ventilação natural adequada',
  'Ventilação natural insuficiente',
  'Ventilação mecânica',
  'Ventilação forçada (exaustores/ventiladores)',
  'Exaustão localizada',
  'Ventilação geral diluidora',
  'Sistema de ar-condicionado',
  'Climatização central',
  'Ambiente fechado sem ventilação adequada',
  'Ambiente aberto',
];

const OPCOES_ILUMINACAO = [
  'Iluminação natural adequada',
  'Iluminação natural insuficiente',
  'Iluminação artificial adequada',
  'Iluminação artificial insuficiente',
  'Iluminação mista (natural e artificial)',
  'Iluminação direcionada',
  'Iluminação difusa',
  'Iluminação com risco de ofuscamento',
  'Iluminação de emergência',
  'Iluminação deficiente em pontos específicos',
];

const OPCOES_LAYOUT = [
  'Layout organizado',
  'Layout funcional',
  'Layout fixo',
  'Layout por processo',
  'Layout por produto',
  'Layout flexível',
  'Layout restrito',
  'Layout com circulação adequada',
  'Layout com circulação limitada',
  'Layout com áreas segregadas',
  'Layout compartilhado com outros setores',
];

const OPCOES_CONDICOES = [
  'Condições adequadas de trabalho',
  'Condições satisfatórias',
  'Condições regulares',
  'Condições inadequadas',
  'Ambiente limpo e organizado',
  'Ambiente parcialmente organizado',
  'Ambiente desorganizado',
  'Presença de umidade',
  'Presença de poeira',
  'Presença de vapores ou odores',
  'Presença de ruído contínuo',
  'Presença de vibração',
  'Exposição a calor',
  'Exposição a frio',
];

const OPCOES_PROCESSO = [
  'Processo manual',
  'Processo semiautomatizado',
  'Processo automatizado',
  'Processo contínuo',
  'Processo intermitente',
  'Atividade operacional',
  'Atividade administrativa',
  'Atividade de apoio',
  'Atividade de manutenção',
  'Atividade eventual',
  'Atividade em linha de produção',
  'Atividade por demanda',
  'Trabalho individual',
  'Trabalho em equipe',
];

const OPCOES_MAQUINAS = [
  'Não aplicável',
  'Máquinas fixas',
  'Máquinas móveis',
  'Equipamentos elétricos',
  'Equipamentos pneumáticos',
  'Equipamentos hidráulicos',
  'Ferramentas manuais',
  'Ferramentas elétricas portáteis',
  'Equipamentos com proteção coletiva',
  'Equipamentos sem proteção coletiva adequada',
];

const OPCOES_ORGANIZACAO = [
  'Ritmo normal de trabalho',
  'Ritmo intenso',
  'Trabalho repetitivo',
  'Trabalho com pausas regulares',
  'Trabalho sem pausas definidas',
  'Jornada administrativa',
  'Jornada em turnos',
  'Jornada noturna',
  'Jornada em revezamento',
  'Escala 12x36',
];

const OPCOES_ACESSO = [
  'Acesso facilitado',
  'Acesso restrito',
  'Circulação adequada',
  'Circulação limitada',
  'Circulação compartilhada com veículos',
  'Presença de escadas',
  'Presença de rampas',
  'Presença de desníveis',
  'Sinalização adequada',
  'Sinalização insuficiente',
];

const ESPECIALIDADES_SEGURANCA = [
  'Engenheiro(a)',
  'Técnico(a) de Segurança',
  'Tecnólogo(a) de Segurança',
  'Médico(a) do Trabalho',
  'Arquiteto(a)',
];

const CONSELHOS_SEGURANCA = [
  { value: 'CREA', label: 'CREA' },
  { value: 'MTE', label: 'MTE' },
  { value: 'CRM', label: 'CRM' },
  { value: 'CAU', label: 'CAU' },
  { value: 'TST', label: 'TST' },
];

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface ClienteDetalhesContentProps {
  cliente: Cliente | null;
  variant?: 'dialog' | 'page';
  onBack?: () => void;
}

export function ClienteDetalhesContent({ cliente, variant = 'dialog', onBack }: ClienteDetalhesContentProps) {
  const { toast } = useToast();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  // Estados existentes
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loadingColaboradores, setLoadingColaboradores] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [colaboradorDetalhesOpen, setColaboradorDetalhesOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);

  // Estados para Unidades
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [unidadeDialogOpen, setUnidadeDialogOpen] = useState(false);
  const [editUnidadeDialogOpen, setEditUnidadeDialogOpen] = useState(false);
  const [deleteUnidadeDialogOpen, setDeleteUnidadeDialogOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [savingUnidade, setSavingUnidade] = useState(false);
  const [unidadeFormData, setUnidadeFormData] = useState({
    tipo_inscricao: '1',
    numero_inscricao: '',
    nome_referencia: '',
    razao_social: '',
    cnae: '',
    cnae_atividade: '',
    grau_risco: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: 'SP',
    status: 'ativo',
  });
  const [buscandoCnpjUnidade, setBuscandoCnpjUnidade] = useState(false);
  const [buscandoCepUnidade, setBuscandoCepUnidade] = useState(false);

  // Estados para Profissionais de Saúde
  const [profissionaisSaude, setProfissionaisSaude] = useState<ProfissionalSaude[]>([]);
  const [loadingProfSaude, setLoadingProfSaude] = useState(false);
  const [profSaudeDialogOpen, setProfSaudeDialogOpen] = useState(false);
  const [editProfSaudeDialogOpen, setEditProfSaudeDialogOpen] = useState(false);
  const [deleteProfSaudeDialogOpen, setDeleteProfSaudeDialogOpen] = useState(false);
  const [selectedProfSaude, setSelectedProfSaude] = useState<ProfissionalSaude | null>(null);
  const [savingProfSaude, setSavingProfSaude] = useState(false);
  const [profSaudeFormData, setProfSaudeFormData] = useState({
    especialidade: '',
    nome: '',
    cpf: '',
    conselho: '',
    nr_conselho: '',
    uf_conselho: 'SP',
  });

  // Estados para Profissionais de Segurança
  const [profissionaisSeguranca, setProfissionaisSeguranca] = useState<ProfissionalSeguranca[]>([]);
  const [loadingProfSeguranca, setLoadingProfSeguranca] = useState(false);
  const [profSegurancaDialogOpen, setProfSegurancaDialogOpen] = useState(false);
  const [editProfSegurancaDialogOpen, setEditProfSegurancaDialogOpen] = useState(false);
  const [deleteProfSegurancaDialogOpen, setDeleteProfSegurancaDialogOpen] = useState(false);
  const [selectedProfSeguranca, setSelectedProfSeguranca] = useState<ProfissionalSeguranca | null>(null);
  const [savingProfSeguranca, setSavingProfSeguranca] = useState(false);
  const [profSegurancaFormData, setProfSegurancaFormData] = useState({
    especialidade: '',
    nome: '',
    cpf: '',
    conselho: '',
    nr_conselho: '',
    uf_conselho: 'SP',
  });

  // Estados para Setores
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(false);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [editSetorDialogOpen, setEditSetorDialogOpen] = useState(false);
  const [deleteSetorDialogOpen, setDeleteSetorDialogOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);
  const [savingSetor, setSavingSetor] = useState(false);
  const [setorFormData, setSetorFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
    ambiente: '',
    turnos_horarios: '',
    descricao_ambiente: '',
    epc_existentes: '',
    epi_obrigatorios: '',
    evidencias_visita: '',
    escala: '',
    turno: '',
    horarios: '',
  });
  const [selectedEpcs, setSelectedEpcs] = useState<string[]>([]);
  const [epcOutros, setEpcOutros] = useState('');
  const [epcDropdownOpen, setEpcDropdownOpen] = useState(false);
  const [selectedEpis, setSelectedEpis] = useState<string[]>([]);
  const [epiOutros, setEpiOutros] = useState('');
  const [epiDropdownOpen, setEpiDropdownOpen] = useState(false);
  const [escalaOutro, setEscalaOutro] = useState('');
  const [turnoOutro, setTurnoOutro] = useState('');
  const [horariosOutro, setHorariosOutro] = useState('');
  const [evidenciasFotos, setEvidenciasFotos] = useState<string[]>([]);
  const [uploadingEvidencia, setUploadingEvidencia] = useState(false);
  
  // Estados para características do ambiente (multi-seleção + observação)
  const [selectedConstrucao, setSelectedConstrucao] = useState<string[]>([]);
  const [construcaoObs, setConstrucaoObs] = useState('');
  const [construcaoDropdownOpen, setConstrucaoDropdownOpen] = useState(false);
  
  const [selectedPiso, setSelectedPiso] = useState<string[]>([]);
  const [pisoObs, setPisoObs] = useState('');
  const [pisoDropdownOpen, setPisoDropdownOpen] = useState(false);
  
  const [selectedVentilacao, setSelectedVentilacao] = useState<string[]>([]);
  const [ventilacaoObs, setVentilacaoObs] = useState('');
  const [ventilacaoDropdownOpen, setVentilacaoDropdownOpen] = useState(false);
  
  const [selectedIluminacao, setSelectedIluminacao] = useState<string[]>([]);
  const [iluminacaoObs, setIluminacaoObs] = useState('');
  const [iluminacaoDropdownOpen, setIluminacaoDropdownOpen] = useState(false);
  
  const [selectedLayoutSetor, setSelectedLayoutSetor] = useState<string[]>([]);
  const [layoutSetorObs, setLayoutSetorObs] = useState('');
  const [layoutSetorDropdownOpen, setLayoutSetorDropdownOpen] = useState(false);
  
  const [selectedCondicoes, setSelectedCondicoes] = useState<string[]>([]);
  const [condicoesObs, setCondicoesObs] = useState('');
  const [condicoesDropdownOpen, setCondicoesDropdownOpen] = useState(false);
  
  const [selectedProcesso, setSelectedProcesso] = useState<string[]>([]);
  const [processoObs, setProcessoObs] = useState('');
  const [processoDropdownOpen, setProcessoDropdownOpen] = useState(false);
  
  const [selectedMaquinas, setSelectedMaquinas] = useState<string[]>([]);
  const [maquinasObs, setMaquinasObs] = useState('');
  const [maquinasDropdownOpen, setMaquinasDropdownOpen] = useState(false);
  
  const [selectedOrganizacao, setSelectedOrganizacao] = useState<string[]>([]);
  const [organizacaoObs, setOrganizacaoObs] = useState('');
  const [organizacaoDropdownOpen, setOrganizacaoDropdownOpen] = useState(false);
  
  const [selectedAcesso, setSelectedAcesso] = useState<string[]>([]);
  const [acessoObs, setAcessoObs] = useState('');
  const [acessoDropdownOpen, setAcessoDropdownOpen] = useState(false);

  // Estados para Funções
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [loadingFuncoes, setLoadingFuncoes] = useState(false);
  const [funcaoDialogOpen, setFuncaoDialogOpen] = useState(false);
  const [editFuncaoDialogOpen, setEditFuncaoDialogOpen] = useState(false);
  const [deleteFuncaoDialogOpen, setDeleteFuncaoDialogOpen] = useState(false);
  const [selectedFuncao, setSelectedFuncao] = useState<Funcao | null>(null);
  const [savingFuncao, setSavingFuncao] = useState(false);
  const [funcaoFormData, setFuncaoFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
    cbo: '',
  });
  const [cboSearch, setCboSearch] = useState('');
  const [cboResults, setCboResults] = useState<CBOOcupacao[]>([]);
  const [loadingCbo, setLoadingCbo] = useState(false);
  const [cboDropdownOpen, setCboDropdownOpen] = useState(false);

  // Estados para Novo Colaborador
  const [colaboradorDialogOpen, setColaboradorDialogOpen] = useState(false);
  const [savingColaborador, setSavingColaborador] = useState(false);
  const [colaboradorFormData, setColaboradorFormData] = useState({
    nome: '',
    cpf: '',
    matricula: '',
    cargo: '',
    setor: '',
    ativo: true,
  });
  const [importingCSV, setImportingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Matriz de EPI
  const [matrizEpis, setMatrizEpis] = useState<MatrizEPI[]>([]);
  const [loadingMatrizEpi, setLoadingMatrizEpi] = useState(false);
  const [cadastroEpis, setCadastroEpis] = useState<CadastroEPI[]>([]);
  const [matrizEpiDialogOpen, setMatrizEpiDialogOpen] = useState(false);
  const [editMatrizEpiDialogOpen, setEditMatrizEpiDialogOpen] = useState(false);
  const [deleteMatrizEpiDialogOpen, setDeleteMatrizEpiDialogOpen] = useState(false);
  const [selectedMatrizEpi, setSelectedMatrizEpi] = useState<MatrizEPI | null>(null);
  const [savingMatrizEpi, setSavingMatrizEpi] = useState(false);
  const [filtroTipoEpi, setFiltroTipoEpi] = useState('');
  const [outroEpiInput, setOutroEpiInput] = useState('');
  const [matrizEpiFormData, setMatrizEpiFormData] = useState({
    cargo_id: '',
    epi_ids: [] as string[],
    tipos_epi: [] as string[], // Tipos de EPI da NR-6 selecionados
    obrigatorio: true,
    observacao: '',
  });

  // Estados para Perigos
  const [perigos, setPerigos] = useState<Perigo[]>([]);
  const [loadingPerigos, setLoadingPerigos] = useState(false);
  const [perigoDialogOpen, setPerigoDialogOpen] = useState(false);
  const [editPerigoDialogOpen, setEditPerigoDialogOpen] = useState(false);
  const [deletePerigoDialogOpen, setDeletePerigoDialogOpen] = useState(false);
  const [selectedPerigo, setSelectedPerigo] = useState<Perigo | null>(null);
  const [savingPerigo, setSavingPerigo] = useState(false);
  const [perigoFormData, setPerigoFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    ativo: true,
  });

  // Estados para Riscos
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [loadingRiscos, setLoadingRiscos] = useState(false);
  const [riscoDialogOpen, setRiscoDialogOpen] = useState(false);
  const [editRiscoDialogOpen, setEditRiscoDialogOpen] = useState(false);
  const [deleteRiscoDialogOpen, setDeleteRiscoDialogOpen] = useState(false);
  const [selectedRisco, setSelectedRisco] = useState<Risco | null>(null);
  const [savingRisco, setSavingRisco] = useState(false);
  const [riscoFormData, setRiscoFormData] = useState({
    nome: '',
    descricao: '',
    tipo: '',
    severidade: '',
    probabilidade: '',
    ativo: true,
  });

  const fetchColaboradores = async () => {
    if (!cliente?.cliente_empresa_id) return;
    
    setLoadingColaboradores(true);
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('nome');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar colaboradores:', error);
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingColaboradores(false);
    }
  };

  // Funções para Colaboradores
  const resetColaboradorForm = () => {
    setColaboradorFormData({
      nome: '',
      cpf: '',
      matricula: '',
      cargo: '',
      setor: '',
      ativo: true,
    });
  };

  const handleSubmitColaborador = async () => {
    if (!cliente?.cliente_empresa_id || !colaboradorFormData.nome) {
      toast({ title: 'Preencha o nome do colaborador', variant: 'destructive' });
      return;
    }

    setSavingColaborador(true);
    try {
      const { error } = await supabase
        .from('colaboradores')
        .insert({
          empresa_id: cliente.cliente_empresa_id,
          nome: colaboradorFormData.nome,
          cpf: colaboradorFormData.cpf || null,
          matricula: colaboradorFormData.matricula || null,
          cargo: colaboradorFormData.cargo || null,
          setor: colaboradorFormData.setor || null,
          ativo: colaboradorFormData.ativo,
        });

      if (error) throw error;

      toast({ title: 'Colaborador cadastrado com sucesso!' });
      setColaboradorDialogOpen(false);
      resetColaboradorForm();
      fetchColaboradores();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar colaborador', description: error.message, variant: 'destructive' });
    } finally {
      setSavingColaborador(false);
    }
  };

  // Exportar colaboradores para CSV (usando pipe como delimitador)
  const exportColaboradoresCSV = () => {
    if (colaboradores.length === 0) {
      toast({ title: 'Nenhum colaborador para exportar', variant: 'destructive' });
      return;
    }

    const headers = ['Nome', 'Matrícula', 'CPF', 'Cargo', 'Setor', 'Ativo'];
    const rows = colaboradores.map(c => [
      c.nome || '',
      c.matricula || '',
      c.cpf || '',
      c.cargo || '',
      c.setor || '',
      c.ativo ? 'Sim' : 'Não'
    ]);

    const csvContent = [
      headers.join('|'),
      ...rows.map(row => row.join('|'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `colaboradores_${cliente?.cliente_empresa?.nome?.replace(/\s+/g, '_') || 'empresa'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({ title: 'Colaboradores exportados com sucesso!' });
  };

  // Importar colaboradores de CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !cliente?.cliente_empresa_id) return;

    setImportingCSV(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: 'Arquivo CSV vazio ou inválido', variant: 'destructive' });
        return;
      }

      // Pular cabeçalho
      const dataLines = lines.slice(1);
      const colaboradoresParaInserir = [];

      for (const line of dataLines) {
        const cols = line.split('|').map(col => col.trim());
        if (cols.length >= 1 && cols[0]) {
          colaboradoresParaInserir.push({
            empresa_id: cliente.cliente_empresa_id,
            nome: cols[0],
            matricula: cols[1] || null,
            cpf: cols[2] || null,
            cargo: cols[3] || null,
            setor: cols[4] || null,
            ativo: cols[5]?.toLowerCase() !== 'não' && cols[5]?.toLowerCase() !== 'nao',
          });
        }
      }

      if (colaboradoresParaInserir.length === 0) {
        toast({ title: 'Nenhum colaborador válido encontrado no arquivo', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('colaboradores')
        .insert(colaboradoresParaInserir);

      if (error) throw error;

      toast({ title: `${colaboradoresParaInserir.length} colaborador(es) importado(s) com sucesso!` });
      fetchColaboradores();
    } catch (error: any) {
      toast({ title: 'Erro ao importar CSV', description: error.message, variant: 'destructive' });
    } finally {
      setImportingCSV(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchTurmas = async () => {
    if (!cliente?.id) return;
    
    setLoadingTurmas(true);
    try {
      const { data, error } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          *,
          treinamento:catalogo_treinamentos(nome, norma),
          instrutor:instrutores(nome),
          aulas:turmas_treinamento_aulas(data)
        `)
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTurmas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar turmas:', error);
      toast({
        title: "Erro ao carregar turmas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTurmas(false);
    }
  };

  // Funções para Unidades
  const fetchUnidades = async () => {
    if (!cliente?.id || !empresaId) return;
    
    setLoadingUnidades(true);
    try {
      const { data, error } = await (supabase as any)
        .from('unidades_clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('cliente_id', cliente.id)
        .order('razao_social');

      if (error) throw error;
      setUnidades(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const resetUnidadeForm = () => {
    setUnidadeFormData({
      tipo_inscricao: '1',
      numero_inscricao: '',
      nome_referencia: '',
      razao_social: '',
      cnae: '',
      cnae_atividade: '',
      grau_risco: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: 'SP',
      status: 'ativo',
    });
  };

  // Função para buscar dados do CNPJ para unidade
  const buscarCnpjUnidade = async (cnpj: string) => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return;
    
    setBuscandoCnpjUnidade(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await response.json();
      
      if (!data.message) {
        const determinarGrauRisco = (cnae: string): string => {
          if (!cnae) return '';
          const cnaeNum = String(cnae).replace(/\D/g, '');
          const primeiroDigito = cnaeNum.charAt(0);
          switch (primeiroDigito) {
            case '0': case '1': case '2': case '3': case '4': return '3';
            case '5': case '6': return '2';
            default: return '1';
          }
        };

        setUnidadeFormData(prev => ({
          ...prev,
          razao_social: data.razao_social || prev.razao_social,
          nome_referencia: prev.nome_referencia || data.nome_fantasia || '',
          cep: data.cep ? data.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : prev.cep,
          logradouro: data.logradouro || prev.logradouro,
          numero: data.numero || prev.numero,
          complemento: data.complemento || prev.complemento,
          bairro: data.bairro || prev.bairro,
          cidade: data.municipio || prev.cidade,
          uf: data.uf || prev.uf,
          cnae: data.cnae_fiscal ? String(data.cnae_fiscal).replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3') : prev.cnae,
          cnae_atividade: data.cnae_fiscal_descricao || prev.cnae_atividade,
          grau_risco: determinarGrauRisco(data.cnae_fiscal) || prev.grau_risco,
        }));
        
        toast({ title: "Dados encontrados!", description: "Os campos foram preenchidos automaticamente." });
      } else {
        toast({ title: "CNPJ não encontrado", description: "Verifique o número e tente novamente.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast({ title: "Erro ao buscar CNPJ", variant: "destructive" });
    } finally {
      setBuscandoCnpjUnidade(false);
    }
  };

  // Função para buscar dados do CEP para unidade
  const buscarCepUnidade = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCepUnidade(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setUnidadeFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
          complemento: data.complemento || prev.complemento,
        }));
        toast({ title: "Endereço encontrado!", description: "Os campos foram preenchidos automaticamente." });
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setBuscandoCepUnidade(false);
    }
  };

  const handleSubmitUnidade = async () => {
    if (!cliente?.id || !empresaId || !unidadeFormData.razao_social) {
      toast({ title: 'Preencha a razão social', variant: 'destructive' });
      return;
    }

    setSavingUnidade(true);
    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .insert({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          ...unidadeFormData,
        });

      if (error) throw error;

      toast({ title: 'Unidade cadastrada com sucesso!' });
      setUnidadeDialogOpen(false);
      resetUnidadeForm();
      fetchUnidades();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar unidade', description: error.message, variant: 'destructive' });
    } finally {
      setSavingUnidade(false);
    }
  };

  const handleEditUnidade = async () => {
    if (!selectedUnidade || !unidadeFormData.razao_social) {
      toast({ title: 'Preencha a razão social', variant: 'destructive' });
      return;
    }

    setSavingUnidade(true);
    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .update(unidadeFormData)
        .eq('id', selectedUnidade.id);

      if (error) throw error;

      toast({ title: 'Unidade atualizada com sucesso!' });
      setEditUnidadeDialogOpen(false);
      setSelectedUnidade(null);
      resetUnidadeForm();
      fetchUnidades();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar unidade', description: error.message, variant: 'destructive' });
    } finally {
      setSavingUnidade(false);
    }
  };

  const handleDeleteUnidade = async () => {
    if (!selectedUnidade) return;

    try {
      const { error } = await (supabase as any)
        .from('unidades_clientes')
        .delete()
        .eq('id', selectedUnidade.id);

      if (error) throw error;

      toast({ title: 'Unidade excluída com sucesso!' });
      setDeleteUnidadeDialogOpen(false);
      setSelectedUnidade(null);
      fetchUnidades();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir unidade', description: error.message, variant: 'destructive' });
    }
  };

  const openEditUnidadeDialog = (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    setUnidadeFormData({
      tipo_inscricao: unidade.tipo_inscricao || '1',
      numero_inscricao: unidade.numero_inscricao || '',
      nome_referencia: unidade.nome_referencia || '',
      razao_social: unidade.razao_social,
      cnae: unidade.cnae || '',
      cnae_atividade: unidade.cnae_atividade || '',
      grau_risco: unidade.grau_risco || '',
      cep: unidade.cep || '',
      logradouro: unidade.logradouro || '',
      numero: unidade.numero || '',
      complemento: unidade.complemento || '',
      bairro: unidade.bairro || '',
      cidade: unidade.cidade || '',
      uf: unidade.uf || 'SP',
      status: unidade.status || 'ativo',
    });
    setEditUnidadeDialogOpen(true);
  };

  // Funções para Profissionais de Saúde
  const fetchProfissionaisSaude = async () => {
    if (!cliente?.id || !empresaId) return;
    
    setLoadingProfSaude(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profissionais_saude')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('cliente_id', cliente.id)
        .order('nome');

      if (error) throw error;
      setProfissionaisSaude(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar profissionais de saúde:', error);
    } finally {
      setLoadingProfSaude(false);
    }
  };

  const resetProfSaudeForm = () => {
    setProfSaudeFormData({
      especialidade: '',
      nome: '',
      cpf: '',
      conselho: '',
      nr_conselho: '',
      uf_conselho: 'SP',
    });
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleSubmitProfSaude = async () => {
    if (!cliente?.id || !empresaId || !profSaudeFormData.nome) {
      toast({ title: 'Preencha o nome', variant: 'destructive' });
      return;
    }

    setSavingProfSaude(true);
    try {
      const { error } = await (supabase as any)
        .from('profissionais_saude')
        .insert({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          ...profSaudeFormData,
          cpf: profSaudeFormData.cpf.replace(/\D/g, ''),
        });

      if (error) throw error;

      toast({ title: 'Profissional de saúde cadastrado com sucesso!' });
      setProfSaudeDialogOpen(false);
      resetProfSaudeForm();
      fetchProfissionaisSaude();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar profissional', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProfSaude(false);
    }
  };

  const handleEditProfSaude = async () => {
    if (!selectedProfSaude || !profSaudeFormData.nome) {
      toast({ title: 'Preencha o nome', variant: 'destructive' });
      return;
    }

    setSavingProfSaude(true);
    try {
      const { error } = await (supabase as any)
        .from('profissionais_saude')
        .update({
          ...profSaudeFormData,
          cpf: profSaudeFormData.cpf.replace(/\D/g, ''),
        })
        .eq('id', selectedProfSaude.id);

      if (error) throw error;

      toast({ title: 'Profissional atualizado com sucesso!' });
      setEditProfSaudeDialogOpen(false);
      setSelectedProfSaude(null);
      resetProfSaudeForm();
      fetchProfissionaisSaude();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar profissional', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProfSaude(false);
    }
  };

  const handleDeleteProfSaude = async () => {
    if (!selectedProfSaude) return;

    try {
      const { error } = await (supabase as any)
        .from('profissionais_saude')
        .delete()
        .eq('id', selectedProfSaude.id);

      if (error) throw error;

      toast({ title: 'Profissional excluído com sucesso!' });
      setDeleteProfSaudeDialogOpen(false);
      setSelectedProfSaude(null);
      fetchProfissionaisSaude();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir profissional', description: error.message, variant: 'destructive' });
    }
  };

  const openEditProfSaudeDialog = (prof: ProfissionalSaude) => {
    setSelectedProfSaude(prof);
    setProfSaudeFormData({
      especialidade: prof.especialidade,
      nome: prof.nome,
      cpf: formatCPF(prof.cpf),
      conselho: prof.conselho,
      nr_conselho: prof.nr_conselho,
      uf_conselho: prof.uf_conselho,
    });
    setEditProfSaudeDialogOpen(true);
  };

  // Funções para Profissionais de Segurança
  const fetchProfissionaisSeguranca = async () => {
    if (!cliente?.id || !empresaId) return;
    
    setLoadingProfSeguranca(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profissionais_seguranca')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('cliente_id', cliente.id)
        .order('nome');

      if (error) throw error;
      setProfissionaisSeguranca(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar profissionais de segurança:', error);
    } finally {
      setLoadingProfSeguranca(false);
    }
  };

  const resetProfSegurancaForm = () => {
    setProfSegurancaFormData({
      especialidade: '',
      nome: '',
      cpf: '',
      conselho: '',
      nr_conselho: '',
      uf_conselho: 'SP',
    });
  };

  const handleSubmitProfSeguranca = async () => {
    if (!cliente?.id || !empresaId || !profSegurancaFormData.nome) {
      toast({ title: 'Preencha o nome', variant: 'destructive' });
      return;
    }

    setSavingProfSeguranca(true);
    try {
      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .insert({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          ...profSegurancaFormData,
          cpf: profSegurancaFormData.cpf.replace(/\D/g, ''),
        });

      if (error) throw error;

      toast({ title: 'Profissional de segurança cadastrado com sucesso!' });
      setProfSegurancaDialogOpen(false);
      resetProfSegurancaForm();
      fetchProfissionaisSeguranca();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar profissional', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProfSeguranca(false);
    }
  };

  const handleEditProfSeguranca = async () => {
    if (!selectedProfSeguranca || !profSegurancaFormData.nome) {
      toast({ title: 'Preencha o nome', variant: 'destructive' });
      return;
    }

    setSavingProfSeguranca(true);
    try {
      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .update({
          ...profSegurancaFormData,
          cpf: profSegurancaFormData.cpf.replace(/\D/g, ''),
        })
        .eq('id', selectedProfSeguranca.id);

      if (error) throw error;

      toast({ title: 'Profissional atualizado com sucesso!' });
      setEditProfSegurancaDialogOpen(false);
      setSelectedProfSeguranca(null);
      resetProfSegurancaForm();
      fetchProfissionaisSeguranca();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar profissional', description: error.message, variant: 'destructive' });
    } finally {
      setSavingProfSeguranca(false);
    }
  };

  const handleDeleteProfSeguranca = async () => {
    if (!selectedProfSeguranca) return;

    try {
      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .delete()
        .eq('id', selectedProfSeguranca.id);

      if (error) throw error;

      toast({ title: 'Profissional excluído com sucesso!' });
      setDeleteProfSegurancaDialogOpen(false);
      setSelectedProfSeguranca(null);
      fetchProfissionaisSeguranca();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir profissional', description: error.message, variant: 'destructive' });
    }
  };

  const openEditProfSegurancaDialog = (prof: ProfissionalSeguranca) => {
    setSelectedProfSeguranca(prof);
    setProfSegurancaFormData({
      especialidade: prof.especialidade,
      nome: prof.nome,
      cpf: formatCPF(prof.cpf),
      conselho: prof.conselho,
      nr_conselho: prof.nr_conselho,
      uf_conselho: prof.uf_conselho,
    });
    setEditProfSegurancaDialogOpen(true);
  };

  // Funções para Setores
  const fetchSetores = async () => {
    if (!cliente?.cliente_empresa_id) return;
    
    setLoadingSetores(true);
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('nome');

      if (error) throw error;
      setSetores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar setores:', error);
    } finally {
      setLoadingSetores(false);
    }
  };

  const resetSetorForm = () => {
    setSetorFormData({ 
      nome: '', 
      descricao: '', 
      ativo: true,
      ambiente: '',
      turnos_horarios: '',
      descricao_ambiente: '',
      epc_existentes: '',
      epi_obrigatorios: '',
      evidencias_visita: '',
      escala: '',
      turno: '',
      horarios: '',
    });
    setSelectedEpcs([]);
    setEpcOutros('');
    setEpcDropdownOpen(false);
    setSelectedEpis([]);
    setEpiOutros('');
    setEpiDropdownOpen(false);
    setEscalaOutro('');
    setTurnoOutro('');
    setHorariosOutro('');
    setEvidenciasFotos([]);
    // Reset características do ambiente
    setSelectedConstrucao([]);
    setConstrucaoObs('');
    setConstrucaoDropdownOpen(false);
    setSelectedPiso([]);
    setPisoObs('');
    setPisoDropdownOpen(false);
    setSelectedVentilacao([]);
    setVentilacaoObs('');
    setVentilacaoDropdownOpen(false);
    setSelectedIluminacao([]);
    setIluminacaoObs('');
    setIluminacaoDropdownOpen(false);
    setSelectedLayoutSetor([]);
    setLayoutSetorObs('');
    setLayoutSetorDropdownOpen(false);
    setSelectedCondicoes([]);
    setCondicoesObs('');
    setCondicoesDropdownOpen(false);
    setSelectedProcesso([]);
    setProcessoObs('');
    setProcessoDropdownOpen(false);
    setSelectedMaquinas([]);
    setMaquinasObs('');
    setMaquinasDropdownOpen(false);
    setSelectedOrganizacao([]);
    setOrganizacaoObs('');
    setOrganizacaoDropdownOpen(false);
    setSelectedAcesso([]);
    setAcessoObs('');
    setAcessoDropdownOpen(false);
  };

  // Função para upload de foto de evidência
  const handleEvidenciaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione apenas arquivos de imagem.', variant: 'destructive' });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'O arquivo deve ter no máximo 5MB.', variant: 'destructive' });
      return;
    }

    // Validar limite de 2 fotos
    if (evidenciasFotos.length >= 2) {
      toast({ title: 'Limite atingido', description: 'Máximo de 2 fotos por setor.', variant: 'destructive' });
      return;
    }

    setUploadingEvidencia(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `evidencia_setor_${cliente?.cliente_empresa_id}_${Date.now()}.${fileExt}`;
      const filePath = `evidencias-setor/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      setEvidenciasFotos(prev => [...prev, urlData.publicUrl]);
      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a foto.', variant: 'destructive' });
    } finally {
      setUploadingEvidencia(false);
      event.target.value = '';
    }
  };

  // Função para remover foto de evidência
  const handleRemoveEvidencia = (index: number) => {
    setEvidenciasFotos(prev => prev.filter((_, i) => i !== index));
  };

  // Função para converter fotos em string para salvar
  const getEvidenciasString = () => {
    return evidenciasFotos.join('; ');
  };

  // Função para carregar fotos de uma string
  const loadEvidenciasFromString = (evidenciasString: string) => {
    if (!evidenciasString) {
      setEvidenciasFotos([]);
      return;
    }
    const fotos = evidenciasString.split(';').map(f => f.trim()).filter(f => f && f.startsWith('http'));
    setEvidenciasFotos(fotos);
  };

  // Função para converter EPCs selecionados em string
  const getEpcString = () => {
    const epcs = [...selectedEpcs];
    if (epcOutros.trim()) {
      epcs.push(`Outros: ${epcOutros.trim()}`);
    }
    return epcs.join('; ');
  };

  // Função para carregar EPCs de uma string
  const loadEpcsFromString = (epcString: string) => {
    if (!epcString) {
      setSelectedEpcs([]);
      setEpcOutros('');
      return;
    }
    
    const epcs = epcString.split(';').map(e => e.trim()).filter(e => e);
    const todosEpcs = CATEGORIAS_EPC.flatMap(cat => cat.itens);
    const selecionados: string[] = [];
    let outros = '';
    
    epcs.forEach(epc => {
      if (epc.startsWith('Outros:')) {
        outros = epc.replace('Outros:', '').trim();
      } else if (todosEpcs.includes(epc)) {
        selecionados.push(epc);
      } else {
        // EPC não está na lista, adiciona como "outros"
        outros = outros ? `${outros}, ${epc}` : epc;
      }
    });
    
    setSelectedEpcs(selecionados);
    setEpcOutros(outros);
  };

  // Toggle EPC selection
  const toggleEpc = (epc: string) => {
    setSelectedEpcs(prev => 
      prev.includes(epc) 
        ? prev.filter(e => e !== epc)
        : [...prev, epc]
    );
  };

  // Função para converter EPIs selecionados em string
  const getEpiString = () => {
    const epis = [...selectedEpis];
    if (epiOutros.trim()) {
      epis.push(`Outros: ${epiOutros.trim()}`);
    }
    return epis.join('; ');
  };

  // Função para carregar EPIs de uma string
  const loadEpisFromString = (epiString: string) => {
    if (!epiString) {
      setSelectedEpis([]);
      setEpiOutros('');
      return;
    }
    
    const epis = epiString.split(';').map(e => e.trim()).filter(e => e);
    const todosEpis = CATEGORIAS_EPI.flatMap(cat => cat.subcategorias.flatMap(sub => sub.itens));
    const selecionados: string[] = [];
    let outros = '';
    
    epis.forEach(epi => {
      if (epi.startsWith('Outros:')) {
        outros = epi.replace('Outros:', '').trim();
      } else if (todosEpis.includes(epi)) {
        selecionados.push(epi);
      } else {
        outros = outros ? `${outros}, ${epi}` : epi;
      }
    });
    
    setSelectedEpis(selecionados);
    setEpiOutros(outros);
  };

  // Toggle EPI selection
  const toggleEpi = (epi: string) => {
    setSelectedEpis(prev => 
      prev.includes(epi) 
        ? prev.filter(e => e !== epi)
        : [...prev, epi]
    );
  };

  // Funções genéricas para características do ambiente
  const getCaracteristicaString = (selected: string[]) => selected.join('; ');
  
  const loadCaracteristicaFromString = (str: string): string[] => {
    if (!str) return [];
    return str.split(';').map(s => s.trim()).filter(s => s);
  };

  // Função para gerar descrição do ambiente automaticamente
  const gerarDescricaoAmbiente = () => {
    const partes: string[] = [];
    
    if (selectedConstrucao.length > 0) {
      let texto = `Construção: ${selectedConstrucao.join(', ')}`;
      if (construcaoObs) texto += ` (${construcaoObs})`;
      partes.push(texto);
    }
    
    if (selectedPiso.length > 0) {
      let texto = `Piso: ${selectedPiso.join(', ')}`;
      if (pisoObs) texto += ` (${pisoObs})`;
      partes.push(texto);
    }
    
    if (selectedVentilacao.length > 0) {
      let texto = `Ventilação: ${selectedVentilacao.join(', ')}`;
      if (ventilacaoObs) texto += ` (${ventilacaoObs})`;
      partes.push(texto);
    }
    
    if (selectedIluminacao.length > 0) {
      let texto = `Iluminação: ${selectedIluminacao.join(', ')}`;
      if (iluminacaoObs) texto += ` (${iluminacaoObs})`;
      partes.push(texto);
    }
    
    if (selectedLayoutSetor.length > 0) {
      let texto = `Layout: ${selectedLayoutSetor.join(', ')}`;
      if (layoutSetorObs) texto += ` (${layoutSetorObs})`;
      partes.push(texto);
    }
    
    if (selectedCondicoes.length > 0) {
      let texto = `Condições: ${selectedCondicoes.join(', ')}`;
      if (condicoesObs) texto += ` (${condicoesObs})`;
      partes.push(texto);
    }
    
    if (selectedProcesso.length > 0) {
      let texto = `Processo: ${selectedProcesso.join(', ')}`;
      if (processoObs) texto += ` (${processoObs})`;
      partes.push(texto);
    }
    
    if (selectedMaquinas.length > 0) {
      let texto = `Máquinas/Equipamentos: ${selectedMaquinas.join(', ')}`;
      if (maquinasObs) texto += ` (${maquinasObs})`;
      partes.push(texto);
    }
    
    if (selectedOrganizacao.length > 0) {
      let texto = `Organização: ${selectedOrganizacao.join(', ')}`;
      if (organizacaoObs) texto += ` (${organizacaoObs})`;
      partes.push(texto);
    }
    
    if (selectedAcesso.length > 0) {
      let texto = `Acesso/Circulação: ${selectedAcesso.join(', ')}`;
      if (acessoObs) texto += ` (${acessoObs})`;
      partes.push(texto);
    }
    
    const descricao = partes.join('. ');
    setSetorFormData(p => ({ ...p, descricao_ambiente: descricao }));
  };

  // Função para carregar todas as características do ambiente de um setor
  const loadCaracteristicasAmbiente = (setor: Setor) => {
    setSelectedConstrucao(loadCaracteristicaFromString(setor.construcao || ''));
    setConstrucaoObs(setor.construcao_obs || '');
    setSelectedPiso(loadCaracteristicaFromString(setor.piso || ''));
    setPisoObs(setor.piso_obs || '');
    setSelectedVentilacao(loadCaracteristicaFromString(setor.ventilacao || ''));
    setVentilacaoObs(setor.ventilacao_obs || '');
    setSelectedIluminacao(loadCaracteristicaFromString(setor.iluminacao || ''));
    setIluminacaoObs(setor.iluminacao_obs || '');
    setSelectedLayoutSetor(loadCaracteristicaFromString(setor.layout_setor || ''));
    setLayoutSetorObs(setor.layout_setor_obs || '');
    setSelectedCondicoes(loadCaracteristicaFromString(setor.condicoes_gerais || ''));
    setCondicoesObs(setor.condicoes_gerais_obs || '');
    setSelectedProcesso(loadCaracteristicaFromString(setor.processo_trabalho || ''));
    setProcessoObs(setor.processo_trabalho_obs || '');
    setSelectedMaquinas(loadCaracteristicaFromString(setor.maquinas_equipamentos || ''));
    setMaquinasObs(setor.maquinas_equipamentos_obs || '');
    setSelectedOrganizacao(loadCaracteristicaFromString(setor.organizacao_trabalho || ''));
    setOrganizacaoObs(setor.organizacao_trabalho_obs || '');
    setSelectedAcesso(loadCaracteristicaFromString(setor.acesso_circulacao || ''));
    setAcessoObs(setor.acesso_circulacao_obs || '');
  };

  const handleSubmitSetor = async () => {
    if (!cliente?.cliente_empresa_id || !setorFormData.nome) {
      toast({ title: 'Preencha o nome do setor', variant: 'destructive' });
      return;
    }

    setSavingSetor(true);
    try {
      // Determinar valores finais de escala, turno e horarios
      const escalaFinal = setorFormData.escala === 'outro' ? escalaOutro : setorFormData.escala;
      const turnoFinal = setorFormData.turno === 'outro' ? turnoOutro : setorFormData.turno;
      const horariosFinal = setorFormData.horarios === 'outro' ? horariosOutro : setorFormData.horarios;
      
      const { error } = await supabase
        .from('setores')
        .insert({
          empresa_id: cliente.cliente_empresa_id,
          nome: setorFormData.nome,
          descricao: setorFormData.descricao || null,
          ativo: setorFormData.ativo,
          ambiente: setorFormData.ambiente || null,
          turnos_horarios: setorFormData.turnos_horarios || null,
          descricao_ambiente: setorFormData.descricao_ambiente || null,
          epc_existentes: getEpcString() || null,
          epi_obrigatorios: getEpiString() || null,
          evidencias_visita: getEvidenciasString() || null,
          escala: escalaFinal || null,
          turno: turnoFinal || null,
          horarios: horariosFinal || null,
          construcao: getCaracteristicaString(selectedConstrucao) || null,
          construcao_obs: construcaoObs || null,
          piso: getCaracteristicaString(selectedPiso) || null,
          piso_obs: pisoObs || null,
          ventilacao: getCaracteristicaString(selectedVentilacao) || null,
          ventilacao_obs: ventilacaoObs || null,
          iluminacao: getCaracteristicaString(selectedIluminacao) || null,
          iluminacao_obs: iluminacaoObs || null,
          layout_setor: getCaracteristicaString(selectedLayoutSetor) || null,
          layout_setor_obs: layoutSetorObs || null,
          condicoes_gerais: getCaracteristicaString(selectedCondicoes) || null,
          condicoes_gerais_obs: condicoesObs || null,
          processo_trabalho: getCaracteristicaString(selectedProcesso) || null,
          processo_trabalho_obs: processoObs || null,
          maquinas_equipamentos: getCaracteristicaString(selectedMaquinas) || null,
          maquinas_equipamentos_obs: maquinasObs || null,
          organizacao_trabalho: getCaracteristicaString(selectedOrganizacao) || null,
          organizacao_trabalho_obs: organizacaoObs || null,
          acesso_circulacao: getCaracteristicaString(selectedAcesso) || null,
          acesso_circulacao_obs: acessoObs || null,
        });

      if (error) throw error;

      toast({ title: 'Setor cadastrado com sucesso!' });
      setSetorDialogOpen(false);
      resetSetorForm();
      fetchSetores();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar setor', description: error.message, variant: 'destructive' });
    } finally {
      setSavingSetor(false);
    }
  };

  const handleEditSetor = async () => {
    if (!selectedSetor || !setorFormData.nome) {
      toast({ title: 'Preencha o nome do setor', variant: 'destructive' });
      return;
    }

    setSavingSetor(true);
    try {
      // Determinar valores finais de escala, turno e horarios
      const escalaFinal = setorFormData.escala === 'outro' ? escalaOutro : setorFormData.escala;
      const turnoFinal = setorFormData.turno === 'outro' ? turnoOutro : setorFormData.turno;
      const horariosFinal = setorFormData.horarios === 'outro' ? horariosOutro : setorFormData.horarios;
      
      const { error } = await supabase
        .from('setores')
        .update({
          nome: setorFormData.nome,
          descricao: setorFormData.descricao || null,
          ativo: setorFormData.ativo,
          ambiente: setorFormData.ambiente || null,
          turnos_horarios: setorFormData.turnos_horarios || null,
          descricao_ambiente: setorFormData.descricao_ambiente || null,
          epc_existentes: getEpcString() || null,
          epi_obrigatorios: getEpiString() || null,
          evidencias_visita: getEvidenciasString() || null,
          escala: escalaFinal || null,
          turno: turnoFinal || null,
          horarios: horariosFinal || null,
          construcao: getCaracteristicaString(selectedConstrucao) || null,
          construcao_obs: construcaoObs || null,
          piso: getCaracteristicaString(selectedPiso) || null,
          piso_obs: pisoObs || null,
          ventilacao: getCaracteristicaString(selectedVentilacao) || null,
          ventilacao_obs: ventilacaoObs || null,
          iluminacao: getCaracteristicaString(selectedIluminacao) || null,
          iluminacao_obs: iluminacaoObs || null,
          layout_setor: getCaracteristicaString(selectedLayoutSetor) || null,
          layout_setor_obs: layoutSetorObs || null,
          condicoes_gerais: getCaracteristicaString(selectedCondicoes) || null,
          condicoes_gerais_obs: condicoesObs || null,
          processo_trabalho: getCaracteristicaString(selectedProcesso) || null,
          processo_trabalho_obs: processoObs || null,
          maquinas_equipamentos: getCaracteristicaString(selectedMaquinas) || null,
          maquinas_equipamentos_obs: maquinasObs || null,
          organizacao_trabalho: getCaracteristicaString(selectedOrganizacao) || null,
          organizacao_trabalho_obs: organizacaoObs || null,
          acesso_circulacao: getCaracteristicaString(selectedAcesso) || null,
          acesso_circulacao_obs: acessoObs || null,
        })
        .eq('id', selectedSetor.id);

      if (error) throw error;

      toast({ title: 'Setor atualizado com sucesso!' });
      setEditSetorDialogOpen(false);
      setSelectedSetor(null);
      resetSetorForm();
      fetchSetores();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar setor', description: error.message, variant: 'destructive' });
    } finally {
      setSavingSetor(false);
    }
  };

  const handleDeleteSetor = async () => {
    if (!selectedSetor) return;

    try {
      const { error } = await supabase
        .from('setores')
        .delete()
        .eq('id', selectedSetor.id);

      if (error) throw error;

      toast({ title: 'Setor excluído com sucesso!' });
      setDeleteSetorDialogOpen(false);
      setSelectedSetor(null);
      fetchSetores();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir setor', description: error.message, variant: 'destructive' });
    }
  };

  const openEditSetorDialog = (setor: Setor) => {
    setSelectedSetor(setor);
    
    // Verificar se escala/turno/horarios são valores personalizados
    const escalaValue = setor.escala || '';
    const turnoValue = setor.turno || '';
    const horariosValue = setor.horarios || '';
    
    const isEscalaOutro = escalaValue && !OPCOES_ESCALA.includes(escalaValue);
    const isTurnoOutro = turnoValue && !OPCOES_TURNO.includes(turnoValue);
    const isHorariosOutro = horariosValue && !OPCOES_HORARIOS.includes(horariosValue);
    
    setSetorFormData({
      nome: setor.nome,
      descricao: setor.descricao || '',
      ativo: setor.ativo,
      ambiente: setor.ambiente || '',
      turnos_horarios: setor.turnos_horarios || '',
      descricao_ambiente: setor.descricao_ambiente || '',
      epc_existentes: setor.epc_existentes || '',
      epi_obrigatorios: setor.epi_obrigatorios || '',
      evidencias_visita: setor.evidencias_visita || '',
      escala: isEscalaOutro ? 'outro' : escalaValue,
      turno: isTurnoOutro ? 'outro' : turnoValue,
      horarios: isHorariosOutro ? 'outro' : horariosValue,
    });
    
    setEscalaOutro(isEscalaOutro ? escalaValue : '');
    setTurnoOutro(isTurnoOutro ? turnoValue : '');
    setHorariosOutro(isHorariosOutro ? horariosValue : '');
    
    loadEpcsFromString(setor.epc_existentes || '');
    loadEpisFromString(setor.epi_obrigatorios || '');
    loadEvidenciasFromString(setor.evidencias_visita || '');
    loadCaracteristicasAmbiente(setor);
    setEditSetorDialogOpen(true);
  };

  // Funções para Funções (Cargos)
  const fetchFuncoes = async () => {
    if (!cliente?.cliente_empresa_id) return;
    
    setLoadingFuncoes(true);
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('nome');

      if (error) throw error;
      setFuncoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoadingFuncoes(false);
    }
  };

  const resetFuncaoForm = () => {
    setFuncaoFormData({ nome: '', descricao: '', ativo: true, cbo: '' });
    setCboSearch('');
    setCboResults([]);
  };

  // Função para buscar CBO
  const searchCBO = async (term: string) => {
    if (!term || term.length < 2) {
      setCboResults([]);
      return;
    }

    setLoadingCbo(true);
    try {
      const { data, error } = await (supabase as any)
        .from('cbo_ocupacoes')
        .select('id, codigo, codigo_formatado, descricao')
        .or(`codigo.ilike.%${term}%,descricao.ilike.%${term}%`)
        .order('descricao')
        .limit(50);

      if (error) throw error;
      setCboResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar CBO:', error);
      setCboResults([]);
    } finally {
      setLoadingCbo(false);
    }
  };

  // Debounce para busca CBO
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cboSearch.length >= 2) {
        searchCBO(cboSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cboSearch]);

  const handleSubmitFuncao = async () => {
    if (!cliente?.cliente_empresa_id || !funcaoFormData.nome) {
      toast({ title: 'Preencha o nome do cargo', variant: 'destructive' });
      return;
    }

    setSavingFuncao(true);
    try {
      const { error } = await supabase
        .from('cargos')
        .insert({
          empresa_id: cliente.cliente_empresa_id,
          nome: funcaoFormData.nome,
          descricao: funcaoFormData.descricao || null,
          ativo: funcaoFormData.ativo,
          cbo: funcaoFormData.cbo || null,
        });

      if (error) throw error;

      toast({ title: 'Cargo cadastrado com sucesso!' });
      setFuncaoDialogOpen(false);
      resetFuncaoForm();
      fetchFuncoes();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar cargo', description: error.message, variant: 'destructive' });
    } finally {
      setSavingFuncao(false);
    }
  };

  const handleEditFuncao = async () => {
    if (!selectedFuncao || !funcaoFormData.nome) {
      toast({ title: 'Preencha o nome do cargo', variant: 'destructive' });
      return;
    }

    setSavingFuncao(true);
    try {
      const { error } = await supabase
        .from('cargos')
        .update({
          nome: funcaoFormData.nome,
          descricao: funcaoFormData.descricao || null,
          ativo: funcaoFormData.ativo,
          cbo: funcaoFormData.cbo || null,
        })
        .eq('id', selectedFuncao.id);

      if (error) throw error;

      toast({ title: 'Cargo atualizado com sucesso!' });
      setEditFuncaoDialogOpen(false);
      setSelectedFuncao(null);
      resetFuncaoForm();
      fetchFuncoes();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar cargo', description: error.message, variant: 'destructive' });
    } finally {
      setSavingFuncao(false);
    }
  };

  const handleDeleteFuncao = async () => {
    if (!selectedFuncao) return;

    try {
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', selectedFuncao.id);

      if (error) throw error;

      toast({ title: 'Cargo excluído com sucesso!' });
      setDeleteFuncaoDialogOpen(false);
      setSelectedFuncao(null);
      fetchFuncoes();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir cargo', description: error.message, variant: 'destructive' });
    }
  };

  const openEditFuncaoDialog = (funcao: Funcao) => {
    setSelectedFuncao(funcao);
    setFuncaoFormData({
      nome: funcao.nome,
      descricao: funcao.descricao || '',
      ativo: funcao.ativo,
      cbo: funcao.cbo || '',
    });
    setCboSearch(funcao.cbo || '');
    setEditFuncaoDialogOpen(true);
  };

  // Funções para Matriz de EPI
  const fetchMatrizEpis = async () => {
    if (!cliente?.cliente_empresa_id) return;
    
    setLoadingMatrizEpi(true);
    try {
      const { data, error } = await (supabase as any)
        .from('matriz_epi_cargo')
        .select(`
          id,
          empresa_id,
          cargo_id,
          epi_id,
          tipo_epi_nr6,
          obrigatorio,
          observacao,
          created_at,
          cargo:cargos(id, nome),
          epi:cadastro_epis(id, nome_modelo, tipo_epi, numero_ca)
        `)
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatrizEpis(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar matriz de EPI:', error);
    } finally {
      setLoadingMatrizEpi(false);
    }
  };

  const fetchCadastroEpis = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('cadastro_epis')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome_modelo');

      if (error) throw error;
      setCadastroEpis(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar cadastro de EPIs:', error);
    }
  };

  const resetMatrizEpiForm = () => {
    setMatrizEpiFormData({
      cargo_id: '',
      epi_ids: [],
      tipos_epi: [],
      obrigatorio: true,
      observacao: '',
    });
    setFiltroTipoEpi('');
    setOutroEpiInput('');
  };

  const handleSubmitMatrizEpi = async () => {
    if (!cliente?.cliente_empresa_id || !matrizEpiFormData.cargo_id || matrizEpiFormData.tipos_epi.length === 0) {
      toast({ title: 'Selecione um cargo e pelo menos um tipo de EPI', variant: 'destructive' });
      return;
    }

    setSavingMatrizEpi(true);
    try {
      // Inserir múltiplos tipos de EPI da NR-6 para o mesmo cargo
      const inserts = matrizEpiFormData.tipos_epi.map(tipo_epi => ({
        empresa_id: cliente.cliente_empresa_id,
        cargo_id: matrizEpiFormData.cargo_id,
        tipo_epi_nr6: tipo_epi,
        obrigatorio: matrizEpiFormData.obrigatorio,
        observacao: matrizEpiFormData.observacao || null,
      }));

      const { error } = await (supabase as any)
        .from('matriz_epi_cargo')
        .insert(inserts);

      if (error) throw error;

      toast({ title: 'Matriz de EPI cadastrada com sucesso!' });
      setMatrizEpiDialogOpen(false);
      resetMatrizEpiForm();
      fetchMatrizEpis();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar matriz de EPI', description: error.message, variant: 'destructive' });
    } finally {
      setSavingMatrizEpi(false);
    }
  };

  const handleEditMatrizEpi = async () => {
    if (!selectedMatrizEpi) return;

    setSavingMatrizEpi(true);
    try {
      const { error } = await (supabase as any)
        .from('matriz_epi_cargo')
        .update({
          obrigatorio: matrizEpiFormData.obrigatorio,
          observacao: matrizEpiFormData.observacao || null,
        })
        .eq('id', selectedMatrizEpi.id);

      if (error) throw error;

      toast({ title: 'Matriz de EPI atualizada com sucesso!' });
      setEditMatrizEpiDialogOpen(false);
      setSelectedMatrizEpi(null);
      resetMatrizEpiForm();
      fetchMatrizEpis();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar matriz de EPI', description: error.message, variant: 'destructive' });
    } finally {
      setSavingMatrizEpi(false);
    }
  };

  const handleDeleteMatrizEpi = async () => {
    if (!selectedMatrizEpi) return;

    try {
      const { error } = await (supabase as any)
        .from('matriz_epi_cargo')
        .delete()
        .eq('id', selectedMatrizEpi.id);

      if (error) throw error;

      toast({ title: 'Registro excluído com sucesso!' });
      setDeleteMatrizEpiDialogOpen(false);
      setSelectedMatrizEpi(null);
      fetchMatrizEpis();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    }
  };

  const openEditMatrizEpiDialog = (matriz: MatrizEPI) => {
    setSelectedMatrizEpi(matriz);
    setMatrizEpiFormData({
      cargo_id: matriz.cargo_id,
      epi_ids: matriz.epi_id ? [matriz.epi_id] : [],
      tipos_epi: matriz.tipo_epi_nr6 ? [matriz.tipo_epi_nr6] : [],
      obrigatorio: matriz.obrigatorio,
      observacao: matriz.observacao || '',
    });
    setEditMatrizEpiDialogOpen(true);
  };

  // Agrupar matriz por cargo para exibição
  const matrizAgrupadaPorCargo = matrizEpis.reduce((acc, item) => {
    const cargoNome = item.cargo?.nome || 'Sem cargo';
    if (!acc[cargoNome]) {
      acc[cargoNome] = [];
    }
    acc[cargoNome].push(item);
    return acc;
  }, {} as Record<string, MatrizEPI[]>);

  // Funções para Perigos
  const fetchPerigos = async () => {
    if (!cliente?.cliente_empresa_id) return;
    setLoadingPerigos(true);
    try {
      const { data, error } = await (supabase as any)
        .from('perigos')
        .select('*')
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('nome');
      if (error) throw error;
      setPerigos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar perigos:', error);
    } finally {
      setLoadingPerigos(false);
    }
  };

  const resetPerigoForm = () => {
    setPerigoFormData({ nome: '', descricao: '', categoria: '', ativo: true });
  };

  const handleSubmitPerigo = async () => {
    if (!cliente?.cliente_empresa_id || !perigoFormData.nome.trim()) {
      toast({ title: 'Preencha o nome do perigo', variant: 'destructive' });
      return;
    }
    setSavingPerigo(true);
    try {
      const { error } = await (supabase as any).from('perigos').insert({
        empresa_id: cliente.cliente_empresa_id,
        nome: perigoFormData.nome.trim(),
        descricao: perigoFormData.descricao.trim() || null,
        categoria: perigoFormData.categoria || null,
        ativo: perigoFormData.ativo,
      });
      if (error) throw error;
      toast({ title: 'Perigo cadastrado com sucesso!' });
      setPerigoDialogOpen(false);
      resetPerigoForm();
      fetchPerigos();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar perigo', description: error.message, variant: 'destructive' });
    } finally {
      setSavingPerigo(false);
    }
  };

  const handleEditPerigo = async () => {
    if (!selectedPerigo) return;
    setSavingPerigo(true);
    try {
      const { error } = await (supabase as any).from('perigos').update({
        nome: perigoFormData.nome.trim(),
        descricao: perigoFormData.descricao.trim() || null,
        categoria: perigoFormData.categoria || null,
        ativo: perigoFormData.ativo,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedPerigo.id);
      if (error) throw error;
      toast({ title: 'Perigo atualizado com sucesso!' });
      setEditPerigoDialogOpen(false);
      setSelectedPerigo(null);
      resetPerigoForm();
      fetchPerigos();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar perigo', description: error.message, variant: 'destructive' });
    } finally {
      setSavingPerigo(false);
    }
  };

  const handleDeletePerigo = async () => {
    if (!selectedPerigo) return;
    try {
      const { error } = await (supabase as any).from('perigos').delete().eq('id', selectedPerigo.id);
      if (error) throw error;
      toast({ title: 'Perigo excluído com sucesso!' });
      setDeletePerigoDialogOpen(false);
      setSelectedPerigo(null);
      fetchPerigos();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir perigo', description: error.message, variant: 'destructive' });
    }
  };

  const openEditPerigoDialog = (perigo: Perigo) => {
    setSelectedPerigo(perigo);
    setPerigoFormData({
      nome: perigo.nome,
      descricao: perigo.descricao || '',
      categoria: perigo.categoria || '',
      ativo: perigo.ativo,
    });
    setEditPerigoDialogOpen(true);
  };

  // Funções para Riscos
  const fetchRiscos = async () => {
    if (!cliente?.cliente_empresa_id) return;
    setLoadingRiscos(true);
    try {
      const { data, error } = await (supabase as any)
        .from('riscos')
        .select('*')
        .eq('empresa_id', cliente.cliente_empresa_id)
        .order('nome');
      if (error) throw error;
      setRiscos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar riscos:', error);
    } finally {
      setLoadingRiscos(false);
    }
  };

  const resetRiscoForm = () => {
    setRiscoFormData({ nome: '', descricao: '', tipo: '', severidade: '', probabilidade: '', ativo: true });
  };

  const handleSubmitRisco = async () => {
    if (!cliente?.cliente_empresa_id || !riscoFormData.nome.trim()) {
      toast({ title: 'Preencha o nome do risco', variant: 'destructive' });
      return;
    }
    setSavingRisco(true);
    try {
      const { error } = await (supabase as any).from('riscos').insert({
        empresa_id: cliente.cliente_empresa_id,
        nome: riscoFormData.nome.trim(),
        descricao: riscoFormData.descricao.trim() || null,
        tipo: riscoFormData.tipo || null,
        severidade: riscoFormData.severidade || null,
        probabilidade: riscoFormData.probabilidade || null,
        ativo: riscoFormData.ativo,
      });
      if (error) throw error;
      toast({ title: 'Risco cadastrado com sucesso!' });
      setRiscoDialogOpen(false);
      resetRiscoForm();
      fetchRiscos();
    } catch (error: any) {
      toast({ title: 'Erro ao cadastrar risco', description: error.message, variant: 'destructive' });
    } finally {
      setSavingRisco(false);
    }
  };

  const handleEditRisco = async () => {
    if (!selectedRisco) return;
    setSavingRisco(true);
    try {
      const { error } = await (supabase as any).from('riscos').update({
        nome: riscoFormData.nome.trim(),
        descricao: riscoFormData.descricao.trim() || null,
        tipo: riscoFormData.tipo || null,
        severidade: riscoFormData.severidade || null,
        probabilidade: riscoFormData.probabilidade || null,
        ativo: riscoFormData.ativo,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedRisco.id);
      if (error) throw error;
      toast({ title: 'Risco atualizado com sucesso!' });
      setEditRiscoDialogOpen(false);
      setSelectedRisco(null);
      resetRiscoForm();
      fetchRiscos();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar risco', description: error.message, variant: 'destructive' });
    } finally {
      setSavingRisco(false);
    }
  };

  const handleDeleteRisco = async () => {
    if (!selectedRisco) return;
    try {
      const { error } = await (supabase as any).from('riscos').delete().eq('id', selectedRisco.id);
      if (error) throw error;
      toast({ title: 'Risco excluído com sucesso!' });
      setDeleteRiscoDialogOpen(false);
      setSelectedRisco(null);
      fetchRiscos();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir risco', description: error.message, variant: 'destructive' });
    }
  };

  const openEditRiscoDialog = (risco: Risco) => {
    setSelectedRisco(risco);
    setRiscoFormData({
      nome: risco.nome,
      descricao: risco.descricao || '',
      tipo: risco.tipo || '',
      severidade: risco.severidade || '',
      probabilidade: risco.probabilidade || '',
      ativo: risco.ativo,
    });
    setEditRiscoDialogOpen(true);
  };

  // useEffect para carregar dados quando o dialog abre
  useEffect(() => {
    if (open && cliente?.id) {
      fetchColaboradores();
      fetchUnidades();
      fetchSetores();
      fetchFuncoes();
      fetchProfissionaisSaude();
      fetchProfissionaisSeguranca();
      fetchMatrizEpis();
      fetchCadastroEpis();
      fetchPerigos();
      fetchRiscos();
    }
  }, [open, cliente?.id]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'agendada': { label: 'Agendada', variant: 'secondary' },
      'em_andamento': { label: 'Em Andamento', variant: 'default' },
      'concluida': { label: 'Concluída', variant: 'outline' },
      'cancelada': { label: 'Cancelada', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatEndereco = () => {
    const emp = cliente?.cliente_empresa;
    if (!emp) return null;
    
    const parts = [];
    if (emp.endereco) {
      let enderecoCompleto = emp.endereco;
      if (emp.numero) enderecoCompleto += `, ${emp.numero}`;
      if (emp.complemento) enderecoCompleto += ` - ${emp.complemento}`;
      parts.push(enderecoCompleto);
    }
    if (emp.bairro) parts.push(emp.bairro);
    if (emp.cidade && emp.estado) parts.push(`${emp.cidade}/${emp.estado}`);
    if (emp.cep) parts.push(`CEP: ${emp.cep}`);
    
    return parts.length > 0 ? parts.join(' - ') : null;
  };

  const getPrimeiraDataTurma = (turma: Turma) => {
    if (!turma.aulas || turma.aulas.length === 0) return '-';
    const datas = turma.aulas.map(a => a.data).sort();
    return format(new Date(datas[0] + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (!cliente) return null;

  const isPage = variant === 'page';

  const tabItems = [
    { value: 'info-empresa', icon: <FileText className="h-4 w-4" />, label: 'Info. Empresa' },
    { value: 'unidades', icon: <MapPin className="h-4 w-4" />, label: `Unidades (${unidades.length})` },
    { value: 'setores', icon: <FolderTree className="h-4 w-4" />, label: `Setor (${setores.length})` },
    { value: 'funcoes', icon: <Briefcase className="h-4 w-4" />, label: `Cargo (${funcoes.length})` },
    { value: 'colaboradores', icon: <Users className="h-4 w-4" />, label: `Colaboradores (${colaboradores.length})` },
    { value: 'prof-saude', icon: <Stethoscope className="h-4 w-4" />, label: `Prof. Saúde (${profissionaisSaude.length})` },
    { value: 'prof-seguranca', icon: <HardHat className="h-4 w-4" />, label: `Prof. Segurança (${profissionaisSeguranca.length})` },
    { value: 'matriz-epi', icon: <HardHat className="h-4 w-4" />, label: `Matriz EPI (${matrizEpis.length})` },
    { value: 'perigos', icon: <FileText className="h-4 w-4" />, label: `Perigos (${perigos.length})` },
    { value: 'riscos', icon: <FileText className="h-4 w-4" />, label: `Riscos (${riscos.length})` },
  ];

  return (
    <div className={isPage ? "h-full w-full flex flex-row overflow-hidden" : "flex-1 overflow-hidden flex flex-col"}>
      <Tabs defaultValue="info-empresa" orientation={isPage ? 'vertical' : 'horizontal'} className={isPage ? "h-full w-full flex flex-row gap-0 overflow-hidden" : "flex-1 overflow-hidden flex flex-col"}>
          {isPage ? (
            <div className="flex flex-col h-full w-[--sidebar-width,15rem] min-w-[15rem] shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
              {/* Sidebar Header */}
              <div className="flex flex-col gap-2 border-b border-sidebar-border p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium text-sidebar-foreground/60">Detalhes do Cliente</span>
                </div>
                <h2 className="text-sm font-bold text-sidebar-foreground leading-tight truncate" title={cliente?.cliente_empresa?.nome || cliente?.nome || ''}>
                  {cliente?.cliente_empresa?.nome || cliente?.nome}
                </h2>
                {cliente?.sigla && (
                  <span className="text-xs text-primary font-medium">{cliente.sigla}</span>
                )}
              </div>

              {/* Sidebar Navigation */}
              <TabsList className="flex flex-col flex-1 h-auto w-full items-stretch justify-start gap-0 rounded-none bg-transparent p-0 overflow-y-auto">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-4 pt-4 pb-2">Menu</p>
                <div className="flex flex-col gap-0.5 px-2">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-md px-3 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground data-[state=active]:font-medium data-[state=active]:shadow-none justify-start whitespace-nowrap"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </div>
              </TabsList>

              {/* Sidebar Footer */}
              <div className="border-t border-sidebar-border p-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>Voltar aos Clientes</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-max min-w-full text-white">
                {tabItems.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1 text-xs whitespace-nowrap">
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          <div className={isPage ? "flex-1 flex flex-col overflow-hidden" : "flex-1 overflow-hidden flex flex-col"}>
            {isPage && (
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold truncate">{cliente?.cliente_empresa?.razao_social || cliente?.nome}</h1>
                {cliente?.sigla && (
                  <Badge variant="outline" className="shrink-0">{cliente.sigla}</Badge>
                )}
              </div>
            )}
            <div className={isPage ? "flex-1 overflow-auto p-5 [&>[role=tabpanel]]:!mt-0" : "flex-1 overflow-hidden flex flex-col"}>
          <TabsContent value="info-empresa" className="flex-1 overflow-auto mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Informações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Nome</span>
                    <p className="font-medium">{cliente.nome}</p>
                  </div>
                  {cliente.sigla && (
                    <div>
                      <span className="text-xs text-muted-foreground">Sigla</span>
                      <p className="font-medium">{cliente.sigla}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">CNPJ</span>
                    <p className="font-medium">{formatarCnpjExibicao(cliente.cnpj || cliente.cliente_empresa?.cnpj)}</p>
                  </div>
                  {cliente.responsavel && (
                    <div>
                      <span className="text-xs text-muted-foreground">Responsável</span>
                      <p className="font-medium">{cliente.responsavel}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(cliente.email || cliente.cliente_empresa?.email) && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{cliente.email || cliente.cliente_empresa?.email}</span>
                    </div>
                  )}
                  {(cliente.telefone || cliente.cliente_empresa?.telefone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{cliente.telefone || cliente.cliente_empresa?.telefone}</span>
                    </div>
                  )}
                  {formatEndereco() && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{formatEndereco()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{colaboradores.length}</p>
                      <p className="text-xs text-muted-foreground">Colaboradores</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {colaboradores.filter(c => c.ativo).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Ativos</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{turmas.length}</p>
                      <p className="text-xs text-muted-foreground">Turmas</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {turmas.filter(t => t.status === 'concluida').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="colaboradores" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportColaboradoresCSV} disabled={colaboradores.length === 0}>
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importingCSV}>
                    {importingCSV ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Importar
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                  <Button size="sm" onClick={() => { resetColaboradorForm(); setColaboradorDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Colaborador
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingColaboradores ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : colaboradores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Users className="h-8 w-8 mb-2" />
                    <p>Nenhum colaborador cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colaboradores.map((colaborador) => (
                          <TableRow 
                            key={colaborador.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedColaborador(colaborador);
                              setColaboradorDetalhesOpen(true);
                            }}
                          >
                            <TableCell className="font-medium text-primary">{colaborador.nome}</TableCell>
                            <TableCell>{colaborador.matricula || '-'}</TableCell>
                            <TableCell>{colaborador.cpf || '-'}</TableCell>
                            <TableCell>{colaborador.cargo || '-'}</TableCell>
                            <TableCell>{colaborador.setor || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={colaborador.ativo ? 'default' : 'secondary'}>
                                {colaborador.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Unidades */}
          <TabsContent value="unidades" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Unidades (Filiais)</CardTitle>
                <Button size="sm" onClick={() => { resetUnidadeForm(); setUnidadeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Unidade
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingUnidades ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : unidades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <MapPin className="h-8 w-8 mb-2" />
                    <p>Nenhuma unidade cadastrada</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Razão Social</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Cidade/UF</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unidades.map((unidade) => (
                          <TableRow key={unidade.id}>
                            <TableCell className="font-medium">{unidade.razao_social}</TableCell>
                            <TableCell>{unidade.numero_inscricao || '-'}</TableCell>
                            <TableCell>{unidade.cidade ? `${unidade.cidade}/${unidade.uf}` : '-'}</TableCell>
                            <TableCell>
                              <Badge variant={unidade.status === 'ativo' ? 'default' : 'secondary'}>
                                {unidade.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditUnidadeDialog(unidade)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedUnidade(unidade); setDeleteUnidadeDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Setores */}
          <TabsContent value="setores" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Setores</CardTitle>
                <Button size="sm" onClick={() => { resetSetorForm(); setSetorDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Setor
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingSetores ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : setores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FolderTree className="h-8 w-8 mb-2" />
                    <p>Nenhum setor cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {setores.map((setor) => (
                          <TableRow key={setor.id}>
                            <TableCell className="font-medium text-primary">{setor.nome}</TableCell>
                            <TableCell>{setor.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={setor.ativo ? 'default' : 'secondary'}>
                                {setor.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditSetorDialog(setor)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedSetor(setor); setDeleteSetorDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Cargos */}
          <TabsContent value="funcoes" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Cargos</CardTitle>
                <Button size="sm" onClick={() => { resetFuncaoForm(); setFuncaoDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Cargo
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingFuncoes ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : funcoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mb-2" />
                    <p>Nenhum cargo cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Cargo</TableHead>
                          <TableHead>CBO</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funcoes.map((funcao) => (
                          <TableRow key={funcao.id}>
                            <TableCell className="font-medium text-primary">{funcao.nome}</TableCell>
                            <TableCell>{funcao.cbo || '-'}</TableCell>
                            <TableCell>{funcao.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={funcao.ativo ? 'default' : 'secondary'}>
                                {funcao.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditFuncaoDialog(funcao)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedFuncao(funcao); setDeleteFuncaoDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Profissionais de Saúde */}
          <TabsContent value="prof-saude" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Profissionais de Saúde</CardTitle>
                <Button size="sm" onClick={() => { resetProfSaudeForm(); setProfSaudeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Profissional
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingProfSaude ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : profissionaisSaude.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Stethoscope className="h-8 w-8 mb-2" />
                    <p>Nenhum profissional de saúde cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Especialidade</TableHead>
                          <TableHead>Conselho</TableHead>
                          <TableHead>Nº Conselho</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profissionaisSaude.map((prof) => (
                          <TableRow key={prof.id}>
                            <TableCell className="font-medium text-primary">{prof.nome}</TableCell>
                            <TableCell>{prof.especialidade}</TableCell>
                            <TableCell>{prof.conselho}</TableCell>
                            <TableCell>{prof.nr_conselho}/{prof.uf_conselho}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditProfSaudeDialog(prof)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedProfSaude(prof); setDeleteProfSaudeDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Profissionais de Segurança */}
          <TabsContent value="prof-seguranca" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Profissionais de Segurança</CardTitle>
                <Button size="sm" onClick={() => { resetProfSegurancaForm(); setProfSegurancaDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Profissional
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingProfSeguranca ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : profissionaisSeguranca.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <HardHat className="h-8 w-8 mb-2" />
                    <p>Nenhum profissional de segurança cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Especialidade</TableHead>
                          <TableHead>Conselho</TableHead>
                          <TableHead>Nº Conselho</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profissionaisSeguranca.map((prof) => (
                          <TableRow key={prof.id}>
                            <TableCell className="font-medium text-primary">{prof.nome}</TableCell>
                            <TableCell>{prof.especialidade}</TableCell>
                            <TableCell>{prof.conselho}</TableCell>
                            <TableCell>{prof.nr_conselho}/{prof.uf_conselho}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditProfSegurancaDialog(prof)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedProfSeguranca(prof); setDeleteProfSegurancaDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Matriz de EPI */}
          <TabsContent value="matriz-epi" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Matriz de EPI por Cargo</CardTitle>
                <Button size="sm" onClick={() => { resetMatrizEpiForm(); setMatrizEpiDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Matriz
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loadingMatrizEpi ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : matrizEpis.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <HardHat className="h-8 w-8 mb-2" />
                    <p>Nenhuma matriz de EPI cadastrada</p>
                    <p className="text-xs mt-1">Relacione EPIs aos cargos da empresa</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 space-y-2">
                      {Object.entries(matrizAgrupadaPorCargo).map(([cargoNome, epis]) => (
                        <Collapsible key={cargoNome} className="border rounded-lg">
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-accent/50 transition-colors">
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">{cargoNome}</span>
                            <Badge variant="secondary" className="ml-auto">{epis.length} EPI(s)</Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-3 pb-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50%]">Tipo de EPI (NR-6)</TableHead>
                                  <TableHead>Obrigatório</TableHead>
                                  <TableHead>Observação</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {epis.map((matriz) => (
                                  <TableRow key={matriz.id}>
                                    <TableCell className="font-medium text-sm">
                                      {matriz.tipo_epi_nr6 || matriz.epi?.nome_modelo || '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={matriz.obrigatorio ? 'default' : 'secondary'}>
                                        {matriz.obrigatorio ? 'Sim' : 'Não'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[150px] truncate">{matriz.observacao || '-'}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button variant="outline" size="sm" onClick={() => openEditMatrizEpiDialog(matriz)}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedMatrizEpi(matriz); setDeleteMatrizEpiDialogOpen(true); }}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Perigos */}
          <TabsContent value="perigos" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Perigos Identificados</CardTitle>
                <Button size="sm" onClick={() => { resetPerigoForm(); setPerigoDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Perigo
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                {loadingPerigos ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : perigos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2" />
                    <p>Nenhum perigo cadastrado</p>
                    <p className="text-xs mt-1">Cadastre os perigos identificados na empresa</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perigos.map((perigo) => (
                          <TableRow key={perigo.id}>
                            <TableCell className="font-medium">{perigo.nome}</TableCell>
                            <TableCell>{perigo.categoria || '-'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{perigo.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={perigo.ativo ? 'default' : 'secondary'}>
                                {perigo.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditPerigoDialog(perigo)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedPerigo(perigo); setDeletePerigoDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Riscos */}
          <TabsContent value="riscos" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Riscos Ocupacionais</CardTitle>
                <Button size="sm" onClick={() => { resetRiscoForm(); setRiscoDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Risco
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                {loadingRiscos ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : riscos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2" />
                    <p>Nenhum risco cadastrado</p>
                    <p className="text-xs mt-1">Cadastre os riscos ocupacionais da empresa</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Probabilidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riscos.map((risco) => (
                          <TableRow key={risco.id}>
                            <TableCell className="font-medium">{risco.nome}</TableCell>
                            <TableCell>{risco.tipo || '-'}</TableCell>
                            <TableCell>
                              {risco.severidade && (
                                <Badge variant={
                                  risco.severidade === 'Crítica' ? 'destructive' :
                                  risco.severidade === 'Alta' ? 'destructive' :
                                  risco.severidade === 'Média' ? 'default' : 'secondary'
                                }>
                                  {risco.severidade}
                                </Badge>
                              )}
                              {!risco.severidade && '-'}
                            </TableCell>
                            <TableCell>{risco.probabilidade || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={risco.ativo ? 'default' : 'secondary'}>
                                {risco.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditRiscoDialog(risco)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedRisco(risco); setDeleteRiscoDialogOpen(true); }}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
            </div>
          </div>
        </Tabs>

      {/* Colaborador Detalhes Dialog */}
      <ColaboradorDetalhesDialog
        colaborador={selectedColaborador}
        open={colaboradorDetalhesOpen}
        onOpenChange={(open) => {
          setColaboradorDetalhesOpen(open);
          if (!open) setSelectedColaborador(null);
        }}
      />

      {/* Dialog Nova Unidade */}
      <Dialog open={unidadeDialogOpen} onOpenChange={setUnidadeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Unidade (Filial)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Inscrição</Label>
                <Select value={unidadeFormData.tipo_inscricao} onValueChange={(v) => {
                  setUnidadeFormData(p => ({ ...p, tipo_inscricao: v, numero_inscricao: '' }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_INSCRICAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº Inscrição ({TIPOS_INSCRICAO.find(t => t.value === unidadeFormData.tipo_inscricao)?.label.split('-')[1] || 'CNPJ'})</Label>
                <div className="relative">
                  <Input 
                    value={unidadeFormData.numero_inscricao} 
                    onChange={(e) => {
                      const valorFormatado = formatarNumeroInscricao(e.target.value, unidadeFormData.tipo_inscricao);
                      setUnidadeFormData(p => ({ ...p, numero_inscricao: valorFormatado }));
                      const numLimpo = e.target.value.replace(/\D/g, '');
                      const maxDigitos = getMaxDigitosInscricao(unidadeFormData.tipo_inscricao);
                      if (numLimpo.length === maxDigitos && unidadeFormData.tipo_inscricao === '1') {
                        buscarCnpjUnidade(numLimpo);
                      }
                    }}
                    placeholder={getPlaceholderInscricao(unidadeFormData.tipo_inscricao)}
                  />
                  {buscandoCnpjUnidade && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Referência</Label>
                <Input value={unidadeFormData.nome_referencia} onChange={(e) => setUnidadeFormData(p => ({ ...p, nome_referencia: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={unidadeFormData.razao_social} onChange={(e) => setUnidadeFormData(p => ({ ...p, razao_social: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CNAE</Label>
                <Input value={unidadeFormData.cnae} onChange={(e) => setUnidadeFormData(p => ({ ...p, cnae: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Atividade CNAE</Label>
                <Input value={unidadeFormData.cnae_atividade} onChange={(e) => setUnidadeFormData(p => ({ ...p, cnae_atividade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Grau de Risco</Label>
                <Input value={unidadeFormData.grau_risco} onChange={(e) => setUnidadeFormData(p => ({ ...p, grau_risco: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <Input 
                    value={unidadeFormData.cep} 
                    onChange={(e) => {
                      const cepLimpo = e.target.value.replace(/\D/g, '');
                      const cepFormatado = cepLimpo.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
                      setUnidadeFormData(p => ({ ...p, cep: cepFormatado }));
                      if (cepLimpo.length === 8) {
                        buscarCepUnidade(cepLimpo);
                      }
                    }}
                    placeholder="00000-000"
                  />
                  {buscandoCepUnidade && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Logradouro</Label>
                <Input value={unidadeFormData.logradouro} onChange={(e) => setUnidadeFormData(p => ({ ...p, logradouro: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={unidadeFormData.numero} onChange={(e) => setUnidadeFormData(p => ({ ...p, numero: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={unidadeFormData.complemento} onChange={(e) => setUnidadeFormData(p => ({ ...p, complemento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={unidadeFormData.bairro} onChange={(e) => setUnidadeFormData(p => ({ ...p, bairro: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={unidadeFormData.cidade} onChange={(e) => setUnidadeFormData(p => ({ ...p, cidade: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={unidadeFormData.uf} onValueChange={(v) => setUnidadeFormData(p => ({ ...p, uf: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={unidadeFormData.status} onValueChange={(v) => setUnidadeFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnidadeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitUnidade} disabled={savingUnidade}>
              {savingUnidade && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Unidade */}
      <Dialog open={editUnidadeDialogOpen} onOpenChange={setEditUnidadeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Inscrição</Label>
                <Select value={unidadeFormData.tipo_inscricao} onValueChange={(v) => {
                  setUnidadeFormData(p => ({ ...p, tipo_inscricao: v, numero_inscricao: '' }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_INSCRICAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº Inscrição ({TIPOS_INSCRICAO.find(t => t.value === unidadeFormData.tipo_inscricao)?.label.split('-')[1] || 'CNPJ'})</Label>
                <div className="relative">
                  <Input 
                    value={unidadeFormData.numero_inscricao} 
                    onChange={(e) => {
                      const valorFormatado = formatarNumeroInscricao(e.target.value, unidadeFormData.tipo_inscricao);
                      setUnidadeFormData(p => ({ ...p, numero_inscricao: valorFormatado }));
                      const numLimpo = e.target.value.replace(/\D/g, '');
                      const maxDigitos = getMaxDigitosInscricao(unidadeFormData.tipo_inscricao);
                      if (numLimpo.length === maxDigitos && unidadeFormData.tipo_inscricao === '1') {
                        buscarCnpjUnidade(numLimpo);
                      }
                    }}
                    placeholder={getPlaceholderInscricao(unidadeFormData.tipo_inscricao)}
                  />
                  {buscandoCnpjUnidade && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Referência</Label>
                <Input value={unidadeFormData.nome_referencia} onChange={(e) => setUnidadeFormData(p => ({ ...p, nome_referencia: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={unidadeFormData.razao_social} onChange={(e) => setUnidadeFormData(p => ({ ...p, razao_social: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CNAE</Label>
                <Input value={unidadeFormData.cnae} onChange={(e) => setUnidadeFormData(p => ({ ...p, cnae: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Atividade CNAE</Label>
                <Input value={unidadeFormData.cnae_atividade} onChange={(e) => setUnidadeFormData(p => ({ ...p, cnae_atividade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Grau de Risco</Label>
                <Input value={unidadeFormData.grau_risco} onChange={(e) => setUnidadeFormData(p => ({ ...p, grau_risco: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <Input 
                    value={unidadeFormData.cep} 
                    onChange={(e) => {
                      const cepLimpo = e.target.value.replace(/\D/g, '');
                      const cepFormatado = cepLimpo.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
                      setUnidadeFormData(p => ({ ...p, cep: cepFormatado }));
                      if (cepLimpo.length === 8) {
                        buscarCepUnidade(cepLimpo);
                      }
                    }}
                    placeholder="00000-000"
                  />
                  {buscandoCepUnidade && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Logradouro</Label>
                <Input value={unidadeFormData.logradouro} onChange={(e) => setUnidadeFormData(p => ({ ...p, logradouro: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={unidadeFormData.numero} onChange={(e) => setUnidadeFormData(p => ({ ...p, numero: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={unidadeFormData.complemento} onChange={(e) => setUnidadeFormData(p => ({ ...p, complemento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={unidadeFormData.bairro} onChange={(e) => setUnidadeFormData(p => ({ ...p, bairro: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={unidadeFormData.cidade} onChange={(e) => setUnidadeFormData(p => ({ ...p, cidade: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={unidadeFormData.uf} onValueChange={(v) => setUnidadeFormData(p => ({ ...p, uf: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={unidadeFormData.status} onValueChange={(v) => setUnidadeFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUnidadeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditUnidade} disabled={savingUnidade}>
              {savingUnidade && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Unidade */}
      <AlertDialog open={deleteUnidadeDialogOpen} onOpenChange={setDeleteUnidadeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade "{selectedUnidade?.razao_social}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnidade} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Profissional de Saúde */}
      <Dialog open={profSaudeDialogOpen} onOpenChange={setProfSaudeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Profissional de Saúde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={profSaudeFormData.especialidade} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, especialidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SAUDE.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={profSaudeFormData.nome} onChange={(e) => setProfSaudeFormData(p => ({ ...p, nome: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={profSaudeFormData.cpf} onChange={(e) => setProfSaudeFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select value={profSaudeFormData.conselho} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, conselho: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SAUDE.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Conselho</Label>
                <Input value={profSaudeFormData.nr_conselho} onChange={(e) => setProfSaudeFormData(p => ({ ...p, nr_conselho: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select value={profSaudeFormData.uf_conselho} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, uf_conselho: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfSaudeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitProfSaude} disabled={savingProfSaude}>
              {savingProfSaude && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Profissional de Saúde */}
      <Dialog open={editProfSaudeDialogOpen} onOpenChange={setEditProfSaudeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Profissional de Saúde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={profSaudeFormData.especialidade} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, especialidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SAUDE.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={profSaudeFormData.nome} onChange={(e) => setProfSaudeFormData(p => ({ ...p, nome: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={profSaudeFormData.cpf} onChange={(e) => setProfSaudeFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select value={profSaudeFormData.conselho} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, conselho: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SAUDE.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Conselho</Label>
                <Input value={profSaudeFormData.nr_conselho} onChange={(e) => setProfSaudeFormData(p => ({ ...p, nr_conselho: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select value={profSaudeFormData.uf_conselho} onValueChange={(v) => setProfSaudeFormData(p => ({ ...p, uf_conselho: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfSaudeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditProfSaude} disabled={savingProfSaude}>
              {savingProfSaude && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Profissional de Saúde */}
      <AlertDialog open={deleteProfSaudeDialogOpen} onOpenChange={setDeleteProfSaudeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o profissional "{selectedProfSaude?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfSaude} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Profissional de Segurança */}
      <Dialog open={profSegurancaDialogOpen} onOpenChange={setProfSegurancaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Profissional de Segurança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={profSegurancaFormData.especialidade} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, especialidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SEGURANCA.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={profSegurancaFormData.nome} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, nome: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={profSegurancaFormData.cpf} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select value={profSegurancaFormData.conselho} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, conselho: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SEGURANCA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Conselho</Label>
                <Input value={profSegurancaFormData.nr_conselho} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, nr_conselho: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select value={profSegurancaFormData.uf_conselho} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, uf_conselho: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfSegurancaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitProfSeguranca} disabled={savingProfSeguranca}>
              {savingProfSeguranca && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Profissional de Segurança */}
      <Dialog open={editProfSegurancaDialogOpen} onOpenChange={setEditProfSegurancaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Profissional de Segurança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={profSegurancaFormData.especialidade} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, especialidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SEGURANCA.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={profSegurancaFormData.nome} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, nome: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={profSegurancaFormData.cpf} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select value={profSegurancaFormData.conselho} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, conselho: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SEGURANCA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Conselho</Label>
                <Input value={profSegurancaFormData.nr_conselho} onChange={(e) => setProfSegurancaFormData(p => ({ ...p, nr_conselho: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select value={profSegurancaFormData.uf_conselho} onValueChange={(v) => setProfSegurancaFormData(p => ({ ...p, uf_conselho: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfSegurancaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditProfSeguranca} disabled={savingProfSeguranca}>
              {savingProfSeguranca && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Profissional de Segurança */}
      <AlertDialog open={deleteProfSegurancaDialogOpen} onOpenChange={setDeleteProfSegurancaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o profissional "{selectedProfSeguranca?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfSeguranca} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Setor */}
      <Dialog open={setorDialogOpen} onOpenChange={setSetorDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Setor / Ambiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Input 
                  value={setorFormData.nome} 
                  onChange={(e) => setSetorFormData(p => ({ ...p, nome: e.target.value }))} 
                  placeholder="Ex.: Administrativo"
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiente (subárea)</Label>
                <Input 
                  value={setorFormData.ambiente} 
                  onChange={(e) => setSetorFormData(p => ({ ...p, ambiente: e.target.value }))} 
                  placeholder="Ex.: Sala 1º andar"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Escala</Label>
                <Select value={setorFormData.escala} onValueChange={(v) => setSetorFormData(p => ({ ...p, escala: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a escala" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_ESCALA.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.escala === 'outro' && (
                  <Input 
                    value={escalaOutro}
                    onChange={(e) => setEscalaOutro(e.target.value)}
                    placeholder="Digite a escala..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={setorFormData.turno} onValueChange={(v) => setSetorFormData(p => ({ ...p, turno: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_TURNO.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.turno === 'outro' && (
                  <Input 
                    value={turnoOutro}
                    onChange={(e) => setTurnoOutro(e.target.value)}
                    placeholder="Digite o turno..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Horários</Label>
                <Select value={setorFormData.horarios} onValueChange={(v) => setSetorFormData(p => ({ ...p, horarios: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_HORARIOS.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.horarios === 'outro' && (
                  <Input 
                    value={horariosOutro}
                    onChange={(e) => setHorariosOutro(e.target.value)}
                    placeholder="Digite o horário..."
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Características do Ambiente - Novo Setor */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <h4 className="font-semibold text-sm text-primary">Características do Ambiente</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1"><Label className="text-xs">Construção do Setor</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setConstrucaoDropdownOpen(!construcaoDropdownOpen)}>{selectedConstrucao.length > 0 ? `${selectedConstrucao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{construcaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_CONSTRUCAO.map((op) => (<div key={`novo-constr-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedConstrucao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedConstrucao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setConstrucaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Construção</Label><Input value={construcaoObs} onChange={(e) => setConstrucaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Piso</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setPisoDropdownOpen(!pisoDropdownOpen)}>{selectedPiso.length > 0 ? `${selectedPiso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{pisoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_PISO.map((op) => (<div key={`novo-piso-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedPiso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedPiso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setPisoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Piso</Label><Input value={pisoObs} onChange={(e) => setPisoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Ventilação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setVentilacaoDropdownOpen(!ventilacaoDropdownOpen)}>{selectedVentilacao.length > 0 ? `${selectedVentilacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{ventilacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_VENTILACAO.map((op) => (<div key={`novo-vent-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedVentilacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedVentilacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setVentilacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Ventilação</Label><Input value={ventilacaoObs} onChange={(e) => setVentilacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Iluminação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setIluminacaoDropdownOpen(!iluminacaoDropdownOpen)}>{selectedIluminacao.length > 0 ? `${selectedIluminacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{iluminacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ILUMINACAO.map((op) => (<div key={`novo-ilum-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedIluminacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedIluminacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setIluminacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Iluminação</Label><Input value={iluminacaoObs} onChange={(e) => setIluminacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Layout do Setor</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setLayoutSetorDropdownOpen(!layoutSetorDropdownOpen)}>{selectedLayoutSetor.length > 0 ? `${selectedLayoutSetor.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{layoutSetorDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_LAYOUT.map((op) => (<div key={`novo-layout-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedLayoutSetor(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedLayoutSetor.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setLayoutSetorDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Layout</Label><Input value={layoutSetorObs} onChange={(e) => setLayoutSetorObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Condições Gerais</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setCondicoesDropdownOpen(!condicoesDropdownOpen)}>{selectedCondicoes.length > 0 ? `${selectedCondicoes.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{condicoesDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_CONDICOES.map((op) => (<div key={`novo-cond-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedCondicoes(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedCondicoes.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setCondicoesDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Condições</Label><Input value={condicoesObs} onChange={(e) => setCondicoesObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Processo de Trabalho</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setProcessoDropdownOpen(!processoDropdownOpen)}>{selectedProcesso.length > 0 ? `${selectedProcesso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{processoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_PROCESSO.map((op) => (<div key={`novo-proc-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedProcesso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedProcesso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setProcessoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Processo</Label><Input value={processoObs} onChange={(e) => setProcessoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Máquinas/Equipamentos</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setMaquinasDropdownOpen(!maquinasDropdownOpen)}>{selectedMaquinas.length > 0 ? `${selectedMaquinas.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{maquinasDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_MAQUINAS.map((op) => (<div key={`novo-maq-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedMaquinas(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedMaquinas.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setMaquinasDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Máquinas</Label><Input value={maquinasObs} onChange={(e) => setMaquinasObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Organização do Trabalho</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setOrganizacaoDropdownOpen(!organizacaoDropdownOpen)}>{selectedOrganizacao.length > 0 ? `${selectedOrganizacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{organizacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ORGANIZACAO.map((op) => (<div key={`novo-org-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedOrganizacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedOrganizacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setOrganizacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Organização</Label><Input value={organizacaoObs} onChange={(e) => setOrganizacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Acesso e Circulação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setAcessoDropdownOpen(!acessoDropdownOpen)}>{selectedAcesso.length > 0 ? `${selectedAcesso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{acessoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ACESSO.map((op) => (<div key={`novo-acess-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedAcesso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedAcesso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setAcessoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Acesso</Label><Input value={acessoObs} onChange={(e) => setAcessoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
              </div>
              <div className="pt-2 border-t">
                <Button type="button" variant="secondary" size="sm" className="w-full text-xs" onClick={gerarDescricaoAmbiente}>
                  Gerar Descrição do Ambiente
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Ambiente</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={setorFormData.descricao_ambiente} 
                onChange={(e) => setSetorFormData(p => ({ ...p, descricao_ambiente: e.target.value }))} 
                placeholder="Clique em 'Gerar Descrição do Ambiente' ou digite manualmente..."
              />
            </div>

            <div className="space-y-2">
              <Label>EPC existentes (multi-seleção)</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setEpcDropdownOpen(!epcDropdownOpen)}
                >
                  {selectedEpcs.length > 0 
                    ? `${selectedEpcs.length} EPC(s) selecionado(s)` 
                    : 'Selecione os EPCs existentes'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>
                {epcDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      {CATEGORIAS_EPC.map((categoria, catIndex) => (
                        <div key={catIndex} className="mb-3">
                          <p className="text-xs font-semibold text-primary mb-1 px-2">{categoria.categoria}</p>
                          {categoria.itens.map((item, itemIndex) => (
                            <div
                              key={`${catIndex}-${itemIndex}`}
                              className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer"
                              onClick={() => toggleEpc(item)}
                            >
                              <Checkbox 
                                checked={selectedEpcs.includes(item)} 
                                onCheckedChange={() => toggleEpc(item)}
                              />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs font-semibold text-primary mb-1 px-2">Outros</p>
                        <div className="px-2">
                          <Input
                            value={epcOutros}
                            onChange={(e) => setEpcOutros(e.target.value)}
                            placeholder="Digite outros EPCs não listados..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-2 flex justify-end">
                      <Button size="sm" onClick={() => setEpcDropdownOpen(false)}>Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              {selectedEpcs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEpcs.map((epc, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {epc}
                      <button 
                        type="button"
                        className="ml-1 hover:text-destructive" 
                        onClick={() => toggleEpc(epc)}
                      >×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {epcOutros && (
                <p className="text-xs text-muted-foreground mt-1">Outros: {epcOutros}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>EPI obrigatórios (multi-seleção)</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setEpiDropdownOpen(!epiDropdownOpen)}
                >
                  {selectedEpis.length > 0 
                    ? `${selectedEpis.length} EPI(s) selecionado(s)` 
                    : 'Selecione os EPIs obrigatórios'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>
                {epiDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      {CATEGORIAS_EPI.map((categoria, catIndex) => (
                        <div key={catIndex} className="mb-3">
                          <p className="text-xs font-semibold text-primary mb-1 px-2">{categoria.categoria}</p>
                          {categoria.subcategorias.flatMap((sub, subIndex) => 
                            sub.itens.map((item, itemIndex) => (
                              <div
                                key={`epi-${catIndex}-${subIndex}-${itemIndex}`}
                                className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer"
                                onClick={() => toggleEpi(item)}
                              >
                                <Checkbox 
                                  checked={selectedEpis.includes(item)} 
                                  onCheckedChange={() => toggleEpi(item)}
                                />
                                <span className="text-sm">{item}</span>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs font-semibold text-primary mb-1 px-2">Outros</p>
                        <div className="px-2">
                          <Input
                            value={epiOutros}
                            onChange={(e) => setEpiOutros(e.target.value)}
                            placeholder="Digite outros EPIs não listados..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-2 flex justify-end">
                      <Button size="sm" onClick={() => setEpiDropdownOpen(false)}>Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              {selectedEpis.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEpis.map((epi, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {epi}
                      <button 
                        type="button"
                        className="ml-1 hover:text-destructive" 
                        onClick={() => toggleEpi(epi)}
                      >×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {epiOutros && (
                <p className="text-xs text-muted-foreground mt-1">Outros: {epiOutros}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Evidências da Visita Técnica (até 2 fotos)</Label>
              <div className="flex flex-wrap gap-3">
                {evidenciasFotos.map((foto, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={foto} 
                      alt={`Evidência ${index + 1}`} 
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidencia(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {evidenciasFotos.length < 2 && (
                  <label className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    {uploadingEvidencia ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEvidenciaUpload}
                      disabled={uploadingEvidencia}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{evidenciasFotos.length}/2 fotos</p>
            </div>
            <div className="space-y-2">
              <Label>Descrição Geral</Label>
              <Input 
                value={setorFormData.descricao} 
                onChange={(e) => setSetorFormData(p => ({ ...p, descricao: e.target.value }))} 
                placeholder="Descrição adicional do setor"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="setor-ativo-novo" checked={setorFormData.ativo} onCheckedChange={(checked) => setSetorFormData(p => ({ ...p, ativo: !!checked }))} />
              <Label htmlFor="setor-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetorDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitSetor} disabled={savingSetor}>
              {savingSetor && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Setor */}
      <Dialog open={editSetorDialogOpen} onOpenChange={setEditSetorDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Setor / Ambiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Input 
                  value={setorFormData.nome} 
                  onChange={(e) => setSetorFormData(p => ({ ...p, nome: e.target.value }))} 
                  placeholder="Ex.: Administrativo"
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiente (subárea)</Label>
                <Input 
                  value={setorFormData.ambiente} 
                  onChange={(e) => setSetorFormData(p => ({ ...p, ambiente: e.target.value }))} 
                  placeholder="Ex.: Sala 1º andar"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Escala</Label>
                <Select value={setorFormData.escala} onValueChange={(v) => setSetorFormData(p => ({ ...p, escala: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a escala" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_ESCALA.map((opcao) => (
                      <SelectItem key={`edit-escala-${opcao}`} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.escala === 'outro' && (
                  <Input 
                    value={escalaOutro}
                    onChange={(e) => setEscalaOutro(e.target.value)}
                    placeholder="Digite a escala..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={setorFormData.turno} onValueChange={(v) => setSetorFormData(p => ({ ...p, turno: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_TURNO.map((opcao) => (
                      <SelectItem key={`edit-turno-${opcao}`} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.turno === 'outro' && (
                  <Input 
                    value={turnoOutro}
                    onChange={(e) => setTurnoOutro(e.target.value)}
                    placeholder="Digite o turno..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Horários</Label>
                <Select value={setorFormData.horarios} onValueChange={(v) => setSetorFormData(p => ({ ...p, horarios: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_HORARIOS.map((opcao) => (
                      <SelectItem key={`edit-horarios-${opcao}`} value={opcao}>{opcao}</SelectItem>
                    ))}
                    <SelectItem value="outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
                {setorFormData.horarios === 'outro' && (
                  <Input 
                    value={horariosOutro}
                    onChange={(e) => setHorariosOutro(e.target.value)}
                    placeholder="Digite o horário..."
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Características do Ambiente - Editar Setor */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <h4 className="font-semibold text-sm text-primary">Características do Ambiente</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1"><Label className="text-xs">Construção do Setor</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setConstrucaoDropdownOpen(!construcaoDropdownOpen)}>{selectedConstrucao.length > 0 ? `${selectedConstrucao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{construcaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_CONSTRUCAO.map((op) => (<div key={`edit-constr-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedConstrucao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedConstrucao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setConstrucaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Construção</Label><Input value={construcaoObs} onChange={(e) => setConstrucaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Piso</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setPisoDropdownOpen(!pisoDropdownOpen)}>{selectedPiso.length > 0 ? `${selectedPiso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{pisoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_PISO.map((op) => (<div key={`edit-piso-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedPiso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedPiso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setPisoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Piso</Label><Input value={pisoObs} onChange={(e) => setPisoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Ventilação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setVentilacaoDropdownOpen(!ventilacaoDropdownOpen)}>{selectedVentilacao.length > 0 ? `${selectedVentilacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{ventilacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_VENTILACAO.map((op) => (<div key={`edit-vent-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedVentilacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedVentilacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setVentilacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Ventilação</Label><Input value={ventilacaoObs} onChange={(e) => setVentilacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Iluminação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setIluminacaoDropdownOpen(!iluminacaoDropdownOpen)}>{selectedIluminacao.length > 0 ? `${selectedIluminacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{iluminacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ILUMINACAO.map((op) => (<div key={`edit-ilum-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedIluminacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedIluminacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setIluminacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Iluminação</Label><Input value={iluminacaoObs} onChange={(e) => setIluminacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Layout do Setor</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setLayoutSetorDropdownOpen(!layoutSetorDropdownOpen)}>{selectedLayoutSetor.length > 0 ? `${selectedLayoutSetor.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{layoutSetorDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_LAYOUT.map((op) => (<div key={`edit-layout-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedLayoutSetor(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedLayoutSetor.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setLayoutSetorDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Layout</Label><Input value={layoutSetorObs} onChange={(e) => setLayoutSetorObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Condições Gerais</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setCondicoesDropdownOpen(!condicoesDropdownOpen)}>{selectedCondicoes.length > 0 ? `${selectedCondicoes.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{condicoesDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_CONDICOES.map((op) => (<div key={`edit-cond-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedCondicoes(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedCondicoes.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setCondicoesDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Condições</Label><Input value={condicoesObs} onChange={(e) => setCondicoesObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Processo de Trabalho</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setProcessoDropdownOpen(!processoDropdownOpen)}>{selectedProcesso.length > 0 ? `${selectedProcesso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{processoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_PROCESSO.map((op) => (<div key={`edit-proc-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedProcesso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedProcesso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setProcessoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Processo</Label><Input value={processoObs} onChange={(e) => setProcessoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Máquinas/Equipamentos</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setMaquinasDropdownOpen(!maquinasDropdownOpen)}>{selectedMaquinas.length > 0 ? `${selectedMaquinas.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{maquinasDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_MAQUINAS.map((op) => (<div key={`edit-maq-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedMaquinas(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedMaquinas.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setMaquinasDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Máquinas</Label><Input value={maquinasObs} onChange={(e) => setMaquinasObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Organização do Trabalho</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setOrganizacaoDropdownOpen(!organizacaoDropdownOpen)}>{selectedOrganizacao.length > 0 ? `${selectedOrganizacao.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{organizacaoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ORGANIZACAO.map((op) => (<div key={`edit-org-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedOrganizacao(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedOrganizacao.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setOrganizacaoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Organização</Label><Input value={organizacaoObs} onChange={(e) => setOrganizacaoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs">Acesso e Circulação</Label><div className="relative"><Button type="button" variant="outline" size="sm" className="w-full justify-between text-left font-normal text-xs h-8" onClick={() => setAcessoDropdownOpen(!acessoDropdownOpen)}>{selectedAcesso.length > 0 ? `${selectedAcesso.length} selecionado(s)` : 'Selecione...'}<Search className="h-3 w-3 ml-1" /></Button>{acessoDropdownOpen && (<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"><div className="p-2">{OPCOES_ACESSO.map((op) => (<div key={`edit-acess-${op}`} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => setSelectedAcesso(prev => prev.includes(op) ? prev.filter(e => e !== op) : [...prev, op])}><Checkbox checked={selectedAcesso.includes(op)} /><span className="text-xs">{op}</span></div>))}</div><div className="border-t p-2"><Button size="sm" className="w-full h-6 text-xs" onClick={() => setAcessoDropdownOpen(false)}>Fechar</Button></div></div>)}</div></div>
                <div className="space-y-1"><Label className="text-xs">Obs. Acesso</Label><Input value={acessoObs} onChange={(e) => setAcessoObs(e.target.value)} placeholder="Observação..." className="h-8 text-xs" /></div>
              </div>
              <div className="pt-2 border-t">
                <Button type="button" variant="secondary" size="sm" className="w-full text-xs" onClick={gerarDescricaoAmbiente}>
                  Gerar Descrição do Ambiente
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Ambiente</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={setorFormData.descricao_ambiente} 
                onChange={(e) => setSetorFormData(p => ({ ...p, descricao_ambiente: e.target.value }))} 
                placeholder="Clique em 'Gerar Descrição do Ambiente' ou digite manualmente..."
              />
            </div>

            <div className="space-y-2">
              <Label>EPC existentes (multi-seleção)</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setEpcDropdownOpen(!epcDropdownOpen)}
                >
                  {selectedEpcs.length > 0 
                    ? `${selectedEpcs.length} EPC(s) selecionado(s)` 
                    : 'Selecione os EPCs existentes'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>
                {epcDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      {CATEGORIAS_EPC.map((categoria, catIndex) => (
                        <div key={catIndex} className="mb-3">
                          <p className="text-xs font-semibold text-primary mb-1 px-2">{categoria.categoria}</p>
                          {categoria.itens.map((item, itemIndex) => (
                            <div
                              key={`${catIndex}-${itemIndex}`}
                              className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer"
                              onClick={() => toggleEpc(item)}
                            >
                              <Checkbox 
                                checked={selectedEpcs.includes(item)} 
                                onCheckedChange={() => toggleEpc(item)}
                              />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs font-semibold text-primary mb-1 px-2">Outros</p>
                        <div className="px-2">
                          <Input
                            value={epcOutros}
                            onChange={(e) => setEpcOutros(e.target.value)}
                            placeholder="Digite outros EPCs não listados..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-2 flex justify-end">
                      <Button size="sm" onClick={() => setEpcDropdownOpen(false)}>Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              {selectedEpcs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEpcs.map((epc, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {epc}
                      <button 
                        type="button"
                        className="ml-1 hover:text-destructive" 
                        onClick={() => toggleEpc(epc)}
                      >×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {epcOutros && (
                <p className="text-xs text-muted-foreground mt-1">Outros: {epcOutros}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>EPI obrigatórios (multi-seleção)</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setEpiDropdownOpen(!epiDropdownOpen)}
                >
                  {selectedEpis.length > 0 
                    ? `${selectedEpis.length} EPI(s) selecionado(s)` 
                    : 'Selecione os EPIs obrigatórios'}
                  <Search className="h-4 w-4 ml-2" />
                </Button>
                {epiDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      {CATEGORIAS_EPI.map((categoria, catIndex) => (
                        <div key={catIndex} className="mb-3">
                          <p className="text-xs font-semibold text-primary mb-1 px-2">{categoria.categoria}</p>
                          {categoria.subcategorias.flatMap((sub, subIndex) => 
                            sub.itens.map((item, itemIndex) => (
                              <div
                                key={`epi-edit-${catIndex}-${subIndex}-${itemIndex}`}
                                className="flex items-center space-x-2 px-2 py-1 hover:bg-accent rounded cursor-pointer"
                                onClick={() => toggleEpi(item)}
                              >
                                <Checkbox 
                                  checked={selectedEpis.includes(item)} 
                                  onCheckedChange={() => toggleEpi(item)}
                                />
                                <span className="text-sm">{item}</span>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs font-semibold text-primary mb-1 px-2">Outros</p>
                        <div className="px-2">
                          <Input
                            value={epiOutros}
                            onChange={(e) => setEpiOutros(e.target.value)}
                            placeholder="Digite outros EPIs não listados..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-2 flex justify-end">
                      <Button size="sm" onClick={() => setEpiDropdownOpen(false)}>Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              {selectedEpis.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEpis.map((epi, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {epi}
                      <button 
                        type="button"
                        className="ml-1 hover:text-destructive" 
                        onClick={() => toggleEpi(epi)}
                      >×</button>
                    </Badge>
                  ))}
                </div>
              )}
              {epiOutros && (
                <p className="text-xs text-muted-foreground mt-1">Outros: {epiOutros}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Evidências da Visita Técnica (até 2 fotos)</Label>
              <div className="flex flex-wrap gap-3">
                {evidenciasFotos.map((foto, index) => (
                  <div key={`edit-evidencia-${index}`} className="relative group">
                    <img 
                      src={foto} 
                      alt={`Evidência ${index + 1}`} 
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidencia(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {evidenciasFotos.length < 2 && (
                  <label className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    {uploadingEvidencia ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEvidenciaUpload}
                      disabled={uploadingEvidencia}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{evidenciasFotos.length}/2 fotos</p>
            </div>
            <div className="space-y-2">
              <Label>Descrição Geral</Label>
              <Input 
                value={setorFormData.descricao} 
                onChange={(e) => setSetorFormData(p => ({ ...p, descricao: e.target.value }))} 
                placeholder="Descrição adicional do setor"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="setor-ativo-edit" checked={setorFormData.ativo} onCheckedChange={(checked) => setSetorFormData(p => ({ ...p, ativo: !!checked }))} />
              <Label htmlFor="setor-ativo-edit">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSetorDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSetor} disabled={savingSetor}>
              {savingSetor && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Setor */}
      <AlertDialog open={deleteSetorDialogOpen} onOpenChange={setDeleteSetorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor "{selectedSetor?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSetor} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Cargo */}
      <Dialog open={funcaoDialogOpen} onOpenChange={setFuncaoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cargo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={funcaoFormData.nome} onChange={(e) => setFuncaoFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CBO (Classificação Brasileira de Ocupações)</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input 
                    value={cboSearch} 
                    onChange={(e) => {
                      setCboSearch(e.target.value);
                      setFuncaoFormData(p => ({ ...p, cbo: e.target.value }));
                      setCboDropdownOpen(true);
                    }}
                    onFocus={() => setCboDropdownOpen(true)}
                    placeholder="Digite código ou nome da ocupação..."
                    className="flex-1"
                  />
                  {loadingCbo && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
                {cboDropdownOpen && cboResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {cboResults.map((cbo) => (
                      <div
                        key={cbo.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setFuncaoFormData(p => ({ ...p, cbo: cbo.codigo }));
                          setCboSearch(`${cbo.codigo} - ${cbo.descricao}`);
                          setCboDropdownOpen(false);
                        }}
                      >
                        <span className="font-medium">{cbo.codigo}</span> - {cbo.descricao}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {funcaoFormData.cbo && (
                <p className="text-xs text-muted-foreground">CBO selecionado: {funcaoFormData.cbo}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={funcaoFormData.descricao} onChange={(e) => setFuncaoFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="funcao-ativo" checked={funcaoFormData.ativo} onCheckedChange={(checked) => setFuncaoFormData(p => ({ ...p, ativo: !!checked }))} />
              <Label htmlFor="funcao-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuncaoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitFuncao} disabled={savingFuncao}>
              {savingFuncao && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Cargo */}
      <Dialog open={editFuncaoDialogOpen} onOpenChange={setEditFuncaoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cargo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={funcaoFormData.nome} onChange={(e) => setFuncaoFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CBO (Classificação Brasileira de Ocupações)</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input 
                    value={cboSearch} 
                    onChange={(e) => {
                      setCboSearch(e.target.value);
                      setFuncaoFormData(p => ({ ...p, cbo: e.target.value }));
                      setCboDropdownOpen(true);
                    }}
                    onFocus={() => setCboDropdownOpen(true)}
                    placeholder="Digite código ou nome da ocupação..."
                    className="flex-1"
                  />
                  {loadingCbo && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3" />}
                </div>
                {cboDropdownOpen && cboResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {cboResults.map((cbo) => (
                      <div
                        key={cbo.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setFuncaoFormData(p => ({ ...p, cbo: cbo.codigo }));
                          setCboSearch(`${cbo.codigo} - ${cbo.descricao}`);
                          setCboDropdownOpen(false);
                        }}
                      >
                        <span className="font-medium">{cbo.codigo}</span> - {cbo.descricao}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {funcaoFormData.cbo && (
                <p className="text-xs text-muted-foreground">CBO selecionado: {funcaoFormData.cbo}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={funcaoFormData.descricao} onChange={(e) => setFuncaoFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="funcao-ativo-edit" checked={funcaoFormData.ativo} onCheckedChange={(checked) => setFuncaoFormData(p => ({ ...p, ativo: !!checked }))} />
              <Label htmlFor="funcao-ativo-edit">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFuncaoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditFuncao} disabled={savingFuncao}>
              {savingFuncao && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Cargo */}
      <AlertDialog open={deleteFuncaoDialogOpen} onOpenChange={setDeleteFuncaoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo "{selectedFuncao?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFuncao} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Colaborador */}
      <Dialog open={colaboradorDialogOpen} onOpenChange={setColaboradorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                value={colaboradorFormData.nome} 
                onChange={(e) => setColaboradorFormData(p => ({ ...p, nome: e.target.value }))} 
                placeholder="Nome completo do colaborador"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input 
                  value={colaboradorFormData.cpf} 
                  onChange={(e) => setColaboradorFormData(p => ({ ...p, cpf: e.target.value }))} 
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Matrícula eSocial</Label>
                <Input 
                  value={colaboradorFormData.matricula} 
                  onChange={(e) => setColaboradorFormData(p => ({ ...p, matricula: e.target.value }))} 
                  placeholder="Número da matrícula"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={colaboradorFormData.cargo} onValueChange={(value) => setColaboradorFormData(p => ({ ...p, cargo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.filter(f => f.ativo).map((funcao) => (
                    <SelectItem key={funcao.id} value={funcao.nome}>{funcao.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CBO (Classificação Brasileira de Ocupações)</Label>
              <Input 
                value={funcoes.find(f => f.nome === colaboradorFormData.cargo)?.cbo || ''}
                readOnly
                disabled
                placeholder="Selecione um cargo para exibir o CBO"
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={colaboradorFormData.setor} onValueChange={(value) => setColaboradorFormData(p => ({ ...p, setor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.filter(s => s.ativo).map((setor) => (
                    <SelectItem key={setor.id} value={setor.nome}>{setor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="colaborador-ativo" 
                checked={colaboradorFormData.ativo} 
                onCheckedChange={(checked) => setColaboradorFormData(p => ({ ...p, ativo: !!checked }))} 
              />
              <Label htmlFor="colaborador-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColaboradorDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitColaborador} disabled={savingColaborador}>
              {savingColaborador && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Matriz de EPI */}
      <Dialog open={matrizEpiDialogOpen} onOpenChange={setMatrizEpiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Matriz de EPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={matrizEpiFormData.cargo_id} onValueChange={(v) => setMatrizEpiFormData(p => ({ ...p, cargo_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.filter(f => f.ativo).map((funcao) => (
                    <SelectItem key={funcao.id} value={funcao.id}>{funcao.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipos de EPI (NR-6) *</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione os tipos de EPI conforme Anexo I da NR-6</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tipo de EPI..."
                  value={filtroTipoEpi}
                  onChange={(e) => setFiltroTipoEpi(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-[280px] border rounded-md">
                <div className="p-3 space-y-4">
                  {CATEGORIAS_EPI.map((categoria, catIndex) => {
                    const filtroLower = filtroTipoEpi.toLowerCase();
                    const subcategoriasFiltradas = categoria.subcategorias.map(sub => ({
                      ...sub,
                      itens: sub.itens.filter(item => 
                        filtroTipoEpi === '' || 
                        item.toLowerCase().includes(filtroLower) ||
                        sub.nome.toLowerCase().includes(filtroLower) ||
                        categoria.categoria.toLowerCase().includes(filtroLower)
                      )
                    })).filter(sub => sub.itens.length > 0);

                    if (subcategoriasFiltradas.length === 0) return null;

                    return (
                      <div key={catIndex} className="space-y-2">
                        <div className="font-semibold text-sm text-primary bg-muted/50 p-2 rounded sticky top-0">
                          {categoria.categoria}
                        </div>
                        {subcategoriasFiltradas.map((subcategoria, subIndex) => (
                          <div key={subIndex} className="ml-2 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground py-1 border-b">
                              {subcategoria.nome}
                            </div>
                            <div className="space-y-1 ml-2">
                              {subcategoria.itens.map((item, itemIndex) => {
                                const itemKey = `${catIndex}-${subIndex}-${itemIndex}`;
                                return (
                                  <div key={itemKey} className="flex items-start space-x-2 p-1.5 hover:bg-accent rounded">
                                    <Checkbox
                                      id={`tipo-epi-${itemKey}`}
                                      checked={matrizEpiFormData.tipos_epi.includes(item)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setMatrizEpiFormData(p => ({ ...p, tipos_epi: [...p.tipos_epi, item] }));
                                        } else {
                                          setMatrizEpiFormData(p => ({ ...p, tipos_epi: p.tipos_epi.filter(t => t !== item) }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`tipo-epi-${itemKey}`} className="text-xs cursor-pointer leading-tight">
                                      {item}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  
                  {/* Opção Outros - EPI Personalizado */}
                  <div className="space-y-2 border-t pt-3 mt-3">
                    <div className="font-semibold text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      OUTROS — EPI PERSONALIZADO
                    </div>
                    <div className="ml-2 space-y-2">
                      <p className="text-xs text-muted-foreground">Adicione um EPI que não está na lista da NR-6</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Descreva o EPI..."
                          value={outroEpiInput}
                          onChange={(e) => setOutroEpiInput(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!outroEpiInput.trim()}
                          onClick={() => {
                            if (outroEpiInput.trim()) {
                              const novoEpi = `[Outro] ${outroEpiInput.trim()}`;
                              if (!matrizEpiFormData.tipos_epi.includes(novoEpi)) {
                                setMatrizEpiFormData(p => ({ ...p, tipos_epi: [...p.tipos_epi, novoEpi] }));
                              }
                              setOutroEpiInput('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              {matrizEpiFormData.tipos_epi.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary">{matrizEpiFormData.tipos_epi.length} tipo(s) de EPI selecionado(s)</p>
                  <div className="flex flex-wrap gap-1">
                    {matrizEpiFormData.tipos_epi.slice(0, 5).map((tipo, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tipo.length > 40 ? tipo.substring(0, 40) + '...' : tipo}
                      </Badge>
                    ))}
                    {matrizEpiFormData.tipos_epi.length > 5 && (
                      <Badge variant="outline" className="text-xs">+{matrizEpiFormData.tipos_epi.length - 5} mais</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="matriz-obrigatorio"
                checked={matrizEpiFormData.obrigatorio}
                onCheckedChange={(checked) => setMatrizEpiFormData(p => ({ ...p, obrigatorio: !!checked }))}
              />
              <Label htmlFor="matriz-obrigatorio">EPI Obrigatório</Label>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                value={matrizEpiFormData.observacao}
                onChange={(e) => setMatrizEpiFormData(p => ({ ...p, observacao: e.target.value }))}
                placeholder="Observações sobre o uso do EPI"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatrizEpiDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitMatrizEpi} disabled={savingMatrizEpi || matrizEpiFormData.tipos_epi.length === 0}>
              {savingMatrizEpi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Matriz de EPI */}
      <Dialog open={editMatrizEpiDialogOpen} onOpenChange={setEditMatrizEpiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Matriz de EPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={selectedMatrizEpi?.cargo?.nome || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de EPI (NR-6)</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedMatrizEpi?.tipo_epi_nr6 || selectedMatrizEpi?.epi?.nome_modelo || '-'}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="matriz-obrigatorio-edit"
                checked={matrizEpiFormData.obrigatorio}
                onCheckedChange={(checked) => setMatrizEpiFormData(p => ({ ...p, obrigatorio: !!checked }))}
              />
              <Label htmlFor="matriz-obrigatorio-edit">EPI Obrigatório</Label>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                value={matrizEpiFormData.observacao}
                onChange={(e) => setMatrizEpiFormData(p => ({ ...p, observacao: e.target.value }))}
                placeholder="Observações sobre o uso do EPI"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMatrizEpiDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditMatrizEpi} disabled={savingMatrizEpi}>
              {savingMatrizEpi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Matriz de EPI */}
      <AlertDialog open={deleteMatrizEpiDialogOpen} onOpenChange={setDeleteMatrizEpiDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o EPI "{selectedMatrizEpi?.tipo_epi_nr6 || selectedMatrizEpi?.epi?.nome_modelo}" do cargo "{selectedMatrizEpi?.cargo?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMatrizEpi} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Perigo */}
      <Dialog open={perigoDialogOpen} onOpenChange={setPerigoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Perigo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={perigoFormData.nome}
                onChange={(e) => setPerigoFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do perigo"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={perigoFormData.categoria} onValueChange={(v) => setPerigoFormData(p => ({ ...p, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Físico">Físico</SelectItem>
                  <SelectItem value="Químico">Químico</SelectItem>
                  <SelectItem value="Biológico">Biológico</SelectItem>
                  <SelectItem value="Ergonômico">Ergonômico</SelectItem>
                  <SelectItem value="Mecânico">Mecânico</SelectItem>
                  <SelectItem value="Elétrico">Elétrico</SelectItem>
                  <SelectItem value="Incêndio">Incêndio</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={perigoFormData.descricao}
                onChange={(e) => setPerigoFormData(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição do perigo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="perigo-ativo"
                checked={perigoFormData.ativo}
                onCheckedChange={(checked) => setPerigoFormData(p => ({ ...p, ativo: !!checked }))}
              />
              <Label htmlFor="perigo-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerigoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitPerigo} disabled={savingPerigo || !perigoFormData.nome.trim()}>
              {savingPerigo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Perigo */}
      <Dialog open={editPerigoDialogOpen} onOpenChange={setEditPerigoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perigo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={perigoFormData.nome}
                onChange={(e) => setPerigoFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do perigo"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={perigoFormData.categoria} onValueChange={(v) => setPerigoFormData(p => ({ ...p, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Físico">Físico</SelectItem>
                  <SelectItem value="Químico">Químico</SelectItem>
                  <SelectItem value="Biológico">Biológico</SelectItem>
                  <SelectItem value="Ergonômico">Ergonômico</SelectItem>
                  <SelectItem value="Mecânico">Mecânico</SelectItem>
                  <SelectItem value="Elétrico">Elétrico</SelectItem>
                  <SelectItem value="Incêndio">Incêndio</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={perigoFormData.descricao}
                onChange={(e) => setPerigoFormData(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição do perigo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="perigo-ativo-edit"
                checked={perigoFormData.ativo}
                onCheckedChange={(checked) => setPerigoFormData(p => ({ ...p, ativo: !!checked }))}
              />
              <Label htmlFor="perigo-ativo-edit">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerigoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditPerigo} disabled={savingPerigo || !perigoFormData.nome.trim()}>
              {savingPerigo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Perigo */}
      <AlertDialog open={deletePerigoDialogOpen} onOpenChange={setDeletePerigoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perigo "{selectedPerigo?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerigo} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Novo Risco */}
      <Dialog open={riscoDialogOpen} onOpenChange={setRiscoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Risco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={riscoFormData.nome}
                onChange={(e) => setRiscoFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do risco"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={riscoFormData.tipo} onValueChange={(v) => setRiscoFormData(p => ({ ...p, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Físico">Físico</SelectItem>
                  <SelectItem value="Químico">Químico</SelectItem>
                  <SelectItem value="Biológico">Biológico</SelectItem>
                  <SelectItem value="Ergonômico">Ergonômico</SelectItem>
                  <SelectItem value="Acidente">Acidente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={riscoFormData.severidade} onValueChange={(v) => setRiscoFormData(p => ({ ...p, severidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probabilidade</Label>
                <Select value={riscoFormData.probabilidade} onValueChange={(v) => setRiscoFormData(p => ({ ...p, probabilidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rara">Rara</SelectItem>
                    <SelectItem value="Improvável">Improvável</SelectItem>
                    <SelectItem value="Possível">Possível</SelectItem>
                    <SelectItem value="Provável">Provável</SelectItem>
                    <SelectItem value="Quase Certa">Quase Certa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={riscoFormData.descricao}
                onChange={(e) => setRiscoFormData(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição do risco"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="risco-ativo"
                checked={riscoFormData.ativo}
                onCheckedChange={(checked) => setRiscoFormData(p => ({ ...p, ativo: !!checked }))}
              />
              <Label htmlFor="risco-ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiscoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitRisco} disabled={savingRisco || !riscoFormData.nome.trim()}>
              {savingRisco && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Risco */}
      <Dialog open={editRiscoDialogOpen} onOpenChange={setEditRiscoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Risco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={riscoFormData.nome}
                onChange={(e) => setRiscoFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do risco"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={riscoFormData.tipo} onValueChange={(v) => setRiscoFormData(p => ({ ...p, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Físico">Físico</SelectItem>
                  <SelectItem value="Químico">Químico</SelectItem>
                  <SelectItem value="Biológico">Biológico</SelectItem>
                  <SelectItem value="Ergonômico">Ergonômico</SelectItem>
                  <SelectItem value="Acidente">Acidente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={riscoFormData.severidade} onValueChange={(v) => setRiscoFormData(p => ({ ...p, severidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probabilidade</Label>
                <Select value={riscoFormData.probabilidade} onValueChange={(v) => setRiscoFormData(p => ({ ...p, probabilidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rara">Rara</SelectItem>
                    <SelectItem value="Improvável">Improvável</SelectItem>
                    <SelectItem value="Possível">Possível</SelectItem>
                    <SelectItem value="Provável">Provável</SelectItem>
                    <SelectItem value="Quase Certa">Quase Certa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={riscoFormData.descricao}
                onChange={(e) => setRiscoFormData(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição do risco"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="risco-ativo-edit"
                checked={riscoFormData.ativo}
                onCheckedChange={(checked) => setRiscoFormData(p => ({ ...p, ativo: !!checked }))}
              />
              <Label htmlFor="risco-ativo-edit">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRiscoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditRisco} disabled={savingRisco || !riscoFormData.nome.trim()}>
              {savingRisco && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Risco */}
      <AlertDialog open={deleteRiscoDialogOpen} onOpenChange={setDeleteRiscoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o risco "{selectedRisco?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRisco} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Wrapper Dialog que mantém compatibilidade com o uso existente
interface ClienteDetalhesDialogProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClienteDetalhesDialog({ cliente, open, onOpenChange }: ClienteDetalhesDialogProps) {
  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {cliente.nome}
            {cliente.sigla && (
              <Badge variant="outline" className="ml-2">{cliente.sigla}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <ClienteDetalhesContent cliente={cliente} />
      </DialogContent>
    </Dialog>
  );
}
