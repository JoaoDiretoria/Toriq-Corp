import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { GraduationCap, Loader2, Plus, Pencil, Trash2, Search, Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addMonths, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Treinamento {
  id: string;
  empresa_id: string;
  nome_treinamento: string;
  instrutor: string;
  data_realizacao: string;
  validade_meses: number;
  participantes: string;
  created_at: string;
  updated_at: string;
}

export default function GestaoTreinamentos() {
  const { profile } = useAuth();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<Treinamento | null>(null);
  const [treinamentoToDelete, setTreinamentoToDelete] = useState<Treinamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome_treinamento: '',
    instrutor: '',
    data_realizacao: '',
    validade_meses: '12',
    participantes: '',
  });

  useEffect(() => {
    if (profile?.empresa_id) {
      fetchTreinamentos();
      logView('Treinamentos', 'Gestão de Treinamentos', 'Acessou a página de gestão de treinamentos');
    }
  }, [profile?.empresa_id]);

  const fetchTreinamentos = async () => {
    if (!profile?.empresa_id) return;

    const { data, error } = await supabase
      .from('treinamentos')
      .select('*')
      .eq('empresa_id', profile.empresa_id)
      .order('data_realizacao', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar treinamentos');
      console.error(error);
    } else {
      setTreinamentos(data || []);
    }
    setLoading(false);
  };

  const calcularValidade = (dataRealizacao: string, validadeMeses: number) => {
    const dataFim = addMonths(parseISO(dataRealizacao), validadeMeses);
    const hoje = new Date();
    return isBefore(hoje, dataFim);
  };

  const getDataVencimento = (dataRealizacao: string, validadeMeses: number) => {
    return addMonths(parseISO(dataRealizacao), validadeMeses);
  };

  const getStatusBadge = (dataRealizacao: string, validadeMeses: number) => {
    const valido = calcularValidade(dataRealizacao, validadeMeses);
    if (valido) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Válido
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Vencido
      </Badge>
    );
  };

  const resetForm = () => {
    setFormData({
      nome_treinamento: '',
      instrutor: '',
      data_realizacao: '',
      validade_meses: '12',
      participantes: '',
    });
    setSelectedTreinamento(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) {
      toast.error('Você precisa estar vinculado a uma empresa');
      return;
    }
    
    if (!formData.nome_treinamento || !formData.instrutor || !formData.data_realizacao || !formData.participantes) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setSaving(true);

    const { error } = await supabase
      .from('treinamentos')
      .insert({
        empresa_id: profile.empresa_id,
        nome_treinamento: formData.nome_treinamento,
        instrutor: formData.instrutor,
        data_realizacao: formData.data_realizacao,
        validade_meses: Number(formData.validade_meses),
        participantes: formData.participantes,
      });

    if (error) {
      toast.error('Erro ao cadastrar treinamento: ' + error.message);
    } else {
      toast.success('Treinamento cadastrado com sucesso!');
      logCreate('Treinamentos', 'Gestão de Treinamentos', `Criou treinamento: ${formData.nome_treinamento}`, { nome: formData.nome_treinamento });
      setCreateDialogOpen(false);
      resetForm();
      fetchTreinamentos();
    }
    setSaving(false);
  };

  const openEditDialog = (treinamento: Treinamento) => {
    setSelectedTreinamento(treinamento);
    setFormData({
      nome_treinamento: treinamento.nome_treinamento,
      instrutor: treinamento.instrutor,
      data_realizacao: treinamento.data_realizacao,
      validade_meses: String(treinamento.validade_meses),
      participantes: treinamento.participantes,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreinamento) return;
    
    if (!formData.nome_treinamento || !formData.instrutor || !formData.data_realizacao || !formData.participantes) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setSaving(true);

    const { error } = await supabase
      .from('treinamentos')
      .update({
        nome_treinamento: formData.nome_treinamento,
        instrutor: formData.instrutor,
        data_realizacao: formData.data_realizacao,
        validade_meses: Number(formData.validade_meses),
        participantes: formData.participantes,
      })
      .eq('id', selectedTreinamento.id);

    if (error) {
      toast.error('Erro ao atualizar treinamento: ' + error.message);
    } else {
      toast.success('Treinamento atualizado com sucesso!');
      logUpdate('Treinamentos', 'Gestão de Treinamentos', `Atualizou treinamento: ${formData.nome_treinamento}`, { id: selectedTreinamento.id, nome: formData.nome_treinamento });
      setEditDialogOpen(false);
      resetForm();
      fetchTreinamentos();
    }
    setSaving(false);
  };

  const openDeleteDialog = (treinamento: Treinamento) => {
    setTreinamentoToDelete(treinamento);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!treinamentoToDelete) return;
    
    setDeleting(true);

    const { error } = await supabase
      .from('treinamentos')
      .delete()
      .eq('id', treinamentoToDelete.id);

    if (error) {
      toast.error('Erro ao excluir treinamento: ' + error.message);
    } else {
      toast.success('Treinamento excluído com sucesso!');
      logDelete('Treinamentos', 'Gestão de Treinamentos', `Excluiu treinamento: ${treinamentoToDelete.nome_treinamento}`, { id: treinamentoToDelete.id, nome: treinamentoToDelete.nome_treinamento });
      fetchTreinamentos();
    }
    
    setDeleting(false);
    setDeleteDialogOpen(false);
    setTreinamentoToDelete(null);
  };

  const filteredTreinamentos = treinamentos.filter((t) => {
    const matchSearch = 
      t.nome_treinamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.instrutor.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchSearch;
    
    const isValid = calcularValidade(t.data_realizacao, t.validade_meses);
    if (filterStatus === 'valido') return matchSearch && isValid;
    if (filterStatus === 'vencido') return matchSearch && !isValid;
    
    return matchSearch;
  });

  const FormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-nome`}>Nome do Treinamento *</Label>
        <Input
          id={`${isEdit ? 'edit' : 'create'}-nome`}
          value={formData.nome_treinamento}
          onChange={(e) => setFormData({ ...formData, nome_treinamento: e.target.value })}
          placeholder="Ex: NR-35 Trabalho em Altura"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-instrutor`}>Instrutor *</Label>
        <Input
          id={`${isEdit ? 'edit' : 'create'}-instrutor`}
          value={formData.instrutor}
          onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
          placeholder="Nome do instrutor"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit' : 'create'}-data`}>Data de Realização *</Label>
          <Input
            id={`${isEdit ? 'edit' : 'create'}-data`}
            type="date"
            value={formData.data_realizacao}
            onChange={(e) => setFormData({ ...formData, data_realizacao: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit' : 'create'}-validade`}>Validade (meses) *</Label>
          <Select
            value={formData.validade_meses}
            onValueChange={(value) => setFormData({ ...formData, validade_meses: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
              <SelectItem value="36">36 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit' : 'create'}-participantes`}>Participantes *</Label>
        <Textarea
          id={`${isEdit ? 'edit' : 'create'}-participantes`}
          value={formData.participantes}
          onChange={(e) => setFormData({ ...formData, participantes: e.target.value })}
          placeholder="Digite os nomes dos participantes, um por linha ou separados por vírgula"
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Insira os nomes separados por vírgula ou um por linha
        </p>
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
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você precisa estar vinculado a uma empresa para acessar este módulo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Gestão de Treinamentos
          </h1>
          <p className="text-muted-foreground mt-1">Controle os treinamentos e capacitações da sua equipe</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Treinamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Treinamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <FormFields />
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Treinamentos</p>
                <p className="text-2xl font-bold">{treinamentos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Válidos</p>
                <p className="text-2xl font-bold text-green-600">
                  {treinamentos.filter(t => calcularValidade(t.data_realizacao, t.validade_meses)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-destructive">
                  {treinamentos.filter(t => !calcularValidade(t.data_realizacao, t.validade_meses)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou instrutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="valido">Válidos</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredTreinamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum treinamento encontrado</p>
              </div>
            ) : (
              filteredTreinamentos.map((treinamento) => (
                <div key={treinamento.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{treinamento.nome_treinamento}</p>
                      <p className="text-sm text-muted-foreground">{treinamento.instrutor}</p>
                    </div>
                    {getStatusBadge(treinamento.data_realizacao, treinamento.validade_meses)}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(treinamento.data_realizacao), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {treinamento.participantes.split(/[,\n]/).filter(p => p.trim()).length} participantes
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {format(getDataVencimento(treinamento.data_realizacao, treinamento.validade_meses), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Instrutor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreinamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum treinamento encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTreinamentos.map((treinamento) => (
                    <TableRow key={treinamento.id}>
                      <TableCell className="font-medium">{treinamento.nome_treinamento}</TableCell>
                      <TableCell>{treinamento.instrutor}</TableCell>
                      <TableCell>{format(parseISO(treinamento.data_realizacao), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{format(getDataVencimento(treinamento.data_realizacao, treinamento.validade_meses), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {treinamento.participantes.split(/[,\n]/).filter(p => p.trim()).length}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(treinamento.data_realizacao, treinamento.validade_meses)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(treinamento)}>
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
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormFields isEdit />
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o treinamento <strong>{treinamentoToDelete?.nome_treinamento}</strong>?
              <br /><br />
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
