import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Stethoscope, 
  Plus, 
  Search, 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Upload,
  Calendar,
  Heart,
  Activity
} from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Exame {
  id: string;
  colaborador_nome: string;
  tipo_exame: string;
  data_exame: string;
  validade_dias: number;
  aso_arquivo_url: string | null;
  observacoes: string | null;
}

const tiposExame = [
  { value: 'admissional', label: 'Admissional' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'demissional', label: 'Demissional' },
  { value: 'retorno_trabalho', label: 'Retorno ao Trabalho' },
];

const SaudeOcupacional = () => {
  const { user, profile, empresa, loading } = useAuth();
  const { logView, logCreate } = useAccessLog();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exames, setExames] = useState<Exame[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    colaborador_nome: '',
    tipo_exame: '',
    data_exame: '',
    validade_dias: '365',
    observacoes: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && profile && !['empresa_sst', 'cliente_final', 'admin_vertical'].includes(profile.role)) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  const fetchExames = async () => {
    if (!empresa?.id) {
      setLoadingData(false);
      return;
    }

    const { data, error } = await supabase
      .from('saude_ocupacional')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('data_exame', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar exames",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setExames(data || []);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (empresa?.id) {
      fetchExames();
      logView('Saúde Ocupacional', 'Saúde Ocupacional', 'Acessou a página de saúde ocupacional');
    }
  }, [empresa?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !empresa?.id) return null;

    setUploading(true);
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${empresa.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('aso-files')
      .upload(fileName, selectedFile);

    setUploading(false);

    if (uploadError) {
      toast({
        title: "Erro no upload",
        description: uploadError.message,
        variant: "destructive",
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('aso-files')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa?.id) return;

    let asoUrl: string | null = null;
    if (selectedFile) {
      asoUrl = await uploadFile();
    }

    const { error } = await supabase
      .from('saude_ocupacional')
      .insert({
        empresa_id: empresa.id,
        colaborador_nome: formData.colaborador_nome,
        tipo_exame: formData.tipo_exame,
        data_exame: formData.data_exame,
        validade_dias: parseFloat(formData.validade_dias),
        aso_arquivo_url: asoUrl,
        observacoes: formData.observacoes || null,
      });

    if (error) {
      toast({
        title: "Erro ao cadastrar exame",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Exame cadastrado",
        description: "O exame foi registrado com sucesso.",
      });
      setDialogOpen(false);
      setFormData({
        colaborador_nome: '',
        tipo_exame: '',
        data_exame: '',
        validade_dias: '365',
        observacoes: '',
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchExames();
    }
  };

  const calcularValidade = (dataExame: string, validadeDias: number) => {
    const dataVencimento = addDays(new Date(dataExame), validadeDias);
    const hoje = new Date();
    return {
      dataVencimento,
      vencido: isBefore(dataVencimento, hoje),
    };
  };

  const getTipoLabel = (tipo: string) => {
    return tiposExame.find(t => t.value === tipo)?.label || tipo;
  };

  const filteredExames = exames.filter(exame => {
    const matchSearch = exame.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFilter === 'todos' || exame.tipo_exame === tipoFilter;
    return matchSearch && matchTipo;
  });

  const examesVencidos = exames.filter(e => calcularValidade(e.data_exame, e.validade_dias).vencido).length;

  const handleVoltar = () => {
    if (profile?.role === 'empresa_sst') {
      navigate('/sst');
    } else if (profile?.role === 'cliente_final') {
      navigate('/cliente');
    } else {
      navigate('/admin');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleVoltar}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Saúde Ocupacional</h1>
                <p className="text-xs text-muted-foreground">{empresa?.nome}</p>
              </div>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Novo Exame</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Cadastrar Exame Ocupacional
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="colaborador_nome">Nome do Colaborador *</Label>
                  <Input
                    id="colaborador_nome"
                    value={formData.colaborador_nome}
                    onChange={(e) => setFormData({ ...formData, colaborador_nome: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_exame">Tipo de Exame *</Label>
                  <Select
                    value={formData.tipo_exame}
                    onValueChange={(value) => setFormData({ ...formData, tipo_exame: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposExame.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_exame">Data do Exame *</Label>
                    <Input
                      id="data_exame"
                      type="date"
                      value={formData.data_exame}
                      onChange={(e) => setFormData({ ...formData, data_exame: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validade_dias">Validade (dias) *</Label>
                    <Input
                      id="validade_dias"
                      type="number"
                      min="1"
                      value={formData.validade_dias}
                      onChange={(e) => setFormData({ ...formData, validade_dias: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aso_arquivo">Arquivo ASO (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="aso_arquivo"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="flex-1"
                    />
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={uploading || !formData.tipo_exame}>
                    {uploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Cadastrar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{exames.length}</p>
              <p className="text-xs text-muted-foreground">Exames registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exames Válidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{exames.length - examesVencidos}</p>
              <p className="text-xs text-muted-foreground">Dentro da validade</p>
            </CardContent>
          </Card>
          <Card className={examesVencidos > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exames Vencidos</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${examesVencidos > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${examesVencidos > 0 ? 'text-destructive' : ''}`}>{examesVencidos}</p>
              <p className="text-xs text-muted-foreground">Precisam renovar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Com ASO</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {exames.filter(e => e.aso_arquivo_url).length}
              </p>
              <p className="text-xs text-muted-foreground">Arquivos anexados</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for expired exams */}
        {examesVencidos > 0 && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Atenção: Exames vencidos!</p>
              <p className="text-sm text-muted-foreground">
                Existem {examesVencidos} exame(s) com validade expirada que precisam ser renovados.
              </p>
            </div>
          </div>
        )}

        {/* Search, Filter and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Exames Registrados
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposExame.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredExames.length === 0 ? (
                <div className="text-center py-12">
                  <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum exame encontrado</p>
                </div>
              ) : (
                filteredExames.map((exame) => {
                  const { dataVencimento, vencido } = calcularValidade(exame.data_exame, exame.validade_dias);
                  return (
                    <div 
                      key={exame.id} 
                      className={`p-4 border rounded-lg space-y-3 ${vencido ? 'border-destructive bg-destructive/5' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{exame.colaborador_nome}</p>
                          <Badge variant="outline" className="mt-1">
                            {getTipoLabel(exame.tipo_exame)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {exame.aso_arquivo_url && (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                          {vencido ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Vencido
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 bg-green-500/10 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Válido
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(exame.data_exame), 'dd/MM/yyyy')}
                        </span>
                        <span>Vence: {format(dataVencimento, 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo de Exame</TableHead>
                    <TableHead>Data do Exame</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>ASO</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExames.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum exame encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExames.map((exame) => {
                      const { dataVencimento, vencido } = calcularValidade(exame.data_exame, exame.validade_dias);
                      return (
                        <TableRow key={exame.id} className={vencido ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{exame.colaborador_nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTipoLabel(exame.tipo_exame)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(exame.data_exame), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {exame.aso_arquivo_url ? (
                              <a 
                                href={exame.aso_arquivo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                Ver ASO
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {vencido ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Vencido
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                <CheckCircle className="h-3 w-3" />
                                Válido
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SaudeOcupacional;
