import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  FileText, 
  Edit, 
  Trash2, 
  Eye,
  FileSignature,
  Copy,
  LayoutTemplate,
  Filter
} from 'lucide-react';
import { ElaborarContrato } from './ElaborarContrato';

interface Contrato {
  id: string;
  numero: string;
  tipo: 'cliente' | 'parceiro';
  razao_social: string;
  cnpj: string;
  status: 'rascunho' | 'enviado' | 'assinado' | 'cancelado';
  valor_avista: number;
  forma_pagamento: string;
  created_at: string;
  cliente?: { nome: string };
  parceiro?: { nome: string };
}

interface ModeloContrato {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'cliente' | 'parceiro';
  ativo: boolean;
}

export function ToriqCorpContratos() {
  const { empresa } = useAuth();
  const { empresaMode } = useEmpresaMode();
  const empresaId = empresaMode?.empresaId || empresa?.id;
  const { toast } = useToast();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  
  // Estados para dialogs
  const [showElaborarContrato, setShowElaborarContrato] = useState(false);
  const [showModelosDialog, setShowModelosDialog] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloContrato | null>(null);
  const [tipoNovoContrato, setTipoNovoContrato] = useState<'cliente' | 'parceiro'>('cliente');

  const [activeTab, setActiveTab] = useState('contratos');

  useEffect(() => {
    if (empresaId) {
      loadContratos();
      loadModelos();
    }
  }, [empresaId]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('contratos')
        .select(`
          *,
          cliente:clientes_sst(nome),
          parceiro:empresas_parceiras(nome)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModelos = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('modelos_contrato')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    }
  };

  const handleNovoContrato = (tipo: 'cliente' | 'parceiro') => {
    setTipoNovoContrato(tipo);
    setContratoSelecionado(null);
    setModeloSelecionado(null);
    setShowElaborarContrato(true);
  };

  const handleEditarContrato = (contrato: Contrato) => {
    setContratoSelecionado(contrato);
    setShowElaborarContrato(true);
  };

  const handleVisualizarContrato = (contrato: Contrato) => {
    setContratoSelecionado(contrato);
    setShowElaborarContrato(true);
  };

  const handleDuplicarContrato = async (contrato: Contrato) => {
    try {
      // Gerar novo número
      const ano = new Date().getFullYear();
      const { data: lastContrato } = await (supabase as any)
        .from('contratos')
        .select('numero')
        .eq('empresa_id', empresaId)
        .like('numero', `TQ-${ano}-%`)
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      let novoNumero = 1;
      if (lastContrato?.numero) {
        const parts = lastContrato.numero.split('-');
        novoNumero = parseInt(parts[2]) + 1;
      }
      const numero = `TQ-${ano}-${String(novoNumero).padStart(4, '0')}`;

      // Criar cópia do contrato
      const { id, created_at, updated_at, ...contratoData } = contrato as any;
      const { data: novoContrato, error } = await (supabase as any)
        .from('contratos')
        .insert({
          ...contratoData,
          numero,
          status: 'rascunho',
          assinado: false,
          data_assinatura: null,
          assinante_nome: null,
          assinante_cpf: null
        })
        .select()
        .single();

      if (error) throw error;

      // Copiar cláusulas
      const { data: clausulas } = await (supabase as any)
        .from('contrato_clausulas')
        .select('*')
        .eq('contrato_id', contrato.id);

      if (clausulas?.length) {
        await (supabase as any)
          .from('contrato_clausulas')
          .insert(clausulas.map((c: any) => ({
            contrato_id: novoContrato.id,
            numero: c.numero,
            titulo: c.titulo,
            conteudo: c.conteudo,
            ordem: c.ordem
          })));
      }

      // Copiar módulos
      const { data: modulosContrato } = await (supabase as any)
        .from('contrato_modulos')
        .select('*')
        .eq('contrato_id', contrato.id);

      if (modulosContrato?.length) {
        await (supabase as any)
          .from('contrato_modulos')
          .insert(modulosContrato.map((m: any) => ({
            contrato_id: novoContrato.id,
            nome: m.nome,
            versao: m.versao,
            tipo_cliente: m.tipo_cliente,
            descricao: m.descricao,
            itens: m.itens,
            ordem: m.ordem
          })));
      }

      toast({
        title: 'Contrato duplicado',
        description: `Novo contrato ${numero} criado com sucesso.`
      });

      loadContratos();
    } catch (error) {
      console.error('Erro ao duplicar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível duplicar o contrato.',
        variant: 'destructive'
      });
    }
  };

  const handleExcluirContrato = async (contrato: Contrato) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;

    try {
      const { error } = await (supabase as any)
        .from('contratos')
        .delete()
        .eq('id', contrato.id);

      if (error) throw error;

      toast({
        title: 'Contrato excluído',
        description: 'O contrato foi excluído com sucesso.'
      });

      loadContratos();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o contrato.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      enviado: { label: 'Enviado', variant: 'default' },
      assinado: { label: 'Assinado', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' }
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredContratos = contratos.filter(c => {
    const matchSearch = 
      c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.parceiro?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchTipo = tipoFilter === 'todos' || c.tipo === tipoFilter;
    
    return matchSearch && matchStatus && matchTipo;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (showElaborarContrato) {
    return (
      <ElaborarContrato
        contrato={contratoSelecionado}
        modelo={modeloSelecionado}
        tipo={tipoNovoContrato}
        onClose={() => {
          setShowElaborarContrato(false);
          setContratoSelecionado(null);
          setModeloSelecionado(null);
          loadContratos();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contratos</h2>
          <p className="text-muted-foreground">Gerencie contratos com clientes e parceiros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowModelosDialog(true)}>
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Modelos
          </Button>
          <Button onClick={() => handleNovoContrato('cliente')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contratos" className="text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">Contratos</TabsTrigger>
          <TabsTrigger value="modelos" className="text-white data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm">Modelos de Contrato</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número, razão social..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="parceiro">Parceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleNovoContrato('cliente')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Contrato com Cliente</h3>
                    <p className="text-sm text-muted-foreground">
                      Criar contrato de prestação de serviços SST
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleNovoContrato('parceiro')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <FileSignature className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Contrato com Parceiro</h3>
                    <p className="text-sm text-muted-foreground">
                      Criar contrato com TST, instrutor ou fornecedor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de contratos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratos ({filteredContratos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredContratos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum contrato encontrado</p>
                  <Button 
                    variant="link" 
                    onClick={() => handleNovoContrato('cliente')}
                    className="mt-2"
                  >
                    Criar primeiro contrato
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Contrato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente/Parceiro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContratos.map((contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">{contrato.numero}</TableCell>
                        <TableCell>
                          <Badge variant={contrato.tipo === 'cliente' ? 'default' : 'secondary'}>
                            {contrato.tipo === 'cliente' ? 'Cliente' : 'Parceiro'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contrato.cliente?.nome || contrato.parceiro?.nome || contrato.razao_social || '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(contrato.valor_avista)}</TableCell>
                        <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                        <TableCell>{formatDate(contrato.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVisualizarContrato(contrato)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarContrato(contrato)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicarContrato(contrato)}
                              title="Duplicar"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExcluirContrato(contrato)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="modelos" className="space-y-4">
          <ModelosContrato 
            empresaId={empresaId!} 
            onSelectModelo={(modelo) => {
              setModeloSelecionado(modelo);
              setTipoNovoContrato(modelo.tipo as 'cliente' | 'parceiro');
              setShowElaborarContrato(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Modelos */}
      <Dialog open={showModelosDialog} onOpenChange={setShowModelosDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Modelo de Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {modelos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum modelo cadastrado</p>
                <p className="text-sm">Crie modelos na aba "Modelos de Contrato"</p>
              </div>
            ) : (
              modelos.map((modelo) => (
                <Card 
                  key={modelo.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setModeloSelecionado(modelo);
                    setTipoNovoContrato(modelo.tipo as 'cliente' | 'parceiro');
                    setShowModelosDialog(false);
                    setShowElaborarContrato(true);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{modelo.nome}</h4>
                        <p className="text-sm text-muted-foreground">{modelo.descricao}</p>
                      </div>
                      <Badge variant={modelo.tipo === 'cliente' ? 'default' : 'secondary'}>
                        {modelo.tipo === 'cliente' ? 'Cliente' : 'Parceiro'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelosDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setShowModelosDialog(false);
              handleNovoContrato('cliente');
            }}>
              Criar sem modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Modelos de Contrato
function ModelosContrato({ 
  empresaId, 
  onSelectModelo 
}: { 
  empresaId: string;
  onSelectModelo: (modelo: ModeloContrato) => void;
}) {
  const { toast } = useToast();
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'cliente' as 'cliente' | 'parceiro'
  });

  useEffect(() => {
    loadModelos();
  }, [empresaId]);

  const loadModelos = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('modelos_contrato')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingModelo) {
        const { error } = await (supabase as any)
          .from('modelos_contrato')
          .update(formData)
          .eq('id', editingModelo.id);

        if (error) throw error;
        toast({ title: 'Modelo atualizado com sucesso' });
      } else {
        const { error } = await (supabase as any)
          .from('modelos_contrato')
          .insert({
            ...formData,
            empresa_id: empresaId
          });

        if (error) throw error;
        toast({ title: 'Modelo criado com sucesso' });
      }

      setShowDialog(false);
      setEditingModelo(null);
      setFormData({ nome: '', descricao: '', tipo: 'cliente' });
      loadModelos();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o modelo.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (modelo: ModeloContrato) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await (supabase as any)
        .from('modelos_contrato')
        .delete()
        .eq('id', modelo.id);

      if (error) throw error;
      toast({ title: 'Modelo excluído com sucesso' });
      loadModelos();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o modelo.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Modelos de Contrato</h3>
        <Button onClick={() => {
          setEditingModelo(null);
          setFormData({ nome: '', descricao: '', tipo: 'cliente' });
          setShowDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : modelos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum modelo cadastrado</p>
            <Button 
              variant="link" 
              onClick={() => setShowDialog(true)}
              className="mt-2"
            >
              Criar primeiro modelo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelos.map((modelo) => (
            <Card key={modelo.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{modelo.nome}</h4>
                      <Badge variant={modelo.tipo === 'cliente' ? 'default' : 'secondary'}>
                        {modelo.tipo === 'cliente' ? 'Cliente' : 'Parceiro'}
                      </Badge>
                      {!modelo.ativo && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{modelo.descricao}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectModelo(modelo)}
                      title="Usar modelo"
                    >
                      <FileSignature className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingModelo(modelo);
                        setFormData({
                          nome: modelo.nome,
                          descricao: modelo.descricao || '',
                          tipo: modelo.tipo
                        });
                        setShowDialog(true);
                      }}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(modelo)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? 'Editar Modelo' : 'Novo Modelo de Contrato'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Modelo</label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Contrato de Prestação de Serviços SST"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descrição do modelo"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select 
                value={formData.tipo} 
                onValueChange={(v) => setFormData({ ...formData, tipo: v as 'cliente' | 'parceiro' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Contrato com Cliente</SelectItem>
                  <SelectItem value="parceiro">Contrato com Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome}>
              {editingModelo ? 'Salvar' : 'Criar Modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ToriqCorpContratos;
