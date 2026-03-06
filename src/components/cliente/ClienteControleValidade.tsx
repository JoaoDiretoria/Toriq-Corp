import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertCircle, Clock, XCircle, FileWarning, ShieldCheck } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColaboradorVazio {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
}

interface TreinamentoRow {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_cpf: string | null;
  colaborador_cargo: string | null;
  colaborador_setor: string | null;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  data_emissao: string | null;
  data_validade: string | null;
  dias_para_vencer?: number;
  dias_vencido?: number;
  em_turma: boolean;
  turma_id?: string | null;
  turma_codigo?: string | null;
}

export function ClienteControleValidade() {
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [diasAVencer, setDiasAVencer] = useState(30);
  const [activeTab, setActiveTab] = useState('conformidade');

  const { data: clienteData } = useQuery({
    queryKey: ['cliente-sst-validade', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      const { data, error } = await (supabase as any)
        .from('clientes_sst')
        .select('id, nome')
        .eq('cliente_empresa_id', empresa.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!empresa?.id,
  });

  const { data: dadosCompletos, isLoading } = useQuery({
    queryKey: ['colaboradores-controle-validade-v2', empresa?.id, clienteData?.id],
    queryFn: async () => {
      if (!empresa?.id || !clienteData?.id) return null;

      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf, cargo, setor, grupo_homogeneo_id')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('nome');

      if (!colaboradores?.length) return { colaboradores: [], treinamentosGHMap: {}, treinamentosIndividuaisMap: {}, certificadosMap: {}, turmasEmAndamentoMap: {} };

      const grupoIds = [...new Set(colaboradores.map(c => c.grupo_homogeneo_id).filter(Boolean))] as string[];
      
      let treinamentosGH: any[] = [];
      if (grupoIds.length > 0) {
        const { data: ghTreinamentos } = await (supabase as any)
          .from('grupos_homogeneos_treinamentos')
          .select('grupo_homogeneo_id, treinamento_id, catalogo_treinamentos!grupos_homogeneos_treinamentos_treinamento_id_fkey(id, nome, norma, validade)')
          .in('grupo_homogeneo_id', grupoIds);
        treinamentosGH = ghTreinamentos || [];
      }

      const colaboradorIds = colaboradores.map(c => c.id);
      const { data: treinamentosIndividuais } = await (supabase as any)
        .from('colaboradores_treinamentos')
        .select('colaborador_id, treinamento_id, catalogo_treinamentos(id, nome, norma, validade)')
        .in('colaborador_id', colaboradorIds);

      const { data: certificados } = await (supabase as any)
        .from('colaboradores_certificados')
        .select('colaborador_id, treinamento_id, turma_id, data_emissao, data_validade, turmas_treinamento(treinamento_id, status, codigo_turma)')
        .in('colaborador_id', colaboradorIds);

      const { data: turmasCliente } = await (supabase as any)
        .from('turmas_treinamento')
        .select('id, treinamento_id, status, turma_colaboradores(colaborador_id)')
        .eq('cliente_id', clienteData.id);

      const treinamentosGHMap: Record<string, any[]> = {};
      (treinamentosGH || []).forEach((t: any) => {
        if (!treinamentosGHMap[t.grupo_homogeneo_id]) treinamentosGHMap[t.grupo_homogeneo_id] = [];
        if (t.catalogo_treinamentos) {
          treinamentosGHMap[t.grupo_homogeneo_id].push({
            id: t.catalogo_treinamentos.id,
            nome: t.catalogo_treinamentos.nome,
            norma: t.catalogo_treinamentos.norma,
            validade: t.catalogo_treinamentos.validade,
          });
        }
      });

      const treinamentosIndividuaisMap: Record<string, any[]> = {};
      (treinamentosIndividuais || []).forEach((t: any) => {
        if (!treinamentosIndividuaisMap[t.colaborador_id]) treinamentosIndividuaisMap[t.colaborador_id] = [];
        if (t.catalogo_treinamentos) {
          treinamentosIndividuaisMap[t.colaborador_id].push({
            id: t.catalogo_treinamentos.id,
            nome: t.catalogo_treinamentos.nome,
            norma: t.catalogo_treinamentos.norma,
            validade: t.catalogo_treinamentos.validade,
          });
        }
      });

      const certificadosMap: Record<string, Record<string, any>> = {};
      (certificados || []).forEach((c: any) => {
        if (!certificadosMap[c.colaborador_id]) certificadosMap[c.colaborador_id] = {};
        // Use treinamento_id from certificate, or from turma if certificate's treinamento_id is null
        const treinamentoId = c.treinamento_id || c.turmas_treinamento?.treinamento_id;
        if (!treinamentoId) return; // Skip if no treinamento_id found
        
        // Only consider certificates from finalized turmas (status = 'concluido')
        const turmaStatus = c.turmas_treinamento?.status;
        if (c.turma_id && turmaStatus !== 'concluido') return; // Skip if turma is not finalized
        
        const existing = certificadosMap[c.colaborador_id][treinamentoId];
        if (!existing || (c.data_emissao && (!existing.data_emissao || c.data_emissao > existing.data_emissao))) {
          certificadosMap[c.colaborador_id][treinamentoId] = { 
            data_emissao: c.data_emissao, 
            data_validade: c.data_validade,
            turma_id: c.turma_id,
            turma_codigo: c.turmas_treinamento?.codigo_turma
          };
        }
      });

      const turmasEmAndamentoMap: Record<string, Set<string>> = {};
      (turmasCliente || []).forEach((turma: any) => {
        if (turma.status !== 'concluido') {
          (turma.turma_colaboradores || []).forEach((tc: any) => {
            if (!turmasEmAndamentoMap[tc.colaborador_id]) turmasEmAndamentoMap[tc.colaborador_id] = new Set();
            turmasEmAndamentoMap[tc.colaborador_id].add(turma.treinamento_id);
          });
        }
      });

      return { colaboradores, treinamentosGHMap, treinamentosIndividuaisMap, certificadosMap, turmasEmAndamentoMap };
    },
    enabled: !!empresa?.id && !!clienteData?.id,
  });

  const { vazios, pendentes, aVencer, vencidos, emConformidade } = useMemo(() => {
    if (!dadosCompletos) return { vazios: [], pendentes: [], aVencer: [], vencidos: [], emConformidade: [] };

    const { colaboradores, treinamentosGHMap, treinamentosIndividuaisMap, certificadosMap, turmasEmAndamentoMap } = dadosCompletos;
    const hoje = new Date();
    const dataLimiteAVencer = addDays(hoje, diasAVencer);

    const vazios: ColaboradorVazio[] = [];
    const pendentes: TreinamentoRow[] = [];
    const aVencer: TreinamentoRow[] = [];
    const vencidos: TreinamentoRow[] = [];
    const emConformidade: TreinamentoRow[] = [];

    colaboradores.forEach((colab: any) => {
      const treinamentosMatriz = treinamentosGHMap[colab.grupo_homogeneo_id] || [];
      const treinamentosIndiv = treinamentosIndividuaisMap[colab.id] || [];
      
      if (treinamentosMatriz.length === 0 && treinamentosIndiv.length === 0) {
        vazios.push({ id: colab.id, nome: colab.nome, cpf: colab.cpf, cargo: colab.cargo, setor: colab.setor });
        return;
      }

      const todosNecessariosMap = new Map<string, any>();
      [...treinamentosMatriz, ...treinamentosIndiv].forEach(t => {
        if (!todosNecessariosMap.has(t.id)) todosNecessariosMap.set(t.id, t);
      });

      const certificadosColab = certificadosMap[colab.id] || {};
      const turmasColab = turmasEmAndamentoMap[colab.id] || new Set();

      todosNecessariosMap.forEach((treinamento) => {
        const certificado = certificadosColab[treinamento.id];
        const emTurma = turmasColab.has(treinamento.id);

        const baseRow: TreinamentoRow = {
          id: `${colab.id}-${treinamento.id}`,
          colaborador_id: colab.id,
          colaborador_nome: colab.nome,
          colaborador_cpf: colab.cpf,
          colaborador_cargo: colab.cargo,
          colaborador_setor: colab.setor,
          treinamento_id: treinamento.id,
          treinamento_nome: treinamento.nome,
          treinamento_norma: treinamento.norma,
          data_emissao: certificado?.data_emissao || null,
          data_validade: certificado?.data_validade || null,
          em_turma: emTurma,
          turma_id: certificado?.turma_id || null,
          turma_codigo: certificado?.turma_codigo || null,
        };

        if (!certificado && !emTurma) {
          pendentes.push(baseRow);
        } else if (certificado?.data_validade) {
          const dataValidade = new Date(certificado.data_validade);
          if (dataValidade < hoje) {
            vencidos.push({ ...baseRow, dias_vencido: differenceInDays(hoje, dataValidade) });
          } else if (dataValidade <= dataLimiteAVencer) {
            aVencer.push({ ...baseRow, dias_para_vencer: differenceInDays(dataValidade, hoje) });
          } else {
            emConformidade.push({ ...baseRow, dias_para_vencer: differenceInDays(dataValidade, hoje) });
          }
        } else if (certificado && !certificado.data_validade) {
          emConformidade.push(baseRow);
        }
      });
    });

    return { vazios, pendentes, aVencer, vencidos, emConformidade };
  }, [dadosCompletos, diasAVencer]);

  const filtrarPorBusca = <T extends { colaborador_nome?: string; colaborador_cpf?: string | null; colaborador_cargo?: string | null; colaborador_setor?: string | null; nome?: string; cpf?: string | null; cargo?: string | null; setor?: string | null }>(items: T[]): T[] => {
    if (!searchTerm) return items;
    const termo = searchTerm.toLowerCase();
    return items.filter((item) => {
      const nome = item.colaborador_nome || item.nome || '';
      const cpf = item.colaborador_cpf || item.cpf || '';
      const cargo = item.colaborador_cargo || item.cargo || '';
      const setor = item.colaborador_setor || item.setor || '';
      return nome.toLowerCase().includes(termo) || cpf?.toLowerCase().includes(termo) || cargo?.toLowerCase().includes(termo) || setor?.toLowerCase().includes(termo);
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try { return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const TabelaVazios = ({ data }: { data: ColaboradorVazio[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Setor</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado</TableCell></TableRow>
        ) : (
          data.map((colab) => (
            <TableRow key={colab.id}>
              <TableCell className="font-medium">{colab.nome}</TableCell>
              <TableCell>{formatCPF(colab.cpf)}</TableCell>
              <TableCell>{colab.cargo || '-'}</TableCell>
              <TableCell>{colab.setor || '-'}</TableCell>
              <TableCell><Badge variant="secondary" className="bg-gray-100 text-gray-700"><FileWarning className="h-3 w-3 mr-1" />Sem matriz ou treinamento</Badge></TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const TabelaTreinamentos = ({ data, tipo }: { data: TreinamentoRow[]; tipo: 'pendente' | 'aVencer' | 'vencido' | 'emDia' }) => {
    const getColSpan = () => {
      let base = 7; // Colaborador, CPF, Treinamento, NR, Cargo, Setor, Turma
      if (tipo === 'aVencer' || tipo === 'vencido') base += 1;
      return base;
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Treinamento</TableHead>
            <TableHead>NR</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Turma</TableHead>
            {tipo === 'aVencer' && <TableHead>Dias p/ Vencer</TableHead>}
            {tipo === 'vencido' && <TableHead>Dias Vencido</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={getColSpan()} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.colaborador_nome}</TableCell>
                <TableCell>{formatCPF(row.colaborador_cpf)}</TableCell>
                <TableCell>{row.treinamento_nome}</TableCell>
                <TableCell><Badge variant="outline">NR {row.treinamento_norma}</Badge></TableCell>
                <TableCell>{row.colaborador_cargo || '-'}</TableCell>
                <TableCell>{row.colaborador_setor || '-'}</TableCell>
                <TableCell>
                  {row.turma_id ? (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/turma/${row.turma_id}`)}
                    >
                      {row.turma_codigo || 'Ver turma'}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                {tipo === 'aVencer' && <TableCell><Badge variant="secondary" className="bg-orange-100 text-orange-700">{row.dias_para_vencer} dias</Badge></TableCell>}
                {tipo === 'vencido' && <TableCell><Badge variant="destructive">{row.dias_vencido} dias</Badge></TableCell>}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  };

  const vaziosFiltrados = filtrarPorBusca(vazios);
  const pendentesFiltrados = filtrarPorBusca(pendentes);
  const aVencerFiltrados = filtrarPorBusca(aVencer);
  const vencidosFiltrados = filtrarPorBusca(vencidos);
  const emConformidadeFiltrados = filtrarPorBusca(emConformidade);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Controle de Validade</h1>
        <p className="text-muted-foreground">Acompanhe o status dos treinamentos dos colaboradores</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('conformidade')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Em Conformidade</p><p className="text-2xl font-bold">{emConformidade.length}</p></div>
              <div className="p-3 bg-green-100 rounded-full"><ShieldCheck className="h-6 w-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('vazio')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Vazio</p><p className="text-2xl font-bold">{vazios.length}</p></div>
              <div className="p-3 bg-gray-100 rounded-full"><FileWarning className="h-6 w-6 text-gray-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pendente')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Pendente</p><p className="text-2xl font-bold">{pendentes.length}</p></div>
              <div className="p-3 bg-blue-100 rounded-full"><Clock className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('avencer')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">A Vencer</p><p className="text-2xl font-bold">{aVencer.length}</p></div>
              <div className="p-3 bg-orange-100 rounded-full"><AlertCircle className="h-6 w-6 text-orange-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('vencido')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Vencido</p><p className="text-2xl font-bold">{vencidos.length}</p></div>
              <div className="p-3 bg-red-100 rounded-full"><XCircle className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF, cargo ou setor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        {activeTab === 'avencer' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Prazo:</span>
            <Select value={diasAVencer.toString()} onValueChange={(v) => setDiasAVencer(parseInt(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 flex-wrap">
          <TabsTrigger value="conformidade" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent px-4 py-2">
            <ShieldCheck className="h-4 w-4 mr-2" />Em Conformidade ({emConformidadeFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="vazio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-600 data-[state=active]:bg-transparent px-4 py-2">
            <FileWarning className="h-4 w-4 mr-2" />Vazio ({vaziosFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="pendente" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />Pendente ({pendentesFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="avencer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-600 data-[state=active]:bg-transparent px-4 py-2">
            <AlertCircle className="h-4 w-4 mr-2" />A Vencer ({aVencerFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="vencido" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent px-4 py-2">
            <XCircle className="h-4 w-4 mr-2" />Vencido ({vencidosFiltrados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conformidade" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-green-600" />Treinamentos em Conformidade</CardTitle></CardHeader>
            <CardContent>{isLoading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : <TabelaTreinamentos data={emConformidadeFiltrados} tipo="emDia" />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vazio" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileWarning className="h-5 w-5 text-gray-600" />Colaboradores sem Matriz ou Treinamento</CardTitle></CardHeader>
            <CardContent>{isLoading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : <TabelaVazios data={vaziosFiltrados} />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendente" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-blue-600" />Treinamentos Pendentes</CardTitle></CardHeader>
            <CardContent>{isLoading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : <TabelaTreinamentos data={pendentesFiltrados} tipo="pendente" />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avencer" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertCircle className="h-5 w-5 text-orange-600" />Treinamentos a Vencer (próximos {diasAVencer} dias)</CardTitle></CardHeader>
            <CardContent>{isLoading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : <TabelaTreinamentos data={aVencerFiltrados} tipo="aVencer" />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencido" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><XCircle className="h-5 w-5 text-red-600" />Treinamentos Vencidos</CardTitle></CardHeader>
            <CardContent>{isLoading ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> : <TabelaTreinamentos data={vencidosFiltrados} tipo="vencido" />}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
