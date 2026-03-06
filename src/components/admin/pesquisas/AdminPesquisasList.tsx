import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  BarChart3,
  Play,
  Pause,
  Archive,
  ExternalLink,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AdminPesquisaEditor } from './AdminPesquisaEditor';
import { AdminPesquisaResultados } from './AdminPesquisaResultados';

interface Pesquisa {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  status: 'rascunho' | 'aberta' | 'fechada' | 'arquivada';
  tipo: string;
  total_votos: number;
  created_at: string;
  autor: {
    nome: string;
    sobrenome: string;
  } | null;
  categoria: {
    nome: string;
    cor: string;
  } | null;
}

export function AdminPesquisasList() {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showResultados, setShowResultados] = useState(false);
  const [selectedPesquisa, setSelectedPesquisa] = useState<Pesquisa | null>(null);

  useEffect(() => {
    fetchPesquisas();
  }, [search, statusFilter]);

  const fetchPesquisas = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('pesquisas_opiniao')
        .select(`
          id, titulo, slug, descricao, status, tipo, total_votos, created_at,
          autor:blog_autores(nome, sobrenome),
          categoria:blog_categorias(nome, cor)
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPesquisas(data || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
      toast.error('Erro ao carregar pesquisas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (pesquisaId: string, newStatus: string) => {
    try {
      // Buscar dados da pesquisa antes de atualizar
      const pesquisaAtual = pesquisas.find(p => p.id === pesquisaId);
      
      const { error } = await (supabase as any)
        .from('pesquisas_opiniao')
        .update({ status: newStatus })
        .eq('id', pesquisaId);

      if (error) throw error;

      // Disparar newsletter se está abrindo a votação pela primeira vez
      if (newStatus === 'aberta' && pesquisaAtual && pesquisaAtual.status !== 'aberta') {
        sendNewsletterNotification(pesquisaId, pesquisaAtual.titulo, pesquisaAtual.slug, pesquisaAtual.descricao);
      }

      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);
      fetchPesquisas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const sendNewsletterNotification = async (pesquisaId: string, titulo: string, slug: string, descricao: string) => {
    try {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          tipo: 'pesquisa',
          referencia_id: pesquisaId,
          titulo,
          url: `${baseUrl}/pesquisas/${slug}`,
          descricao,
        },
      });
      
      if (error) {
        console.error('Erro ao enviar newsletter:', error);
      } else if (data?.total > 0) {
        toast.success(`Newsletter enviada para ${data.total} inscritos!`);
      }
    } catch (err) {
      console.error('Erro ao enviar newsletter:', err);
    }
  };

  const handleDelete = async (pesquisaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pesquisa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('pesquisas_opiniao')
        .delete()
        .eq('id', pesquisaId);

      if (error) throw error;

      toast.success('Pesquisa excluída com sucesso');
      fetchPesquisas();
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      toast.error('Erro ao excluir pesquisa');
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pesquisas/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      rascunho: 'Rascunho',
      aberta: 'Aberta',
      fechada: 'Fechada',
      arquivada: 'Arquivada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      rascunho: 'bg-gray-500',
      aberta: 'bg-green-500',
      fechada: 'bg-yellow-500',
      arquivada: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const handleEdit = (pesquisa: Pesquisa) => {
    setSelectedPesquisa(pesquisa);
    setShowEditor(true);
  };

  const handleViewResults = (pesquisa: Pesquisa) => {
    setSelectedPesquisa(pesquisa);
    setShowResultados(true);
  };

  const handleNewPesquisa = () => {
    setSelectedPesquisa(null);
    setShowEditor(true);
  };

  if (showEditor) {
    return (
      <AdminPesquisaEditor
        pesquisa={selectedPesquisa}
        onBack={() => {
          setShowEditor(false);
          setSelectedPesquisa(null);
          fetchPesquisas();
        }}
      />
    );
  }

  if (showResultados && selectedPesquisa) {
    return (
      <AdminPesquisaResultados
        pesquisa={selectedPesquisa}
        onBack={() => {
          setShowResultados(false);
          setSelectedPesquisa(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pesquisas de Opinião</h2>
          <p className="text-muted-foreground">
            Crie e gerencie enquetes para coletar opiniões do público
          </p>
        </div>
        <Button onClick={handleNewPesquisa}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Pesquisa
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pesquisas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="fechada">Fechada</SelectItem>
            <SelectItem value="arquivada">Arquivada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Votos</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </TableCell>
              </TableRow>
            ) : pesquisas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {search || statusFilter ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa criada ainda'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pesquisas.map((pesquisa) => (
                <TableRow key={pesquisa.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pesquisa.titulo}</p>
                      {pesquisa.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {pesquisa.descricao}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {pesquisa.categoria ? (
                      <Badge style={{ backgroundColor: pesquisa.categoria.cor }}>
                        {pesquisa.categoria.nome}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(pesquisa.status)}>
                      {getStatusLabel(pesquisa.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{pesquisa.total_votos}</span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(pesquisa.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(pesquisa)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewResults(pesquisa)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Ver Resultados
                        </DropdownMenuItem>
                        {pesquisa.status === 'aberta' && (
                          <DropdownMenuItem onClick={() => window.open(`/pesquisas/${pesquisa.slug}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Página
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => copyLink(pesquisa.slug)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="border-t"
                          onClick={() => {
                            if (pesquisa.status === 'rascunho') {
                              handleStatusChange(pesquisa.id, 'aberta');
                            } else if (pesquisa.status === 'aberta') {
                              handleStatusChange(pesquisa.id, 'fechada');
                            } else if (pesquisa.status === 'fechada') {
                              handleStatusChange(pesquisa.id, 'aberta');
                            }
                          }}
                        >
                          {pesquisa.status === 'rascunho' && (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Abrir Votação
                            </>
                          )}
                          {pesquisa.status === 'aberta' && (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Fechar Votação
                            </>
                          )}
                          {pesquisa.status === 'fechada' && (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Reabrir Votação
                            </>
                          )}
                        </DropdownMenuItem>
                        {pesquisa.status !== 'arquivada' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(pesquisa.id, 'arquivada')}>
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(pesquisa.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
