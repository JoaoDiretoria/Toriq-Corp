import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  ClipboardList, 
  CheckCircle2,
  XCircle,
  Eye,
  ListChecks,
  Download,
  Upload,
  Search,
  RefreshCw
} from 'lucide-react';

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

interface Alternativa {
  id: string;
  letra: string;
  texto: string;
  correta: boolean;
}

interface Questao {
  id: string;
  numero: number;
  tipo_questao: 'selecao' | 'vf';
  pergunta: string;
  alternativas: Alternativa[];
}

interface Prova {
  id: string;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  tipo: 'pre_teste' | 'pos_teste';
  nome: string | null;
  total_questoes: number;
  questoes_cadastradas: number;
  ativo: boolean;
  created_at: string;
}

export function SSTProvas() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  
  const [provas, setProvas] = useState<Prova[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProva, setSelectedProva] = useState<Prova | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  
  // Form states
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState('');
  const [tiposProva, setTiposProva] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  
  // Questão dialog states
  const [questaoDialogOpen, setQuestaoDialogOpen] = useState(false);
  const [tipoQuestao, setTipoQuestao] = useState<'selecao' | 'vf'>('selecao');
  const [pergunta, setPergunta] = useState('');
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [editingQuestao, setEditingQuestao] = useState<Questao | null>(null);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [provaToDelete, setProvaToDelete] = useState<Prova | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [provaRelacionadaParaExcluir, setProvaRelacionadaParaExcluir] = useState<Prova | null>(null);
  const [excluirProvaRelacionada, setExcluirProvaRelacionada] = useState(false);
  
  const DELETE_CONFIRM_WORD = 'EXCLUIR';
  
  // Provas relacionadas (mesmo treinamento)
  const [provasRelacionadas, setProvasRelacionadas] = useState<Prova[]>([]);
  
  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Dialog para alterar treinamento
  const [alterarTreinamentoDialogOpen, setAlterarTreinamentoDialogOpen] = useState(false);
  const [provaParaAlterar, setProvaParaAlterar] = useState<Prova | null>(null);
  const [novoTreinamentoId, setNovoTreinamentoId] = useState('');
  const [provaRelacionadaExiste, setProvaRelacionadaExiste] = useState<Prova | null>(null);
  const [alterarProvaRelacionada, setAlterarProvaRelacionada] = useState(false);

  useEffect(() => {
    if (empresaId) {
      fetchProvas();
      fetchTreinamentos();
    }
  }, [empresaId]);

  const fetchProvas = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('provas_treinamento')
        .select(`
          id,
          treinamento_id,
          tipo,
          nome,
          total_questoes,
          ativo,
          created_at,
          catalogo_treinamentos(id, nome, norma)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar contagem de questões para cada prova
      const provasComContagem = await Promise.all((data || []).map(async (p: any) => {
        const { count } = await (supabase as any)
          .from('provas_questoes')
          .select('*', { count: 'exact', head: true })
          .eq('prova_id', p.id);

        return {
          id: p.id,
          treinamento_id: p.treinamento_id,
          treinamento_nome: p.catalogo_treinamentos?.nome || '',
          treinamento_norma: p.catalogo_treinamentos?.norma || '',
          tipo: p.tipo,
          nome: p.nome,
          total_questoes: p.total_questoes,
          questoes_cadastradas: count || 0,
          ativo: p.ativo,
          created_at: p.created_at,
        };
      }));

      setProvas(provasComContagem);
    } catch (error: any) {
      console.error('Erro ao carregar provas:', error);
      toast({
        title: "Erro ao carregar provas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTreinamentos = async () => {
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaId);

      if (error) throw error;
      
      // Ordenar por número da NR (extraindo apenas números)
      const ordenados = (data || []).sort((a, b) => {
        const numA = parseInt(a.norma.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.norma.replace(/\D/g, '')) || 0;
        if (numA !== numB) return numA - numB;
        // Se mesma NR, ordenar por nome
        return a.nome.localeCompare(b.nome);
      });
      
      setTreinamentos(ordenados);
    } catch (error: any) {
      console.error('Erro ao carregar treinamentos:', error);
    }
  };

  const fetchQuestoes = async (provaId: string) => {
    try {
      const { data: questoesData, error: questoesError } = await (supabase as any)
        .from('provas_questoes')
        .select('*')
        .eq('prova_id', provaId)
        .order('numero');

      if (questoesError) throw questoesError;

      const questoesComAlternativas = await Promise.all((questoesData || []).map(async (q: any) => {
        const { data: alternativasData } = await (supabase as any)
          .from('provas_alternativas')
          .select('*')
          .eq('questao_id', q.id)
          .order('letra');

        return {
          id: q.id,
          numero: q.numero,
          tipo_questao: q.tipo_questao,
          pergunta: q.pergunta,
          alternativas: (alternativasData || []).map((a: any) => ({
            id: a.id,
            letra: a.letra,
            texto: a.texto,
            correta: a.correta,
          })),
        };
      }));

      setQuestoes(questoesComAlternativas);
    } catch (error: any) {
      console.error('Erro ao carregar questões:', error);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setTreinamentoSelecionado('');
    setTiposProva([]);
    setQuestoes([]);
    setSelectedProva(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (prova: Prova) => {
    setDialogMode('edit');
    setSelectedProva(prova);
    setTreinamentoSelecionado(prova.treinamento_id);
    
    // Buscar provas relacionadas (mesmo treinamento)
    const relacionadas = provas.filter(p => p.treinamento_id === prova.treinamento_id);
    setProvasRelacionadas(relacionadas);
    setTiposProva(relacionadas.map(p => p.tipo));
    
    await fetchQuestoes(prova.id);
    setDialogOpen(true);
  };

  const handleOpenView = async (prova: Prova) => {
    setDialogMode('view');
    setSelectedProva(prova);
    await fetchQuestoes(prova.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTreinamentoSelecionado('');
    setTiposProva([]);
    setQuestoes([]);
    setSelectedProva(null);
    setProvasRelacionadas([]);
  };

  const handleTipoProvaChange = (tipo: string, checked: boolean) => {
    if (checked) {
      setTiposProva(prev => [...prev, tipo]);
    } else {
      setTiposProva(prev => prev.filter(t => t !== tipo));
    }
  };

  const handleOpenQuestaoDialog = (questao?: Questao) => {
    if (questao) {
      setEditingQuestao(questao);
      setTipoQuestao(questao.tipo_questao);
      setPergunta(questao.pergunta);
      setAlternativas(questao.alternativas);
    } else {
      setEditingQuestao(null);
      setTipoQuestao('selecao');
      setPergunta('');
      initAlternativas('selecao');
    }
    setQuestaoDialogOpen(true);
  };

  const initAlternativas = (tipo: 'selecao' | 'vf') => {
    if (tipo === 'selecao') {
      setAlternativas([
        { id: '1', letra: 'A', texto: '', correta: false },
        { id: '2', letra: 'B', texto: '', correta: false },
        { id: '3', letra: 'C', texto: '', correta: false },
        { id: '4', letra: 'D', texto: '', correta: false },
      ]);
    } else {
      setAlternativas([
        { id: '1', letra: 'V', texto: 'Verdadeiro', correta: false },
        { id: '2', letra: 'F', texto: 'Falso', correta: false },
      ]);
    }
  };

  const handleTipoQuestaoChange = (tipo: 'selecao' | 'vf') => {
    setTipoQuestao(tipo);
    initAlternativas(tipo);
  };

  const handleAlternativaChange = (index: number, field: 'texto' | 'correta', value: string | boolean) => {
    setAlternativas(prev => prev.map((alt, i) => 
      i === index ? { ...alt, [field]: value } : alt
    ));
  };

  const handleSaveQuestao = () => {
    if (!pergunta.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a pergunta.",
        variant: "destructive",
      });
      return;
    }

    const temCorreta = alternativas.some(a => a.correta);
    if (!temCorreta) {
      toast({
        title: "Alternativa correta obrigatória",
        description: "Por favor, marque pelo menos uma alternativa como correta.",
        variant: "destructive",
      });
      return;
    }

    if (tipoQuestao === 'selecao') {
      const alternativasPreenchidas = alternativas.filter(a => a.texto.trim());
      if (alternativasPreenchidas.length < 2) {
        toast({
          title: "Alternativas obrigatórias",
          description: "Por favor, preencha pelo menos 2 alternativas.",
          variant: "destructive",
        });
        return;
      }
    }

    const novaQuestao: Questao = {
      id: editingQuestao?.id || `temp-${Date.now()}`,
      numero: editingQuestao?.numero || questoes.length + 1,
      tipo_questao: tipoQuestao,
      pergunta,
      alternativas: alternativas.filter(a => a.texto.trim()),
    };

    if (editingQuestao) {
      setQuestoes(prev => prev.map(q => q.id === editingQuestao.id ? novaQuestao : q));
    } else {
      if (questoes.length >= 10) {
        toast({
          title: "Limite atingido",
          description: "Cada prova pode ter no máximo 10 questões.",
          variant: "destructive",
        });
        return;
      }
      setQuestoes(prev => [...prev, novaQuestao]);
    }

    setQuestaoDialogOpen(false);
    setPergunta('');
    setAlternativas([]);
    setEditingQuestao(null);
  };

  const handleRemoveQuestao = (questaoId: string) => {
    setQuestoes(prev => {
      const filtered = prev.filter(q => q.id !== questaoId);
      return filtered.map((q, index) => ({ ...q, numero: index + 1 }));
    });
  };

  const handleSaveProva = async () => {
    if (!empresaId) return;

    if (!treinamentoSelecionado) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um treinamento.",
        variant: "destructive",
      });
      return;
    }

    if (tiposProva.length === 0) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione pelo menos um tipo de prova.",
        variant: "destructive",
      });
      return;
    }

    if (questoes.length === 0) {
      toast({
        title: "Questões obrigatórias",
        description: "Por favor, adicione pelo menos uma questão.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);

    try {
      // Função auxiliar para salvar questões em uma prova
      const salvarQuestoesNaProva = async (provaId: string) => {
        // Deletar questões e alternativas antigas
        const { data: questoesAntigas } = await (supabase as any)
          .from('provas_questoes')
          .select('id')
          .eq('prova_id', provaId);

        if (questoesAntigas) {
          for (const q of questoesAntigas) {
            await (supabase as any)
              .from('provas_alternativas')
              .delete()
              .eq('questao_id', q.id);
          }
          await (supabase as any)
            .from('provas_questoes')
            .delete()
            .eq('prova_id', provaId);
        }

        // Inserir novas questões
        for (const questao of questoes) {
          const { data: novaQuestao, error: questaoError } = await (supabase as any)
            .from('provas_questoes')
            .insert({
              prova_id: provaId,
              numero: questao.numero,
              tipo_questao: questao.tipo_questao,
              pergunta: questao.pergunta,
            })
            .select('id')
            .single();

          if (questaoError) throw questaoError;

          // Inserir alternativas
          const alternativasParaInserir = questao.alternativas.map(alt => ({
            questao_id: novaQuestao.id,
            letra: alt.letra,
            texto: alt.texto,
            correta: alt.correta,
          }));

          const { error: altError } = await (supabase as any)
            .from('provas_alternativas')
            .insert(alternativasParaInserir);

          if (altError) throw altError;
        }
      };

      if (dialogMode === 'edit') {
        // Edição: atualizar todas as provas relacionadas (mesmo treinamento)
        for (const provaRelacionada of provasRelacionadas) {
          await salvarQuestoesNaProva(provaRelacionada.id);
        }
        
        toast({
          title: "Provas atualizadas!",
          description: provasRelacionadas.length > 1 
            ? `${provasRelacionadas.length} provas foram atualizadas com as mesmas questões.`
            : "A prova foi atualizada com sucesso.",
        });
      } else {
        // Criação: criar novas provas
        for (const tipo of tiposProva) {
          // Verificar se já existe prova para este treinamento e tipo
          const { data: existente } = await (supabase as any)
            .from('provas_treinamento')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('treinamento_id', treinamentoSelecionado)
            .eq('tipo', tipo)
            .single();

          if (existente) {
            toast({
              title: "Prova já existe",
              description: `Já existe uma prova do tipo ${tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} para este treinamento.`,
              variant: "destructive",
            });
            continue;
          }

          // Criar nova prova
          const { data: novaProva, error: provaError } = await (supabase as any)
            .from('provas_treinamento')
            .insert({
              empresa_id: empresaId,
              treinamento_id: treinamentoSelecionado,
              tipo,
              total_questoes: 10,
            })
            .select('id')
            .single();

          if (provaError) throw provaError;

          // Inserir questões na nova prova
          await salvarQuestoesNaProva(novaProva.id);
        }

        toast({
          title: "Prova(s) criada(s)!",
          description: `${tiposProva.length} prova(s) criada(s) com sucesso.`,
        });
      }

      handleCloseDialog();
      fetchProvas();
    } catch (error: any) {
      console.error('Erro ao salvar prova:', error);
      toast({
        title: "Erro ao salvar prova",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleOpenDeleteDialog = (prova: Prova) => {
    setProvaToDelete(prova);
    setDeleteConfirmText('');
    setExcluirProvaRelacionada(false);
    
    // Verificar se existe prova relacionada (pré se é pós, ou pós se é pré)
    const tipoRelacionado = prova.tipo === 'pre_teste' ? 'pos_teste' : 'pre_teste';
    const relacionada = provas.find(p => 
      p.treinamento_id === prova.treinamento_id && p.tipo === tipoRelacionado
    );
    setProvaRelacionadaParaExcluir(relacionada || null);
    
    setDeleteDialogOpen(true);
  };

  const handleDeleteProva = async () => {
    if (!provaToDelete) return;
    
    // Verificar se a confirmação está correta
    if (deleteConfirmText !== DELETE_CONFIRM_WORD) {
      toast({
        title: "Confirmação incorreta",
        description: `Digite "${DELETE_CONFIRM_WORD}" para confirmar a exclusão.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Lista de provas a serem excluídas
      const provasParaExcluir = [provaToDelete];
      if (excluirProvaRelacionada && provaRelacionadaParaExcluir) {
        provasParaExcluir.push(provaRelacionadaParaExcluir);
      }

      for (const prova of provasParaExcluir) {
        // Deletar alternativas
        const { data: questoesData } = await (supabase as any)
          .from('provas_questoes')
          .select('id')
          .eq('prova_id', prova.id);

        if (questoesData) {
          for (const q of questoesData) {
            await (supabase as any)
              .from('provas_alternativas')
              .delete()
              .eq('questao_id', q.id);
          }
        }

        // Deletar questões
        await (supabase as any)
          .from('provas_questoes')
          .delete()
          .eq('prova_id', prova.id);

        // Deletar prova
        const { error } = await (supabase as any)
          .from('provas_treinamento')
          .delete()
          .eq('id', prova.id);

        if (error) throw error;
      }

      const qtdExcluidas = provasParaExcluir.length;
      toast({
        title: "Prova(s) excluída(s)!",
        description: qtdExcluidas > 1 
          ? `${qtdExcluidas} provas foram excluídas com sucesso.`
          : "A prova foi excluída com sucesso.",
      });

      setDeleteDialogOpen(false);
      setProvaToDelete(null);
      setDeleteConfirmText('');
      setProvaRelacionadaParaExcluir(null);
      setExcluirProvaRelacionada(false);
      fetchProvas();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir prova",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Exportar prova para JSON
  const handleExportProva = async (prova: Prova) => {
    try {
      // Buscar questões e alternativas da prova
      const { data: questoesData, error: questoesError } = await (supabase as any)
        .from('provas_questoes')
        .select('*')
        .eq('prova_id', prova.id)
        .order('numero');

      if (questoesError) throw questoesError;

      const questoesComAlternativas = await Promise.all((questoesData || []).map(async (q: any) => {
        const { data: alternativasData } = await (supabase as any)
          .from('provas_alternativas')
          .select('*')
          .eq('questao_id', q.id)
          .order('letra');

        return {
          numero: q.numero,
          tipo_questao: q.tipo_questao,
          pergunta: q.pergunta,
          alternativas: (alternativasData || []).map((a: any) => ({
            letra: a.letra,
            texto: a.texto,
            correta: a.correta,
          })),
        };
      }));

      const exportData = {
        versao: '1.0',
        exportado_em: new Date().toISOString(),
        treinamento: {
          nome: prova.treinamento_nome,
          norma: prova.treinamento_norma,
        },
        prova: {
          tipo: prova.tipo,
          nome: prova.nome,
          total_questoes: prova.total_questoes,
        },
        questoes: questoesComAlternativas,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prova_${prova.treinamento_norma}_${prova.tipo}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Prova exportada!",
        description: "O arquivo JSON foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao exportar prova:', error);
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Baixar modelo padrão para importação
  const handleDownloadModelo = () => {
    const modeloPadrao = {
      versao: '1.0',
      exportado_em: new Date().toISOString(),
      instrucoes: 'Este arquivo suporta múltiplas provas. Cada item do array "provas" cria uma prova separada. O campo "tipos" pode ser um array com "pre_teste" e/ou "pos_teste" - se ambos forem informados, a mesma prova será criada para os dois tipos.',
      provas: [
        {
          treinamento: {
            nome: 'Nome do Treinamento (deve corresponder a um treinamento cadastrado)',
            norma: '35',
          },
          tipos: ['pre_teste', 'pos_teste'],
          questoes: [
            {
              numero: 1,
              tipo_questao: 'selecao',
              pergunta: 'Exemplo de pergunta de múltipla escolha?',
              alternativas: [
                { letra: 'A', texto: 'Alternativa A', correta: false },
                { letra: 'B', texto: 'Alternativa B (correta)', correta: true },
                { letra: 'C', texto: 'Alternativa C', correta: false },
                { letra: 'D', texto: 'Alternativa D', correta: false },
              ],
            },
            {
              numero: 2,
              tipo_questao: 'vf',
              pergunta: 'Exemplo de pergunta verdadeiro ou falso?',
              alternativas: [
                { letra: 'V', texto: 'Verdadeiro', correta: true },
                { letra: 'F', texto: 'Falso', correta: false },
              ],
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(modeloPadrao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_prova.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Modelo baixado!",
      description: "Preencha o arquivo JSON e importe-o.",
    });
  };

  // Exportar todas as provas
  const handleExportTodasProvas = async () => {
    if (provas.length === 0) {
      toast({
        title: "Nenhuma prova para exportar",
        description: "Não há provas cadastradas.",
        variant: "destructive",
      });
      return;
    }

    try {
      const todasProvas = await Promise.all(provas.map(async (prova) => {
        const { data: questoesData } = await (supabase as any)
          .from('provas_questoes')
          .select('*')
          .eq('prova_id', prova.id)
          .order('numero');

        const questoesComAlternativas = await Promise.all((questoesData || []).map(async (q: any) => {
          const { data: alternativasData } = await (supabase as any)
            .from('provas_alternativas')
            .select('*')
            .eq('questao_id', q.id)
            .order('letra');

          return {
            numero: q.numero,
            tipo_questao: q.tipo_questao,
            pergunta: q.pergunta,
            alternativas: (alternativasData || []).map((a: any) => ({
              letra: a.letra,
              texto: a.texto,
              correta: a.correta,
            })),
          };
        }));

        return {
          treinamento: {
            nome: prova.treinamento_nome,
            norma: prova.treinamento_norma,
          },
          prova: {
            tipo: prova.tipo,
            nome: prova.nome,
            total_questoes: prova.total_questoes,
          },
          questoes: questoesComAlternativas,
        };
      }));

      const exportData = {
        versao: '1.0',
        exportado_em: new Date().toISOString(),
        total_provas: todasProvas.length,
        provas: todasProvas,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todas_provas_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Provas exportadas!",
        description: `${todasProvas.length} prova(s) exportada(s) com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao exportar provas:', error);
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Importar prova de JSON
  const handleImportProva = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validar estrutura do arquivo
        if (!importData.versao) {
          throw new Error('Arquivo inválido. Formato não reconhecido.');
        }

        // Verificar se é o novo formato (array de provas) ou formato antigo
        const provasParaImportar = importData.provas || [
          {
            treinamento: importData.treinamento,
            tipos: importData.prova?.tipo ? [importData.prova.tipo] : ['pos_teste'],
            questoes: importData.questoes,
          }
        ];

        if (!Array.isArray(provasParaImportar) || provasParaImportar.length === 0) {
          throw new Error('Arquivo inválido. Nenhuma prova encontrada.');
        }

        let provasCriadas = 0;
        let erros: string[] = [];

        // Processar cada prova do array
        for (const provaData of provasParaImportar) {
          // Encontrar treinamento correspondente pela norma
          const treinamentoEncontrado = treinamentos.find(t => 
            t.norma === provaData.treinamento?.norma || 
            t.nome === provaData.treinamento?.nome
          );

          if (!treinamentoEncontrado) {
            erros.push(`Treinamento não encontrado: ${provaData.treinamento?.norma || provaData.treinamento?.nome}`);
            continue;
          }

          // Obter tipos (pode ser array ou string única)
          const tipos = Array.isArray(provaData.tipos) 
            ? provaData.tipos 
            : (provaData.tipo ? [provaData.tipo] : ['pos_teste']);

          // Converter questões para o formato interno
          const questoesImportadas = (provaData.questoes || []).map((q: any, index: number) => ({
            numero: q.numero || index + 1,
            tipo_questao: q.tipo_questao || 'selecao',
            pergunta: q.pergunta,
            alternativas: (q.alternativas || []).map((a: any) => ({
              letra: a.letra,
              texto: a.texto,
              correta: a.correta,
            })),
          }));

          // Criar prova para cada tipo
          for (const tipo of tipos) {
            // Verificar se já existe prova para este treinamento e tipo
            const { data: existente } = await (supabase as any)
              .from('provas_treinamento')
              .select('id')
              .eq('empresa_id', empresaId)
              .eq('treinamento_id', treinamentoEncontrado.id)
              .eq('tipo', tipo)
              .maybeSingle();

            if (existente) {
              erros.push(`Prova ${tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} já existe para NR-${treinamentoEncontrado.norma}`);
              continue;
            }

            // Criar nova prova
            const { data: novaProva, error: provaError } = await (supabase as any)
              .from('provas_treinamento')
              .insert({
                empresa_id: empresaId,
                treinamento_id: treinamentoEncontrado.id,
                tipo,
                total_questoes: 10,
              })
              .select('id')
              .single();

            if (provaError) {
              erros.push(`Erro ao criar prova: ${provaError.message}`);
              continue;
            }

            // Inserir questões
            for (const questao of questoesImportadas) {
              const { data: novaQuestao, error: questaoError } = await (supabase as any)
                .from('provas_questoes')
                .insert({
                  prova_id: novaProva.id,
                  numero: questao.numero,
                  tipo_questao: questao.tipo_questao,
                  pergunta: questao.pergunta,
                })
                .select('id')
                .single();

              if (questaoError) continue;

              // Inserir alternativas
              const alternativasParaInserir = questao.alternativas.map((alt: any) => ({
                questao_id: novaQuestao.id,
                letra: alt.letra,
                texto: alt.texto,
                correta: alt.correta,
              }));

              await (supabase as any)
                .from('provas_alternativas')
                .insert(alternativasParaInserir);
            }

            provasCriadas++;
          }
        }

        // Atualizar lista de provas
        fetchProvas();

        if (provasCriadas > 0) {
          toast({
            title: "Importação concluída!",
            description: `${provasCriadas} prova(s) criada(s) com sucesso.${erros.length > 0 ? ` ${erros.length} erro(s).` : ''}`,
          });
        } else {
          toast({
            title: "Nenhuma prova criada",
            description: erros.join('. '),
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('Erro ao importar prova:', error);
        toast({
          title: "Erro ao importar",
          description: error.message || 'Erro ao ler o arquivo.',
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'pre_teste') {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pré-Teste</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pós-Teste</Badge>;
  };

  const getStatusBadge = (questoesCadastradas: number, totalQuestoes: number) => {
    if (questoesCadastradas >= totalQuestoes) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completa</Badge>;
    }
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Incompleta ({questoesCadastradas}/{totalQuestoes})</Badge>;
  };

  // Filtrar provas com base nos critérios de busca
  const provasFiltradas = provas.filter((prova) => {
    // Filtro de busca por NR ou nome
    const termoBusca = searchTerm.toLowerCase().trim();
    const matchBusca = termoBusca === '' || 
      prova.treinamento_norma.toLowerCase().includes(termoBusca) ||
      prova.treinamento_nome.toLowerCase().includes(termoBusca) ||
      `nr-${prova.treinamento_norma}`.toLowerCase().includes(termoBusca) ||
      `nr ${prova.treinamento_norma}`.toLowerCase().includes(termoBusca);
    
    // Filtro de tipo
    const matchTipo = filtroTipo === 'todos' || prova.tipo === filtroTipo;
    
    // Filtro de status
    const isCompleta = prova.questoes_cadastradas >= prova.total_questoes;
    const matchStatus = filtroStatus === 'todos' || 
      (filtroStatus === 'completa' && isCompleta) ||
      (filtroStatus === 'incompleta' && !isCompleta);
    
    return matchBusca && matchTipo && matchStatus;
  });

  // Limpar filtros
  const handleLimparFiltros = () => {
    setSearchTerm('');
    setFiltroTipo('todos');
    setFiltroStatus('todos');
  };

  // Abrir dialog para alterar treinamento
  const handleOpenAlterarTreinamento = (prova: Prova) => {
    setProvaParaAlterar(prova);
    setNovoTreinamentoId(prova.treinamento_id);
    
    // Verificar se existe prova relacionada (pré se é pós, ou pós se é pré)
    const tipoRelacionado = prova.tipo === 'pre_teste' ? 'pos_teste' : 'pre_teste';
    const relacionada = provas.find(p => 
      p.treinamento_id === prova.treinamento_id && p.tipo === tipoRelacionado
    );
    setProvaRelacionadaExiste(relacionada || null);
    setAlterarProvaRelacionada(false);
    
    setAlterarTreinamentoDialogOpen(true);
  };

  // Salvar alteração de treinamento
  const handleSalvarAlteracaoTreinamento = async () => {
    if (!provaParaAlterar || !novoTreinamentoId) return;
    
    if (novoTreinamentoId === provaParaAlterar.treinamento_id) {
      toast({
        title: "Nenhuma alteração",
        description: "O treinamento selecionado é o mesmo da prova atual.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Lista de provas a serem alteradas
      const provasParaAtualizar = [provaParaAlterar];
      if (alterarProvaRelacionada && provaRelacionadaExiste) {
        provasParaAtualizar.push(provaRelacionadaExiste);
      }

      // Verificar se já existe prova para o novo treinamento com os mesmos tipos
      for (const prova of provasParaAtualizar) {
        const { data: existente } = await (supabase as any)
          .from('provas_treinamento')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('treinamento_id', novoTreinamentoId)
          .eq('tipo', prova.tipo)
          .maybeSingle();

        if (existente) {
          const treinamentoNovo = treinamentos.find(t => t.id === novoTreinamentoId);
          toast({
            title: "Prova já existe",
            description: `Já existe uma prova do tipo ${prova.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} para o treinamento NR-${treinamentoNovo?.norma}.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Atualizar o treinamento das provas
      for (const prova of provasParaAtualizar) {
        const { error } = await (supabase as any)
          .from('provas_treinamento')
          .update({ treinamento_id: novoTreinamentoId })
          .eq('id', prova.id);

        if (error) throw error;
      }

      const treinamentoNovo = treinamentos.find(t => t.id === novoTreinamentoId);
      const qtdProvas = provasParaAtualizar.length;
      toast({
        title: "Treinamento alterado!",
        description: qtdProvas > 1 
          ? `${qtdProvas} provas foram movidas para o treinamento NR-${treinamentoNovo?.norma} - ${treinamentoNovo?.nome}.`
          : `A prova foi movida para o treinamento NR-${treinamentoNovo?.norma} - ${treinamentoNovo?.nome}.`,
      });

      setAlterarTreinamentoDialogOpen(false);
      setProvaParaAlterar(null);
      setNovoTreinamentoId('');
      setProvaRelacionadaExiste(null);
      setAlterarProvaRelacionada(false);
      fetchProvas();
    } catch (error: any) {
      console.error('Erro ao alterar treinamento:', error);
      toast({
        title: "Erro ao alterar treinamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Provas de Treinamento</CardTitle>
                <CardDescription>
                  Gerencie os modelos de provas para os treinamentos
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportTodasProvas} disabled={provas.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Todas
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadModelo}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo Padrão
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportProva}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Arquivo JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Teste
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NR ou nome do treinamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="pre_teste">Pré-Teste</SelectItem>
                <SelectItem value="pos_teste">Pós-Teste</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="incompleta">Incompleta</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || filtroTipo !== 'todos' || filtroStatus !== 'todos') && (
              <Button variant="ghost" size="icon" onClick={handleLimparFiltros} title="Limpar filtros">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          {provas.length > 0 && (
            <div className="text-sm text-muted-foreground mb-3">
              Exibindo {provasFiltradas.length} de {provas.length} prova(s)
            </div>
          )}

          {provas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>Nenhuma prova cadastrada.</p>
              <p className="text-sm">Clique em "Novo Teste" para criar uma prova.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma prova encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  provasFiltradas.map((prova) => (
                    <TableRow key={prova.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">NR-{prova.treinamento_norma}</p>
                          <p className="text-sm text-muted-foreground">{prova.treinamento_nome}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTipoBadge(prova.tipo)}</TableCell>
                      <TableCell>{getStatusBadge(prova.questoes_cadastradas, prova.total_questoes)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenView(prova)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(prova)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenAlterarTreinamento(prova)} title="Alterar Treinamento">
                            <RefreshCw className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExportProva(prova)} title="Exportar">
                            <Download className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(prova)} title="Excluir">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Prova */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[800px] h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {dialogMode === 'view' ? 'Visualizar Prova' : dialogMode === 'edit' ? 'Editar Prova' : 'Nova Prova'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'view' 
                ? 'Visualize as questões da prova'
                : 'Configure o treinamento, tipo de prova e adicione as questões'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-6 py-4">
              {dialogMode !== 'view' && (
                <>
                  {/* Seleção de Treinamento */}
                  <div className="space-y-2">
                    <Label>Treinamento</Label>
                    <Select 
                      value={treinamentoSelecionado} 
                      onValueChange={setTreinamentoSelecionado}
                      disabled={dialogMode === 'edit'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um treinamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {treinamentos.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            NR-{t.norma} - {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seleção de Tipo de Prova */}
                  <div className="space-y-2">
                    <Label>Tipo de Prova</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="pre_teste" 
                          checked={tiposProva.includes('pre_teste')}
                          onCheckedChange={(checked) => handleTipoProvaChange('pre_teste', checked as boolean)}
                          disabled={dialogMode === 'edit'}
                        />
                        <label htmlFor="pre_teste" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Pré-Teste
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="pos_teste" 
                          checked={tiposProva.includes('pos_teste')}
                          onCheckedChange={(checked) => handleTipoProvaChange('pos_teste', checked as boolean)}
                          disabled={dialogMode === 'edit'}
                        />
                        <label htmlFor="pos_teste" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Pós-Teste
                        </label>
                      </div>
                    </div>
                    {tiposProva.length === 2 && dialogMode === 'create' && (
                      <p className="text-xs text-muted-foreground">
                        Serão criadas duas provas com as mesmas questões.
                      </p>
                    )}
                    {dialogMode === 'edit' && provasRelacionadas.length > 1 && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <strong>Atenção:</strong> As alterações serão aplicadas em {provasRelacionadas.length} provas 
                        ({provasRelacionadas.map(p => p.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste').join(' e ')}) 
                        do mesmo treinamento.
                      </div>
                    )}
                  </div>
                </>
              )}

              {dialogMode === 'view' && selectedProva && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Treinamento</Label>
                      <p className="font-medium">NR-{selectedProva.treinamento_norma} - {selectedProva.treinamento_nome}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Tipo</Label>
                      <div>{getTipoBadge(selectedProva.tipo)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Questões */}
              {(treinamentoSelecionado && tiposProva.length > 0) || dialogMode === 'view' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Questões ({questoes.length}/10)</Label>
                      <p className="text-xs text-muted-foreground">Cada questão vale 1 ponto</p>
                    </div>
                    {dialogMode !== 'view' && questoes.length < 10 && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenQuestaoDialog()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Questão
                      </Button>
                    )}
                  </div>

                  {questoes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg">
                      <ListChecks className="h-8 w-8 mb-2" />
                      <p className="text-sm">Nenhuma questão adicionada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questoes.map((questao, index) => (
                        <div key={questao.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{questao.numero}</Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {questao.tipo_questao === 'selecao' ? 'Múltipla Escolha' : 'V ou F'}
                                </Badge>
                              </div>
                              <p className="font-medium">{questao.pergunta}</p>
                            </div>
                            {dialogMode !== 'view' && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenQuestaoDialog(questao)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveQuestao(questao.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {questao.alternativas.map((alt) => (
                              <div 
                                key={alt.id} 
                                className={`flex items-center gap-2 p-2 rounded text-sm ${
                                  alt.correta ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                }`}
                              >
                                <span className="font-medium">{alt.letra})</span>
                                <span className="flex-1">{alt.texto}</span>
                                {alt.correta && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {dialogMode !== 'view' && (
            <DialogFooter className="border-t pt-4 shrink-0">
              <Button variant="outline" onClick={handleCloseDialog} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProva} disabled={salvando}>
                {salvando ? 'Salvando...' : dialogMode === 'edit' ? 'Salvar Alterações' : 'Criar Prova'}
              </Button>
            </DialogFooter>
          )}
          {dialogMode === 'view' && (
            <DialogFooter className="border-t pt-4 shrink-0">
              <Button variant="outline" onClick={handleCloseDialog}>
                Fechar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Adicionar/Editar Questão */}
      <Dialog open={questaoDialogOpen} onOpenChange={setQuestaoDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingQuestao ? 'Editar Questão' : 'Adicionar Questão'}
            </DialogTitle>
            <DialogDescription>
              Configure o tipo de questão e preencha as alternativas
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {/* Tipo de Questão */}
              <div className="space-y-2">
                <Label>Tipo de Questão</Label>
                <Select value={tipoQuestao} onValueChange={(v) => handleTipoQuestaoChange(v as 'selecao' | 'vf')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selecao">Múltipla Escolha (4 alternativas)</SelectItem>
                    <SelectItem value="vf">Verdadeiro ou Falso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoQuestao === 'vf' && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <strong>Orientação:</strong> Coloque Verdadeiro (V) ou Falso (F) para a afirmação abaixo.
                </div>
              )}

              {/* Pergunta */}
              <div className="space-y-2">
                <Label>Pergunta</Label>
                <Textarea 
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  placeholder="Digite a pergunta..."
                  rows={3}
                />
              </div>

              {/* Alternativas */}
              <div className="space-y-3">
                <Label>Alternativas</Label>
                {alternativas.map((alt, index) => (
                  <div key={alt.id} className="flex items-center gap-2">
                    <span className="font-medium w-6">{alt.letra})</span>
                    {tipoQuestao === 'selecao' ? (
                      <Input 
                        value={alt.texto}
                        onChange={(e) => handleAlternativaChange(index, 'texto', e.target.value)}
                        placeholder={`Alternativa ${alt.letra}`}
                        className="flex-1"
                      />
                    ) : (
                      <span className="flex-1 p-2 bg-gray-50 rounded">{alt.texto}</span>
                    )}
                    <Select 
                      value={alt.correta ? 'correta' : 'incorreta'}
                      onValueChange={(v) => handleAlternativaChange(index, 'correta', v === 'correta')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correta">Correta</SelectItem>
                        <SelectItem value="incorreta">Incorreta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveQuestao}>
              {editingQuestao ? 'Salvar Alterações' : 'Adicionar Questão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão de Prova */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setProvaToDelete(null);
          setDeleteConfirmText('');
          setProvaRelacionadaParaExcluir(null);
          setExcluirProvaRelacionada(false);
        }
      }}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Tem certeza que deseja excluir a prova "{provaToDelete?.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}" 
                  do treinamento "{provaToDelete?.treinamento_nome}"?
                </p>
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <strong>⚠️ Atenção:</strong> Esta ação não pode ser desfeita e todas as questões serão removidas permanentemente.
                </div>

                {/* Indicador de provas existentes */}
                {provaToDelete && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Provas deste treinamento:</span>
                      <Badge className={provas.some(p => p.treinamento_id === provaToDelete.treinamento_id && p.tipo === 'pre_teste') 
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                        : "bg-gray-200 text-gray-400"}>
                        Pré-Teste
                      </Badge>
                      <Badge className={provas.some(p => p.treinamento_id === provaToDelete.treinamento_id && p.tipo === 'pos_teste') 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : "bg-gray-200 text-gray-400"}>
                        Pós-Teste
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Checkbox para excluir também a prova relacionada */}
                {provaRelacionadaParaExcluir && (
                  <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox 
                      id="excluirRelacionada" 
                      checked={excluirProvaRelacionada}
                      onCheckedChange={(checked) => setExcluirProvaRelacionada(checked as boolean)}
                    />
                    <label htmlFor="excluirRelacionada" className="text-sm font-medium leading-none cursor-pointer text-amber-800">
                      Excluir também o {provaRelacionadaParaExcluir.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}?
                    </label>
                  </div>
                )}

                {/* Campo de confirmação */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Digite <span className="font-bold text-destructive select-none" style={{ userSelect: 'none' }}>{DELETE_CONFIRM_WORD}</span> para confirmar:
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => {
                      // Permitir apenas digitação caractere por caractere
                      const newValue = e.target.value.toUpperCase();
                      const expectedChar = DELETE_CONFIRM_WORD[deleteConfirmText.length];
                      
                      // Se está apagando, permitir
                      if (newValue.length < deleteConfirmText.length) {
                        setDeleteConfirmText(newValue);
                        return;
                      }
                      
                      // Se está adicionando, verificar se é o próximo caractere esperado
                      if (newValue.length === deleteConfirmText.length + 1) {
                        const lastChar = newValue[newValue.length - 1];
                        if (lastChar === expectedChar) {
                          setDeleteConfirmText(newValue);
                        }
                      }
                    }}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={DELETE_CONFIRM_WORD}
                    className={`font-mono tracking-widest ${
                      deleteConfirmText === DELETE_CONFIRM_WORD 
                        ? 'border-green-500 bg-green-50' 
                        : deleteConfirmText.length > 0 
                          ? 'border-amber-500 bg-amber-50' 
                          : ''
                    }`}
                  />
                  {deleteConfirmText.length > 0 && deleteConfirmText !== DELETE_CONFIRM_WORD && (
                    <p className="text-xs text-muted-foreground">
                      {deleteConfirmText.length}/{DELETE_CONFIRM_WORD.length} caracteres
                    </p>
                  )}
                  {deleteConfirmText === DELETE_CONFIRM_WORD && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Confirmação válida
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setProvaToDelete(null);
              setDeleteConfirmText('');
              setProvaRelacionadaParaExcluir(null);
              setExcluirProvaRelacionada(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProva} 
              disabled={deleteConfirmText !== DELETE_CONFIRM_WORD}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excluirProvaRelacionada && provaRelacionadaParaExcluir 
                ? 'Excluir 2 Provas' 
                : 'Excluir Prova'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Alterar Treinamento */}
      <Dialog open={alterarTreinamentoDialogOpen} onOpenChange={setAlterarTreinamentoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Alterar Treinamento da Prova
            </DialogTitle>
            <DialogDescription>
              Mova esta prova para outro treinamento. As questões serão mantidas.
            </DialogDescription>
          </DialogHeader>
          
          {provaParaAlterar && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Prova atual:</p>
                <p className="font-medium">
                  {provaParaAlterar.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'} - NR-{provaParaAlterar.treinamento_norma}
                </p>
                <p className="text-sm text-muted-foreground">{provaParaAlterar.treinamento_nome}</p>
                
                {/* Indicador de provas existentes */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Provas deste treinamento:</span>
                  <Badge className={provas.some(p => p.treinamento_id === provaParaAlterar.treinamento_id && p.tipo === 'pre_teste') 
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                    : "bg-gray-200 text-gray-400"}>
                    Pré-Teste
                  </Badge>
                  <Badge className={provas.some(p => p.treinamento_id === provaParaAlterar.treinamento_id && p.tipo === 'pos_teste') 
                    ? "bg-green-500/10 text-green-600 border-green-500/20" 
                    : "bg-gray-200 text-gray-400"}>
                    Pós-Teste
                  </Badge>
                </div>
              </div>

              {/* Checkbox para alterar também a prova relacionada */}
              {provaRelacionadaExiste && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Checkbox 
                    id="alterarRelacionada" 
                    checked={alterarProvaRelacionada}
                    onCheckedChange={(checked) => setAlterarProvaRelacionada(checked as boolean)}
                  />
                  <label htmlFor="alterarRelacionada" className="text-sm font-medium leading-none cursor-pointer">
                    Alterar também o {provaRelacionadaExiste.tipo === 'pre_teste' ? 'Pré-Teste' : 'Pós-Teste'}?
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <Label>Novo Treinamento</Label>
                <Select value={novoTreinamentoId} onValueChange={setNovoTreinamentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o novo treinamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {treinamentos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        NR-{t.norma} - {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {novoTreinamentoId && novoTreinamentoId !== provaParaAlterar.treinamento_id && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <strong>Atenção:</strong> {alterarProvaRelacionada && provaRelacionadaExiste 
                    ? `As ${2} provas serão movidas para o treinamento selecionado.`
                    : 'A prova será movida para o treinamento selecionado.'
                  } Certifique-se de que as questões são compatíveis com o novo treinamento.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAlterarTreinamentoDialogOpen(false);
                setProvaParaAlterar(null);
                setNovoTreinamentoId('');
                setProvaRelacionadaExiste(null);
                setAlterarProvaRelacionada(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarAlteracaoTreinamento}
              disabled={!novoTreinamentoId || novoTreinamentoId === provaParaAlterar?.treinamento_id}
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
