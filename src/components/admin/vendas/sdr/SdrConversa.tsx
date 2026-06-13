import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasSdrApi,
  type SdrLead,
  type SdrInteracao,
} from '@/integrations/api/vendasSdr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  Bot,
  User as UserIcon,
  Sparkles,
  Send,
  MessageSquare,
  PlusCircle,
  ClipboardCheck,
} from 'lucide-react';

interface SdrConversaProps {
  lead: SdrLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Rótulos amigáveis para os tipos de interação.
const TIPO_LABEL: Record<string, string> = {
  mensagem: 'Mensagem',
  qualificacao: 'Qualificação',
  nota: 'Nota',
};

function papelIcon(papel: string | null) {
  if (papel === 'assistente') return Bot;
  if (papel === 'usuario') return UserIcon;
  return MessageSquare;
}

export function SdrConversa({ lead, open, onOpenChange }: SdrConversaProps) {
  const [interacoes, setInteracoes] = useState<SdrInteracao[]>([]);
  const [loading, setLoading] = useState(true);

  // Geração de resposta.
  const [mensagem, setMensagem] = useState('');
  const [gerando, setGerando] = useState(false);

  // Interação manual.
  const [notaConteudo, setNotaConteudo] = useState('');
  const [notaPapel, setNotaPapel] = useState('usuario');
  const [registrando, setRegistrando] = useState(false);
  const [showNota, setShowNota] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);

  const leadId = lead?.id ?? null;

  const fetchInteracoes = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const data = await vendasSdrApi.listInteracoes(leadId);
      setInteracoes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SdrConversa] erro ao listar interações:', err);
      toast.error('Erro ao carregar a conversa');
      setInteracoes([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (open && leadId) {
      fetchInteracoes();
      setMensagem('');
      setNotaConteudo('');
      setShowNota(false);
    }
  }, [open, leadId, fetchInteracoes]);

  // Rola para o fim quando a timeline muda.
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interacoes]);

  const handleResponder = async () => {
    if (!leadId || !mensagem.trim()) {
      toast.error('Escreva a mensagem do lead para o agente responder');
      return;
    }
    setGerando(true);
    try {
      await vendasSdrApi.responder(leadId, mensagem.trim());
      setMensagem('');
      await fetchInteracoes();
      toast.success('Resposta gerada pelo agente');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar resposta');
    } finally {
      setGerando(false);
    }
  };

  const handleRegistrarNota = async () => {
    if (!leadId || !notaConteudo.trim()) {
      toast.error('Escreva o conteúdo da interação');
      return;
    }
    setRegistrando(true);
    try {
      await vendasSdrApi.addInteracao(leadId, {
        tipo: 'nota',
        conteudo: notaConteudo.trim(),
        papel: notaPapel,
      });
      setNotaConteudo('');
      setShowNota(false);
      await fetchInteracoes();
      toast.success('Interação registrada');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registrar interação');
    } finally {
      setRegistrando(false);
    }
  };

  const titulo = lead?.empresa_nome || lead?.nome || 'Lead';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversa — {titulo}
          </DialogTitle>
          <DialogDescription>
            Timeline de interações do lead. As respostas geradas pelo agente são
            apenas registradas — o envio pelo canal é decisão sua.
          </DialogDescription>
        </DialogHeader>

        {/* Timeline */}
        <ScrollArea className="flex-1 -mx-2 px-2 max-h-[40vh]">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : interacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">Nenhuma interação ainda</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Gere uma resposta do agente ou registre uma interação manual abaixo.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {interacoes.map((it) => {
                const ehAssistente = it.papel === 'assistente';
                const Icon = papelIcon(it.papel);
                return (
                  <div
                    key={it.id}
                    className={`flex gap-2 ${ehAssistente ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        ehAssistente ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div
                      className={`min-w-0 max-w-[80%] rounded-lg border px-3 py-2 ${
                        ehAssistente ? 'bg-muted/40' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">
                          {it.papel === 'assistente'
                            ? 'Agente'
                            : it.papel === 'usuario'
                              ? 'Lead'
                              : it.papel || 'Sistema'}
                        </span>
                        {it.tipo && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {TIPO_LABEL[it.tipo] ?? it.tipo}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {it.conteudo || '-'}
                      </p>
                      {it.created_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(it.created_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollEndRef} />
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Gerar resposta */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Mensagem do lead
            </label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Cole a mensagem que o lead enviou para o agente gerar uma resposta..."
              rows={2}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNota((v) => !v)}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Registrar interação manual
            </Button>
            <Button onClick={handleResponder} disabled={gerando || !mensagem.trim()}>
              {gerando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Gerar resposta
            </Button>
          </div>

          {/* Interação manual */}
          {showNota && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Nova interação manual</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[140px_1fr] sm:items-start">
                <Select value={notaPapel} onValueChange={setNotaPapel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Lead</SelectItem>
                    <SelectItem value="assistente">Agente</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={notaConteudo}
                  onChange={(e) => setNotaConteudo(e.target.value)}
                  placeholder="Conteúdo da interação..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegistrarNota}
                  disabled={registrando || !notaConteudo.trim()}
                >
                  {registrando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
