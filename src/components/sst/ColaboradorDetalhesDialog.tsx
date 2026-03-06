import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  FileText, 
  GraduationCap, 
  Award, 
  Loader2, 
  Upload, 
  Download, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  HardHat
} from 'lucide-react';
import { format, differenceInDays, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface Colaborador {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  matricula: string | null;
  ativo: boolean;
  empresa_id: string;
  grupo_homogeneo_id: string | null;
}

interface Certificado {
  id: string;
  colaborador_id: string;
  treinamento_id: string | null;
  turma_id: string | null;
  nome: string;
  arquivo_url: string | null;
  arquivo_path: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  observacoes: string | null;
  treinamento?: {
    nome: string;
    norma: string;
  };
}

interface TreinamentoNecessario {
  id: string;
  treinamento_id: string;
  treinamento_nome: string;
  norma: string;
  validade: string;
  ch_formacao: number;
  ch_reciclagem: number;
  status: 'pendente' | 'realizado' | 'vencido' | 'a_vencer';
  data_realizacao?: string;
  data_validade?: string;
}

interface EpiColaborador {
  id: string;
  colaborador_id: string;
  epi_id: string | null;
  data_entrega: string | null;
  quantidade: number;
  observacoes: string | null;
  cadastro_epis?: {
    nome_modelo: string;
    tipo_epi: string;
    numero_ca: string;
  } | null;
}

interface TreinamentoRealizado {
  id: string;
  treinamento_id: string;
  treinamento_nome: string;
  norma: string;
  data_realizacao: string;
  data_validade: string;
  status: string;
  turma_numero?: number;
  instrutor_nome?: string;
}

interface ColaboradorDetalhesDialogProps {
  colaborador: Colaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColaboradorDetalhesDialog({ colaborador, open, onOpenChange }: ColaboradorDetalhesDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [treinamentosNecessarios, setTreinamentosNecessarios] = useState<TreinamentoNecessario[]>([]);
  const [treinamentosRealizados, setTreinamentosRealizados] = useState<TreinamentoRealizado[]>([]);
  const [episColaborador, setEpisColaborador] = useState<EpiColaborador[]>([]);
  const [loadingCertificados, setLoadingCertificados] = useState(false);
  const [loadingTreinamentos, setLoadingTreinamentos] = useState(false);
  const [loadingEpis, setLoadingEpis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificadoToDelete, setCertificadoToDelete] = useState<Certificado | null>(null);

  useEffect(() => {
    if (open && colaborador?.id) {
      fetchCertificados();
      fetchTreinamentos();
      fetchEpisColaborador();
    }
  }, [open, colaborador?.id]);

  const fetchEpisColaborador = async () => {
    if (!colaborador?.id) return;
    
    setLoadingEpis(true);
    try {
      const { data, error } = await (supabase as any)
        .from('entregas_epis')
        .select(`
          id,
          colaborador_id,
          epi_id,
          data_entrega,
          quantidade,
          observacoes,
          cadastro_epis(nome_modelo, tipo_epi, numero_ca)
        `)
        .eq('colaborador_id', colaborador.id)
        .order('data_entrega', { ascending: false });

      if (error) throw error;
      setEpisColaborador(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar EPIs do colaborador:', error);
    } finally {
      setLoadingEpis(false);
    }
  };

  const fetchCertificados = async () => {
    if (!colaborador?.id) return;
    
    setLoadingCertificados(true);
    try {
      const { data, error } = await (supabase as any)
        .from('colaboradores_certificados')
        .select(`
          *,
          treinamento:catalogo_treinamentos(nome, norma)
        `)
        .eq('colaborador_id', colaborador.id)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      setCertificados(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar certificados:', error);
    } finally {
      setLoadingCertificados(false);
    }
  };

  const fetchTreinamentos = async () => {
    if (!colaborador?.id) return;
    
    setLoadingTreinamentos(true);
    try {
      // Buscar treinamentos necessários baseado no grupo homogêneo
      let treinamentosDoGrupo: any[] = [];
      
      treinamentosDoGrupo = [];

      // Buscar treinamentos realizados pelo colaborador
      const { data: realizados, error: realizadosError } = await (supabase as any)
        .from('turma_colaboradores')
        .select(`
          id,
          resultado,
          nota_pos_teste,
          turma:turmas_treinamento(
            id,
            numero_turma,
            tipo_treinamento,
            treinamento:catalogo_treinamentos(id, nome, norma, validade),
            instrutor:instrutores(nome),
            aulas:turmas_treinamento_aulas(data)
          )
        `)
        .eq('colaborador_id', colaborador.id);

      if (realizadosError) {
        console.error('Erro ao buscar treinamentos realizados:', realizadosError);
      }

      // Processar treinamentos realizados
      const treinamentosRealizadosProcessados: TreinamentoRealizado[] = [];
      const treinamentosRealizadosIds = new Set<string>();

      (realizados || []).forEach((item: any) => {
        if (item.turma?.treinamento) {
          const treinamento = item.turma.treinamento;
          const aulas = item.turma.aulas || [];
          const datasOrdenadas = aulas.map((a: any) => a.data).sort();
          const ultimaData = datasOrdenadas[datasOrdenadas.length - 1];
          
          if (ultimaData) {
            const dataRealizacao = parseISO(ultimaData);
            const validadeMeses = parseInt(treinamento.validade) || 12;
            const dataValidade = addMonths(dataRealizacao, validadeMeses);

            treinamentosRealizadosProcessados.push({
              id: item.id,
              treinamento_id: treinamento.id,
              treinamento_nome: treinamento.nome,
              norma: treinamento.norma,
              data_realizacao: ultimaData,
              data_validade: format(dataValidade, 'yyyy-MM-dd'),
              status: item.resultado || 'pendente',
              turma_numero: item.turma.numero_turma,
              instrutor_nome: item.turma.instrutor?.nome,
            });

            treinamentosRealizadosIds.add(treinamento.id);
          }
        }
      });

      setTreinamentosRealizados(treinamentosRealizadosProcessados);

      // Processar treinamentos necessários
      const necessariosProcessados: TreinamentoNecessario[] = treinamentosDoGrupo.map((item: any) => {
        const treinamento = item.treinamento;
        const realizado = treinamentosRealizadosProcessados.find(
          r => r.treinamento_id === treinamento.id
        );

        let status: 'pendente' | 'realizado' | 'vencido' | 'a_vencer' = 'pendente';
        let dataRealizacao: string | undefined;
        let dataValidade: string | undefined;

        if (realizado) {
          dataRealizacao = realizado.data_realizacao;
          dataValidade = realizado.data_validade;
          
          const hoje = new Date();
          const validade = parseISO(realizado.data_validade);
          const diasRestantes = differenceInDays(validade, hoje);

          if (diasRestantes < 0) {
            status = 'vencido';
          } else if (diasRestantes <= 30) {
            status = 'a_vencer';
          } else {
            status = 'realizado';
          }
        }

        return {
          id: item.treinamento_id,
          treinamento_id: treinamento.id,
          treinamento_nome: treinamento.nome,
          norma: treinamento.norma,
          validade: treinamento.validade,
          ch_formacao: treinamento.ch_formacao,
          ch_reciclagem: treinamento.ch_reciclagem,
          status,
          data_realizacao: dataRealizacao,
          data_validade: dataValidade,
        };
      });

      setTreinamentosNecessarios(necessariosProcessados);
    } catch (error: any) {
      console.error('Erro ao carregar treinamentos:', error);
      toast({
        title: "Erro ao carregar treinamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTreinamentos(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !colaborador) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${colaborador.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('certificados-colaboradores')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificados-colaboradores')
        .getPublicUrl(fileName);

      // Criar registro do certificado
      const { error: insertError } = await (supabase as any)
        .from('colaboradores_certificados')
        .insert({
          colaborador_id: colaborador.id,
          nome: file.name.replace(`.${fileExt}`, ''),
          arquivo_url: publicUrl,
          arquivo_path: fileName,
          data_emissao: new Date().toISOString().split('T')[0],
        });

      if (insertError) throw insertError;

      toast({
        title: "Certificado enviado",
        description: "O certificado foi salvo com sucesso.",
      });

      fetchCertificados();
    } catch (error: any) {
      console.error('Erro ao enviar certificado:', error);
      toast({
        title: "Erro ao enviar certificado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (certificado: Certificado) => {
    if (!certificado.arquivo_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('certificados-colaboradores')
        .download(certificado.arquivo_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = certificado.nome + '.' + certificado.arquivo_path.split('.').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Erro ao baixar certificado",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCertificado = async () => {
    if (!certificadoToDelete) return;

    try {
      // Deletar arquivo do storage
      if (certificadoToDelete.arquivo_path) {
        await supabase.storage
          .from('certificados-colaboradores')
          .remove([certificadoToDelete.arquivo_path]);
      }

      // Deletar registro
      const { error } = await (supabase as any)
        .from('colaboradores_certificados')
        .delete()
        .eq('id', certificadoToDelete.id);

      if (error) throw error;

      toast({
        title: "Certificado excluído",
        description: "O certificado foi removido com sucesso.",
      });

      fetchCertificados();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir certificado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCertificadoToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      'pendente': { label: 'Pendente', variant: 'secondary', icon: Clock },
      'realizado': { label: 'Em dia', variant: 'default', icon: CheckCircle2 },
      'vencido': { label: 'Vencido', variant: 'destructive', icon: AlertTriangle },
      'a_vencer': { label: 'A vencer', variant: 'outline', icon: AlertTriangle },
    };
    const c = config[status] || config['pendente'];
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  if (!colaborador) return null;

  const pendentes = treinamentosNecessarios.filter(t => t.status === 'pendente').length;
  const vencidos = treinamentosNecessarios.filter(t => t.status === 'vencido').length;
  const aVencer = treinamentosNecessarios.filter(t => t.status === 'a_vencer').length;
  const emDia = treinamentosNecessarios.filter(t => t.status === 'realizado').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {colaborador.nome}
              <Badge variant={colaborador.ativo ? 'default' : 'secondary'} className="ml-2">
                {colaborador.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="necessarios" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Necessários ({treinamentosNecessarios.length})
              </TabsTrigger>
              <TabsTrigger value="realizados" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Realizados ({treinamentosRealizados.length})
              </TabsTrigger>
              <TabsTrigger value="certificados" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certificados ({certificados.length})
              </TabsTrigger>
              <TabsTrigger value="epis" className="flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                EPI ({episColaborador.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="flex-1 overflow-auto mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Informações Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Nome</span>
                      <p className="font-medium">{colaborador.nome}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">CPF</span>
                      <p className="font-medium">{colaborador.cpf || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Matrícula</span>
                      <p className="font-medium">{colaborador.matricula || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Informações Profissionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Cargo</span>
                      <p className="font-medium">{colaborador.cargo || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Setor</span>
                      <p className="font-medium">{colaborador.setor || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Status</span>
                      <div className="font-medium">
                        <Badge variant={colaborador.ativo ? 'default' : 'secondary'}>
                          {colaborador.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Resumo de Treinamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{emDia}</p>
                        <p className="text-xs text-muted-foreground">Em dia</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{aVencer}</p>
                        <p className="text-xs text-muted-foreground">A vencer</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{vencidos}</p>
                        <p className="text-xs text-muted-foreground">Vencidos</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{pendentes}</p>
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="necessarios" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-hidden p-0">
                  {loadingTreinamentos ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : treinamentosNecessarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <GraduationCap className="h-8 w-8 mb-2" />
                      <p>Nenhum treinamento necessário definido</p>
                      <p className="text-xs">Vincule o colaborador a um grupo homogêneo</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Treinamento</TableHead>
                            <TableHead>NR</TableHead>
                            <TableHead>Validade</TableHead>
                            <TableHead>Última Realização</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {treinamentosNecessarios.map((treinamento) => (
                            <TableRow key={treinamento.id}>
                              <TableCell className="font-medium">{treinamento.treinamento_nome}</TableCell>
                              <TableCell>{treinamento.norma}</TableCell>
                              <TableCell>{treinamento.validade} meses</TableCell>
                              <TableCell>{formatDate(treinamento.data_realizacao || null)}</TableCell>
                              <TableCell>{formatDate(treinamento.data_validade || null)}</TableCell>
                              <TableCell>{getStatusBadge(treinamento.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="realizados" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardContent className="flex-1 overflow-hidden p-0">
                  {loadingTreinamentos ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : treinamentosRealizados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mb-2" />
                      <p>Nenhum treinamento realizado</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Treinamento</TableHead>
                            <TableHead>NR</TableHead>
                            <TableHead>Turma</TableHead>
                            <TableHead>Instrutor</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Validade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {treinamentosRealizados.map((treinamento) => (
                            <TableRow key={treinamento.id}>
                              <TableCell className="font-medium">{treinamento.treinamento_nome}</TableCell>
                              <TableCell>{treinamento.norma}</TableCell>
                              <TableCell>#{treinamento.turma_numero}</TableCell>
                              <TableCell>{treinamento.instrutor_nome || '-'}</TableCell>
                              <TableCell>{formatDate(treinamento.data_realizacao)}</TableCell>
                              <TableCell>{formatDate(treinamento.data_validade)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certificados" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Certificados do Colaborador
                  </CardTitle>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Enviar Certificado
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {loadingCertificados ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : certificados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Award className="h-8 w-8 mb-2" />
                      <p>Nenhum certificado cadastrado</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Treinamento</TableHead>
                            <TableHead>Data Emissão</TableHead>
                            <TableHead>Validade</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {certificados.map((certificado) => (
                            <TableRow key={certificado.id}>
                              <TableCell className="font-medium">{certificado.nome}</TableCell>
                              <TableCell>{certificado.treinamento?.nome || '-'}</TableCell>
                              <TableCell>{formatDate(certificado.data_emissao)}</TableCell>
                              <TableCell>{formatDate(certificado.data_validade)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {certificado.arquivo_path && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDownload(certificado)}
                                      title="Baixar"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setCertificadoToDelete(certificado);
                                      setDeleteDialogOpen(true);
                                    }}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="epis" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    EPIs Entregues ao Colaborador
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {loadingEpis ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : episColaborador.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <HardHat className="h-8 w-8 mb-2" />
                      <p>Nenhum EPI entregue</p>
                      <p className="text-xs">As entregas de EPI serão exibidas aqui</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>EPI</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>CA</TableHead>
                            <TableHead>Data Entrega</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Observação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {episColaborador.map((epi) => (
                            <TableRow key={epi.id}>
                              <TableCell className="font-medium">
                                {epi.cadastro_epis?.nome_modelo || '-'}
                              </TableCell>
                              <TableCell>{epi.cadastro_epis?.tipo_epi || '-'}</TableCell>
                              <TableCell>{epi.cadastro_epis?.numero_ca || '-'}</TableCell>
                              <TableCell>{formatDate(epi.data_entrega)}</TableCell>
                              <TableCell>{epi.quantidade || 1}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{epi.observacoes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Certificado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o certificado "{certificadoToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCertificadoToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCertificado}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
