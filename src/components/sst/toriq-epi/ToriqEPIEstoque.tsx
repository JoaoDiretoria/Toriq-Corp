import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, Plus, Search, Package, Pencil, Trash2, Loader2, CalendarIcon, AlertTriangle, Info, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CadastroEPI {
  id: string;
  nome_modelo: string;
  tipo_epi: string;
  fabricante: string | null;
  numero_ca: string | null;
}

interface EstoqueEPI {
  id: string;
  empresa_id: string;
  epi_id: string;
  codigo_entrada: string | null;
  codigo_lote: string | null;
  quantidade_inicial: number;
  quantidade_atual: number;
  localizacao: string | null;
  data_recebimento: string | null;
  data_validade: string | null;
  validade_ca: string | null;
  validade_fabricante: string | null;
  validade_operacional: string | null;
  bloquear_vencido: boolean;
  tipo_entrada: string;
  ativo: boolean;
  created_at: string;
  cadastro_epis?: CadastroEPI;
}

interface FormEstoque {
  id?: string;
  epi_id: string;
  codigo_entrada: string;
  codigo_lote: string;
  quantidade_inicial: number | string;
  quantidade_atual: number;
  localizacao: string;
  data_recebimento: Date | undefined;
  data_validade: Date | undefined;
  validade_ca: Date | undefined;
  validade_fabricante: Date | undefined;
  validade_operacional: Date | undefined;
  bloquear_vencido: string;
  tipo_entrada: string;
}

const initialFormState: FormEstoque = {
  epi_id: '',
  codigo_entrada: '',
  codigo_lote: '',
  quantidade_inicial: '',
  quantidade_atual: 0,
  localizacao: '',
  data_recebimento: undefined,
  data_validade: undefined,
  validade_ca: undefined,
  validade_fabricante: undefined,
  validade_operacional: undefined,
  bloquear_vencido: 'sim',
  tipo_entrada: 'lote',
};

// Interface para EPI agrupado (consolidado por EPI + CA)
interface EstoqueAgrupado {
  epi_id: string;
  numero_ca: string | null;
  tipo_epi: string;
  nome_modelo: string;
  quantidade_total: number;
  ultimo_recebimento: string | null;
  ultima_validade: string | null;
  ultima_localizacao: string | null;
  ultimo_codigo_entrada: string | null;
  entradas: EstoqueEPI[];
  bloquear_vencido: boolean;
}

export function ToriqEPIEstoque() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { empresaMode, isInEmpresaMode } = useEmpresaMode();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedEpiAgrupado, setSelectedEpiAgrupado] = useState<EstoqueAgrupado | null>(null);
  const [form, setForm] = useState<FormEstoque>(initialFormState);
  const [estoque, setEstoque] = useState<EstoqueEPI[]>([]);
  const [episCadastrados, setEpisCadastrados] = useState<CadastroEPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tipoEntrada, setTipoEntrada] = useState<'individual' | 'lote'>('lote');
  const [ordenacao, setOrdenacao] = useState<'fefo' | 'fifo'>('fefo');
  
  // Configurações do estoque
  const [configEstoque, setConfigEstoque] = useState({
    alertaEstoqueBaixo: 5,
    diasAlertaVencimento: 30,
    bloquearVencidoPadrao: true,
    permitirEstoqueNegativo: false,
  });

  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : profile?.empresa_id;

  // Carregar EPIs cadastrados
  const loadEpisCadastrados = async () => {
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('cadastro_epis')
        .select('id, nome_modelo, tipo_epi, fabricante, numero_ca')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome_modelo');

      if (error) throw error;
      setEpisCadastrados(data || []);
    } catch (error) {
      console.error('Erro ao carregar EPIs:', error);
    }
  };

  // Carregar estoque
  const loadEstoque = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estoque_epis')
        .select(`
          *,
          cadastro_epis (
            id,
            nome_modelo,
            tipo_epi,
            fabricante,
            numero_ca
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstoque(data || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o estoque.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEpisCadastrados();
    loadEstoque();
  }, [empresaId]);

  // Filtrar estoque
  const filteredEstoque = estoque.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.cadastro_epis?.nome_modelo?.toLowerCase().includes(searchLower)) ||
      (item.codigo_lote?.toLowerCase().includes(searchLower)) ||
      (item.localizacao?.toLowerCase().includes(searchLower))
    );
  });

  // Determinar qual validade exibir com prioridade: Fabricante > CA > Operacional
  const getValidadeExibicao = (item: EstoqueEPI): { data: string | null; tipo: string } => {
    if (item.validade_fabricante) {
      return { data: item.validade_fabricante, tipo: 'Validade do Fabricante' };
    }
    if (item.validade_ca) {
      return { data: item.validade_ca, tipo: 'Validade do CA' };
    }
    if (item.validade_operacional) {
      return { data: item.validade_operacional, tipo: 'Validade Operacional' };
    }
    return { data: null, tipo: '' };
  };

  // Agrupar EPIs por EPI + CA (consolidar entradas do mesmo EPI)
  const estoqueAgrupado: EstoqueAgrupado[] = useMemo(() => {
    const grupos: Record<string, EstoqueAgrupado> = {};
    
    filteredEstoque.forEach(item => {
      const chave = `${item.epi_id}_${item.cadastro_epis?.numero_ca || 'sem_ca'}`;
      
      if (!grupos[chave]) {
        grupos[chave] = {
          epi_id: item.epi_id,
          numero_ca: item.cadastro_epis?.numero_ca || null,
          tipo_epi: item.cadastro_epis?.tipo_epi || '',
          nome_modelo: item.cadastro_epis?.nome_modelo || '',
          quantidade_total: 0,
          ultimo_recebimento: null,
          ultima_validade: null,
          ultima_localizacao: null,
          ultimo_codigo_entrada: null,
          entradas: [],
          bloquear_vencido: item.bloquear_vencido,
        };
      }
      
      grupos[chave].quantidade_total += item.quantidade_atual;
      grupos[chave].entradas.push(item);
      
      // Atualizar com dados da entrada mais recente
      if (!grupos[chave].ultimo_recebimento || 
          (item.data_recebimento && item.data_recebimento > grupos[chave].ultimo_recebimento!)) {
        grupos[chave].ultimo_recebimento = item.data_recebimento;
        grupos[chave].ultima_localizacao = item.localizacao;
        grupos[chave].ultimo_codigo_entrada = item.codigo_entrada;
        
        // Pegar a validade da entrada mais recente
        const validadeInfo = getValidadeExibicao(item);
        grupos[chave].ultima_validade = validadeInfo.data;
      }
    });
    
    // Ordenar entradas de cada grupo conforme FEFO ou FIFO
    Object.values(grupos).forEach(grupo => {
      grupo.entradas.sort((a, b) => {
        if (ordenacao === 'fefo') {
          // FEFO: First Expired, First Out - ordenar por validade (mais próximo de vencer primeiro)
          const validadeA = getValidadeExibicao(a).data;
          const validadeB = getValidadeExibicao(b).data;
          if (!validadeA) return 1;
          if (!validadeB) return -1;
          return new Date(validadeA).getTime() - new Date(validadeB).getTime();
        } else {
          // FIFO: First In, First Out - ordenar por data de recebimento (mais antigo primeiro)
          if (!a.data_recebimento) return 1;
          if (!b.data_recebimento) return -1;
          return new Date(a.data_recebimento).getTime() - new Date(b.data_recebimento).getTime();
        }
      });
    });
    
    // Ordenar grupos também conforme FEFO ou FIFO
    const gruposOrdenados = Object.values(grupos).sort((a, b) => {
      if (ordenacao === 'fefo') {
        if (!a.ultima_validade) return 1;
        if (!b.ultima_validade) return -1;
        return new Date(a.ultima_validade).getTime() - new Date(b.ultima_validade).getTime();
      } else {
        if (!a.ultimo_recebimento) return 1;
        if (!b.ultimo_recebimento) return -1;
        return new Date(a.ultimo_recebimento).getTime() - new Date(b.ultimo_recebimento).getTime();
      }
    });
    
    return gruposOrdenados;
  }, [filteredEstoque, ordenacao]);

  // Verificar se item está vencido
  const isVencido = (dataValidade: string | null): boolean => {
    if (!dataValidade) return false;
    return isBefore(new Date(dataValidade), startOfDay(new Date()));
  };

  // Verificar se item está próximo do vencimento (30 dias)
  const isProximoVencimento = (dataValidade: string | null): boolean => {
    if (!dataValidade) return false;
    const hoje = startOfDay(new Date());
    const validade = new Date(dataValidade);
    const diffDays = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const handleOpenDialog = () => {
    setForm({ ...initialFormState, tipo_entrada: tipoEntrada });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: EstoqueEPI) => {
    setForm({
      id: item.id,
      epi_id: item.epi_id,
      codigo_entrada: item.codigo_entrada || '',
      codigo_lote: item.codigo_lote || '',
      quantidade_inicial: item.quantidade_inicial,
      quantidade_atual: item.quantidade_atual,
      localizacao: item.localizacao || '',
      data_recebimento: item.data_recebimento ? new Date(item.data_recebimento) : undefined,
      data_validade: item.data_validade ? new Date(item.data_validade) : undefined,
      validade_ca: item.validade_ca ? new Date(item.validade_ca) : undefined,
      validade_fabricante: item.validade_fabricante ? new Date(item.validade_fabricante) : undefined,
      validade_operacional: item.validade_operacional ? new Date(item.validade_operacional) : undefined,
      bloquear_vencido: item.bloquear_vencido ? 'sim' : 'nao',
      tipo_entrada: item.tipo_entrada,
    });
    setTipoEntrada(item.tipo_entrada as 'individual' | 'lote');
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  // Obter quantidade atual do estoque para um EPI específico
  const getEstoqueAtualEPI = (epiId: string): number => {
    return estoque
      .filter(item => item.epi_id === epiId && item.ativo)
      .reduce((total, item) => total + item.quantidade_atual, 0);
  };

  // Gerar código de entrada automático: 3 primeiras letras do EPI + ano + sequencial
  const gerarCodigoEntrada = async (epiId: string): Promise<string> => {
    const epiSelecionado = episCadastrados.find(e => e.id === epiId);
    if (!epiSelecionado) return '';

    // Pegar as 3 primeiras letras do nome do EPI (sem acentos, maiúsculas)
    const nomeEpi = epiSelecionado.nome_modelo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 3);

    const anoAtual = new Date().getFullYear();
    const prefixo = `${nomeEpi}${anoAtual}`;

    // Buscar o último código com esse prefixo para essa empresa
    const { data: ultimosRegistros } = await supabase
      .from('estoque_epis')
      .select('codigo_entrada')
      .eq('empresa_id', empresaId)
      .like('codigo_entrada', `${prefixo}%`)
      .order('codigo_entrada', { ascending: false })
      .limit(1);

    let sequencial = 1;
    if (ultimosRegistros && ultimosRegistros.length > 0 && ultimosRegistros[0].codigo_entrada) {
      const ultimoCodigo = ultimosRegistros[0].codigo_entrada;
      const ultimoSequencial = parseInt(ultimoCodigo.substring(prefixo.length)) || 0;
      sequencial = ultimoSequencial + 1;
    }

    return `${prefixo}${sequencial.toString().padStart(3, '0')}`;
  };

  const handleSave = async () => {
    if (!empresaId) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.epi_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um EPI.',
        variant: 'destructive',
      });
      return;
    }

    const qtdInicial = typeof form.quantidade_inicial === 'string' 
      ? parseInt(form.quantidade_inicial) || 0 
      : form.quantidade_inicial;

    if (qtdInicial < 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'A quantidade inicial não pode ser negativa.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Gerar código de entrada automático para novas entradas
      let codigoEntrada = form.codigo_entrada;
      if (!editingId) {
        codigoEntrada = await gerarCodigoEntrada(form.epi_id);
      }

      const dataToSave = {
        epi_id: form.epi_id,
        codigo_entrada: codigoEntrada || null,
        codigo_lote: form.codigo_lote || null,
        quantidade_inicial: qtdInicial,
        quantidade_atual: editingId ? form.quantidade_atual : qtdInicial,
        localizacao: form.localizacao || null,
        data_recebimento: form.data_recebimento ? format(form.data_recebimento, 'yyyy-MM-dd') : null,
        data_validade: form.data_validade ? format(form.data_validade, 'yyyy-MM-dd') : null,
        validade_ca: form.validade_ca ? format(form.validade_ca, 'yyyy-MM-dd') : null,
        validade_fabricante: form.validade_fabricante ? format(form.validade_fabricante, 'yyyy-MM-dd') : null,
        validade_operacional: form.validade_operacional ? format(form.validade_operacional, 'yyyy-MM-dd') : null,
        bloquear_vencido: form.bloquear_vencido === 'sim',
        tipo_entrada: tipoEntrada,
      };

      if (editingId) {
        const { error } = await supabase
          .from('estoque_epis')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Entrada de estoque atualizada com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('estoque_epis')
          .insert({
            ...dataToSave,
            empresa_id: empresaId,
            created_by: profile?.id,
          });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: `Entrada de estoque registrada com sucesso. Código: ${codigoEntrada}`,
        });
      }

      setDialogOpen(false);
      setForm(initialFormState);
      setEditingId(null);
      loadEstoque();
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a entrada de estoque.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('estoque_epis')
        .update({ ativo: false })
        .eq('id', deletingId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Entrada de estoque removida com sucesso.',
      });

      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadEstoque();
    } catch (error) {
      console.error('Erro ao deletar entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a entrada de estoque.',
        variant: 'destructive',
      });
    }
  };

  const handleLimpar = () => {
    setForm({ ...initialFormState, tipo_entrada: tipoEntrada });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Estoque de EPIs
          </h1>
          <p className="text-muted-foreground">
            Controle de estoque e movimentações
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfigDialogOpen(true)}
          title="Configurações do Estoque"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Posição de Estoque</CardTitle>
              <CardDescription>Quantidade disponível de cada EPI ({filteredEstoque.length} registros)</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Ordenação</Label>
                <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as 'fefo' | 'fifo')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fefo">FEFO (vence primeiro)</SelectItem>
                    <SelectItem value="fifo">FIFO (entra primeiro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no estoque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Entrada de Estoque
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : estoqueAgrupado.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item em estoque.</p>
              <p className="text-sm">Cadastre EPIs e registre entradas de estoque.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>EPI</TableHead>
                    <TableHead>Nome/Modelo</TableHead>
                    <TableHead>C.A.</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Últ. Recebimento</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estoqueAgrupado.map((grupo) => {
                    const vencido = isVencido(grupo.ultima_validade);
                    const proximoVencimento = isProximoVencimento(grupo.ultima_validade);
                    const ultimaEntrada = grupo.entradas[0];
                    
                    return (
                      <TableRow 
                        key={`${grupo.epi_id}_${grupo.numero_ca}`} 
                        className={cn(
                          vencido && grupo.bloquear_vencido && "bg-destructive/10",
                          "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSelectedEpiAgrupado(grupo);
                          setHistoricoDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-mono text-xs">
                          {grupo.ultimo_codigo_entrada || '-'}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={grupo.tipo_epi}>
                          {grupo.tipo_epi || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={grupo.nome_modelo}>
                          {grupo.nome_modelo || '-'}
                        </TableCell>
                        <TableCell>{grupo.numero_ca || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            grupo.quantidade_total <= 0 && "text-destructive font-bold",
                            grupo.quantidade_total > 0 && grupo.quantidade_total <= configEstoque.alertaEstoqueBaixo && "text-yellow-600 font-bold"
                          )}>
                            {grupo.quantidade_total}
                          </span>
                        </TableCell>
                        <TableCell>{grupo.ultima_localizacao || '-'}</TableCell>
                        <TableCell>
                          {grupo.ultimo_recebimento 
                            ? format(new Date(grupo.ultimo_recebimento), 'dd/MM/yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {grupo.ultima_validade ? (
                            <span>{format(new Date(grupo.ultima_validade), 'dd/MM/yyyy')}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {grupo.quantidade_total <= 0 ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              Indisponível
                            </Badge>
                          ) : grupo.quantidade_total <= configEstoque.alertaEstoqueBaixo ? (
                            <Badge className="flex items-center gap-1 w-fit bg-yellow-500 hover:bg-yellow-500 text-white">
                              Comprar
                            </Badge>
                          ) : (
                            <Badge className="flex items-center gap-1 w-fit bg-green-500 hover:bg-green-500 text-white">
                              Disponível
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => ultimaEntrada && handleEdit(ultimaEntrada)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => ultimaEntrada && handleDeleteClick(ultimaEntrada.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Entrada de Estoque */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Entrada de Estoque' : 'Cadastro de Entrada em Estoque'}
            </DialogTitle>
            <DialogDescription>
              Registre a entrada de EPIs no estoque
            </DialogDescription>
          </DialogHeader>

          {/* Tabs para tipo de entrada */}
          <Tabs value={tipoEntrada} onValueChange={(v) => setTipoEntrada(v as 'individual' | 'lote')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="lote">Lote</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-4">
              <div className="grid gap-4">
                {/* Seleção de EPI */}
                <div className="grid gap-2">
                  <Label htmlFor="epi_id">EPI</Label>
                  <Select
                    value={form.epi_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, epi_id: value }))}
                  >
                    <SelectTrigger id="epi_id">
                      <SelectValue placeholder="Selecione o EPI" />
                    </SelectTrigger>
                    <SelectContent>
                      {episCadastrados.map((epi) => (
                        <SelectItem key={epi.id} value={epi.id}>
                          {epi.nome_modelo} {epi.numero_ca ? `(CA: ${epi.numero_ca})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn("grid gap-4", editingId ? "grid-cols-3" : "grid-cols-2")}>
                  {/* Quantidade */}
                  <div className="grid gap-2">
                    <Label htmlFor="quantidade_inicial">Quantidade</Label>
                    <Input
                      id="quantidade_inicial"
                      type="number"
                      min="0"
                      placeholder="Qtd. da entrada"
                      value={form.quantidade_inicial}
                      onChange={(e) => setForm(prev => ({ ...prev, quantidade_inicial: e.target.value }))}
                    />
                  </div>

                  {/* Quantidade (para edição mostra a quantidade atual) */}
                  {editingId && (
                    <div className="grid gap-2">
                      <Label htmlFor="quantidade_atual_ind">Quantidade</Label>
                      <Input
                        id="quantidade_atual_ind"
                        type="number"
                        min="0"
                        value={form.quantidade_atual}
                        onChange={(e) => setForm(prev => ({ ...prev, quantidade_atual: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  )}

                  {/* Localização */}
                  <div className="grid gap-2">
                    <Label htmlFor="localizacao">Localização</Label>
                    <Input
                      id="localizacao"
                      placeholder="Ex.: Almox A-02"
                      value={form.localizacao}
                      onChange={(e) => setForm(prev => ({ ...prev, localizacao: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data de Recebimento */}
                  <div className="grid gap-2">
                    <Label>Recebimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.data_recebimento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_recebimento ? format(form.data_recebimento, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.data_recebimento}
                          onSelect={(date) => setForm(prev => ({ ...prev, data_recebimento: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Bloquear Vencido */}
                  <div className="grid gap-2">
                    <Label htmlFor="bloquear_vencido_ind">Bloquear vencido?</Label>
                    <Select
                      value={form.bloquear_vencido}
                      onValueChange={(value) => setForm(prev => ({ ...prev, bloquear_vencido: value }))}
                    >
                      <SelectTrigger id="bloquear_vencido_ind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">SIM</SelectItem>
                        <SelectItem value="nao">NÃO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Validade do CA */}
                  <div className="grid gap-2">
                    <Label>Validade do CA</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_ca && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_ca ? format(form.validade_ca, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_ca}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_ca: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Validade do Fabricante */}
                  <div className="grid gap-2">
                    <Label>Validade do Fabricante</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_fabricante && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_fabricante ? format(form.validade_fabricante, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_fabricante}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_fabricante: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Validade Operacional (Periódica) */}
                  <div className="grid gap-2">
                    <Label>Validade Operacional (Periódica)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_operacional && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_operacional ? format(form.validade_operacional, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_operacional}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_operacional: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lote" className="mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* EPI */}
                  <div className="grid gap-2">
                    <Label htmlFor="epi_id_lote">EPI</Label>
                    <Select
                      value={form.epi_id}
                      onValueChange={(value) => setForm(prev => ({ ...prev, epi_id: value }))}
                    >
                      <SelectTrigger id="epi_id_lote">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {episCadastrados.map((epi) => (
                          <SelectItem key={epi.id} value={epi.id}>
                            {epi.nome_modelo} {epi.numero_ca ? `(CA: ${epi.numero_ca})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Código do Lote */}
                  <div className="grid gap-2">
                    <Label htmlFor="codigo_lote">Código do lote</Label>
                    <Input
                      id="codigo_lote"
                      placeholder="Ex.: L-2026-001"
                      value={form.codigo_lote}
                      onChange={(e) => setForm(prev => ({ ...prev, codigo_lote: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={cn("grid gap-4", editingId ? "grid-cols-3" : "grid-cols-2")}>
                  {/* Qtd. Inicial */}
                  <div className="grid gap-2">
                    <Label htmlFor="qtd_inicial_lote">Quantidade</Label>
                    <Input
                      id="qtd_inicial_lote"
                      type="number"
                      min="0"
                      placeholder="Qtd. da entrada"
                      value={form.quantidade_inicial}
                      onChange={(e) => setForm(prev => ({ ...prev, quantidade_inicial: e.target.value }))}
                    />
                  </div>

                  {/* Quantidade (para edição mostra a quantidade atual) */}
                  {editingId && (
                    <div className="grid gap-2">
                      <Label htmlFor="qtd_atual_lote">Quantidade</Label>
                      <Input
                        id="qtd_atual_lote"
                        type="number"
                        min="0"
                        value={form.quantidade_atual}
                        onChange={(e) => setForm(prev => ({ ...prev, quantidade_atual: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  )}

                  {/* Localização */}
                  <div className="grid gap-2">
                    <Label htmlFor="localizacao_lote">Localização</Label>
                    <Input
                      id="localizacao_lote"
                      placeholder="Ex.: Almox A-02"
                      value={form.localizacao}
                      onChange={(e) => setForm(prev => ({ ...prev, localizacao: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Data de Recebimento */}
                  <div className="grid gap-2">
                    <Label>Recebimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.data_recebimento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_recebimento ? format(form.data_recebimento, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.data_recebimento}
                          onSelect={(date) => setForm(prev => ({ ...prev, data_recebimento: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Bloquear Vencido */}
                  <div className="grid gap-2">
                    <Label htmlFor="bloquear_vencido">Bloquear vencido?</Label>
                    <Select
                      value={form.bloquear_vencido}
                      onValueChange={(value) => setForm(prev => ({ ...prev, bloquear_vencido: value }))}
                    >
                      <SelectTrigger id="bloquear_vencido">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">SIM</SelectItem>
                        <SelectItem value="nao">NÃO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Validade do CA */}
                  <div className="grid gap-2">
                    <Label>Validade do CA</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_ca && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_ca ? format(form.validade_ca, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_ca}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_ca: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Validade do Fabricante */}
                  <div className="grid gap-2">
                    <Label>Validade do Fabricante</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_fabricante && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_fabricante ? format(form.validade_fabricante, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_fabricante}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_fabricante: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Validade Operacional (Periódica) */}
                  <div className="grid gap-2">
                    <Label>Validade Operacional (Periódica)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !form.validade_operacional && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.validade_operacional ? format(form.validade_operacional, 'dd/MM/yyyy') : 'dd/mm/aaaa'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.validade_operacional}
                          onSelect={(date) => setForm(prev => ({ ...prev, validade_operacional: date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLimpar}>
              Limpar
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Atualizar' : tipoEntrada === 'lote' ? 'Salvar lote' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta entrada de estoque? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Configurações do Estoque */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Estoque
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros de controle do estoque de EPIs
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Alerta de Estoque Baixo */}
            <div className="grid gap-2">
              <Label htmlFor="alertaEstoqueBaixo">Alerta de estoque baixo (quantidade)</Label>
              <Input
                id="alertaEstoqueBaixo"
                type="number"
                min="0"
                value={configEstoque.alertaEstoqueBaixo}
                onChange={(e) => setConfigEstoque(prev => ({ 
                  ...prev, 
                  alertaEstoqueBaixo: parseInt(e.target.value) || 0 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Itens com quantidade igual ou menor serão destacados em amarelo
              </p>
            </div>

            {/* Dias para Alerta de Vencimento */}
            <div className="grid gap-2">
              <Label htmlFor="diasAlertaVencimento">Dias para alerta de vencimento</Label>
              <Input
                id="diasAlertaVencimento"
                type="number"
                min="0"
                value={configEstoque.diasAlertaVencimento}
                onChange={(e) => setConfigEstoque(prev => ({ 
                  ...prev, 
                  diasAlertaVencimento: parseInt(e.target.value) || 0 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Itens próximos ao vencimento serão destacados
              </p>
            </div>

            {/* Bloquear Vencido por Padrão */}
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="bloquearVencidoPadrao">Bloquear vencido por padrão</Label>
                <p className="text-xs text-muted-foreground">
                  Novas entradas terão bloqueio de vencido ativado
                </p>
              </div>
              <Select
                value={configEstoque.bloquearVencidoPadrao ? 'sim' : 'nao'}
                onValueChange={(value) => setConfigEstoque(prev => ({ 
                  ...prev, 
                  bloquearVencidoPadrao: value === 'sim' 
                }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permitir Estoque Negativo */}
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="permitirEstoqueNegativo">Permitir estoque negativo</Label>
                <p className="text-xs text-muted-foreground">
                  Permite entregas mesmo sem estoque disponível
                </p>
              </div>
              <Select
                value={configEstoque.permitirEstoqueNegativo ? 'sim' : 'nao'}
                onValueChange={(value) => setConfigEstoque(prev => ({ 
                  ...prev, 
                  permitirEstoqueNegativo: value === 'sim' 
                }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast({
                title: 'Configurações salvas',
                description: 'As configurações do estoque foram atualizadas.',
              });
              setConfigDialogOpen(false);
            }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico de Entradas e Entregas */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Histórico - {selectedEpiAgrupado?.nome_modelo}
            </DialogTitle>
            <DialogDescription>
              {selectedEpiAgrupado?.numero_ca && `C.A.: ${selectedEpiAgrupado.numero_ca} | `}
              Quantidade total em estoque: <strong>{selectedEpiAgrupado?.quantidade_total}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedEpiAgrupado && (
            <Tabs defaultValue="entradas" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entradas">
                  Entradas ({selectedEpiAgrupado.entradas.length})
                </TabsTrigger>
                <TabsTrigger value="entregas">
                  Entregas (0)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entradas" className="mt-4">
                {selectedEpiAgrupado.entradas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma entrada registrada</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead className="text-center">Qtd. Entrada</TableHead>
                          <TableHead className="text-center">Qtd. Atual</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Recebimento</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEpiAgrupado.entradas.map((entrada) => {
                          const validadeInfo = getValidadeExibicao(entrada);
                          const vencido = isVencido(validadeInfo.data);
                          
                          return (
                            <TableRow 
                              key={entrada.id}
                              className={cn(vencido && entrada.bloquear_vencido && "bg-destructive/10")}
                            >
                              <TableCell className="font-mono text-xs">
                                {entrada.codigo_entrada || '-'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {entrada.codigo_lote || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {entrada.quantidade_inicial}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  entrada.quantidade_atual <= 0 && "text-destructive font-bold",
                                  entrada.quantidade_atual > 0 && entrada.quantidade_atual <= configEstoque.alertaEstoqueBaixo && "text-yellow-600 font-bold"
                                )}>
                                  {entrada.quantidade_atual}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {entrada.localizacao || '-'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {entrada.data_recebimento 
                                  ? format(new Date(entrada.data_recebimento), 'dd/MM/yyyy')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-xs">
                                {validadeInfo.data ? (
                                  <div className="flex items-center gap-1">
                                    <span className={cn(vencido && "text-destructive")}>
                                      {format(new Date(validadeInfo.data), 'dd/MM/yyyy')}
                                    </span>
                                    {vencido && <AlertTriangle className="h-3 w-3 text-destructive" />}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      handleEdit(entrada);
                                      setHistoricoDialogOpen(false);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      handleDeleteClick(entrada.id);
                                      setHistoricoDialogOpen(false);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="entregas" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma entrega registrada</p>
                  <p className="text-xs mt-1">As entregas de EPI aparecerão aqui quando forem realizadas</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoricoDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
