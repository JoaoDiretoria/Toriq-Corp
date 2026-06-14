import { useState, useEffect, useRef, useCallback } from 'react';
import { conectarEventos, type EventoPipeline } from '@/integrations/api/vendasPipeline';
import { KanbanBoard } from './KanbanBoard';
import { ConversasInbox } from './ConversasInbox';
import { ConversaoDashboard } from './ConversaoDashboard';
import { MessagesSquare, KanbanSquare, TrendingUp } from 'lucide-react';

type Visao = 'conversas' | 'kanban' | 'conversao';

const VISOES: { value: Visao; label: string; icon: typeof MessagesSquare }[] = [
  { value: 'conversas', label: 'Conversas', icon: MessagesSquare },
  { value: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { value: 'conversao', label: 'Conversão', icon: TrendingUp },
];

const POLL_MS = 20000;

/**
 * Página do CRM de Vendas — Pipeline & Conversas.
 *
 * Toggle de 3 visões (Conversas | Kanban | Conversão). Abre uma conexão SSE
 * (Redis pub/sub no backend) e, a cada evento, "bumpa" um contador que as
 * visões observam via prop `refreshKey` para refazer o fetch da visão ativa.
 * Cleanup do EventSource no unmount + fallback de polling leve (~20s).
 */
export function PipelineCRM() {
  const [visao, setVisao] = useState<Visao>('conversas');
  const [refreshKey, setRefreshKey] = useState(0);
  const [ultimoEvento, setUltimoEvento] = useState<EventoPipeline | null>(null);

  const bump = useCallback((evento?: EventoPipeline) => {
    if (evento && evento.tipo !== 'ping') setUltimoEvento(evento);
    setRefreshKey((k) => k + 1);
  }, []);

  // -- Conexão SSE (tempo real)
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    const es = conectarEventos((evento) => {
      if (evento?.tipo === 'ping') return;
      bump(evento);
    });
    esRef.current = es;
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [bump]);

  // -- Fallback de polling leve (caso o SSE caia/sem Redis)
  useEffect(() => {
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header + toggle de visões */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessagesSquare className="h-6 w-6" />
            CRM de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe leads na pipeline, converse em tempo real e veja a conversão.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {VISOES.map((v) => {
            const Icon = v.icon;
            const active = visao === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVisao(v.value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visão ativa — KanbanBoard e ConversasInbox recebem refreshKey/evento */}
      {visao === 'conversas' && (
        <ConversasInbox refreshKey={refreshKey} ultimoEvento={ultimoEvento} />
      )}
      {visao === 'kanban' && <KanbanBoard refreshKey={refreshKey} />}
      {visao === 'conversao' && <ConversaoDashboard refreshKey={refreshKey} />}
    </div>
  );
}

export default PipelineCRM;
