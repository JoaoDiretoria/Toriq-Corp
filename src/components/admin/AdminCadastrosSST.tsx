import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Pencil, Trash2, FileText, BookOpen, HardHat, UserCheck, Building } from 'lucide-react';
import type { CadastroSubSection } from './AdminSidebar';

// ==================== TIPOS ====================

interface NormaRegulamentadora {
  id: string;
  nr: string;
  descricao: string | null;
  empresa_id: string;
}

interface CatalogoTreinamento {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number;
  ch_formacao_obrigatoria: boolean | null;
  ch_reciclagem: number;
  ch_reciclagem_obrigatoria: boolean | null;
  validade: string;
  empresa_id: string;
}

interface Empresa {
  id: string;
  nome: string;
  tipo: string;
}

interface AdminCadastrosSSTProps {
  activeSubSection: CadastroSubSection;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function AdminCadastrosSST({ activeSubSection }: AdminCadastrosSSTProps) {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  // Carregar empresas SST para seleção
  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, tipo')
        .in('tipo', ['sst', 'vertical_on'])
        .order('nome');

      if (error) {
        toast({
          title: "Erro ao carregar empresas",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmpresas(data || []);
        if (data && data.length > 0) {
          setSelectedEmpresaId(data[0].id);
        }
      }
      setLoadingEmpresas(false);
    };

    fetchEmpresas();
  }, []);

  if (loadingEmpresas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getTitle = () => {
    switch (activeSubSection) {
      case 'normas-regulamentadoras':
        return { icon: FileText, title: 'Normas Regulamentadoras', description: 'Gerencie as NRs utilizadas nos treinamentos' };
      case 'catalogo-treinamentos':
        return { icon: BookOpen, title: 'Catálogo de Treinamentos', description: 'Gerencie os treinamentos disponíveis' };
      case 'instrutores':
        return { icon: UserCheck, title: 'Instrutores', description: 'Gerencie os instrutores cadastrados' };
      case 'empresas-parceiras':
        return { icon: Building, title: 'Empresas Parceiras', description: 'Gerencie as empresas parceiras' };
      default:
        return { icon: HardHat, title: 'Cadastros SST', description: 'Gerencie os cadastros do módulo SST' };
    }
  };

  const titleInfo = getTitle();
  const TitleIcon = titleInfo.icon;

  const renderContent = () => {
    switch (activeSubSection) {
      case 'normas-regulamentadoras':
        return <NormasTab empresaId={selectedEmpresaId} />;
      case 'catalogo-treinamentos':
        return <TreinamentosTab empresaId={selectedEmpresaId} />;
      case 'instrutores':
        return <InstrutoresPlaceholder />;
      case 'empresas-parceiras':
        return <EmpresasParceirasPlaceholder />;
      default:
        return <NormasTab empresaId={selectedEmpresaId} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TitleIcon className="h-6 w-6" />
          {titleInfo.title}
        </h1>
        <p className="text-muted-foreground">
          {titleInfo.description}
        </p>
      </div>

      {/* Seletor de Empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Empresa</CardTitle>
          <CardDescription>
            Selecione a empresa para gerenciar seus cadastros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione uma empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome} ({empresa.tipo === 'sst' ? 'SST' : 'Toriq'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Conteúdo baseado na subseção ativa */}
      {renderContent()}
    </div>
  );
}

// Placeholder para Instrutores (a ser implementado)
function InstrutoresPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instrutores</CardTitle>
        <CardDescription>
          Funcionalidade em desenvolvimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          O cadastro de instrutores será implementado em breve.
        </p>
      </CardContent>
    </Card>
  );
}

// Placeholder para Empresas Parceiras (a ser implementado)
function EmpresasParceirasPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas Parceiras</CardTitle>
        <CardDescription>
          Funcionalidade em desenvolvimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          O cadastro de empresas parceiras será implementado em breve.
        </p>
      </CardContent>
    </Card>
  );
}

// ==================== TAB NORMAS REGULAMENTADORAS ====================

function NormasTab({ empresaId }: { empresaId: string }) {
  const { toast } = useToast();
  const [normas, setNormas] = useState<NormaRegulamentadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNorma, setSelectedNorma] = useState<NormaRegulamentadora | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nr: '',
    descricao: '',
  });

  const fetchNormas = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('normas_regulamentadoras')
      .select('id, nr, descricao, empresa_id')
      .eq('empresa_id', empresaId)
      .order('nr');

    if (error) {
      toast({
        title: "Erro ao carregar normas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNormas((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNormas();
  }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const { error } = await supabase
      .from('normas_regulamentadoras')
      .insert({
        empresa_id: empresaId,
        nr: formData.nr,
        descricao: formData.descricao || null,
      } as any);

    if (error) {
      toast({
        title: "Erro ao cadastrar norma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Norma cadastrada",
        description: "A norma regulamentadora foi adicionada com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
      fetchNormas();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNorma) return;

    const { error } = await supabase
      .from('normas_regulamentadoras')
      .update({
        nr: formData.nr,
        descricao: formData.descricao || null,
      })
      .eq('id', selectedNorma.id);

    if (error) {
      toast({
        title: "Erro ao atualizar norma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Norma atualizada",
        description: "Os dados foram atualizados com sucesso.",
      });
      setEditDialogOpen(false);
      setSelectedNorma(null);
      resetForm();
      fetchNormas();
    }
  };

  const handleDelete = async () => {
    if (!selectedNorma) return;

    const { error } = await supabase
      .from('normas_regulamentadoras')
      .delete()
      .eq('id', selectedNorma.id);

    if (error) {
      toast({
        title: "Erro ao excluir norma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Norma excluída",
        description: "A norma foi removida com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedNorma(null);
      fetchNormas();
    }
  };

  const openEditDialog = (norma: NormaRegulamentadora) => {
    setSelectedNorma(norma);
    setFormData({
      nr: norma.nr,
      descricao: norma.descricao || '',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (norma: NormaRegulamentadora) => {
    setSelectedNorma(norma);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nr: '',
      descricao: '',
    });
  };

  const filteredNormas = normas.filter(norma =>
    norma.nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (norma.descricao && norma.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Normas Regulamentadoras</CardTitle>
            <CardDescription>
              Cadastre as NRs que serão utilizadas nos treinamentos
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova NR
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova NR</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nr">Número da NR *</Label>
                  <Input
                    id="nr"
                    value={formData.nr}
                    onChange={(e) => setFormData({ ...formData, nr: e.target.value })}
                    placeholder="Ex: NR-35"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição da norma"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNormas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma norma encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredNormas.map((norma) => (
                <TableRow key={norma.id}>
                  <TableCell className="font-medium">{norma.nr}</TableCell>
                  <TableCell className="max-w-xs truncate">{norma.descricao || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(norma)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(norma)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedNorma(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar NR</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nr">Número da NR *</Label>
              <Input
                id="edit-nr"
                value={formData.nr}
                onChange={(e) => setFormData({ ...formData, nr: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a norma "{selectedNorma?.nr}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedNorma(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ==================== TAB CATÁLOGO DE TREINAMENTOS ====================

function TreinamentosTab({ empresaId }: { empresaId: string }) {
  const { toast } = useToast();
  const [treinamentos, setTreinamentos] = useState<CatalogoTreinamento[]>([]);
  const [normas, setNormas] = useState<NormaRegulamentadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<CatalogoTreinamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    norma: '',
    ch_formacao: 8,
    ch_formacao_obrigatoria: false,
    ch_reciclagem: 4,
    ch_reciclagem_obrigatoria: false,
    validade: '12 meses',
  });

  const fetchData = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    
    // Buscar treinamentos
    const { data: treinamentosData, error: treinamentosError } = await supabase
      .from('catalogo_treinamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (treinamentosError) {
      toast({
        title: "Erro ao carregar treinamentos",
        description: treinamentosError.message,
        variant: "destructive",
      });
    } else {
      setTreinamentos(treinamentosData || []);
    }

    // Buscar normas para o select
    const { data: normasData } = await supabase
      .from('normas_regulamentadoras')
      .select('id, nr, descricao, empresa_id')
      .eq('empresa_id', empresaId)
      .order('nr');

    setNormas((normasData as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const { error } = await supabase
      .from('catalogo_treinamentos')
      .insert({
        empresa_id: empresaId,
        nome: formData.nome,
        norma: formData.norma,
        ch_formacao: formData.ch_formacao,
        ch_formacao_obrigatoria: formData.ch_formacao_obrigatoria,
        ch_reciclagem: formData.ch_reciclagem,
        ch_reciclagem_obrigatoria: formData.ch_reciclagem_obrigatoria,
        validade: formData.validade,
      });

    if (error) {
      toast({
        title: "Erro ao cadastrar treinamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Treinamento cadastrado",
        description: "O treinamento foi adicionado ao catálogo.",
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreinamento) return;

    const { error } = await supabase
      .from('catalogo_treinamentos')
      .update({
        nome: formData.nome,
        norma: formData.norma,
        ch_formacao: formData.ch_formacao,
        ch_formacao_obrigatoria: formData.ch_formacao_obrigatoria,
        ch_reciclagem: formData.ch_reciclagem,
        ch_reciclagem_obrigatoria: formData.ch_reciclagem_obrigatoria,
        validade: formData.validade,
      })
      .eq('id', selectedTreinamento.id);

    if (error) {
      toast({
        title: "Erro ao atualizar treinamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Treinamento atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });
      setEditDialogOpen(false);
      setSelectedTreinamento(null);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedTreinamento) return;

    const { error } = await supabase
      .from('catalogo_treinamentos')
      .delete()
      .eq('id', selectedTreinamento.id);

    if (error) {
      toast({
        title: "Erro ao excluir treinamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Treinamento excluído",
        description: "O treinamento foi removido do catálogo.",
      });
      setDeleteDialogOpen(false);
      setSelectedTreinamento(null);
      fetchData();
    }
  };

  const openEditDialog = (treinamento: CatalogoTreinamento) => {
    setSelectedTreinamento(treinamento);
    setFormData({
      nome: treinamento.nome,
      norma: treinamento.norma,
      ch_formacao: treinamento.ch_formacao,
      ch_formacao_obrigatoria: treinamento.ch_formacao_obrigatoria || false,
      ch_reciclagem: treinamento.ch_reciclagem,
      ch_reciclagem_obrigatoria: treinamento.ch_reciclagem_obrigatoria || false,
      validade: treinamento.validade,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (treinamento: CatalogoTreinamento) => {
    setSelectedTreinamento(treinamento);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      norma: '',
      ch_formacao: 8,
      ch_formacao_obrigatoria: false,
      ch_reciclagem: 4,
      ch_reciclagem_obrigatoria: false,
      validade: '12 meses',
    });
  };

  const filteredTreinamentos = treinamentos.filter(t =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.norma.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const TreinamentoForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Treinamento *</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Ex: Trabalho em Altura"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="norma">Norma Regulamentadora *</Label>
        <Select
          value={formData.norma}
          onValueChange={(value) => setFormData({ ...formData, norma: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a NR" />
          </SelectTrigger>
          <SelectContent>
            {normas.map((norma) => (
              <SelectItem key={norma.id} value={norma.nr}>
                {norma.nr} {norma.descricao ? `- ${norma.descricao}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ch_formacao">CH Formação (horas)</Label>
          <Input
            id="ch_formacao"
            type="number"
            min="1"
            value={formData.ch_formacao}
            onChange={(e) => setFormData({ ...formData, ch_formacao: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch_reciclagem">CH Reciclagem (horas)</Label>
          <Input
            id="ch_reciclagem"
            type="number"
            min="1"
            value={formData.ch_reciclagem}
            onChange={(e) => setFormData({ ...formData, ch_reciclagem: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ch_formacao_obrigatoria"
            checked={formData.ch_formacao_obrigatoria}
            onCheckedChange={(checked) => setFormData({ ...formData, ch_formacao_obrigatoria: !!checked })}
          />
          <Label htmlFor="ch_formacao_obrigatoria" className="text-sm">
            CH Formação Obrigatória
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ch_reciclagem_obrigatoria"
            checked={formData.ch_reciclagem_obrigatoria}
            onCheckedChange={(checked) => setFormData({ ...formData, ch_reciclagem_obrigatoria: !!checked })}
          />
          <Label htmlFor="ch_reciclagem_obrigatoria" className="text-sm">
            CH Reciclagem Obrigatória
          </Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="validade">Validade</Label>
        <Select
          value={formData.validade}
          onValueChange={(value) => setFormData({ ...formData, validade: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a validade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6 meses">6 meses</SelectItem>
            <SelectItem value="12 meses">12 meses</SelectItem>
            <SelectItem value="24 meses">24 meses</SelectItem>
            <SelectItem value="36 meses">36 meses</SelectItem>
            <SelectItem value="Indeterminado">Indeterminado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditDialogOpen(false); }}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Catálogo de Treinamentos</CardTitle>
            <CardDescription>
              Cadastre os treinamentos disponíveis para a matriz
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Treinamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Treinamento</DialogTitle>
              </DialogHeader>
              <TreinamentoForm onSubmit={handleSubmit} submitLabel="Cadastrar" />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou norma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Norma</TableHead>
              <TableHead>CH Formação</TableHead>
              <TableHead>CH Reciclagem</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTreinamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum treinamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTreinamentos.map((treinamento) => (
                <TableRow key={treinamento.id}>
                  <TableCell className="font-medium">{treinamento.nome}</TableCell>
                  <TableCell>{treinamento.norma}</TableCell>
                  <TableCell>{treinamento.ch_formacao}h</TableCell>
                  <TableCell>{treinamento.ch_reciclagem}h</TableCell>
                  <TableCell>{treinamento.validade}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(treinamento)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(treinamento)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedTreinamento(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
          </DialogHeader>
          <TreinamentoForm onSubmit={handleEdit} submitLabel="Salvar" />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o treinamento "{selectedTreinamento?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTreinamento(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
