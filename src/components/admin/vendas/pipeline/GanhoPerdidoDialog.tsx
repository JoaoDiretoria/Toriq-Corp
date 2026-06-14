/**
 * GanhoPerdidoDialog — confirmação ao mover um lead para um estágio "fechado".
 *
 * Disparado pelo KanbanBoard quando o lead é solto numa coluna `is_closed`.
 * Para estágios de ganho (`is_won`) pede o valor; para perdidos pede o motivo.
 * Ao confirmar, devolve { valor_estimado?, motivo? } para o board efetivar o
 * `moverLead`.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, XCircle } from "lucide-react";
import type {
  Stage,
  LeadCard as LeadCardData,
} from "@/integrations/api/vendasPipeline";

export interface GanhoPerdidoResult {
  valor_estimado?: number;
  motivo?: string;
}

interface GanhoPerdidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  lead: LeadCardData | null;
  /** Cancela a movimentação (fecha sem efetivar). */
  onCancel: () => void;
  /** Confirma — o board chama moverLead com os dados. */
  onConfirm: (result: GanhoPerdidoResult) => void;
}

export function GanhoPerdidoDialog({
  open,
  onOpenChange,
  stage,
  lead,
  onCancel,
  onConfirm,
}: GanhoPerdidoDialogProps) {
  const isWon = !!stage?.is_won;
  const [valor, setValor] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");

  // Pré-preenche o valor com o que já existe no lead ao abrir.
  useEffect(() => {
    if (open) {
      setValor(
        lead?.valor_estimado != null ? String(lead.valor_estimado) : "",
      );
      setMotivo("");
    }
  }, [open, lead]);

  const handleConfirm = () => {
    const result: GanhoPerdidoResult = {};
    if (isWon) {
      const parsed = Number(valor.replace(",", "."));
      if (!Number.isNaN(parsed) && valor.trim() !== "") {
        result.valor_estimado = parsed;
      }
    } else {
      const m = motivo.trim();
      if (m) result.motivo = m;
    }
    onConfirm(result);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWon ? (
              <Trophy className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {isWon ? "Marcar como ganho" : "Marcar como perdido"}
          </DialogTitle>
          <DialogDescription>
            {lead?.nome ? `Lead: ${lead.nome}` : "Confirme a movimentação do lead"}
            {stage?.nome ? ` → ${stage.nome}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isWon ? (
            <div className="space-y-2">
              <Label htmlFor="ganho-valor">Valor fechado (R$)</Label>
              <Input
                id="ganho-valor"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="perdido-motivo">Motivo da perda</Label>
              <Textarea
                id="perdido-motivo"
                placeholder="Ex.: sem orçamento, escolheu concorrente, sem retorno..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className={
              isWon
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
