import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Signal,
  Unplug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { chatApi, type ContaWhatsapp } from '@/integrations/api/chat';

interface RespostaFbLogin {
  authResponse?: { code?: string } | null;
  status?: string;
}

interface DadosSignup {
  wabaId: string;
  phoneNumberId: string;
}

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (resposta: RespostaFbLogin) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface ConectarWhatsappProps {
  conta: ContaWhatsapp | null;
  carregando: boolean;
  erro: string | null;
  onContaChange: (conta: ContaWhatsapp | null) => void;
  onRecarregar: () => void;
}

type EstadoSdk = 'ausente' | 'carregando' | 'pronto' | 'erro';

const APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string | undefined;
const API_VERSION = (import.meta.env.VITE_META_API_VERSION as string | undefined) || 'v25.0';
const SDK_URL = 'https://connect.facebook.net/pt_BR/sdk.js';
const ORIGEM_META = 'https://www.facebook.com';
const LIMITE_FLUXO_MS = 2 * 60 * 1000;

function qualidadeLabel(valor: string | null): string {
  const normalizado = valor?.toUpperCase();
  if (normalizado === 'GREEN') return 'Alta';
  if (normalizado === 'YELLOW') return 'Média';
  if (normalizado === 'RED') return 'Baixa';
  return valor || 'Não informada';
}

function formatarData(valor: string | null): string {
  if (!valor) return 'Permanente';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(data);
}

export function ConectarWhatsapp({
  conta,
  carregando,
  erro,
  onContaChange,
  onRecarregar,
}: ConectarWhatsappProps) {
  const [estadoSdk, setEstadoSdk] = useState<EstadoSdk>(APP_ID ? 'carregando' : 'ausente');
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [dadosSignup, setDadosSignup] = useState<DadosSignup | null>(null);
  const enviandoRef = useRef(false);

  const contaAtiva = Boolean(conta?.ativo && conta.status === 'conectada');
  const configuracaoCompleta = Boolean(APP_ID && CONFIG_ID);

  useEffect(() => {
    if (!APP_ID) return;

    const iniciar = () => {
      if (!window.FB) {
        setEstadoSdk('erro');
        return;
      }
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: false, version: API_VERSION });
      setEstadoSdk('pronto');
    };

    if (window.FB) {
      iniciar();
      return;
    }

    const anterior = window.fbAsyncInit;
    const aoInicializarSdk = () => {
      anterior?.();
      iniciar();
    };
    window.fbAsyncInit = aoInicializarSdk;

    let script = document.getElementById('meta-jssdk') as HTMLScriptElement | null;
    const aoFalhar = () => setEstadoSdk('erro');
    if (!script) {
      script = document.createElement('script');
      script.id = 'meta-jssdk';
      script.src = SDK_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = aoFalhar;
      document.body.appendChild(script);
    } else {
      script.addEventListener('error', aoFalhar);
    }

    return () => {
      script?.removeEventListener('error', aoFalhar);
      if (window.fbAsyncInit === aoInicializarSdk) {
        window.fbAsyncInit = anterior;
      }
    };
  }, []);

  const encerrarFluxo = useCallback(() => {
    enviandoRef.current = false;
    setConectando(false);
    setCodigo(null);
    setDadosSignup(null);
  }, []);

  useEffect(() => {
    const aoReceber = (evento: MessageEvent) => {
      if (evento.origin !== ORIGEM_META) return;

      try {
        const payload =
          typeof evento.data === 'string'
            ? (JSON.parse(evento.data) as Record<string, unknown>)
            : (evento.data as Record<string, unknown>);
        if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
          encerrarFluxo();
          if (payload.event === 'ERROR') {
            toast.error('A Meta não conseguiu concluir a conexão. Tente novamente.');
          }
          return;
        }

        if (payload.event !== 'FINISH') return;
        const data = payload.data as Record<string, unknown> | undefined;
        const wabaId = typeof data?.waba_id === 'string' ? data.waba_id : '';
        const phoneNumberId =
          typeof data?.phone_number_id === 'string' ? data.phone_number_id : '';

        if (!wabaId || !phoneNumberId) {
          encerrarFluxo();
          toast.error('A Meta não informou a conta e o número selecionados. Tente novamente.');
          return;
        }
        setDadosSignup({ wabaId, phoneNumberId });
      } catch {
        // Outros widgets da Meta também usam postMessage; mensagens alheias são ignoradas.
      }
    };

    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [encerrarFluxo]);

  useEffect(() => {
    if (!conectando) return;
    const timeout = window.setTimeout(() => {
      encerrarFluxo();
      toast.error('O tempo da conexão expirou. Abra o fluxo da Meta novamente.');
    }, LIMITE_FLUXO_MS);
    return () => window.clearTimeout(timeout);
  }, [conectando, encerrarFluxo]);

  // O `code` e os ids chegam por callbacks diferentes. O efeito elimina a
  // condição de corrida: só chama o backend quando as duas metades existem.
  useEffect(() => {
    if (!conectando || !codigo || !dadosSignup || enviandoRef.current) return;
    enviandoRef.current = true;

    chatApi
      .conectar({
        codigo,
        wabaId: dadosSignup.wabaId,
        phoneNumberId: dadosSignup.phoneNumberId,
      })
      .then((novaConta) => {
        onContaChange(novaConta);
        toast.success(`WhatsApp conectado: ${novaConta.displayPhoneNumber}`);
      })
      .catch((error: Error) => toast.error(error.message || 'Não foi possível conectar o WhatsApp.'))
      .finally(encerrarFluxo);
  }, [codigo, conectando, dadosSignup, encerrarFluxo, onContaChange]);

  const conectar = useCallback(() => {
    if (!configuracaoCompleta || estadoSdk !== 'pronto' || !window.FB) {
      toast.error('O Embedded Signup da Meta ainda não está configurado ou disponível.');
      return;
    }

    setCodigo(null);
    setDadosSignup(null);
    setConectando(true);

    try {
      window.FB.login(
        (resposta) => {
          const novoCodigo = resposta.authResponse?.code;
          if (!novoCodigo) {
            encerrarFluxo();
            if (resposta.status !== 'unknown') {
              toast.error('A autorização da Meta foi cancelada ou não foi concluída.');
            }
            return;
          }
          setCodigo(novoCodigo);
        },
        {
          config_id: CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
        },
      );
    } catch {
      encerrarFluxo();
      toast.error('Não foi possível abrir a janela da Meta. Libere pop-ups e tente novamente.');
    }
  }, [configuracaoCompleta, encerrarFluxo, estadoSdk]);

  const desconectar = useCallback(async () => {
    setDesconectando(true);
    try {
      await chatApi.desconectar();
      onContaChange(
        conta ? { ...conta, ativo: false, status: 'revogada', updatedAt: new Date().toISOString() } : null,
      );
      toast.success('WhatsApp desconectado. O histórico foi preservado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desconectar o WhatsApp.');
    } finally {
      setDesconectando(false);
    }
  }, [conta, onContaChange]);

  if (carregando) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-10 w-44" />
          </CardContent>
        </Card>
        <Skeleton className="min-h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
      <Card className="overflow-hidden">
        <div className="h-1 bg-[#25D366]" />
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
                  <Phone className="h-4 w-4" />
                </span>
                WhatsApp Business
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Conexão oficial pela Cloud API da Meta. A autorização acontece no ambiente da
                Meta e o token é cifrado pelo backend antes de ser armazenado.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                contaAtiva
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-muted-foreground/20 bg-muted text-muted-foreground'
              }
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  contaAtiva ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                }`}
              />
              {contaAtiva ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {erro && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex min-w-0 gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Não foi possível consultar a conexão</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{erro}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onRecarregar}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {contaAtiva && conta ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Conta
                  </div>
                  <p className="mt-2 truncate font-semibold">{conta.displayName || 'WhatsApp Business'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{conta.displayPhoneNumber}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Signal className="h-3.5 w-3.5" /> Qualidade
                  </div>
                  <p className="mt-2 font-semibold">{qualidadeLabel(conta.qualityRating)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Status informado pela Meta</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4 sm:col-span-2 xl:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Credencial
                  </div>
                  <p className="mt-2 font-semibold">Protegida no servidor</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatarData(conta.tokenExpiresAt)}</p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-muted-foreground">
                  WABA {conta.wabaId} · Phone ID {conta.phoneNumberId}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <Unplug className="mr-2 h-4 w-4" />
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar o WhatsApp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Novas mensagens deixarão de entrar no inbox. Contatos, conversas e
                        histórico já recebidos serão preservados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={desconectar}
                        disabled={desconectando}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {desconectando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Desconectar número
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-dashed bg-muted/10 p-5">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E] dark:text-[#25D366]" />
                  <div>
                    <p className="font-medium">Conecte o número oficial da Toriq</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      O Embedded Signup permite escolher a conta e o número dentro da Meta. As
                      mensagens recebidas aparecerão no inbox assim que o webhook estiver ativo.
                    </p>
                  </div>
                </div>
              </div>

              {!configuracaoCompleta && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">Embedded Signup ainda não configurado</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Defina VITE_META_APP_ID e VITE_META_CONFIG_ID no build do frontend.
                    </p>
                  </div>
                </div>
              )}

              {estadoSdk === 'erro' && configuracaoCompleta && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium">SDK da Meta indisponível</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Confira a conexão, bloqueadores de conteúdo e permissões do domínio no app.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={conectar}
                disabled={!configuracaoCompleta || estadoSdk !== 'pronto' || conectando}
                className="bg-[#128C7E] text-white hover:bg-[#0f766e]"
              >
                {conectando || estadoSdk === 'carregando' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                {conectando ? 'Concluindo conexão…' : 'Conectar com a Meta'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como a ativação funciona</CardTitle>
          <CardDescription>Uma conexão segura, sem copiar tokens manualmente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            {[
              ['1', 'Autorize na Meta', 'Entre na conta empresarial e escolha a WABA.'],
              ['2', 'Selecione o número', 'Confirme o telefone que atenderá pelo Toriq.'],
              ['3', 'Valide o inbox', 'Envie uma mensagem real e responda dentro de 24 horas.'],
            ].map(([numero, titulo, descricao], index) => (
              <li key={numero} className="relative flex gap-3">
                {index < 2 && <span className="absolute left-3 top-7 h-8 w-px bg-border" />}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {numero}
                </span>
                <div>
                  <p className="text-sm font-medium">{titulo}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{descricao}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-lg bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            Mensagem livre só pode ser enviada durante a janela de atendimento de 24 horas. Fora
            dela, a próxima etapa do módulo usará templates aprovados pela Meta.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConectarWhatsapp;
