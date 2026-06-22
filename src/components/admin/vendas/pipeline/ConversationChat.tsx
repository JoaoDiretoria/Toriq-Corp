import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasPipelineApi,
  mediaUrl,
  type LeadCard,
  type ConversaMensagem,
  type EventoPipeline,
  type TemplateAprovado,
  type Operador,
} from '@/integrations/api/vendasPipeline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  AlertCircle,
  MessagesSquare,
  FileText,
  Download,
  UserRound,
} from 'lucide-react';
import {
  temperaturaEmoji,
  tempoRelativo,
  nomeExibicao,
  iniciais,
} from './ConversationList';
import { CANAIS_WHATSAPP } from '../canais';

// ---------------------------------------------------------------------------
// Bolha de mensagem
// ---------------------------------------------------------------------------

const SENDER_LABEL: Record<string, string> = {
  lead: 'Lead',
  agente: 'Você',
  sdr: 'SDR',
  sistema: 'Sistema',
};

function horaCurta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Renderiza a mídia de uma mensagem (imagem/áudio/vídeo/documento). */
function MediaContent({ media }: { media: Record<string, unknown> }) {
  const tipo = typeof media.tipo === 'string' ? media.tipo : undefined;
  const id = typeof media.id === 'string' ? media.id : undefined;
  if (!id) return null;
  const url = mediaUrl(id);
  const filename =
    typeof media.filename === 'string' && media.filename
      ? media.filename
      : 'arquivo';

  if (tipo === 'image' || tipo === 'sticker') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={filename}
          loading="lazy"
          className="mb-1 max-h-64 w-auto rounded-lg object-cover"
        />
      </a>
    );
  }
  if (tipo === 'video') {
    return (
      <video src={url} controls className="mb-1 max-h-64 w-full rounded-lg" />
    );
  }
  if (tipo === 'audio') {
    return <audio src={url} controls className="mb-1 w-full" />;
  }
  // document / outros: link para baixar.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded-lg bg-background/40 px-2.5 py-2 text-xs hover:underline"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{filename}</span>
      <Download className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  );
}

function MessageBubble({ msg }: { msg: ConversaMensagem }) {
  const isInbound = msg.sender_type === 'lead';
  const isSistema = msg.sender_type === 'sistema';
  const erro = msg.status === 'erro';

  if (isSistema) {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
          {msg.conteudo}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          isInbound
            ? 'rounded-bl-sm bg-muted text-foreground'
            : erro
              ? 'rounded-br-sm bg-destructive/10 text-foreground ring-1 ring-destructive/40'
              : 'rounded-br-sm bg-primary text-primary-foreground'
        }`}
      >
        {msg.media && <MediaContent media={msg.media} />}
        {msg.conteudo && (
          <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
        )}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            isInbound || erro ? 'text-muted-foreground' : 'text-primary-foreground/70'
          }`}
        >
          <span>{SENDER_LABEL[msg.sender_type] ?? msg.sender_type}</span>
          <span>·</span>
          <span>{horaCurta(msg.created_at)}</span>
          {erro && (
            <span className="ml-1 flex items-center gap-0.5 text-destructive">
              <AlertCircle className="h-3 w-3" />
              falhou
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat (coluna direita da inbox)
// ---------------------------------------------------------------------------

interface ConversationChatProps {
  leadId: string | null;
  /** Bump global de eventos SSE/polling — força refetch da thread. */
  refreshKey?: number;
  /** Último evento recebido por SSE (para refetch direcionado). */
  ultimoEvento?: EventoPipeline | null;
  /** Notifica o pai que a thread foi marcada como lida (zera o badge). */
  onLido?: (leadId: string) => void;
  /** Notifica o pai que uma mensagem foi enviada (atualiza preview na lista). */
  onEnviado?: (leadId: string) => void;
}

export function ConversationChat({
  leadId,
  refreshKey = 0,
  ultimoEvento,
  onLido,
  onEnviado,
}: ConversationChatProps) {
  const [lead, setLead] = useState<LeadCard | null>(null);
  const [mensagens, setMensagens] = useState<ConversaMensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState('');
  const [janelaAberta, setJanelaAberta] = useState(true);
  const [templates, setTemplates] = useState<TemplateAprovado[]>([]);
  const [templateSel, setTemplateSel] = useState<string>('');
  const [canalManual, setCanalManual] = useState<string>('whatsapp');
  const [operadores, setOperadores] = useState<Operador[]>([]);

  const SEM_RESP = '__none__';

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const fetchThread = useCallback(
    async (markRead: boolean) => {
      if (!leadId) return;
      setLoading(true);
      try {
        const res = await vendasPipelineApi.getThread(leadId);
        setLead(res.lead);
        setMensagens(Array.isArray(res.mensagens) ? res.mensagens : []);
        setJanelaAberta(res.janela_aberta !== false);
        scrollToBottom();
        if (markRead) {
          try {
            await vendasPipelineApi.marcarLido(leadId);
            onLido?.(leadId);
          } catch {
            /* não-crítico */
          }
        }
      } catch (err: any) {
        console.error('[ConversationChat] erro ao carregar thread:', err);
        toast.error(err?.message || 'Erro ao carregar a conversa');
      } finally {
        setLoading(false);
      }
    },
    [leadId, scrollToBottom, onLido],
  );

  // -- Ao abrir/trocar de lead: carrega thread e marca como lido
  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setMensagens([]);
      return;
    }
    fetchThread(true);
    setTexto('');
    setTemplateSel('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // -- Templates aprovados (HSM): carregados uma vez, usados quando a janela fecha
  useEffect(() => {
    vendasPipelineApi
      .listTemplatesAprovados()
      .then(setTemplates)
      .catch(() => setTemplates([]));
    vendasPipelineApi
      .listOperadores()
      .then(setOperadores)
      .catch(() => setOperadores([]));
  }, []);

  const handleAtribuir = async (value: string) => {
    if (!leadId) return;
    const assignedTo = value === SEM_RESP ? null : value;
    try {
      const atualizado = await vendasPipelineApi.patchLead(leadId, {
        assigned_to: assignedTo,
      });
      setLead(atualizado);
      onEnviado?.(leadId); // recarrega a lista (badge de responsável)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atribuir responsável');
    }
  };

  // -- Eventos SSE / polling: se o evento é deste lead, refaz a thread (e relê)
  useEffect(() => {
    if (!leadId || refreshKey === 0) return;
    const evLead = ultimoEvento?.lead_id;
    // Sem lead_id no evento (ou polling) -> atualiza a thread aberta também.
    if (!evLead || evLead === leadId) {
      fetchThread(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleEnviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || !leadId || enviando) return;
    setEnviando(true);
    try {
      const msg = await vendasPipelineApi.enviarMensagem(leadId, conteudo, canalManual);
      setMensagens((prev) => [...prev, msg]);
      setTexto('');
      scrollToBottom();
      if (msg.status === 'erro') {
        toast.error('A mensagem foi registrada, mas o envio pelo WhatsApp falhou.');
      }
      onEnviado?.(leadId);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar a mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarTemplate = async () => {
    if (!templateSel || !leadId || enviando) return;
    setEnviando(true);
    try {
      const msg = await vendasPipelineApi.enviarTemplate(leadId, templateSel);
      setMensagens((prev) => [...prev, msg]);
      setTemplateSel('');
      scrollToBottom();
      if (msg.status === 'erro') {
        toast.error('O template foi registrado, mas o envio pelo WhatsApp falhou.');
      } else {
        toast.success('Template enviado.');
      }
      onEnviado?.(leadId);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar o template');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // -- Estado vazio (nenhum lead selecionado)
  if (!leadId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-muted p-5 mb-4">
          <MessagesSquare className="h-9 w-9 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Selecione uma conversa</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Escolha um lead na lista para ver o histórico e responder.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header do chat */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
          {lead ? iniciais(lead) : '…'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {lead ? nomeExibicao(lead) : 'Carregando…'}
            </p>
            {lead?.temperatura && (
              <span className="text-sm">{temperaturaEmoji(lead.temperatura)}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lead?.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.telefone}
              </span>
            )}
            {lead?.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lead?.pending_reply && (
            <Badge variant="outline" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              Aguardando
            </Badge>
          )}
          <Select
            value={lead?.assigned_to ?? SEM_RESP}
            onValueChange={handleAtribuir}
            disabled={!lead}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <UserRound className="mr-1 h-3.5 w-3.5 shrink-0 opacity-70" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_RESP}>Sem responsável</SelectItem>
              {operadores.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {loading && mensagens.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="ml-auto h-12 w-1/2" />
              <Skeleton className="h-12 w-3/5" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem ainda. Envie a primeira resposta.
              </p>
            </div>
          ) : (
            mensagens.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        {janelaAberta ? (
          <div className="space-y-2">
            <Select value={canalManual} onValueChange={setCanalManual}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANAIS_WHATSAPP.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-end gap-2">
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
                rows={1}
                className="max-h-32 min-h-[40px] resize-none"
                disabled={enviando}
              />
              <Button
                onClick={handleEnviar}
                disabled={enviando || !texto.trim()}
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Janela de 24h fechada — só é possível reabrir com um template aprovado.
            </div>
            {templates.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                Nenhum template aprovado. Crie e aprove um template de WhatsApp em
                Disparo em Massa para reengajar este lead.
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <Select value={templateSel} onValueChange={setTemplateSel}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolha um template aprovado…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleEnviarTemplate}
                  disabled={enviando || !templateSel}
                  className="shrink-0 gap-1.5"
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar template
                </Button>
              </div>
            )}
          </div>
        )}
        {lead?.last_message_at && (
          <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
            Última atividade {tempoRelativo(lead.last_message_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ConversationChat;
