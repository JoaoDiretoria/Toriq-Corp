/**
 * GerenciarEstagios — dialog CRUD dos estágios da pipeline.
 *
 * Lista os estágios atuais, permite criar, editar (nome/cor/flags) e excluir.
 * Ao fechar (ou após qualquer mutação) chama onChanged para o board recarregar.
 *
 * Usa o client de '@/integrations/api/vendasPipeline'.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, GripVertical, Check, X } from "lucide-react";
import { toast } from "sonner";
import { vendasPipelineApi, type Stage } from "@/integrations/api/vendasPipeline";

interface GerenciarEstagiosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado após criar/editar/excluir para o board recarregar. */
  onChanged?: () => void;
}

const CORES_SUGERIDAS = [
  "#64748b",
  "#3b82f6",
  "#06b6d4",
  "#f59e0b",
  "#a855f7",
  "#22c55e",
  "#ef4444",
  "#ec4899",
];

interface RascunhoNovo {
  nome: string;
  cor: string;
  is_closed: boolean;
  is_won: boolean;
}

const RASCUNHO_VAZIO: RascunhoNovo = {
  nome: "",
  cor: CORES_SUGERIDAS[0],
  is_closed: false,
  is_won: false,
};

export function GerenciarEstagios({
  open,
  onOpenChange,
  onChanged,
}: GerenciarEstagiosProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState<RascunhoNovo>(RASCUNHO_VAZIO);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("");
  const [excluindo, setExcluindo] = useState<Stage | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await vendasPipelineApi.getStages();
      setStages([...data].sort((a, b) => a.ordem - b.ordem));
    } catch (error) {
      toast.error("Erro ao carregar estágios", {
        description: (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregar();
      setNovo(RASCUNHO_VAZIO);
      setEditId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const criar = async () => {
    if (!novo.nome.trim()) {
      toast.error("Informe um nome para o estágio");
      return;
    }
    setSalvando(true);
    try {
      await vendasPipelineApi.createStage({
        nome: novo.nome.trim(),
        cor: novo.cor,
        ordem: stages.length,
        is_closed: novo.is_closed,
        is_won: novo.is_won,
      });
      toast.success("Estágio criado");
      setNovo(RASCUNHO_VAZIO);
      await carregar();
      onChanged?.();
    } catch (error) {
      toast.error("Erro ao criar estágio", {
        description: (error as Error)?.message,
      });
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (stage: Stage) => {
    setEditId(String(stage.id));
    setEditNome(stage.nome);
    setEditCor(stage.cor || CORES_SUGERIDAS[0]);
  };

  const salvarEdicao = async (stage: Stage) => {
    if (!editNome.trim()) {
      toast.error("Informe um nome");
      return;
    }
    setSalvando(true);
    try {
      await vendasPipelineApi.updateStage(String(stage.id), {
        nome: editNome.trim(),
        cor: editCor,
      });
      toast.success("Estágio atualizado");
      setEditId(null);
      await carregar();
      onChanged?.();
    } catch (error) {
      toast.error("Erro ao atualizar estágio", {
        description: (error as Error)?.message,
      });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    setSalvando(true);
    try {
      await vendasPipelineApi.deleteStage(String(excluindo.id));
      toast.success("Estágio excluído");
      setExcluindo(null);
      await carregar();
      onChanged?.();
    } catch (error) {
      toast.error("Erro ao excluir estágio", {
        description: (error as Error)?.message,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar estágios</DialogTitle>
            <DialogDescription>
              Configure as colunas da pipeline. Leads de um estágio excluído
              voltam para "Novo".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {loading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              stages.map((stage) => {
                const editando = editId === String(stage.id);
                return (
                  <div
                    key={String(stage.id)}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    {editando ? (
                      <>
                        <input
                          type="color"
                          value={editCor}
                          onChange={(e) => setEditCor(e.target.value)}
                          className="h-7 w-7 shrink-0 cursor-pointer rounded border bg-transparent"
                          aria-label="Cor do estágio"
                        />
                        <Input
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={salvando}
                          onClick={() => salvarEdicao(stage)}
                        >
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.cor || "#64748b" }}
                        />
                        <span className="flex-1 truncate text-sm font-medium">
                          {stage.nome}
                        </span>
                        {stage.is_won && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            ganho
                          </span>
                        )}
                        {stage.is_closed && !stage.is_won && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            fechado
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => iniciarEdicao(stage)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setExcluindo(stage)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Novo estágio */}
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Novo estágio
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={novo.cor}
                onChange={(e) => setNovo({ ...novo, cor: e.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border bg-transparent"
                aria-label="Cor do novo estágio"
              />
              <Input
                placeholder="Nome do estágio"
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criar();
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={novo.is_closed}
                  onCheckedChange={(v) =>
                    setNovo({ ...novo, is_closed: v, is_won: v ? novo.is_won : false })
                  }
                />
                Estágio de fechamento
              </label>
              {novo.is_closed && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={novo.is_won}
                    onCheckedChange={(v) => setNovo({ ...novo, is_won: v })}
                  />
                  É ganho
                </label>
              )}
            </div>
            <Button
              onClick={criar}
              disabled={salvando || !novo.nome.trim()}
              size="sm"
              className="w-full"
            >
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Adicionar estágio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!excluindo}
        onOpenChange={(o) => !o && setExcluindo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estágio?</AlertDialogTitle>
            <AlertDialogDescription>
              O estágio "{excluindo?.nome}" será removido. Os leads desse
              estágio voltarão para "Novo". Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                excluir();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
