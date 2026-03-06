import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserX, Users } from 'lucide-react';
import { ColaboradorPendenteCard } from './ColaboradorPendenteCard';

interface ColaboradorPendente {
  id: string;
  nome: string;
  cpf: string;
  matricula?: string | null;
  foto_url?: string | null;
  created_at: string;
}

interface ColaboradoresPendentesListProps {
  turmaId: string;
  turmaClienteId: string;
  turmaTreinamentoId: string;
  onColaboradorAprovado: () => void;
  reconhecimentoFacialAtivo?: boolean;
}

export function ColaboradoresPendentesList({
  turmaId,
  turmaClienteId,
  turmaTreinamentoId,
  onColaboradorAprovado,
  reconhecimentoFacialAtivo = false
}: ColaboradoresPendentesListProps) {
  const [pendentes, setPendentes] = useState<ColaboradorPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendentes();
  }, [turmaId]);

  const fetchPendentes = async () => {
    if (!turmaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('colaboradores_temporarios')
        .select('id, nome, cpf, matricula, foto_url, created_at')
        .eq('turma_id', turmaId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendentes(data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovado = () => {
    fetchPendentes();
    onColaboradorAprovado();
  };

  const handleRecusado = () => {
    fetchPendentes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-warning" />
      </div>
    );
  }

  if (pendentes.length === 0) {
    return (
      <div className="text-center py-8">
        <UserX className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Nenhum colaborador aguardando aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
        <Users className="h-4 w-4" />
        <span>{pendentes.length} colaborador(es) aguardando aprovação</span>
      </div>
      
      {pendentes.map((pendente) => (
        <ColaboradorPendenteCard
          key={pendente.id}
          pendente={pendente}
          turmaId={turmaId}
          turmaClienteId={turmaClienteId}
          turmaTreinamentoId={turmaTreinamentoId}
          onAprovado={handleAprovado}
          onRecusado={handleRecusado}
          reconhecimentoFacialAtivo={reconhecimentoFacialAtivo}
        />
      ))}
    </div>
  );
}
