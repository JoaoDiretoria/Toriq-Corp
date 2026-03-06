import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Plus, CalendarIcon, X, Pencil, Trash2, Award, Users, Eye, Download, CheckCircle, Clock, XCircle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Colaborador {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  setor: string | null;
  grupo_homogeneo_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  rg?: string | null;
  matricula?: string | null;
  grupo_homogeneo?: {
    id: string;
    nome: string;
  } | null;
  treinamentos?: {
    treinamento_id: string;
    catalogo_treinamentos: {
      id: string;
      nome: string;
      norma: string;
      ch_formacao?: number | null;
      ch_reciclagem?: number | null;
      validade?: string | null;
    };
  }[];
}

interface TreinamentoNecessario {
  id: string;
  nome: string;
  norma: string;
  ch_formacao: number | null;
  ch_reciclagem: number | null;
  validade: string | null;
}

interface TreinamentoRealizado {
  id: string;
  colaborador_treinamento_id: string;
  nome: string;
  norma: string;
  datas: { data: string; inicio: string; fim: string; horas: number }[];
}

interface AulaRealizada {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  horas: number;
}

const ColaboradorDetalhes = () => {
  const { colaboradorId } = useParams<{ colaboradorId: string }>();
  const navigate = useNavigate();
  const { profile, empresa } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estado do formulário de treinamento realizado
  const [dialogTreinamentoOpen, setDialogTreinamentoOpen] = useState(false);
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState('');
  const [tipoTreinamento, setTipoTreinamento] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState(0);
  const [cargaHorariaObrigatoria, setCargaHorariaObrigatoria] = useState(false);
  const [aulasRealizadas, setAulasRealizadas] = useState<AulaRealizada[]>([]);
  const [datasSelecionadas, setDatasSelecionadas] = useState<Date[]>([]);
  const [novaAula, setNovaAula] = useState({ inicio: '08:00', fim: '17:00', horas: 8 });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editandoTreinamento, setEditandoTreinamento] = useState<TreinamentoRealizado | null>(null);

  // Buscar dados do colaborador
  const { data: colaborador, isLoading, error: queryError } = useQuery({
    queryKey: ['colaborador-detalhes', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;
      console.log('Buscando colaborador com ID:', colaboradorId);
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *
        `)
        .eq('id', colaboradorId)
        .single();
      if (error) {
        console.error('Erro ao buscar colaborador:', error);
        throw error;
      }
      console.log('Colaborador encontrado:', data);
      return data as unknown as Colaborador;
    },
    enabled: !!colaboradorId,
    retry: false,
  });

  const treinamentosGH: any[] = [];

  // Buscar treinamentos NECESSÁRIOS selecionados individualmente para o colaborador
  const { data: treinamentosIndividuais } = useQuery({
    queryKey: ['treinamentos-individuais', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      const { data, error } = await supabase
        .from('colaboradores_treinamentos')
        .select(`
          treinamento_id,
          status,
          catalogo_treinamentos(id, nome, norma, ch_formacao, ch_reciclagem, validade)
        `)
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'necessario');
      if (error) throw error;
      return (data || []).map((item: any) => item.catalogo_treinamentos) as TreinamentoNecessario[];
    },
    enabled: !!colaborador?.id,
  });

  // Buscar treinamentos REALIZADOS do colaborador
  const { data: treinamentosRealizados } = useQuery({
    queryKey: ['treinamentos-realizados', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      
      // Buscar treinamentos realizados
      const { data: treinamentosData, error: treinamentosError } = await supabase
        .from('colaboradores_treinamentos')
        .select(`
          id,
          treinamento_id,
          status,
          data_realizacao,
          catalogo_treinamentos(id, nome, norma, ch_formacao, ch_reciclagem, validade)
        `)
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'realizado');
      
      if (treinamentosError) throw treinamentosError;
      if (!treinamentosData || treinamentosData.length === 0) return [];

      // Buscar datas de cada treinamento
      const treinamentosComDatas = await Promise.all(
        treinamentosData.map(async (item: any) => {
          const { data: datasData } = await supabase
            .from('colaboradores_treinamentos_datas')
            .select('data, inicio, fim, horas')
            .eq('colaborador_treinamento_id', item.id)
            .order('data', { ascending: true });

          // Se não houver datas na nova tabela, usar data_realizacao legada
          let datas = datasData || [];
          if (datas.length === 0 && item.data_realizacao) {
            datas = [{ data: item.data_realizacao, inicio: '08:00', fim: '17:00', horas: 8 }];
          }

          return {
            id: item.catalogo_treinamentos?.id,
            colaborador_treinamento_id: item.id,
            nome: item.catalogo_treinamentos?.nome,
            norma: item.catalogo_treinamentos?.norma,
            datas: datas.map((d: any) => ({
              data: d.data,
              inicio: d.inicio || '08:00',
              fim: d.fim || '17:00',
              horas: d.horas || 8
            }))
          };
        })
      );

      return treinamentosComDatas as TreinamentoRealizado[];
    },
    enabled: !!colaborador?.id,
  });

  // Buscar turmas do colaborador
  const { data: turmasColaborador } = useQuery({
    queryKey: ['turmas-colaborador', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      
      // Buscar turma_colaboradores
      const { data: tcData, error: tcError } = await (supabase as any)
        .from('turma_colaboradores')
        .select('id, turma_id, resultado, nota_pos_teste')
        .eq('colaborador_id', colaborador.id);
      
      if (tcError) throw tcError;
      if (!tcData || tcData.length === 0) return [];

      // Buscar detalhes das turmas
      const turmaIds = tcData.map((tc: any) => tc.turma_id).filter(Boolean);
      if (turmaIds.length === 0) return [];

      const { data: turmasData, error: turmasError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          numero_turma,
          status,
          validado,
          treinamento_id
        `)
        .in('id', turmaIds);

      if (turmasError) throw turmasError;

      // Buscar treinamentos
      const treinamentoIds = (turmasData || []).map((t: any) => t.treinamento_id).filter(Boolean);
      const treinamentosMap: Record<string, any> = {};
      if (treinamentoIds.length > 0) {
        const { data: treinamentosData } = await supabase
          .from('catalogo_treinamentos')
          .select('id, nome, norma')
          .in('id', treinamentoIds);
        
        (treinamentosData || []).forEach((t: any) => {
          treinamentosMap[t.id] = t;
        });
      }

      // Buscar aulas das turmas
      const { data: aulasData } = await (supabase as any)
        .from('turmas_treinamento_aulas')
        .select('turma_id, data')
        .in('turma_id', turmaIds)
        .order('data', { ascending: true });

      // Mapear aulas por turma
      const aulasPorTurma: Record<string, string[]> = {};
      (aulasData || []).forEach((aula: any) => {
        if (!aulasPorTurma[aula.turma_id]) {
          aulasPorTurma[aula.turma_id] = [];
        }
        aulasPorTurma[aula.turma_id].push(aula.data);
      });

      // Combinar dados
      return tcData.map((tc: any) => {
        const turma = (turmasData || []).find((t: any) => t.id === tc.turma_id);
        const treinamento = turma?.treinamento_id ? treinamentosMap[turma.treinamento_id] : null;
        const aulas = aulasPorTurma[tc.turma_id] || [];
        return {
          id: tc.id,
          turma_id: tc.turma_id,
          codigo_turma: turma?.codigo_turma || `Turma #${turma?.numero_turma || '?'}`,
          treinamento_nome: treinamento?.nome || '',
          treinamento_norma: treinamento?.norma || '',
          status: turma?.status || 'agendado',
          validado: turma?.validado || false,
          resultado: tc.resultado,
          nota_pos_teste: tc.nota_pos_teste,
          data_inicio: aulas[0] || null,
          data_fim: aulas[aulas.length - 1] || null
        };
      });
    },
    enabled: !!colaborador?.id,
  });

  // Buscar certificados do colaborador
  const { data: certificadosColaborador } = useQuery({
    queryKey: ['certificados-colaborador', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return [];
      
      // Buscar certificados
      const { data: certsData, error: certsError } = await (supabase as any)
        .from('colaboradores_certificados')
        .select('id, nome, arquivo_url, arquivo_path, data_emissao, data_validade, observacoes, turma_id')
        .eq('colaborador_id', colaborador.id)
        .order('data_emissao', { ascending: false });
      
      if (certsError) throw certsError;
      if (!certsData || certsData.length === 0) return [];

      // Buscar detalhes das turmas
      const turmaIds = certsData.map((c: any) => c.turma_id).filter(Boolean);
      
      const turmasMap: Record<string, any> = {};
      if (turmaIds.length > 0) {
        const { data: turmasData } = await supabase
          .from('turmas_treinamento')
          .select('id, codigo_turma, numero_turma, treinamento_id, catalogo_treinamentos(nome, norma)')
          .in('id', turmaIds);
        
        (turmasData || []).forEach((t: any) => {
          turmasMap[t.id] = t;
        });
      }

      return certsData.map((cert: any) => {
        const turma = turmasMap[cert.turma_id];
        return {
          id: cert.id,
          nome: cert.nome,
          arquivo_url: cert.arquivo_url,
          data_emissao: cert.data_emissao,
          data_validade: cert.data_validade,
          observacoes: cert.observacoes,
          turma_codigo: turma?.codigo_turma || `Turma #${turma?.numero_turma || '?'}`,
          treinamento_nome: turma?.catalogo_treinamentos?.nome || '',
          treinamento_norma: turma?.catalogo_treinamentos?.norma || ''
        };
      });
    },
    enabled: !!colaborador?.id,
  });

  // Usar os treinamentos necessários como opções do dropdown (já combinados do GH + individuais)

  // Funções auxiliares para o formulário de treinamento realizado
  const calcularHoras = (inicio: string, fim: string): number => {
    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    let totalMinutos = (hFim * 60 + mFim) - (hInicio * 60 + mInicio);
    // Descontar 1h de almoço se o período for >= 8h
    if (totalMinutos >= 480) {
      totalMinutos -= 60;
    }
    return Math.max(0, Math.floor(totalMinutos / 60));
  };

  const handleTreinamentoChange = (treinamentoId: string) => {
    setTreinamentoSelecionado(treinamentoId);
    setTipoTreinamento('');
    setCargaHoraria(0);
    setCargaHorariaObrigatoria(false);
  };

  const handleTipoTreinamentoChange = (tipo: string) => {
    setTipoTreinamento(tipo);
    const treinamento = treinamentosNecessarios?.find(t => t.id === treinamentoSelecionado);
    if (treinamento) {
      let ch = 0;
      if (tipo === 'Periódico') {
        ch = treinamento.ch_reciclagem || 0;
      } else {
        ch = treinamento.ch_formacao || 0;
      }
      setCargaHoraria(ch);
      // Só bloquear edição se a carga horária for maior que 0
      setCargaHorariaObrigatoria(ch > 0);
    }
  };

  const handleAdicionarAula = () => {
    if (datasSelecionadas.length === 0) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione pelo menos uma data.",
        variant: "destructive",
      });
      return;
    }

    const horas = calcularHoras(novaAula.inicio, novaAula.fim);

    const novasAulas: AulaRealizada[] = datasSelecionadas
      .sort((a, b) => a.getTime() - b.getTime())
      .map((data, index) => ({
        id: `${Date.now()}-${index}`,
        data: format(data, 'yyyy-MM-dd'),
        inicio: novaAula.inicio,
        fim: novaAula.fim,
        horas
      }));

    setAulasRealizadas(prev => [...prev, ...novasAulas]);
    setDatasSelecionadas([]);
    setNovaAula({ inicio: '08:00', fim: '17:00', horas: 8 });
    setCalendarOpen(false);
  };

  const handleRemoverAula = (aulaId: string) => {
    setAulasRealizadas(prev => prev.filter(a => a.id !== aulaId));
  };

  const getTotalHorasRealizadas = () => {
    return aulasRealizadas.reduce((total, aula) => total + aula.horas, 0);
  };

  const resetFormulario = () => {
    setTreinamentoSelecionado('');
    setTipoTreinamento('');
    setCargaHoraria(0);
    setCargaHorariaObrigatoria(false);
    setAulasRealizadas([]);
    setDatasSelecionadas([]);
    setNovaAula({ inicio: '08:00', fim: '17:00', horas: 8 });
    setEditandoTreinamento(null);
  };

  // Função para calcular meses de validade baseado no texto
  const calcularMesesValidade = (validade: string | null): number => {
    let mesesValidade = 12; // Padrão: Anual (12 meses)
    if (validade) {
      const validadeLower = validade.toLowerCase();
      if (validadeLower.includes('bienal') || validadeLower.includes('2 anos')) {
        mesesValidade = 24;
      } else if (validadeLower.includes('trienal') || validadeLower.includes('3 anos')) {
        mesesValidade = 36;
      } else if (validadeLower.includes('semestral') || validadeLower.includes('6 meses')) {
        mesesValidade = 6;
      } else if (validadeLower.includes('anual') || validadeLower.includes('1 ano')) {
        mesesValidade = 12;
      }
    }
    return mesesValidade;
  };

  // Função para calcular a data de vencimento do treinamento (verifica turmas concluídas também)
  const calcularDataVencimento = (treinamentoId: string, validade: string | null): string => {
    // Primeiro, verificar se há turma concluída para este treinamento
    const treinamentoNecessario = treinamentosNecessarios?.find(tn => tn.id === treinamentoId);
    const turmaConcluida = turmasColaborador?.find((t: any) => {
      if (!treinamentoNecessario) return false;
      return t.status === 'concluido' && 
             t.treinamento_norma === treinamentoNecessario.norma &&
             t.resultado === 'aprovado';
    });

    if (turmaConcluida && turmaConcluida.data_fim) {
      const dataFimTurma = new Date(turmaConcluida.data_fim + 'T00:00:00');
      const mesesValidade = calcularMesesValidade(validade);
      const dataVencimento = new Date(dataFimTurma);
      dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
      return format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR });
    }

    // Buscar se o treinamento foi realizado manualmente
    const treinamentoRealizado = treinamentosRealizados?.find(t => t.id === treinamentoId);
    
    // Se não foi realizado, não tem data de vencimento
    if (!treinamentoRealizado || !treinamentoRealizado.datas || treinamentoRealizado.datas.length === 0) {
      return 'Não realizado';
    }

    // Pegar a última data de realização
    const datasOrdenadas = [...treinamentoRealizado.datas].sort((a, b) => b.data.localeCompare(a.data));
    const ultimaDataRealizacao = new Date(datasOrdenadas[0].data + 'T00:00:00');
    
    // Calcular meses de validade
    const mesesValidade = calcularMesesValidade(validade);

    // Calcular data de vencimento
    const dataVencimento = new Date(ultimaDataRealizacao);
    dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
    
    return format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR });
  };

  // Função para calcular o status do treinamento (verifica turmas concluídas também)
  const calcularStatusTreinamento = (treinamentoId: string, validade: string | null): { status: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; turmaInfo?: any } => {
    // Primeiro, verificar se há turma concluída para este treinamento
    const turmaConcluida = turmasColaborador?.find((t: any) => {
      // Buscar o treinamento_id da turma através do catalogo
      const treinamentoNecessario = treinamentosNecessarios?.find(tn => tn.id === treinamentoId);
      if (!treinamentoNecessario) return false;
      
      // Comparar pela norma do treinamento (turma tem treinamento_norma)
      return t.status === 'concluido' && 
             t.treinamento_norma === treinamentoNecessario.norma &&
             t.resultado === 'aprovado';
    });

    if (turmaConcluida) {
      // Calcular validade baseado na data de conclusão da turma
      const dataFimTurma = turmaConcluida.data_fim ? new Date(turmaConcluida.data_fim + 'T00:00:00') : new Date();
      const mesesValidade = calcularMesesValidade(validade);
      const dataVencimento = new Date(dataFimTurma);
      dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const diasAteVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasAteVencimento < 0) {
        return { status: 'Vencido', variant: 'destructive', turmaInfo: turmaConcluida };
      } else if (diasAteVencimento <= 30) {
        return { status: 'Próximo do Vencimento', variant: 'secondary', turmaInfo: turmaConcluida };
      } else if (diasAteVencimento <= 365) {
        return { status: 'A Vencer', variant: 'outline', turmaInfo: turmaConcluida };
      } else {
        return { status: 'Em dia', variant: 'default', turmaInfo: turmaConcluida };
      }
    }

    // Buscar se o treinamento foi realizado manualmente
    const treinamentoRealizado = treinamentosRealizados?.find(t => t.id === treinamentoId);
    
    // Se não foi realizado, precisa de formação
    if (!treinamentoRealizado || !treinamentoRealizado.datas || treinamentoRealizado.datas.length === 0) {
      return { status: 'Precisa de Formação', variant: 'destructive' };
    }

    // Pegar a última data de realização
    const datasOrdenadas = [...treinamentoRealizado.datas].sort((a, b) => b.data.localeCompare(a.data));
    const ultimaDataRealizacao = new Date(datasOrdenadas[0].data + 'T00:00:00');
    
    // Calcular meses de validade
    const mesesValidade = calcularMesesValidade(validade);

    // Calcular data de vencimento
    const dataVencimento = new Date(ultimaDataRealizacao);
    dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diasAteVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    // Verificar status
    if (diasAteVencimento < 0) {
      return { status: 'Vencido', variant: 'destructive' };
    } else if (diasAteVencimento <= 30) {
      return { status: 'Próximo do Vencimento', variant: 'secondary' };
    } else if (diasAteVencimento <= 365) {
      return { status: 'A Vencer', variant: 'outline' };
    } else {
      return { status: 'Em dia', variant: 'default' };
    }
  };

  // Função para formatar exibição das datas do treinamento
  const formatarDatasTreinamento = (datas: { data: string; inicio: string; fim: string; horas: number }[]): string => {
    if (!datas || datas.length === 0) return '-';
    
    const datasOrdenadas = [...datas].sort((a, b) => a.data.localeCompare(b.data));
    
    if (datasOrdenadas.length === 1) {
      // 1 dia: dd/mm/aaaa
      return format(new Date(datasOrdenadas[0].data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } else if (datasOrdenadas.length === 2) {
      // 2 dias: Dia dd e dd/mm/aaaa
      const dia1 = format(new Date(datasOrdenadas[0].data + 'T00:00:00'), 'dd', { locale: ptBR });
      const data2 = format(new Date(datasOrdenadas[1].data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
      return `Dia ${dia1} e ${data2}`;
    } else {
      // 3+ dias: De dd/mm/aaaa à dd/mm/aaaa
      const primeiraData = format(new Date(datasOrdenadas[0].data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
      const ultimaData = format(new Date(datasOrdenadas[datasOrdenadas.length - 1].data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
      return `De ${primeiraData} à ${ultimaData}`;
    }
  };

  // Função para editar treinamento realizado
  const handleEditarTreinamentoRealizado = (treinamento: TreinamentoRealizado) => {
    setEditandoTreinamento(treinamento);
    setTreinamentoSelecionado(treinamento.id);
    setTipoTreinamento('Inicial');
    const treinamentoInfo = treinamentosNecessarios?.find(t => t.id === treinamento.id);
    if (treinamentoInfo) {
      const ch = treinamentoInfo.ch_formacao || 0;
      setCargaHoraria(ch);
      // Só bloquear edição se a carga horária for maior que 0
      setCargaHorariaObrigatoria(ch > 0);
    }
    // Carregar todas as datas cadastradas
    if (treinamento.datas && treinamento.datas.length > 0) {
      setAulasRealizadas(treinamento.datas.map((d, index) => ({
        id: `${index}`,
        data: d.data,
        inicio: d.inicio,
        fim: d.fim,
        horas: d.horas
      })));
    }
    setDialogTreinamentoOpen(true);
  };

  // Função para excluir treinamento realizado
  const handleExcluirTreinamentoRealizado = async (treinamentoId: string) => {
    if (!colaborador?.id) return;
    
    if (!confirm('Tem certeza que deseja excluir este treinamento realizado?')) return;

    try {
      const { error } = await supabase
        .from('colaboradores_treinamentos')
        .delete()
        .eq('colaborador_id', colaborador.id)
        .eq('treinamento_id', treinamentoId)
        .eq('status', 'realizado');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['treinamentos-realizados'] });
      toast({
        title: "Treinamento excluído",
        description: "O treinamento realizado foi excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Mutation para salvar treinamento realizado
  const salvarTreinamentoMutation = useMutation({
    mutationFn: async () => {
      if (!colaborador?.id || !treinamentoSelecionado) {
        throw new Error('Dados incompletos');
      }

      // Pegar a primeira data das aulas realizadas como data do treinamento (para compatibilidade)
      const primeiraData = aulasRealizadas.length > 0 
        ? aulasRealizadas.sort((a, b) => a.data.localeCompare(b.data))[0].data 
        : null;

      let colaboradorTreinamentoId: string;

      if (editandoTreinamento) {
        // Atualizar registro existente
        colaboradorTreinamentoId = editandoTreinamento.colaborador_treinamento_id;
        
        const { error } = await supabase
          .from('colaboradores_treinamentos')
          .update({
            status: 'realizado',
            data_realizacao: primeiraData,
          })
          .eq('id', colaboradorTreinamentoId);

        if (error) throw error;

        // Deletar datas antigas
        await supabase
          .from('colaboradores_treinamentos_datas')
          .delete()
          .eq('colaborador_treinamento_id', colaboradorTreinamentoId);
      } else {
        // Inserir novo registro
        const { data: insertedData, error } = await supabase
          .from('colaboradores_treinamentos')
          .upsert({
            colaborador_id: colaborador.id,
            treinamento_id: treinamentoSelecionado,
            status: 'realizado',
            data_realizacao: primeiraData,
          }, {
            onConflict: 'colaborador_id,treinamento_id'
          })
          .select('id')
          .single();

        if (error) throw error;
        colaboradorTreinamentoId = insertedData.id;
      }

      // Inserir todas as datas na nova tabela
      if (aulasRealizadas.length > 0) {
        const datasParaInserir = aulasRealizadas.map(aula => ({
          colaborador_treinamento_id: colaboradorTreinamentoId,
          data: aula.data,
          inicio: aula.inicio,
          fim: aula.fim,
          horas: aula.horas
        }));

        const { error: datasError } = await supabase
          .from('colaboradores_treinamentos_datas')
          .insert(datasParaInserir);

        if (datasError) throw datasError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos-realizados'] });
      toast({
        title: editandoTreinamento ? "Treinamento atualizado" : "Treinamento registrado",
        description: editandoTreinamento 
          ? "O treinamento realizado foi atualizado com sucesso."
          : "O treinamento realizado foi salvo com sucesso.",
      });
      setDialogTreinamentoOpen(false);
      resetFormulario();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Combinar treinamentos do GH + treinamentos individuais (sem duplicatas)
  const treinamentosNecessarios = useMemo(() => {
    const ghTreinamentos = treinamentosGH || [];
    const indTreinamentos = treinamentosIndividuais || [];
    
    // Usar Map para evitar duplicatas por ID
    const treinamentosMap = new Map<string, TreinamentoNecessario>();
    
    ghTreinamentos.forEach(t => {
      if (t?.id) treinamentosMap.set(t.id, t);
    });
    
    indTreinamentos.forEach(t => {
      if (t?.id) treinamentosMap.set(t.id, t);
    });
    
    return Array.from(treinamentosMap.values());
  }, [treinamentosGH, treinamentosIndividuais]);

  // Combinar treinamentos realizados manualmente + treinamentos de turmas concluídas
  const todosRealizados = useMemo(() => {
    const realizadosManual = treinamentosRealizados || [];
    const realizadosTurmas: TreinamentoRealizado[] = [];

    // Adicionar treinamentos de turmas concluídas
    (turmasColaborador || []).forEach((turma: any) => {
      if (turma.status === 'concluido' && turma.resultado === 'aprovado') {
        // Verificar se já não existe nos realizados manuais
        const jaExiste = realizadosManual.some(r => r.norma === turma.treinamento_norma);
        if (!jaExiste) {
          realizadosTurmas.push({
            id: `turma-${turma.turma_id}`,
            colaborador_treinamento_id: turma.id,
            nome: turma.treinamento_nome,
            norma: turma.treinamento_norma,
            datas: turma.data_inicio ? [{
              data: turma.data_inicio,
              inicio: '08:00',
              fim: '17:00',
              horas: 8
            }] : [],
            origemTurma: true,
            turmaCodigo: turma.codigo_turma,
            turmaId: turma.turma_id
          } as any);
        }
      }
    });

    return [...realizadosManual, ...realizadosTurmas];
  }, [treinamentosRealizados, turmasColaborador]);

  // Filtrar treinamentos
  const filteredTreinamentos = treinamentosNecessarios?.filter(
    (t) =>
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.norma.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginação
  const totalPages = Math.ceil(filteredTreinamentos.length / itemsPerPage);
  const paginatedTreinamentos = filteredTreinamentos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!colaborador || queryError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">
          {queryError ? `Erro: ${(queryError as Error).message}` : 'Colaborador não encontrado'}
        </p>
        <p className="text-xs text-muted-foreground">ID: {colaboradorId}</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{colaborador.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {colaborador.cpf || '-'} • Matrícula: {colaborador.matricula || '-'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="necessarios" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="necessarios" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Necessários
            </TabsTrigger>
            <TabsTrigger 
              value="realizados"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Realizados
            </TabsTrigger>
            <TabsTrigger 
              value="turmas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Turmas
            </TabsTrigger>
            <TabsTrigger 
              value="certificados"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <Award className="h-4 w-4 mr-2" />
              Certificados
            </TabsTrigger>
          </TabsList>

          {/* Tab: Treinamentos Necessários */}
          <TabsContent value="necessarios" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Treinamentos necessários</CardTitle>
                    <CardDescription>
                      Aqui são listados os treinamentos necessários.
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paginatedTreinamentos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {colaborador.grupo_homogeneo_id 
                      ? 'Nenhum treinamento necessário encontrado para este grupo homogêneo.'
                      : 'Colaborador não possui grupo homogêneo vinculado.'}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>NR</TableHead>
                          <TableHead>Treinamento</TableHead>
                          <TableHead>C.H - Formação</TableHead>
                          <TableHead>C.H - Reciclagem</TableHead>
                          <TableHead>Data de Vencimento</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Status do Treinamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTreinamentos.map((treinamento) => (
                          <TableRow key={treinamento.id}>
                            <TableCell className="text-primary">
                              NR - {treinamento.norma}
                            </TableCell>
                            <TableCell className="text-primary">
                              {treinamento.nome}
                            </TableCell>
                            <TableCell className="text-primary">
                              {treinamento.ch_formacao 
                                ? `${treinamento.ch_formacao} Horas` 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-primary">
                              {treinamento.ch_reciclagem 
                                ? `${treinamento.ch_reciclagem} Horas` 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-primary">
                              {calcularDataVencimento(treinamento.id, treinamento.validade)}
                            </TableCell>
                            <TableCell className="text-primary">
                              {treinamento.validade || 'Anual'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const { status, variant } = calcularStatusTreinamento(treinamento.id, treinamento.validade);
                                return (
                                  <Badge 
                                    variant={variant}
                                    className={cn(
                                      variant === 'destructive' && 'bg-red-100 text-red-800 hover:bg-red-100',
                                      variant === 'secondary' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
                                      variant === 'outline' && 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100',
                                      variant === 'default' && 'bg-green-100 text-green-800 hover:bg-green-100'
                                    )}
                                  >
                                    {status}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próximo
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Treinamentos Realizados */}
          <TabsContent value="realizados" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Treinamentos realizados</CardTitle>
                    <CardDescription>
                      Treinamentos já realizados pelo colaborador (manuais e de turmas concluídas).
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setDialogTreinamentoOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Treinamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todosRealizados && todosRealizados.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NR</TableHead>
                        <TableHead>Treinamento</TableHead>
                        <TableHead>Data do Treinamento</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todosRealizados.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-primary">
                            NR - {t.norma}
                          </TableCell>
                          <TableCell className="text-primary">
                            {t.nome}
                          </TableCell>
                          <TableCell className="text-primary">
                            {formatarDatasTreinamento(t.datas)}
                          </TableCell>
                          <TableCell>
                            {t.origemTurma ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Users className="h-3 w-3 mr-1" />
                                {t.turmaCodigo}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                <Pencil className="h-3 w-3 mr-1" />
                                Manual
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-100 text-green-800">Realizado</Badge>
                          </TableCell>
                          <TableCell>
                            {!t.origemTurma ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleEditarTreinamentoRealizado(t)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleExcluirTreinamentoRealizado(t.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Via turma</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum treinamento realizado registrado.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Turmas */}
          <TabsContent value="turmas" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Turmas do Colaborador
                </CardTitle>
                <CardDescription>
                  Turmas de treinamento em que o colaborador está inscrito.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {turmasColaborador && turmasColaborador.length > 0 ? (
                  <div className="space-y-4">
                    {turmasColaborador.map((turma: any) => {
                      const getStatusInfo = () => {
                        if (turma.status === 'cancelado') {
                          return { label: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle };
                        }
                        if (turma.status === 'concluido') {
                          return { label: 'Concluída', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle };
                        }
                        return { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock };
                      };
                      const statusInfo = getStatusInfo();
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div 
                          key={turma.id} 
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{turma.codigo_turma}</h3>
                                <Badge className={cn("border", statusInfo.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                NR {turma.treinamento_norma} - {turma.treinamento_nome}
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                {turma.data_inicio && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>
                                      {format(new Date(turma.data_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                      {turma.data_fim && turma.data_fim !== turma.data_inicio && (
                                        <> a {format(new Date(turma.data_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {turma.resultado && (
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      turma.resultado === 'aprovado' && 'bg-green-50 text-green-700 border-green-300',
                                      turma.resultado === 'reprovado' && 'bg-red-50 text-red-700 border-red-300',
                                      turma.resultado === 'aguardando' && 'bg-orange-50 text-orange-700 border-orange-300'
                                    )}
                                  >
                                    {turma.resultado === 'aprovado' ? 'Aprovado' : turma.resultado === 'reprovado' ? 'Reprovado' : 'Aguardando'}
                                    {turma.nota_pos_teste !== null && ` (${Math.floor(turma.nota_pos_teste)}/10)`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhuma turma encontrada</p>
                    <p className="text-sm">O colaborador ainda não foi inscrito em nenhuma turma de treinamento.</p>
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
                  <Award className="h-5 w-5 text-green-600" />
                  Certificados
                </CardTitle>
                <CardDescription>
                  Certificados emitidos para o colaborador através das turmas de treinamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {certificadosColaborador && certificadosColaborador.length > 0 ? (
                  <div className="space-y-4">
                    {certificadosColaborador.map((cert: any) => {
                      const isVencido = cert.data_validade && new Date(cert.data_validade) < new Date();
                      const diasParaVencer = cert.data_validade 
                        ? Math.ceil((new Date(cert.data_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const proximoVencimento = diasParaVencer !== null && diasParaVencer > 0 && diasParaVencer <= 90;

                      return (
                        <div 
                          key={cert.id} 
                          className={cn(
                            "border rounded-lg p-4 hover:shadow-md transition-shadow",
                            isVencido && "border-red-200 bg-red-50/50",
                            proximoVencimento && !isVencido && "border-orange-200 bg-orange-50/50"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={cn(
                                  "p-2 rounded-full",
                                  isVencido ? "bg-red-100" : proximoVencimento ? "bg-orange-100" : "bg-green-100"
                                )}>
                                  <Award className={cn(
                                    "h-5 w-5",
                                    isVencido ? "text-red-600" : proximoVencimento ? "text-orange-600" : "text-green-600"
                                  )} />
                                </div>
                                <div>
                                  <h3 className="font-semibold">NR {cert.treinamento_norma} - {cert.treinamento_nome}</h3>
                                  <p className="text-sm text-muted-foreground">{cert.turma_codigo}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Emissão:</span>
                                  <p className="font-medium">
                                    {cert.data_emissao 
                                      ? format(new Date(cert.data_emissao + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Validade:</span>
                                  <p className={cn(
                                    "font-medium",
                                    isVencido && "text-red-600",
                                    proximoVencimento && !isVencido && "text-orange-600"
                                  )}>
                                    {cert.data_validade 
                                      ? format(new Date(cert.data_validade + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <div className="mt-1">
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        isVencido && "bg-red-100 text-red-700 border-red-300",
                                        proximoVencimento && !isVencido && "bg-orange-100 text-orange-700 border-orange-300",
                                        !isVencido && !proximoVencimento && "bg-green-100 text-green-700 border-green-300"
                                      )}
                                    >
                                      {isVencido ? 'Vencido' : proximoVencimento ? `Vence em ${diasParaVencer} dias` : 'Válido'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                  {cert.arquivo_url && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                        onClick={() => window.open(cert.arquivo_url, '_blank')}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Ver
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-green-500 text-green-600 hover:bg-green-50"
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(cert.arquivo_url);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `certificado_${colaborador?.nome?.replace(/\s+/g, '_')}_NR${cert.treinamento_norma}.pdf`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } catch (error) {
                                            console.error('Erro ao baixar:', error);
                                            toast({ title: 'Erro ao baixar certificado', variant: 'destructive' });
                                          }
                                        }}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Baixar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhum certificado emitido</p>
                    <p className="text-sm">Os certificados serão exibidos aqui após a conclusão das turmas de treinamento.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para cadastrar treinamento realizado */}
      <Dialog open={dialogTreinamentoOpen} onOpenChange={(open) => {
        setDialogTreinamentoOpen(open);
        if (!open) resetFormulario();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editandoTreinamento ? 'Atualizar Treinamento Realizado' : 'Cadastrar Treinamento Realizado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Linha 1: Treinamento e Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Treinamento</Label>
                <Select value={treinamentoSelecionado} onValueChange={handleTreinamentoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o treinamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {treinamentosNecessarios?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        NR {t.norma} - {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Treinamento</Label>
                <Select 
                  value={tipoTreinamento} 
                  onValueChange={handleTipoTreinamentoChange}
                  disabled={!treinamentoSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inicial">Inicial (Formação)</SelectItem>
                    <SelectItem value="Periódico">Periódico (Reciclagem)</SelectItem>
                    <SelectItem value="Eventual">Eventual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Carga Horária */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carga Horária (h)</Label>
                <Input
                  type="number"
                  min="0"
                  value={cargaHoraria || ''}
                  onChange={(e) => {
                    if (!cargaHorariaObrigatoria) {
                      setCargaHoraria(parseInt(e.target.value) || 0);
                    }
                  }}
                  readOnly={cargaHorariaObrigatoria}
                  className={cargaHorariaObrigatoria 
                    ? "border-green-500 bg-green-50 text-green-700 cursor-not-allowed" 
                    : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Realizado</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                  <span className="text-green-600 font-semibold">{getTotalHorasRealizadas()}h</span>
                  <span className="text-muted-foreground ml-1">/ Meta: {cargaHoraria}h</span>
                </div>
              </div>
            </div>

            {/* Separador - Datas do Treinamento */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Datas do Treinamento</Label>

              {/* Inputs para adicionar aula */}
              <div className="grid grid-cols-[1fr_80px_80px_60px_40px] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data(s)</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          datasSelecionadas.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datasSelecionadas.length === 0 
                          ? "Selecione..." 
                          : datasSelecionadas.length === 1
                            ? format(datasSelecionadas[0], "dd/MM/yyyy", { locale: ptBR })
                            : `${datasSelecionadas.length} datas`
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={datasSelecionadas}
                        onSelect={(dates) => setDatasSelecionadas(dates || [])}
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
                    value={novaAula.inicio}
                    onChange={(e) => setNovaAula(prev => ({ ...prev, inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input
                    type="time"
                    value={novaAula.fim}
                    onChange={(e) => setNovaAula(prev => ({ ...prev, fim: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Horas</Label>
                  <Input
                    type="number"
                    value={calcularHoras(novaAula.inicio, novaAula.fim)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="pb-0.5">
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAdicionarAula}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de aulas adicionadas */}
              <div className="mt-4 space-y-2">
                {aulasRealizadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma data adicionada.
                  </p>
                ) : (
                  aulasRealizadas.map((aula) => (
                    <div 
                      key={aula.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">
                          {format(new Date(aula.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-muted-foreground">
                          {aula.inicio} - {aula.fim}
                        </span>
                        <Badge variant="secondary">{aula.horas}h</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverAula(aula.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTreinamentoOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => salvarTreinamentoMutation.mutate()}
              disabled={!treinamentoSelecionado || !tipoTreinamento || salvarTreinamentoMutation.isPending}
              className="bg-primary"
            >
              {salvarTreinamentoMutation.isPending 
                ? (editandoTreinamento ? 'Atualizando...' : 'Salvando...') 
                : (editandoTreinamento ? 'Atualizar' : 'Salvar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColaboradorDetalhes;
