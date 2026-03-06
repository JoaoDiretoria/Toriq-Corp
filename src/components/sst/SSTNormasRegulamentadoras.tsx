import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Upload, Download, FileText, X, MoreHorizontal, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NRDialog } from './NRDialog';
import { NRImportCSV } from './NRImportCSV';

interface NormaRegulamentadora {
  id: string;
  empresa_id: string;
  nr: string;
  descricao: string | null;
  termo?: string | null;
  numero_documento?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const SSTNormasRegulamentadoras = () => {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  // Usar empresa_id do modo empresa quando ativo
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const [normas, setNormas] = useState<NormaRegulamentadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingNorma, setEditingNorma] = useState<NormaRegulamentadora | null>(null);
  
  // Delete states
  const [deleteOptionsDialogOpen, setDeleteOptionsDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [normaToDelete, setNormaToDelete] = useState<NormaRegulamentadora | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'selected' | 'all' | null>(null);
  
  // Selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNormas, setSelectedNormas] = useState<string[]>([]);

  useEffect(() => {
    if (empresaId) {
      fetchNormas();
    }
  }, [empresaId]);

  const fetchNormas = async () => {
    if (!empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('normas_regulamentadoras')
        .select('*')
        .eq('empresa_id', empresaId);

      if (error) throw error;
      
      const sortedData = (data || []).sort((a, b) => {
        const numA = parseInt(a.nr, 10);
        const numB = parseInt(b.nr, 10);
        return numA - numB;
      });
      setNormas(sortedData);
    } catch (error) {
      console.error('Erro ao buscar NRs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as NRs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (norma: NormaRegulamentadora) => {
    setEditingNorma(norma);
    setDialogOpen(true);
  };

  const handleDelete = (norma: NormaRegulamentadora) => {
    setNormaToDelete(norma);
    setDeleteOptionsDialogOpen(true);
  };

  const handleDeleteOption = (mode: 'single' | 'selected' | 'all') => {
    setDeleteOptionsDialogOpen(false);
    
    if (mode === 'selected') {
      setSelectionMode(true);
      setSelectedNormas([]);
    } else {
      setDeleteMode(mode);
      setConfirmDeleteDialogOpen(true);
    }
  };

  const toggleNormaSelection = (id: string) => {
    setSelectedNormas(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNormas.length === filteredNormas.length) {
      setSelectedNormas([]);
    } else {
      setSelectedNormas(filteredNormas.map(n => n.id));
    }
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedNormas([]);
  };

  const confirmDeleteSelected = () => {
    if (selectedNormas.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos uma NR para excluir.',
        variant: 'destructive',
      });
      return;
    }
    setDeleteMode('selected');
    setConfirmDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    try {
      if (deleteMode === 'single' && normaToDelete) {
        const { error } = await supabase
          .from('normas_regulamentadoras')
          .delete()
          .eq('id', normaToDelete.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'NR excluída com sucesso.',
        });
      } else if (deleteMode === 'selected' && selectedNormas.length > 0) {
        const { error } = await supabase
          .from('normas_regulamentadoras')
          .delete()
          .in('id', selectedNormas);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: `${selectedNormas.length} NR(s) excluída(s) com sucesso.`,
        });
        
        setSelectionMode(false);
        setSelectedNormas([]);
      } else if (deleteMode === 'all') {
        const { error } = await supabase
          .from('normas_regulamentadoras')
          .delete()
          .eq('empresa_id', empresa?.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Todas as NRs foram excluídas com sucesso.',
        });
      }

      fetchNormas();
    } catch (error) {
      console.error('Erro ao excluir NR(s):', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a(s) NR(s).',
        variant: 'destructive',
      });
    } finally {
      setConfirmDeleteDialogOpen(false);
      setDeleteMode(null);
      setNormaToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingNorma(null);
  };

  const handleDialogSuccess = () => {
    handleDialogClose();
    fetchNormas();
  };

  const handleImportSuccess = () => {
    setImportDialogOpen(false);
    fetchNormas();
  };

  const downloadTemplateEmpty = () => {
    const csvContent = 'NR|Descrição\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_nr_vazio.csv';
    link.click();
  };

  const downloadTemplateFilled = () => {
    const csvContent = `NR|Descrição
1|Disposições Gerais e Gerenciamento de Riscos Ocupacionais
2|Inspeção Prévia (revogada)
3|Embargo e Interdição
4|Serviços Especializados em Segurança e em Medicina do Trabalho
5|Comissão Interna de Prevenção de Acidentes
6|Equipamento de Proteção Individual – EPI
7|Programa de Controle Médico de Saúde Ocupacional
8|Edificações
9|Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos Químicos e Biológicos
10|Segurança em Instalações e Serviços em Eletricidade
11|Transporte, Movimentação, Armazenagem e Manuseio de Materiais
12|Segurança no Trabalho em Máquinas e Equipamentos
13|Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos de Armazenamento
14|Fornos
15|Atividades e Operações Insalubres
16|Atividades e Operações Perigosas
17|Ergonomia
18|Segurança e Saúde no Trabalho na Indústria da Construção
19|Explosivos
20|Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis
21|Trabalhos a Céu Aberto
22|Segurança e Saúde Ocupacional na Mineração
23|Proteção contra Incêndios
24|Condições Sanitárias e de Conforto nos Locais de Trabalho
25|Resíduos Industriais
26|Sinalização de Segurança
27|Registro Profissional do Técnico de Segurança do Trabalho (revogada)
28|Fiscalização e Penalidades
29|Segurança e Saúde no Trabalho Portuário
30|Segurança e Saúde no Trabalho Aquaviário
31|Segurança e Saúde no Trabalho na Agricultura, Pecuária, Silvicultura, Exploração Florestal e Aquicultura
32|Segurança e Saúde no Trabalho em Serviços de Saúde
33|Segurança e Saúde nos Trabalhos em Espaços Confinados
34|Condições e Meio Ambiente de Trabalho na Indústria Naval
35|Trabalho em Altura
36|Segurança e Saúde no Trabalho em Empresas de Abate e Processamento de Carnes
37|Segurança e Saúde em Plataformas de Petróleo
38|Segurança e Saúde no Trabalho nas Atividades de Limpeza Urbana e Manejo de Resíduos Sólidos
`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_nr_padrao.csv';
    link.click();
  };

  const exportCSV = () => {
    if (normas.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Não há NRs para exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = 'NR|Descrição';
    const rows = normas.map(n => `${n.nr}|${n.descricao || ''}`);
    const csvContent = [headers, ...rows].join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'normas_regulamentadoras.csv';
    link.click();
  };

  const filteredNormas = normas
    .filter(
      (norma) =>
        norma.nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (norma.descricao && norma.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => parseInt(a.nr, 10) - parseInt(b.nr, 10));

  const getDeleteConfirmMessage = () => {
    if (deleteMode === 'single' && normaToDelete) {
      return `Tem certeza que deseja excluir a NR-${normaToDelete.nr}? Esta ação não pode ser desfeita.`;
    } else if (deleteMode === 'selected') {
      return `Tem certeza que deseja excluir ${selectedNormas.length} NR(s) selecionada(s)? Esta ação não pode ser desfeita.`;
    } else if (deleteMode === 'all') {
      return `Tem certeza que deseja excluir TODAS as ${normas.length} NRs? Esta ação não pode ser desfeita.`;
    }
    return '';
  };

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Normas Regulamentadoras
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as NRs aplicáveis à sua empresa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectionMode ? (
            <>
              <Button variant="outline" onClick={cancelSelectionMode}>
                <X className="h-4 w-4 mr-2" />
                Cancelar Seleção
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteSelected}
                disabled={selectedNormas.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir {selectedNormas.length} selecionado(s)
              </Button>
            </>
          ) : (
            <>
              {/* Import/Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar/Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCSV} disabled={normas.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTemplateEmpty}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Template Vazio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadTemplateFilled}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Template Padrão (NRs)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova NR
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Normas Regulamentadoras</p>
              <p className="text-2xl font-bold">{normas.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filteredNormas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'Nenhuma NR encontrada' : 'Nenhuma NR cadastrada'}</p>
              </div>
            ) : (
              filteredNormas.map((norma) => (
                <div key={norma.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <Checkbox
                          checked={selectedNormas.includes(norma.id)}
                          onCheckedChange={() => toggleNormaSelection(norma.id)}
                        />
                      )}
                      <Badge variant="secondary">NR-{norma.nr}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{norma.descricao || 'Sem descrição'}</p>
                  {!selectionMode && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(norma)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(norma)}
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
            {filteredNormas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? 'Nenhuma NR encontrada' : 'Nenhuma NR cadastrada'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectionMode && (
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedNormas.length === filteredNormas.length && filteredNormas.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[100px]">NR</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNormas.map((norma) => (
                    <TableRow key={norma.id}>
                      {selectionMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedNormas.includes(norma.id)}
                            onCheckedChange={() => toggleNormaSelection(norma.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="secondary">NR-{norma.nr}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{norma.descricao || '-'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(norma)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(norma)}
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
          </div>
        </CardContent>
      </Card>

      <NRDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        norma={editingNorma}
        onSuccess={handleDialogSuccess}
        onCancel={handleDialogClose}
      />

      <NRImportCSV
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleImportSuccess}
        existingNRs={normas.map(n => n.nr)}
      />

      {/* Delete Options Dialog */}
      <AlertDialog open={deleteOptionsDialogOpen} onOpenChange={setDeleteOptionsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma opção de exclusão para as Normas Regulamentadoras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDeleteOption('single')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir somente NR-{normaToDelete?.nr}
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleDeleteOption('selected')}
            >
              <Checkbox className="h-4 w-4 mr-2" />
              Selecionar itens para excluir
            </Button>
            <Button 
              variant="destructive" 
              className="justify-start"
              onClick={() => handleDeleteOption('all')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir todas as NRs ({normas.length})
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteConfirmMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
