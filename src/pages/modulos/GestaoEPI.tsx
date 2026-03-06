import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessLog } from '@/hooks/useAccessLog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  HardHat, 
  Plus, 
  Search, 
  ArrowLeft, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { format, addMonths, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EntregaEPI {
  id: string;
  colaborador_nome: string;
  colaborador_cargo: string;
  tipo_epi: string;
  data_entrega: string;
  validade_meses: number;
  responsavel_entrega: string;
}

const GestaoEPI = () => {
  const { user, profile, empresa, loading } = useAuth();
  const { logView, logCreate } = useAccessLog();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entregas, setEntregas] = useState<EntregaEPI[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    colaborador_nome: '',
    colaborador_cargo: '',
    tipo_epi: '',
    data_entrega: '',
    validade_meses: '12',
    responsavel_entrega: '',
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

  const fetchEntregas = async () => {
    if (!empresa?.id) {
      setLoadingData(false);
      return;
    }

    const { data, error } = await supabase
      .from('entregas_epi')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('data_entrega', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar entregas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEntregas(data || []);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (empresa?.id) {
      fetchEntregas();
      logView('EPI', 'Gestão de EPI', 'Acessou a página de gestão de EPI');
    }
  }, [empresa?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa?.id) return;

    const { error } = await supabase
      .from('entregas_epi')
      .insert({
        empresa_id: empresa.id,
        colaborador_nome: formData.colaborador_nome,
        colaborador_cargo: formData.colaborador_cargo,
        tipo_epi: formData.tipo_epi,
        data_entrega: formData.data_entrega,
        validade_meses: parseFloat(formData.validade_meses),
        responsavel_entrega: formData.responsavel_entrega,
      });

    if (error) {
      toast({
        title: "Erro ao cadastrar entrega",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Entrega registrada",
        description: "A entrega de EPI foi cadastrada com sucesso.",
      });
      logCreate('EPI', 'Gestão de EPI', `Registrou entrega de EPI: ${formData.tipo_epi} para ${formData.colaborador_nome}`, { tipo_epi: formData.tipo_epi, colaborador: formData.colaborador_nome });
      setDialogOpen(false);
      setFormData({
        colaborador_nome: '',
        colaborador_cargo: '',
        tipo_epi: '',
        data_entrega: '',
        validade_meses: '12',
        responsavel_entrega: '',
      });
      fetchEntregas();
    }
  };

  const calcularValidade = (dataEntrega: string, validadeMeses: number) => {
    const dataVencimento = addMonths(new Date(dataEntrega), validadeMeses);
    const hoje = new Date();
    return {
      dataVencimento,
      vencido: isBefore(dataVencimento, hoje),
    };
  };

  const filteredEntregas = entregas.filter(entrega =>
    entrega.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrega.tipo_epi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const epiVencidos = entregas.filter(e => calcularValidade(e.data_entrega, e.validade_meses).vencido).length;

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
                <HardHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Gestão de EPI</h1>
                <p className="text-xs text-muted-foreground">{empresa?.nome}</p>
              </div>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nova Entrega</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Registrar Entrega de EPI
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="colaborador_nome">Nome do Colaborador *</Label>
                  <Input
                    id="colaborador_nome"
                    value={formData.colaborador_nome}
                    onChange={(e) => setFormData({ ...formData, colaborador_nome: e.target.value })}
                    placeholder="Ex: João da Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colaborador_cargo">Cargo *</Label>
                  <Input
                    id="colaborador_cargo"
                    value={formData.colaborador_cargo}
                    onChange={(e) => setFormData({ ...formData, colaborador_cargo: e.target.value })}
                    placeholder="Ex: Operador de Máquinas"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_epi">Tipo de EPI *</Label>
                  <Input
                    id="tipo_epi"
                    value={formData.tipo_epi}
                    onChange={(e) => setFormData({ ...formData, tipo_epi: e.target.value })}
                    placeholder="Ex: Capacete, Luvas, Óculos"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_entrega">Data da Entrega *</Label>
                    <Input
                      id="data_entrega"
                      type="date"
                      value={formData.data_entrega}
                      onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validade_meses">Validade (meses) *</Label>
                    <Input
                      id="validade_meses"
                      type="number"
                      min="1"
                      value={formData.validade_meses}
                      onChange={(e) => setFormData({ ...formData, validade_meses: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel_entrega">Responsável pela Entrega *</Label>
                  <Input
                    id="responsavel_entrega"
                    value={formData.responsavel_entrega}
                    onChange={(e) => setFormData({ ...formData, responsavel_entrega: e.target.value })}
                    placeholder="Nome do responsável"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Shield className="h-4 w-4 mr-2" />
                    Registrar
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{entregas.length}</p>
              <p className="text-xs text-muted-foreground">EPIs registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">EPIs Válidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{entregas.length - epiVencidos}</p>
              <p className="text-xs text-muted-foreground">Dentro da validade</p>
            </CardContent>
          </Card>
          <Card className={epiVencidos > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">EPIs Vencidos</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${epiVencidos > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${epiVencidos > 0 ? 'text-destructive' : ''}`}>{epiVencidos}</p>
              <p className="text-xs text-muted-foreground">Precisam ser renovados</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for expired EPIs */}
        {epiVencidos > 0 && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Atenção: EPIs vencidos!</p>
              <p className="text-sm text-muted-foreground">
                Existem {epiVencidos} EPI(s) com validade expirada que precisam ser renovados.
              </p>
            </div>
          </div>
        )}

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Entregas Registradas
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou EPI..."
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
              {filteredEntregas.length === 0 ? (
                <div className="text-center py-12">
                  <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma entrega encontrada</p>
                </div>
              ) : (
                filteredEntregas.map((entrega) => {
                  const { dataVencimento, vencido } = calcularValidade(entrega.data_entrega, entrega.validade_meses);
                  return (
                    <div 
                      key={entrega.id} 
                      className={`p-4 border rounded-lg space-y-2 ${vencido ? 'border-destructive bg-destructive/5' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{entrega.colaborador_nome}</p>
                          <p className="text-sm text-muted-foreground">{entrega.colaborador_cargo}</p>
                        </div>
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
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{entrega.tipo_epi}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Entrega: {format(new Date(entrega.data_entrega), 'dd/MM/yyyy')}</span>
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
                    <TableHead>Cargo</TableHead>
                    <TableHead>Tipo de EPI</TableHead>
                    <TableHead>Data Entrega</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntregas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhuma entrega encontrada</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntregas.map((entrega) => {
                      const { dataVencimento, vencido } = calcularValidade(entrega.data_entrega, entrega.validade_meses);
                      return (
                        <TableRow key={entrega.id} className={vencido ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{entrega.colaborador_nome}</TableCell>
                          <TableCell>{entrega.colaborador_cargo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              {entrega.tipo_epi}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(entrega.data_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR })}
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

export default GestaoEPI;
