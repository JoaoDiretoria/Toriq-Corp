/**
 * LeadCard — card arrastável de um lead dentro de uma coluna do Kanban.
 *
 * Usa @dnd-kit/sortable (useSortable). Mostra nome, empresa, telefone,
 * temperatura (emoji), valor estimado em R$ e badge de mensagens não-lidas.
 *
 * Renderizado dentro do StageColumn (que provê o SortableContext) e também
 * pelo DragOverlay do KanbanBoard (modo `overlay`, sem listeners de drag).
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadCard as LeadCardData } from "@/integrations/api/vendasPipeline";

interface LeadCardProps {
  lead: LeadCardData;
  /** Quando true, renderiza estático (usado no DragOverlay). */
  overlay?: boolean;
  onClick?: (lead: LeadCardData) => void;
}

const TEMPERATURA_EMOJI: Record<string, string> = {
  quente: "🔥",
  morno: "🌤️",
  frio: "❄️",
};

function formatarValor(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Normaliza uma tag (vinda como dict do backend, tipada como Record<...>)
 * para um shape seguro de renderizar, sem depender da tipagem exata do client.
 */
function normalizarTag(tag: unknown): {
  id: string;
  nome: string;
  cor: string | null;
} {
  const t = (tag ?? {}) as Record<string, unknown>;
  return {
    id: t.id != null ? String(t.id) : String(t.nome ?? Math.random()),
    nome: t.nome != null ? String(t.nome) : "",
    cor: t.cor != null ? String(t.cor) : null,
  };
}

/** Conteúdo interno do card (reutilizado no overlay e no card normal). */
function LeadCardInner({ lead }: { lead: LeadCardData }) {
  const valor = formatarValor(lead.valor_estimado);
  const emoji = lead.temperatura ? TEMPERATURA_EMOJI[lead.temperatura] : null;

  return (
    <CardContent className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight line-clamp-2 flex-1">
          {lead.nome || "Sem nome"}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {emoji && (
            <span className="text-sm" title={lead.temperatura ?? undefined}>
              {emoji}
            </span>
          )}
          {lead.unread > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums"
            >
              {lead.unread > 99 ? "99+" : lead.unread}
            </Badge>
          )}
        </div>
      </div>

      {lead.empresa_nome && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.empresa_nome}</span>
        </p>
      )}

      {lead.telefone && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.telefone}</span>
        </p>
      )}

      {lead.last_message_preview && (
        <p className="text-xs text-muted-foreground/80 line-clamp-1 italic">
          {lead.last_message_preview}
        </p>
      )}

      {(valor || (lead.tags && lead.tags.length > 0)) && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1 min-w-0">
            {lead.tags?.slice(0, 2).map(normalizarTag).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="h-4 px-1.5 text-[10px] font-normal"
                style={
                  tag.cor
                    ? { backgroundColor: `${tag.cor}22`, color: tag.cor }
                    : undefined
                }
              >
                {tag.nome}
              </Badge>
            ))}
          </div>
          {valor && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              {valor}
            </span>
          )}
        </div>
      )}
    </CardContent>
  );
}

export function LeadCard({ lead, overlay = false, onClick }: LeadCardProps) {
  if (overlay) {
    return (
      <Card className="w-full shadow-xl rotate-2 opacity-95 cursor-grabbing border-primary/40">
        <LeadCardInner lead={lead} />
      </Card>
    );
  }

  return <SortableLeadCard lead={lead} onClick={onClick} />;
}

function SortableLeadCard({
  lead,
  onClick,
}: {
  lead: LeadCardData;
  onClick?: (lead: LeadCardData) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(lead.id),
    data: { type: "lead", lead, stageId: lead.stage_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative cursor-pointer transition-shadow hover:shadow-md",
        lead.is_pinned && "ring-1 ring-amber-400/60",
        lead.pending_reply && "border-l-2 border-l-cyan-500",
      )}
      onClick={() => onClick?.(lead)}
    >
      {/* Handle de arraste — só ele dispara o drag */}
      <button
        type="button"
        className="absolute right-1 top-1 z-10 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        aria-label="Arrastar lead"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <LeadCardInner lead={lead} />
    </Card>
  );
}
