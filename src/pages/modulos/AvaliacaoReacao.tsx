import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Usar supabase sem tipagem para tabelas novas que ainda não estão no schema
const db = supabase as any;
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Loader2, 
  ClipboardList, 
  Pencil, 
  Trash2, 
  Eye,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  ChevronsUpDown
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OpcaoResposta {
  id?: string;
  valor: number;
  texto: string;
}

interface Item {
  id?: string;
  texto: string;
  ordem: number;
}

interface Categoria {
  id?: string;
  nome: string;
  ordem: number;
  qtd_opcoes_resposta: number;
  opcoes_resposta: OpcaoResposta[];
  itens: Item[];
}

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  campo_sugestoes: boolean;
  categorias?: Categoria[];
  treinamentos?: string[];
}

export default function AvaliacaoReacao() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  
  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modeloToDelete, setModeloToDelete] = useState<Modelo | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingModelo, setViewingModelo] = useState<Modelo | null>(null);
  
  // Form state
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategorias, setFormCategorias] = useState<Categoria[]>([]);
  const [expandedCategoria, setExpandedCategoria] = useState<number | null>(null);
  const [formTreinamentos, setFormTreinamentos] = useState<string[]>([]);
  const [formTreinamentosExceto, setFormTreinamentosExceto] = useState<string[]>([]);
  const [treinamentosDisponiveis, setTreinamentosDisponiveis] = useState<Treinamento[]>([]);
  const [treinamentosOpen, setTreinamentosOpen] = useState(false);
  const [modoTreinamentos, setModoTreinamentos] = useState<'todos' | 'exceto' | 'selecionar'>('todos');
  const [treinamentoSearch, setTreinamentoSearch] = useState('');

  useEffect(() => {
    if (empresaId) {
      fetchModelos();
      fetchTreinamentos();
    }
  }, [empresaId]);

  const fetchTreinamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaId)
        .order('norma');

      if (error) throw error;
      setTreinamentosDisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
    }
  };

  const fetchModelos = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('avaliacao_reacao_modelos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      toast.error('Erro ao carregar modelos de avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (modelo?: Modelo) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormNome(modelo.nome);
      setFormDescricao(modelo.descricao || '');
      // Carregar categorias do modelo
      loadModeloCategorias(modelo.id);
      // Carregar treinamentos associados
      await loadModeloTreinamentos(modelo.id);
    } else {
      setEditingModelo(null);
      setFormNome('');
      setFormDescricao('');
      setFormCategorias([]);
      setFormTreinamentos([]);
      setFormTreinamentosExceto([]);
      setModoTreinamentos('todos');
    }
    setExpandedCategoria(null);
    setDialogOpen(true);
  };

  const loadModeloTreinamentos = async (modeloId: string) => {
    try {
      const { data, error } = await db
        .from('avaliacao_reacao_modelo_treinamentos')
        .select('treinamento_id')
        .eq('modelo_id', modeloId);

      if (error) throw error;
      
      const treinamentoIds = (data || []).map((t: any) => t.treinamento_id);
      setFormTreinamentos(treinamentoIds);
      setFormTreinamentosExceto([]);
      
      // Verificar se são todos os treinamentos
      if (treinamentoIds.length === treinamentosDisponiveis.length && treinamentoIds.length > 0) {
        setModoTreinamentos('todos');
      } else if (treinamentoIds.length === 0) {
        setModoTreinamentos('todos');
      } else {
        setModoTreinamentos('selecionar');
      }
    } catch (error) {
      console.error('Erro ao carregar treinamentos do modelo:', error);
      setFormTreinamentos([]);
      setModoTreinamentos('todos');
    }
  };

  const loadModeloCategorias = async (modeloId: string) => {
    try {
      const { data: categoriasData, error: categoriasError } = await db
        .from('avaliacao_reacao_categorias')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('ordem');

      if (categoriasError) throw categoriasError;

      const categoriasComDetalhes: Categoria[] = [];

      for (const cat of categoriasData || []) {
        // Buscar opções de resposta
        const { data: opcoesData } = await db
          .from('avaliacao_reacao_opcoes_resposta')
          .select('*')
          .eq('categoria_id', cat.id)
          .order('valor');

        // Buscar itens
        const { data: itensData } = await db
          .from('avaliacao_reacao_itens')
          .select('*')
          .eq('categoria_id', cat.id)
          .order('ordem');

        categoriasComDetalhes.push({
          id: cat.id,
          nome: cat.nome,
          ordem: cat.ordem,
          qtd_opcoes_resposta: cat.qtd_opcoes_resposta,
          opcoes_resposta: (opcoesData || []).map((o: any) => ({
            id: o.id,
            valor: o.valor,
            texto: o.texto
          })),
          itens: (itensData || []).map((i: any) => ({
            id: i.id,
            texto: i.texto,
            ordem: i.ordem
          }))
        });
      }

      setFormCategorias(categoriasComDetalhes);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleAddCategoria = () => {
    const novaCategoria: Categoria = {
      nome: '',
      ordem: formCategorias.length,
      qtd_opcoes_resposta: 3,
      opcoes_resposta: [
        { valor: 1, texto: 'Ruim' },
        { valor: 2, texto: 'Bom' },
        { valor: 3, texto: 'Ótimo' }
      ],
      itens: []
    };
    setFormCategorias([...formCategorias, novaCategoria]);
    setExpandedCategoria(formCategorias.length);
  };

  const handleRemoveCategoria = (index: number) => {
    setFormCategorias(formCategorias.filter((_, i) => i !== index));
    if (expandedCategoria === index) {
      setExpandedCategoria(null);
    }
  };

  const handleUpdateCategoria = (index: number, field: keyof Categoria, value: any) => {
    setFormCategorias(formCategorias.map((cat, i) => {
      if (i === index) {
        if (field === 'qtd_opcoes_resposta') {
          const qtd = parseInt(value) || 3;
          // Ajustar opções de resposta
          let novasOpcoes = [...cat.opcoes_resposta];
          if (qtd > novasOpcoes.length) {
            // Adicionar opções
            for (let j = novasOpcoes.length; j < qtd; j++) {
              novasOpcoes.push({ valor: j + 1, texto: '' });
            }
          } else if (qtd < novasOpcoes.length) {
            // Remover opções
            novasOpcoes = novasOpcoes.slice(0, qtd);
          }
          return { ...cat, qtd_opcoes_resposta: qtd, opcoes_resposta: novasOpcoes };
        }
        return { ...cat, [field]: value };
      }
      return cat;
    }));
  };

  const handleUpdateOpcaoResposta = (catIndex: number, opcaoIndex: number, texto: string) => {
    setFormCategorias(formCategorias.map((cat, i) => {
      if (i === catIndex) {
        const novasOpcoes = cat.opcoes_resposta.map((op, j) => 
          j === opcaoIndex ? { ...op, texto } : op
        );
        return { ...cat, opcoes_resposta: novasOpcoes };
      }
      return cat;
    }));
  };

  const handleAddItem = (catIndex: number) => {
    setFormCategorias(formCategorias.map((cat, i) => {
      if (i === catIndex) {
        return {
          ...cat,
          itens: [...cat.itens, { texto: '', ordem: cat.itens.length }]
        };
      }
      return cat;
    }));
  };

  const handleRemoveItem = (catIndex: number, itemIndex: number) => {
    setFormCategorias(formCategorias.map((cat, i) => {
      if (i === catIndex) {
        return {
          ...cat,
          itens: cat.itens.filter((_, j) => j !== itemIndex)
        };
      }
      return cat;
    }));
  };

  const handleUpdateItem = (catIndex: number, itemIndex: number, texto: string) => {
    setFormCategorias(formCategorias.map((cat, i) => {
      if (i === catIndex) {
        const novosItens = cat.itens.map((item, j) => 
          j === itemIndex ? { ...item, texto } : item
        );
        return { ...cat, itens: novosItens };
      }
      return cat;
    }));
  };

  const handleSave = async () => {
    if (!formNome.trim()) {
      toast.error('Digite o nome do modelo');
      return;
    }

    if (formCategorias.length === 0) {
      toast.error('Adicione pelo menos uma categoria');
      return;
    }

    // Validar categorias
    for (let i = 0; i < formCategorias.length; i++) {
      const cat = formCategorias[i];
      if (!cat.nome.trim()) {
        toast.error(`Digite o nome da categoria ${i + 1}`);
        return;
      }
      if (cat.itens.length === 0) {
        toast.error(`Adicione pelo menos um item na categoria "${cat.nome}"`);
        return;
      }
      for (let j = 0; j < cat.itens.length; j++) {
        if (!cat.itens[j].texto.trim()) {
          toast.error(`Digite o texto do item ${j + 1} na categoria "${cat.nome}"`);
          return;
        }
      }
      for (let j = 0; j < cat.opcoes_resposta.length; j++) {
        if (!cat.opcoes_resposta[j].texto.trim()) {
          toast.error(`Digite o texto da opção ${j + 1} na categoria "${cat.nome}"`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      let modeloId: string;

      if (editingModelo) {
        // Atualizar modelo existente
        const { error } = await db
          .from('avaliacao_reacao_modelos')
          .update({
            nome: formNome,
            descricao: formDescricao || null,
            campo_sugestoes: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingModelo.id);

        if (error) throw error;
        modeloId = editingModelo.id;

        // Deletar categorias antigas (cascade deleta opções e itens)
        await db
          .from('avaliacao_reacao_categorias')
          .delete()
          .eq('modelo_id', modeloId);

        // Deletar treinamentos antigos
        await db
          .from('avaliacao_reacao_modelo_treinamentos')
          .delete()
          .eq('modelo_id', modeloId);
      } else {
        // Criar novo modelo
        const { data, error } = await db
          .from('avaliacao_reacao_modelos')
          .insert({
            empresa_id: empresaId,
            nome: formNome,
            descricao: formDescricao || null,
            campo_sugestoes: true
          })
          .select('id')
          .single();

        if (error) throw error;
        modeloId = data.id;
      }

      // Inserir categorias
      for (let i = 0; i < formCategorias.length; i++) {
        const cat = formCategorias[i];
        
        const { data: catData, error: catError } = await db
          .from('avaliacao_reacao_categorias')
          .insert({
            modelo_id: modeloId,
            nome: cat.nome,
            ordem: i,
            qtd_opcoes_resposta: cat.qtd_opcoes_resposta
          })
          .select('id')
          .single();

        if (catError) throw catError;

        // Inserir opções de resposta
        const opcoesInsert = cat.opcoes_resposta.map(op => ({
          categoria_id: catData.id,
          valor: op.valor,
          texto: op.texto
        }));

        const { error: opcoesError } = await db
          .from('avaliacao_reacao_opcoes_resposta')
          .insert(opcoesInsert);

        if (opcoesError) throw opcoesError;

        // Inserir itens
        const itensInsert = cat.itens.map((item, j) => ({
          categoria_id: catData.id,
          texto: item.texto,
          ordem: j
        }));

        const { error: itensError } = await db
          .from('avaliacao_reacao_itens')
          .insert(itensInsert);

        if (itensError) throw itensError;
      }

      // Inserir treinamentos associados
      let treinamentosParaSalvar: string[] = [];
      if (modoTreinamentos === 'todos') {
        treinamentosParaSalvar = treinamentosDisponiveis.map(t => t.id);
      } else if (modoTreinamentos === 'exceto') {
        treinamentosParaSalvar = treinamentosDisponiveis
          .filter(t => !formTreinamentosExceto.includes(t.id))
          .map(t => t.id);
      } else {
        treinamentosParaSalvar = formTreinamentos;
      }

      if (treinamentosParaSalvar.length > 0) {
        const treinamentosInsert = treinamentosParaSalvar.map(treinamentoId => ({
          modelo_id: modeloId,
          treinamento_id: treinamentoId
        }));

        const { error: treinamentosError } = await db
          .from('avaliacao_reacao_modelo_treinamentos')
          .insert(treinamentosInsert);

        if (treinamentosError) throw treinamentosError;
      }

      toast.success(editingModelo ? 'Modelo atualizado com sucesso!' : 'Modelo criado com sucesso!');
      setDialogOpen(false);
      fetchModelos();
    } catch (error: any) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modeloToDelete) return;

    try {
      const { error } = await db
        .from('avaliacao_reacao_modelos')
        .delete()
        .eq('id', modeloToDelete.id);

      if (error) throw error;

      toast.success('Modelo excluído com sucesso!');
      setDeleteDialogOpen(false);
      setModeloToDelete(null);
      fetchModelos();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleToggleAtivo = async (modelo: Modelo) => {
    try {
      const { error } = await db
        .from('avaliacao_reacao_modelos')
        .update({ ativo: !modelo.ativo })
        .eq('id', modelo.id);

      if (error) throw error;

      toast.success(modelo.ativo ? 'Modelo desativado' : 'Modelo ativado');
      fetchModelos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleViewModelo = async (modelo: Modelo) => {
    setViewingModelo(modelo);
    await loadViewModeloCategorias(modelo.id);
    setViewDialogOpen(true);
  };

  const loadViewModeloCategorias = async (modeloId: string) => {
    try {
      const { data: categoriasData } = await db
        .from('avaliacao_reacao_categorias')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('ordem');

      const categoriasComDetalhes: Categoria[] = [];

      for (const cat of categoriasData || []) {
        const { data: opcoesData } = await db
          .from('avaliacao_reacao_opcoes_resposta')
          .select('*')
          .eq('categoria_id', cat.id)
          .order('valor');

        const { data: itensData } = await db
          .from('avaliacao_reacao_itens')
          .select('*')
          .eq('categoria_id', cat.id)
          .order('ordem');

        categoriasComDetalhes.push({
          id: cat.id,
          nome: cat.nome,
          ordem: cat.ordem,
          qtd_opcoes_resposta: cat.qtd_opcoes_resposta,
          opcoes_resposta: (opcoesData || []).map(o => ({
            id: o.id,
            valor: o.valor,
            texto: o.texto
          })),
          itens: (itensData || []).map(i => ({
            id: i.id,
            texto: i.texto,
            ordem: i.ordem
          }))
        });
      }

      setViewingModelo(prev => prev ? { ...prev, categorias: categoriasComDetalhes } : null);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-purple-600" />
            Avaliação de Reação
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie os modelos de avaliação de reação dos treinamentos
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Avaliação
        </Button>
      </div>

      {/* Tabela de Modelos */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : modelos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum modelo de avaliação cadastrado</p>
              <Button variant="link" onClick={() => handleOpenDialog()}>
                Cadastrar primeiro modelo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos.map((modelo) => (
                  <TableRow key={modelo.id}>
                    <TableCell className="font-medium">{modelo.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {modelo.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={modelo.ativo ? 'default' : 'secondary'}
                        className={modelo.ativo ? 'bg-green-100 text-green-700' : ''}
                      >
                        {modelo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(modelo.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewModelo(modelo)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(modelo)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAtivo(modelo)}
                          title={modelo.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {modelo.ativo ? (
                            <X className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setModeloToDelete(modelo);
                            setDeleteDialogOpen(true);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? 'Editar Modelo de Avaliação' : 'Novo Modelo de Avaliação'}
            </DialogTitle>
            <DialogDescription>
              Configure as categorias e opções de resposta do modelo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Dados básicos */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="nome">Nome do Modelo *</Label>
                <Input
                  id="nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Avaliação de Reação Padrão"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descrição opcional do modelo"
                  rows={2}
                />
              </div>
            </div>

            {/* Treinamentos */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Treinamentos Vinculados</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os treinamentos que utilizarão este modelo de avaliação
              </p>
              
              {/* Opções de modo */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="modo-todos"
                    name="modo-treinamentos"
                    checked={modoTreinamentos === 'todos'}
                    onChange={() => {
                      setModoTreinamentos('todos');
                      setFormTreinamentos([]);
                      setFormTreinamentosExceto([]);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="modo-todos" className="text-sm font-medium cursor-pointer">
                    Todos os treinamentos
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="modo-exceto"
                    name="modo-treinamentos"
                    checked={modoTreinamentos === 'exceto'}
                    onChange={() => {
                      setModoTreinamentos('exceto');
                      setFormTreinamentos([]);
                      setFormTreinamentosExceto([]);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="modo-exceto" className="text-sm font-medium cursor-pointer">
                    Todos os treinamentos, exceto...
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="modo-selecionar"
                    name="modo-treinamentos"
                    checked={modoTreinamentos === 'selecionar'}
                    onChange={() => {
                      setModoTreinamentos('selecionar');
                      setFormTreinamentos([]);
                      setFormTreinamentosExceto([]);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="modo-selecionar" className="text-sm font-medium cursor-pointer">
                    Selecionar treinamentos específicos
                  </label>
                </div>
              </div>

              {/* Dropdown para modo "exceto" */}
              {modoTreinamentos === 'exceto' && (
                <div className="mt-3">
                  <Popover open={treinamentosOpen} onOpenChange={(open) => {
                    setTreinamentosOpen(open);
                    if (!open) setTreinamentoSearch('');
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={treinamentosOpen}
                        className="w-full justify-between"
                      >
                        {formTreinamentosExceto.length === 0
                          ? "Selecione os treinamentos a excluir..."
                          : `${formTreinamentosExceto.length} treinamento(s) excluído(s)`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <div className="flex flex-col">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Buscar treinamento..."
                            className="h-9"
                            value={treinamentoSearch}
                            onChange={(e) => setTreinamentoSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {treinamentosDisponiveis
                              .filter(t => 
                                treinamentoSearch === '' ||
                                t.norma.toLowerCase().includes(treinamentoSearch.toLowerCase()) ||
                                t.nome.toLowerCase().includes(treinamentoSearch.toLowerCase())
                              )
                              .map((treinamento) => (
                              <div
                                key={treinamento.id}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                onClick={() => {
                                  setFormTreinamentosExceto(prev => 
                                    prev.includes(treinamento.id)
                                      ? prev.filter(id => id !== treinamento.id)
                                      : [...prev, treinamento.id]
                                  );
                                }}
                              >
                                <Checkbox
                                  checked={formTreinamentosExceto.includes(treinamento.id)}
                                  onCheckedChange={() => {
                                    setFormTreinamentosExceto(prev => 
                                      prev.includes(treinamento.id)
                                        ? prev.filter(id => id !== treinamento.id)
                                        : [...prev, treinamento.id]
                                    );
                                  }}
                                />
                                <span className="font-medium text-sm">{treinamento.norma}</span>
                                <span className="text-sm text-muted-foreground truncate">{treinamento.nome}</span>
                              </div>
                            ))}
                            {treinamentosDisponiveis.filter(t => 
                              treinamentoSearch === '' ||
                              t.norma.toLowerCase().includes(treinamentoSearch.toLowerCase()) ||
                              t.nome.toLowerCase().includes(treinamentoSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                Nenhum treinamento encontrado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {formTreinamentosExceto.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formTreinamentosExceto.map(id => {
                        const treinamento = treinamentosDisponiveis.find(t => t.id === id);
                        if (!treinamento) return null;
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {treinamento.norma} - {treinamento.nome}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => setFormTreinamentosExceto(prev => prev.filter(tid => tid !== id))}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown para modo "selecionar" */}
              {modoTreinamentos === 'selecionar' && (
                <div className="mt-3">
                  <Popover open={treinamentosOpen} onOpenChange={(open) => {
                    setTreinamentosOpen(open);
                    if (!open) setTreinamentoSearch('');
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={treinamentosOpen}
                        className="w-full justify-between"
                      >
                        {formTreinamentos.length === 0
                          ? "Selecione os treinamentos..."
                          : `${formTreinamentos.length} treinamento(s) selecionado(s)`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <div className="flex flex-col">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Buscar treinamento..."
                            className="h-9"
                            value={treinamentoSearch}
                            onChange={(e) => setTreinamentoSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {treinamentosDisponiveis
                              .filter(t => 
                                treinamentoSearch === '' ||
                                t.norma.toLowerCase().includes(treinamentoSearch.toLowerCase()) ||
                                t.nome.toLowerCase().includes(treinamentoSearch.toLowerCase())
                              )
                              .map((treinamento) => (
                              <div
                                key={treinamento.id}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                onClick={() => {
                                  setFormTreinamentos(prev => 
                                    prev.includes(treinamento.id)
                                      ? prev.filter(id => id !== treinamento.id)
                                      : [...prev, treinamento.id]
                                  );
                                }}
                              >
                                <Checkbox
                                  checked={formTreinamentos.includes(treinamento.id)}
                                  onCheckedChange={() => {
                                    setFormTreinamentos(prev => 
                                      prev.includes(treinamento.id)
                                        ? prev.filter(id => id !== treinamento.id)
                                        : [...prev, treinamento.id]
                                    );
                                  }}
                                />
                                <span className="font-medium text-sm">{treinamento.norma}</span>
                                <span className="text-sm text-muted-foreground truncate">{treinamento.nome}</span>
                              </div>
                            ))}
                            {treinamentosDisponiveis.filter(t => 
                              treinamentoSearch === '' ||
                              t.norma.toLowerCase().includes(treinamentoSearch.toLowerCase()) ||
                              t.nome.toLowerCase().includes(treinamentoSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                Nenhum treinamento encontrado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {formTreinamentos.length > 0 && modoTreinamentos === 'selecionar' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formTreinamentos.map(id => {
                    const treinamento = treinamentosDisponiveis.find(t => t.id === id);
                    if (!treinamento) return null;
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {treinamento.norma} - {treinamento.nome}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => setFormTreinamentos(prev => prev.filter(tid => tid !== id))}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Categorias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Categorias</Label>
                <Button variant="outline" size="sm" onClick={handleAddCategoria}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Categoria
                </Button>
              </div>

              {formCategorias.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  <p>Nenhuma categoria adicionada</p>
                  <Button variant="link" onClick={handleAddCategoria}>
                    Adicionar primeira categoria
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formCategorias.map((categoria, catIndex) => (
                    <Card key={catIndex} className="border-slate-200">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical className="h-4 w-4 text-slate-400" />
                            <Input
                              value={categoria.nome}
                              onChange={(e) => handleUpdateCategoria(catIndex, 'nome', e.target.value)}
                              placeholder="Nome da categoria"
                              className="max-w-xs"
                            />
                            <div className="flex items-center gap-2 ml-4">
                              <Label className="text-xs text-slate-500 whitespace-nowrap">Opções:</Label>
                              <Input
                                type="number"
                                min={2}
                                max={10}
                                value={categoria.qtd_opcoes_resposta}
                                onChange={(e) => handleUpdateCategoria(catIndex, 'qtd_opcoes_resposta', e.target.value)}
                                className="w-16 h-8"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedCategoria(expandedCategoria === catIndex ? null : catIndex)}
                            >
                              {expandedCategoria === catIndex ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCategoria(catIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {expandedCategoria === catIndex && (
                        <CardContent className="pt-0 pb-4 px-4">
                          {/* Opções de Resposta */}
                          <div className="mb-4">
                            <Label className="text-sm font-medium mb-2 block">
                              Opções de Resposta ({categoria.qtd_opcoes_resposta})
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                              {categoria.opcoes_resposta.map((opcao, opcaoIndex) => (
                                <div key={opcaoIndex} className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-slate-500 w-6">
                                    {opcao.valor}=
                                  </span>
                                  <Input
                                    value={opcao.texto}
                                    onChange={(e) => handleUpdateOpcaoResposta(catIndex, opcaoIndex, e.target.value)}
                                    placeholder={`Opção ${opcao.valor}`}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Itens/Perguntas */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium">
                                Itens/Perguntas ({categoria.itens.length})
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddItem(catIndex)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar Item
                              </Button>
                            </div>
                            
                            {categoria.itens.length === 0 ? (
                              <div className="text-center py-4 border border-dashed rounded text-sm text-muted-foreground">
                                Nenhum item adicionado
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {categoria.itens.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 w-6">{itemIndex + 1}.</span>
                                    <Input
                                      value={item.texto}
                                      onChange={(e) => handleUpdateItem(catIndex, itemIndex, e.target.value)}
                                      placeholder="Texto do item"
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleRemoveItem(catIndex, itemIndex)}
                                    >
                                      <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingModelo ? 'Salvar Alterações' : 'Criar Modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingModelo?.nome}</DialogTitle>
            <DialogDescription>
              {viewingModelo?.descricao || 'Visualização do modelo de avaliação'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {viewingModelo?.categorias?.map((categoria, catIndex) => (
              <Card key={catIndex}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{categoria.nome}</span>
                    <Badge variant="outline">
                      {categoria.qtd_opcoes_resposta} opções
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Opções de resposta */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categoria.opcoes_resposta.map((opcao, i) => (
                      <Badge key={i} variant="secondary">
                        {opcao.valor} = {opcao.texto}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Itens */}
                  <div className="space-y-1">
                    {categoria.itens.map((item, i) => (
                      <div key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400">{i + 1}.</span>
                        <span>{item.texto}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o modelo "{modeloToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
