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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Mail,
  Settings,
  Copy,
  UserMinus,
  Send,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminNewsletterEditor from './AdminNewsletterEditor';
import AdminNewsletterConfig from './AdminNewsletterConfig';

interface Inscrito {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string | null;
  cargo: string | null;
  ativo: boolean;
  created_at: string;
}

interface Conteudo {
  id: string;
  titulo: string;
  slug: string;
  descricao: string | null;
  status: string;
  agendado_para: string | null;
  enviado_em: string | null;
  total_enviados: number;
  created_at: string;
}

export default function AdminNewsletterList() {
  const [activeTab, setActiveTab] = useState('inscritos');
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedConteudo, setSelectedConteudo] = useState<Conteudo | null>(null);
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [selectedInscrito, setSelectedInscrito] = useState<Inscrito | null>(null);
  const [unsubscribing, setUnsubscribing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inscritos') {
        const { data, error } = await (supabase as any)
          .from('newsletter_inscricoes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInscritos(data || []);
      } else if (activeTab === 'conteudos') {
        const { data, error } = await (supabase as any)
          .from('newsletter_conteudos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setConteudos(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/newsletter`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada para a área de transferência!');
  };

  const handleUnsubscribe = async () => {
    if (!selectedInscrito) return;
    
    setUnsubscribing(true);
    try {
      const { error } = await (supabase as any)
        .from('newsletter_inscricoes')
        .update({
          ativo: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInscrito.id);

      if (error) throw error;

      toast.success('Inscrito removido com sucesso');
      setShowUnsubscribeDialog(false);
      setSelectedInscrito(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao desinscrever:', error);
      toast.error('Erro ao remover inscrito');
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleDeleteConteudo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    try {
      const { error } = await (supabase as any)
        .from('newsletter_conteudos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Conteúdo excluído com sucesso');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir conteúdo');
    }
  };

  const handleSendNow = async (conteudo: Conteudo) => {
    try {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          tipo: 'newsletter',
          referencia_id: conteudo.id,
          titulo: conteudo.titulo,
          url: `${baseUrl}/newsletter`,
          descricao: conteudo.descricao,
        },
      });

      if (error) throw error;

      // Atualizar status
      await (supabase as any)
        .from('newsletter_conteudos')
        .update({
          status: 'enviado',
          enviado_em: new Date().toISOString(),
          total_enviados: data?.total || 0,
        })
        .eq('id', conteudo.id);

      toast.success(`Newsletter enviada para ${data?.total || 0} inscritos!`);
      fetchData();
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar newsletter');
    }
  };

  const filteredInscritos = inscritos.filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    (i.empresa && i.empresa.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredConteudos = conteudos.filter(c =>
    c.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'agendado':
        return <Badge className="bg-blue-500">Agendado</Badge>;
      case 'enviado':
        return <Badge className="bg-green-500">Enviado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (showEditor) {
    return (
      <AdminNewsletterEditor
        conteudo={selectedConteudo}
        onBack={() => {
          setShowEditor(false);
          setSelectedConteudo(null);
          fetchData();
        }}
      />
    );
  }

  if (showConfig) {
    return (
      <AdminNewsletterConfig
        onBack={() => {
          setShowConfig(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Newsletter</h2>
          <p className="text-muted-foreground">
            Gerencie inscritos e conteúdos da newsletter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar URL
          </Button>
          <Button variant="outline" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button onClick={() => {
            setSelectedConteudo(null);
            setShowEditor(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Inscritos</p>
              <p className="text-2xl font-bold">{inscritos.filter(i => i.ativo).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conteúdos</p>
              <p className="text-2xl font-bold">{conteudos.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Send className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enviados</p>
              <p className="text-2xl font-bold">{conteudos.filter(c => c.status === 'enviado').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inscritos" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inscritos
          </TabsTrigger>
          <TabsTrigger value="conteudos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Conteúdos
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'inscritos' ? 'Buscar inscritos...' : 'Buscar conteúdos...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Inscritos Tab */}
        <TabsContent value="inscritos" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInscritos.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum inscrito encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Compartilhe a URL da newsletter para começar a receber inscrições.
              </p>
              <Button onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar URL
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInscritos.map((inscrito) => (
                    <TableRow key={inscrito.id}>
                      <TableCell className="font-medium">{inscrito.nome}</TableCell>
                      <TableCell>{inscrito.email}</TableCell>
                      <TableCell>{inscrito.telefone}</TableCell>
                      <TableCell>{inscrito.empresa || '-'}</TableCell>
                      <TableCell>
                        {inscrito.ativo ? (
                          <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inscrito.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(inscrito.email);
                                toast.success('E-mail copiado!');
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar E-mail
                            </DropdownMenuItem>
                            {inscrito.ativo && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedInscrito(inscrito);
                                  setShowUnsubscribeDialog(true);
                                }}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Desinscrever
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Conteúdos Tab */}
        <TabsContent value="conteudos" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConteudos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum conteúdo criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie conteúdos para enviar para seus inscritos.
              </p>
              <Button onClick={() => {
                setSelectedConteudo(null);
                setShowEditor(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Conteúdo
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agendado</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConteudos.map((conteudo) => (
                    <TableRow key={conteudo.id}>
                      <TableCell className="font-medium">{conteudo.titulo}</TableCell>
                      <TableCell>{getStatusBadge(conteudo.status)}</TableCell>
                      <TableCell>
                        {conteudo.agendado_para
                          ? format(new Date(conteudo.agendado_para), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>{conteudo.total_enviados}</TableCell>
                      <TableCell>
                        {format(new Date(conteudo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedConteudo(conteudo);
                                setShowEditor(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {conteudo.status !== 'enviado' && (
                              <DropdownMenuItem onClick={() => handleSendNow(conteudo)}>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Agora
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteConteudo(conteudo.id)}
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
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Unsubscribe Dialog */}
      <Dialog open={showUnsubscribeDialog} onOpenChange={setShowUnsubscribeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desinscrever usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover {selectedInscrito?.nome} da newsletter?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsubscribeDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleUnsubscribe} disabled={unsubscribing}>
              {unsubscribing ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
