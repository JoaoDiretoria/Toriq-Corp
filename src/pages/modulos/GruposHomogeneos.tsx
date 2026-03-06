import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GrupoHomogeneo {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  cargo_id: string | null;
  cargo_nome: string | null;
  nome: string;
  agente_nocivo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  treinamentos?: {
    id: string;
    treinamento_id: string;
    catalogo_treinamentos: {
      id: string;
      nome: string;
      norma: string;
    };
  }[];
}


interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

const GruposHomogeneos = () => {
  const { profile, empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const queryClient = useQueryClient();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoHomogeneo | null>(null);
  const [deletingGrupo, setDeletingGrupo] = useState<GrupoHomogeneo | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Form state
  const [cargoNome, setCargoNome] = useState('');
  const [agenteNocivo, setAgenteNocivo] = useState('');
  const [selectedTreinamentos, setSelectedTreinamentos] = useState<string[]>([]);

  // Fetch grupos homogêneos
  const { data: grupos, isLoading } = useQuery({
    queryKey: ['grupos-homogeneos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('grupos_homogeneos')
        .select(`
          *,
          treinamentos:grupos_homogeneos_treinamentos(
            id,
            treinamento_id,
            catalogo_treinamentos(id, nome, norma)
          )
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GrupoHomogeneo[];
    },
    enabled: !!empresaId,
  });

  // Fetch treinamentos disponíveis
  const { data: treinamentos } = useQuery({
    queryKey: ['treinamentos-catalogo', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaId)
        .order('norma');
      if (error) throw error;
      return data as Treinamento[];
    },
    enabled: !!empresaId,
  });

  // Fetch matriz de treinamentos para obter agentes nocivos
  const { data: matrizTreinamentos } = useQuery({
    queryKey: ['matriz-treinamentos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('matriz_treinamentos')
        .select('treinamento_id, agente_nocivo')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      return data as { treinamento_id: string; agente_nocivo: string | null }[];
    },
    enabled: !!empresaId,
  });

  // Gerar nome do grupo automaticamente
  const generateGroupName = (treinamentoIds: string[]) => {
    if (!treinamentos || treinamentoIds.length === 0) return 'GH Treinamentos';
    
    const selectedTreinamentosData = treinamentos.filter(t => treinamentoIds.includes(t.id));
    const nrs = [...new Set(selectedTreinamentosData.map(t => t.norma))].sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 999;
      const numB = parseInt(b.replace(/\D/g, '')) || 999;
      return numA - numB;
    });
    
    if (nrs.length === 0) return 'GH Treinamentos';
    return `GH Treinamentos (NR ${nrs.join(', ')})`;
  };

  // Gerar agente nocivo automaticamente baseado na matriz de treinamentos
  const generateAgenteNocivo = (treinamentoIds: string[]) => {
    if (!matrizTreinamentos || treinamentoIds.length === 0) return '';
    
    const agentes: string[] = [];
    
    treinamentoIds.forEach(treinamentoId => {
      const matrizItem = matrizTreinamentos.find(m => m.treinamento_id === treinamentoId);
      if (matrizItem?.agente_nocivo) {
        agentes.push(matrizItem.agente_nocivo);
      }
    });
    
    return [...new Set(agentes)].join('; ');
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      cargo_nome: string;
      nome: string;
      agente_nocivo: string;
      treinamentos: string[];
    }) => {
      if (!empresaId) throw new Error('Empresa não encontrada');

      // Criar grupo homogêneo
      const { data: grupo, error: grupoError } = await supabase
        .from('grupos_homogeneos')
        .insert({
          empresa_id: empresaId,
          cargo_nome: data.cargo_nome || null,
          nome: data.nome,
          agente_nocivo: data.agente_nocivo || null,
          ativo: true,
        })
        .select('id')
        .single();

      if (grupoError) throw grupoError;

      // Inserir treinamentos relacionados
      if (data.treinamentos.length > 0) {
        const treinamentosInsert = data.treinamentos.map(treinamentoId => ({
          grupo_homogeneo_id: grupo.id,
          treinamento_id: treinamentoId,
        }));

        const { error: treinamentosError } = await supabase
          .from('grupos_homogeneos_treinamentos')
          .insert(treinamentosInsert);

        if (treinamentosError) throw treinamentosError;
      }

      return grupo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-homogeneos'] });
      toast.success('Grupo homogêneo criado com sucesso!');
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error('Erro ao criar grupo:', error);
      toast.error('Erro ao criar grupo homogêneo');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      cargo_nome: string;
      nome: string;
      agente_nocivo: string;
      treinamentos: string[];
    }) => {
      // Atualizar grupo homogêneo
      const { error: grupoError } = await supabase
        .from('grupos_homogeneos')
        .update({
          cargo_nome: data.cargo_nome || null,
          nome: data.nome,
          agente_nocivo: data.agente_nocivo || null,
        })
        .eq('id', data.id);

      if (grupoError) throw grupoError;

      // Remover treinamentos antigos
      await supabase
        .from('grupos_homogeneos_treinamentos')
        .delete()
        .eq('grupo_homogeneo_id', data.id);

      // Inserir novos treinamentos
      if (data.treinamentos.length > 0) {
        const treinamentosInsert = data.treinamentos.map(treinamentoId => ({
          grupo_homogeneo_id: data.id,
          treinamento_id: treinamentoId,
        }));

        const { error: treinamentosError } = await supabase
          .from('grupos_homogeneos_treinamentos')
          .insert(treinamentosInsert);

        if (treinamentosError) throw treinamentosError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-homogeneos'] });
      toast.success('Grupo homogêneo atualizado com sucesso!');
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar grupo:', error);
      toast.error('Erro ao atualizar grupo homogêneo');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grupos_homogeneos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-homogeneos'] });
      toast.success('Grupo homogêneo excluído com sucesso!');
      setDeletingGrupo(null);
    },
    onError: () => {
      toast.error('Erro ao excluir grupo homogêneo');
    },
  });

  const handleEdit = (grupo: GrupoHomogeneo) => {
    setEditingGrupo(grupo);
    setCargoNome(grupo.cargo_nome || '');
    setAgenteNocivo(grupo.agente_nocivo || '');
    setSelectedTreinamentos(grupo.treinamentos?.map(t => t.treinamento_id) || []);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGrupo(null);
    setCargoNome('');
    setAgenteNocivo('');
    setSelectedTreinamentos([]);
  };

  const handleTreinamentoToggle = (treinamentoId: string) => {
    setSelectedTreinamentos(prev => {
      const newSelection = prev.includes(treinamentoId)
        ? prev.filter(id => id !== treinamentoId)
        : [...prev, treinamentoId];
      
      // Atualizar agente nocivo automaticamente
      const novoAgente = generateAgenteNocivo(newSelection);
      setAgenteNocivo(novoAgente);
      
      return newSelection;
    });
  };

  const handleSubmit = () => {
    if (selectedTreinamentos.length === 0) {
      toast.error('Selecione pelo menos um treinamento');
      return;
    }

    const nome = generateGroupName(selectedTreinamentos);

    if (editingGrupo) {
      updateMutation.mutate({
        id: editingGrupo.id,
        cargo_nome: cargoNome,
        nome,
        agente_nocivo: agenteNocivo,
        treinamentos: selectedTreinamentos,
      });
    } else {
      createMutation.mutate({
        cargo_nome: cargoNome,
        nome,
        agente_nocivo: agenteNocivo,
        treinamentos: selectedTreinamentos,
      });
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredGrupos = grupos?.filter(
    (g) =>
      g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.cargo_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar treinamentos por NR para exibição
  const treinamentosAgrupados = treinamentos?.reduce((acc, t) => {
    const nr = t.norma;
    if (!acc[nr]) acc[nr] = [];
    acc[nr].push(t);
    return acc;
  }, {} as Record<string, Treinamento[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grupo Homogêneo de Treinamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os grupos homogêneos de treinamentos por cargo
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo Homogêneo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Grupos Homogêneos
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo..."
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
          ) : filteredGrupos?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhum grupo encontrado para a busca.'
                : 'Nenhum grupo homogêneo cadastrado. Clique em "Novo Grupo Homogêneo" para começar.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Treinamentos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrupos?.map((grupo) => (
                    <>
                      <TableRow key={grupo.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRowExpansion(grupo.id)}
                          >
                            {expandedRows.has(grupo.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{grupo.nome}</TableCell>
                        <TableCell>{grupo.cargo_nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {grupo.treinamentos?.length || 0} treinamento(s)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={grupo.ativo ? 'default' : 'secondary'}>
                            {grupo.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(grupo)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingGrupo(grupo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(grupo.id) && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-4 space-y-3">
                              <div>
                                <strong>Agente Nocivo / Perigo Relacionado:</strong>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {grupo.agente_nocivo || 'Não informado'}
                                </p>
                              </div>
                              <div>
                                <strong>Treinamentos:</strong>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {grupo.treinamentos?.map((t) => (
                                    <Badge key={t.id} variant="outline">
                                      NR {t.catalogo_treinamentos.norma} - {t.catalogo_treinamentos.nome}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingGrupo ? 'Editar Grupo Homogêneo' : 'Novo Grupo Homogêneo'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-4 py-4">
              {/* Cargo */}
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={cargoNome}
                  onChange={(e) => setCargoNome(e.target.value)}
                  placeholder="Digite o nome do cargo"
                />
              </div>

              {/* Treinamentos */}
              <div className="space-y-2">
                <Label>Treinamentos *</Label>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                  {treinamentosAgrupados && Object.entries(treinamentosAgrupados)
                    .sort(([a], [b]) => {
                      const numA = parseInt(a.replace(/\D/g, '')) || 999;
                      const numB = parseInt(b.replace(/\D/g, '')) || 999;
                      return numA - numB;
                    })
                    .map(([nr, treinamentosNr]) => (
                      <div key={nr} className="mb-3">
                        <p className="font-semibold text-sm mb-2">NR {nr}</p>
                        <div className="space-y-2 pl-4">
                          {treinamentosNr.map((t) => (
                            <div key={t.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={t.id}
                                checked={selectedTreinamentos.includes(t.id)}
                                onCheckedChange={() => handleTreinamentoToggle(t.id)}
                              />
                              <label
                                htmlFor={t.id}
                                className="text-sm cursor-pointer"
                              >
                                {t.nome}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                {selectedTreinamentos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTreinamentos.map((id) => {
                      const t = treinamentos?.find(tr => tr.id === id);
                      return t ? (
                        <Badge key={id} variant="secondary" className="flex items-center gap-1">
                          NR {t.norma} - {t.nome}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleTreinamentoToggle(id)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Nome do Grupo (gerado automaticamente) */}
              <div className="space-y-2">
                <Label>Nome do Grupo (gerado automaticamente)</Label>
                <Input
                  value={generateGroupName(selectedTreinamentos)}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Agente Nocivo */}
              <div className="space-y-2">
                <Label>Agente Nocivo / Perigo Relacionado</Label>
                <Textarea
                  value={agenteNocivo}
                  onChange={(e) => setAgenteNocivo(e.target.value)}
                  placeholder="Gerado automaticamente com base nos treinamentos selecionados"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este campo é preenchido automaticamente, mas pode ser editado manualmente.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingGrupo}
        onOpenChange={() => setDeletingGrupo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo homogêneo "{deletingGrupo?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGrupo && deleteMutation.mutate(deletingGrupo.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GruposHomogeneos;
