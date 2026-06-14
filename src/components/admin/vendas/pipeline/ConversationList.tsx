import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LeadCard } from '@/integrations/api/vendasPipeline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pin, MessageSquare, Inbox } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers compartilhados (temperatura / tempo relativo / iniciais)
// ---------------------------------------------------------------------------

export const TEMPERATURA_EMOJI: Record<string, string> = {
  quente: '🔥',
  morno: '🌤️',
  frio: '❄️',
};

export function temperaturaEmoji(t: string | null | undefined): string {
  if (!t) return '';
  return TEMPERATURA_EMOJI[t] ?? '';
}

export function tempoRelativo(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: ptBR });
}

export function nomeExibicao(lead: LeadCard): string {
  return lead.empresa_nome || lead.nome || lead.telefone || 'Sem nome';
}

export function iniciais(lead: LeadCard): string {
  const base = nomeExibicao(lead).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Lista de conversas (coluna do meio da inbox)
// ---------------------------------------------------------------------------

interface ConversationListProps {
  leads: LeadCard[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (lead: LeadCard) => void;
}

export function ConversationList({
  leads,
  loading,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">Nenhuma conversa</h3>
        <p className="text-xs text-muted-foreground max-w-[220px] mt-1">
          As conversas com seus leads aparecem aqui. Ajuste os filtros para ver mais.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {leads.map((lead) => {
          const active = lead.id === selectedId;
          const temp = temperaturaEmoji(lead.temperatura);
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => onSelect(lead)}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                active ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
            >
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {iniciais(lead)}
                </div>
                {lead.unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {lead.unread > 99 ? '99+' : lead.unread}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {lead.is_pinned && (
                    <Pin className="h-3 w-3 shrink-0 text-muted-foreground" fill="currentColor" />
                  )}
                  <span
                    className={`truncate text-sm ${
                      lead.unread > 0 ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {nomeExibicao(lead)}
                  </span>
                  {temp && <span className="shrink-0 text-xs">{temp}</span>}
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {tempoRelativo(lead.last_message_at)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 truncate text-xs ${
                    lead.unread > 0 ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {lead.last_message_preview || (
                    <span className="italic text-muted-foreground">Sem mensagens</span>
                  )}
                </p>
                {(lead.tags?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {lead.tags.slice(0, 2).map((t, idx) => (
                      <Badge
                        key={(t.id as string) ?? idx}
                        variant="outline"
                        className="text-[10px]"
                        style={
                          t.cor
                            ? { borderColor: t.cor as string, color: t.cor as string }
                            : undefined
                        }
                      >
                        {(t.nome as string) ?? 'tag'}
                      </Badge>
                    ))}
                    {lead.tags.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{lead.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {lead.pending_reply && lead.unread === 0 && (
                <MessageSquare className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default ConversationList;
