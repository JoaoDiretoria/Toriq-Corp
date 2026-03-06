import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, FileText, Plus, Search, Trash2, Copy, ChevronUp, ChevronDown, 
  Sparkles, Target, Award, BarChart3, DollarSign, CreditCard, ArrowRight, 
  Image as ImageIcon, MoreHorizontal, Printer, Check, Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, GripVertical, Maximize2, Minimize2,
  Table, List, ListOrdered, Link, Type, Strikethrough, Columns, LayoutGrid,
  PanelTop, Palette, Upload, X, Move, Settings2, Eye, Download, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Tipos de blocos expandidos
type ModoElaboracao = 'cabecalho' | 'hero' | 'dores_solucoes' | 'diferenciais' | 'comparativo' | 'precos' | 'pagamento' | 'cta' | 'texto' | 'imagem' | 'separador' | 'tabela' | 'rodape';

// Interface de estilo para campos individuais
interface FieldStyle {
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  fontStrikethrough?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
}

// Estilos globais para tipos de texto (título, subtítulo, conteúdo)
interface GlobalTextStyles {
  titulo: FieldStyle;
  subtitulo: FieldStyle;
  conteudo: FieldStyle;
  label: FieldStyle;
}

// Interface de estilo do bloco com mais opções
interface BlockStyle { 
  accent: string; 
  pad: number; 
  radius: number; 
  bgMode: 'white' | 'soft' | 'brand' | 'custom'; 
  bgColor: string;
  bgImage: string;
  borderMode: 'none' | 'line' | 'brand'; 
  note: string; 
  fontSize: number; 
  fontBold: boolean; 
  fontItalic: boolean; 
  fontUnderline: boolean; 
  fontStrikethrough: boolean;
  textAlign: 'left' | 'center' | 'right'; 
  // Novas propriedades para layout
  width: 'full' | 'half' | 'third' | 'two-thirds';
  minHeight: number;
  marginBottom: number;
}

interface Block { 
  id: string; 
  type: ModoElaboracao; 
  data: any; 
  style: BlockStyle;
  // Estilos por campo individual
  fieldStyles?: Record<string, FieldStyle>;
}

// Interface para linha de blocos (permite blocos lado a lado)
interface BlockRow {
  id: string;
  blocks: Block[];
}

interface Proposta { 
  id: string; 
  title: string; 
  createdAt: string; 
  updatedAt: string; 
  createdBy: string; 
  blocks: Block[];
  // Configurações do cabeçalho
  header: {
    enabled: boolean;
    logoUrl: string;
    bgColor: string;
    bgImage: string;
    companyName: string;
    cnpj: string;
    address: string;
    validUntil: string;
    proposalCode: string;
  };
  // Estilos globais de texto
  globalStyles?: GlobalTextStyles;
}

// Estilos globais padrão
const defaultGlobalStyles = (): GlobalTextStyles => ({
  titulo: { fontBold: true, fontSize: 18, textAlign: 'left' },
  subtitulo: { fontBold: false, fontSize: 14, fontItalic: false, textAlign: 'left' },
  conteudo: { fontBold: false, fontSize: 12, textAlign: 'left' },
  label: { fontBold: true, fontSize: 10, textAlign: 'left', color: '#6b7280' }
});

// Interface para dados do orçamento
interface DadosOrcamento {
  tipo: 'treinamento' | 'servicos-sst' | 'vertical365';
  planoSelecionado?: 'bronze' | 'prata' | 'ouro';
  itens?: Array<{
    nome: string;
    quantidade?: number;
    valorUnitario?: number;
    valorTotal?: number;
  }>;
  valorTotal?: number;
  tabelaPrecos?: Array<{
    ch: string;
    horaAula: number;
    bronze: number;
    prata: number;
    ouro: number;
  }>;
  config?: any;
}

interface GeradorPropostaProps { 
  onClose: () => void; 
  clienteNome?: string; 
  cardId?: string;
  dadosOrcamento?: DadosOrcamento | null;
}

// Dimensões A4 em pixels (96 DPI)
const A4_WIDTH = 794; // ~210mm
const A4_HEIGHT = 1123; // ~297mm

const uid = () => Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
const nowISO = () => new Date().toISOString();
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; } };

const defaultStyle = (): BlockStyle => ({ 
  accent: '#4f46e5', 
  pad: 14, 
  radius: 14, 
  bgMode: 'white', 
  bgColor: '#ffffff',
  bgImage: '',
  borderMode: 'none', 
  note: '', 
  fontSize: 14, 
  fontBold: false, 
  fontItalic: false, 
  fontUnderline: false, 
  fontStrikethrough: false,
  textAlign: 'left',
  width: 'full',
  minHeight: 0,
  marginBottom: 8
});

const defaultHeader = () => ({
  enabled: true,
  logoUrl: '',
  bgColor: '#1a1a2e',
  bgImage: '',
  companyName: 'Vertical Segurança do Trabalho',
  cnpj: '00.000.000/0001-00',
  address: 'Endereço da empresa',
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
  proposalCode: `proposta_v1-${Date.now()}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`
});

const createBlock = (type: ModoElaboracao, data: any = {}): Block => ({ id: uid(), type, data, style: defaultStyle() });

// Bloco de Cabeçalho (novo)
const blockCabecalho = (d: any = {}) => createBlock('cabecalho', { 
  logoUrl: d.logoUrl || '', 
  bgColor: d.bgColor || '#1a1a2e',
  bgImage: d.bgImage || '',
  companyName: d.companyName || 'Nome da Empresa',
  subtitle: d.subtitle || 'PROPOSTA',
  cnpj: d.cnpj || '',
  address: d.address || '',
  validUntil: d.validUntil || '',
  proposalCode: d.proposalCode || ''
});

// Bloco de Tabela (novo)
const blockTabela = (d: any = {}) => createBlock('tabela', { 
  titulo: d.titulo || 'Tabela',
  colunas: d.colunas || ['Coluna 1', 'Coluna 2', 'Coluna 3'],
  linhas: d.linhas || [
    ['Dado 1', 'Dado 2', 'Dado 3'],
    ['Dado 4', 'Dado 5', 'Dado 6']
  ],
  headerBg: d.headerBg || '#f3f4f6',
  stripedRows: d.stripedRows !== false
});

const blockHero = (d: any = {}) => createBlock('hero', { tag: d.tag || 'Proposta comercial', headline: d.headline || 'Título forte orientado a resultado', subheadline: d.subheadline || 'Subtítulo com prova + promessa clara.', bullets: d.bullets || ['Benefício 1', 'Benefício 2', 'Benefício 3'], client: d.client || 'Nome do cliente', validity: d.validity || 'Validade: 10 dias', author: d.author || 'Sua empresa' });
const blockDoresSolucoes = (d: any = {}) => createBlock('dores_solucoes', { dores: d.dores || ['Dor 1', 'Dor 2', 'Dor 3'], solucoes: d.solucoes || ['Solução 1', 'Solução 2', 'Solução 3'] });
const blockDiferenciais = (d: any = {}) => createBlock('diferenciais', { titulo: d.titulo || 'Diferenciais', itens: d.itens || ['Diferencial 1', 'Diferencial 2', 'Diferencial 3'] });
const blockComparativo = (d: any = {}) => createBlock('comparativo', { titulo: d.titulo || 'Comparativo', linhas: d.linhas || [{ item: 'Item', atual: 'Situação atual', conosco: 'Com a solução' }] });
// Bloco de Preços com diferentes formatos
const blockPrecos = (d: any = {}) => createBlock('precos', { 
  formato: d.formato || 'planos', // planos, padrao, recorrencia, produto, servico, personalizado
  titulo: d.titulo || 'Investimento', 
  subtitulo: d.subtitulo || 'Escolha a melhor opção.', 
  // Formato Planos
  planos: d.planos || [
    { nome: 'Básico', preco: 'R$ 4.900', sub: 'Essencial', recomendado: false, bullets: ['Item 1', 'Item 2'] }, 
    { nome: 'Prata', preco: 'R$ 7.900', sub: 'Equilíbrio', recomendado: true, bullets: ['Tudo do Básico', 'Item 3'] }, 
    { nome: 'Ouro', preco: 'R$ 12.900', sub: 'Performance', recomendado: false, bullets: ['Tudo do Prata', 'Item 4'] }
  ],
  // Formato Padrão (print-like)
  itens: d.itens || [
    { nome: 'Gestão de Treinamentos via Sistema Web', descricao: 'Plano: Profissional • Entrega: 7 dias', sku: '001', precoUnitario: 2000, quantidade: 1, desconto: 0 }
  ],
  // Formato Recorrência
  plano: d.plano || { nome: 'Suporte Premium', periodicidade: 'Mensal', inicio: '01/02/2026', vigencia: '12 meses', reajuste: 'IPCA anual', cancelamento: '30 dias de aviso' },
  itensRecorrentes: d.itensRecorrentes || [
    { descricao: 'Suporte + SLA 4h', tipo: 'Serviço', valorMes: 350, quantidade: 1 },
    { descricao: 'Licenças do sistema (até 10 usuários)', tipo: 'Produto', valorMes: 250, quantidade: 1 }
  ],
  descontoRecorrencia: d.descontoRecorrencia || 60,
  condicoesRecorrencia: d.condicoesRecorrencia || { pagamento: 'boleto/PIX • venc. todo dia 10', validade: '7 dias', implantacao: '(se houver) cobrada à parte' },
  // Formato Produto
  itensProduto: d.itensProduto || [
    { nome: 'Kit de Boas-vindas', tipo: 'Produto', sku: 'KBW-10', preco: 120, quantidade: 5 },
    { nome: 'Licença (chave digital)', tipo: 'Digital', sku: 'LIC-01', preco: 480, quantidade: 1 }
  ],
  frete: d.frete || 35,
  impostos: d.impostos || 0,
  descontoProduto: d.descontoProduto || 80,
  entrega: d.entrega || { prazo: '3 a 5 dias úteis', endereco: '(preencher)', rastreamento: 'enviado após postagem' },
  // Formato Serviço
  objetivo: d.objetivo || 'Implantar processo de gestão de treinamentos + configuração do sistema.',
  premissas: d.premissas || 'acesso do cliente, disponibilidade de responsáveis e dados mínimos.',
  etapas: d.etapas || [
    { nome: 'Diagnóstico + Plano', marco: 'Marco 1', horas: 6, valorHora: 180 },
    { nome: 'Configuração do sistema', marco: 'Marco 2', horas: 8, valorHora: 180 },
    { nome: 'Treinamento da equipe', marco: 'Marco 3', horas: 4, valorHora: 180 }
  ],
  descontoServico: d.descontoServico || 240,
  condicoesServico: d.condicoesServico || { prazo: '2 semanas (após kick-off)', pagamento: '50% início + 50% entrega', validade: '10 dias' },
  // Formato Personalizado
  blocosOrcamento: d.blocosOrcamento || [
    { titulo: '1) CONTEXTO', texto: 'Descreva o cenário do cliente, dor principal, objetivos e a solução recomendada.' },
    { titulo: '2) ITENS & ENTREGAS', texto: 'Você pode inserir tabelas (como as dos modelos anteriores) ou listas:\n• Entrega A — prazo X\n• Entrega B — prazo Y' },
    { titulo: '3) TERMOS', texto: 'Validade, forma de pagamento, prazos, responsabilidades e observações legais.' }
  ],
  totaisPersonalizado: d.totaisPersonalizado || [
    { label: 'Implantação (serviço)', valor: 2000 },
    { label: 'Mensalidade (recorrência)', valor: 540, sufixo: '/ mês' },
    { label: 'Produtos (avulso)', valor: 1035 },
    { label: 'Descontos', valor: -200 }
  ],
  assinatura: d.assinatura || { cliente: '', data: '', responsavel: '' }
});

const blockPagamento = (d: any = {}) => createBlock('pagamento', { titulo: d.titulo || 'Condições de pagamento', itens: d.itens || ['À vista no PIX: 5% de desconto', 'Boleto: 50% + 50%', 'Cartão: até 6x'], garantias: d.garantias || ['Escopo definido', 'Canal de atendimento', 'Relatórios de entrega'] });
const blockCTA = (d: any = {}) => createBlock('cta', { titulo: d.titulo || 'Próximos passos', texto: d.texto || 'Explique como o cliente fecha.', ctaText: d.ctaText || 'Aprovar proposta', ctaHint: d.ctaHint || '' });
const blockTexto = (d: any = {}) => createBlock('texto', { titulo: d.titulo || 'Título', texto: d.texto || 'Clique aqui e edite.' });
const blockImagem = (d: any = {}) => createBlock('imagem', { legenda: d.legenda || 'Legenda', src: d.src || '' });
const blockSeparador = () => createBlock('separador', { label: '' });

// Bloco de Rodapé
const blockRodape = (d: any = {}) => createBlock('rodape', {
  logoUrl: d.logoUrl || '',
  companyName: d.companyName || 'Nome da Empresa',
  cnpj: d.cnpj || '00.000.000/0001-00',
  endereco: d.endereco || 'Endereço completo',
  telefone: d.telefone || '(00) 0000-0000',
  email: d.email || 'contato@empresa.com',
  website: d.website || 'www.empresa.com',
  redesSociais: d.redesSociais || { instagram: '', linkedin: '', facebook: '' },
  textoLegal: d.textoLegal || 'Esta proposta é válida por 30 dias. Todos os valores estão sujeitos a alteração sem aviso prévio.',
  bgColor: d.bgColor || '#1a1a2e'
});

const createDefaultTemplates = (): Proposta[] => {
  const createTemplate = (title: string, planLabel: string): Proposta => {
    const blocks: Block[] = [blockHero({ headline: `Plano ${planLabel}: Resultado com clareza`, client: 'Nome do cliente' }), blockDoresSolucoes({ dores: ['Processos sem padrão', 'Falta de documentação', 'Decisões sem dados'], solucoes: ['Diagnóstico + plano', 'Documentação pronta', 'Acompanhamento'] }), blockDiferenciais({ itens: ['Entrega com checklist', 'Comunicação proativa', 'Modelo escalável'] }), blockPrecos({}), blockPagamento({}), blockCTA({})];
    return { id: uid(), title, createdAt: nowISO(), updatedAt: nowISO(), createdBy: 'Modelo', blocks, header: defaultHeader() };
  };
  return [createTemplate('ORÇAMENTO-BRONZE', 'Básico'), createTemplate('ORÇAMENTO-PRATA', 'Prata'), createTemplate('ORÇAMENTO-OURO', 'Ouro'), createTemplate('ORÇAMENTO-365', 'Recorrência')];
};

const STORAGE_KEY = 'proposal_builder_v1';
const loadStorage = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveStorage = (data: any) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); };

// Barra de ferramentas de formatação inline - agora trabalha com campos individuais
interface FormattingToolbarProps {
  block: Block;
  focusedFieldName: string | null;
  fieldStyle: FieldStyle;
  onFieldStyleChange: (key: keyof FieldStyle, value: any) => void;
  onOpenGlobalStyles: () => void;
}

function FormattingToolbar({ block, focusedFieldName, fieldStyle, onFieldStyleChange, onOpenGlobalStyles }: FormattingToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  
  const isFieldSelected = !!focusedFieldName;
  
  return (
    <div className="flex items-center gap-0.5 p-1 bg-background border rounded-md shadow-sm flex-wrap" onClick={(e) => e.stopPropagation()}>
      {/* Indicador de campo selecionado */}
      {focusedFieldName && (
        <Badge variant="outline" className="text-[9px] mr-1 bg-primary/10 text-primary border-primary/20">
          {focusedFieldName}
        </Badge>
      )}
      
      {/* Formatação de texto - aplica ao campo focado */}
      <Button 
        variant={fieldStyle.fontBold ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('fontBold', !fieldStyle.fontBold)}
        title="Negrito"
        disabled={!isFieldSelected}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant={fieldStyle.fontItalic ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('fontItalic', !fieldStyle.fontItalic)}
        title="Itálico"
        disabled={!isFieldSelected}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant={fieldStyle.fontUnderline ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('fontUnderline', !fieldStyle.fontUnderline)}
        title="Sublinhado"
        disabled={!isFieldSelected}
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant={fieldStyle.fontStrikethrough ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('fontStrikethrough', !fieldStyle.fontStrikethrough)}
        title="Tachado"
        disabled={!isFieldSelected}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      {/* Cor do texto */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0" 
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Cor do texto"
          disabled={!isFieldSelected}
        >
          <div className="flex flex-col items-center">
            <Type className="h-3 w-3" />
            <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: fieldStyle.color || block.style.accent }} />
          </div>
        </Button>
        {showColorPicker && isFieldSelected && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border rounded-md shadow-lg z-20">
            <input 
              type="color" 
              value={fieldStyle.color || '#000000'} 
              onChange={(e) => onFieldStyleChange('color', e.target.value)}
              className="w-8 h-8 cursor-pointer"
            />
          </div>
        )}
      </div>
      
      {/* Tamanho da fonte */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-1.5 text-[10px] font-medium" 
          onClick={() => setShowFontSize(!showFontSize)}
          title="Tamanho da fonte"
          disabled={!isFieldSelected}
        >
          {fieldStyle.fontSize || 14}px
        </Button>
        {showFontSize && isFieldSelected && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-card border rounded-md shadow-lg z-20 w-24">
            <Input 
              type="number" 
              min={8} 
              max={72} 
              value={fieldStyle.fontSize || 14} 
              onChange={(e) => onFieldStyleChange('fontSize', Number(e.target.value))}
              className="h-6 text-xs"
            />
          </div>
        )}
      </div>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      {/* Listas */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0" 
        title="Lista com marcadores"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0" 
        title="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      {/* Alinhamento */}
      <Button 
        variant={fieldStyle.textAlign === 'left' || !fieldStyle.textAlign ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('textAlign', 'left')}
        disabled={!isFieldSelected}
        title="Alinhar à esquerda"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant={fieldStyle.textAlign === 'center' ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('textAlign', 'center')}
        disabled={!isFieldSelected}
        title="Centralizar"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant={fieldStyle.textAlign === 'right' ? 'default' : 'ghost'} 
        size="sm" 
        className="h-7 w-7 p-0" 
        onClick={() => onFieldStyleChange('textAlign', 'right')}
        disabled={!isFieldSelected}
        title="Alinhar à direita"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      {/* Tabela e Imagem */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0" 
        title="Inserir tabela"
      >
        <Table className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0" 
        title="Inserir imagem"
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0" 
        title="Inserir link"
      >
        <Link className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      {/* Botão de estilos globais */}
      <Button 
        variant="outline" 
        size="sm" 
        className="h-7 px-2 text-[10px]" 
        onClick={onOpenGlobalStyles}
        title="Configurar estilos globais (títulos, subtítulos, conteúdo)"
      >
        <Settings2 className="h-3 w-3 mr-1" />
        Estilos
      </Button>
    </div>
  );
}

// Componente SortableBlock para drag & drop
interface SortableBlockProps {
  block: Block;
  idx: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  getBlockStyles: (style: BlockStyle) => React.CSSProperties;
  renderBlockContent: (block: Block) => React.ReactNode;
  onStyleChange: (blockId: string, key: keyof BlockStyle, value: any) => void;
  // Props para formatação por campo
  focusedFieldName: string | null;
  onFieldStyleChange: (blockId: string, fieldName: string, key: keyof FieldStyle, value: any) => void;
  getFieldStyle: (blockId: string, fieldName: string) => FieldStyle;
  onOpenGlobalStyles: () => void;
}

function SortableBlock({ 
  block, 
  idx, 
  isSelected, 
  onSelect, 
  onMoveUp, 
  onMoveDown, 
  onDuplicate, 
  onDelete, 
  isFirst, 
  isLast,
  getBlockStyles,
  renderBlockContent,
  onStyleChange,
  focusedFieldName,
  onFieldStyleChange,
  getFieldStyle,
  onOpenGlobalStyles
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...getBlockStyles(block.style),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-slate-300'}`}
      onClick={onSelect}
    >
      {/* Barra de formatação inline - aparece quando selecionado */}
      {isSelected && (
        <div className="absolute -top-10 left-0 right-0 z-20">
          <FormattingToolbar 
            block={block}
            focusedFieldName={focusedFieldName}
            fieldStyle={focusedFieldName ? getFieldStyle(block.id, focusedFieldName) : {}}
            onFieldStyleChange={(key, value) => {
              if (focusedFieldName) {
                onFieldStyleChange(block.id, focusedFieldName, key, value);
              }
            }}
            onOpenGlobalStyles={onOpenGlobalStyles}
          />
        </div>
      )}
      
      {/* Handle de arrasto */}
      <div 
        className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ opacity: isSelected ? 1 : undefined }}
      >
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 bg-background cursor-grab active:cursor-grabbing" 
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Botões de ação */}
      <div 
        className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ opacity: isSelected ? 1 : undefined }}
      >
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 bg-background" 
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }} 
          disabled={isFirst}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 bg-background" 
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }} 
          disabled={isLast}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 bg-background" 
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 bg-background text-destructive hover:bg-destructive/10" 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {renderBlockContent(block)}
    </div>
  );
}

export function GeradorProposta({ onClose, clienteNome, cardId, dadosOrcamento }: GeradorPropostaProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [view, setView] = useState<'list' | 'new' | 'editor'>('list');
  const [searchProposals, setSearchProposals] = useState('');
  const [searchTemplates, setSearchTemplates] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingKind, setEditingKind] = useState<'proposal' | 'template' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{ kind: 'proposal' | 'template'; id: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  // Estado para rastrear qual campo está focado (blockId:fieldName)
  const [focusedField, setFocusedField] = useState<string | null>(null);
  // Estado para mostrar modal de estilos globais
  const [globalStylesOpen, setGlobalStylesOpen] = useState(false);
  // Estado para mostrar modal de propriedades do bloco
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  // Estado para proposta web
  const [webProposalOpen, setWebProposalOpen] = useState(false);
  const [webProposalLink, setWebProposalLink] = useState<string | null>(null);
  // Estados para aprovação do orçamento
  const [propostaSalva, setPropostaSalva] = useState(false);
  const [orcamentoAprovado, setOrcamentoAprovado] = useState(false);
  const [valorCard, setValorCard] = useState<number | null>(null);
  const [valorOrcamento, setValorOrcamento] = useState<number>(0);
  const [showValorDivergente, setShowValorDivergente] = useState(false);

  // Buscar valor do card ao montar
  const fetchValorCard = useCallback(async () => {
    if (!cardId) return;
    try {
      const { data } = await (supabase as any)
        .from('funil_cards')
        .select('valor')
        .eq('id', cardId)
        .maybeSingle();
      if (data) setValorCard(data.valor || 0);
    } catch (error) {
      console.error('Erro ao buscar valor do card:', error);
    }
  }, [cardId]);

  // Calcular valor total do orçamento
  const calcularValorOrcamento = useCallback(() => {
    if (!dadosOrcamento) return 0;
    if (dadosOrcamento.valorTotal) return dadosOrcamento.valorTotal;
    if (dadosOrcamento.itens) {
      return dadosOrcamento.itens.reduce((acc, item) => acc + (item.valorTotal || (item.valorUnitario || 0) * (item.quantidade || 1)), 0);
    }
    return 0;
  }, [dadosOrcamento]);

  // Efeito para buscar valor do card
  useEffect(() => {
    fetchValorCard();
    setValorOrcamento(calcularValorOrcamento());
  }, [fetchValorCard, calcularValorOrcamento]);

  // Função para salvar proposta e criar atividade
  const handleSalvarProposta = async () => {
    if (!editingDoc) return;

    // Salvar proposta localmente
    const newDoc = { ...editingDoc, updatedAt: nowISO() };
    if (editingKind === 'proposal') {
      persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) });
    }

    // Se tiver cardId, criar atividade de lembrete
    if (cardId) {
      try {
        const agora = new Date();
        const dataFormatada = agora.toISOString().split('T')[0];
        const horaFormatada = agora.toTimeString().slice(0, 5);

        await (supabase as any)
          .from('funil_card_atividades')
          .insert({
            card_id: cardId,
            tipo: 'tarefa',
            descricao: `Enviar proposta comercial: ${editingDoc.title}`,
            prazo: dataFormatada,
            horario: horaFormatada,
            status: 'programada',
            usuario_id: profile?.id,
          });

        toast({ 
          title: 'Proposta salva!', 
          description: 'Atividade de envio criada automaticamente.' 
        });
      } catch (error) {
        console.error('Erro ao criar atividade:', error);
        toast({ title: 'Proposta salva', description: 'Mas não foi possível criar a atividade.' });
      }
    } else {
      toast({ title: 'Salvo', description: 'Proposta salva.' });
    }

    setPropostaSalva(true);
  };

  // Função para aprovar orçamento
  const handleAprovarOrcamento = async (aprovado: boolean) => {
    setOrcamentoAprovado(aprovado);
    
    if (aprovado && valorCard !== null) {
      const valorOrc = calcularValorOrcamento();
      // Verificar se valores são diferentes (tolerância de R$ 0.01)
      if (Math.abs(valorOrc - valorCard) > 0.01) {
        setShowValorDivergente(true);
      } else {
        setShowValorDivergente(false);
        toast({ title: 'Orçamento aprovado', description: 'Valores conferem com o card.' });
      }
    } else {
      setShowValorDivergente(false);
    }
  };

  const initialData = useMemo(() => { const stored = loadStorage(); return stored || { user: { name: 'Usuário' }, templates: createDefaultTemplates(), proposals: [] as Proposta[], sortProposalsAsc: false, sortTemplatesAsc: false }; }, []);
  const [store, setStore] = useState(initialData);
  const persist = useCallback((newStore: typeof store) => { setStore(newStore); saveStorage(newStore); }, []);

  const getEditingDoc = useCallback((): Proposta | null => { if (editingKind === 'proposal') return store.proposals.find((p: Proposta) => p.id === editingId) || null; if (editingKind === 'template') return store.templates.find((t: Proposta) => t.id === editingId) || null; return null; }, [editingKind, editingId, store]);
  const editingDoc = getEditingDoc();

  const filteredProposals = useMemo(() => { const q = searchProposals.toLowerCase(); let items = [...store.proposals]; items.sort((a: Proposta, b: Proposta) => store.sortProposalsAsc ? (a.updatedAt || a.createdAt).localeCompare(b.updatedAt || b.createdAt) : (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)); if (q) items = items.filter((p: Proposta) => p.title.toLowerCase().includes(q)); return items; }, [store.proposals, searchProposals, store.sortProposalsAsc]);
  const filteredTemplates = useMemo(() => { const q = searchTemplates.toLowerCase(); let items = [...store.templates]; items.sort((a: Proposta, b: Proposta) => store.sortTemplatesAsc ? (a.updatedAt || a.createdAt).localeCompare(b.updatedAt || b.createdAt) : (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)); if (q) items = items.filter((t: Proposta) => t.title.toLowerCase().includes(q)); return items; }, [store.templates, searchTemplates, store.sortTemplatesAsc]);

  // Função para gerar código automático da proposta
  const generateProposalCode = (nomeCliente: string) => {
    // Extrai iniciais do nome do cliente (primeiras letras de cada palavra)
    const iniciais = nomeCliente
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .substring(0, 4) || 'CLI'; // Máximo 4 letras
    
    // Ano atual
    const ano = new Date().getFullYear();
    
    // Número sequencial baseado nas propostas existentes do mesmo ano
    const propostasDoAno = store.proposals.filter((p: Proposta) => {
      const match = p.title.match(/-(\d{4})-(\d+)$/);
      return match && parseInt(match[1]) === ano;
    });
    const sequencial = (propostasDoAno.length + 1).toString().padStart(4, '0');
    
    return `${iniciais}-${ano}-${sequencial}`;
  };

  // Função para criar bloco de preços com dados do orçamento
  const createBlockPrecosFromOrcamento = () => {
    if (!dadosOrcamento) return blockPrecos({});
    
    // Se tiver tabela de preços (treinamento normativo)
    if (dadosOrcamento.tabelaPrecos && dadosOrcamento.tabelaPrecos.length > 0) {
      const plano = dadosOrcamento.planoSelecionado || 'ouro';
      const planoNomes: Record<string, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };
      
      // Converter tabela de preços para itens
      const itens = dadosOrcamento.tabelaPrecos.map(item => ({
        nome: `Treinamento ${item.ch}h`,
        descricao: `Carga horária: ${item.ch} horas • Hora/aula: R$ ${item.horaAula.toFixed(2)}`,
        sku: '',
        precoUnitario: item[plano],
        quantidade: 1,
        desconto: 0
      }));
      
      return blockPrecos({
        formato: 'padrao',
        titulo: `Investimento - Plano ${planoNomes[plano]}`,
        subtitulo: 'Treinamento Normativo',
        itens
      });
    }
    
    // Se tiver itens genéricos
    if (dadosOrcamento.itens && dadosOrcamento.itens.length > 0) {
      const itens = dadosOrcamento.itens.map(item => ({
        nome: item.nome,
        descricao: '',
        sku: '',
        precoUnitario: item.valorUnitario || item.valorTotal || 0,
        quantidade: item.quantidade || 1,
        desconto: 0
      }));
      
      return blockPrecos({
        formato: 'padrao',
        titulo: 'Investimento',
        subtitulo: dadosOrcamento.tipo === 'servicos-sst' ? 'Serviços de SST' : 
                   dadosOrcamento.tipo === 'vertical365' ? 'Vertical 365' : 'Orçamento',
        itens
      });
    }
    
    return blockPrecos({});
  };

  const createProposalFromTemplate = (templateId: string | null) => { 
    let blocks: Block[] = []; 
    let header = defaultHeader(); 
    const nomeParaCodigo = clienteNome || 'Cliente';
    const codigoProposta = generateProposalCode(nomeParaCodigo);
    const title = codigoProposta;
    
    if (templateId) { 
      const t = store.templates.find((x: Proposta) => x.id === templateId); 
      if (t) { 
        blocks = JSON.parse(JSON.stringify(t.blocks)); 
        if (t.header) header = JSON.parse(JSON.stringify(t.header)); 
      } 
    } else { 
      // Usar dados do orçamento se disponíveis
      const blocoPrecos = createBlockPrecosFromOrcamento();
      blocks = [blockHero({ headline: 'Proposta comercial', client: clienteNome || 'Nome do cliente' }), blockDoresSolucoes({}), blocoPrecos, blockPagamento({}), blockCTA({})]; 
    } 
    
    // Se tiver dados do orçamento, atualizar o bloco de preços existente
    if (dadosOrcamento && blocks.length > 0) {
      const precosIdx = blocks.findIndex(b => b.type === 'precos');
      if (precosIdx >= 0) {
        blocks[precosIdx] = createBlockPrecosFromOrcamento();
      }
    }
    
    if (clienteNome && blocks.length > 0 && blocks[0].type === 'hero') blocks[0].data.client = clienteNome; 
    const p: Proposta = { id: uid(), title, createdAt: nowISO(), updatedAt: nowISO(), createdBy: store.user?.name || 'Usuário', blocks, header }; 
    persist({ ...store, proposals: [p, ...store.proposals] }); 
    setEditingKind('proposal'); 
    setEditingId(p.id); 
    setSelectedBlockId(null); 
    setView('editor'); 
  };
  const openProposalEditor = (id: string) => { setEditingKind('proposal'); setEditingId(id); setSelectedBlockId(null); setView('editor'); };
  const updateDocTitle = (title: string) => { if (!editingDoc) return; const newDoc = { ...editingDoc, title, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); };

  const addBlock = (type: ModoElaboracao) => { if (!editingDoc) return; let b: Block; switch (type) { case 'cabecalho': b = blockCabecalho({}); break; case 'hero': b = blockHero({}); break; case 'dores_solucoes': b = blockDoresSolucoes({}); break; case 'diferenciais': b = blockDiferenciais({}); break; case 'comparativo': b = blockComparativo({}); break; case 'precos': b = blockPrecos({}); break; case 'pagamento': b = blockPagamento({}); break; case 'cta': b = blockCTA({}); break; case 'texto': b = blockTexto({}); break; case 'imagem': b = blockImagem({}); break; case 'separador': b = blockSeparador(); break; case 'tabela': b = blockTabela({}); break; case 'rodape': b = blockRodape({}); break; default: return; } const newBlocks = [...editingDoc.blocks, b]; const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); setSelectedBlockId(b.id); };
  const deleteBlock = (blockId: string) => { if (!editingDoc) return; const newBlocks = editingDoc.blocks.filter((b: Block) => b.id !== blockId); const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); if (selectedBlockId === blockId) setSelectedBlockId(null); };
  const duplicateBlock = (blockId: string) => { if (!editingDoc) return; const idx = editingDoc.blocks.findIndex((b: Block) => b.id === blockId); if (idx < 0) return; const clone = JSON.parse(JSON.stringify(editingDoc.blocks[idx])); clone.id = uid(); const newBlocks = [...editingDoc.blocks]; newBlocks.splice(idx + 1, 0, clone); const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); setSelectedBlockId(clone.id); };
  const moveBlock = (blockId: string, direction: 'up' | 'down') => { if (!editingDoc) return; const idx = editingDoc.blocks.findIndex((b: Block) => b.id === blockId); if (idx < 0) return; const newIdx = direction === 'up' ? idx - 1 : idx + 1; if (newIdx < 0 || newIdx >= editingDoc.blocks.length) return; const newBlocks = [...editingDoc.blocks]; [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]]; const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); };
  const updateBlockData = (blockId: string, path: string, value: any) => { if (!editingDoc) return; const newBlocks = editingDoc.blocks.map((b: Block) => { if (b.id !== blockId) return b; const newData = { ...b.data }; const parts = path.split('.'); let cur: any = newData; for (let i = 0; i < parts.length - 1; i++) { const k = parts[i]; if (cur[k] == null) cur[k] = {}; cur = cur[k]; } cur[parts[parts.length - 1]] = value; return { ...b, data: newData }; }); const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); };
  const updateBlockStyle = (blockId: string, key: keyof BlockStyle, value: any) => { if (!editingDoc) return; const newBlocks = editingDoc.blocks.map((b: Block) => { if (b.id !== blockId) return b; return { ...b, style: { ...b.style, [key]: value } }; }); const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() }; if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) }); else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) }); };
  
  // Função para atualizar estilo de um campo específico dentro do bloco
  const updateFieldStyle = (blockId: string, fieldName: string, key: keyof FieldStyle, value: any) => {
    if (!editingDoc) return;
    const newBlocks = editingDoc.blocks.map((b: Block) => {
      if (b.id !== blockId) return b;
      const fieldStyles = b.fieldStyles || {};
      const currentFieldStyle = fieldStyles[fieldName] || {};
      return { 
        ...b, 
        fieldStyles: { 
          ...fieldStyles, 
          [fieldName]: { ...currentFieldStyle, [key]: value } 
        } 
      };
    });
    const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() };
    if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) });
    else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) });
  };

  // Função para obter estilo de um campo específico
  const getFieldStyle = (blockId: string, fieldName: string): FieldStyle => {
    const block = editingDoc?.blocks.find((b: Block) => b.id === blockId);
    return block?.fieldStyles?.[fieldName] || {};
  };

  // Função para atualizar estilos globais (afeta todos os títulos/subtítulos/conteúdos)
  const updateGlobalStyle = (type: keyof GlobalTextStyles, key: keyof FieldStyle, value: any) => {
    if (!editingDoc) return;
    const currentGlobalStyles = editingDoc.globalStyles || defaultGlobalStyles();
    const newGlobalStyles = {
      ...currentGlobalStyles,
      [type]: { ...currentGlobalStyles[type], [key]: value }
    };
    const newDoc = { ...editingDoc, globalStyles: newGlobalStyles, updatedAt: nowISO() };
    if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) });
    else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) });
  };

  // Obter estilos globais atuais
  const globalStyles = editingDoc?.globalStyles || defaultGlobalStyles();

  // Função para obter estilo combinado (campo específico sobrescreve global)
  const getCombinedFieldStyle = (blockId: string, fieldName: string, textType: keyof GlobalTextStyles): React.CSSProperties => {
    const fieldStyle = getFieldStyle(blockId, fieldName);
    const globalStyle = globalStyles[textType];
    const combined = { ...globalStyle, ...fieldStyle };
    return {
      fontWeight: combined.fontBold ? 'bold' : 'normal',
      fontStyle: combined.fontItalic ? 'italic' : 'normal',
      textDecoration: combined.fontStrikethrough ? 'line-through' : (combined.fontUnderline ? 'underline' : 'none'),
      fontSize: combined.fontSize ? `${combined.fontSize}px` : undefined,
      textAlign: combined.textAlign || 'left',
      color: combined.color,
    };
  };

  // Campo focado atual (blockId e fieldName)
  const focusedBlockId = focusedField?.split(':')[0] || null;
  const focusedFieldName = focusedField?.split(':')[1] || null;

  const selectedBlock = editingDoc?.blocks.find((b: Block) => b.id === selectedBlockId) || null;
  const blockTypeLabels: Record<ModoElaboracao, string> = { cabecalho: 'Cabeçalho', hero: 'Hero', dores_solucoes: 'Dores & Soluções', diferenciais: 'Diferenciais', comparativo: 'Comparativo', precos: 'Preços', pagamento: 'Pagamento', cta: 'CTA', texto: 'Texto', imagem: 'Imagem', separador: 'Separador', tabela: 'Tabela', rodape: 'Rodapé' };

  // Função para gerar PDF da proposta
  const generatePDF = async () => {
    if (!previewRef.current || !editingDoc) return;
    
    setGeneratingPdf(true);
    toast({ title: 'Gerando PDF...', description: 'Aguarde enquanto o documento é processado.' });
    
    try {
      const element = previewRef.current;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const margin = 10; // margin in mm
      const contentWidth = pdfWidth - (margin * 2);
      
      // Captura o elemento como canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Melhor qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Calcula quantas páginas serão necessárias
      const pageContentHeight = pdfHeight - (margin * 2);
      const totalPages = Math.ceil(imgHeight / pageContentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Posição Y para esta página (negativa para "rolar" a imagem)
        const yPosition = margin - (page * pageContentHeight);
        
        // Adiciona a imagem com clip para a página atual
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPosition,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      }
      
      // Baixa o PDF
      const fileName = `${editingDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      
      toast({ title: 'PDF gerado!', description: `Arquivo "${fileName}" baixado com sucesso.` });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF. Tente novamente.', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Função para gerar link da proposta web
  const generateWebProposalLink = () => {
    if (!editingDoc) return;
    
    // Gera um ID único para a proposta web
    const webId = editingDoc.id;
    
    // Salva a proposta no localStorage com status de compartilhamento
    const sharedProposals = JSON.parse(localStorage.getItem('sharedProposals') || '{}');
    sharedProposals[webId] = {
      ...editingDoc,
      sharedAt: new Date().toISOString(),
      status: 'pendente', // pendente, aprovada, reprovada
      clienteResposta: null,
      clienteComentario: ''
    };
    localStorage.setItem('sharedProposals', JSON.stringify(sharedProposals));
    
    // Gera o link usando a origem atual
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/proposta/${webId}`;
    
    setWebProposalLink(link);
    setWebProposalOpen(true);
    
    toast({ title: 'Link gerado!', description: 'O link da proposta web foi criado com sucesso.' });
  };
  
  // Função para abrir proposta no navegador (navega internamente)
  const openWebProposal = () => {
    if (!editingDoc) return;
    window.open(`/proposta/${editingDoc.id}`, '_blank');
  };

  // Função para copiar link para área de transferência
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Link copiado para a área de transferência.' });
  };
  
  // Função para gerar estilos inline do bloco baseado nas propriedades
  const getBlockStyles = (style: BlockStyle): React.CSSProperties => {
    const bgColors: Record<string, string> = { white: '#ffffff', soft: '#f8f9fa', brand: style.accent + '15', custom: style.bgColor || '#ffffff' };
    const borderColors: Record<string, string> = { none: 'transparent', line: '#e2e8f0', brand: style.accent };
    const widthMap: Record<string, string> = { full: '100%', half: '49%', third: '32%', 'two-thirds': '66%' };
    
    return {
      padding: `${style.pad || 14}px`,
      borderRadius: `${style.radius || 14}px`,
      backgroundColor: bgColors[style.bgMode] || '#ffffff',
      backgroundImage: style.bgImage ? `url(${style.bgImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderColor: borderColors[style.borderMode] || 'transparent',
      borderWidth: style.borderMode !== 'none' ? '2px' : '1px',
      borderStyle: 'solid',
      fontSize: `${style.fontSize || 14}px`,
      fontWeight: style.fontBold ? 'bold' : 'normal',
      fontStyle: style.fontItalic ? 'italic' : 'normal',
      textDecoration: style.fontStrikethrough ? 'line-through' : (style.fontUnderline ? 'underline' : 'none'),
      textAlign: style.textAlign || 'left',
      width: widthMap[style.width] || '100%',
      minHeight: style.minHeight ? `${style.minHeight}px` : 'auto',
      marginBottom: `${style.marginBottom || 8}px`,
      '--accent-color': style.accent,
    } as React.CSSProperties;
  };

  // Função para atualizar o header da proposta
  const updateHeader = (key: string, value: any) => {
    if (!editingDoc) return;
    const newHeader = { ...(editingDoc.header || defaultHeader()), [key]: value };
    const newDoc = { ...editingDoc, header: newHeader, updatedAt: nowISO() };
    if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) });
    else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) });
  };

  // Funções para manipulação de tabelas
  const addTableRow = (blockId: string) => {
    if (!editingDoc) return;
    const block = editingDoc.blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabela') return;
    const numCols = block.data.colunas?.length || 3;
    const newRow = Array(numCols).fill('');
    const newLinhas = [...(block.data.linhas || []), newRow];
    updateBlockData(blockId, 'linhas', newLinhas);
  };

  const removeTableRow = (blockId: string, rowIndex: number) => {
    if (!editingDoc) return;
    const block = editingDoc.blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabela') return;
    const newLinhas = block.data.linhas.filter((_: any, i: number) => i !== rowIndex);
    updateBlockData(blockId, 'linhas', newLinhas);
  };

  const addTableColumn = (blockId: string) => {
    if (!editingDoc) return;
    const block = editingDoc.blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabela') return;
    const newColunas = [...(block.data.colunas || []), `Coluna ${(block.data.colunas?.length || 0) + 1}`];
    const newLinhas = (block.data.linhas || []).map((row: string[]) => [...row, '']);
    updateBlockData(blockId, 'colunas', newColunas);
    updateBlockData(blockId, 'linhas', newLinhas);
  };

  const removeTableColumn = (blockId: string, colIndex: number) => {
    if (!editingDoc) return;
    const block = editingDoc.blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabela') return;
    const newColunas = block.data.colunas.filter((_: any, i: number) => i !== colIndex);
    const newLinhas = block.data.linhas.map((row: string[]) => row.filter((_: any, i: number) => i !== colIndex));
    updateBlockData(blockId, 'colunas', newColunas);
    updateBlockData(blockId, 'linhas', newLinhas);
  };

  // DnD sensors para arrastar blocos
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !editingDoc) return;
    
    const oldIndex = editingDoc.blocks.findIndex(b => b.id === active.id);
    const newIndex = editingDoc.blocks.findIndex(b => b.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newBlocks = arrayMove(editingDoc.blocks, oldIndex, newIndex);
      const newDoc = { ...editingDoc, blocks: newBlocks, updatedAt: nowISO() };
      if (editingKind === 'proposal') persist({ ...store, proposals: store.proposals.map((p: Proposta) => p.id === editingId ? newDoc : p) });
      else persist({ ...store, templates: store.templates.map((t: Proposta) => t.id === editingId ? newDoc : t) });
    }
  };
  
  const saveAsTemplate = () => { if (!editingDoc) return; const t: Proposta = { id: uid(), title: 'MODELO-' + (editingDoc.title || 'NOVO'), createdAt: nowISO(), updatedAt: nowISO(), createdBy: store.user?.name || 'Usuário', blocks: JSON.parse(JSON.stringify(editingDoc.blocks)), header: editingDoc.header ? JSON.parse(JSON.stringify(editingDoc.header)) : defaultHeader() }; persist({ ...store, templates: [t, ...store.templates] }); toast({ title: 'Sucesso', description: 'Salvo como modelo.' }); setView('new'); };
  const deleteDocument = (kind: 'proposal' | 'template', id: string) => { if (kind === 'proposal') { persist({ ...store, proposals: store.proposals.filter((p: Proposta) => p.id !== id) }); if (editingKind === 'proposal' && editingId === id) setView('list'); } else { persist({ ...store, templates: store.templates.filter((t: Proposta) => t.id !== id) }); if (editingKind === 'template' && editingId === id) setView('new'); } setModalOpen(false); };
  const duplicateDocument = (kind: 'proposal' | 'template', id: string) => { if (kind === 'proposal') { const p = store.proposals.find((x: Proposta) => x.id === id); if (!p) return; const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.title = (p.title || 'Proposta') + ' (cópia)'; c.createdAt = nowISO(); c.updatedAt = nowISO(); persist({ ...store, proposals: [c, ...store.proposals] }); } else { const t = store.templates.find((x: Proposta) => x.id === id); if (!t) return; const c = JSON.parse(JSON.stringify(t)); c.id = uid(); c.title = (t.title || 'Modelo') + ' (cópia)'; c.createdAt = nowISO(); c.updatedAt = nowISO(); persist({ ...store, templates: [c, ...store.templates] }); } setModalOpen(false); };

  const renderBlockContent = (block: Block) => {
    const d = block.data;
    switch (block.type) {
      // Bloco de Cabeçalho (novo)
      case 'cabecalho': return (
        <div 
          className="relative p-6 rounded-lg text-white min-h-[120px]" 
          style={{ 
            backgroundColor: d.bgColor || '#1a1a2e',
            backgroundImage: d.bgImage ? `url(${d.bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent rounded-lg" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {d.logoUrl ? (
                <img src={d.logoUrl} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-lg p-2" />
              ) : (
                <label className="cursor-pointer h-16 w-16 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Upload className="h-6 w-6 text-white/70" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateBlockData(block.id, 'logoUrl', reader.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              )}
              <div className="space-y-1">
                <Input value={d.subtitle || 'PROPOSTA'} onChange={(e) => updateBlockData(block.id, 'subtitle', e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0 text-primary font-bold uppercase tracking-wider" />
                <Input value={d.companyName || ''} onChange={(e) => updateBlockData(block.id, 'companyName', e.target.value)} className="h-7 text-lg font-bold border-0 bg-transparent p-0 text-white" placeholder="Nome da Empresa" />
                <Input value={d.cnpj || ''} onChange={(e) => updateBlockData(block.id, 'cnpj', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70" placeholder="CNPJ" />
                <Input value={d.address || ''} onChange={(e) => updateBlockData(block.id, 'address', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70" placeholder="Endereço" />
                <Input value={d.validUntil || ''} onChange={(e) => updateBlockData(block.id, 'validUntil', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70" placeholder="Válida até: DD/MM/AAAA" />
              </div>
            </div>
            <div className="text-right">
              <Input value={d.proposalCode || ''} onChange={(e) => updateBlockData(block.id, 'proposalCode', e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0 text-white/70 text-right" placeholder="Código da proposta" />
              <div className="mt-2 flex gap-2 justify-end">
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="text-[10px] h-6 bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Palette className="h-3 w-3 mr-1" />Alterar estilo
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateBlockData(block.id, 'bgImage', reader.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      );
      
      // Bloco de Tabela (novo)
      case 'tabela': return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0 w-40" placeholder="Título da tabela" />
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addTableRow(block.id)}>
                <Plus className="h-3 w-3 mr-1" />Linha
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addTableColumn(block.id)}>
                <Plus className="h-3 w-3 mr-1" />Coluna
              </Button>
            </div>
          </div>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead style={{ backgroundColor: d.headerBg || '#f3f4f6' }}>
                <tr>
                  {(d.colunas || []).map((col: string, i: number) => (
                    <th key={i} className="p-2 text-left font-medium">
                      <div className="flex items-center gap-1">
                        <Input value={col} onChange={(e) => {
                          const newColunas = [...d.colunas];
                          newColunas[i] = e.target.value;
                          updateBlockData(block.id, 'colunas', newColunas);
                        }} className="h-5 text-xs border-0 bg-transparent p-0 font-medium" />
                        {d.colunas.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-destructive hover:text-destructive/80" onClick={() => removeTableColumn(block.id, i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(d.linhas || []).map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx} className={`border-t ${d.stripedRows && rowIdx % 2 === 1 ? 'bg-muted/30' : ''}`}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className="p-2">
                        <Input value={cell} onChange={(e) => {
                          const newLinhas = d.linhas.map((r: string[], ri: number) => 
                            ri === rowIdx ? r.map((c: string, ci: number) => ci === cellIdx ? e.target.value : c) : r
                          );
                          updateBlockData(block.id, 'linhas', newLinhas);
                        }} className="h-5 text-xs border-0 bg-transparent p-0" />
                      </td>
                    ))}
                    <td className="p-1">
                      {d.linhas.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive/80" onClick={() => removeTableRow(block.id, rowIdx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      
      case 'hero': return (<div className="space-y-2"><div className="flex justify-between flex-wrap gap-2"><Badge className="bg-primary/10 text-primary max-w-[200px]"><Sparkles className="h-3 w-3 mr-1 shrink-0" /><span contentEditable suppressContentEditableWarning onBlur={(e) => updateBlockData(block.id, 'tag', e.currentTarget.textContent || '')} onFocus={() => setFocusedField(`${block.id}:tag`)} className="outline-none min-w-[20px] break-words" style={getCombinedFieldStyle(block.id, 'tag', 'label')}>{d.tag || 'Proposta comercial'}</span></Badge><Badge variant="outline" className="max-w-[250px]">Cliente: <span contentEditable suppressContentEditableWarning onBlur={(e) => updateBlockData(block.id, 'client', e.currentTarget.textContent || '')} onFocus={() => setFocusedField(`${block.id}:client`)} className="outline-none ml-1 min-w-[20px] break-words" style={getCombinedFieldStyle(block.id, 'client', 'conteudo')}>{d.client || 'Nome do cliente'}</span></Badge></div><div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlockData(block.id, 'headline', e.currentTarget.textContent || '')} onFocus={() => setFocusedField(`${block.id}:headline`)} className="text-base outline-none break-words" style={getCombinedFieldStyle(block.id, 'headline', 'titulo')}>{d.headline || 'Proposta comercial'}</div><div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlockData(block.id, 'subheadline', e.currentTarget.textContent || '')} onFocus={() => setFocusedField(`${block.id}:subheadline`)} className="text-xs text-muted-foreground outline-none break-words" style={getCombinedFieldStyle(block.id, 'subheadline', 'subtitulo')}>{d.subheadline || 'Subtítulo com prova + promessa clara.'}</div><div className="grid grid-cols-2 gap-2"><Card><CardContent className="p-2"><p className="text-[10px] font-bold mb-1">O que você ganha</p><ul className="space-y-1 text-[10px]">{(d.bullets || []).map((b: string, i: number) => (<li key={i} className="flex gap-1">•<Input value={b} onChange={(e) => updateBlockData(block.id, `bullets.${i}`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></li>))}</ul></CardContent></Card><Card><CardContent className="p-2 space-y-1 text-[10px]"><p className="font-bold mb-1">Informações</p><div className="flex gap-1"><span className="font-medium">Validade:</span><Input value={d.validity || ''} onChange={(e) => updateBlockData(block.id, 'validity', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></div><div className="flex gap-1"><span className="font-medium">Responsável:</span><Input value={d.author || ''} onChange={(e) => updateBlockData(block.id, 'author', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></div></CardContent></Card></div></div>);
      case 'dores_solucoes': return (<div className="space-y-2"><div className="flex justify-between"><span className="font-bold text-sm">Dores & Soluções</span><Badge variant="outline" className="text-[10px]">Venda</Badge></div><div className="grid grid-cols-2 gap-2"><Card><CardContent className="p-2"><p className="text-[10px] font-bold text-destructive mb-1">Dores</p><ul className="space-y-1 text-[10px]">{(d.dores || []).map((item: string, i: number) => (<li key={i} className="flex gap-1"><span className="text-destructive">•</span><Input value={item} onChange={(e) => updateBlockData(block.id, `dores.${i}`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></li>))}</ul></CardContent></Card><Card><CardContent className="p-2"><p className="text-[10px] font-bold text-primary mb-1">Soluções</p><ul className="space-y-1 text-[10px]">{(d.solucoes || []).map((item: string, i: number) => (<li key={i} className="flex gap-1"><span className="text-primary">✓</span><Input value={item} onChange={(e) => updateBlockData(block.id, `solucoes.${i}`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></li>))}</ul></CardContent></Card></div></div>);
      case 'diferenciais': return (<div className="space-y-2"><div className="flex justify-between"><Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0 w-32" /><Badge className="bg-primary/10 text-primary text-[10px]">✓ Confiança</Badge></div><ul className="space-y-1 text-xs">{(d.itens || []).map((item: string, i: number) => (<li key={i} className="flex gap-1"><Award className="h-3 w-3 text-primary shrink-0" /><Input value={item} onChange={(e) => updateBlockData(block.id, `itens.${i}`, e.target.value)} className="h-5 text-xs border-0 bg-transparent p-0 flex-1" /></li>))}</ul></div>);
      case 'comparativo': return (<div className="space-y-2"><div className="flex justify-between"><Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0 w-32" /><Badge variant="outline" className="text-[10px]">Antes x Depois</Badge></div><div className="border rounded overflow-hidden"><table className="w-full text-[10px]"><thead className="bg-muted"><tr><th className="p-1 text-left">Critério</th><th className="p-1 text-left text-destructive">Hoje</th><th className="p-1 text-left text-primary">Com solução</th></tr></thead><tbody>{(d.linhas || []).map((row: any, i: number) => (<tr key={i} className="border-t"><td className="p-1"><Input value={row.item} onChange={(e) => updateBlockData(block.id, `linhas.${i}.item`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0" /></td><td className="p-1"><Input value={row.atual} onChange={(e) => updateBlockData(block.id, `linhas.${i}.atual`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-destructive" /></td><td className="p-1"><Input value={row.conosco} onChange={(e) => updateBlockData(block.id, `linhas.${i}.conosco`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-primary" /></td></tr>))}</tbody></table></div></div>);
      case 'precos': {
        const formato = d.formato || 'planos';
        const formatoOptions = [
          { value: 'planos', label: 'Planos', desc: 'Básico/Prata/Ouro' },
          { value: 'padrao', label: 'Padrão', desc: 'Print-like com itens' },
          { value: 'recorrencia', label: 'Recorrência', desc: 'Mensalidades' },
          { value: 'produto', label: 'Produto', desc: 'SKU + Frete' },
          { value: 'servico', label: 'Serviço', desc: 'Etapas + Horas' },
          { value: 'personalizado', label: 'Personalizado', desc: 'Blocos livres' }
        ];
        
        return (
          <div className="space-y-3">
            {/* Seletor de Formato */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0 flex-1" />
              <select 
                value={formato} 
                onChange={(e) => updateBlockData(block.id, 'formato', e.target.value)}
                className="text-[10px] border rounded px-2 py-1 bg-background"
              >
                {formatoOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Input value={d.subtitulo || ''} onChange={(e) => updateBlockData(block.id, 'subtitulo', e.target.value)} className="text-[10px] text-muted-foreground border-0 bg-transparent p-0" />
            
            {/* Formato: Planos */}
            {formato === 'planos' && (
              <div className="grid grid-cols-3 gap-1">
                {(d.planos || []).map((plan: any, i: number) => (
                  <Card key={i} className={plan.recomendado ? 'border-primary shadow' : ''}>
                    <CardContent className="p-2 space-y-1">
                      <div className="flex justify-between">
                        <Input value={plan.nome} onChange={(e) => updateBlockData(block.id, `planos.${i}.nome`, e.target.value)} className="font-bold text-xs border-0 bg-transparent p-0 w-14" />
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-[10px]" onClick={() => { const newPlanos = (d.planos || []).map((p: any, j: number) => ({ ...p, recomendado: j === i })); updateBlockData(block.id, 'planos', newPlanos); }}>{plan.recomendado ? '★' : '☆'}</Button>
                      </div>
                      <Input value={plan.preco} onChange={(e) => updateBlockData(block.id, `planos.${i}.preco`, e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0" />
                      <ul className="space-y-0.5 text-[9px]">
                        {(plan.bullets || []).map((b: string, k: number) => (
                          <li key={k} className="flex gap-1">•<Input value={b} onChange={(e) => updateBlockData(block.id, `planos.${i}.bullets.${k}`, e.target.value)} className="h-3 text-[9px] border-0 bg-transparent p-0 flex-1" /></li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Formato: Padrão (print-like) */}
            {formato === 'padrao' && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">Você pode usar este bloco dentro do seu orçamento para destacar o investimento total (com desconto) e permitir detalhamento de itens.</p>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-center">Preço unitário (R$)</th>
                        <th className="p-2 text-center">Quantidade</th>
                        <th className="p-2 text-center">Total (R$)</th>
                        <th className="p-2 text-center">Desconto</th>
                        <th className="p-2 text-center">Total c/ desconto (R$)</th>
                        <th className="p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.itens || []).map((item: any, i: number) => {
                        const total = (item.precoUnitario || 0) * (item.quantidade || 1);
                        const desconto = (item.desconto || 0) / 100;
                        const totalComDesconto = total * (1 - desconto);
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary font-bold text-[10px]">VT</div>
                                <div>
                                  <Input value={item.nome || ''} onChange={(e) => updateBlockData(block.id, `itens.${i}.nome`, e.target.value)} className="h-5 text-[10px] font-bold border-0 bg-transparent p-0" />
                                  <Input value={item.descricao || ''} onChange={(e) => updateBlockData(block.id, `itens.${i}.descricao`, e.target.value)} className="h-4 text-[9px] text-muted-foreground border-0 bg-transparent p-0" />
                                </div>
                                <Input value={item.sku || ''} onChange={(e) => updateBlockData(block.id, `itens.${i}.sku`, e.target.value)} className="h-5 w-12 text-[9px] text-center border rounded" placeholder="SKU" />
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Input type="number" value={item.precoUnitario || 0} onChange={(e) => updateBlockData(block.id, `itens.${i}.precoUnitario`, Number(e.target.value))} className="h-5 w-20 text-[10px] text-center border rounded" />
                            </td>
                            <td className="p-2 text-center">
                              <Input type="number" value={item.quantidade || 1} onChange={(e) => updateBlockData(block.id, `itens.${i}.quantidade`, Number(e.target.value))} className="h-5 w-12 text-[10px] text-center border rounded" />
                            </td>
                            <td className="p-2 text-center font-medium">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-center">
                              <Input type="number" value={item.desconto || 0} onChange={(e) => updateBlockData(block.id, `itens.${i}.desconto`, Number(e.target.value))} className="h-5 w-12 text-[10px] text-center border rounded" /> %
                            </td>
                            <td className="p-2 text-center font-bold text-primary">R$ {totalComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-center">
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                                const newItens = (d.itens || []).filter((_: any, j: number) => j !== i);
                                updateBlockData(block.id, 'itens', newItens);
                              }}><Trash2 className="h-3 w-3" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={() => {
                  const newItens = [...(d.itens || []), { nome: 'Novo item', descricao: 'Descrição', sku: '000', precoUnitario: 0, quantidade: 1, desconto: 0 }];
                  updateBlockData(block.id, 'itens', newItens);
                }}><Plus className="h-3 w-3 mr-1" />Adicionar outro</Button>
                
                {/* Resumo de valores */}
                <Card className="ml-auto max-w-[250px]">
                  <CardContent className="p-3 space-y-1 text-[10px]">
                    {(() => {
                      const valorTotal = (d.itens || []).reduce((acc: number, item: any) => acc + ((item.precoUnitario || 0) * (item.quantidade || 1)), 0);
                      const valorDesconto = (d.itens || []).reduce((acc: number, item: any) => {
                        const total = (item.precoUnitario || 0) * (item.quantidade || 1);
                        return acc + (total * ((item.desconto || 0) / 100));
                      }, 0);
                      return (
                        <>
                          <div className="flex justify-between"><span>Valor</span><span className="font-medium">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between text-destructive"><span>Valor do desconto</span><span>- R$ {valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <Separator />
                          <div className="flex justify-between font-bold"><span>Valor total</span><span>R$ {(valorTotal - valorDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Formato: Recorrência */}
            {formato === 'recorrencia' && (
              <div className="grid grid-cols-[1fr_280px] gap-3">
                <div className="space-y-3">
                  {/* Resumo do Plano */}
                  <Card>
                    <CardContent className="p-3">
                      <p className="font-bold text-[10px] mb-2">RESUMO DO PLANO</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-muted-foreground">Plano</span><Input value={d.plano?.nome || ''} onChange={(e) => updateBlockData(block.id, 'plano.nome', e.target.value)} className="h-5 text-[10px] font-medium border-0 bg-transparent p-0" /></div>
                        <div><span className="text-muted-foreground">Periodicidade</span><Input value={d.plano?.periodicidade || ''} onChange={(e) => updateBlockData(block.id, 'plano.periodicidade', e.target.value)} className="h-5 text-[10px] font-medium text-blue-600 border-0 bg-transparent p-0" /></div>
                        <div><span className="text-muted-foreground">Início</span><Input value={d.plano?.inicio || ''} onChange={(e) => updateBlockData(block.id, 'plano.inicio', e.target.value)} className="h-5 text-[10px] font-medium text-blue-600 border-0 bg-transparent p-0" /></div>
                        <div><span className="text-muted-foreground">Vigência mínima</span><Input value={d.plano?.vigencia || ''} onChange={(e) => updateBlockData(block.id, 'plano.vigencia', e.target.value)} className="h-5 text-[10px] font-medium text-blue-600 border-0 bg-transparent p-0" /></div>
                        <div><span className="text-muted-foreground">Reajuste</span><Input value={d.plano?.reajuste || ''} onChange={(e) => updateBlockData(block.id, 'plano.reajuste', e.target.value)} className="h-5 text-[10px] font-medium text-blue-600 border-0 bg-transparent p-0" /></div>
                        <div><span className="text-muted-foreground">Cancelamento</span><Input value={d.plano?.cancelamento || ''} onChange={(e) => updateBlockData(block.id, 'plano.cancelamento', e.target.value)} className="h-5 text-[10px] font-medium text-blue-600 border-0 bg-transparent p-0" /></div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Itens Recorrentes */}
                  <div>
                    <p className="font-bold text-[10px] mb-2">ITENS RECORRENTES</p>
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Descrição</th>
                            <th className="p-2 text-center">Valor/mês</th>
                            <th className="p-2 text-center">Qtd</th>
                            <th className="p-2 text-center">Subtotal/mês</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(d.itensRecorrentes || []).map((item: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <div className="border rounded p-1">
                                    <Input value={item.descricao || ''} onChange={(e) => updateBlockData(block.id, `itensRecorrentes.${i}.descricao`, e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0" />
                                  </div>
                                  <Badge variant="outline" className="text-[9px]">{item.tipo}</Badge>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span>R$</span>
                                  <Input type="number" value={item.valorMes || 0} onChange={(e) => updateBlockData(block.id, `itensRecorrentes.${i}.valorMes`, Number(e.target.value))} className="h-5 w-16 text-[10px] text-center border rounded" />
                                  <span className="text-muted-foreground">mês</span>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <Input type="number" value={item.quantidade || 1} onChange={(e) => updateBlockData(block.id, `itensRecorrentes.${i}.quantidade`, Number(e.target.value))} className="h-5 w-10 text-[10px] text-center border rounded" />
                              </td>
                              <td className="p-2 text-center font-medium">R$ {((item.valorMes || 0) * (item.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-muted-foreground">mês</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Fechamento */}
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-bold text-[10px]">FECHAMENTO</p>
                    {(() => {
                      const subtotal = (d.itensRecorrentes || []).reduce((acc: number, item: any) => acc + ((item.valorMes || 0) * (item.quantidade || 1)), 0);
                      const desconto = d.descontoRecorrencia || 0;
                      return (
                        <>
                          <div className="flex justify-between text-[10px]"><span>Subtotal mensal</span><span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between text-[10px] text-destructive"><span>Desconto</span><span>- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <Separator />
                          <div className="flex justify-between text-[10px] font-bold"><span>Total mensal</span><span>R$ {(subtotal - desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                        </>
                      );
                    })()}
                    <Separator />
                    <p className="font-bold text-[10px]">CONDIÇÕES</p>
                    <div className="text-[9px] space-y-1">
                      <div><span className="font-medium">Pagamento:</span> <Input value={d.condicoesRecorrencia?.pagamento || ''} onChange={(e) => updateBlockData(block.id, 'condicoesRecorrencia.pagamento', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                      <div><span className="font-medium">Validade da proposta:</span> <Input value={d.condicoesRecorrencia?.validade || ''} onChange={(e) => updateBlockData(block.id, 'condicoesRecorrencia.validade', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                      <div><span className="font-medium">Implantação:</span> <Input value={d.condicoesRecorrencia?.implantacao || ''} onChange={(e) => updateBlockData(block.id, 'condicoesRecorrencia.implantacao', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Formato: Produto */}
            {formato === 'produto' && (
              <div className="grid grid-cols-[1fr_250px] gap-3">
                <div className="space-y-2">
                  <p className="font-bold text-[10px]">ITENS</p>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Produto</th>
                          <th className="p-2 text-center">SKU</th>
                          <th className="p-2 text-center">Preço</th>
                          <th className="p-2 text-center">Qtd</th>
                          <th className="p-2 text-center">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(d.itensProduto || []).map((item: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="border rounded p-1">
                                  <Input value={item.nome || ''} onChange={(e) => updateBlockData(block.id, `itensProduto.${i}.nome`, e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0" />
                                </div>
                                <Badge variant="outline" className="text-[9px]">{item.tipo}</Badge>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Input value={item.sku || ''} onChange={(e) => updateBlockData(block.id, `itensProduto.${i}.sku`, e.target.value)} className="h-5 w-16 text-[10px] text-center border rounded" />
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span>R$</span>
                                <Input type="number" value={item.preco || 0} onChange={(e) => updateBlockData(block.id, `itensProduto.${i}.preco`, Number(e.target.value))} className="h-5 w-16 text-[10px] text-center border rounded" />
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Input type="number" value={item.quantidade || 1} onChange={(e) => updateBlockData(block.id, `itensProduto.${i}.quantidade`, Number(e.target.value))} className="h-5 w-10 text-[10px] text-center border rounded" />
                            </td>
                            <td className="p-2 text-center font-medium text-blue-600">R$ {((item.preco || 0) * (item.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <p className="font-bold text-[10px]">TOTAIS</p>
                      {(() => {
                        const subtotal = (d.itensProduto || []).reduce((acc: number, item: any) => acc + ((item.preco || 0) * (item.quantidade || 1)), 0);
                        const frete = d.frete || 0;
                        const impostos = d.impostos || 0;
                        const desconto = d.descontoProduto || 0;
                        return (
                          <>
                            <div className="flex justify-between text-[10px]"><span>Subtotal</span><span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-[10px]"><span>Frete</span><span>R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-[10px]"><span>Impostos</span><span>R$ {impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-[10px] text-destructive"><span>Desconto</span><span>- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <Separator />
                            <div className="flex justify-between text-[10px] font-bold"><span>Total</span><span>R$ {(subtotal + frete + impostos - desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 space-y-1">
                      <p className="font-bold text-[10px]">ENTREGA</p>
                      <div className="text-[9px] space-y-1">
                        <div><span className="font-medium">Prazo:</span> <Input value={d.entrega?.prazo || ''} onChange={(e) => updateBlockData(block.id, 'entrega.prazo', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                        <div><span className="font-medium">Endereço:</span> <Input value={d.entrega?.endereco || ''} onChange={(e) => updateBlockData(block.id, 'entrega.endereco', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                        <div><span className="font-medium">Rastreamento:</span> <Input value={d.entrega?.rastreamento || ''} onChange={(e) => updateBlockData(block.id, 'entrega.rastreamento', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Formato: Serviço */}
            {formato === 'servico' && (
              <div className="grid grid-cols-[1fr_250px] gap-3">
                <div className="space-y-2">
                  <Card>
                    <CardContent className="p-3">
                      <p className="font-bold text-[10px] mb-2">ESCOPO E ETAPAS</p>
                      <div className="text-[10px] space-y-1 mb-3">
                        <div><span className="font-medium">Objetivo:</span> <Input value={d.objetivo || ''} onChange={(e) => updateBlockData(block.id, 'objetivo', e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0" /></div>
                        <div><span className="font-medium">Premissas:</span> <Input value={d.premissas || ''} onChange={(e) => updateBlockData(block.id, 'premissas', e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0" /></div>
                      </div>
                      <div className="border rounded overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Etapa</th>
                              <th className="p-2 text-center">Horas</th>
                              <th className="p-2 text-center">Valor/h</th>
                              <th className="p-2 text-center">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(d.etapas || []).map((etapa: any, i: number) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="border rounded p-1 flex-1">
                                      <Input value={etapa.nome || ''} onChange={(e) => updateBlockData(block.id, `etapas.${i}.nome`, e.target.value)} className="h-5 text-[10px] border-0 bg-transparent p-0" />
                                    </div>
                                    <Badge variant="outline" className="text-[9px]">{etapa.marco}</Badge>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <Input type="number" value={etapa.horas || 0} onChange={(e) => updateBlockData(block.id, `etapas.${i}.horas`, Number(e.target.value))} className="h-5 w-12 text-[10px] text-center border rounded" /> h
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>R$</span>
                                    <Input type="number" value={etapa.valorHora || 0} onChange={(e) => updateBlockData(block.id, `etapas.${i}.valorHora`, Number(e.target.value))} className="h-5 w-16 text-[10px] text-center border rounded" />
                                  </div>
                                </td>
                                <td className="p-2 text-center font-medium text-blue-600">R$ {((etapa.horas || 0) * (etapa.valorHora || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-3">
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <p className="font-bold text-[10px]">FECHAMENTO</p>
                      {(() => {
                        const totalHoras = (d.etapas || []).reduce((acc: number, e: any) => acc + (e.horas || 0), 0);
                        const subtotal = (d.etapas || []).reduce((acc: number, e: any) => acc + ((e.horas || 0) * (e.valorHora || 0)), 0);
                        const desconto = d.descontoServico || 0;
                        return (
                          <>
                            <div className="flex justify-between text-[10px]"><span>Total de horas</span><span>{totalHoras} h</span></div>
                            <div className="flex justify-between text-[10px]"><span>Subtotal</span><span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-[10px] text-destructive"><span>Desconto</span><span>- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <Separator />
                            <div className="flex justify-between text-[10px] font-bold"><span>Total do projeto</span><span>R$ {(subtotal - desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 space-y-1">
                      <p className="font-bold text-[10px]">CONDIÇÕES</p>
                      <div className="text-[9px] space-y-1">
                        <div><span className="font-medium">Prazo:</span> <Input value={d.condicoesServico?.prazo || ''} onChange={(e) => updateBlockData(block.id, 'condicoesServico.prazo', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                        <div><span className="font-medium">Pagamento:</span> <Input value={d.condicoesServico?.pagamento || ''} onChange={(e) => updateBlockData(block.id, 'condicoesServico.pagamento', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                        <div><span className="font-medium">Validade:</span> <Input value={d.condicoesServico?.validade || ''} onChange={(e) => updateBlockData(block.id, 'condicoesServico.validade', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Formato: Personalizado */}
            {formato === 'personalizado' && (
              <div className="grid grid-cols-[1fr_280px] gap-3">
                <div className="space-y-2">
                  <p className="font-bold text-[10px]">BLOCOS DO ORÇAMENTO</p>
                  {(d.blocosOrcamento || []).map((bloco: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <Input value={bloco.titulo || ''} onChange={(e) => updateBlockData(block.id, `blocosOrcamento.${i}.titulo`, e.target.value)} className="font-bold text-[10px] border-0 bg-transparent p-0 mb-1" />
                        <Textarea value={bloco.texto || ''} onChange={(e) => updateBlockData(block.id, `blocosOrcamento.${i}.texto`, e.target.value)} className="text-[10px] text-muted-foreground border-0 bg-transparent p-0 resize-none" rows={3} />
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-[9px] text-muted-foreground">Dica: este modelo funciona bem quando você precisa "costurar" vários blocos no mesmo orçamento.</p>
                </div>
                
                <div className="space-y-3">
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <p className="font-bold text-[10px]">TOTAIS (EXEMPLO HÍBRIDO)</p>
                      {(d.totaisPersonalizado || []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-[10px]">
                          <Input value={item.label || ''} onChange={(e) => updateBlockData(block.id, `totaisPersonalizado.${i}.label`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" />
                          <span className={item.valor < 0 ? 'text-destructive' : ''}>
                            {item.valor < 0 ? '- ' : ''}R$ {Math.abs(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {item.sufixo && <span className="text-muted-foreground"> {item.sufixo}</span>}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>Total inicial</span>
                        <span>R$ {(d.totaisPersonalizado || []).reduce((acc: number, item: any) => acc + (item.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 space-y-1">
                      <p className="font-bold text-[10px]">ASSINATURA / ACEITE</p>
                      <div className="text-[9px] space-y-1">
                        <div><span className="font-medium">Cliente:</span> <Input value={d.assinatura?.cliente || ''} onChange={(e) => updateBlockData(block.id, 'assinatura.cliente', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto border-b" /></div>
                        <div><span className="font-medium">Data:</span> <Input value={d.assinatura?.data || ''} onChange={(e) => updateBlockData(block.id, 'assinatura.data', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto border-b" placeholder="__/__/____" /></div>
                        <div><span className="font-medium">Responsável:</span> <Input value={d.assinatura?.responsavel || ''} onChange={(e) => updateBlockData(block.id, 'assinatura.responsavel', e.target.value)} className="h-4 text-[9px] border-0 bg-transparent p-0 inline w-auto border-b" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'pagamento': return (<div className="space-y-2"><div className="flex justify-between items-center"><div className="flex items-center gap-2"><Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0" style={{ width: `${Math.max(120, (d.titulo?.length || 10) * 10)}px` }} /><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateBlockData(block.id, 'tituloWidth', Math.max(80, (d.tituloWidth || 200) - 20))} title="Diminuir moldura"><Minimize2 className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => updateBlockData(block.id, 'tituloWidth', Math.min(400, (d.tituloWidth || 200) + 20))} title="Aumentar moldura"><Maximize2 className="h-3 w-3" /></Button></div></div><Badge variant="outline" className="text-[10px]">Fechamento</Badge></div><div className="grid grid-cols-2 gap-2"><Card><CardContent className="p-2"><p className="text-[10px] font-bold mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" />Pagamento</p><ul className="space-y-1 text-[10px]">{(d.itens || []).map((item: string, i: number) => (<li key={i} className="flex gap-1">•<Input value={item} onChange={(e) => updateBlockData(block.id, `itens.${i}`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></li>))}</ul></CardContent></Card><Card><CardContent className="p-2"><p className="text-[10px] font-bold mb-1 flex items-center gap-1"><Award className="h-3 w-3" />Garantias</p><ul className="space-y-1 text-[10px]">{(d.garantias || []).map((item: string, i: number) => (<li key={i} className="flex gap-1"><span className="text-primary">✓</span><Input value={item} onChange={(e) => updateBlockData(block.id, `garantias.${i}`, e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 flex-1" /></li>))}</ul></CardContent></Card></div></div>);
      case 'cta': return (<div className="flex justify-between items-center gap-3 flex-wrap bg-gradient-to-r from-primary/5 to-secondary/5 p-3 rounded-lg"><div className="flex-1 space-y-1"><Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0" /><Textarea value={d.texto || ''} onChange={(e) => updateBlockData(block.id, 'texto', e.target.value)} className="text-[10px] text-muted-foreground border-0 bg-transparent p-0 resize-none" rows={2} /></div><Button className="bg-primary hover:bg-primary/90 text-xs"><Input value={d.ctaText || ''} onChange={(e) => updateBlockData(block.id, 'ctaText', e.target.value)} className="h-4 text-xs border-0 bg-transparent p-0 text-white w-24 text-center" /><ArrowRight className="h-3 w-3 ml-1" /></Button></div>);
      case 'texto': return (<div className="space-y-1"><Input value={d.titulo || ''} onChange={(e) => updateBlockData(block.id, 'titulo', e.target.value)} className="font-bold text-sm border-0 bg-transparent p-0" /><Textarea value={d.texto || ''} onChange={(e) => updateBlockData(block.id, 'texto', e.target.value)} className="text-xs border-0 bg-transparent p-0 resize-none min-h-[40px]" /></div>);
      case 'imagem': return (<div className="space-y-2"><div className="flex justify-between"><span className="font-bold text-sm">Imagem</span><label className="cursor-pointer"><Button variant="outline" size="sm" className="text-[10px] h-6" asChild><span><ImageIcon className="h-3 w-3 mr-1" />Escolher</span></Button><input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => updateBlockData(block.id, 'src', reader.result); reader.readAsDataURL(file); } }} /></label></div><div className="border-2 border-dashed rounded-lg p-2 bg-muted/30">{d.src ? <img src={d.src} alt="Imagem" className="max-h-32 mx-auto rounded" /> : <div className="text-center text-muted-foreground text-[10px] py-6">Nenhuma imagem</div>}</div><Input value={d.legenda || ''} onChange={(e) => updateBlockData(block.id, 'legenda', e.target.value)} className="text-[10px] text-muted-foreground border-0 bg-transparent p-0" placeholder="Legenda" /></div>);
      case 'separador': return <Separator className="my-2" />;
      case 'rodape': return (
        <div 
          className="relative p-4 rounded-lg text-white min-h-[80px]" 
          style={{ backgroundColor: d.bgColor || '#1a1a2e' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {d.logoUrl ? (
                <img src={d.logoUrl} alt="Logo" className="h-10 w-10 object-contain bg-white rounded p-1" />
              ) : (
                <label className="cursor-pointer h-10 w-10 bg-white/20 rounded flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Upload className="h-4 w-4 text-white/70" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => updateBlockData(block.id, 'logoUrl', reader.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              )}
              <div className="space-y-0.5">
                <Input value={d.companyName || ''} onChange={(e) => updateBlockData(block.id, 'companyName', e.target.value)} className="h-5 text-xs font-bold border-0 bg-transparent p-0 text-white" placeholder="Nome da Empresa" />
                <Input value={d.cnpj || ''} onChange={(e) => updateBlockData(block.id, 'cnpj', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70" placeholder="CNPJ" />
              </div>
            </div>
            
            <div className="text-right space-y-0.5 text-[10px]">
              <div className="flex items-center gap-1 justify-end text-white/70">
                <span>📍</span>
                <Input value={d.endereco || ''} onChange={(e) => updateBlockData(block.id, 'endereco', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70 text-right w-40" placeholder="Endereço" />
              </div>
              <div className="flex items-center gap-1 justify-end text-white/70">
                <span>📞</span>
                <Input value={d.telefone || ''} onChange={(e) => updateBlockData(block.id, 'telefone', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70 text-right w-28" placeholder="Telefone" />
              </div>
              <div className="flex items-center gap-1 justify-end text-white/70">
                <span>✉️</span>
                <Input value={d.email || ''} onChange={(e) => updateBlockData(block.id, 'email', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70 text-right w-36" placeholder="E-mail" />
              </div>
              <div className="flex items-center gap-1 justify-end text-white/70">
                <span>🌐</span>
                <Input value={d.website || ''} onChange={(e) => updateBlockData(block.id, 'website', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/70 text-right w-32" placeholder="Website" />
              </div>
            </div>
          </div>
          
          {/* Redes Sociais */}
          <div className="flex items-center gap-3 mt-3 justify-center">
            <div className="flex items-center gap-1 text-white/60 text-[10px]">
              <span>📷</span>
              <Input value={d.redesSociais?.instagram || ''} onChange={(e) => updateBlockData(block.id, 'redesSociais.instagram', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/60 w-24" placeholder="@instagram" />
            </div>
            <div className="flex items-center gap-1 text-white/60 text-[10px]">
              <span>💼</span>
              <Input value={d.redesSociais?.linkedin || ''} onChange={(e) => updateBlockData(block.id, 'redesSociais.linkedin', e.target.value)} className="h-4 text-[10px] border-0 bg-transparent p-0 text-white/60 w-24" placeholder="LinkedIn" />
            </div>
          </div>
          
          {/* Texto Legal */}
          <div className="mt-3 pt-2 border-t border-white/20">
            <Textarea 
              value={d.textoLegal || ''} 
              onChange={(e) => updateBlockData(block.id, 'textoLegal', e.target.value)} 
              className="text-[9px] text-white/50 border-0 bg-transparent p-0 resize-none text-center" 
              placeholder="Texto legal / Observações"
              rows={2}
            />
          </div>
          
          {/* Seletor de cor de fundo */}
          <div className="absolute top-1 right-1">
            <label className="cursor-pointer">
              <div className="w-4 h-4 rounded border border-white/30" style={{ backgroundColor: d.bgColor || '#1a1a2e' }} />
              <input type="color" value={d.bgColor || '#1a1a2e'} onChange={(e) => updateBlockData(block.id, 'bgColor', e.target.value)} className="hidden" />
            </label>
          </div>
        </div>
      );
      default: return <div className="text-muted-foreground text-xs">Bloco desconhecido</div>;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-background max-h-[90vh]">
      <div className="sticky top-0 z-10 bg-card border-b px-3 py-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><ArrowLeft className="h-4 w-4" /></Button>
            <div><h1 className="text-base font-bold">Gerador de Proposta</h1><p className="text-[10px] text-muted-foreground">{clienteNome ? `Cliente: ${clienteNome}` : 'Modelos + editor por blocos'}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')} className="text-[10px] h-7"><FileText className="h-3 w-3 mr-1" />Propostas</Button>
            <Button variant={view === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setView('new')} className="text-[10px] h-7"><Sparkles className="h-3 w-3 mr-1" />Modelos</Button>
            <Button size="sm" onClick={() => createProposalFromTemplate(null)} className="text-[10px] h-7 bg-primary hover:bg-primary/90"><Plus className="h-3 w-3 mr-1" />Nova</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {view === 'list' && (<Card><CardHeader className="py-2"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="flex items-center gap-1 flex-1 max-w-sm"><Search className="h-3 w-3 text-muted-foreground" /><Input placeholder="Buscar..." value={searchProposals} onChange={(e) => setSearchProposals(e.target.value)} className="h-7 text-xs" /><Badge variant="secondary" className="text-[10px]">{filteredProposals.length}</Badge></div><Button variant="outline" size="sm" onClick={() => persist({ ...store, sortProposalsAsc: !store.sortProposalsAsc })} className="text-[10px] h-7">↕ Ordenar</Button></div></CardHeader><CardContent>{store.proposals.length === 0 ? (<div className="text-center py-8"><FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" /><p className="font-bold text-sm">Nenhuma proposta</p><p className="text-[10px] text-muted-foreground mb-3">Crie propostas rapidamente</p><Button onClick={() => setView('new')} className="bg-primary hover:bg-primary/90 text-xs">Iniciar</Button></div>) : (<div className="border rounded overflow-hidden"><table className="w-full text-xs"><thead className="bg-muted"><tr><th className="p-2 text-left text-[10px] font-medium">Título</th><th className="p-2 text-left text-[10px] font-medium">Criada</th><th className="p-2 text-left text-[10px] font-medium">Atualizada</th><th className="p-2 text-right text-[10px] font-medium">Ações</th></tr></thead><tbody>{filteredProposals.map((p: Proposta) => (<tr key={p.id} className="border-t hover:bg-muted/50"><td className="p-2"><button onClick={() => openProposalEditor(p.id)} className="flex items-center gap-1 text-purple-600 font-medium hover:underline text-xs"><FileText className="h-3 w-3" />{p.title}</button></td><td className="p-2 text-muted-foreground text-[10px]">{p.createdBy}</td><td className="p-2 text-muted-foreground text-[10px]">{fmtDate(p.updatedAt)}</td><td className="p-2 text-right"><div className="flex items-center justify-end gap-1"><Button variant="outline" size="icon" className="h-6 w-6" onClick={() => { setModalContext({ kind: 'proposal', id: p.id }); setModalOpen(true); }}><MoreHorizontal className="h-3 w-3" /></Button></div></td></tr>))}</tbody></table></div>)}</CardContent></Card>)}

        {view === 'new' && (<Card><CardHeader className="py-2"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="flex items-center gap-1 flex-1 max-w-sm"><Search className="h-3 w-3 text-muted-foreground" /><Input placeholder="Buscar modelo..." value={searchTemplates} onChange={(e) => setSearchTemplates(e.target.value)} className="h-7 text-xs" /><Badge variant="secondary" className="text-[10px]">{filteredTemplates.length}</Badge></div><Button variant="outline" size="sm" onClick={() => persist({ ...store, sortTemplatesAsc: !store.sortTemplatesAsc })} className="text-[10px] h-7">↕ Ordenar</Button></div></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{filteredTemplates.map((t: Proposta) => (<Card key={t.id} className="cursor-pointer hover:border-primary" onClick={() => createProposalFromTemplate(t.id)}><CardContent className="p-2"><div className="flex justify-between items-start gap-1"><div><p className="font-bold text-xs">{t.title}</p><p className="text-[10px] text-muted-foreground">{fmtDate(t.updatedAt)}</p></div><Button variant="outline" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setModalContext({ kind: 'template', id: t.id }); setModalOpen(true); }}><MoreHorizontal className="h-3 w-3" /></Button></div><Badge variant="outline" className="mt-1 text-[9px]">Usar modelo</Badge></CardContent></Card>))}</div></CardContent></Card>)}

        {view === 'editor' && editingDoc && (<div className="grid grid-cols-[200px_1fr] gap-2 h-[calc(100vh-160px)]">
          <Card className="overflow-auto"><CardHeader className="py-1 sticky top-0 bg-card z-10"><CardTitle className="text-[10px] text-muted-foreground uppercase">Blocos</CardTitle></CardHeader><CardContent className="p-1 space-y-1">
            {/* Bloco de Cabeçalho */}
            <Button variant="outline" className="w-full justify-between text-[10px] h-7 border-primary/30 bg-primary/5 hover:bg-primary/10" onClick={() => addBlock('cabecalho')}>
              <span className="flex items-center gap-1"><PanelTop className="h-3 w-3" />Cabeçalho</span>
              <Badge className="text-[9px] bg-primary/20 text-primary">Header</Badge>
            </Button>
            <Separator className="my-1" />
            {/* Blocos de conteúdo */}
            {[{ type: 'hero' as ModoElaboracao, label: 'Hero', tag: 'Topo', icon: Sparkles }, { type: 'dores_solucoes' as ModoElaboracao, label: 'Dores & Soluções', tag: 'Venda', icon: Target }, { type: 'diferenciais' as ModoElaboracao, label: 'Diferenciais', tag: 'Confiança', icon: Award }, { type: 'comparativo' as ModoElaboracao, label: 'Comparativo', tag: 'Decisão', icon: BarChart3 }, { type: 'precos' as ModoElaboracao, label: 'Preços', tag: 'Oferta', icon: DollarSign }, { type: 'pagamento' as ModoElaboracao, label: 'Pagamento', tag: 'Fechamento', icon: CreditCard }, { type: 'cta' as ModoElaboracao, label: 'CTA', tag: 'Conversão', icon: ArrowRight }].map(({ type, label, tag, icon: Icon }) => (<Button key={type} variant="outline" className="w-full justify-between text-[10px] h-7" onClick={() => addBlock(type)}><span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span><Badge variant="secondary" className="text-[9px]">{tag}</Badge></Button>))}
            <Separator className="my-1" />
            {/* Blocos auxiliares */}
            {[{ type: 'texto' as ModoElaboracao, label: 'Texto', icon: Type }, { type: 'imagem' as ModoElaboracao, label: 'Imagem', icon: ImageIcon }, { type: 'tabela' as ModoElaboracao, label: 'Tabela', icon: Table }, { type: 'separador' as ModoElaboracao, label: 'Separador', icon: Columns }].map(({ type, label, icon: Icon }) => (<Button key={type} variant="outline" className="w-full justify-start text-[10px] h-7" onClick={() => addBlock(type)}><Icon className="h-3 w-3 mr-1" />{label}</Button>))}
            <Separator className="my-1" />
            {/* Bloco de Rodapé */}
            <Button variant="outline" className="w-full justify-between text-[10px] h-7 border-primary/30 bg-primary/5 hover:bg-primary/10" onClick={() => addBlock('rodape')}>
              <span className="flex items-center gap-1"><PanelTop className="h-3 w-3 rotate-180" />Rodapé</span>
              <Badge className="text-[9px] bg-primary/20 text-primary">Footer</Badge>
            </Button>
            <Separator className="my-1" />
            <Button className="w-full bg-primary hover:bg-primary/90 text-[10px] h-7" onClick={handleSalvarProposta}>💾 Salvar</Button>
            
            {/* Checkbox de Aprovação do Orçamento - aparece após salvar */}
            {propostaSalva && cardId && (
              <div className="mt-2 p-2 border rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="aprovar-orcamento" 
                    checked={orcamentoAprovado} 
                    onCheckedChange={(checked) => handleAprovarOrcamento(!!checked)} 
                  />
                  <label htmlFor="aprovar-orcamento" className="text-[10px] font-medium cursor-pointer">
                    Aprovar orçamento
                  </label>
                </div>
                
                {/* Alerta de valor divergente */}
                {showValorDivergente && (
                  <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded text-[9px] text-warning">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Valores divergentes!</p>
                      <p>Orçamento: R$ {calcularValorOrcamento().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p>Valor do Card: R$ {(valorCard || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Button variant="outline" className="w-full text-[10px] h-7" onClick={saveAsTemplate}>📌 Salvar como modelo</Button>
            <Button variant="outline" className="w-full text-[10px] h-7" onClick={() => setView(editingKind === 'template' ? 'new' : 'list')}>← Voltar</Button></CardContent></Card>
          <Card className="overflow-hidden flex flex-col">
            {/* Header do Editor */}
            <div className="flex justify-between items-center gap-2 p-2 border-b bg-gradient-to-r from-white to-slate-50 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <Input value={editingDoc.title} onChange={(e) => updateDocTitle(e.target.value)} className="h-7 text-xs font-bold min-w-[200px]" />
                <Badge variant="secondary" className="text-[10px]">{editingKind === 'proposal' ? 'Proposta' : 'Modelo'}</Badge>
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[9px]">A4 (210×297mm)</Badge>
                <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-3 w-3 mr-1" />Visualizar
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] h-7 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700" onClick={() => generateWebProposalLink()}>
                  <Link className="h-3 w-3 mr-1" />Proposta Web
                </Button>
                <Button variant="default" size="sm" className="text-[10px] h-7 bg-primary hover:bg-primary/90" onClick={() => { setPreviewOpen(true); setTimeout(generatePDF, 500); }} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                  {generatingPdf ? 'Gerando...' : 'Baixar PDF'}
                </Button>
              </div>
            </div>
            
            {/* Área de Edição com padrão A4 */}
            <div className="flex-1 overflow-auto p-4 bg-muted/30">
              <div 
                className="mx-auto bg-white shadow-lg"
                style={{ 
                  width: `${A4_WIDTH}px`, 
                  minHeight: `${A4_HEIGHT}px`,
                  padding: '40px',
                  boxSizing: 'border-box'
                }}
              >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={editingDoc.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-wrap gap-2">
                      {editingDoc.blocks.map((block: Block, idx: number) => (
                        <SortableBlock 
                          key={block.id} 
                          block={block} 
                          idx={idx}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onMoveUp={() => moveBlock(block.id, 'up')}
                          onMoveDown={() => moveBlock(block.id, 'down')}
                          onDuplicate={() => duplicateBlock(block.id)}
                          onDelete={() => deleteBlock(block.id)}
                          isFirst={idx === 0}
                          isLast={idx === editingDoc.blocks.length - 1}
                          getBlockStyles={getBlockStyles}
                          renderBlockContent={renderBlockContent}
                          onStyleChange={updateBlockStyle}
                          focusedFieldName={focusedBlockId === block.id ? focusedFieldName : null}
                          onFieldStyleChange={updateFieldStyle}
                          getFieldStyle={getFieldStyle}
                          onOpenGlobalStyles={() => setGlobalStylesOpen(true)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {editingDoc.blocks.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhum bloco adicionado</p>
                    <p className="text-xs">Clique nos blocos à esquerda para começar</p>
                  </div>
                )}
                
                {/* Botão de Propriedades - aparece quando um bloco está selecionado */}
                {selectedBlock && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs border-primary/30 bg-primary/5 hover:bg-primary/10"
                      onClick={() => setPropertiesOpen(true)}
                    >
                      <Settings2 className="h-3 w-3 mr-2" />
                      Propriedades do Bloco
                      <Badge variant="secondary" className="ml-2 text-[9px]">{blockTypeLabels[selectedBlock.type]}</Badge>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>)}
      </div>

      {/* Modal de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[900px] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-card">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualização da Proposta
              </DialogTitle>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={generatePDF}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[calc(95vh-80px)]">
            <div className="p-6 bg-slate-200">
              {editingDoc && (
                <div ref={previewRef} className="mx-auto">
                  {/* Renderiza páginas A4 com divisores */}
                  {(() => {
                    const pageHeight = A4_HEIGHT - 80; // Altura útil da página (menos padding)
                    const blocks = editingDoc.blocks;
                    const pages: Block[][] = [];
                    let currentPage: Block[] = [];
                    let currentHeight = 0;
                    const estimatedBlockHeight = 120; // Altura média estimada por bloco
                    
                    blocks.forEach((block: Block) => {
                      const blockHeight = block.style.minHeight || estimatedBlockHeight;
                      if (currentHeight + blockHeight > pageHeight && currentPage.length > 0) {
                        pages.push(currentPage);
                        currentPage = [block];
                        currentHeight = blockHeight;
                      } else {
                        currentPage.push(block);
                        currentHeight += blockHeight;
                      }
                    });
                    if (currentPage.length > 0) pages.push(currentPage);
                    if (pages.length === 0) pages.push([]);
                    
                    return pages.map((pageBlocks, pageIndex) => (
                      <div key={pageIndex} className="mb-4">
                        {/* Indicador de página */}
                        <div className="flex items-center justify-center mb-2">
                          <div className="flex items-center gap-2 px-4 py-1 bg-slate-600 text-white rounded-full text-xs font-medium">
                            <FileText className="h-3 w-3" />
                            Página {pageIndex + 1} de {pages.length}
                          </div>
                        </div>
                        
                        {/* Página A4 */}
                        <div 
                          className="bg-white shadow-xl relative"
                          style={{ 
                            width: `${A4_WIDTH}px`, 
                            minHeight: `${A4_HEIGHT}px`,
                            padding: '40px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Marca d'água de página */}
                          <div className="absolute top-2 right-2 text-[10px] text-slate-300 font-medium">
                            {pageIndex + 1}/{pages.length}
                          </div>
                          
                          {/* Conteúdo da página */}
                          <div className="space-y-2">
                            {pageBlocks.map((block: Block) => (
                              <div 
                                key={block.id} 
                                style={getBlockStyles(block.style)}
                                className="break-inside-avoid"
                              >
                                {renderBlockContent(block)}
                              </div>
                            ))}
                          </div>
                          
                          {pageBlocks.length === 0 && pageIndex === 0 && (
                            <div className="text-center py-16 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                              <p className="text-sm font-medium">Nenhum bloco na proposta</p>
                              <p className="text-xs">Adicione blocos para visualizar o conteúdo</p>
                            </div>
                          )}
                          
                          {/* Linha de corte entre páginas */}
                          {pageIndex < pages.length - 1 && (
                            <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-red-300" />
                          )}
                        </div>
                        
                        {/* Divisor visual entre páginas */}
                        {pageIndex < pages.length - 1 && (
                          <div className="flex items-center justify-center py-3">
                            <div className="flex-1 border-t border-dashed border-slate-400" />
                            <span className="px-3 text-[10px] text-slate-500 font-medium bg-slate-200">
                              ✂️ Quebra de página
                            </span>
                            <div className="flex-1 border-t border-dashed border-slate-400" />
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Estilos Globais */}
      <Dialog open={globalStylesOpen} onOpenChange={setGlobalStylesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Estilos Globais de Texto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Configure os estilos padrão para títulos, subtítulos e conteúdo. 
              Alterações aqui afetam todos os elementos do mesmo tipo.
            </p>
            
            {/* Estilo de Títulos */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label className="text-sm font-bold">Títulos</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant={globalStyles.titulo.fontBold ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('titulo', 'fontBold', !globalStyles.titulo.fontBold)}
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button 
                  variant={globalStyles.titulo.fontItalic ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('titulo', 'fontItalic', !globalStyles.titulo.fontItalic)}
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px]">Tamanho:</Label>
                  <Input 
                    type="number" 
                    min={10} 
                    max={36} 
                    value={globalStyles.titulo.fontSize || 18} 
                    onChange={(e) => updateGlobalStyle('titulo', 'fontSize', Number(e.target.value))}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Estilo de Subtítulos */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label className="text-sm font-bold">Subtítulos</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant={globalStyles.subtitulo.fontBold ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('subtitulo', 'fontBold', !globalStyles.subtitulo.fontBold)}
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button 
                  variant={globalStyles.subtitulo.fontItalic ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('subtitulo', 'fontItalic', !globalStyles.subtitulo.fontItalic)}
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px]">Tamanho:</Label>
                  <Input 
                    type="number" 
                    min={10} 
                    max={24} 
                    value={globalStyles.subtitulo.fontSize || 14} 
                    onChange={(e) => updateGlobalStyle('subtitulo', 'fontSize', Number(e.target.value))}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Estilo de Conteúdo */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label className="text-sm font-bold">Conteúdo</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant={globalStyles.conteudo.fontBold ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('conteudo', 'fontBold', !globalStyles.conteudo.fontBold)}
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button 
                  variant={globalStyles.conteudo.fontItalic ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('conteudo', 'fontItalic', !globalStyles.conteudo.fontItalic)}
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px]">Tamanho:</Label>
                  <Input 
                    type="number" 
                    min={8} 
                    max={18} 
                    value={globalStyles.conteudo.fontSize || 12} 
                    onChange={(e) => updateGlobalStyle('conteudo', 'fontSize', Number(e.target.value))}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Estilo de Labels */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label className="text-sm font-bold">Labels/Etiquetas</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant={globalStyles.label.fontBold ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('label', 'fontBold', !globalStyles.label.fontBold)}
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button 
                  variant={globalStyles.label.fontItalic ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => updateGlobalStyle('label', 'fontItalic', !globalStyles.label.fontItalic)}
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <div className="flex items-center gap-1">
                  <Label className="text-[10px]">Tamanho:</Label>
                  <Input 
                    type="number" 
                    min={8} 
                    max={14} 
                    value={globalStyles.label.fontSize || 10} 
                    onChange={(e) => updateGlobalStyle('label', 'fontSize', Number(e.target.value))}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={() => setGlobalStylesOpen(false)}
            >
              <Check className="h-4 w-4 mr-2" />
              Aplicar Estilos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Propriedades do Bloco */}
      <Dialog open={propertiesOpen} onOpenChange={setPropertiesOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Propriedades do Bloco
              {selectedBlock && <Badge variant="outline" className="text-[10px] ml-2">{blockTypeLabels[selectedBlock.type]}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedBlock ? (
            <div className="space-y-4">
              {/* Layout do Bloco */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-xs font-medium flex items-center gap-1"><LayoutGrid className="h-3 w-3" />Layout</Label>
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Largura do bloco</Label>
                  <Select value={selectedBlock.style.width || 'full'} onValueChange={(v) => updateBlockStyle(selectedBlock.id, 'width', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">100% (Largura total)</SelectItem>
                      <SelectItem value="two-thirds">66% (Dois terços)</SelectItem>
                      <SelectItem value="half">50% (Metade)</SelectItem>
                      <SelectItem value="third">33% (Um terço)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Altura mín. (px)</Label>
                    <Input type="number" min={0} value={selectedBlock.style.minHeight || 0} onChange={(e) => updateBlockStyle(selectedBlock.id, 'minHeight', Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Margem inf. (px)</Label>
                    <Input type="number" min={0} value={selectedBlock.style.marginBottom || 8} onChange={(e) => updateBlockStyle(selectedBlock.id, 'marginBottom', Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
              </div>
              
              {/* Cores e Fundo */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-xs font-medium flex items-center gap-1"><Palette className="h-3 w-3" />Cores e Fundo</Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Cor de destaque</Label>
                  <Input type="color" value={selectedBlock.style.accent || '#4f46e5'} onChange={(e) => updateBlockStyle(selectedBlock.id, 'accent', e.target.value)} className="h-7 w-full cursor-pointer" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Tipo de fundo</Label>
                    <Select value={selectedBlock.style.bgMode || 'white'} onValueChange={(v) => updateBlockStyle(selectedBlock.id, 'bgMode', v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">Branco</SelectItem>
                        <SelectItem value="soft">Suave</SelectItem>
                        <SelectItem value="brand">Destaque</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedBlock.style.bgMode === 'custom' && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Cor do fundo</Label>
                      <Input type="color" value={selectedBlock.style.bgColor || '#ffffff'} onChange={(e) => updateBlockStyle(selectedBlock.id, 'bgColor', e.target.value)} className="h-7 w-full cursor-pointer" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Imagem de fundo</Label>
                  <div className="flex gap-1">
                    <label className="flex-1 cursor-pointer">
                      <Button variant="outline" size="sm" className="w-full text-[10px] h-7" asChild>
                        <span><Upload className="h-3 w-3 mr-1" />{selectedBlock.style.bgImage ? 'Trocar imagem' : 'Carregar imagem'}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => updateBlockStyle(selectedBlock.id, 'bgImage', reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    {selectedBlock.style.bgImage && (
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => updateBlockStyle(selectedBlock.id, 'bgImage', '')}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Espaçamento e Borda */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-xs font-medium flex items-center gap-1"><Settings2 className="h-3 w-3" />Espaçamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Padding (px)</Label>
                    <Input type="number" min={0} value={selectedBlock.style.pad || 14} onChange={(e) => updateBlockStyle(selectedBlock.id, 'pad', Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Raio (px)</Label>
                    <Input type="number" min={0} value={selectedBlock.style.radius || 14} onChange={(e) => updateBlockStyle(selectedBlock.id, 'radius', Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Borda</Label>
                  <Select value={selectedBlock.style.borderMode || 'none'} onValueChange={(v) => updateBlockStyle(selectedBlock.id, 'borderMode', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem borda</SelectItem>
                      <SelectItem value="line">Linha cinza</SelectItem>
                      <SelectItem value="brand">Cor de destaque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Tipografia */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="text-xs font-medium flex items-center gap-1"><Type className="h-3 w-3" />Tipografia</Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Tamanho da fonte (px)</Label>
                  <Input type="number" min={8} max={72} value={selectedBlock.style.fontSize || 14} onChange={(e) => updateBlockStyle(selectedBlock.id, 'fontSize', Number(e.target.value))} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Formatação</Label>
                  <div className="flex gap-1">
                    <Button variant={selectedBlock.style.fontBold ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'fontBold', !selectedBlock.style.fontBold)} title="Negrito">
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button variant={selectedBlock.style.fontItalic ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'fontItalic', !selectedBlock.style.fontItalic)} title="Itálico">
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button variant={selectedBlock.style.fontUnderline ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'fontUnderline', !selectedBlock.style.fontUnderline)} title="Sublinhado">
                      <Underline className="h-3 w-3" />
                    </Button>
                    <Button variant={selectedBlock.style.fontStrikethrough ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'fontStrikethrough', !selectedBlock.style.fontStrikethrough)} title="Tachado">
                      <Strikethrough className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Alinhamento</Label>
                  <div className="flex gap-1">
                    <Button variant={selectedBlock.style.textAlign === 'left' || !selectedBlock.style.textAlign ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'textAlign', 'left')} title="Esquerda">
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button variant={selectedBlock.style.textAlign === 'center' ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'textAlign', 'center')} title="Centro">
                      <AlignCenter className="h-3 w-3" />
                    </Button>
                    <Button variant={selectedBlock.style.textAlign === 'right' ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0" onClick={() => updateBlockStyle(selectedBlock.id, 'textAlign', 'right')} title="Direita">
                      <AlignRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Observações */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Observações do bloco</Label>
                <Textarea value={selectedBlock.style.note || ''} onChange={(e) => updateBlockStyle(selectedBlock.id, 'note', e.target.value)} placeholder="Ex.: Ajustar texto para o setor do cliente, incluir prazo X, etc." className="text-xs min-h-[60px] resize-none" />
              </div>
              
              {/* Ações */}
              <div className="flex gap-2">
                <Button className="flex-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => { toast({ title: 'Propriedades salvas', description: 'As alterações foram aplicadas ao bloco.' }); setPropertiesOpen(false); }}>
                  <Check className="h-3 w-3 mr-2" />
                  Salvar
                </Button>
                <Button variant="destructive" className="text-xs" onClick={() => { deleteBlock(selectedBlock.id); setPropertiesOpen(false); }}>
                  <Trash2 className="h-3 w-3 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs">Nenhum bloco selecionado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Proposta Web */}
      <Dialog open={webProposalOpen} onOpenChange={setWebProposalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-600" />
              Proposta Web
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Link gerado com sucesso!</strong>
              </p>
              <p className="text-xs text-blue-600 mb-3">
                Compartilhe este link com seu cliente para que ele possa visualizar, aprovar ou reprovar a proposta diretamente no navegador.
              </p>
              <div className="flex gap-2">
                <Input 
                  value={webProposalLink || ''} 
                  readOnly 
                  className="text-xs bg-card"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs shrink-0"
                  onClick={() => webProposalLink && copyToClipboard(webProposalLink)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">O cliente poderá:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Visualizar a proposta completa</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Aprovar ou reprovar a proposta</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Baixar em PDF</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Assistir vídeos incorporados (se houver)</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Deixar comentários</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="flex gap-2">
              <Button 
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={openWebProposal}
              >
                <Eye className="h-3 w-3 mr-2" />
                Abrir no Navegador
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-xs"
                onClick={() => {
                  if (webProposalLink) {
                    const subject = encodeURIComponent(`Proposta: ${editingDoc?.title || 'Nova Proposta'}`);
                    const body = encodeURIComponent(`Olá,\n\nSegue o link para visualizar a proposta:\n\n${webProposalLink}\n\nAtenciosamente.`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  }
                }}
              >
                <ArrowRight className="h-3 w-3 mr-2" />
                Enviar por E-mail
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}><DialogContent className="max-w-xs"><DialogHeader><DialogTitle className="text-sm">Ações</DialogTitle></DialogHeader><div className="flex flex-col gap-2">{modalContext && (<><Button variant="outline" className="justify-start text-xs" onClick={() => duplicateDocument(modalContext.kind, modalContext.id)}><Copy className="h-3 w-3 mr-2" />Duplicar</Button><Button variant="outline" className="justify-start text-xs text-destructive hover:bg-red-50" onClick={() => { if (confirm('Excluir?')) deleteDocument(modalContext.kind, modalContext.id); }}><Trash2 className="h-3 w-3 mr-2" />Excluir</Button></>)}</div></DialogContent></Dialog>
    </div>
  );
}
