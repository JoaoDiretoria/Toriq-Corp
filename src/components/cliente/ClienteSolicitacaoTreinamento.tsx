import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CalendarIcon, Send, Clock, AlertTriangle, CheckCircle2, Users, Filter, Trash2, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { differenceInDays, addMonths, parseISO } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SolicitacaoTreinamento {
  id: string;
  numero: number;
  treinamento_id: string;
  treinamento_nome: string;
  treinamento_norma: string;
  data_treinamento: string | null;
  status: string;
  created_at: string;
}

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number;
  ch_reciclagem: number;
  validade: string;
}

interface Colaborador {
  id: string;
  nome: string;
}

interface ColaboradorComTreinamentos {
  id: string;
  nome: string;
  treinamentos: {
    id: string;
    treinamento_id: string;
    status: string | null;
    data_realizacao: string | null;
    datas: {
      data: string;
    }[];
  }[];
}

interface ColaboradorComVencimento {
  id: string;
  nome: string;
  dataVencimento: Date | null;
  diasParaVencer: number | null;
  selecionado: boolean;
}

interface AulaAgendada {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  horas: number;
}

const tiposTreinamento = [
  { value: 'inicial', label: 'Inicial (Formação)' },
  { value: 'periodico', label: 'Periódico (Reciclagem)' },
  { value: 'eventual', label: 'Eventual' },
];

export function ClienteSolicitacaoTreinamento() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Estado do dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cargaHoraria, setCargaHoraria] = useState<number | ''>('');
  const [statusReciclagem, setStatusReciclagem] = useState<string>('');
  const [dataInicialVencer, setDataInicialVencer] = useState<Date | undefined>(undefined);
  const [dataFinalVencer, setDataFinalVencer] = useState<Date | undefined>(undefined);
  const [calendarInicialOpen, setCalendarInicialOpen] = useState(false);
  const [calendarFinalOpen, setCalendarFinalOpen] = useState(false);
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Estados para cronograma de aulas
  const [aulasAgendadas, setAulasAgendadas] = useState<AulaAgendada[]>([]);
  const [novaAulaInicio, setNovaAulaInicio] = useState('08:00');
  const [novaAulaFim, setNovaAulaFim] = useState('17:00');
  const [datasAulaSelecionadas, setDatasAulaSelecionadas] = useState<Date[]>([]);
  const [calendarAulaOpen, setCalendarAulaOpen] = useState(false);

  // Buscar empresa SST vinculada ao cliente
  const { data: empresaSst } = useQuery({
    queryKey: ['empresa-sst-vinculada', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return null;
      
      const { data, error } = await supabase
        .from('clientes_sst')
        .select('empresa_sst_id')
        .eq('cliente_empresa_id', empresa.id)
        .single();

      if (error) return null;
      return data?.empresa_sst_id;
    },
    enabled: !!empresa?.id,
  });

  // Buscar TODOS os treinamentos da empresa SST vinculada (para o dropdown)
  const { data: treinamentosDisponiveis } = useQuery({
    queryKey: ['treinamentos-disponiveis-empresa-sst', empresaSst],
    queryFn: async () => {
      if (!empresaSst) return [];
      
      // Buscar todos os treinamentos da empresa SST
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma, ch_formacao, ch_reciclagem, validade')
        .eq('empresa_id', empresaSst)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar treinamentos da empresa SST:', error);
        return [];
      }
      return data as Treinamento[];
    },
    enabled: !!empresaSst,
  });

  // Buscar treinamentos necessários para os colaboradores da empresa (via colaboradores_treinamentos)
  const { data: treinamentosNecessarios } = useQuery({
    queryKey: ['treinamentos-necessarios-colaboradores', empresa?.id, empresaSst],
    queryFn: async () => {
      if (!empresa?.id || !empresaSst) return [];
      
      // Buscar colaboradores da empresa com seus treinamentos vinculados
      const { data: colaboradoresData, error: colabError } = await supabase
        .from('colaboradores')
        .select(`
          id,
          treinamentos:colaboradores_treinamentos(
            treinamento_id
          )
        `)
        .eq('empresa_id', empresa.id);

      if (colabError) throw colabError;
      
      // Extrair IDs únicos de treinamentos de todos os colaboradores
      const treinamentosIds: string[] = [];
      colaboradoresData?.forEach(colab => {
        (colab.treinamentos as any[])?.forEach(t => {
          if (t.treinamento_id && !treinamentosIds.includes(t.treinamento_id)) {
            treinamentosIds.push(t.treinamento_id);
          }
        });
      });
      
      if (treinamentosIds.length === 0) return [];

      // Buscar detalhes dos treinamentos
      const { data: treinamentosData, error: treinError } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma, ch_formacao, ch_reciclagem, validade')
        .in('id', treinamentosIds)
        .eq('empresa_id', empresaSst)
        .order('nome');

      if (treinError) throw treinError;
      return treinamentosData as Treinamento[];
    },
    enabled: !!empresa?.id && !!empresaSst,
  });

  // Usar treinamentos disponíveis para o dropdown (todos da empresa SST)
  const treinamentosParaDropdown = treinamentosDisponiveis || treinamentosNecessarios || [];

  // Buscar colaboradores da empresa cliente com seus treinamentos e datas de realização
  const { data: colaboradoresComTreinamentos } = useQuery({
    queryKey: ['colaboradores-com-treinamentos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          id, 
          nome,
          treinamentos:colaboradores_treinamentos(
            id,
            treinamento_id,
            status,
            data_realizacao,
            datas:colaboradores_treinamentos_datas(data)
          )
        `)
        .eq('empresa_id', empresa.id)
        .order('nome');

      if (error) throw error;
      return data as unknown as ColaboradorComTreinamentos[];
    },
    enabled: !!empresa?.id,
  });

  // Buscar turmas em andamento dos colaboradores (para bloquear quem já está em turma)
  const { data: colaboradoresEmTurmas } = useQuery({
    queryKey: ['colaboradores-em-turmas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      // Buscar colaboradores da empresa
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!colaboradores || colaboradores.length === 0) return [];

      const colaboradorIds = colaboradores.map(c => c.id);

      // Buscar turmas não concluídas onde esses colaboradores estão
      const { data: turmaColabs, error } = await (supabase as any)
        .from('turma_colaboradores')
        .select('colaborador_id, turma_id, turmas_treinamento!turma_colaboradores_turma_id_fkey(id, treinamento_id, tipo_treinamento, status)')
        .in('colaborador_id', colaboradorIds);

      if (error) throw error;
      return turmaColabs || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar certificados válidos dos colaboradores
  const { data: colaboradoresCertificados } = useQuery({
    queryKey: ['colaboradores-certificados-validos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      // Buscar colaboradores da empresa
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!colaboradores || colaboradores.length === 0) return [];

      const colaboradorIds = colaboradores.map(c => c.id);

      // Buscar certificados desses colaboradores
      const { data: certificados, error } = await (supabase as any)
        .from('colaboradores_certificados')
        .select('colaborador_id, treinamento_id, turma_id, data_validade, turmas_treinamento!colaboradores_certificados_turma_id_fkey(treinamento_id, tipo_treinamento, status)')
        .in('colaborador_id', colaboradorIds);

      if (error) throw error;
      return certificados || [];
    },
    enabled: !!empresa?.id,
  });

  // Buscar solicitações pendentes/enviadas/aceitas dos colaboradores (para bloquear duplicatas)
  const { data: colaboradoresComSolicitacoes } = useQuery({
    queryKey: ['colaboradores-com-solicitacoes', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      // Buscar solicitações pendentes, enviadas ou aceitas (não rejeitadas)
      const { data: solicitacoesPendentes, error } = await supabase
        .from('solicitacoes_treinamento')
        .select('colaborador_id, treinamento_id, tipo, status')
        .eq('empresa_id', empresa.id)
        .in('status', ['pendente', 'enviado', 'aceito'])
        .not('colaborador_id', 'is', null);

      if (error) throw error;
      return solicitacoesPendentes || [];
    },
    enabled: !!empresa?.id,
  });

  // Obter validade do treinamento selecionado (em meses)
  const validadeTreinamento = useMemo(() => {
    if (!treinamentoSelecionado || !treinamentosNecessarios) return null;
    const treinamento = treinamentosNecessarios.find(t => t.id === treinamentoSelecionado);
    if (!treinamento?.validade) return null;
    
    const validadeStr = treinamento.validade.toLowerCase().trim();
    
    // Mapear valores textuais para meses
    const validadeMap: Record<string, number> = {
      'anual': 12,
      '1 ano': 12,
      'bienal': 24,
      '2 anos': 24,
      'trienal': 36,
      '3 anos': 36,
      'semestral': 6,
      '6 meses': 6,
    };
    
    // Verificar se é um valor textual conhecido
    if (validadeMap[validadeStr]) {
      return validadeMap[validadeStr];
    }
    
    // Tentar parsear como número (meses)
    const meses = parseInt(treinamento.validade, 10);
    return isNaN(meses) ? null : meses;
  }, [treinamentoSelecionado, treinamentosNecessarios]);

  // Filtrar colaboradores baseado no treinamento, tipo e status selecionado
  const colaboradoresComVencimento = useMemo((): ColaboradorComVencimento[] => {
    if (!colaboradoresComTreinamentos || !treinamentoSelecionado || !tipoSelecionado) {
      return [];
    }

    const resultado: ColaboradorComVencimento[] = [];
    const hoje = new Date();

    // Criar mapa de colaboradores em turmas não concluídas por treinamento
    const colaboradoresEmTurmasPorTreinamento: Record<string, Set<string>> = {};
    (colaboradoresEmTurmas || []).forEach((tc: any) => {
      const turma = tc.turmas_treinamento;
      if (turma && turma.status !== 'concluido') {
        const key = `${tc.colaborador_id}-${turma.treinamento_id}`;
        if (!colaboradoresEmTurmasPorTreinamento[turma.treinamento_id]) {
          colaboradoresEmTurmasPorTreinamento[turma.treinamento_id] = new Set();
        }
        colaboradoresEmTurmasPorTreinamento[turma.treinamento_id].add(tc.colaborador_id);
      }
    });

    // Criar mapa de certificados válidos por colaborador e treinamento
    const certificadosValidosPorColaborador: Record<string, { dataValidade: Date | null, tipoTreinamento: string | null }> = {};
    (colaboradoresCertificados || []).forEach((cert: any) => {
      const treinamentoId = cert.treinamento_id || cert.turmas_treinamento?.treinamento_id;
      if (!treinamentoId) return;
      
      // Só considerar certificados de turmas concluídas
      if (cert.turmas_treinamento && cert.turmas_treinamento.status !== 'concluido') return;
      
      const key = `${cert.colaborador_id}-${treinamentoId}`;
      const dataValidade = cert.data_validade ? new Date(cert.data_validade) : null;
      
      // Guardar o certificado mais recente
      if (!certificadosValidosPorColaborador[key] || 
          (dataValidade && (!certificadosValidosPorColaborador[key].dataValidade || 
           dataValidade > certificadosValidosPorColaborador[key].dataValidade!))) {
        certificadosValidosPorColaborador[key] = {
          dataValidade,
          tipoTreinamento: cert.turmas_treinamento?.tipo_treinamento || null
        };
      }
    });

    // Criar mapa de colaboradores com solicitações pendentes/aceitas por treinamento
    const colaboradoresComSolicitacoesPorTreinamento: Record<string, Set<string>> = {};
    (colaboradoresComSolicitacoes || []).forEach((sol: any) => {
      if (!sol.colaborador_id || !sol.treinamento_id) return;
      if (!colaboradoresComSolicitacoesPorTreinamento[sol.treinamento_id]) {
        colaboradoresComSolicitacoesPorTreinamento[sol.treinamento_id] = new Set();
      }
      colaboradoresComSolicitacoesPorTreinamento[sol.treinamento_id].add(sol.colaborador_id);
    });

    colaboradoresComTreinamentos.forEach(colaborador => {
      // Encontrar todos os registros do treinamento específico do colaborador
      const treinamentosDoColaborador = colaborador.treinamentos?.filter(
        t => t.treinamento_id === treinamentoSelecionado
      ) || [];

      // Se o colaborador não tem esse treinamento vinculado, não mostrar
      if (treinamentosDoColaborador.length === 0) {
        return;
      }

      // Verificar se colaborador já está em uma turma não concluída para este treinamento
      const jaEmTurma = colaboradoresEmTurmasPorTreinamento[treinamentoSelecionado]?.has(colaborador.id);
      if (jaEmTurma) {
        return; // Não mostrar colaborador que já está em turma para este treinamento
      }

      // Verificar se colaborador já tem solicitação pendente/aceita para este treinamento
      const jaSolicitado = colaboradoresComSolicitacoesPorTreinamento[treinamentoSelecionado]?.has(colaborador.id);
      if (jaSolicitado) {
        return; // Não mostrar colaborador que já tem solicitação pendente/aceita
      }

      // Verificar certificado válido
      const certKey = `${colaborador.id}-${treinamentoSelecionado}`;
      const certificadoInfo = certificadosValidosPorColaborador[certKey];
      const temCertificadoValido = certificadoInfo?.dataValidade && certificadoInfo.dataValidade >= hoje;

      // Para reciclagem, priorizar o registro com status "realizado" ou que tenha datas
      // Para formação, priorizar o registro com status "necessario" sem data_realizacao
      let treinamentoDoColaborador = treinamentosDoColaborador[0];
      
      if (tipoSelecionado === 'periodico') {
        // Buscar registro realizado (com status 'realizado' ou com datas)
        const realizado = treinamentosDoColaborador.find(t => 
          t.status === 'realizado' || 
          t.data_realizacao || 
          (t.datas && t.datas.length > 0)
        );
        if (realizado) {
          treinamentoDoColaborador = realizado;
        }
      } else if (tipoSelecionado === 'inicial') {
        // Buscar registro necessário (sem data_realizacao)
        const necessario = treinamentosDoColaborador.find(t => 
          !t.data_realizacao && (!t.datas || t.datas.length === 0)
        );
        if (necessario) {
          treinamentoDoColaborador = necessario;
        }
      }

      // Formação (inicial): mostrar apenas quem NUNCA realizou o treinamento
      if (tipoSelecionado === 'inicial') {
        // Bloquear se já tem certificado válido (já fez o treinamento inicial)
        if (temCertificadoValido) {
          return; // Não pode fazer inicial se já tem certificado válido
        }
        
        // Bloquear se já realizou o treinamento (tem data_realizacao)
        if (treinamentoDoColaborador.data_realizacao || 
            (treinamentoDoColaborador.datas && treinamentoDoColaborador.datas.length > 0)) {
          return; // Já fez o treinamento inicial
        }
        
        resultado.push({
          id: colaborador.id,
          nome: colaborador.nome,
          dataVencimento: null,
          diasParaVencer: null,
          selecionado: colaboradoresSelecionados.includes(colaborador.id)
        });
        return;
      }

      // Reciclagem (periodico): mostrar apenas quem JÁ realizou o treinamento E está vencido ou a vencer
      if (tipoSelecionado === 'periodico') {
        // Verificar se o treinamento foi realizado (status = 'realizado' OU tem data_realizacao OU tem datas)
        const temDatas = treinamentoDoColaborador.datas && treinamentoDoColaborador.datas.length > 0;
        const foiRealizado = treinamentoDoColaborador.status === 'realizado' || 
                             treinamentoDoColaborador.data_realizacao ||
                             temDatas;
        
        if (!foiRealizado) return;

        // Calcular data de vencimento usando a data mais recente
        let dataVencimento: Date | null = null;
        let diasParaVencer: number | null = null;

        // Usar data do certificado se disponível, senão usar data do treinamento
        if (certificadoInfo?.dataValidade) {
          dataVencimento = certificadoInfo.dataValidade;
          diasParaVencer = differenceInDays(dataVencimento, hoje);
        } else if (validadeTreinamento) {
          // Priorizar datas da tabela colaboradores_treinamentos_datas
          let dataRealizacao: Date | null = null;
          
          if (temDatas) {
            // Ordenar datas e pegar a mais recente
            const datasOrdenadas = [...treinamentoDoColaborador.datas]
              .map(d => parseISO(d.data))
              .sort((a, b) => b.getTime() - a.getTime());
            dataRealizacao = datasOrdenadas[0];
          } else if (treinamentoDoColaborador.data_realizacao) {
            dataRealizacao = parseISO(treinamentoDoColaborador.data_realizacao);
          }

          if (dataRealizacao) {
            dataVencimento = addMonths(dataRealizacao, validadeTreinamento);
            diasParaVencer = differenceInDays(dataVencimento, hoje);
          }
        }

        // IMPORTANTE: Para reciclagem, só permitir se o treinamento está VENCIDO ou A VENCER
        // Se ainda está válido (diasParaVencer > 30), não pode fazer reciclagem
        if (diasParaVencer !== null && diasParaVencer > 90) {
          return; // Treinamento ainda muito válido, não precisa de reciclagem
        }

        // Filtrar por status de reciclagem
        if (statusReciclagem === 'a_vencer') {
          // Mostrar apenas quem está a vencer (dias > 0)
          if (diasParaVencer === null || diasParaVencer <= 0) {
            return;
          }
          
          // Filtrar por período se as datas foram selecionadas
          if (dataInicialVencer && dataFinalVencer && dataVencimento) {
            if (dataVencimento < dataInicialVencer || dataVencimento > dataFinalVencer) {
              return;
            }
          }
        } else if (statusReciclagem === 'vencido') {
          // Mostrar apenas quem já venceu (dias <= 0)
          if (diasParaVencer === null || diasParaVencer > 0) return;
        }

        resultado.push({
          id: colaborador.id,
          nome: colaborador.nome,
          dataVencimento,
          diasParaVencer,
          selecionado: colaboradoresSelecionados.includes(colaborador.id)
        });
        return;
      }

      // Eventual: mostrar todos que têm o treinamento vinculado (exceto quem já está em turma)
      resultado.push({
        id: colaborador.id,
        nome: colaborador.nome,
        dataVencimento: null,
        diasParaVencer: null,
        selecionado: colaboradoresSelecionados.includes(colaborador.id)
      });
    });

    // Ordenar por dias para vencer (mais urgentes primeiro)
    return resultado.sort((a, b) => {
      if (a.diasParaVencer === null && b.diasParaVencer === null) return 0;
      if (a.diasParaVencer === null) return 1;
      if (b.diasParaVencer === null) return -1;
      return a.diasParaVencer - b.diasParaVencer;
    });
  }, [colaboradoresComTreinamentos, treinamentoSelecionado, tipoSelecionado, statusReciclagem, dataInicialVencer, dataFinalVencer, validadeTreinamento, colaboradoresSelecionados, colaboradoresEmTurmas, colaboradoresCertificados, colaboradoresComSolicitacoes]);

  // Manter compatibilidade com o código existente
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradoresComVencimento.map(c => ({ id: c.id, nome: c.nome }));
  }, [colaboradoresComVencimento]);

  // Buscar solicitações de treinamento
  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ['solicitacoes-treinamento', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      const { data, error } = await supabase
        .from('solicitacoes_treinamento')
        .select(`
          id,
          numero,
          treinamento_id,
          data_treinamento,
          status,
          created_at,
          catalogo_treinamentos(id, nome, norma)
        `)
        .eq('empresa_id', empresa.id)
        .order('numero', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        numero: item.numero,
        treinamento_id: item.treinamento_id,
        treinamento_nome: item.catalogo_treinamentos?.nome || '',
        treinamento_norma: item.catalogo_treinamentos?.norma || '',
        data_treinamento: item.data_treinamento,
        status: item.status,
        created_at: item.created_at,
      })) as SolicitacaoTreinamento[];
    },
    enabled: !!empresa?.id,
  });

  // Mutation para criar solicitação (suporta múltiplos colaboradores)
  const criarSolicitacaoMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id || !treinamentoSelecionado || colaboradoresSelecionados.length === 0) {
        throw new Error('Dados incompletos');
      }

      const primeiraData = aulasAgendadas.length > 0 
        ? aulasAgendadas.sort((a, b) => a.data.localeCompare(b.data))[0].data
        : null;

      // Criar uma solicitação para cada colaborador selecionado
      for (const colaboradorId of colaboradoresSelecionados) {
        const { data: solicitacao, error: solicitacaoError } = await supabase
          .from('solicitacoes_treinamento')
          .insert({
            empresa_id: empresa.id,
            treinamento_id: treinamentoSelecionado,
            colaborador_id: colaboradorId,
            tipo: tipoSelecionado,
            carga_horaria: cargaHoraria || getTotalHorasAgendadas() || null,
            data_treinamento: primeiraData,
            status: 'pendente',
          })
          .select('id')
          .single();

        if (solicitacaoError) throw solicitacaoError;

        // Inserir as datas/aulas da solicitação
        if (aulasAgendadas.length > 0 && solicitacao) {
          const datasParaInserir = aulasAgendadas.map(aula => ({
            solicitacao_id: solicitacao.id,
            data: aula.data,
            inicio: aula.inicio,
            fim: aula.fim,
            horas: aula.horas,
          }));

          const { error: datasError } = await (supabase as any)
            .from('solicitacoes_treinamento_datas')
            .insert(datasParaInserir);

          if (datasError) throw datasError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-treinamento'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-com-solicitacoes'] });
      const qtd = colaboradoresSelecionados.length;
      toast({
        title: "Solicitação criada",
        description: `${qtd} solicitaç${qtd > 1 ? 'ões' : 'ão'} de treinamento ${qtd > 1 ? 'foram criadas' : 'foi criada'} com sucesso.`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para calcular horas entre início e fim
  const calcularHoras = (inicio: string, fim: string, descontarAlmoco: boolean = false): number => {
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    let totalMinutos = (hFim * 60 + mFim) - (hInicio * 60 + mInicio);
    
    // Descontar 1h de almoço se o período for >= 8h
    if (descontarAlmoco && totalMinutos >= 480) {
      totalMinutos -= 60;
    }
    
    return Math.max(0, Math.floor(totalMinutos / 60));
  };

  // Função para adicionar aula ao cronograma
  const handleAdicionarAula = () => {
    if (datasAulaSelecionadas.length === 0) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione pelo menos uma data para a aula.",
        variant: "destructive",
      });
      return;
    }

    const horasBrutas = calcularHoras(novaAulaInicio, novaAulaFim, false);
    const horasComDesconto = calcularHoras(novaAulaInicio, novaAulaFim, true);
    const horas = horasBrutas >= 8 ? horasComDesconto : horasBrutas;

    const novasAulas: AulaAgendada[] = datasAulaSelecionadas
      .sort((a, b) => a.getTime() - b.getTime())
      .map((data, index) => ({
        id: `${Date.now()}-${index}`,
        data: format(data, 'yyyy-MM-dd'),
        inicio: novaAulaInicio,
        fim: novaAulaFim,
        horas
      }));

    setAulasAgendadas(prev => [...prev, ...novasAulas]);
    setDatasAulaSelecionadas([]);
    setNovaAulaInicio('08:00');
    setNovaAulaFim('17:00');
    setCalendarAulaOpen(false);
  };

  // Função para remover aula do cronograma
  const handleRemoverAula = (aulaId: string) => {
    setAulasAgendadas(prev => prev.filter(a => a.id !== aulaId));
  };

  // Função para calcular total de horas agendadas
  const getTotalHorasAgendadas = () => {
    return aulasAgendadas.reduce((total, aula) => total + aula.horas, 0);
  };

  // Função para fechar dialog e limpar estados
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTreinamentoSelecionado('');
    setTipoSelecionado('');
    setDatasSelecionadas([]);
    setColaboradorSelecionado('');
    setCargaHoraria('');
    setStatusReciclagem('');
    setDataInicialVencer(undefined);
    setDataFinalVencer(undefined);
    setColaboradoresSelecionados([]);
    setSelectAll(false);
    setAulasAgendadas([]);
    setDatasAulaSelecionadas([]);
    setNovaAulaInicio('08:00');
    setNovaAulaFim('17:00');
  };

  // Função para selecionar/deselecionar todos os colaboradores
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setColaboradoresSelecionados(colaboradoresComVencimento.map(c => c.id));
    } else {
      setColaboradoresSelecionados([]);
    }
  };

  // Função para selecionar/deselecionar um colaborador
  const handleSelectColaborador = (colaboradorId: string, checked: boolean) => {
    if (checked) {
      setColaboradoresSelecionados(prev => [...prev, colaboradorId]);
    } else {
      setColaboradoresSelecionados(prev => prev.filter(id => id !== colaboradorId));
      setSelectAll(false);
    }
  };

  // Função para obter badge de status de vencimento
  const getVencimentoBadge = (diasParaVencer: number | null) => {
    if (diasParaVencer === null) return null;
    
    if (diasParaVencer <= 0) {
      return (
        <Badge variant="destructive" className="ml-2 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencido há {Math.abs(diasParaVencer)} dias
        </Badge>
      );
    }
    
    if (diasParaVencer <= 30) {
      return (
        <Badge className="ml-2 text-xs bg-red-100 text-red-800 hover:bg-red-100">
          <Clock className="h-3 w-3 mr-1" />
          {diasParaVencer} dias
        </Badge>
      );
    }
    
    if (diasParaVencer <= 60) {
      return (
        <Badge className="ml-2 text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">
          <Clock className="h-3 w-3 mr-1" />
          {diasParaVencer} dias
        </Badge>
      );
    }
    
    if (diasParaVencer <= 90) {
      return (
        <Badge className="ml-2 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          {diasParaVencer} dias
        </Badge>
      );
    }
    
    return (
      <Badge className="ml-2 text-xs bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {diasParaVencer} dias
      </Badge>
    );
  };

  // Formatar número com zeros à esquerda
  const formatarNumero = (num: number): string => {
    return num.toString().padStart(6, '0');
  };

  // Filtrar solicitações
  const solicitacoesFiltradas = solicitacoes?.filter(s => {
    const matchSearch = 
      s.treinamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.treinamento_norma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numero.toString().includes(searchTerm);
    
    const matchStatus = filtroStatus === 'todos' || s.status === filtroStatus;
    
    return matchSearch && matchStatus;
  }) || [];

  // Função para enviar solicitação para a empresa SST
  const handleEnviarSolicitacao = async (solicitacaoId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_treinamento')
        .update({ status: 'enviado' })
        .eq('id', solicitacaoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['solicitacoes-treinamento'] });
      toast({
        title: "Solicitação enviada",
        description: "A solicitação foi encaminhada para a empresa de SST.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'enviado':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'aprovado':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'concluido':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Solicitações de treinamentos</CardTitle>
            <CardDescription>
              Acompanhe as solicitações de treinamentos.
            </CardDescription>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Solicitação
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-48">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar número ou nome da solicitação"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma solicitação de treinamento encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Núm.</TableHead>
                <TableHead className="w-[80px]">NR</TableHead>
                <TableHead>Treinamento</TableHead>
                <TableHead>Data do Treinamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoesFiltradas.map((solicitacao) => (
                <TableRow key={solicitacao.id}>
                  <TableCell className="font-medium">
                    {formatarNumero(solicitacao.numero)}
                  </TableCell>
                  <TableCell className="text-primary">
                    NR - {solicitacao.treinamento_norma}
                  </TableCell>
                  <TableCell className="text-primary">
                    {solicitacao.treinamento_nome}
                  </TableCell>
                  <TableCell>
                    {solicitacao.data_treinamento
                      ? format(new Date(solicitacao.data_treinamento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(solicitacao.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    {solicitacao.status === 'pendente' && (
                      <Button
                        size="sm"
                        onClick={() => handleEnviarSolicitacao(solicitacao.id)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Solicitar treinamentos
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {/* Dialog para criar solicitação */}
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) handleCloseDialog();
      else setDialogOpen(true);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-500" />
            Criar Solicitação de Treinamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Seção: Treinamento e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Treinamento */}
            <div className="space-y-2">
              <Label>Treinamento</Label>
            <Select value={treinamentoSelecionado} onValueChange={(value) => {
                setTreinamentoSelecionado(value);
                setColaboradorSelecionado(''); // Limpar colaborador ao mudar treinamento
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o treinamento" />
              </SelectTrigger>
              <SelectContent>
                {treinamentosParaDropdown?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    NR {t.norma} - {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {/* Campo Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={tipoSelecionado} 
                onValueChange={(value) => {
                  setTipoSelecionado(value);
                  setColaboradorSelecionado(''); // Limpar colaborador ao mudar tipo
                  setStatusReciclagem(''); // Limpar status de reciclagem ao mudar tipo
                  setColaboradoresSelecionados([]); // Limpar colaboradores selecionados
                  // Auto-preencher carga horária baseado no tipo e treinamento selecionado
                  if (treinamentoSelecionado && treinamentosNecessarios) {
                    const treinamento = treinamentosNecessarios.find(t => t.id === treinamentoSelecionado);
                    if (treinamento) {
                      if (value === 'inicial') {
                        setCargaHoraria(treinamento.ch_formacao);
                      } else if (value === 'periodico') {
                        setCargaHoraria(treinamento.ch_reciclagem);
                      }
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposTreinamento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção Reciclagem - aparece apenas quando tipo é Periódico */}
          {tipoSelecionado === 'periodico' && (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtros de Reciclagem
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status da Reciclagem */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={statusReciclagem} 
                    onValueChange={(value) => {
                      setStatusReciclagem(value);
                      setColaboradorSelecionado('');
                      setColaboradoresSelecionados([]);
                      setDataInicialVencer(undefined);
                      setDataFinalVencer(undefined);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vencer">
                        <span className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-amber-500" />
                          A Vencer
                        </span>
                      </SelectItem>
                      <SelectItem value="vencido">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          Vencido
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos Data Inicial e Final - aparecem quando A Vencer é selecionado */}
                {statusReciclagem === 'a_vencer' && (
                  <>
                    <div className="space-y-2">
                      <Label>Vencimento a partir de</Label>
                      <Popover open={calendarInicialOpen} onOpenChange={setCalendarInicialOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dataInicialVencer && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataInicialVencer 
                              ? format(dataInicialVencer, "dd/MM/yyyy", { locale: ptBR })
                              : "Data inicial"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dataInicialVencer}
                            onSelect={(date) => {
                              setDataInicialVencer(date);
                              setCalendarInicialOpen(false);
                              setColaboradoresSelecionados([]);
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Vencimento até</Label>
                      <Popover open={calendarFinalOpen} onOpenChange={setCalendarFinalOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dataFinalVencer && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataFinalVencer 
                              ? format(dataFinalVencer, "dd/MM/yyyy", { locale: ptBR })
                              : "Data final"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dataFinalVencer}
                            onSelect={(date) => {
                              setDataFinalVencer(date);
                              setCalendarFinalOpen(false);
                              setColaboradoresSelecionados([]);
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Seção: Cronograma de Aulas */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base font-semibold">Cronograma de Aulas</Label>
              <span className="text-sm">
                Total Agendado: <span className="text-green-600 font-semibold">{getTotalHorasAgendadas()}h</span>
                {cargaHoraria && <span className="text-muted-foreground"> / Meta: {cargaHoraria}h</span>}
              </span>
            </div>

            {/* Inputs para adicionar aula */}
            <div className="grid grid-cols-[1fr_80px_80px_60px_40px] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data(s)</Label>
                <Popover open={calendarAulaOpen} onOpenChange={setCalendarAulaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        datasAulaSelecionadas.length === 0 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {datasAulaSelecionadas.length === 0 
                        ? "Selecione..." 
                        : datasAulaSelecionadas.length === 1
                          ? format(datasAulaSelecionadas[0], "dd/MM/yyyy", { locale: ptBR })
                          : `${datasAulaSelecionadas.length} datas`
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={datasAulaSelecionadas}
                      onSelect={(dates) => setDatasAulaSelecionadas(dates || [])}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="time"
                  value={novaAulaInicio}
                  onChange={(e) => setNovaAulaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="time"
                  value={novaAulaFim}
                  onChange={(e) => setNovaAulaFim(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Horas</Label>
                <Input
                  type="number"
                  value={(() => {
                    const horasBrutas = calcularHoras(novaAulaInicio, novaAulaFim, false);
                    return horasBrutas >= 8 ? calcularHoras(novaAulaInicio, novaAulaFim, true) : horasBrutas;
                  })()}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAdicionarAula}
                  className="bg-slate-800 hover:bg-slate-900"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lista de aulas adicionadas */}
            <div className="mt-3 space-y-2 max-h-[120px] overflow-y-auto">
              {aulasAgendadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma data adicionada.
                </p>
              ) : (
                aulasAgendadas
                  .sort((a, b) => a.data.localeCompare(b.data))
                  .map(aula => (
                    <div key={aula.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {format(new Date(aula.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {aula.inicio} - {aula.fim}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {aula.horas}h
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoverAula(aula.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Campo C.H de Treinamento (Meta) */}
          <div className="space-y-2">
            <Label>C.H de Treinamento - Meta (horas)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Carga horária total esperada"
              value={cargaHoraria}
              onChange={(e) => setCargaHoraria(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          {/* Lista de Colaboradores com seleção múltipla */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Colaboradores
                {colaboradoresComVencimento.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {colaboradoresSelecionados.length}/{colaboradoresComVencimento.length}
                  </Badge>
                )}
              </Label>
              {colaboradoresComVencimento.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <Label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                    Selecionar todos
                  </Label>
                </div>
              )}
            </div>
            
            {!treinamentoSelecionado || !tipoSelecionado ? (
              <div className="flex items-center justify-center py-6 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Selecione o treinamento e tipo primeiro
                </p>
              </div>
            ) : tipoSelecionado === 'periodico' && !statusReciclagem ? (
              <div className="flex items-center justify-center py-6 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Selecione o status da reciclagem
                </p>
              </div>
            ) : tipoSelecionado === 'periodico' && statusReciclagem === 'a_vencer' && (!dataInicialVencer || !dataFinalVencer) ? (
              <div className="flex items-center justify-center py-6 border rounded-lg bg-amber-50 border-amber-200">
                <div className="text-center">
                  <Filter className="h-5 w-5 mx-auto mb-2 text-amber-600" />
                  <p className="text-sm text-amber-700">
                    Selecione o período de vencimento para filtrar colaboradores
                  </p>
                </div>
              </div>
            ) : colaboradoresComVencimento.length === 0 ? (
              <div className="flex items-center justify-center py-6 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador encontrado para os critérios selecionados
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {colaboradoresComVencimento.map((colaborador) => (
                    <div
                      key={colaborador.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md transition-colors cursor-pointer hover:bg-muted/50",
                        colaboradoresSelecionados.includes(colaborador.id) && "bg-orange-50 border border-orange-200"
                      )}
                      onClick={() => handleSelectColaborador(
                        colaborador.id, 
                        !colaboradoresSelecionados.includes(colaborador.id)
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={colaboradoresSelecionados.includes(colaborador.id)}
                          onCheckedChange={(checked) => handleSelectColaborador(colaborador.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-medium text-sm">{colaborador.nome}</span>
                      </div>
                      {colaborador.diasParaVencer !== null && getVencimentoBadge(colaborador.diasParaVencer)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={() => criarSolicitacaoMutation.mutate()}
            disabled={!treinamentoSelecionado || !tipoSelecionado || colaboradoresSelecionados.length === 0 || criarSolicitacaoMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {criarSolicitacaoMutation.isPending ? 'Salvando...' : `Salvar (${colaboradoresSelecionados.length} colaborador${colaboradoresSelecionados.length !== 1 ? 'es' : ''})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
