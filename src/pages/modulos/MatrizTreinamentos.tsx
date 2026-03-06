import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  MoreHorizontal, 
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  Grid3X3,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// Interface para Matriz de Treinamento
interface MatrizTreinamento {
  id: string;
  empresa_id: string;
  norma: string;
  treinamento_id: string;
  treinamento_nome: string;
  agente_nocivo: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Interface para Treinamento do Catálogo
interface TipoTreinamento {
  id: string;
  empresa_id: string;
  norma: string;
  nome: string;
  ch_formacao: number;
  ch_reciclagem: number;
  validade: string;
}

// Interface para NR
interface NormaRegulamentadora {
  id: string;
  nr: string;
  descricao: string | null;
}

// Templates CSV - formato: 3 colunas separadas por pipe
const TEMPLATE_VAZIO = `Norma|Treinamento|Agente nocivo / Perigo relacionado`;

const TEMPLATE_PADRAO = `Norma|Treinamento|Agente nocivo / Perigo relacionado
5|CIPA 1|Riscos gerais de acidentes, ergonomia, riscos físicos, químicos e biológicos
5|CIPA 2|Riscos gerais de acidentes, ergonomia, riscos físicos, químicos e biológicos
5|CIPA 3|Riscos gerais de acidentes, ergonomia, riscos físicos, químicos e biológicos
5|CIPA 4|Riscos gerais de acidentes, ergonomia, riscos físicos, químicos e biológicos
6|Utilização e Conservação de EPI|Exposição a agentes físicos, químicos, biológicos e mecânicos
10|Básico|Risco elétrico, choque elétrico, queimaduras
10|SEP|Alta tensão, arco elétrico, choque elétrico
10|Áreas Classificadas|Atmosferas explosivas, inflamáveis
11|Empilhadeira|Atropelamento, tombamento, choque, esmagamento
11|Escavaderia Hidráulica|Tombamento, soterramento, colisão
11|Guindaste|Queda de carga, tombamento, esmagamento
11|Guindauto|Queda de carga, tombamento, esmagamento
11|Hilo Fixo|Queda de materiais, risco mecânico
11|Pá Carregadeira|Atropelamento, tombamento
11|Ponte Rolante|Queda de carga, aprisionamento, esmagamento
11|Ponte Rolante para chapas de rochas ornamentais|Queda de chapas, esmagamento
11|Retro Escavadeira|Soterramento, colisão, tombamento
11|Talha Elétrica|Queda de carga, ruptura de cabo
11|Transpaleteira|Atropelamento, esmagamento
11|Capacitação para movimentação armazenagem e manuseio de chapas de rochas ornamentais|Queda de chapas, esmagamento
12|Segurança no manuseio de ferramentas manuais|Cortes, perfurações, impacto
12|Segurança na Operação de Motosserra|Cortes graves, vibração, ruído
12|Segurança para operadores de máquinas injetoras|Abrandamento, esmagamento, queimaduras
12|Segurança na operação manutenção e inspeção de máquinas e equipamentos.|Riscos mecânicos, cortes, aprisionamento
12|PPRPS|Riscos de pressão, ruptura, explosão
13|Segurança na Operação de Caldeiras|Explosão, queimaduras térmicas
13|Segurança na Operação de Vasos sob Pressão|Explosão, ruptura estrutural
17|Operador de checkout|Ergonomia, riscos psicossociais
17|Transporte manual de cargas de acordo com a NR 31  - 31.10 - Ergonomia|Sobrecarga física, lesões musculoesqueléticas
17|Trabalho em teleatendimento/telemarketing|Riscos psicossociais, ergonomia
18|Montagem de Andaimes e Plataformas|Queda em altura, desabamento, aprisionamento
18|Básico em segurança do trabalho|Riscos gerais físicos, químicos e mecânicos
18|Operador de grua|Queda de carga, tombamento
18|Operador de guindaste|Queda de carga, tombamento
18|Operador de equipamentos de guindar|Queda de carga, esmagamento
18|Sinaleiro/amarrador de cargas|Queda de carga, esmagamento
18|Operador de elevador|Queda, aprisionamento
18|Instalação montagem desmontagem e manutenção de elevadores|Queda em altura, choque elétrico
18|Encarregado de ar comprimido|Explosão, ruptura de tubulações
18|Resgate e remoção em atividades no tubulão|Atmosfera confinada, soterramento
18|Serviços de impermeabilização|Inflamáveis, vapores tóxicos
18|Utilização de cadeira suspensa|Queda em altura
18|Atividade de escavação manual de tubulão|Soterramento, atmosfera tóxica
18|Treinamento admissional para construção civil|Riscos típicos da construção: quedas, choque elétrico, soterramento
18|PEMT ( PLATAFORMA ELEVATÓRIA MÓVEL DE TRABALHO)|Queda em altura, tombamento
20|Iniciação sobre Inflamáveis e Combustíveis|Inflamáveis, explosão
20|Básico|Inflamáveis, explosão
20|Intermediário|Inflamáveis, explosão
20|Avançado I|Inflamáveis, explosão
20|Avançado II|Inflamáveis, explosão
20|Específico|Inflamáveis, explosão
23|Brigada de Incêndio - Básico|Combate a incêndio, fumaça, calor
23|Brigada de Incêndio - Intermediário|Incêndios estruturais, calor radiante
23|Brigada de Incêndio - Avançado|Incêndios complexos, riscos químicos
23|Brigada Florestal|Incêndios florestais, calor extremo
26|Capacitação para trabalhadores envolvidos na utilização segura de produtos químicos|Agentes químicos, intoxicação, corrosão
31|CIPATR|Riscos rurais: máquinas, animais peçonhentos, agroquímicos
31|Bobcat|Atropelamento, tombamento
31|Caminhão Canavieiro|Atropelamento, tombamento
31|Colhedora de Cana|Cortes, atropelamento
31|Motoniveladora|Tombamento, colisão
31|Motocana|Cortes, vibração
31|Segurança na Operação de Motosserra|Cortes, vibração, ruído
31|Motopoda|Cortes, queda de galhos
31|Derriçadeira|Vibração, impacto
31|Roçadeira|Projeção de partículas, cortes
31|Transbordo|Atropelamento, esmagamento
31|Trator Agrícola|Tombamento, atropelamento
31|Trator de Puxe|Tombamento, atropelamento
31|Treminhão|Tombamento, colisão
31|Segurança na Agricultura|Agrotóxicos, animais peçonhentos, máquinas agrícolas
31|Segurança na Aplicação de Agrotóxicos |Exposição química, intoxicação
31|Segurança na Operação de Máquinas Agrícolas|Atropelamento, amputações
33|Trabalhadores e Vigias|Vigilância, riscos de violência, queda em nível
33|Supervisores|Riscos operacionais gerais
34|Treinamento admissional|Riscos gerais da operação
34|Treinamento para realizar testes de estanqueidade |Vazamentos, inflamáveis
34|Curso básico de Segurança para Trabalho à Quente|Calor, faíscas, incêndio
34|Atividade com Solda - Riscos e Formas de Prevenção|Faíscas, queimaduras, fumos metálicos
34|Atividade com maçarico - Riscos e Forma de Prevenção|Calor, fogo, explosão
34|Atividades com Máquinas Portáteis rotativas - Riscos e Forma de Prevenção|Projeção de partículas, cortes
34|Curso básico de Segurança para Trabalho à Quente|Calor, incêndio, explosão
34|Curso complementar para operadores de Equipamento de Guindar|Queda de carga, esmagamento
34|Curso básico de segurança em operações de Movimentação de Cargas|Esmagamento, queda de carga
34|Curso básico para Observador de Trabalho à Quente|Calor, incêndio
35|Trabalho em Altura|Queda em altura
35|Resgate em Altura|Queda, suspensão inerte`;

// Interface para erros de importação
interface ImportError {
  linha: number;
  nome: string;
  motivo: string;
}

interface ImportRecord {
  empresa_id: string;
  norma: string;
  treinamento_id: string;
  treinamento_nome: string;
  agente_nocivo: string;
  isUpdate?: boolean;
  existingId?: string;
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

export default function MatrizTreinamentos() {
  const { profile } = useAuth();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const [matriz, setMatriz] = useState<MatrizTreinamento[]>([]);
  const [treinamentos, setTreinamentos] = useState<TipoTreinamento[]>([]);
  const [normasCadastradas, setNormasCadastradas] = useState<NormaRegulamentadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNorma, setFilterNorma] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteOptionsDialogOpen, setDeleteOptionsDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [selectedMatriz, setSelectedMatriz] = useState<MatrizTreinamento | null>(null);
  const [matrizToDelete, setMatrizToDelete] = useState<MatrizTreinamento | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'selected' | 'all' | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Import dialogs
  const [importPreviewDialogOpen, setImportPreviewDialogOpen] = useState(false);
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    norma: '',
    treinamento_id: '',
    agente_nocivo: '',
  });

  useEffect(() => {
    if (profile?.empresa_id) {
      fetchMatriz();
      fetchTreinamentos();
      fetchNormas();
      logView('Treinamentos', 'Matriz de Treinamentos', 'Acessou a matriz de treinamentos');
    }
  }, [profile?.empresa_id]);

  const fetchMatriz = async () => {
    if (!profile?.empresa_id) return;
    
    try {
      const { data, error } = await supabase
        .from('matriz_treinamentos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('norma', { ascending: true });

      if (error) throw error;
      setMatriz(data || []);
    } catch (error) {
      console.error('Erro ao buscar matriz:', error);
      toast.error('Erro ao carregar matriz de treinamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchTreinamentos = async () => {
    if (!profile?.empresa_id) return;
    
    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, empresa_id, norma, nome, ch_formacao, ch_reciclagem, validade')
        .eq('empresa_id', profile.empresa_id)
        .order('norma', { ascending: true });

      if (error) throw error;
      setTreinamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
    }
  };

  const fetchNormas = async () => {
    if (!profile?.empresa_id) return;
    
    try {
      const { data, error } = await supabase
        .from('normas_regulamentadoras')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('nr', { ascending: true });

      if (error) throw error;
      setNormasCadastradas(data || []);
    } catch (error) {
      console.error('Erro ao buscar NRs:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      norma: '',
      treinamento_id: '',
      agente_nocivo: '',
    });
  };

  // Filtrar treinamentos pela NR selecionada
  const treinamentosFiltrados = formData.norma 
    ? treinamentos.filter(t => t.norma === formData.norma)
    : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;

    const treinamentoSelecionado = treinamentos.find(t => t.id === formData.treinamento_id);
    if (!treinamentoSelecionado) {
      toast.error('Selecione um treinamento válido');
      return;
    }

    // Verificar duplicata
    const duplicata = matriz.find(m => 
      m.treinamento_id === formData.treinamento_id
    );
    if (duplicata) {
      toast.error('Este treinamento já está cadastrado na matriz');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matriz_treinamentos')
        .insert({
          empresa_id: profile.empresa_id,
          norma: formData.norma,
          treinamento_id: formData.treinamento_id,
          treinamento_nome: treinamentoSelecionado.nome,
          agente_nocivo: formData.agente_nocivo || null,
        });

      if (error) throw error;

      toast.success('Matriz cadastrada com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      fetchMatriz();
    } catch (error) {
      console.error('Erro ao criar matriz:', error);
      toast.error('Erro ao cadastrar matriz');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item: MatrizTreinamento) => {
    setSelectedMatriz(item);
    setFormData({
      norma: item.norma,
      treinamento_id: item.treinamento_id,
      agente_nocivo: item.agente_nocivo || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatriz) return;

    const treinamentoSelecionado = treinamentos.find(t => t.id === formData.treinamento_id);
    if (!treinamentoSelecionado) {
      toast.error('Selecione um treinamento válido');
      return;
    }

    // Verificar duplicata (exceto o próprio registro)
    const duplicata = matriz.find(m => 
      m.treinamento_id === formData.treinamento_id && m.id !== selectedMatriz.id
    );
    if (duplicata) {
      toast.error('Este treinamento já está cadastrado na matriz');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matriz_treinamentos')
        .update({
          norma: formData.norma,
          treinamento_id: formData.treinamento_id,
          treinamento_nome: treinamentoSelecionado.nome,
          agente_nocivo: formData.agente_nocivo || null,
        })
        .eq('id', selectedMatriz.id);

      if (error) throw error;

      toast.success('Matriz atualizada com sucesso!');
      setEditDialogOpen(false);
      setSelectedMatriz(null);
      resetForm();
      fetchMatriz();
    } catch (error) {
      console.error('Erro ao atualizar matriz:', error);
      toast.error('Erro ao atualizar matriz');
    } finally {
      setSaving(false);
    }
  };

  // Delete functions
  const openDeleteDialog = (item: MatrizTreinamento) => {
    setMatrizToDelete(item);
    setDeleteOptionsDialogOpen(true);
  };

  const handleDeleteOption = (mode: 'single' | 'selected' | 'all') => {
    setDeleteMode(mode);
    setDeleteOptionsDialogOpen(false);
    setConfirmDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!profile?.empresa_id) return;
    
    setDeleting(true);
    try {
      let error;
      
      if (deleteMode === 'single' && matrizToDelete) {
        const result = await supabase
          .from('matriz_treinamentos')
          .delete()
          .eq('id', matrizToDelete.id);
        error = result.error;
      } else if (deleteMode === 'selected' && selectedItems.length > 0) {
        const result = await supabase
          .from('matriz_treinamentos')
          .delete()
          .in('id', selectedItems);
        error = result.error;
      } else if (deleteMode === 'all') {
        const result = await supabase
          .from('matriz_treinamentos')
          .delete()
          .eq('empresa_id', profile.empresa_id);
        error = result.error;
      }

      if (error) throw error;

      toast.success(
        deleteMode === 'single' ? 'Item excluído com sucesso!' :
        deleteMode === 'selected' ? `${selectedItems.length} itens excluídos com sucesso!` :
        'Todos os itens foram excluídos!'
      );
      
      setConfirmDeleteDialogOpen(false);
      setMatrizToDelete(null);
      setDeleteMode(null);
      setSelectedItems([]);
      setSelectionMode(false);
      fetchMatriz();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const getDeleteConfirmMessage = () => {
    if (deleteMode === 'single' && matrizToDelete) {
      return `Deseja excluir "${matrizToDelete.treinamento_nome}"?`;
    }
    if (deleteMode === 'selected') {
      return `Deseja excluir ${selectedItems.length} item(ns) selecionado(s)?`;
    }
    if (deleteMode === 'all') {
      return `Deseja excluir TODOS os ${matriz.length} itens da matriz?`;
    }
    return '';
  };

  // Selection functions
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredMatriz.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMatriz.map(m => m.id));
    }
  };

  // Export to CSV - formato simples: 3 colunas separadas por pipe
  const exportToCSV = () => {
    const headers = ['Norma', 'Treinamento', 'Agente nocivo / Perigo relacionado'];
    const rows = matriz.map(m => [
      m.norma,
      m.treinamento_nome,
      m.agente_nocivo || '',
    ]);
    
    const csvContent = [headers.join('|'), ...rows.map(r => r.join('|'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'matriz_treinamentos.csv';
    link.click();
    toast.success('Matriz exportada com sucesso!');
  };

  // Download template vazio
  const downloadTemplateVazio = () => {
    const blob = new Blob(['\ufeff' + TEMPLATE_VAZIO], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_matriz_vazio.csv';
    link.click();
    toast.success('Template vazio baixado!');
  };

  // Download template padrão
  const downloadTemplatePadrao = () => {
    const blob = new Blob(['\ufeff' + TEMPLATE_PADRAO], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_matriz_padrao.csv';
    link.click();
    toast.success('Template padrão baixado!');
  };

  // Parse CSV line using pipe delimiter
  const parseCSVLine = (line: string): string[] => {
    return line.split('|').map(part => part.trim());
  };

  // Import from CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.empresa_id) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Detectar se a primeira linha é cabeçalho
      const firstLine = lines[0]?.toLowerCase() || '';
      const isHeader = firstLine.includes('norma') || firstLine.includes('treinamento');
      const dataLines = isHeader ? lines.slice(1) : lines;
      
      if (dataLines.length === 0) {
        toast.error('O arquivo não contém dados para importar');
        setImporting(false);
        return;
      }

      // Maps for validation
      const existingNRs = new Set(normasCadastradas.map(nr => nr.nr));
      const treinamentosByNomeNorma = new Map<string, TipoTreinamento>();
      treinamentos.forEach(t => {
        // Chave composta: norma + nome do treinamento (lowercase)
        const key = `${t.norma}|${t.nome.toLowerCase().trim()}`;
        treinamentosByNomeNorma.set(key, t);
      });
      
      // Map para matriz existente por nome do treinamento + norma
      const existingMatrizByNomeNorma = new Map<string, MatrizTreinamento>();
      matriz.forEach(m => {
        const key = `${m.norma}|${m.treinamento_nome.toLowerCase().trim()}`;
        existingMatrizByNomeNorma.set(key, m);
      });

      const preview: ImportPreview = {
        validRecords: [],
        updateRecords: [],
        errors: []
      };

      // Set para rastrear duplicatas no batch
      const batchKeys = new Set<string>();

      dataLines.forEach((line, index) => {
        const parts = parseCSVLine(line);
        const lineNumber = isHeader ? index + 2 : index + 1;
        
        // Validar que temos pelo menos Norma e Treinamento
        if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
          preview.errors.push({
            linha: lineNumber,
            nome: parts[1]?.trim() || 'Desconhecido',
            motivo: 'Formato inválido - colunas insuficientes (necessário: Norma, Treinamento)'
          });
          return;
        }

        const norma = parts[0].trim();
        const treinamentoNome = parts[1].trim();
        const agenteNocivo = parts[2]?.trim() || '';

        // Validar que a norma é um número válido
        if (!/^\d+$/.test(norma)) {
          preview.errors.push({
            linha: lineNumber,
            nome: treinamentoNome,
            motivo: `Norma inválida: "${norma}" (deve ser um número)`
          });
          return;
        }

        // Verificar se NR existe - NÃO criar automaticamente
        if (!existingNRs.has(norma)) {
          preview.errors.push({
            linha: lineNumber,
            nome: treinamentoNome,
            motivo: `NR-${norma} não está cadastrada no sistema`
          });
          return;
        }

        // Chave única para este registro
        const recordKey = `${norma}|${treinamentoNome.toLowerCase()}`;

        // Verificar duplicata no batch
        if (batchKeys.has(recordKey)) {
          // Ignorar duplicatas silenciosamente
          return;
        }
        batchKeys.add(recordKey);

        // Verificar se o treinamento já existe no catálogo - NÃO criar automaticamente
        const treinamento = treinamentosByNomeNorma.get(recordKey);
        
        if (!treinamento) {
          preview.errors.push({
            linha: lineNumber,
            nome: treinamentoNome,
            motivo: `Treinamento não encontrado no catálogo para NR-${norma}`
          });
          return;
        }
        
        // Verificar se já existe na matriz
        const existingItem = existingMatrizByNomeNorma.get(recordKey);

        const record: ImportRecord = {
          empresa_id: profile.empresa_id,
          norma,
          treinamento_id: treinamento.id,
          treinamento_nome: treinamento.nome,
          agente_nocivo: agenteNocivo,
        };

        if (existingItem) {
          record.isUpdate = true;
          record.existingId = existingItem.id;
          preview.updateRecords.push(record);
        } else {
          preview.validRecords.push(record);
        }
      });

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

  // Execute import - só insere na matriz, NR e treinamento já devem existir
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
      // Processar inserções na matriz
      for (const r of importPreview.validRecords) {
        const { error } = await supabase
          .from('matriz_treinamentos')
          .upsert({
            empresa_id: r.empresa_id,
            norma: r.norma,
            treinamento_id: r.treinamento_id,
            treinamento_nome: r.treinamento_nome,
            agente_nocivo: r.agente_nocivo || null,
          }, {
            onConflict: 'empresa_id,treinamento_id'
          });

        if (error) {
          result.errors.push({
            linha: 0,
            nome: r.treinamento_nome,
            motivo: `Erro ao inserir: ${error.message}`
          });
        } else {
          result.inserted++;
        }
      }

      // Update existing records
      for (const record of importPreview.updateRecords) {
        if (!record.existingId) continue;

        const { error } = await supabase
          .from('matriz_treinamentos')
          .update({
            norma: record.norma,
            agente_nocivo: record.agente_nocivo || null,
          })
          .eq('id', record.existingId);

        if (error) {
          result.errors.push({
            linha: 0,
            nome: record.treinamento_nome,
            motivo: `Erro ao atualizar: ${error.message}`
          });
        } else {
          result.updated++;
        }
      }

      fetchMatriz();

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
    setImportPreview(null);
  };

  // Get unique normas for filter
  const normasUnicas = [...new Set(matriz.map(m => m.norma))].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const filteredMatriz = matriz
    .filter((m) => {
      const matchSearch = 
        m.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.norma.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.agente_nocivo || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterNorma === 'all') return matchSearch;
      return matchSearch && m.norma === filterNorma;
    })
    .sort((a, b) => {
      const numA = parseInt(a.norma);
      const numB = parseInt(b.norma);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.norma.localeCompare(b.norma);
    });

  // Badge para NR
  const getNRBadge = (norma: string) => {
    return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">{norma}</Badge>;
  };

  const renderFormFields = () => (
    <>
      {/* Norma Regulamentadora */}
      <div className="space-y-2">
        <Label>Norma regulamentadora *</Label>
        <Select
          value={formData.norma}
          onValueChange={(value) => setFormData(prev => ({ ...prev, norma: value, treinamento_id: '' }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma NR" />
          </SelectTrigger>
          <SelectContent>
            {normasCadastradas.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma NR cadastrada</div>
            ) : (
              [...normasCadastradas].sort((a, b) => {
                const numA = parseInt(a.nr, 10);
                const numB = parseInt(b.nr, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.nr.localeCompare(b.nr);
              }).map((nr) => (
                <SelectItem key={nr.id} value={nr.nr}>
                  NR-{nr.nr} {nr.descricao ? `- ${nr.descricao}` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Treinamento */}
      <div className="space-y-2">
        <Label>Treinamento *</Label>
        <Select
          value={formData.treinamento_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, treinamento_id: value }))}
          disabled={!formData.norma}
        >
          <SelectTrigger>
            <SelectValue placeholder={formData.norma ? "Selecione um treinamento" : "Selecione uma NR primeiro"} />
          </SelectTrigger>
          <SelectContent>
            {treinamentosFiltrados.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum treinamento para esta NR</div>
            ) : (
              [...treinamentosFiltrados].sort((a, b) => a.nome.localeCompare(b.nome)).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Agente Nocivo */}
      <div className="space-y-2">
        <Label>Agente nocivo / Perigo relacionado</Label>
        <Textarea
          value={formData.agente_nocivo}
          onChange={(e) => setFormData(prev => ({ ...prev, agente_nocivo: e.target.value }))}
          placeholder="Ex: Risco elétrico; choque elétrico; queimaduras"
          rows={3}
        />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Matriz de Treinamentos</h1>
          <p className="text-muted-foreground">Gerencie a matriz de treinamentos e perigos relacionados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!selectionMode && (
            <>
              {/* Import/Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar/Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </DropdownMenuItem>
                  {matriz.length > 0 && (
                    <DropdownMenuItem onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={downloadTemplateVazio}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Template Vazio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTemplatePadrao}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Template Padrão (NRs)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />

              {/* Create Dialog */}
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Nova Matriz</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    {renderFormFields()}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving || !formData.norma || !formData.treinamento_id}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cadastrar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Grid3X3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Itens na Matriz</p>
              <p className="text-2xl font-bold">{matriz.length}</p>
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
                placeholder="Buscar por treinamento, norma ou agente nocivo..."
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredMatriz.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item encontrado</p>
              </div>
            ) : (
              filteredMatriz.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      )}
                      <div>
                        <div className="mb-2">{getNRBadge(item.norma)}</div>
                        <p className="font-medium">{item.treinamento_nome}</p>
                      </div>
                    </div>
                  </div>
                  {item.agente_nocivo && (
                    <p className="text-sm text-muted-foreground">{item.agente_nocivo}</p>
                  )}
                  {!selectionMode && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(item)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectionMode && (
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.length === filteredMatriz.length && filteredMatriz.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[80px]">NR</TableHead>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Agente Nocivo / Perigo Relacionado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatriz.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectionMode ? 5 : 4} className="text-center text-muted-foreground py-8">
                      <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum item encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMatriz.map((item) => (
                    <TableRow key={item.id}>
                      {selectionMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {getNRBadge(item.norma)}
                      </TableCell>
                      <TableCell className="font-medium">{item.treinamento_nome}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {item.agente_nocivo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(item)}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Matriz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {renderFormFields()}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.norma || !formData.treinamento_id}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Options Dialog */}
      <AlertDialog open={deleteOptionsDialogOpen} onOpenChange={setDeleteOptionsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opções de Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma opção de exclusão:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDeleteOption('single')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir apenas este item
            </Button>
            {selectedItems.length > 0 && (
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleDeleteOption('selected')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir {selectedItems.length} selecionado(s)
              </Button>
            )}
            <Button 
              variant="outline" 
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => handleDeleteOption('all')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir todos ({matriz.length})
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteConfirmMessage()}
              <br /><br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

            {importPreview && importPreview.updateRecords.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Pencil className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-600">
                      {importPreview.updateRecords.length} item(ns) já existem (identificados pelo treinamento)
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Serão atualizados: NR e Agente Nocivo.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {importResult?.errors.length === 0 && ((importResult?.inserted || 0) + (importResult?.updated || 0)) > 0 && (
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {importResult.inserted > 0 && importResult.updated > 0 ? (
                    <>
                      {importResult.inserted} item(ns) inserido(s) e {importResult.updated} atualizado(s) com sucesso!
                    </>
                  ) : importResult.inserted > 0 ? (
                    <>
                      {importResult.inserted} item(ns) inserido(s) com sucesso!
                    </>
                  ) : (
                    <>
                      {importResult.updated} item(ns) atualizado(s) com sucesso!
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
