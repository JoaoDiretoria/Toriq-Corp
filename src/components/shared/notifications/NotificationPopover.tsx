import { useState } from 'react';
import { Bell, CheckCheck, Loader2, BellOff, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotificacoes, Notificacao } from '@/hooks/useNotificacoes';
import { NotificationItem } from './NotificationItem';

interface NotificationPopoverProps {
  onNotificacaoClick?: (notificacao: Notificacao) => void;
  compact?: boolean;
}

type FiltroTab = 'todas' | 'nao_lidas';

export function NotificationPopover({ onNotificacaoClick, compact = false }: NotificationPopoverProps) {
  const [filtro, setFiltro] = useState<FiltroTab>('todas');
  const [open, setOpen] = useState(false);
  
  const { 
    notificacoes, 
    naoLidas, 
    loading, 
    marcarComoLida, 
    marcarTodasComoLidas 
  } = useNotificacoes();

  const handleNotificacaoClick = (notificacao: Notificacao) => {
    if (onNotificacaoClick) {
      onNotificacaoClick(notificacao);
    }
    setOpen(false);
  };

  const notificacoesFiltradas = filtro === 'nao_lidas' 
    ? notificacoes.filter(n => !n.lida)
    : notificacoes;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative rounded-lg transition-all duration-200',
            compact ? 'h-8 w-8' : 'h-9 w-9',
            'hover:bg-accent hover:scale-105',
            open && 'bg-accent scale-105',
            naoLidas > 0 && 'text-primary'
          )}
        >
          <Bell className={cn(
            'transition-transform',
            compact ? 'h-4 w-4' : 'h-5 w-5',
            naoLidas > 0 && 'animate-[wiggle_1s_ease-in-out_infinite]'
          )} />
          
          {/* Badge de notificações */}
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className={cn(
                'relative inline-flex items-center justify-center rounded-full',
                'bg-destructive text-destructive-foreground',
                'text-[10px] font-bold shadow-lg',
                naoLidas > 9 ? 'h-5 w-5' : 'h-4 w-4'
              )}>
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[400px] sm:w-[500px] p-0 shadow-2xl border border-white/10 bg-white overflow-hidden" 
        align="end"
        sideOffset={12}
      >
        {/* Header escura */}
        <div className="px-6 py-4 bg-[#1c1c1c] border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white leading-tight">Notificações</h4>
                <p className="text-xs text-gray-400">
                  {naoLidas > 0 ? `${naoLidas} nova${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia!'}
                </p>
              </div>
            </div>

            {naoLidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={marcarTodasComoLidas}
                className="text-xs h-8 gap-1.5 text-primary hover:text-primary/80"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Tabs na header escura */}
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('todas')}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                filtro === 'todas'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              )}
            >
              Todas <span className="ml-1 text-xs">({notificacoes.length})</span>
            </button>
            <button
              onClick={() => setFiltro('nao_lidas')}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                filtro === 'nao_lidas'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              )}
            >
              Não lidas <span className="ml-1 text-xs">({naoLidas})</span>
            </button>
          </div>
        </div>

        {/* Lista de notificações */}
        <ScrollArea className="h-[380px] bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-gray-200" />
                <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          ) : notificacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  {filtro === 'nao_lidas' ? (
                    <Sparkles className="h-8 w-8 text-primary/50" />
                  ) : (
                    <BellOff className="h-8 w-8 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {filtro === 'nao_lidas' 
                  ? 'Tudo lido!' 
                  : 'Nenhuma notificação'}
              </p>
              <p className="text-xs text-gray-500 max-w-[200px]">
                {filtro === 'nao_lidas'
                  ? 'Você está em dia com todas as notificações'
                  : 'Você será notificado sobre atividades importantes do sistema'}
              </p>
            </div>
          ) : (
            <div>
              {notificacoesFiltradas.map((notificacao) => (
                <NotificationItem
                  key={notificacao.id}
                  notificacao={notificacao}
                  onClick={handleNotificacaoClick}
                  onMarcarLida={marcarComoLida}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notificacoes.length > 0 && (
          <div className="border-t border-white/10 p-3 bg-[#1c1c1c]">
            <p className="text-[10px] text-center text-gray-400">
              Mostrando as últimas {notificacoes.length} notificações
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
