import { useState, useEffect, useCallback } from 'react';
import {
  vendasDisparoApi,
  type DisparoTemplate,
  type DisparoCampanhaInput,
} from '@/integrations/api/vendasDisparo';
import {
  vendasApi,
  type VendasSegmento,
  type VendasLead,
} from '@/integrations/api/vendas';
import { CANAIS_ENVIO, isWhatsappCanal } from '../canais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Loader2,
  Send,
  Users,
  FileText,
  CalendarClock,
  Layers,
  ListChecks,
  AlertTriangle,
} from 'lucide-react';

interface CampanhaCriarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado após criar a campanha; recebe o id criado. */
  onCreated: (campanhaId: string) => void;
}

type Alvo = 'segmento' | 'leads';

export function CampanhaCriar({ open, onOpenChange, onCreated }: CampanhaCriarProps) {
  const [nome, setNome] = useState('');
  const [canal, setCanal] = useState<string>('email');
  const [templateId, setTemplateId] = useState('');
  const [alvo, setAlvo] = useState<Alvo>('segmento');
  const [segmentoId, setSegmentoId] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [agendadaPara, setAgendadaPara] = useState('');

  const [templates, setTemplates] = useState<DisparoTemplate[]>([]);
  const [segmentos, setSegmentos] = useState<VendasSegmento[]>([]);
  const [leads, setLeads] = useState<VendasLead[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setNome(`Campanha ${new Date().toLocaleDateString('pt-BR')}`);
    setCanal('email');
    setTemplateId('');
    setAlvo('segmento');
    setSegmentoId('');
    setSelectedLeadIds(new Set());
    setAgendadaPara('');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, segs, leadsRes] = await Promise.all([
        vendasDisparoApi.listTemplates(),
        vendasApi.listSegmentos(),
        // Trazemos uma página generosa; filtramos por canal (e-mail vs telefone)
        // ao exibir, conforme o canal escolhido.
        vendasApi.listLeads({ limit: 200, offset: 0 }),
      ]);
      setTemplates(Array.isArray(tpls) ? tpls : []);
      setSegmentos(Array.isArray(segs) ? segs : []);
      const items = Array.isArray(leadsRes?.items) ? leadsRes.items : [];
      setLeads(items);
    } catch (err) {
      console.error('[CampanhaCriar] erro ao carregar dados:', err);
      toast.error('Erro ao carregar templates/segmentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      loadData();
    }
  }, [open, reset, loadData]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Estimativa de destinatários: leads selecionados, ou contagem do segmento.
  const segmentoSel = segmentos.find((s) => s.id === segmentoId);
  const estimativa =
    alvo === 'leads'
      ? selectedLeadIds.size
      : segmentoSel?.total_leads ?? null;

  // Templates e leads válidos para o canal escolhido (e-mail usa e-mail;
  // WhatsApp Meta/Evolution usam telefone).
  const isWa = isWhatsappCanal(canal);
  const templatesDoCanal = templates.filter((t) => t.canal === canal);
  const leadsDisponiveis = leads.filter((l) => (isWa ? !!l.telefone : !!l.email));

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error('Informe o nome da campanha');
      return;
    }
    if (!templateId) {
      toast.error('Selecione um template');
      return;
    }
    if (alvo === 'segmento' && !segmentoId) {
      toast.error('Selecione um segmento');
      return;
    }
    if (alvo === 'leads' && selectedLeadIds.size === 0) {
      toast.error('Selecione ao menos um lead');
      return;
    }

    const payload: DisparoCampanhaInput = {
      nome: nome.trim(),
      template_id: templateId,
      canal,
      segmento_id: alvo === 'segmento' ? segmentoId : null,
      lead_ids: alvo === 'leads' ? Array.from(selectedLeadIds) : null,
      agendada_para: agendadaPara ? new Date(agendadaPara).toISOString() : null,
    };

    setSaving(true);
    try {
      const camp = await vendasDisparoApi.createCampanha(payload);
      toast.success(
        agendadaPara
          ? 'Campanha agendada com sucesso!'
          : 'Campanha criada como rascunho!',
      );
      onCreated(camp.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar campanha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Nova campanha
          </DialogTitle>
          <DialogDescription>
            Escolha o template e o público. A campanha é criada como rascunho —
            o envio respeita supressão (opt-out) e rate limit.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp-nome">Nome da campanha *</Label>
              <Input
                id="camp-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Reativação de leads — junho"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="camp-canal">Canal *</Label>
              <Select
                value={canal}
                onValueChange={(v) => {
                  setCanal(v);
                  setTemplateId('');
                  setSelectedLeadIds(new Set());
                }}
              >
                <SelectTrigger id="camp-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANAIS_ENVIO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Template *
              </Label>
              {templatesDoCanal.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum template neste canal. Crie um na aba Templates.
                </p>
              ) : (
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesDoCanal.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Público-alvo */}
            <div className="space-y-3">
              <Label>Público-alvo *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlvo('segmento')}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    alvo === 'segmento'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Segmento
                </button>
                <button
                  type="button"
                  onClick={() => setAlvo('leads')}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    alvo === 'leads'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <ListChecks className="h-4 w-4" />
                  Selecionar leads
                </button>
              </div>

              {alvo === 'segmento' ? (
                segmentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum segmento salvo. Crie um na tela de Leads ou selecione leads manualmente.
                  </p>
                ) : (
                  <Select value={segmentoId} onValueChange={setSegmentoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                          {typeof s.total_leads === 'number' ? ` (${s.total_leads})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : leadsDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isWa
                    ? 'Nenhum lead com telefone disponível para seleção.'
                    : 'Nenhum lead com e-mail disponível para seleção.'}
                </p>
              ) : (
                <ScrollArea className="h-48 rounded-md border">
                  <div className="p-2 space-y-0.5">
                    {leadsDisponiveis.map((lead) => {
                      const checked = selectedLeadIds.has(lead.id);
                      return (
                        <button
                          type="button"
                          key={lead.id}
                          onClick={() => toggleLead(lead.id)}
                          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
                        >
                          <Checkbox checked={checked} className="pointer-events-none" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {lead.empresa_nome || lead.nome || 'Sem nome'}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {isWa ? lead.telefone : lead.email}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            {/* Agendamento */}
            <div className="space-y-2">
              <Label htmlFor="camp-agenda" className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                Agendar envio (opcional)
              </Label>
              <Input
                id="camp-agenda"
                type="datetime-local"
                value={agendadaPara}
                onChange={(e) => setAgendadaPara(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              {agendadaPara && (
                <p className="text-xs text-muted-foreground">
                  A campanha será disparada automaticamente no horário agendado.
                </p>
              )}
            </div>

            {/* Estimativa */}
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {estimativa != null ? (
                <span>
                  Estimativa: <strong>{estimativa}</strong>{' '}
                  {estimativa === 1 ? 'destinatário' : 'destinatários'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  A contagem exata é calculada ao enviar.
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {agendadaPara ? 'Agendar campanha' : 'Criar campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
