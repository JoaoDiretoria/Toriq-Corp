import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Search,
  Loader2,
  Package,
  DollarSign,
  Star,
  Clock,
  Tag,
} from 'lucide-react';

// ID fixo da empresa Toriq
const TORIQ_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

interface Servico {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  tipo: string | null;
  preco: number | null;
  unidade: string | null;
  duracao_estimada: string | null;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

const categorias = [
  'Consultoria',
  'Treinamento',
  'Auditoria',
  'Documentação',
  'Assessoria',
  'Software',
  'Outros',
];

const tipos = [
  { value: 'servico', label: 'Serviço' },
  { value: 'produto', label: 'Produto' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'treinamento', label: 'Treinamento' },
];

const unidades = [
  { value: 'hora', label: 'Por Hora' },
  { value: 'dia', label: 'Por Dia' },
  { value: 'projeto', label: 'Por Projeto' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'unidade', label: 'Por Unidade' },
];

export function AdminServicos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [servicoToDelete, setServicoToDelete] = useState<Servico | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    tipo: '',
    preco: '',
    unidade: '',
    duracao_estimada: '',
    ativo: true,
    destaque: false,
  });

  const empresaId = TORIQ_EMPRESA_ID;

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('servicos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true })
        .order('nome');
      
      if (error) throw error;
      setServicos((data || []) as Servico[]);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os serviços.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (servico?: Servico) => {
    if (servico) {
      setEditingServico(servico);
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao || '',
        categoria: servico.categoria || '',
        tipo: servico.tipo || '',
        preco: servico.preco?.toString() || '',
        unidade: servico.unidade || '',
        duracao_estimada: servico.duracao_estimada || '',
        ativo: servico.ativo,
        destaque: servico.destaque,
      });
    } else {
      setEditingServico(null);
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        tipo: '',
        preco: '',
        unidade: '',
        duracao_estimada: '',
        ativo: true,
        destaque: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do serviço é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        empresa_id: empresaId,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        categoria: formData.categoria || null,
        tipo: formData.tipo || null,
        preco: formData.preco ? parseFloat(formData.preco) : null,
        unidade: formData.unidade || null,
        duracao_estimada: formData.duracao_estimada.trim() || null,
        ativo: formData.ativo,
        destaque: formData.destaque,
      };

      if (editingServico) {
        const { error } = await (supabase as any)
          .from('servicos')
          .update(payload)
          .eq('id', editingServico.id);
        
        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Serviço atualizado com sucesso.',
        });
      } else {
        const { error } = await (supabase as any)
          .from('servicos')
          .insert(payload);
        
        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Serviço cadastrado com sucesso.',
        });
      }

      setDialogOpen(false);
      fetchServicos();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o serviço.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!servicoToDelete) return;

    try {
      const { error } = await (supabase as any)
        .from('servicos')
        .delete()
        .eq('id', servicoToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Serviço excluído com sucesso.',
      });
      
      setDeleteDialogOpen(false);
      setServicoToDelete(null);
      fetchServicos();
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o serviço.',
        variant: 'destructive',
      });
    }
  };

  const filteredServicos = servicos.filter((servico) => {
    const matchesSearch = servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategoria = filterCategoria === 'todos' || servico.categoria === filterCategoria;
    const matchesStatus = filterStatus === 'todos' || 
      (filterStatus === 'ativos' && servico.ativo) ||
      (filterStatus === 'inativos' && !servico.ativo);
    return matchesSearch && matchesCategoria && matchesStatus;
  });

  const stats = {
    total: servicos.length,
    ativos: servicos.filter(s => s.ativo).length,
    destaques: servicos.filter(s => s.destaque).length,
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Serviços
          </h2>
          <p className="text-muted-foreground">
            Gerencie os serviços oferecidos pela Toriq
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Serviços</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Tag className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ativos}</p>
                <p className="text-sm text-muted-foreground">Serviços Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.destaques}</p>
                <p className="text-sm text-muted-foreground">Em Destaque</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-[180px] bg-background border-border">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-full md:w-[150px] bg-background border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredServicos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum serviço encontrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Serviço
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Preço</TableHead>
                  <TableHead className="text-muted-foreground">Unidade</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos.map((servico) => (
                  <TableRow key={servico.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {servico.destaque && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{servico.nome}</p>
                          {servico.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {servico.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {servico.categoria ? (
                        <Badge variant="outline" className="border-border">
                          {servico.categoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tipos.find(t => t.value === servico.tipo)?.label || servico.tipo || '-'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatCurrency(servico.preco)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {unidades.find(u => u.value === servico.unidade)?.label || servico.unidade || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={servico.ativo ? 'default' : 'secondary'}
                        className={servico.ativo ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                      >
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => handleOpenDialog(servico)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setServicoToDelete(servico);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
            <DialogDescription>
              {editingServico 
                ? 'Atualize as informações do serviço' 
                : 'Preencha os dados para cadastrar um novo serviço'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome do Serviço *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Consultoria em SST"
                className="bg-background border-border"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o serviço..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria || undefined}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo || undefined}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="preco">Preço (R$)</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="0,00"
                className="bg-background border-border"
              />
            </div>

            <div>
              <Label htmlFor="unidade">Unidade de Cobrança</Label>
              <Select
                value={formData.unidade || undefined}
                onValueChange={(value) => setFormData({ ...formData, unidade: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.value} value={unidade.value}>{unidade.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duracao">Duração Estimada</Label>
              <Input
                id="duracao"
                value={formData.duracao_estimada}
                onChange={(e) => setFormData({ ...formData, duracao_estimada: e.target.value })}
                placeholder="Ex: 2 horas, 1 dia..."
                className="bg-background border-border"
              />
            </div>

            <div className="flex items-center gap-6 pt-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="destaque"
                  checked={formData.destaque}
                  onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="destaque" className="cursor-pointer flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Destaque
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {editingServico ? 'Salvar Alterações' : 'Cadastrar Serviço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{servicoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
