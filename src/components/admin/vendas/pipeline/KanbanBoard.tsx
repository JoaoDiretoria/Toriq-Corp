/**
 * KanbanBoard — quadro de pipeline (kanban) do Toriq Vendas.
 *
 * Colunas por estágio (scroll horizontal) com cards de leads arrastáveis via
 * @dnd-kit. Ao soltar:
 *  - estágio normal -> moverLead direto;
 *  - estágio `is_closed` -> abre GanhoPerdidoDialog (valor/motivo) e só então
 *    efetiva o moverLead.
 *
 * Update otimista do board local; reverte em erro. Botão para gerenciar
 * estágios. Carrega via vendasPipelineApi.getBoard.
 *
 * Aceita um sinal externo `refreshKey` (incrementado pelo PipelineCRM quando
 * chega um evento SSE) para recarregar o board.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Kanban as KanbanIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  vendasPipelineApi,
  type Board,
  type Stage,
  type LeadCard as LeadCardData,
} from "@/integrations/api/vendasPipeline";
import { StageColumn } from "./StageColumn";
import { LeadCard } from "./LeadCard";
import {
  GanhoPerdidoDialog,
  type GanhoPerdidoResult,
} from "./GanhoPerdidoDialog";
import { GerenciarEstagios } from "./GerenciarEstagios";

interface KanbanBoardProps {
  /** Incrementar para forçar recarga (ex.: evento SSE no PipelineCRM). */
  refreshKey?: number;
  /** Abrir a conversa de um lead (ex.: trocar para a visão Conversas). */
  onOpenLead?: (lead: LeadCardData) => void;
}

interface PendenteFechamento {
  lead: LeadCardData;
  stage: Stage;
}

export function KanbanBoard({ refreshKey, onOpenLead }: KanbanBoardProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<LeadCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<LeadCardData | null>(null);
  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const [pendente, setPendente] = useState<PendenteFechamento | null>(null);

  // Guarda o snapshot anterior para reverter updates otimistas em erro.
  const snapshotRef = useRef<LeadCardData[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const board: Board = await vendasPipelineApi.getBoard();
      setStages([...board.stages].sort((a, b) => a.ordem - b.ordem));
      setLeads(board.leads);
    } catch (error) {
      toast.error("Erro ao carregar o quadro", {
        description: (error as Error)?.message,
      });
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Recarrega silenciosamente quando o pai sinaliza (SSE/polling).
  useEffect(() => {
    if (refreshKey === undefined) return;
    carregar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Estágio "Novo" (menor ordem) — usado como fallback p/ leads sem stage.
  const stageNovoId = useMemo(() => {
    if (stages.length === 0) return null;
    return String(stages[0].id);
  }, [stages]);

  const leadsByStage = useMemo(() => {
    const map = new Map<string, LeadCardData[]>();
    stages.forEach((s) => map.set(String(s.id), []));
    for (const lead of leads) {
      const sid = lead.stage_id ? String(lead.stage_id) : stageNovoId;
      if (sid && map.has(sid)) {
        map.get(sid)!.push(lead);
      } else if (stageNovoId && map.has(stageNovoId)) {
        map.get(stageNovoId)!.push(lead);
      }
    }
    return map;
  }, [stages, leads, stageNovoId]);

  const resolverStageDestino = (overId: string): Stage | null => {
    // overId pode ser "stage-<id>" (coluna) ou o id de um lead (card).
    if (overId.startsWith("stage-")) {
      const sid = overId.slice("stage-".length);
      return stages.find((s) => String(s.id) === sid) ?? null;
    }
    const leadAlvo = leads.find((l) => String(l.id) === overId);
    if (!leadAlvo) return null;
    const sid = leadAlvo.stage_id ? String(leadAlvo.stage_id) : stageNovoId;
    return stages.find((s) => String(s.id) === sid) ?? null;
  };

  const aplicarMovimentoOtimista = (leadId: string, stageId: string) => {
    snapshotRef.current = leads;
    setLeads((prev) =>
      prev.map((l) =>
        String(l.id) === leadId
          ? ({ ...l, stage_id: stageId } as LeadCardData)
          : l,
      ),
    );
  };

  const reverter = () => {
    if (snapshotRef.current) {
      setLeads(snapshotRef.current);
      snapshotRef.current = null;
    }
  };

  const efetivarMover = async (
    lead: LeadCardData,
    stage: Stage,
    extra?: GanhoPerdidoResult,
  ) => {
    aplicarMovimentoOtimista(String(lead.id), String(stage.id));
    try {
      await vendasPipelineApi.moverLead(String(lead.id), {
        stage_id: String(stage.id),
        valor_estimado: extra?.valor_estimado,
        motivo: extra?.motivo,
      });
      snapshotRef.current = null;
      // Recarrega silencioso p/ refletir valor/temperatura calculados no back.
      carregar(true);
    } catch (error) {
      reverter();
      toast.error("Erro ao mover o lead", {
        description: (error as Error)?.message,
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; lead?: LeadCardData }
      | undefined;
    if (data?.type === "lead" && data.lead) {
      setActiveLead(data.lead);
    }
  };

  /**
   * Nova ordem (lista de ids) da coluna destino, com o lead arrastado inserido
   * na posição do alvo (`overId`). Se soltar na coluna (não num card), vai pro
   * fim. Remove o lead da posição antiga antes de inserir.
   */
  const computarNovaOrdem = (
    lead: LeadCardData,
    destId: string,
    overId: string,
  ): string[] => {
    const atuais = (leadsByStage.get(destId) ?? [])
      .map((l) => String(l.id))
      .filter((id) => id !== String(lead.id));
    let idx = atuais.length;
    if (!overId.startsWith("stage-")) {
      const i = atuais.indexOf(overId);
      if (i >= 0) idx = i;
    }
    atuais.splice(idx, 0, String(lead.id));
    return atuais;
  };

  const efetivarReordenar = async (
    lead: LeadCardData,
    destId: string,
    novaOrdem: string[],
  ) => {
    snapshotRef.current = leads;
    // Update otimista: reagrupa o lead na coluna destino na ordem calculada.
    const destSet = new Set(novaOrdem);
    const leadMap = new Map(leads.map((l) => [String(l.id), l]));
    const ordenadosDest = novaOrdem
      .map((id) => leadMap.get(id))
      .filter((l): l is LeadCardData => !!l)
      .map((l) => ({ ...l, stage_id: destId }) as LeadCardData);
    const resto = leads.filter((l) => !destSet.has(String(l.id)));
    setLeads([...resto, ...ordenadosDest]);
    try {
      await vendasPipelineApi.reordenarColuna(destId, novaOrdem);
      snapshotRef.current = null;
    } catch (error) {
      reverter();
      toast.error("Erro ao reordenar", {
        description: (error as Error)?.message,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const lead = (active.data.current as { lead?: LeadCardData } | undefined)
      ?.lead;
    if (!lead) return;

    const destino = resolverStageDestino(String(over.id));
    if (!destino) return;

    const destId = String(destino.id);
    const origemId = lead.stage_id ? String(lead.stage_id) : stageNovoId;

    // Mudou para um estágio de fechamento (Ganho/Perdido): pede valor/motivo.
    if (origemId !== destId && destino.is_closed) {
      setPendente({ lead, stage: destino });
      return;
    }

    // Demais casos (reordenar na mesma coluna OU mover entre colunas abertas):
    // persiste a nova ordem da coluna destino (que também grava o stage_id).
    const novaOrdem = computarNovaOrdem(lead, destId, String(over.id));
    efetivarReordenar(lead, destId, novaOrdem);
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <KanbanIcon className="h-4 w-4" />
          Pipeline
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => carregar()}
            title="Recarregar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGerenciarOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Estágios
          </Button>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <KanbanIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="mb-3 text-sm">Nenhum estágio configurado ainda.</p>
            <Button size="sm" onClick={() => setGerenciarOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Configurar estágios
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <StageColumn
                key={String(stage.id)}
                stage={stage}
                leads={leadsByStage.get(String(stage.id)) ?? []}
                onCardClick={onOpenLead}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="w-72">
                <LeadCard lead={activeLead} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <GanhoPerdidoDialog
        open={!!pendente}
        onOpenChange={(o) => {
          if (!o) setPendente(null);
        }}
        stage={pendente?.stage ?? null}
        lead={pendente?.lead ?? null}
        onCancel={() => setPendente(null)}
        onConfirm={(result) => {
          if (pendente) {
            efetivarMover(pendente.lead, pendente.stage, result);
          }
          setPendente(null);
        }}
      />

      <GerenciarEstagios
        open={gerenciarOpen}
        onOpenChange={setGerenciarOpen}
        onChanged={() => carregar(true)}
      />
    </div>
  );
}

export default KanbanBoard;
