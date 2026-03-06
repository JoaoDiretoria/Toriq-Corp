import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Award, Eye, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function ClienteRelatoriosCertificados() {
  const { empresa } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNorma, setFilterNorma] = useState<string>('all');

  // Buscar cliente_sst vinculado à empresa
  const { data: clienteData } = useQuery({
    queryKey: ['cliente-sst', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data, error } = await supabase
        .from('clientes_sst')
        .select('id')
        .eq('cliente_empresa_id', empresa.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!empresa?.id,
  });

  // Buscar turmas validadas do cliente (para relatórios)
  const { data: turmasRelatorios, isLoading: loadingRelatorios } = useQuery({
    queryKey: ['cliente-relatorios', clienteData?.id],
    queryFn: async () => {
      if (!clienteData?.id) return [];
      
      // Buscar turmas validadas do cliente
      const { data: turmasData, error: turmasError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          numero_turma,
          status,
          validado,
          treinamento_id,
          tipo_treinamento,
          quantidade_participantes,
          catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          turmas_treinamento_aulas(
            data
          )
        `)
        .eq('cliente_id', clienteData.id)
        .eq('validado', true)
        .order('created_at', { ascending: false });

      if (turmasError) throw turmasError;
      if (!turmasData?.length) return [];

      // Buscar relatórios das turmas
      const turmaIds = turmasData.map((t: any) => t.id);
      const { data: anexosData } = await (supabase as any)
        .from('turma_anexos')
        .select('turma_id, url, nome')
        .in('turma_id', turmaIds)
        .eq('tipo', 'relatorio');

      // Mapear relatórios por turma_id
      const relatoriosMap: Record<string, string> = {};
      (anexosData || []).forEach((a: any) => {
        relatoriosMap[a.turma_id] = a.url;
      });

      // Combinar dados e filtrar apenas turmas concluídas com relatório disponível
      return turmasData
        .filter((turma: any) => turma.status === 'concluido' && relatoriosMap[turma.id])
        .map((turma: any) => ({
          ...turma,
          relatorio_url: relatoriosMap[turma.id]
        }));
    },
    enabled: !!clienteData?.id,
  });

  // Buscar certificados dos colaboradores do cliente
  const { data: certificados, isLoading: loadingCertificados } = useQuery({
    queryKey: ['cliente-certificados', clienteData?.id],
    queryFn: async () => {
      if (!clienteData?.id) return [];
      
      // Buscar turmas do cliente
      const { data: turmasData, error: turmasError } = await (supabase as any)
        .from('turmas_treinamento')
        .select('id, tipo_treinamento')
        .eq('cliente_id', clienteData.id)
        .eq('validado', true);

      if (turmasError || !turmasData?.length) return [];

      const turmaIds = turmasData.map((t: any) => t.id);

      // Buscar certificados dessas turmas
      const { data: certsData, error: certsError } = await (supabase as any)
        .from('colaboradores_certificados')
        .select(`
          id,
          nome,
          arquivo_url,
          data_emissao,
          data_validade,
          turma_id,
          colaborador_id
        `)
        .in('turma_id', turmaIds)
        .order('data_emissao', { ascending: false });

      if (certsError) throw certsError;
      if (!certsData?.length) return [];

      // Buscar dados dos colaboradores
      const colaboradorIds = [...new Set(certsData.map((c: any) => c.colaborador_id))] as string[];
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf')
        .in('id', colaboradorIds);

      const colaboradoresMap: Record<string, any> = {};
      (colaboradoresData || []).forEach((c: any) => {
        colaboradoresMap[c.id] = c;
      });

      // Buscar dados das turmas
      const { data: turmasInfo } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          numero_turma,
          tipo_treinamento,
          catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          turmas_treinamento_aulas(
            data
          )
        `)
        .in('id', turmaIds);

      const turmasMap: Record<string, any> = {};
      (turmasInfo || []).forEach((t: any) => {
        turmasMap[t.id] = t;
      });

      return certsData.map((cert: any) => {
        const colaborador = colaboradoresMap[cert.colaborador_id];
        const turma = turmasMap[cert.turma_id];
        const aulas = turma?.turmas_treinamento_aulas || [];
        const datasOrdenadas = aulas.map((a: any) => a.data).sort();
        
        return {
          ...cert,
          colaborador_nome: colaborador?.nome || '-',
          colaborador_cpf: colaborador?.cpf || '-',
          turma_codigo: turma?.codigo_turma || `Turma #${turma?.numero_turma || '?'}`,
          treinamento_nome: turma?.catalogo_treinamentos?.nome || '-',
          treinamento_norma: turma?.catalogo_treinamentos?.norma || '-',
          tipo_treinamento: turma?.tipo_treinamento || '-',
          data_turma: datasOrdenadas[0] || null,
        };
      });
    },
    enabled: !!clienteData?.id,
  });

  // Extrair normas únicas para filtro
  const normasUnicas = [...new Set([
    ...(turmasRelatorios || []).map((t: any) => t.catalogo_treinamentos?.norma).filter(Boolean),
    ...(certificados || []).map((c: any) => c.treinamento_norma).filter(Boolean),
  ])].sort();

  // Filtrar relatórios
  const relatoriosFiltrados = (turmasRelatorios || []).filter((turma: any) => {
    const matchSearch = 
      turma.codigo_turma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.catalogo_treinamentos?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.catalogo_treinamentos?.norma?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchNorma = filterNorma === 'all' || turma.catalogo_treinamentos?.norma === filterNorma;
    
    return matchSearch && matchNorma;
  });

  // Filtrar certificados
  const certificadosFiltrados = (certificados || []).filter((cert: any) => {
    const matchSearch = 
      cert.colaborador_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.treinamento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.treinamento_norma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.turma_codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchNorma = filterNorma === 'all' || cert.treinamento_norma === filterNorma;
    
    return matchSearch && matchNorma;
  });

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios e Certificados</h1>
        <p className="text-muted-foreground">Visualize e baixe relatórios e certificados das turmas</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, turma, treinamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterNorma} onValueChange={setFilterNorma}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por NR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as NRs</SelectItem>
                {normasUnicas.map((norma) => (
                  <SelectItem key={norma} value={norma}>
                    NR {norma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="relatorios" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="relatorios" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <FileText className="h-4 w-4 mr-2" />
            Relatórios ({relatoriosFiltrados.length})
          </TabsTrigger>
          <TabsTrigger 
            value="certificados"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <Award className="h-4 w-4 mr-2" />
            Certificados ({certificadosFiltrados.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Relatórios */}
        <TabsContent value="relatorios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios de Turmas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRelatorios ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : relatoriosFiltrados.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Turma</TableHead>
                      <TableHead>NR</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatoriosFiltrados.map((turma: any) => {
                      const aulas = turma.turmas_treinamento_aulas || [];
                      const datasOrdenadas = aulas.map((a: any) => a.data).sort();
                      const primeiraData = datasOrdenadas[0];
                      
                      const tipoLabel = turma.tipo_treinamento === 'inicial' ? 'Inicial' 
                        : turma.tipo_treinamento === 'reciclagem' ? 'Reciclagem' 
                        : turma.tipo_treinamento === 'periodico' ? 'Periódico' 
                        : turma.tipo_treinamento || '-';
                      
                      return (
                        <TableRow key={turma.id}>
                          <TableCell className="font-medium">
                            {turma.codigo_turma || `Turma #${turma.numero_turma}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">NR {turma.catalogo_treinamentos?.norma}</Badge>
                          </TableCell>
                          <TableCell>{turma.catalogo_treinamentos?.nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tipoLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(primeiraData)}
                            </div>
                          </TableCell>
                          <TableCell>{turma.quantidade_participantes || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(turma.relatorio_url, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(
                                  turma.relatorio_url,
                                  `relatorio_${turma.codigo_turma || turma.numero_turma}_NR${turma.catalogo_treinamentos?.norma}.pdf`
                                )}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhum relatório encontrado</p>
                  <p className="text-sm">Os relatórios aparecerão aqui após a validação das turmas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Certificados */}
        <TabsContent value="certificados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificados dos Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCertificados ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : certificadosFiltrados.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>NR</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificadosFiltrados.map((cert: any) => {
                      const isVencido = cert.data_validade && new Date(cert.data_validade) < new Date();
                      
                      const tipoLabel = cert.tipo_treinamento === 'inicial' ? 'Inicial' 
                        : cert.tipo_treinamento === 'reciclagem' ? 'Reciclagem' 
                        : cert.tipo_treinamento === 'periodico' ? 'Periódico' 
                        : cert.tipo_treinamento || '-';
                      
                      return (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.colaborador_nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">NR {cert.treinamento_norma}</Badge>
                          </TableCell>
                          <TableCell>{cert.treinamento_nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tipoLabel}</Badge>
                          </TableCell>
                          <TableCell>{cert.turma_codigo}</TableCell>
                          <TableCell>{formatDate(cert.data_emissao)}</TableCell>
                          <TableCell>
                            <span className={isVencido ? 'text-red-600' : ''}>
                              {formatDate(cert.data_validade)}
                            </span>
                            {isVencido && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Vencido
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(cert.arquivo_url, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(
                                  cert.arquivo_url,
                                  `certificado_${cert.colaborador_nome?.replace(/\s+/g, '_')}_NR${cert.treinamento_norma}.pdf`
                                )}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhum certificado encontrado</p>
                  <p className="text-sm">Os certificados aparecerão aqui após a validação das turmas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
