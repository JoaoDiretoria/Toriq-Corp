/**
 * StageColumn — uma coluna do Kanban representando um estágio da pipeline.
 *
 * É uma área "droppable" (useDroppable) que contém um SortableContext vertical
 * com os LeadCards do estágio. O header mostra o nome do estágio (com a cor),
 * a contagem de leads e a soma de valor estimado.
 */

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadCard } from "./LeadCard";
import type {
  Stage,
  LeadCard as LeadCardData,
} from "@/integrations/api/vendasPipeline";

interface StageColumnProps {
  stage: Stage;
  leads: LeadCardData[];
  onCardClick?: (lead: LeadCardData) => void;
}

function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function StageColumn({ stage, leads, onCardClick }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: "stage", stage },
  });

  const total = leads.reduce(
    (acc, l) => acc + (l.valor_estimado ?? 0),
    0,
  );
  const cor = stage.cor || "#64748b";

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: cor }}
          />
          <span className="truncate text-sm font-semibold">{stage.nome}</span>
          {stage.is_won && (
            <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          )}
          {stage.is_closed && !stage.is_won && (
            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {leads.length}
        </Badge>
      </div>

      {total > 0 && (
        <div className="px-3 pt-1.5 text-xs font-medium text-muted-foreground">
          {formatarValor(total)}
        </div>
      )}

      {/* Lista de cards (droppable) */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
        )}
      >
        <SortableContext
          items={leads.map((l) => String(l.id))}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard
              key={String(lead.id)}
              lead={lead}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}
