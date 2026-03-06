import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileCheck, Plus, Search, Users, Loader2, Eye, Trash2, Hash, Calendar as CalendarIcon, X } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClienteSST {
  id: string;
  nome: string;
  sigla: string | null;
  cliente_empresa_id: string | null;
}

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

interface Colaborador {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  cargo_id?: string | null;
}

interface MatrizEpiCargo {
  id: string;
  cargo_id: string;
  epi_id: string | null;
  tipo_epi_nr6: string | null;
  obrigatorio: boolean;
  cadastro_epis?: CadastroEPI | null;
}

interface EntregaEPI {
  id: string;
  empresa_id: string;
  colaborador_id: string;
  epi_id: string;
  estoque_id: string;
  quantidade: number;
  data_entrega: string;
  observacoes: string | null;
  termo: string | null;
  assinatura_base64: string | null;
  hash_sha256: string | null;
  status: 'entregue' | 'devolvido' | 'cancelado';
  created_at: string;
  colaboradores?: Colaborador;
  cadastro_epis?: CadastroEPI;
  estoque_epis?: EstoqueEPI;
}

interface EpiSelecionado {
  matriz_id: string;
  epi_id: string | null;
  tipo_epi_nr6: string | null;
  nome_modelo: string | null;
  numero_ca: string | null;
  quantidade: number;
  data_entrega: Date;
  estoque_id: string;
  obrigatorio: boolean;
  quantidade_estoque: number;
}

interface FormEntrega {
  colaborador_id: string;
  episSelecionados: EpiSelecionado[];
  observacoes: string;
  termo: string;
  assinatura_base64: string;
}

const initialFormState: FormEntrega = {
  colaborador_id: '',
  episSelecionados: [],
  observacoes: '',
  termo: '',
  assinatura_base64: '',
};

export function ToriqEPIEntregas() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { empresaMode, isInEmpresaMode } = useEmpresaMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState<FormEntrega>(initialFormState);
  const [entregas, setEntregas] = useState<EntregaEPI[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [episCadastrados, setEpisCadastrados] = useState<CadastroEPI[]>([]);
  const [episDoColaborador, setEpisDoColaborador] = useState<MatrizEpiCargo[]>([]);
  const [lotesDisponiveis, setLotesDisponiveis] = useState<EstoqueEPI[]>([]);
  const [clientesSST, setClientesSST] = useState<ClienteSST[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingEntrega, setViewingEntrega] = useState<EntregaEPI | null>(null);

  const empresaSstId = profile?.empresa_id;
  
  // Encontrar o cliente selecionado para obter o cliente_empresa_id
  const clienteSelecionado = clientesSST.find(c => c.id === selectedClienteId);
  const empresaId = clienteSelecionado?.cliente_empresa_id || (isInEmpresaMode && empresaMode ? empresaMode.empresaId : null);

  // Carregar clientes da empresa SST (tabela clientes_sst)
  const loadClientesSST = async () => {
    if (!empresaSstId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('clientes_sst')
        .select('id, nome, sigla, cliente_empresa_id')
        .eq('empresa_sst_id', empresaSstId)
        .order('nome');

      if (error) throw error;
      setClientesSST(data || []);
      
      // Se já estiver em modo empresa, selecionar automaticamente
      if (isInEmpresaMode && empresaMode) {
        const clienteDoModo = (data || []).find((c: ClienteSST) => c.cliente_empresa_id === empresaMode.empresaId);
        if (clienteDoModo) {
          setSelectedClienteId(clienteDoModo.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar clientes SST:', error);
    }
  };

  // Carregar colaboradores com cargo_id
  const loadColaboradores = async () => {
    if (!empresaId) return;

    try {
      // Buscar colaboradores
      const { data: colabData, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf, cargo, setor')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (colabError) throw colabError;

      // Buscar cargos para mapear nome -> id
      const { data: cargosData, error: cargosError } = await supabase
        .from('cargos')
        .select('id, nome')
        .eq('empresa_id', empresaId);

      if (cargosError) throw cargosError;

      // Mapear colaboradores com cargo_id
      const colaboradoresComCargoId = (colabData || []).map(colab => {
        const cargoEncontrado = (cargosData || []).find(
          c => c.nome?.toLowerCase() === colab.cargo?.toLowerCase()
        );
        return {
          ...colab,
          cargo_id: cargoEncontrado?.id || null
        };
      });

      setColaboradores(colaboradoresComCargoId);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  };

  // Carregar EPIs do colaborador baseado no cargo (matriz_epi_cargo)
  const loadEpisDoColaborador = async (colaboradorId: string) => {
    if (!empresaId || !colaboradorId) {
      setEpisDoColaborador([]);
      return;
    }

    try {
      // Encontrar o colaborador selecionado
      const colaborador = colaboradores.find(c => c.id === colaboradorId);
      if (!colaborador?.cargo_id) {
        setEpisDoColaborador([]);
        return;
      }

      // Buscar EPIs da matriz para o cargo do colaborador
      const { data, error } = await supabase
        .from('matriz_epi_cargo')
        .select(`
          id,
          cargo_id,
          epi_id,
          tipo_epi_nr6,
          obrigatorio,
          cadastro_epis (
            id,
            nome_modelo,
            tipo_epi,
            fabricante,
            numero_ca
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('cargo_id', colaborador.cargo_id);

      if (error) throw error;
      setEpisDoColaborador(data || []);
    } catch (error) {
      console.error('Erro ao carregar EPIs do colaborador:', error);
      setEpisDoColaborador([]);
    }
  };

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

  // Carregar todos os lotes disponíveis da empresa
  const loadLotesDisponiveis = async () => {
    if (!empresaId) {
      setLotesDisponiveis([]);
      return;
    }

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
        .gt('quantidade_atual', 0)
        .order('data_recebimento', { ascending: true });

      if (error) throw error;
      
      // Filtrar lotes não vencidos ou que não bloqueiam vencido
      const lotesValidos = (data || []).filter(lote => {
        if (!lote.bloquear_vencido) return true;
        const validade = lote.validade_fabricante || lote.validade_ca || lote.validade_operacional;
        if (!validade) return true;
        return new Date(validade) > new Date();
      });
      
      setLotesDisponiveis(lotesValidos);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
    }
  };

  // Carregar entregas
  const loadEntregas = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregas_epis')
        .select(`
          *,
          colaboradores (
            id,
            nome,
            cpf,
            cargo,
            setor
          ),
          cadastro_epis (
            id,
            nome_modelo,
            tipo_epi,
            fabricante,
            numero_ca
          ),
          estoque_epis (
            id,
            codigo_lote,
            codigo_entrada
          )
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntregas(data || []);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as entregas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar clientes SST ao iniciar
  useEffect(() => {
    loadClientesSST();
  }, [empresaSstId]);

  // Carregar dados quando empresa cliente mudar
  useEffect(() => {
    if (empresaId) {
      loadColaboradores();
      loadEpisCadastrados();
      loadEntregas();
      loadLotesDisponiveis();
    } else {
      setColaboradores([]);
      setEpisCadastrados([]);
      setEntregas([]);
      setLotesDisponiveis([]);
      setLoading(false);
    }
  }, [empresaId]);

  // Atualizar EPIs do colaborador quando colaborador mudar
  useEffect(() => {
    if (form.colaborador_id) {
      loadEpisDoColaborador(form.colaborador_id);
      // Limpar EPIs selecionados quando mudar colaborador
      setForm(prev => ({ ...prev, episSelecionados: [] }));
    } else {
      setEpisDoColaborador([]);
    }
  }, [form.colaborador_id, colaboradores]);

  // Gerar termo padrão
  const gerarTermo = () => {
    if (form.episSelecionados.length === 0) return '';
    
    const episTexto = form.episSelecionados.map(epi => {
      const dataFormatada = format(epi.data_entrega, 'dd/MM/yyyy');
      return `- ${epi.tipo_epi_nr6 || epi.nome_modelo || '-'} (Qtd: ${epi.quantidade}, Data: ${dataFormatada})`;
    }).join('\n');
    
    return `EPIs entregues:
${episTexto}

Observações: ${form.observacoes || '(edite se necessário)'}`;
  };

  // Atualizar termo quando EPIs selecionados mudarem
  useEffect(() => {
    if (form.colaborador_id && form.episSelecionados.length > 0) {
      setForm(prev => ({ ...prev, termo: gerarTermo() }));
    }
  }, [form.colaborador_id, form.episSelecionados, form.observacoes]);

  // Gerar hash SHA-256
  const generateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Canvas para assinatura
  useEffect(() => {
    if (dialogOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [dialogOpen]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureBase64 = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  // Filtrar entregas
  const filteredEntregas = entregas.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.colaboradores?.nome?.toLowerCase().includes(searchLower)) ||
      (item.cadastro_epis?.nome_modelo?.toLowerCase().includes(searchLower)) ||
      (item.estoque_epis?.codigo_lote?.toLowerCase().includes(searchLower))
    );
  });

  const handleOpenDialog = () => {
    setForm(initialFormState);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleViewClick = (entrega: EntregaEPI) => {
    setViewingEntrega(entrega);
    setViewDialogOpen(true);
  };

  const handleSave = async () => {
    if (!empresaId) return;

    // Validações
    if (!form.colaborador_id) {
      toast({ title: 'Erro', description: 'Selecione um colaborador.', variant: 'destructive' });
      return;
    }
    if (form.episSelecionados.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um EPI.', variant: 'destructive' });
      return;
    }

    // Validar quantidades
    for (const epi of form.episSelecionados) {
      if (epi.quantidade <= 0) {
        toast({ title: 'Erro', description: `Quantidade do EPI "${epi.tipo_epi_nr6 || epi.nome_modelo}" deve ser maior que zero.`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      // Gerar hash do termo + assinatura
      const assinaturaBase64 = getSignatureBase64();
      const conteudoHash = `${form.termo}|${assinaturaBase64}|${new Date().toISOString()}`;
      const hash = await generateHash(conteudoHash);

      // Inserir cada EPI como uma entrega separada
      for (const epi of form.episSelecionados) {
        const { error: insertError } = await supabase
          .from('entregas_epis')
          .insert({
            empresa_id: empresaId,
            colaborador_id: form.colaborador_id,
            epi_id: epi.epi_id || null,
            estoque_id: epi.estoque_id || null,
            tipo_epi_nr6: epi.tipo_epi_nr6 || null,
            quantidade: epi.quantidade,
            data_entrega: format(epi.data_entrega, 'yyyy-MM-dd'),
            observacoes: form.observacoes || null,
            termo: form.termo || null,
            assinatura_base64: assinaturaBase64 || null,
            hash_sha256: hash,
            status: 'entregue',
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Sucesso',
        description: `${form.episSelecionados.length} entrega(s) registrada(s) com sucesso!`,
      });

      setDialogOpen(false);
      setForm(initialFormState);
      loadEntregas();
    } catch (error) {
      console.error('Erro ao salvar entrega:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a entrega.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const entrega = entregas.find(e => e.id === deletingId);
      
      // Cancelar entrega (não deletar, apenas mudar status)
      const { error } = await supabase
        .from('entregas_epis')
        .update({ status: 'cancelado' })
        .eq('id', deletingId);

      if (error) throw error;

      // Devolver quantidade ao estoque
      if (entrega) {
        const { data: estoqueAtual } = await supabase
          .from('estoque_epis')
          .select('quantidade_atual')
          .eq('id', entrega.estoque_id)
          .single();

        if (estoqueAtual) {
          await supabase
            .from('estoque_epis')
            .update({ quantidade_atual: estoqueAtual.quantidade_atual + entrega.quantidade })
            .eq('id', entrega.estoque_id);
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Entrega cancelada com sucesso!',
      });

      loadEntregas();
    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a entrega.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleLimpar = () => {
    setForm(initialFormState);
    clearSignature();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entregue':
        return <Badge className="bg-green-500 hover:bg-green-500">Entregue</Badge>;
      case 'devolvido':
        return <Badge className="bg-blue-500 hover:bg-blue-500">Devolvido</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Entregas de EPIs
          </h1>
          <p className="text-muted-foreground">
            Registro de entregas de EPIs aos colaboradores
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Seletor de Cliente */}
          <Select
            value={selectedClienteId}
            onValueChange={(value) => {
              setSelectedClienteId(value);
              setForm(initialFormState);
            }}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientesSST.length === 0 ? (
                <SelectItem value="none" disabled>
                  Nenhum cliente cadastrado
                </SelectItem>
              ) : (
                clientesSST.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.sigla ? `${cliente.sigla} - ${cliente.nome}` : cliente.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entrega..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={handleOpenDialog} disabled={!empresaId}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entrega
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Entregas</CardTitle>
          <CardDescription>Todas as entregas de EPIs realizadas ({filteredEntregas.length} registros)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma entrega registrada.</p>
              <p className="text-sm">Clique em "Nova Entrega" para registrar.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>EPI</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell>
                        {entrega.data_entrega 
                          ? format(new Date(entrega.data_entrega), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        {entrega.colaboradores?.nome || '-'}
                      </TableCell>
                      <TableCell>{entrega.cadastro_epis?.nome_modelo || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {entrega.estoque_epis?.codigo_lote || entrega.estoque_epis?.codigo_entrada || '-'}
                      </TableCell>
                      <TableCell className="text-center">{entrega.quantidade}</TableCell>
                      <TableCell>{getStatusBadge(entrega.status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {entrega.hash_sha256 ? (
                          <span title={entrega.hash_sha256} className="cursor-help">
                            {entrega.hash_sha256.substring(0, 8)}...
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClick(entrega)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {entrega.status === 'entregue' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(entrega.id)}
                              title="Cancelar entrega"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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

      {/* Dialog de Nova Entrega */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Entrega (com termo)</DialogTitle>
            <DialogDescription>
              Preencha os dados da entrega do EPI ao colaborador
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Colaborador */}
            <div className="grid gap-2">
              <Label htmlFor="colaborador_id">Colaborador</Label>
              <Select
                value={form.colaborador_id}
                onValueChange={(value) => setForm(prev => ({ ...prev, colaborador_id: value, episSelecionados: [] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* EPIs disponíveis para seleção - Dropdown Multiseleção */}
            {form.colaborador_id && (
              <div className="grid gap-2">
                <Label>EPIs disponíveis</Label>
                {episDoColaborador.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum EPI atribuído ao cargo deste colaborador na Matriz de EPI.
                  </p>
                ) : (
                  <Select
                    value=""
                    onValueChange={(matrizId) => {
                      const matriz = episDoColaborador.find(m => m.id === matrizId);
                      if (matriz && !form.episSelecionados.some(e => e.matriz_id === matrizId)) {
                        // Buscar quantidade em estoque para este EPI
                        // Primeiro tenta por epi_id, se não encontrar, busca pelo tipo_epi (nome do EPI na coluna EPI do estoque)
                        let estoqueEpi = lotesDisponiveis.filter(l => l.epi_id === matriz.epi_id);
                        
                        // Se não encontrou por epi_id ou se o epi_id é null, buscar pelo tipo_epi_nr6
                        if ((estoqueEpi.length === 0 || !matriz.epi_id) && matriz.tipo_epi_nr6) {
                          estoqueEpi = lotesDisponiveis.filter(l => 
                            l.cadastro_epis?.tipo_epi === matriz.tipo_epi_nr6
                          );
                        }
                        
                        const quantidadeEstoque = estoqueEpi.reduce((acc, l) => acc + (l.quantidade_atual || 0), 0);
                        
                        const novoEpi: EpiSelecionado = {
                          matriz_id: matriz.id,
                          epi_id: matriz.epi_id,
                          tipo_epi_nr6: matriz.tipo_epi_nr6,
                          nome_modelo: matriz.cadastro_epis?.nome_modelo || null,
                          numero_ca: matriz.cadastro_epis?.numero_ca || null,
                          quantidade: 1,
                          data_entrega: new Date(),
                          estoque_id: '',
                          obrigatorio: matriz.obrigatorio,
                          quantidade_estoque: quantidadeEstoque,
                        };
                        setForm(prev => ({
                          ...prev,
                          episSelecionados: [...prev.episSelecionados, novoEpi]
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione os EPIs para adicionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {episDoColaborador.map((matriz) => {
                        const jaSelecionado = form.episSelecionados.some(e => e.matriz_id === matriz.id);
                        return (
                          <SelectItem 
                            key={matriz.id} 
                            value={matriz.id}
                            disabled={jaSelecionado}
                          >
                            {matriz.tipo_epi_nr6 || matriz.cadastro_epis?.nome_modelo || '-'}
                            {matriz.obrigatorio && ' ⚠️'}
                            {jaSelecionado && ' ✓'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Tabela de EPIs selecionados */}
            {form.episSelecionados.length > 0 && (
              <div className="grid gap-2">
                <Label>EPIs selecionados para entrega</Label>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>EPI</TableHead>
                        <TableHead className="w-[100px] text-center">Quant. Estoque</TableHead>
                        <TableHead className="w-[100px]">Quantidade</TableHead>
                        <TableHead className="w-[140px]">Data</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.episSelecionados.map((epi, index) => (
                        <TableRow key={epi.matriz_id}>
                          <TableCell className="font-medium">
                            {epi.tipo_epi_nr6 || epi.nome_modelo || '-'}
                            {epi.numero_ca && <span className="text-muted-foreground text-xs ml-1">(CA: {epi.numero_ca})</span>}
                            {epi.obrigatorio && <span className="text-yellow-500 ml-1">⚠️</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={epi.quantidade_estoque > 0 ? "default" : "destructive"}>
                              {epi.quantidade_estoque > 0 ? epi.quantidade_estoque : 'Sem estoque'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={epi.quantidade_estoque > 0 ? epi.quantidade_estoque : undefined}
                              value={epi.quantidade}
                              onChange={(e) => {
                                const newEpis = [...form.episSelecionados];
                                newEpis[index].quantidade = parseInt(e.target.value) || 1;
                                setForm(prev => ({ ...prev, episSelecionados: newEpis }));
                              }}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {format(epi.data_entrega, 'dd/MM/yyyy')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={epi.data_entrega}
                                  onSelect={(date) => {
                                    if (date) {
                                      const newEpis = [...form.episSelecionados];
                                      newEpis[index].data_entrega = date;
                                      setForm(prev => ({ ...prev, episSelecionados: newEpis }));
                                    }
                                  }}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  episSelecionados: prev.episSelecionados.filter((_, i) => i !== index)
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                placeholder="Ex.: entrega inicial / reposição / substituição..."
                value={form.observacoes}
                onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              />
            </div>

            {/* Termo */}
            <div className="grid gap-2">
              <Label htmlFor="termo">Termo (texto editável)</Label>
              <Textarea
                id="termo"
                rows={4}
                value={form.termo}
                onChange={(e) => setForm(prev => ({ ...prev, termo: e.target.value }))}
              />
            </div>

            {/* Assinatura */}
            <div className="grid gap-2">
              <Label>Assinatura do colaborador (desenhe abaixo)</Label>
              <div className="border rounded-md bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearSignature} className="w-fit">
                Limpar assinatura
              </Button>
            </div>

            {/* Aviso */}
            <div className="bg-muted p-3 rounded-md text-sm">
              <p>
                Ao salvar, o sistema gera <strong>timestamp</strong> e <strong>hash SHA-256</strong> do termo
                (incluindo assinatura em base64).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleLimpar}>
              Limpar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Entrega</DialogTitle>
          </DialogHeader>

          {viewingEntrega && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Colaborador</Label>
                  <p className="font-medium">{viewingEntrega.colaboradores?.nome || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">EPI</Label>
                  <p className="font-medium">{viewingEntrega.cadastro_epis?.nome_modelo || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Lote</Label>
                  <p className="font-mono text-sm">
                    {viewingEntrega.estoque_epis?.codigo_lote || viewingEntrega.estoque_epis?.codigo_entrada || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quantidade</Label>
                  <p className="font-medium">{viewingEntrega.quantidade}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {viewingEntrega.data_entrega 
                      ? format(new Date(viewingEntrega.data_entrega), 'dd/MM/yyyy')
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(viewingEntrega.status)}</div>
              </div>

              {viewingEntrega.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p>{viewingEntrega.observacoes}</p>
                </div>
              )}

              {viewingEntrega.termo && (
                <div>
                  <Label className="text-muted-foreground">Termo</Label>
                  <pre className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                    {viewingEntrega.termo}
                  </pre>
                </div>
              )}

              {viewingEntrega.assinatura_base64 && (
                <div>
                  <Label className="text-muted-foreground">Assinatura</Label>
                  <div className="border rounded-md bg-white p-2 mt-1">
                    <img 
                      src={viewingEntrega.assinatura_base64} 
                      alt="Assinatura" 
                      className="max-h-32"
                    />
                  </div>
                </div>
              )}

              {viewingEntrega.hash_sha256 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Hash SHA-256
                  </Label>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded-md mt-1">
                    {viewingEntrega.hash_sha256}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Cancelamento */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a entrega e devolver a quantidade ao estoque.
              O registro será mantido para histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
