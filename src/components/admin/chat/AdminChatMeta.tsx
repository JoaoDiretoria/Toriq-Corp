import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, MessagesSquare, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { chatApi, type ContaWhatsapp } from '@/integrations/api/chat';
import { ChatInbox } from './ChatInbox';
import { ConectarWhatsapp } from './ConectarWhatsapp';

type VisaoChat = 'conversas' | 'configuracoes';

const VISOES: Array<{
  value: VisaoChat;
  label: string;
  icon: typeof MessagesSquare;
}> = [
  { value: 'conversas', label: 'Conversas', icon: MessagesSquare },
  { value: 'configuracoes', label: 'Configurações', icon: Settings2 },
];

export function AdminChatMeta() {
  const [visao, setVisao] = useState<VisaoChat>('conversas');
  const [conta, setConta] = useState<ContaWhatsapp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const primeiraDecisaoRef = useRef(false);

  const conectado = Boolean(conta?.ativo && conta.status === 'conectada');

  const carregarConta = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true);
    try {
      const resultado = await chatApi.buscarConta(signal);
      setConta(resultado);
      setErro(null);
      if (!primeiraDecisaoRef.current) {
        primeiraDecisaoRef.current = true;
        if (!resultado?.ativo || resultado.status !== 'conectada') {
          setVisao('configuracoes');
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setErro(error instanceof Error ? error.message : 'Não foi possível consultar o Chat Meta.');
      if (!primeiraDecisaoRef.current) {
        primeiraDecisaoRef.current = true;
        setVisao('configuracoes');
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    carregarConta(controller.signal);
    return () => controller.abort();
  }, [carregarConta]);

  const aoAlterarConta = useCallback((novaConta: ContaWhatsapp | null) => {
    setConta(novaConta);
    setErro(null);
    if (novaConta?.ativo && novaConta.status === 'conectada') {
      setVisao('conversas');
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Chat WhatsApp</h1>
              {!carregando && (
                <Badge
                  variant="outline"
                  className={
                    conectado
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {conectado ? 'Canal ativo' : 'Canal inativo'}
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Atendimento oficial pela WhatsApp Cloud API da Meta, isolado dos disparos e das
              integrações legadas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {conectado && conta && (
            <div className="mr-1 hidden text-right lg:block">
              <p className="text-xs font-medium">{conta.displayName}</p>
              <p className="text-[11px] text-muted-foreground">{conta.displayPhoneNumber}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => carregarConta()}
            disabled={carregando}
            aria-label="Atualizar status da conexão"
          >
            <RefreshCw className={cn('h-4 w-4', carregando && 'animate-spin')} />
          </Button>
          <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {VISOES.map((item) => {
              const Icon = item.icon;
              const ativa = visao === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setVisao(item.value)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    ativa
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={ativa}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visao === 'conversas' ? (
        <ChatInbox conectado={conectado} onAbrirConfiguracoes={() => setVisao('configuracoes')} />
      ) : (
        <ConectarWhatsapp
          conta={conta}
          carregando={carregando}
          erro={erro}
          onContaChange={aoAlterarConta}
          onRecarregar={() => carregarConta()}
        />
      )}

      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        O token da Meta não é armazenado nem exibido pelo navegador.
      </div>
    </div>
  );
}

export default AdminChatMeta;
