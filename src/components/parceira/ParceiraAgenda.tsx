import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { AgendaTreinamentos, TurmaAgenda } from '@/components/shared/AgendaTreinamentos';

export function ParceiraAgenda() {
  const { profile, empresa, loading: authLoading } = useAuth();
  const [turmas, setTurmas] = useState<TurmaAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaParceiraId, setEmpresaParceiraId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresaParceiraId = async () => {
      const empresaIdToUse = empresa?.id || profile?.empresa_id;
      
      if (authLoading) return;
      if (!empresaIdToUse) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empresas_parceiras')
          .select('id, empresa_sst_id')
          .eq('parceira_empresa_id', empresaIdToUse)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setEmpresaParceiraId(data.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa parceira:', error);
        setLoading(false);
      }
    };

    fetchEmpresaParceiraId();
  }, [empresa?.id, profile?.empresa_id, authLoading]);

  useEffect(() => {
    if (empresaParceiraId) {
      fetchTurmasAgenda();
    }
  }, [empresaParceiraId]);

  const fetchTurmasAgenda = async () => {
    if (!empresaParceiraId) return;

    try {
      setLoading(true);

      // Buscar instrutores da empresa parceira
      const { data: instrutores, error: instrutoresError } = await supabase
        .from('instrutores')
        .select('id, nome')
        .eq('empresa_parceira_id', empresaParceiraId)
        .eq('ativo', true);

      if (instrutoresError) throw instrutoresError;

      if (!instrutores || instrutores.length === 0) {
        setTurmas([]);
        setLoading(false);
        return;
      }

      const instrutorIds = instrutores.map(i => i.id);

      // Buscar turmas desses instrutores
      const { data: turmasData, error: turmasError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          numero_turma,
          codigo_turma,
          instrutor_id,
          status,
          cliente_id,
          treinamento_id,
          quantidade_participantes
        `)
        .in('instrutor_id', instrutorIds)
        .in('status', ['agendado', 'em_andamento', 'concluido']);

      if (turmasError) throw turmasError;

      if (!turmasData || turmasData.length === 0) {
        setTurmas([]);
        setLoading(false);
        return;
      }

      // Buscar aulas dessas turmas
      const turmaIds = turmasData.map((t: any) => t.id);
      const { data: aulasData, error: aulasError } = await supabase
        .from('turmas_treinamento_aulas')
        .select('id, turma_id, data, hora_inicio, hora_fim')
        .in('turma_id', turmaIds)
        .order('data')
        .order('hora_inicio');

      if (aulasError) throw aulasError;

      // Buscar clientes e treinamentos
      const clienteIds = [...new Set(turmasData.map((t: any) => t.cliente_id).filter(Boolean))] as string[];
      const treinamentoIds = [...new Set(turmasData.map((t: any) => t.treinamento_id).filter(Boolean))] as string[];

      const [clientesRes, treinamentosRes] = await Promise.all([
        supabase.from('clientes_sst').select('id, nome').in('id', clienteIds),
        supabase.from('catalogo_treinamentos').select('id, nome, norma').in('id', treinamentoIds)
      ]);

      const clienteMap = Object.fromEntries((clientesRes.data || []).map(c => [c.id, c.nome]));
      const treinamentoMap = Object.fromEntries((treinamentosRes.data || []).map(t => [t.id, { nome: t.nome, norma: t.norma }]));

      // Agrupar aulas por turma
      const aulasPorTurma: Record<string, any[]> = {};
      (aulasData || []).forEach((aula: any) => {
        if (!aulasPorTurma[aula.turma_id]) {
          aulasPorTurma[aula.turma_id] = [];
        }
        aulasPorTurma[aula.turma_id].push(aula);
      });

      // Montar dados no formato do AgendaTreinamentos
      const turmasFormatadas: TurmaAgenda[] = turmasData.map((turma: any) => {
        const treinamento = treinamentoMap[turma.treinamento_id] || { nome: '', norma: '' };
        const aulas = aulasPorTurma[turma.id] || [];
        
        return {
          id: turma.id,
          codigo_turma: turma.codigo_turma,
          numero_turma: turma.numero_turma,
          cliente_nome: clienteMap[turma.cliente_id] || '',
          treinamento_nome: `NR ${treinamento.norma} - ${treinamento.nome}`,
          treinamento_norma: treinamento.norma,
          quantidade_participantes: turma.quantidade_participantes || 0,
          status: turma.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
          aulas: aulas.map((a: any) => ({
            id: a.id,
            data: a.data,
            inicio: a.hora_inicio,
            fim: a.hora_fim,
            horas: 0
          }))
        };
      });

      setTurmas(turmasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!empresaParceiraId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Empresa não vinculada</h3>
          <p className="text-muted-foreground">
            Sua empresa não está vinculada como parceira de nenhuma empresa SST.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Agenda de Treinamentos</h1>
        <p className="text-sm text-slate-500">
          Visualize os treinamentos agendados dos seus instrutores
        </p>
      </div>

      <AgendaTreinamentos
        turmas={turmas}
        loading={loading}
        title="Treinamentos dos Instrutores"
      />
    </div>
  );
}
