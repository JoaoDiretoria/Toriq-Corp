import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Pencil, Trash2, Upload, Download, Users, Power } from 'lucide-react';
import { ColaboradorDialog } from './ColaboradorDialog';
import { ColaboradorImportCSV } from './ColaboradorImportCSV';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Colaborador {
  id: string;
  empresa_id: string;
  matricula: string | null;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  grupo_homogeneo_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  foto_url?: string | null;
  codigo_facial?: string | null;
  grupo_homogeneo?: {
    id: string;
    nome: string;
  } | null;
  treinamentos?: {
    treinamento_id: string;
    catalogo_treinamentos: {
      id: string;
      nome: string;
      norma: string;
    };
  }[];
}

export function ClienteColaboradores() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [deletingColaborador, setDeletingColaborador] = useState<Colaborador | null>(null);

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ['colaboradores', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          grupo_homogeneo:grupos_homogeneos(id, nome),
          treinamentos:colaboradores_treinamentos(
            treinamento_id,
            catalogo_treinamentos(id, nome, norma)
          )
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('nome');
      if (error) throw error;
      return data as unknown as Colaborador[];
    },
    enabled: !!profile?.empresa_id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Colaborador excluído com sucesso' });
      setDeletingColaborador(null);
    },
    onError: () => {
      toast({ title: 'Erro ao excluir colaborador', variant: 'destructive' });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ 
        title: variables.ativo 
          ? 'Colaborador ativado com sucesso' 
          : 'Colaborador inativado com sucesso' 
      });
    },
    onError: () => {
      toast({ title: 'Erro ao alterar status do colaborador', variant: 'destructive' });
    },
  });

  const filteredColaboradores = colaboradores?.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.setor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingColaborador(null);
  };

  const handleExportCSV = (type: 'all' | 'active' | 'filtered') => {
    let data = colaboradores || [];
    if (type === 'active') data = data.filter(c => c.ativo);
    if (type === 'filtered') data = filteredColaboradores || [];

    const headers = [
      'nome', 'cpf', 'matricula', 'cargo', 'setor', 'grupo_homogeneo',
      'email', 'telefone', 'data_admissao', 'data_nascimento', 'rg',
      'sexo', 'endereco', 'bairro', 'cidade', 'estado', 'cep',
      'treinamentos', 'ativo',
    ];

    const rows = data.map(c => {
      const col = c as any;
      return [
        col.nome || '',
        col.cpf || '',
        col.matricula || '',
        col.cargo || '',
        col.setor || '',
        col.grupo_homogeneo?.nome || '',
        col.email || '',
        col.telefone || '',
        col.data_admissao || '',
        col.data_nascimento || '',
        col.rg || '',
        col.sexo || '',
        col.endereco || '',
        col.bairro || '',
        col.cidade || '',
        col.estado || '',
        col.cep || '',
        (col.treinamentos || []).map((t: any) => t.catalogo_treinamentos?.norma || '').filter(Boolean).join('; '),
        col.ativo ? 'Sim' : 'Não',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie os colaboradores da sua empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportCSV('all')}>
                Todos os colaboradores ({colaboradores?.length || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCSV('active')}>
                Apenas ativos ({colaboradores?.filter(c => c.ativo).length || 0})
              </DropdownMenuItem>
              {searchTerm && (
                <DropdownMenuItem onClick={() => handleExportCSV('filtered')}>
                  Resultado da busca ({filteredColaboradores?.length || 0})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Colaboradores
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredColaboradores?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhum colaborador encontrado para a busca.'
                : 'Nenhum colaborador cadastrado. Clique em "Novo Colaborador" para começar.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>G.H Treinamentos</TableHead>
                    <TableHead>Treinamentos</TableHead>
                    <TableHead>Ativo/Inativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores?.map((colaborador) => (
                    <TableRow 
                      key={colaborador.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${!colaborador.ativo ? 'opacity-60' : ''}`}
                      onClick={() => navigate(`/colaborador/${colaborador.id}`)}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {colaborador.matricula || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {colaborador.nome}
                      </TableCell>
                      <TableCell>{colaborador.cargo || '-'}</TableCell>
                      <TableCell>{colaborador.setor || '-'}</TableCell>
                      <TableCell>
                        {colaborador.grupo_homogeneo?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {colaborador.treinamentos && colaborador.treinamentos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {colaborador.treinamentos.map((t) => (
                              <Badge key={t.treinamento_id} variant="outline" className="text-xs">
                                {t.catalogo_treinamentos?.norma}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={colaborador.ativo ? 'default' : 'outline'}
                          size="sm"
                          className={colaborador.ativo 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'text-muted-foreground hover:text-foreground'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAtivoMutation.mutate({ 
                              id: colaborador.id, 
                              ativo: !colaborador.ativo 
                            });
                          }}
                          disabled={toggleAtivoMutation.isPending}
                        >
                          <Power className="h-4 w-4 mr-1" />
                          {colaborador.ativo ? 'Ativo' : 'Inativo'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(colaborador);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingColaborador(colaborador);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ColaboradorDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        colaborador={editingColaborador}
      />

      <ColaboradorImportCSV
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <AlertDialog
        open={!!deletingColaborador}
        onOpenChange={() => setDeletingColaborador(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o colaborador "{deletingColaborador?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingColaborador && deleteMutation.mutate(deletingColaborador.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
