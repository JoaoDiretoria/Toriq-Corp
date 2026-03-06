import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Loader2 } from 'lucide-react';
import { AgendaTreinamentos, TurmaAgenda } from '@/components/shared/AgendaTreinamentos';

const db = supabase as any;

export function InstrutorAgendaTreinamentos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [turmas, setTurmas] = useState<TurmaAgenda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchTurmas();
    }
  }, [profile]);

  const fetchTurmas = async () => {
    if (!profile) return;
    
    try {
      const { data: turmasData, error: turmasError } = await db
        .rpc('get_turmas_instrutor', { p_user_id: profile.id });

      if (turmasError) throw turmasError;

      const turmasFormatadas: TurmaAgenda[] = [];
      
      for (const t of turmasData || []) {
        const { data: aulasData } = await db
          .from('turmas_treinamento_aulas')
          .select('id, data, hora_inicio, hora_fim, horas')
          .eq('turma_id', t.id)
          .order('data');
        
        const aulas = aulasData || [];
        const primeiraAula = aulas.length > 0 ? aulas[0] : null;
        
        turmasFormatadas.push({
          id: t.id,
          numero_turma: t.numero_turma,
          cliente_nome: t.cliente_nome || '',
          treinamento_nome: `NR ${t.treinamento_norma || ''} - ${t.treinamento_nome || ''}`,
          treinamento_norma: t.treinamento_norma,
          tipo_treinamento: t.tipo_treinamento || 'Inicial',
          horario: primeiraAula ? `${primeiraAula.hora_inicio.substring(0,5)}-${primeiraAula.hora_fim.substring(0,5)}` : '',
          quantidade_participantes: t.quantidade_participantes || 0,
          status: t.status as 'agendado' | 'em_andamento' | 'concluido' | 'cancelado',
          aulas: aulas.map((a: any) => ({
            id: a.id,
            data: a.data,
            inicio: a.hora_inicio.substring(0, 5),
            fim: a.hora_fim.substring(0, 5),
            horas: a.horas
          })),
          validado: t.validado || false
        });
      }
      
      setTurmas(turmasFormatadas);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTurmaClick = (turma: TurmaAgenda) => {
    navigate(`/instrutor/turma/${turma.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Agenda de Treinamentos
        </h1>
        <p className="text-muted-foreground">
          Visualize seus treinamentos agendados em lista ou calendário
        </p>
      </div>

      {/* Componente de Agenda Reutilizável */}
      <AgendaTreinamentos 
        turmas={turmas}
        onTurmaClick={handleTurmaClick}
      />
    </div>
  );
}
