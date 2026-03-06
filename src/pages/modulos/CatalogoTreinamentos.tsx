import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  FileDown,
  MoreHorizontal,
  FileSpreadsheet,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Copy,
  Users,
  AlertCircle,
  ChevronDown,
  GraduationCap,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TipoTreinamento {
  id: string;
  empresa_id: string;
  norma: string;
  nome: string;
  ch_formacao: number;
  ch_reciclagem: number;
  validade: string;
  conteudo_programatico?: string;
  ch_formacao_obrigatoria?: boolean;
  ch_reciclagem_obrigatoria?: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  total_turmas?: number; // Contagem de turmas vinculadas
  total_instrutores?: number; // Contagem de instrutores vinculados
}

interface InstrutorVinculado {
  id: string;
  nome: string;
  cpf: string;
  email: string;
}

interface TurmaVinculada {
  id: string;
  codigo_turma: string;
  numero_turma: number;
  tipo_treinamento: string;
  status: string;
  quantidade_participantes: number;
  created_at: string;
}

// Tipo para filtro de duplicadas - considera NR + Nome juntos
type DuplicateFilterMode = 'none' | 'nr_nome';

// Função para verificar se falta conteúdo programático
const hasNoContent = (t: TipoTreinamento): boolean => {
  return !t.conteudo_programatico || t.conteudo_programatico.trim() === '' || t.conteudo_programatico === '[]';
};

interface NormaRegulamentadora {
  id: string;
  nr: string;
  descricao: string | null;
}

// Template vazio CSV
const TEMPLATE_VAZIO = `Norma|Nome|CH Formação|CH Reciclagem|Validade|Conteúdo Programático|Obrigatório CH Formação?|Obrigatório CH Reciclagem?`;

// Template com dados padrão
const TEMPLATE_PADRAO = `Norma|Nome|CH Formação|CH Reciclagem|Validade|Conteúdo Programático|Obrigatório CH Formação?|Obrigatório CH Reciclagem?
5|CIPA 1|8|0|Anual|Estudo do ambiente e condições de trabalho; Noções sobre acidentes e doenças do trabalho; Metodologia de investigação e análise de acidentes; Noções sobre AIDS e medidas de prevenção; Noções sobre legislação trabalhista e previdenciária; Princípios gerais de higiene do trabalho; Organização da CIPA|SIM|NÃO
5|CIPA 2|12|0|Anual|Estudo do ambiente e condições de trabalho; Noções sobre acidentes e doenças do trabalho; Metodologia de investigação e análise de acidentes; Noções sobre AIDS e medidas de prevenção; Noções sobre legislação trabalhista e previdenciária; Princípios gerais de higiene do trabalho; Organização da CIPA|SIM|NÃO
5|CIPA 3|16|0|Anual|Estudo do ambiente e condições de trabalho; Noções sobre acidentes e doenças do trabalho; Metodologia de investigação e análise de acidentes; Noções sobre AIDS e medidas de prevenção; Noções sobre legislação trabalhista e previdenciária; Princípios gerais de higiene do trabalho; Organização da CIPA|SIM|NÃO
5|CIPA 4|20|0|Anual|Estudo do ambiente e condições de trabalho; Noções sobre acidentes e doenças do trabalho; Metodologia de investigação e análise de acidentes; Noções sobre AIDS e medidas de prevenção; Noções sobre legislação trabalhista e previdenciária; Princípios gerais de higiene do trabalho; Organização da CIPA|SIM|NÃO
6|Utilização e Conservação de EPI|0|0|Anual|Tipos de EPI e suas aplicações; Uso correto e conservação; Higienização e armazenamento; Inspeção e substituição|NÃO|NÃO
10|Básico|40|0|Bienal|Introdução à segurança com eletricidade; Riscos em instalações e serviços com eletricidade; Técnicas de análise de risco; Medidas de controle do risco elétrico; Equipamentos de proteção coletiva e individual; Rotinas de trabalho e procedimentos; Documentação de instalações elétricas; Riscos adicionais; Proteção e combate a incêndios; Acidentes de origem elétrica; Primeiros socorros|SIM|NÃO
10|SEP|40|0|Bienal|Organização do Sistema Elétrico de Potência; Organização do trabalho; Aspectos comportamentais; Condições impeditivas para serviços; Riscos típicos no SEP; Técnicas de análise de risco no SEP; Procedimentos de trabalho; Técnicas de trabalho sob tensão; Equipamentos e ferramentas de trabalho; Sistemas de proteção coletiva; Equipamentos de proteção individual; Posturas e vestuários de trabalho; Segurança com veículos e transporte de pessoas; Sinalização e isolamento de áreas de trabalho; Liberação de instalação para serviço; Treinamento em técnicas de remoção e atendimento a acidentados do SEP; Acidentes típicos|SIM|NÃO
10|Áreas Classificadas|0|0|Bienal|Conceitos de áreas classificadas; Classificação de áreas; Equipamentos para áreas classificadas; Procedimentos de segurança|NÃO|NÃO
11|Empilhadeira|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Escavaderia Hidráulica|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Guindaste|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Guindauto|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Hilo Fixo|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Pá Carregadeira|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Ponte Rolante|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Ponte Rolante para chapas de rochas ornamentais|16|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência; Especificidades para rochas ornamentais|SIM|NÃO
11|Retro Escavadeira|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Talha Elétrica|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Transpaleteira|0|0|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|NÃO|NÃO
11|Capacitação para movimentação armazenagem e manuseio de chapas de rochas ornamentais|36|16|Trienal|Riscos da atividade; Medidas de proteção; Procedimentos de movimentação; Armazenamento seguro; Equipamentos utilizados|SIM|SIM
12|Segurança no manuseio de ferramentas manuais|0|0|Anual|Tipos de ferramentas manuais; Riscos associados; Uso correto; Inspeção e manutenção; EPI necessários|NÃO|NÃO
12|Segurança na Operação de Motosserra|8|0|Anual|Histórico da regulamentação; Princípios de funcionamento; Riscos na operação; EPI obrigatórios; Técnicas de operação segura; Manutenção preventiva|SIM|NÃO
12|Segurança para operadores de máquinas injetoras|8|0|Anual|Descrição e funcionamento; Riscos mecânicos; Proteções e dispositivos de segurança; Procedimentos de trabalho e segurança|SIM|NÃO
12|Segurança na operação manutenção e inspeção de máquinas e equipamentos.|0|0|Anual|Descrição e identificação dos riscos; Funcionamento das proteções; Procedimentos seguros de operação; Permissão de trabalho|NÃO|NÃO
12|PPRPS|0|0|Anual|Programa de Prevenção de Riscos em Prensas e Similares; Legislação; Análise de riscos; Medidas de proteção|NÃO|NÃO
13|Segurança na Operação de Caldeiras|40|0|Bienal|Noções de grandezas físicas e unidades; Caldeiras - considerações gerais; Operação de caldeiras; Tratamento de água e manutenção; Prevenção contra explosões e outros riscos; Legislação e normalização|SIM|NÃO
13|Segurança na Operação de Vasos sob Pressão|40|0|Bienal|Noções de grandezas físicas e unidades; Vasos de pressão - considerações gerais; Operação de vasos de pressão; Manutenção; Prevenção contra explosões e outros riscos; Legislação e normalização|SIM|NÃO
17|Operador de checkout|2|2|Anual|Posto de trabalho; Manipulação de mercadorias; Organização do trabalho; Aspectos psicossociais do trabalho; Agravos à saúde mais encontrados|SIM|SIM
17|Transporte manual de cargas de acordo com a NR 31  - 31.10 - Ergonomia|0|0|Anual|Técnicas de levantamento; Limites de peso; Posturas corretas; Prevenção de lesões|NÃO|NÃO
17|Trabalho em teleatendimento/telemarketing|4|4|Semestral|Noções sobre os agravos à saúde; Medidas de prevenção; Pausas; Organização do trabalho|SIM|SIM
18|Montagem de Andaimes e Plataformas|0|0|Anual|Tipos de andaimes; Montagem e desmontagem; Inspeção; Uso seguro; Proteção contra quedas|NÃO|NÃO
18|Básico em segurança do trabalho|4|4|Bienal|Informações sobre condições e meio ambiente de trabalho; Riscos inerentes à função; Uso adequado de EPI; Informações sobre EPC|SIM|SIM
18|Operador de grua|80|0|Anual|Normas de segurança; Operação; Manutenção; Sinalização; Procedimentos de emergência|SIM|NÃO
18|Operador de guindaste|120|0|Anual|Normas de segurança; Operação; Manutenção; Sinalização; Procedimentos de emergência|SIM|NÃO
18|Operador de equipamentos de guindar|0|0|Bienal|Normas de segurança; Operação; Manutenção; Sinalização; Procedimentos de emergência|NÃO|NÃO
18|Sinaleiro/amarrador de cargas|16|0|Bienal|Tipos de cargas; Técnicas de amarração; Sinais convencionais; Comunicação; Procedimentos de segurança|SIM|NÃO
18|Operador de elevador|16|4|Anual|Normas de segurança; Operação; Procedimentos de emergência; Comunicação|SIM|SIM
18|Instalação montagem desmontagem e manutenção de elevadores|0|0|Anual|Normas técnicas; Procedimentos de segurança; Bloqueio e etiquetagem; Trabalho em altura|NÃO|NÃO
18|Encarregado de ar comprimido|16|0|Anual|Riscos das atividades hiperbáricas; Procedimentos de segurança; Equipamentos; Primeiros socorros|SIM|NÃO
18|Resgate e remoção em atividades no tubulão|8|0|Anual|Técnicas de resgate; Equipamentos; Procedimentos de emergência; Primeiros socorros|SIM|NÃO
18|Serviços de impermeabilização|4|0|Anual|Riscos químicos; Ventilação; EPI; Procedimentos de segurança|SIM|NÃO
18|Utilização de cadeira suspensa|16|8|Anual|Sistemas de ancoragem; Inspeção de equipamentos; Técnicas de movimentação; Procedimentos de emergência|SIM|SIM
18|Atividade de escavação manual de tubulão|24|8|Anual|Riscos da atividade; Escoramento; Ventilação; Procedimentos de emergência; Primeiros socorros|SIM|SIM
18|Treinamento admissional para construção civil|4|0|Anual|Informações sobre condições e meio ambiente de trabalho; Riscos inerentes à função; Uso adequado de EPI|SIM|NÃO
18|PEMT ( PLATAFORMA ELEVATÓRIA MÓVEL DE TRABALHO)|4|4|Bienal|Normas de segurança; Operação; Inspeção; Procedimentos de emergência|SIM|SIM
20|Iniciação sobre Inflamáveis e Combustíveis|3|0|Anual|Inflamáveis: características e propriedades; Controles coletivo e individual; Fontes de ignição e seu controle; Procedimentos em situações de emergência|SIM|NÃO
20|Básico|8|4|Trienal|Inflamáveis: características e propriedades; Controles coletivo e individual; Fontes de ignição e seu controle; Proteção contra incêndio; Procedimentos em situações de emergência; Estudo da NR-20; Análise preliminar de perigos|SIM|SIM
20|Intermediário|16|4|Bienal|Conteúdo do curso básico; Permissão para trabalho com inflamáveis; Acidentes com inflamáveis: análise de causas e medidas preventivas; Planejamento de resposta a emergências|SIM|SIM
20|Avançado I|24|4|Bienal|Conteúdo do curso intermediário; Noções básicas de segurança de processo; Metodologias de análise de riscos|SIM|SIM
20|Avançado II|32|4|Anual|Conteúdo do curso avançado I; Gerenciamento de mudanças; Investigação de acidentes|SIM|SIM
20|Específico|16|4|Anual|Conteúdo técnico específico para a atividade desempenhada|SIM|SIM
23|Brigada de Incêndio - Básico|4|12|Anual|Teoria do fogo; Propagação do fogo; Classes de incêndio; Prevenção de incêndio; Métodos de extinção; Agentes extintores; Equipamentos de combate a incêndio; Equipamentos de detecção e alarme; Abandono de área; Primeiros socorros|SIM|SIM
23|Brigada de Incêndio - Intermediário|8|12|Anual|Conteúdo do nível básico; Técnicas de combate a incêndio; Equipamentos de proteção individual; Salvamento terrestre|SIM|SIM
23|Brigada de Incêndio - Avançado|24|12|Anual|Conteúdo do nível intermediário; Comando de operações em emergências; Comunicações em emergências; Controle de pânico; Técnicas avançadas de combate|SIM|SIM
23|Brigada Florestal|0|0|Anual|Comportamento do fogo florestal; Técnicas de combate; Equipamentos; Segurança da equipe|NÃO|NÃO
26|Capacitação para trabalhadores envolvidos na utilização segura de produtos químicos|0|0|Anual|Identificação de produtos químicos; Rotulagem; FISPQ; Medidas de controle; EPI; Procedimentos de emergência|NÃO|NÃO
31|CIPATR|20|0|Bienal|Estudo do ambiente e condições de trabalho rural; Noções sobre acidentes e doenças do trabalho; Noções sobre AIDS e medidas de prevenção; Medidas de proteção coletiva e individual; Noções sobre legislação trabalhista e previdenciária; Organização da CIPATR|SIM|NÃO
31|Bobcat|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Caminhão Canavieiro|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Colhedora de Cana|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Motoniveladora|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Motocana|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Segurança na Operação de Motosserra|16|0|Anual|Histórico da regulamentação; Princípios de funcionamento; Riscos na operação; EPI obrigatórios; Técnicas de operação segura; Manutenção preventiva|SIM|NÃO
31|Motopoda|16|0|Anual|Princípios de funcionamento; Riscos na operação; EPI obrigatórios; Técnicas de operação segura; Manutenção preventiva|SIM|NÃO
31|Derriçadeira|4|4|Anual|Princípios de funcionamento; Riscos na operação; EPI obrigatórios; Técnicas de operação segura|SIM|SIM
31|Roçadeira|4|4|Anual|Princípios de funcionamento; Riscos na operação; EPI obrigatórios; Técnicas de operação segura|SIM|SIM
31|Transbordo|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Trator Agrícola|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Trator de Puxe|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Treminhão|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
31|Segurança na Agricultura|8|8|Anual|Riscos na agricultura; Agrotóxicos; Máquinas agrícolas; Animais peçonhentos; Ergonomia; EPI|SIM|SIM
31|Segurança na Aplicação de Agrotóxicos|20|20|Anual|Legislação; Classificação toxicológica; Equipamentos de aplicação; EPI; Descarte de embalagens; Primeiros socorros|SIM|SIM
31|Segurança na Operação de Máquinas Agrícolas|24|8|Anual|Noções de física aplicada; Inspeção e manutenção; Operação segura; Sinalização; Procedimentos de emergência|SIM|SIM
33|Trabalhadores e Vigias|16|8|Anual|Identificação e sinalização de espaços confinados; Reconhecimento e avaliação de riscos; Funcionamento de equipamentos; Procedimentos e utilização da permissão de entrada e trabalho; Noções de resgate e primeiros socorros|SIM|SIM
33|Supervisores|40|8|Anual|Conteúdo para trabalhadores e vigias; Identificação dos espaços confinados; Critérios de indicação e uso de equipamentos; Conhecimentos sobre práticas seguras; Legislação; Programa de proteção respiratória; Área classificada; Operações de salvamento|SIM|SIM
34|Treinamento admissional|6|4|Anual|Informações sobre condições e meio ambiente de trabalho; Riscos inerentes à função; Uso adequado de EPI; Procedimentos de emergência|SIM|SIM
34|Treinamento para realizar testes de estanqueidade|24|8|Anual|Procedimentos de teste; Equipamentos; Riscos envolvidos; Medidas de segurança|SIM|SIM
34|Curso básico de Segurança para Trabalho à Quente|8|8|Anual|Definição de trabalho a quente; Riscos envolvidos; Medidas de prevenção; Permissão de trabalho; Procedimentos de emergência|SIM|SIM
34|Atividade com Solda - Riscos e Formas de Prevenção|4|4|Anual|Tipos de solda; Riscos à saúde; EPI; Ventilação; Procedimentos de segurança|SIM|SIM
34|Atividade com maçarico - Riscos e Forma de Prevenção|4|4|Anual|Tipos de maçarico; Riscos envolvidos; EPI; Procedimentos de segurança|SIM|SIM
34|Atividades com Máquinas Portáteis rotativas - Riscos e Forma de Prevenção|4|4|Anual|Tipos de máquinas; Riscos envolvidos; EPI; Procedimentos de segurança|SIM|SIM
34|Curso complementar para operadores de Equipamento de Guindar|20|0|Anual|Normas de segurança; Operação avançada; Manutenção; Procedimentos de emergência|SIM|NÃO
34|Curso básico de segurança em operações de Movimentação de Cargas|20|0|Anual|Tipos de cargas; Equipamentos; Técnicas de movimentação; Sinalização; Procedimentos de segurança|SIM|NÃO
34|Curso básico para Observador de Trabalho à Quente|8|8|Anual|Função do observador; Riscos do trabalho a quente; Procedimentos de emergência; Comunicação|SIM|SIM
35|Trabalho em Altura|8|8|Bienal|Normas e regulamentos; Análise de risco; Condições impeditivas; Riscos potenciais; Medidas de prevenção e controle; Sistemas e equipamentos de proteção; Acidentes típicos; Condutas em situações de emergência; Noções de técnicas de resgate e primeiros socorros|SIM|SIM
35|Resgate em Altura|0|0|Bienal|Técnicas de resgate; Equipamentos; Procedimentos de emergência; Primeiros socorros|NÃO|NÃO`;

// Interface para resultado de importação
interface ImportError {
  linha: number;
  nome: string;
  motivo: string;
}

interface ImportRecord {
  empresa_id: string;
  norma: string;
  nome: string;
  ch_formacao: number;
  ch_reciclagem: number;
  ch_formacao_obrigatoria: boolean;
  ch_reciclagem_obrigatoria: boolean;
  validade: string;
  conteudo_programatico: string;
  isUpdate?: boolean; // true se for atualização de registro existente
  existingId?: string; // ID do registro existente para update
}

interface ImportPreview {
  validRecords: ImportRecord[];
  updateRecords: ImportRecord[];
  errors: ImportError[];
}

interface ImportResult {
  inserted: number;
  updated: number;
  errors: ImportError[];
}

// Interface para blocos de conteúdo programático
interface BlocoConteudo {
  titulo: string;
  itens: string; // Itens separados por linha
}

export default function CatalogoTreinamentos() {
  const { profile } = useAuth();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const [treinamentos, setTreinamentos] = useState<TipoTreinamento[]>([]);
  const [normasCadastradas, setNormasCadastradas] = useState<NormaRegulamentadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNorma, setFilterNorma] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilterMode>('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showOnlyWithoutContent, setShowOnlyWithoutContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<TipoTreinamento | null>(null);
  const [treinamentoToDelete, setTreinamentoToDelete] = useState<TipoTreinamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Import dialogs
  const [importPreviewDialogOpen, setImportPreviewDialogOpen] = useState(false);
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Popup de instrutores vinculados
  const [instrutoresDialogOpen, setInstrutoresDialogOpen] = useState(false);
  const [instrutoresDialogTreinamento, setInstrutoresDialogTreinamento] = useState<TipoTreinamento | null>(null);
  const [instrutores, setInstrutores] = useState<InstrutorVinculado[]>([]);
  const [instrutoresLoading, setInstrutoresLoading] = useState(false);
  const [instrutoresPage, setInstrutoresPage] = useState(1);
  const [instrutoresTotalPages, setInstrutoresTotalPages] = useState(1);
  const [instrutoresTotal, setInstrutoresTotal] = useState(0);
  const [instrutoresSearch, setInstrutoresSearch] = useState('');
  const INSTRUTORES_PER_PAGE = 10;

  // Popup de turmas vinculadas
  const [turmasDialogOpen, setTurmasDialogOpen] = useState(false);
  const [turmasDialogTreinamento, setTurmasDialogTreinamento] = useState<TipoTreinamento | null>(null);
  const [turmas, setTurmas] = useState<TurmaVinculada[]>([]);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [turmasPage, setTurmasPage] = useState(1);
  const [turmasTotalPages, setTurmasTotalPages] = useState(1);
  const [turmasTotal, setTurmasTotal] = useState(0);
  const [turmasSearch, setTurmasSearch] = useState('');
  const TURMAS_PER_PAGE = 10;
    
  // Blocos de conteúdo programático
  const [blocosConteudo, setBlocosConteudo] = useState<BlocoConteudo[]>([{ titulo: '', itens: '' }]);
  
  // Form state
  const [formData, setFormData] = useState({
    norma: '',
    nome: '',
    ch_formacao: '0',
    ch_reciclagem: '0',
    ch_formacao_obrigatoria: false,
    ch_reciclagem_obrigatoria: false,
    validade: '',
    conteudo_programatico: '',
    observacoes: '',
  });

  useEffect(() => {
    if (profile?.empresa_id) {
      fetchTreinamentos();
      fetchNormas();
      logView('Treinamentos', 'Catálogo de Treinamentos', 'Acessou o catálogo de treinamentos');
    }
  }, [profile?.empresa_id]);

  const fetchNormas = async () => {
    if (!profile?.empresa_id) return;

    const { data, error } = await (supabase as any)
      .from('normas_regulamentadoras')
      .select('id, nr, descricao')
      .eq('empresa_id', profile.empresa_id)
      .order('nr', { ascending: true });

    if (!error && data) {
      // Ordenar numericamente
      const sorted = (data as NormaRegulamentadora[]).sort((a, b) => {
        const numA = parseInt(a.nr, 10);
        const numB = parseInt(b.nr, 10);
        return numA - numB;
      });
      setNormasCadastradas(sorted);
    }
  };

  const fetchTreinamentos = async () => {
    if (!profile?.empresa_id) return;

    // Buscar treinamentos com contagem de turmas e instrutores (ambas tabelas)
    const { data, error } = await supabase
      .from('catalogo_treinamentos')
      .select(`
        *,
        turmas_treinamento(count),
        instrutor_formacao_treinamento(count),
        instrutor_treinamentos(count)
      `)
      .eq('empresa_id', profile.empresa_id)
      .order('norma', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar catálogo de treinamentos');
      console.error(error);
    } else {
      // Mapear dados para incluir total_turmas e total_instrutores
      // Soma as duas tabelas de instrutores para ter o total correto
      const treinamentosComContagens = (data || []).map((t: any) => ({
        ...t,
        total_turmas: t.turmas_treinamento?.[0]?.count || 0,
        total_instrutores: (t.instrutor_formacao_treinamento?.[0]?.count || 0) + (t.instrutor_treinamentos?.[0]?.count || 0)
      }));
      setTreinamentos(treinamentosComContagens);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      norma: '',
      nome: '',
      ch_formacao: '0',
      ch_reciclagem: '0',
      ch_formacao_obrigatoria: false,
      ch_reciclagem_obrigatoria: false,
      validade: '',
      conteudo_programatico: '',
      observacoes: '',
    });
    setBlocosConteudo([{ titulo: '', itens: '' }]);
    setSelectedTreinamento(null);
  };

  // Funções para gerenciar blocos de conteúdo programático
  const adicionarBloco = () => {
    setBlocosConteudo([...blocosConteudo, { titulo: '', itens: '' }]);
  };

  const removerBloco = (index: number) => {
    if (blocosConteudo.length > 1) {
      setBlocosConteudo(blocosConteudo.filter((_, i) => i !== index));
    }
  };

  const atualizarBloco = (index: number, campo: 'titulo' | 'itens', valor: string) => {
    const novosBlocos = [...blocosConteudo];
    novosBlocos[index][campo] = valor;
    setBlocosConteudo(novosBlocos);
  };

  // Converter blocos para string JSON para salvar
  const blocosParaJson = (): string => {
    const blocosValidos = blocosConteudo.filter(b => (b.titulo || '').trim() || (b.itens || '').trim());
    if (blocosValidos.length === 0) return '';
    return JSON.stringify(blocosValidos);
  };

  // Converter string JSON para blocos
  const jsonParaBlocos = (json: string): BlocoConteudo[] => {
    if (!json) return [{ titulo: '', itens: '' }];
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantir que cada bloco tenha titulo e itens definidos
        return parsed.map(b => ({
          titulo: b.titulo || '',
          itens: b.itens || ''
        }));
      }
    } catch {
      // Se não for JSON, é formato antigo (texto simples)
      // Converter para novo formato
      return [{ titulo: 'Conteúdo Programático', itens: json.replace(/;/g, '\n') }];
    }
    return [{ titulo: '', itens: '' }];
  };

  // Formatar conteúdo programático para exibição em texto plano (CSV)
  const formatarConteudoParaTexto = (json: string): string => {
    if (!json) return '';
    try {
      const blocos = JSON.parse(json) as BlocoConteudo[];
      return blocos.map(b => {
        const itens = b.itens.split('\n').filter(i => i.trim()).join('; ');
        return b.titulo ? `${b.titulo}: ${itens}` : itens;
      }).join(' | ');
    } catch {
      return json; // Retorna o texto original se não for JSON
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) {
      toast.error('Você precisa estar vinculado a uma empresa');
      return;
    }
    
    const conteudoJson = blocosParaJson();
    // Conteúdo programático é opcional
    if (!formData.norma || !formData.nome || !formData.validade) {
      toast.error('Preencha todos os campos obrigatórios (Norma, Nome e Validade)');
      return;
    }
    
    setSaving(true);

    const { error } = await supabase
      .from('catalogo_treinamentos')
      .insert({
        empresa_id: profile.empresa_id,
        norma: formData.norma,
        nome: formData.nome,
        ch_formacao: Number(formData.ch_formacao),
        ch_reciclagem: Number(formData.ch_reciclagem),
        ch_formacao_obrigatoria: formData.ch_formacao_obrigatoria,
        ch_reciclagem_obrigatoria: formData.ch_reciclagem_obrigatoria,
        validade: formData.validade,
        conteudo_programatico: conteudoJson,
        observacoes: formData.observacoes || null,
      });

    if (error) {
      toast.error('Erro ao cadastrar treinamento: ' + error.message);
    } else {
      toast.success('Treinamento cadastrado com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      fetchTreinamentos();
    }
    setSaving(false);
  };

  const openEditDialog = (treinamento: TipoTreinamento) => {
    setSelectedTreinamento(treinamento);
    setFormData({
      norma: treinamento.norma,
      nome: treinamento.nome,
      ch_formacao: String(treinamento.ch_formacao),
      ch_reciclagem: String(treinamento.ch_reciclagem),
      ch_formacao_obrigatoria: treinamento.ch_formacao_obrigatoria || false,
      ch_reciclagem_obrigatoria: treinamento.ch_reciclagem_obrigatoria || false,
      validade: treinamento.validade,
      conteudo_programatico: treinamento.conteudo_programatico || '',
      observacoes: treinamento.observacoes || '',
    });
    setBlocosConteudo(jsonParaBlocos(treinamento.conteudo_programatico || ''));
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreinamento) return;
    
    const conteudoJson = blocosParaJson();
    // Conteúdo programático é opcional
    if (!formData.norma || !formData.nome || !formData.validade) {
      toast.error('Preencha todos os campos obrigatórios (Norma, Nome e Validade)');
      return;
    }
    
    setSaving(true);

    const { error } = await supabase
      .from('catalogo_treinamentos')
      .update({
        norma: formData.norma,
        nome: formData.nome,
        ch_formacao: Number(formData.ch_formacao),
        ch_reciclagem: Number(formData.ch_reciclagem),
        ch_formacao_obrigatoria: formData.ch_formacao_obrigatoria,
        ch_reciclagem_obrigatoria: formData.ch_reciclagem_obrigatoria,
        validade: formData.validade,
        conteudo_programatico: conteudoJson,
        observacoes: formData.observacoes || null,
      })
      .eq('id', selectedTreinamento.id);

    if (error) {
      toast.error('Erro ao atualizar treinamento: ' + error.message);
    } else {
      toast.success('Treinamento atualizado com sucesso!');
      setEditDialogOpen(false);
      resetForm();
      fetchTreinamentos();
    }
    setSaving(false);
  };

  const openDeleteDialog = (treinamento: TipoTreinamento) => {
    setTreinamentoToDelete(treinamento);
    setDeleteDialogOpen(true);
  };

  // Função para abrir popup de instrutores vinculados
  const openInstrutoresDialog = async (treinamento: TipoTreinamento) => {
    setInstrutoresDialogTreinamento(treinamento);
    setInstrutoresDialogOpen(true);
    setInstrutoresPage(1);
    setInstrutoresSearch('');
    await fetchInstrutoresVinculados(treinamento.id, 1, '');
  };

  // Função para buscar instrutores vinculados com paginação (de ambas as tabelas)
  const fetchInstrutoresVinculados = async (treinamentoId: string, page: number, search: string) => {
    setInstrutoresLoading(true);
    
    try {
      // Buscar de ambas as tabelas em paralelo
      const [formacaoResult, treinamentosResult] = await Promise.all([
        // Tabela instrutor_formacao_treinamento
        supabase
          .from('instrutor_formacao_treinamento')
          .select(`
            id,
            instrutor_id,
            instrutores!instrutor_formacao_treinamento_instrutor_id_fkey (
              id,
              nome,
              cpf_cnpj,
              email
            )
          `)
          .eq('treinamento_id', treinamentoId),
        // Tabela instrutor_treinamentos
        supabase
          .from('instrutor_treinamentos')
          .select(`
            id,
            instrutor_id,
            instrutores!instrutor_treinamentos_instrutor_id_fkey (
              id,
              nome,
              cpf_cnpj,
              email
            )
          `)
          .eq('treinamento_id', treinamentoId)
      ]);
      
      // Combinar resultados de ambas as tabelas
      const allData: any[] = [];
      const seenIds = new Set<string>();
      
      // Adicionar da tabela instrutor_formacao_treinamento
      if (!formacaoResult.error && formacaoResult.data) {
        formacaoResult.data.forEach((item: any) => {
          if (item.instrutores && !seenIds.has(item.instrutores.id)) {
            seenIds.add(item.instrutores.id);
            allData.push(item);
          }
        });
      }
      
      // Adicionar da tabela instrutor_treinamentos (evitando duplicatas)
      if (!treinamentosResult.error && treinamentosResult.data) {
        treinamentosResult.data.forEach((item: any) => {
          if (item.instrutores && !seenIds.has(item.instrutores.id)) {
            seenIds.add(item.instrutores.id);
            allData.push(item);
          }
        });
      }
      
      // Mapear dados
      let instrutoresMapeados: InstrutorVinculado[] = allData.map((item: any) => ({
        id: item.instrutores.id,
        nome: item.instrutores.nome || 'Sem nome',
        cpf: item.instrutores.cpf_cnpj || 'Sem CPF/CNPJ',
        email: item.instrutores.email || 'Sem email'
      }));
      
      // Filtrar por busca se necessário
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        instrutoresMapeados = instrutoresMapeados.filter(i => 
          i.nome.toLowerCase().includes(searchLower) ||
          i.cpf.includes(search) ||
          i.email.toLowerCase().includes(searchLower)
        );
      }
      
      // Aplicar paginação
      const total = instrutoresMapeados.length;
      const totalPages = Math.ceil(total / INSTRUTORES_PER_PAGE);
      const offset = (page - 1) * INSTRUTORES_PER_PAGE;
      const paginatedInstrutores = instrutoresMapeados.slice(offset, offset + INSTRUTORES_PER_PAGE);
      
      setInstrutores(paginatedInstrutores);
      setInstrutoresTotal(total);
      setInstrutoresTotalPages(totalPages);
    } catch (error) {
      console.error('Erro ao buscar instrutores:', error);
      toast.error('Erro ao carregar instrutores');
    }
    
    setInstrutoresLoading(false);
  };

  // Função para mudar página de instrutores
  const handleInstrutoresPageChange = (newPage: number) => {
    if (!instrutoresDialogTreinamento) return;
    setInstrutoresPage(newPage);
    fetchInstrutoresVinculados(instrutoresDialogTreinamento.id, newPage, instrutoresSearch);
  };

  // Função para buscar instrutores
  const handleInstrutoresSearch = () => {
    if (!instrutoresDialogTreinamento) return;
    setInstrutoresPage(1);
    fetchInstrutoresVinculados(instrutoresDialogTreinamento.id, 1, instrutoresSearch);
  };

  // Função para abrir popup de turmas vinculadas
  const openTurmasDialog = async (treinamento: TipoTreinamento) => {
    setTurmasDialogTreinamento(treinamento);
    setTurmasDialogOpen(true);
    setTurmasPage(1);
    setTurmasSearch('');
    await fetchTurmasVinculadas(treinamento.id, 1, '');
  };

  // Função para buscar turmas vinculadas com paginação
  const fetchTurmasVinculadas = async (treinamentoId: string, page: number, search: string) => {
    setTurmasLoading(true);
    
    const offset = (page - 1) * TURMAS_PER_PAGE;
    
    // Primeiro, contar total de registros
    let countQuery = supabase
      .from('turmas_treinamento')
      .select('id', { count: 'exact', head: true })
      .eq('treinamento_id', treinamentoId);
    
    // Buscar dados
    let dataQuery = supabase
      .from('turmas_treinamento')
      .select(`
        id,
        codigo_turma,
        numero_turma,
        tipo_treinamento,
        status,
        quantidade_participantes,
        created_at
      `)
      .eq('treinamento_id', treinamentoId)
      .order('created_at', { ascending: false })
      .range(offset, offset + TURMAS_PER_PAGE - 1);
    
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);
    
    if (countResult.error) {
      console.error('Erro ao contar turmas:', countResult.error);
      toast.error('Erro ao carregar turmas');
      setTurmasLoading(false);
      return;
    }
    
    if (dataResult.error) {
      console.error('Erro ao buscar turmas:', dataResult.error);
      toast.error('Erro ao carregar turmas');
      setTurmasLoading(false);
      return;
    }
    
    const total = countResult.count || 0;
    const totalPages = Math.ceil(total / TURMAS_PER_PAGE);
    
    // Mapear dados
    const turmasMapeadas: TurmaVinculada[] = (dataResult.data || []).map((item: any) => ({
      id: item.id,
      codigo_turma: item.codigo_turma || `Turma ${item.numero_turma}`,
      numero_turma: item.numero_turma,
      tipo_treinamento: item.tipo_treinamento || '-',
      status: item.status || '-',
      quantidade_participantes: item.quantidade_participantes || 0,
      created_at: item.created_at
    }));
    
    // Filtrar por busca no cliente se necessário
    let turmasFiltradas = turmasMapeadas;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      turmasFiltradas = turmasMapeadas.filter(t => 
        t.codigo_turma.toLowerCase().includes(searchLower) ||
        t.status.toLowerCase().includes(searchLower) ||
        t.tipo_treinamento.toLowerCase().includes(searchLower)
      );
    }
    
    setTurmas(turmasFiltradas);
    setTurmasTotal(total);
    setTurmasTotalPages(totalPages);
    setTurmasLoading(false);
  };

  // Função para mudar página de turmas
  const handleTurmasPageChange = (newPage: number) => {
    if (!turmasDialogTreinamento) return;
    setTurmasPage(newPage);
    fetchTurmasVinculadas(turmasDialogTreinamento.id, newPage, turmasSearch);
  };

  // Função para buscar turmas
  const handleTurmasSearch = () => {
    if (!turmasDialogTreinamento) return;
    setTurmasPage(1);
    fetchTurmasVinculadas(turmasDialogTreinamento.id, 1, turmasSearch);
  };

  // Função para formatar status da turma
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'agendada': { label: 'Agendada', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'em_andamento': { label: 'Em Andamento', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      'concluida': { label: 'Concluída', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'cancelada': { label: 'Cancelada', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const executeDeleteSingle = async () => {
    if (!treinamentoToDelete) return;
    
    // Verificação de segurança: não permitir exclusão se tiver turmas ou instrutores vinculados
    if ((treinamentoToDelete.total_turmas || 0) > 0 || (treinamentoToDelete.total_instrutores || 0) > 0) {
      toast.error('Este treinamento não pode ser excluído pois está vinculado a turmas ou instrutores.');
      return;
    }
    
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('catalogo_treinamentos')
        .delete()
        .eq('id', treinamentoToDelete.id);

      if (error) throw error;
      toast.success('Treinamento excluído com sucesso!');
      fetchTreinamentos();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setTreinamentoToDelete(null);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Norma', 'Nome', 'CH Formação', 'CH Reciclagem', 'Validade', 'Conteúdo Programático', 'Obrigatório CH Formação?', 'Obrigatório CH Reciclagem?'];
    const rows = treinamentos.map(t => [
      t.norma,
      t.nome,
      t.ch_formacao,
      t.ch_reciclagem,
      t.validade,
      formatarConteudoParaTexto(t.conteudo_programatico || ''),
      t.ch_formacao_obrigatoria ? 'SIM' : 'NÃO',
      t.ch_reciclagem_obrigatoria ? 'SIM' : 'NÃO'
    ]);
    
    const csvContent = [headers.join('|'), ...rows.map(r => r.join('|'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'catalogo_treinamentos.csv';
    link.click();
    toast.success('Arquivo exportado com sucesso!');
  };

  // Download template
  const downloadTemplate = (tipo: 'vazio' | 'padrao') => {
    const content = tipo === 'vazio' ? TEMPLATE_VAZIO : TEMPLATE_PADRAO;
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = tipo === 'vazio' ? 'template_treinamentos_vazio.csv' : 'template_treinamentos_padrao.csv';
    link.click();
    toast.success(`Template ${tipo === 'vazio' ? 'vazio' : 'padrão'} baixado!`);
  };

  // Parse CSV line using pipe delimiter
  const parseCSVLine = (line: string): string[] => {
    return line.split('|').map(part => part.trim());
  };

  // Import from CSV - Step 1: Parse and Preview
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.empresa_id) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      if (dataLines.length === 0) {
        toast.error('O arquivo não contém dados para importar');
        setImporting(false);
        return;
      }

      // Get list of existing NRs
      const existingNRs = new Set(normasCadastradas.map(nr => nr.nr));
      
      // Create a map of existing trainings by Nome only for duplicate check
      const existingTrainings = new Map<string, TipoTreinamento>();
      treinamentos.forEach(t => {
        const key = t.nome.toLowerCase().trim();
        existingTrainings.set(key, t);
      });

      const preview: ImportPreview = {
        validRecords: [],
        updateRecords: [],
        errors: []
      };

      // Process each line
      dataLines.forEach((line, index) => {
        const parts = parseCSVLine(line);
        const lineNumber = index + 2; // +2 because of header and 0-index
        
        if (parts.length < 6) {
          preview.errors.push({
            linha: lineNumber,
            nome: parts[1] || 'Desconhecido',
            motivo: 'Formato inválido - colunas insuficientes (mínimo 6 colunas)'
          });
          return;
        }

        const norma = parts[0].trim();
        const nome = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
        const chFormacao = parseInt(parts[2]) || 0;
        const chReciclagem = parseInt(parts[3]) || 0;
        const validade = parts[4].trim();
        const conteudoProgramatico = parts[5].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
        
        // Parse obrigatoriedade fields (columns 7 and 8)
        const chFormacaoObrigatoria = parts[6] ? parts[6].toUpperCase().trim() === 'SIM' : false;
        const chReciclagemObrigatoria = parts[7] ? parts[7].toUpperCase().trim() === 'SIM' : false;

        // Validate NR exists
        if (!existingNRs.has(norma)) {
          preview.errors.push({
            linha: lineNumber,
            nome: nome,
            motivo: `NR-${norma} não está cadastrada no sistema`
          });
          return;
        }

        // Validate required fields
        if (!nome) {
          preview.errors.push({
            linha: lineNumber,
            nome: 'Sem nome',
            motivo: 'Nome do treinamento é obrigatório'
          });
          return;
        }

        if (!validade) {
          preview.errors.push({
            linha: lineNumber,
            nome: nome,
            motivo: 'Validade é obrigatória'
          });
          return;
        }

        // Conteúdo programático é opcional - não validamos mais

        // Check for duplicates by name only
        const key = nome.toLowerCase().trim();
        const existingTraining = existingTrainings.get(key);

        const record: ImportRecord = {
          empresa_id: profile.empresa_id,
          norma,
          nome,
          ch_formacao: chFormacao,
          ch_reciclagem: chReciclagem,
          ch_formacao_obrigatoria: chFormacaoObrigatoria,
          ch_reciclagem_obrigatoria: chReciclagemObrigatoria,
          validade,
          conteudo_programatico: conteudoProgramatico,
        };

        if (existingTraining) {
          // Will update existing record
          record.isUpdate = true;
          record.existingId = existingTraining.id;
          preview.updateRecords.push(record);
        } else {
          preview.validRecords.push(record);
        }
      });

      // Show preview dialog
      setImportPreview(preview);
      setImportPreviewDialogOpen(true);

    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar arquivo CSV');
    }

    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import from CSV - Step 2: Execute import
  const executeImport = async () => {
    if (!importPreview || !profile?.empresa_id) return;

    setImporting(true);
    setImportPreviewDialogOpen(false);

    const result: ImportResult = {
      inserted: 0,
      updated: 0,
      errors: []
    };

    try {
      // Insert new records
      if (importPreview.validRecords.length > 0) {
        const recordsToInsert = importPreview.validRecords.map(r => ({
          empresa_id: r.empresa_id,
          norma: r.norma,
          nome: r.nome,
          ch_formacao: r.ch_formacao,
          ch_reciclagem: r.ch_reciclagem,
          ch_formacao_obrigatoria: r.ch_formacao_obrigatoria,
          ch_reciclagem_obrigatoria: r.ch_reciclagem_obrigatoria,
          validade: r.validade,
          conteudo_programatico: r.conteudo_programatico,
        }));

        const { error } = await supabase
          .from('catalogo_treinamentos')
          .insert(recordsToInsert);

        if (error) {
          result.errors.push({
            linha: 0,
            nome: 'Erro ao inserir',
            motivo: error.message
          });
        } else {
          result.inserted = importPreview.validRecords.length;
        }
      }

      // Update existing records
      for (const record of importPreview.updateRecords) {
        if (!record.existingId) continue;

        const { error } = await supabase
          .from('catalogo_treinamentos')
          .update({
            norma: record.norma, // Permitir atualização da NR
            ch_formacao: record.ch_formacao,
            ch_reciclagem: record.ch_reciclagem,
            ch_formacao_obrigatoria: record.ch_formacao_obrigatoria,
            ch_reciclagem_obrigatoria: record.ch_reciclagem_obrigatoria,
            validade: record.validade,
            conteudo_programatico: record.conteudo_programatico,
          })
          .eq('id', record.existingId);

        if (error) {
          result.errors.push({
            linha: 0,
            nome: record.nome,
            motivo: `Erro ao atualizar: ${error.message}`
          });
        } else {
          result.updated++;
        }
      }

      fetchTreinamentos();

    } catch (err) {
      console.error(err);
      result.errors.push({
        linha: 0,
        nome: 'Erro geral',
        motivo: 'Erro ao processar importação'
      });
    }

    setImporting(false);
    setImportResult(result);
    setImportResultDialogOpen(true);
    setImportPreview(null)
  };

  // Get unique normas for filter
  const normasUnicas = [...new Set(treinamentos.map(t => t.norma))].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Encontrar duplicatas por NR + Nome (combinação única)
  const findDuplicates = (): Set<string> => {
    if (duplicateFilter === 'none') return new Set();
    
    const valueCount = new Map<string, number>();
    treinamentos.forEach(t => {
      // Chave composta: NR + Nome (normalizado)
      const key = `${t.norma.trim().toLowerCase()}|${t.nome.trim().toLowerCase()}`;
      valueCount.set(key, (valueCount.get(key) || 0) + 1);
    });
    
    const duplicateKeys = new Set<string>();
    valueCount.forEach((count, key) => {
      if (count > 1) duplicateKeys.add(key);
    });
    
    return duplicateKeys;
  };

  const duplicateKeys = findDuplicates();

  // Função para verificar se um treinamento é duplicado
  const isDuplicate = (t: TipoTreinamento): boolean => {
    if (duplicateFilter === 'none') return false;
    const key = `${t.norma.trim().toLowerCase()}|${t.nome.trim().toLowerCase()}`;
    return duplicateKeys.has(key);
  };

  // Contadores para badges
  const withoutContentCount = treinamentos.filter(hasNoContent).length;
  const duplicateCount = duplicateFilter !== 'none' 
    ? treinamentos.filter(isDuplicate).length 
    : 0;

  const filteredTreinamentos = treinamentos
    .filter((t) => {
      const matchSearch = 
        t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.norma.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchNorma = filterNorma === 'all' || t.norma === filterNorma;
      
      // Filtro de duplicadas (NR + Nome)
      const matchDuplicate = duplicateFilter === 'none' || isDuplicate(t);
      
      // Filtro de sem conteúdo programático
      const matchWithoutContent = !showOnlyWithoutContent || hasNoContent(t);
      
      return matchSearch && matchNorma && matchDuplicate && matchWithoutContent;
    })
    .sort((a, b) => {
      // Ordenar por NR crescente
      const numA = parseInt(a.norma);
      const numB = parseInt(b.norma);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.norma.localeCompare(b.norma);
    });

  // Limpar filtros avançados
  const clearAdvancedFilters = () => {
    setDuplicateFilter('none');
    setShowOnlyWithoutContent(false);
  };

  const hasActiveAdvancedFilters = duplicateFilter !== 'none' || showOnlyWithoutContent;

  // Paginação
  const totalPages = Math.ceil(filteredTreinamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTreinamentos = filteredTreinamentos.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterNorma, duplicateFilter, showOnlyWithoutContent]);

  // Gerar números de páginas para exibição
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Badge para NR - cinza com apenas o número
  const getNRBadge = (norma: string) => {
    return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">{norma}</Badge>;
  };

  // Renderizar observações com links clicáveis
  const renderObservacoes = (texto: string) => {
    // Regex para detectar URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = texto.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {part.length > 50 ? part.substring(0, 50) + '...' : part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Renderizar CH com destaque se obrigatória
  const renderCH = (horas: number, obrigatoria: boolean) => {
    if (obrigatoria) {
      return (
        <span className="font-medium">
          {horas}h<span className="text-amber-600 ml-0.5">*</span>
        </span>
      );
    }
    return <span>{horas}h</span>;
  };

  const getValidadeBadge = (validade: string) => {
    const validadeLower = validade.toLowerCase();
    if (validadeLower === 'anual') {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Anual</Badge>;
    }
    if (validadeLower === 'bienal') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Bienal</Badge>;
    }
    if (validadeLower === 'trienal') {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Trienal</Badge>;
    }
    if (validadeLower === 'semestral') {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Semestral</Badge>;
    }
    return <Badge variant="outline">{validade}</Badge>;
  };

  const renderFormFields = (isEdit = false) => (
    <>
      {/* Norma Regulamentadora */}
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-norma`}>Norma regulamentadora *</Label>
        <Select
          value={formData.norma}
          onValueChange={(value) => setFormData({ ...formData, norma: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma NR" />
          </SelectTrigger>
          <SelectContent>
            {normasCadastradas.length === 0 ? (
              <SelectItem value="" disabled>Nenhuma NR cadastrada</SelectItem>
            ) : (
              normasCadastradas.map((nr) => (
                <SelectItem key={nr.id} value={nr.nr}>
                  NR-{nr.nr} {nr.descricao ? `- ${nr.descricao}` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Nome do Treinamento */}
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-nome`}>Treinamento *</Label>
        <Input
          id={`${isEdit ? 'edit' : 'create'}-nome`}
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Digite o nome do treinamento"
          required
        />
      </div>

      {/* Carga Horária Formação */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Carga horária quando formação
            {formData.ch_formacao_obrigatoria && <span className="text-amber-600 ml-0.5">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">CH Obrigatória</span>
            <Switch
              checked={formData.ch_formacao_obrigatoria}
              onCheckedChange={(checked) => setFormData({ ...formData, ch_formacao_obrigatoria: checked })}
            />
          </div>
        </div>
        <Input
          id={`${isEdit ? 'edit' : 'create'}-ch-formacao`}
          type="number"
          min="0"
          value={formData.ch_formacao}
          onChange={(e) => setFormData({ ...formData, ch_formacao: e.target.value })}
          placeholder="Selecione a carga horária"
        />
      </div>

      {/* Carga Horária Reciclagem */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Carga horária quando reciclagem
            {formData.ch_reciclagem_obrigatoria && <span className="text-amber-600 ml-0.5">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">CH Obrigatória</span>
            <Switch
              checked={formData.ch_reciclagem_obrigatoria}
              onCheckedChange={(checked) => setFormData({ ...formData, ch_reciclagem_obrigatoria: checked })}
            />
          </div>
        </div>
        <Input
          id={`${isEdit ? 'edit' : 'create'}-ch-reciclagem`}
          type="number"
          min="0"
          value={formData.ch_reciclagem}
          onChange={(e) => setFormData({ ...formData, ch_reciclagem: e.target.value })}
          placeholder="Selecione a carga horária"
        />
      </div>

      {/* Validade */}
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-validade`}>Validade *</Label>
        <Select
          value={formData.validade}
          onValueChange={(value) => setFormData({ ...formData, validade: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a validade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semestral">Semestral</SelectItem>
            <SelectItem value="Anual">Anual</SelectItem>
            <SelectItem value="Bienal">Bienal</SelectItem>
            <SelectItem value="Trienal">Trienal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-observacoes`} className="flex items-center gap-2">
          Observações
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <textarea
          id={`${isEdit ? 'edit' : 'create'}-observacoes`}
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          placeholder="Observações sobre o treinamento (links serão clicáveis)"
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md resize-y bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          rows={3}
        />
      </div>

      {/* Conteúdo Programático - Múltiplos Blocos (Opcional) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            Conteúdo Programático
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={adicionarBloco}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Bloco
          </Button>
        </div>
        
        {blocosConteudo.map((bloco, index) => (
          <Card key={`bloco-${index}-${blocosConteudo.length}`} className="p-4 space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Bloco {index + 1}</Label>
              {blocosConteudo.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removerBloco(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`bloco-titulo-${index}`} className="text-xs text-muted-foreground">
                Título do Bloco (ex: Parte Teórica, Parte Prática)
              </Label>
              <Input
                id={`bloco-titulo-${index}`}
                value={bloco.titulo || ''}
                onChange={(e) => atualizarBloco(index, 'titulo', e.target.value)}
                placeholder="Ex: Parte Teórica"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`bloco-itens-${index}`} className="text-xs text-muted-foreground">
                Itens (um por linha)
              </Label>
              <textarea
                id={`bloco-itens-${index}`}
                value={bloco.itens || ''}
                onChange={(e) => atualizarBloco(index, 'itens', e.target.value)}
                placeholder="Normas e regulamentos aplicáveis&#10;Análise de Risco&#10;Equipamentos de Proteção"
                className="w-full min-h-[120px] px-3 py-2 text-sm border border-border rounded-md resize-y bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                rows={5}
              />
            </div>
          </Card>
        ))}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.empresa_id) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você precisa estar vinculado a uma empresa para acessar este módulo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Catálogo de Treinamentos
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os tipos de treinamentos disponíveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
              {/* Import/Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar/Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? 'Importando...' : 'Importar CSV'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} disabled={treinamentos.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadTemplate('vazio')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Template Vazio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadTemplate('padrao')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Template Padrão (NRs)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Create Dialog */}
              <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Treinamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Tipo de Treinamento</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] pr-4">
                    <form onSubmit={handleCreate} className="space-y-4">
                      {renderFormFields()}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Cadastrar
                        </Button>
                      </div>
                    </form>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Tipos de Treinamentos</p>
              <p className="text-2xl font-bold">{treinamentos.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou norma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterNorma} onValueChange={setFilterNorma}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por NR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as NRs</SelectItem>
                {normasUnicas.map(norma => (
                  <SelectItem key={norma} value={norma}>NR-{norma}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Botão Filtros Avançados */}
            <Button 
              variant={hasActiveAdvancedFilters ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
              {hasActiveAdvancedFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {(duplicateFilter !== 'none' ? 1 : 0) + (showOnlyWithoutContent ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Filtros Avançados Expandíveis */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent className="pt-4">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avançados
                  </h4>
                  {hasActiveAdvancedFilters && (
                    <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Filtro de Duplicadas */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Copy className="h-3 w-3" />
                      Filtrar Duplicadas (NR + Nome)
                    </Label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background">
                      <Switch
                        checked={duplicateFilter === 'nr_nome'}
                        onCheckedChange={(checked) => setDuplicateFilter(checked ? 'nr_nome' : 'none')}
                        id="filter-duplicates"
                      />
                      <Label htmlFor="filter-duplicates" className="text-sm cursor-pointer">
                        Mostrar apenas duplicados
                      </Label>
                    </div>
                    {duplicateFilter !== 'none' && duplicateCount > 0 && (
                      <p className="text-xs text-amber-600">
                        {duplicateCount} registro(s) com NR + Nome duplicado(s)
                      </p>
                    )}
                  </div>
                  
                  {/* Filtro de Sem Conteúdo Programático */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Conteúdo Programático
                    </Label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background">
                      <Switch
                        checked={showOnlyWithoutContent}
                        onCheckedChange={setShowOnlyWithoutContent}
                        id="filter-no-content"
                      />
                      <Label htmlFor="filter-no-content" className="text-sm cursor-pointer">
                        Mostrar apenas sem conteúdo
                      </Label>
                    </div>
                    {withoutContentCount > 0 && (
                      <p className="text-xs text-amber-600">
                        {withoutContentCount} registro(s) sem conteúdo programático
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {paginatedTreinamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum treinamento encontrado</p>
              </div>
            ) : (
              paginatedTreinamentos.map((treinamento) => (
                <div key={treinamento.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="mb-2">{getNRBadge(treinamento.norma)}</div>
                      <p className="font-medium">{treinamento.nome}</p>
                    </div>
                    {getValidadeBadge(treinamento.validade)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Formação: {renderCH(treinamento.ch_formacao, treinamento.ch_formacao_obrigatoria)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Reciclagem: {renderCH(treinamento.ch_reciclagem, treinamento.ch_reciclagem_obrigatoria)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1 h-auto py-0 px-1 ${treinamento.total_turmas ? 'text-primary hover:text-primary' : 'text-muted-foreground'}`}
                      onClick={() => treinamento.total_turmas && openTurmasDialog(treinamento)}
                      disabled={!treinamento.total_turmas}
                    >
                      <Users className="h-3 w-3" />
                      {treinamento.total_turmas || 0} turma(s)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1 h-auto py-0 px-1 ${treinamento.total_instrutores ? 'text-primary hover:text-primary' : 'text-muted-foreground'}`}
                      onClick={() => treinamento.total_instrutores && openInstrutoresDialog(treinamento)}
                      disabled={!treinamento.total_instrutores}
                    >
                      <GraduationCap className="h-3 w-3" />
                      {treinamento.total_instrutores || 0} instrutor(es)
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNoContent(treinamento) ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Sem conteúdo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Completo
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(treinamento)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(treinamento)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            <div className="border rounded-lg">
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">NR</TableHead>
                      <TableHead>Nome do Treinamento</TableHead>
                      <TableHead className="text-center">CH Formação</TableHead>
                      <TableHead className="text-center">CH Reciclagem</TableHead>
                      <TableHead className="text-center">Validade</TableHead>
                      <TableHead className="text-center w-[50px]" title="Observações">OBS</TableHead>
                      <TableHead className="text-center">Turmas</TableHead>
                      <TableHead className="text-center">Instrutores</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTreinamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum treinamento encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTreinamentos.map((treinamento) => (
                    <TableRow key={treinamento.id}>
                      <TableCell>
                        {getNRBadge(treinamento.norma)}
                      </TableCell>
                      <TableCell className="font-medium">{treinamento.nome}</TableCell>
                      <TableCell className="text-center">{renderCH(treinamento.ch_formacao, treinamento.ch_formacao_obrigatoria)}</TableCell>
                      <TableCell className="text-center">{renderCH(treinamento.ch_reciclagem, treinamento.ch_reciclagem_obrigatoria)}</TableCell>
                      <TableCell className="text-center">{getValidadeBadge(treinamento.validade)}</TableCell>
                      <TableCell className="text-center">
                        {treinamento.observacoes ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Observações</h4>
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {renderObservacoes(treinamento.observacoes)}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 ${treinamento.total_turmas ? 'text-primary hover:text-primary' : 'text-muted-foreground'}`}
                          onClick={() => treinamento.total_turmas && openTurmasDialog(treinamento)}
                          disabled={!treinamento.total_turmas}
                        >
                          <Users className="h-4 w-4" />
                          <span className={treinamento.total_turmas ? 'font-medium' : ''}>
                            {treinamento.total_turmas || 0}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1 ${treinamento.total_instrutores ? 'text-primary hover:text-primary' : 'text-muted-foreground'}`}
                          onClick={() => treinamento.total_instrutores && openInstrutoresDialog(treinamento)}
                          disabled={!treinamento.total_instrutores}
                        >
                          <GraduationCap className="h-4 w-4" />
                          <span className={treinamento.total_instrutores ? 'font-medium' : ''}>
                            {treinamento.total_instrutores || 0}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNoContent(treinamento) ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Sem conteúdo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(treinamento)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(treinamento)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Paginação */}
            {filteredTreinamentos.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredTreinamentos.length)} de {filteredTreinamentos.length} registro(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Itens por página:</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Primeira página</span>
                      <ChevronDown className="h-4 w-4 rotate-90" />
                      <ChevronDown className="h-4 w-4 rotate-90 -ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Página anterior</span>
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    
                    {getPageNumbers().map((page, idx) => (
                      typeof page === 'number' ? (
                        <Button
                          key={idx}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={idx} className="px-2 text-muted-foreground">...</span>
                      )
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Próxima página</span>
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Última página</span>
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                      <ChevronDown className="h-4 w-4 -rotate-90 -ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Treinamento</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <form onSubmit={handleUpdate} className="space-y-4">
              {renderFormFields(true)}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Treinamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {treinamentoToDelete && ((treinamentoToDelete.total_turmas || 0) > 0 || (treinamentoToDelete.total_instrutores || 0) > 0) ? (
                  <div className="space-y-2">
                    <p className="text-destructive font-medium">
                      Este treinamento não pode ser excluído!
                    </p>
                    <p>
                      O treinamento "{treinamentoToDelete?.nome}" (NR-{treinamentoToDelete?.norma}) está vinculado a:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {(treinamentoToDelete?.total_turmas || 0) > 0 && (
                        <li>{treinamentoToDelete?.total_turmas} turma(s)</li>
                      )}
                      {(treinamentoToDelete?.total_instrutores || 0) > 0 && (
                        <li>{treinamentoToDelete?.total_instrutores} instrutor(es)</li>
                      )}
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Uma vez que turmas ou instrutores foram vinculados a um treinamento, ele não pode mais ser removido do sistema.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p>
                      Tem certeza que deseja excluir o treinamento "{treinamentoToDelete?.nome}" (NR-{treinamentoToDelete?.norma})?
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Esta ação não poderá ser desfeita.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {treinamentoToDelete && (treinamentoToDelete.total_turmas || 0) === 0 && (treinamentoToDelete.total_instrutores || 0) === 0 && (
              <AlertDialogAction 
                onClick={executeDeleteSingle} 
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instrutores Vinculados Dialog */}
      <Dialog open={instrutoresDialogOpen} onOpenChange={setInstrutoresDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Instrutores Vinculados
            </DialogTitle>
            {instrutoresDialogTreinamento && (
              <p className="text-sm text-muted-foreground">
                {instrutoresDialogTreinamento.nome} (NR-{instrutoresDialogTreinamento.norma})
              </p>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou email..."
                  value={instrutoresSearch}
                  onChange={(e) => setInstrutoresSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstrutoresSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleInstrutoresSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tabela de Instrutores */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instrutoresLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                        </TableCell>
                      </TableRow>
                    ) : instrutores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhum instrutor encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      instrutores.map((instrutor) => (
                        <TableRow key={instrutor.id}>
                          <TableCell className="font-medium">{instrutor.nome}</TableCell>
                          <TableCell>{instrutor.cpf}</TableCell>
                          <TableCell className="text-muted-foreground">{instrutor.email}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            
            {/* Paginação */}
            {instrutoresTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mostrando {((instrutoresPage - 1) * INSTRUTORES_PER_PAGE) + 1} - {Math.min(instrutoresPage * INSTRUTORES_PER_PAGE, instrutoresTotal)} de {instrutoresTotal}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstrutoresPageChange(instrutoresPage - 1)}
                    disabled={instrutoresPage === 1 || instrutoresLoading}
                  >
                    Anterior
                  </Button>
                  <span className="px-3">
                    {instrutoresPage} / {instrutoresTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInstrutoresPageChange(instrutoresPage + 1)}
                    disabled={instrutoresPage === instrutoresTotalPages || instrutoresLoading}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Turmas Vinculadas Dialog */}
      <Dialog open={turmasDialogOpen} onOpenChange={setTurmasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turmas Vinculadas
            </DialogTitle>
            {turmasDialogTreinamento && (
              <p className="text-sm text-muted-foreground">
                {turmasDialogTreinamento.nome} (NR-{turmasDialogTreinamento.norma})
              </p>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, status ou tipo..."
                  value={turmasSearch}
                  onChange={(e) => setTurmasSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTurmasSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleTurmasSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tabela de Turmas */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Participantes</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Data Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turmasLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                        </TableCell>
                      </TableRow>
                    ) : turmas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma turma encontrada</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      turmas.map((turma) => (
                        <TableRow key={turma.id}>
                          <TableCell className="font-medium">{turma.codigo_turma}</TableCell>
                          <TableCell>{turma.tipo_treinamento}</TableCell>
                          <TableCell className="text-center">{turma.quantidade_participantes}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(turma.status)}</TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {new Date(turma.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            
            {/* Paginação */}
            {turmasTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mostrando {((turmasPage - 1) * TURMAS_PER_PAGE) + 1} - {Math.min(turmasPage * TURMAS_PER_PAGE, turmasTotal)} de {turmasTotal}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTurmasPageChange(turmasPage - 1)}
                    disabled={turmasPage === 1 || turmasLoading}
                  >
                    Anterior
                  </Button>
                  <span className="px-3">
                    {turmasPage} / {turmasTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTurmasPageChange(turmasPage + 1)}
                    disabled={turmasPage === turmasTotalPages || turmasLoading}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importPreviewDialogOpen} onOpenChange={setImportPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Pré-visualização da Importação
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium">Novos</span>
                </div>
                <p className="text-xl font-bold text-green-600 mt-1">{importPreview?.validRecords.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">Atualizações</span>
                </div>
                <p className="text-xl font-bold text-blue-600 mt-1">{importPreview?.updateRecords.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium">Erros</span>
                </div>
                <p className="text-xl font-bold text-destructive mt-1">{importPreview?.errors.length || 0}</p>
              </div>
            </div>

            {/* Error List */}
            {importPreview && importPreview.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm font-medium">Registros com erro (não serão importados):</p>
                </div>
                <ScrollArea className="h-[150px] rounded-md border p-3">
                  <div className="space-y-2">
                    {importPreview.errors.map((error, index) => (
                      <div key={index} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <span className="font-medium text-destructive">Linha {error.linha}: </span>
                            <span className="font-medium">{error.nome}</span>
                            <p className="text-muted-foreground text-xs mt-0.5">{error.motivo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Info about updates */}
            {importPreview && importPreview.updateRecords.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Pencil className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-600">
                      {importPreview.updateRecords.length} treinamento(s) já existem (identificados pelo nome)
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Serão atualizados: NR, CH Formação, CH Reciclagem, Validade e campos de obrigatoriedade.
                      Apenas o Nome permanecerá inalterado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No valid records warning */}
            {importPreview && importPreview.validRecords.length === 0 && importPreview.updateRecords.length === 0 && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-medium">Nenhum registro válido para importar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Corrija os erros no arquivo CSV e tente novamente.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setImportPreviewDialogOpen(false);
                setImportPreview(null);
              }}
            >
              Cancelar
            </Button>
            {(importPreview?.validRecords.length || 0) + (importPreview?.updateRecords.length || 0) > 0 && (
              <Button 
                onClick={executeImport}
                disabled={importing}
                className="bg-primary"
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {importPreview?.errors.length ? 'Importar Válidos e Ignorar Erros' : 'Confirmar Importação'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={importResultDialogOpen} onOpenChange={setImportResultDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Importação Concluída
                </>
              ) : (importResult?.inserted || 0) + (importResult?.updated || 0) === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Falha na Importação
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Importação Parcial
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium">Inseridos</span>
                </div>
                <p className="text-xl font-bold text-green-600 mt-1">{importResult?.inserted || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">Atualizados</span>
                </div>
                <p className="text-xl font-bold text-blue-600 mt-1">{importResult?.updated || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium">Erros</span>
                </div>
                <p className="text-xl font-bold text-destructive mt-1">{importResult?.errors.length || 0}</p>
              </div>
            </div>

            {/* Error List */}
            {importResult && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Detalhes dos erros:</p>
                <ScrollArea className="h-[150px] rounded-md border p-3">
                  <div className="space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="text-sm">
                            {error.linha > 0 && (
                              <span className="font-medium">Linha {error.linha}: </span>
                            )}
                            <span className="font-medium">{error.nome}</span>
                            <p className="text-muted-foreground text-xs mt-0.5">{error.motivo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Success message */}
            {importResult?.errors.length === 0 && ((importResult?.inserted || 0) + (importResult?.updated || 0)) > 0 && (
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {importResult.inserted > 0 && importResult.updated > 0 ? (
                    <>
                      {importResult.inserted} treinamento(s) inserido(s) e {importResult.updated} atualizado(s) com sucesso!
                    </>
                  ) : importResult.inserted > 0 ? (
                    <>
                      {importResult.inserted} treinamento(s) inserido(s) com sucesso!
                    </>
                  ) : (
                    <>
                      {importResult.updated} treinamento(s) atualizado(s) com sucesso!
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setImportResultDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
