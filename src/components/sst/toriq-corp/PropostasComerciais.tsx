import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  FileText, 
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/api/client';
import { PropostaComercialEditor } from '@/components/admin/PropostaComercialEditor';
import { PropostaComercialServicosSSTEditor } from '@/components/admin/PropostaComercialServicosSSTEditor';
import { PropostaComercialVertical365Editor } from '@/components/admin/PropostaComercialVertical365Editor';

interface PropostaComercial {
  id: string;
  identificador: string;
  status: 'aguardando' | 'aprovada' | 'rejeitada';
  observacao?: string;
  cliente_empresa: string;
  cliente_cidade?: string;
  data_proposta: string;
  validade_dias: number;
  valor_total: number;
  planos_selecionados: string[];
  dados_calculadora: any;
  created_at: string;
  tipo_orcamento?: 'treinamento_normativo' | 'servicos_sst' | 'vertical365';
  dados_orcamento?: any;
  // Todos os outros campos para reconstruir a proposta
  titulo?: string;
  titulo_modulo?: string;
  titulo_dores?: string;
  titulo_solucoes?: string;
  titulo_diferenciais?: string;
  titulo_investimento?: string;
  titulo_pagamento?: string;
  titulo_infos?: string;
  titulo_passos?: string;
  descricao?: string;
  modulo?: string;
  publico?: string;
  dores?: string;
  solucoes?: string;
  diferenciais?: string;
  pagamento?: string;
  infos?: string;
  passos?: string;
  cliente_razao_social?: string;
  cliente_cnpj?: string;
  cliente_contato?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_bairro?: string;
  cliente_uf?: string;
  cliente_cep?: string;
  cliente_distancia?: number;
  card_id?: string;
  modelo_nome?: string;
  titulo_servicos?: string;
  servicos?: string;
  modo_exibicao_valores?: string;
}

interface PropostasComerciaProps {
  onClose: () => void;
  cardId?: string;
  initialSearchTerm?: string;
}

const fmtBRL = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseDateBR = (isoDate: string) => {
  try {
    const d = isoDate ? new Date(isoDate) : new Date();
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
  } catch { return "—"; }
};

const STATUS_CONFIG = {
  aguardando: { label: 'Aguardando', color: 'bg-warning', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'bg-success', icon: CheckCircle2 },
  rejeitada: { label: 'Rejeitada', color: 'bg-destructive', icon: XCircle }
};

export function PropostasComerciais({ onClose, cardId, initialSearchTerm = '' }: PropostasComerciaProps) {
  const { empresa } = useAuth();
  const empresaId = empresa?.id;
  
  const [propostas, setPropostas] = useState<PropostaComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para visualização/edição
  const [selectedProposta, setSelectedProposta] = useState<PropostaComercial | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showObservacaoDialog, setShowObservacaoDialog] = useState(false);
  const [observacaoTemp, setObservacaoTemp] = useState('');
  const [statusTemp, setStatusTemp] = useState<'aguardando' | 'aprovada' | 'rejeitada'>('aguardando');
  const [savingStatus, setSavingStatus] = useState(false);

  // Carregar propostas
  useEffect(() => {
    loadPropostas();
  }, [empresaId, cardId]);

  const loadPropostas = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const [dataTreinamentos, dataServicosSST, dataVertical365] = await Promise.all([
        api.get<any[]>('/funil-comercial/propostas/treinamentos').catch(() => [] as any[]),
        api.get<any[]>('/funil-comercial/propostas/servicos-sst').catch(() => [] as any[]),
        api.get<any[]>('/funil-comercial/propostas/vertical365').catch(() => [] as any[]),
      ]);

      // Combinar, anotar tipo e filtrar por card_id no cliente quando necessário
      let todasPropostas = [
        ...(dataTreinamentos || []).map((p: any) => ({ ...p, tipo_orcamento: p.tipo_orcamento || 'treinamento_normativo' })),
        ...(dataServicosSST || []).map((p: any) => ({ ...p, tipo_orcamento: 'servicos_sst' })),
        ...(dataVertical365 || []).map((p: any) => ({ ...p, tipo_orcamento: 'vertical365' }))
      ];

      // Filtro client-side por card_id (o endpoint não aceita query param para card_id)
      if (cardId) {
        todasPropostas = todasPropostas.filter((p: any) => p.card_id === cardId);
      }

      todasPropostas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPropostas(todasPropostas);
    } catch (error: any) {
      console.error('Erro ao carregar propostas:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar propostas
  const propostasFiltradas = propostas.filter(p => {
    const matchSearch = 
      p.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_empresa.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  // Abrir proposta no editor
  const handleVisualizarProposta = (proposta: PropostaComercial) => {
    setSelectedProposta(proposta);
    setShowEditor(true);
  };

  // Abrir dialog de status/observação
  const handleEditarStatus = (proposta: PropostaComercial) => {
    setSelectedProposta(proposta);
    setStatusTemp(proposta.status);
    setObservacaoTemp(proposta.observacao || '');
    setShowObservacaoDialog(true);
  };

  // Salvar status e observação
  const handleSalvarStatus = async () => {
    if (!selectedProposta) return;

    setSavingStatus(true);
    try {
      // Determinar o path correto baseado no tipo de orçamento
      const subPath = selectedProposta.tipo_orcamento === 'servicos_sst'
        ? 'servicos-sst'
        : selectedProposta.tipo_orcamento === 'vertical365'
        ? 'vertical365'
        : 'treinamentos';

      await api.put(
        `/funil-comercial/propostas/${subPath}/${selectedProposta.id}`,
        { status: statusTemp, observacao: observacaoTemp }
      );

      toast.success('Status atualizado com sucesso!');
      setShowObservacaoDialog(false);
      loadPropostas();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setSavingStatus(false);
    }
  };

  // Deletar proposta
  const handleDeletarProposta = async (proposta: PropostaComercial) => {
    if (!confirm(`Deseja realmente excluir a proposta ${proposta.identificador}?`)) return;

    try {
      // Determinar o path correto baseado no tipo de orçamento
      const subPath = proposta.tipo_orcamento === 'servicos_sst'
        ? 'servicos-sst'
        : proposta.tipo_orcamento === 'vertical365'
        ? 'vertical365'
        : 'treinamentos';

      await api.del(`/funil-comercial/propostas/${subPath}/${proposta.id}`);

      toast.success('Proposta excluída com sucesso!');
      loadPropostas();
    } catch (error: any) {
      console.error('Erro ao excluir proposta:', error);
      toast.error('Erro ao excluir proposta');
    }
  };

  // Se estiver mostrando o editor — renderizar em overlay full-screen para não ser cortado pelo dialog pai
  if (showEditor && selectedProposta) {
    const closeEditor = () => {
      setShowEditor(false);
      setSelectedProposta(null);
      loadPropostas();
    };
    
    const clienteInfo = {
      nome: selectedProposta.cliente_empresa,
      razaoSocial: selectedProposta.cliente_razao_social,
      cnpj: selectedProposta.cliente_cnpj,
      cidade: selectedProposta.cliente_cidade,
      contato: selectedProposta.cliente_contato,
      email: selectedProposta.cliente_email,
      telefone: selectedProposta.cliente_telefone
    };
    
    let editorContent: React.ReactNode = null;
    
    if (selectedProposta.tipo_orcamento === 'vertical365') {
      editorContent = (
        <PropostaComercialVertical365Editor
          onClose={closeEditor}
          dadosOrcamento={selectedProposta.dados_orcamento}
          clienteInfo={clienteInfo}
          cardId={selectedProposta.card_id}
          propostaExistente={selectedProposta}
        />
      );
    } else if (selectedProposta.tipo_orcamento === 'servicos_sst') {
      editorContent = (
        <PropostaComercialServicosSSTEditor
          onClose={closeEditor}
          dadosOrcamento={selectedProposta.dados_orcamento || selectedProposta.dados_calculadora}
          clienteInfo={clienteInfo}
          cardId={selectedProposta.card_id}
          propostaExistente={selectedProposta}
        />
      );
    } else {
      editorContent = (
        <PropostaComercialEditor
          onClose={closeEditor}
          dadosCalculadora={selectedProposta.dados_calculadora}
          clienteInfo={clienteInfo}
          cardId={selectedProposta.card_id}
          propostaExistente={selectedProposta}
          tipoOrcamento={selectedProposta.tipo_orcamento || 'treinamento_normativo'}
        />
      );
    }
    
    return (
      <div className="h-full w-full overflow-hidden">
        {editorContent}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Propostas Comerciais
            </h2>
            <p className="text-xs text-muted-foreground">
              {cardId ? 'Propostas deste card' : 'Todas as propostas de treinamentos'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {propostasFiltradas.length} proposta{propostasFiltradas.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filtros */}
      <div className="p-4 border-b flex items-center gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por identificador ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="rejeitada">Rejeitada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Propostas */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : propostasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma proposta encontrada</p>
            {searchTerm && <p className="text-xs">Tente ajustar os filtros</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propostasFiltradas.map((proposta) => {
                const StatusIcon = STATUS_CONFIG[proposta.status].icon;
                return (
                  <TableRow key={proposta.id}>
                    <TableCell className="font-mono text-xs max-w-[140px]">
                      <span className="truncate block" title={proposta.identificador}>
                        {proposta.identificador}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-xs whitespace-nowrap",
                        proposta.tipo_orcamento === 'treinamento_normativo' && "border-primary text-primary",
                        proposta.tipo_orcamento === 'servicos_sst' && "border-info text-info",
                        proposta.tipo_orcamento === 'vertical365' && "border-success text-success"
                      )}>
                        {proposta.tipo_orcamento === 'treinamento_normativo' ? 'Treinamento NR' :
                         proposta.tipo_orcamento === 'servicos_sst' ? 'Serviços SST' :
                         proposta.tipo_orcamento === 'vertical365' ? 'Vertical 365' : 'Treinamento NR'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{proposta.cliente_empresa}</p>
                        {proposta.cliente_cidade && (
                          <p className="text-xs text-muted-foreground">{proposta.cliente_cidade}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {parseDateBR(proposta.data_proposta)}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {fmtBRL(proposta.valor_total || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "gap-1 cursor-pointer hover:opacity-80",
                          proposta.status === 'aprovada' && "border-success text-success",
                          proposta.status === 'rejeitada' && "border-destructive text-destructive",
                          proposta.status === 'aguardando' && "border-warning text-warning"
                        )}
                        onClick={() => handleEditarStatus(proposta)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_CONFIG[proposta.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVisualizarProposta(proposta)}
                          title="Visualizar proposta"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletarProposta(proposta)}
                          title="Excluir proposta"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Dialog de Status/Observação */}
      <Dialog open={showObservacaoDialog} onOpenChange={setShowObservacaoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Status da Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm">Proposta</Label>
              <p className="font-mono text-sm text-muted-foreground">
                {selectedProposta?.identificador}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusTemp} onValueChange={(v) => setStatusTemp(v as typeof statusTemp)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      Aguardando
                    </span>
                  </SelectItem>
                  <SelectItem value="aprovada">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      Aprovada
                    </span>
                  </SelectItem>
                  <SelectItem value="rejeitada">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      Rejeitada
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacaoTemp}
                onChange={(e) => setObservacaoTemp(e.target.value)}
                placeholder="Adicione uma observação sobre esta proposta..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowObservacaoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarStatus} disabled={savingStatus}>
                {savingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
