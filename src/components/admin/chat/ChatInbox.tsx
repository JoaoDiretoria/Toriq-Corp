import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNowStrict, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Settings2,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  chatApi,
  type ConversaChat,
  type MensagemChat,
} from '@/integrations/api/chat';
import { toast } from 'sonner';

interface ChatInboxProps {
  conectado: boolean;
  onAbrirConfiguracoes: () => void;
}

const POLLING_CONVERSAS_MS = 15_000;
const POLLING_MENSAGENS_MS = 8_000;

function nomeContato(conversa: ConversaChat): string {
  return conversa.contato.nome?.trim() || conversa.contato.telefone || 'Contato do WhatsApp';
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'WA';
  const ultima = partes[partes.length - 1];
  return `${partes[0]?.[0] || ''}${partes.length > 1 ? ultima?.[0] || '' : ''}`.toUpperCase();
}

function tempoRelativo(valor: string | null): string {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return formatDistanceToNowStrict(data, { addSuffix: true, locale: ptBR });
}

function horaMensagem(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return format(data, 'HH:mm');
}

function rotuloData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const hoje = new Date();
  if (isSameDay(data, hoje)) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (isSameDay(data, ontem)) return 'Ontem';
  return format(data, "dd 'de' MMMM", { locale: ptBR });
}

function janelaAberta(conversa: ConversaChat | null): boolean {
  if (!conversa?.janelaAtendimentoAte) return false;
  return new Date(conversa.janelaAtendimentoAte).getTime() > Date.now();
}

function previewMensagem(conversa: ConversaChat): string {
  if (conversa.ultimaMensagemTexto) return conversa.ultimaMensagemTexto;
  const tipo = conversa.ultimaMensagemTipo;
  if (tipo === 'image') return 'Imagem';
  if (tipo === 'audio') return 'Áudio';
  if (tipo === 'video') return 'Vídeo';
  if (tipo === 'document') return 'Documento';
  return tipo ? `Mensagem ${tipo}` : 'Nova conversa';
}

function IconeMidia({ tipo }: { tipo: string }) {
  if (tipo === 'image') return <ImageIcon className="h-4 w-4" />;
  if (tipo === 'audio') return <Volume2 className="h-4 w-4" />;
  if (tipo === 'video') return <Video className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function StatusMensagem({ mensagem }: { mensagem: MensagemChat }) {
  if (mensagem.direcao !== 'saida') return null;
  if (mensagem.status === 'falhou') {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-label="Falha no envio" />;
  }
  if (mensagem.status === 'lida') {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Lida" />;
  }
  if (mensagem.status === 'entregue') {
    return <CheckCheck className="h-3.5 w-3.5" aria-label="Entregue" />;
  }
  if (mensagem.status === 'enviada') {
    return <Check className="h-3.5 w-3.5" aria-label="Enviada" />;
  }
  return <Clock3 className="h-3.5 w-3.5" aria-label="Processando" />;
}

function ListaVazia({ busca }: { busca: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="mt-4 text-sm font-medium">
        {busca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa por enquanto'}
      </p>
      <p className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
        {busca
          ? 'Tente buscar pelo nome ou por outro número de telefone.'
          : 'As mensagens recebidas pelo número conectado aparecerão aqui automaticamente.'}
      </p>
    </div>
  );
}

interface ThreadProps {
  conversaInicial: ConversaChat;
  onVoltar: () => void;
  onConversaAtualizada: (conversa: ConversaChat) => void;
}

function ChatThread({ conversaInicial, onVoltar, onConversaAtualizada }: ThreadProps) {
  const [conversa, setConversa] = useState(conversaInicial);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const mensagensRef = useRef<HTMLDivElement | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const primeiraCargaRef = useRef(true);

  const aberta = janelaAberta(conversa);
  const nome = nomeContato(conversa);

  const carregarRecentes = useCallback(
    async (signal?: AbortSignal, silencioso = false) => {
      if (!silencioso) setCarregando(true);
      try {
        const pagina = await chatApi.listarMensagens(conversaInicial.id, { limit: 50 }, signal);
        setConversa(pagina.conversa);
        onConversaAtualizada(pagina.conversa);
        setCursor((atual) => (silencioso && atual ? atual : pagina.proximoCursor));
        setMensagens((atuais) => {
          if (!silencioso) return pagina.data;
          const idsRecentes = new Set(pagina.data.map((mensagem) => mensagem.id));
          return [...pagina.data, ...atuais.filter((mensagem) => !idsRecentes.has(mensagem.id))].sort(
            (a, b) => new Date(b.timestampMeta).getTime() - new Date(a.timestampMeta).getTime(),
          );
        });
        setErro(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!silencioso) {
          setErro(error instanceof Error ? error.message : 'Não foi possível carregar as mensagens.');
        }
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [conversaInicial.id, onConversaAtualizada],
  );

  useEffect(() => {
    primeiraCargaRef.current = true;
    setMensagens([]);
    setCursor(null);
    setTexto('');
    const controller = new AbortController();
    carregarRecentes(controller.signal);
    return () => controller.abort();
  }, [carregarRecentes]);

  useEffect(() => {
    const id = window.setInterval(() => carregarRecentes(undefined, true), POLLING_MENSAGENS_MS);
    return () => window.clearInterval(id);
  }, [carregarRecentes]);

  useEffect(() => {
    if (!mensagens.length) return;
    if (primeiraCargaRef.current) {
      primeiraCargaRef.current = false;
      requestAnimationFrame(() => fimRef.current?.scrollIntoView({ block: 'end' }));
      return;
    }

    const viewport = mensagensRef.current;
    if (!viewport) return;
    const distanciaDoFim = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanciaDoFim < 160) {
      requestAnimationFrame(() => fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }
  }, [mensagens]);

  const carregarAntigas = async () => {
    if (!cursor || carregandoAntigas) return;
    setCarregandoAntigas(true);
    try {
      const pagina = await chatApi.listarMensagens(conversa.id, { cursor, limit: 50 });
      setMensagens((atuais) => [...atuais, ...pagina.data]);
      setCursor(pagina.proximoCursor);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
    } finally {
      setCarregandoAntigas(false);
    }
  };

  const enviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || enviando || !aberta) return;
    setEnviando(true);
    try {
      const mensagem = await chatApi.enviarTexto(conversa.id, conteudo);
      setMensagens((atuais) => [mensagem, ...atuais.filter((item) => item.id !== mensagem.id)]);
      setTexto('');
      const atualizada = {
        ...conversa,
        ultimaMensagemTexto: mensagem.texto,
        ultimaMensagemTipo: mensagem.tipo,
        ultimaMensagemEm: mensagem.timestampMeta,
      };
      setConversa(atualizada);
      onConversaAtualizada(atualizada);
      requestAnimationFrame(() => fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const cronologicas = useMemo(() => [...mensagens].reverse(), [mensagens]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-[73px] shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onVoltar}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para conversas</span>
          </Button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {iniciais(nome)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{nome}</p>
            <p className="truncate text-xs text-muted-foreground">{conversa.contato.telefone}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            aberta
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }
        >
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${aberta ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {aberta ? 'Janela aberta' : 'Fora das 24h'}
        </Badge>
      </header>

      <div ref={mensagensRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5">
        {carregando ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-20 w-3/5" />
            <Skeleton className="h-14 w-1/2" />
          </div>
        ) : erro ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="mt-3 text-sm font-medium">Falha ao carregar a conversa</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">{erro}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => carregarRecentes()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {cursor && (
              <Button
                variant="ghost"
                size="sm"
                className="mx-auto mb-2 text-xs text-muted-foreground"
                onClick={carregarAntigas}
                disabled={carregandoAntigas}
              >
                {carregandoAntigas ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowDown className="mr-2 h-3.5 w-3.5 rotate-180" />
                )}
                Carregar mensagens anteriores
              </Button>
            )}

            {cronologicas.map((mensagem, index) => {
              const anterior = cronologicas[index - 1];
              const exibirData =
                !anterior ||
                !isSameDay(new Date(anterior.timestampMeta), new Date(mensagem.timestampMeta));
              const saida = mensagem.direcao === 'saida';
              return (
                <div key={mensagem.id}>
                  {exibirData && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border/70" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {rotuloData(mensagem.timestampMeta)}
                      </span>
                      <span className="h-px flex-1 bg-border/70" />
                    </div>
                  )}
                  <div className={cn('flex', saida ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[82%] rounded-lg px-3 py-2 shadow-sm md:max-w-[72%]',
                        saida
                          ? 'bg-[#d9fdd3] text-slate-900 dark:bg-emerald-900/70 dark:text-emerald-50'
                          : 'border bg-card text-card-foreground',
                      )}
                    >
                      {mensagem.texto ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {mensagem.texto}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <IconeMidia tipo={mensagem.tipo} />
                          <span>{mensagem.mediaNomeArquivo || `Mensagem de ${mensagem.tipo}`}</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-[10px]',
                          saida ? 'text-slate-500 dark:text-emerald-200/80' : 'text-muted-foreground',
                        )}
                      >
                        <span>{horaMensagem(mensagem.timestampMeta)}</span>
                        <StatusMensagem mensagem={mensagem} />
                      </div>
                      {mensagem.status === 'falhou' && mensagem.erroMensagem && (
                        <p className="mt-1 text-[11px] text-destructive">{mensagem.erroMensagem}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!cronologicas.length && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa.
              </div>
            )}
            <div ref={fimRef} />
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t bg-background p-3">
        {!aberta && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A janela de 24 horas terminou. O envio por template será liberado na próxima etapa.
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(event) => setTexto(event.target.value.slice(0, 4096))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                enviar();
              }
            }}
            placeholder={aberta ? 'Digite uma mensagem…' : 'Janela de atendimento encerrada'}
            disabled={!aberta || enviando}
            className="min-h-10 max-h-32 resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={enviar}
            disabled={!aberta || enviando || !texto.trim()}
            className="shrink-0 bg-[#128C7E] text-white hover:bg-[#0f766e]"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Enviar mensagem</span>
          </Button>
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>Enter envia · Shift + Enter quebra a linha</span>
          <span>{texto.length}/4096</span>
        </div>
      </footer>
    </div>
  );
}

export function ChatInbox({ conectado, onAbrirConfiguracoes }: ChatInboxProps) {
  const [conversas, setConversas] = useState<ConversaChat[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [busca]);

  const carregar = useCallback(
    async (options: { cursor?: string; anexar?: boolean; silencioso?: boolean; signal?: AbortSignal } = {}) => {
      if (!conectado) return;
      if (options.anexar) setCarregandoMais(true);
      else if (!options.silencioso) setCarregando(true);

      try {
        const pagina = await chatApi.listarConversas(
          { busca: buscaAplicada || undefined, cursor: options.cursor, limit: 30 },
          options.signal,
        );
        setConversas((atuais) => {
          if (options.anexar) return [...atuais, ...pagina.data];
          return pagina.data;
        });
        setCursor(pagina.proximoCursor);
        setErro(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!options.silencioso) {
          setErro(error instanceof Error ? error.message : 'Não foi possível carregar as conversas.');
        }
      } finally {
        if (options.anexar) setCarregandoMais(false);
        else if (!options.silencioso) setCarregando(false);
      }
    },
    [buscaAplicada, conectado],
  );

  useEffect(() => {
    if (!conectado) return;
    const controller = new AbortController();
    setSelecionadaId(null);
    carregar({ signal: controller.signal });
    return () => controller.abort();
  }, [buscaAplicada, carregar, conectado]);

  useEffect(() => {
    if (!conectado) return;
    const id = window.setInterval(() => carregar({ silencioso: true }), POLLING_CONVERSAS_MS);
    return () => window.clearInterval(id);
  }, [carregar, conectado]);

  const selecionar = (conversa: ConversaChat) => {
    setSelecionadaId(conversa.id);
    if (conversa.naoLidas > 0) {
      setConversas((atuais) =>
        atuais.map((item) => (item.id === conversa.id ? { ...item, naoLidas: 0 } : item)),
      );
      chatApi.marcarLida(conversa.id).catch(() => {
        // O polling restaura o contador caso o backend não consiga marcar.
      });
    }
  };

  const atualizarConversa = useCallback((conversa: ConversaChat) => {
    setConversas((atuais) => {
      const existe = atuais.some((item) => item.id === conversa.id);
      const lista = existe
        ? atuais.map((item) => (item.id === conversa.id ? { ...item, ...conversa } : item))
        : [conversa, ...atuais];
      return [...lista].sort(
        (a, b) =>
          new Date(b.ultimaMensagemEm || 0).getTime() - new Date(a.ultimaMensagemEm || 0).getTime(),
      );
    });
  }, []);

  const selecionada = conversas.find((conversa) => conversa.id === selecionadaId) || null;

  if (!conectado) {
    return (
      <Card className="flex min-h-[520px] flex-col items-center justify-center border-dashed p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
          <MessageCircle className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-lg font-semibold">Conecte o WhatsApp para abrir o inbox</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Depois da conexão pela Meta, novas mensagens serão organizadas aqui com contato,
          contador de não lidas e janela de atendimento.
        </p>
        <Button className="mt-5" onClick={onAbrirConfiguracoes}>
          <Settings2 className="mr-2 h-4 w-4" /> Ir para configurações
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid h-[calc(100vh-14.5rem)] min-h-[560px] grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={cn(
            'min-h-0 flex-col border-r bg-card',
            selecionadaId ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Conversas</h2>
                <p className="text-xs text-muted-foreground">
                  {conversas.length} {conversas.length === 1 ? 'atendimento' : 'atendimentos'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => carregar()} disabled={carregando}>
                <RefreshCw className={cn('h-4 w-4', carregando && 'animate-spin')} />
                <span className="sr-only">Atualizar conversas</span>
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar nome ou telefone"
                className="pl-9"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {carregando ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex gap-3 p-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : erro ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
                <p className="mt-3 text-sm font-medium">Falha ao carregar o inbox</p>
                <p className="mt-1 text-xs text-muted-foreground">{erro}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => carregar()}>
                  Tentar novamente
                </Button>
              </div>
            ) : !conversas.length ? (
              <ListaVazia busca={buscaAplicada} />
            ) : (
              <>
                <div className="divide-y">
                  {conversas.map((conversa) => {
                    const nome = nomeContato(conversa);
                    const ativa = conversa.id === selecionadaId;
                    return (
                      <button
                        key={conversa.id}
                        type="button"
                        onClick={() => selecionar(conversa)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                          ativa && 'bg-primary/5 hover:bg-primary/5',
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {iniciais(nome)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className={cn('truncate text-sm', conversa.naoLidas > 0 && 'font-semibold')}>
                              {nome}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {tempoRelativo(conversa.ultimaMensagemEm)}
                            </span>
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'truncate text-xs text-muted-foreground',
                                conversa.naoLidas > 0 && 'font-medium text-foreground',
                              )}
                            >
                              {previewMensagem(conversa)}
                            </span>
                            {conversa.naoLidas > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold text-white">
                                {conversa.naoLidas > 99 ? '99+' : conversa.naoLidas}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {cursor && (
                  <div className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => carregar({ cursor, anexar: true })}
                      disabled={carregandoMais}
                    >
                      {carregandoMais && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Carregar mais conversas
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <section className={cn('min-h-0', selecionadaId ? 'block' : 'hidden md:block')}>
          {selecionada ? (
            <ChatThread
              key={selecionada.id}
              conversaInicial={selecionada}
              onVoltar={() => setSelecionadaId(null)}
              onConversaAtualizada={atualizarConversa}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-muted/10 px-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-7 w-7 text-muted-foreground" />
              </span>
              <p className="mt-4 text-sm font-medium">Selecione uma conversa</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Abra um atendimento para consultar o histórico e responder durante a janela de 24
                horas da Meta.
              </p>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

export default ChatInbox;
