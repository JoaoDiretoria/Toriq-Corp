import { useEffect, useState } from 'react';
import { useSystemUpdates, ChangelogItem } from '@/hooks/useSystemUpdates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Bug, Zap, AlertTriangle, Rocket } from 'lucide-react';

const getChangeIcon = (type: ChangelogItem['type']) => {
  switch (type) {
    case 'feature':
      return <Sparkles className="h-4 w-4 text-green-500" />;
    case 'fix':
      return <Bug className="h-4 w-4 text-red-500" />;
    case 'improvement':
      return <Zap className="h-4 w-4 text-blue-500" />;
    case 'breaking':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Sparkles className="h-4 w-4 text-gray-500" />;
  }
};

const getChangeBadge = (type: ChangelogItem['type']) => {
  switch (type) {
    case 'feature':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Nova Funcionalidade</Badge>;
    case 'fix':
      return <Badge variant="default" className="bg-red-500 hover:bg-red-600">Correção</Badge>;
    case 'improvement':
      return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Melhoria</Badge>;
    case 'breaking':
      return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black">Mudança Importante</Badge>;
    default:
      return <Badge variant="secondary">Atualização</Badge>;
  }
};

export function UpdateNotificationPopup() {
  const { pendingUpdate, totalPending, currentNumber, loading, markAsViewed } = useSystemUpdates();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pendingUpdate && !loading) {
      setOpen(true);
    } else if (!pendingUpdate && !loading) {
      setOpen(false);
    }
  }, [pendingUpdate, loading]);

  const handleConfirm = async () => {
    console.log('[UpdateNotificationPopup] handleConfirm chamado, pendingUpdate:', pendingUpdate?.id);
    if (pendingUpdate) {
      setOpen(false); // Fechar imediatamente para feedback visual
      await markAsViewed(pendingUpdate.id);
    }
  };

  if (!pendingUpdate || loading) {
    return null;
  }

  const changelog: ChangelogItem[] = Array.isArray(pendingUpdate.changelog) 
    ? pendingUpdate.changelog 
    : [];

  const releaseDate = new Date(pendingUpdate.release_date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleConfirm();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">
              Nova Atualização Disponível!
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              v{pendingUpdate.version}
            </Badge>
            <span>•</span>
            <span>{releaseDate}</span>
          </div>
        </DialogHeader>

        <div className="py-4">
          <h3 className="font-semibold text-lg mb-2">{pendingUpdate.title}</h3>
          {pendingUpdate.description && (
            <p className="text-muted-foreground text-sm mb-4">
              {pendingUpdate.description}
            </p>
          )}

          {changelog.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                O que mudou:
              </h4>
              <ScrollArea className="h-[200px] pr-4">
                <ul className="space-y-3">
                  {changelog.map((change, index) => (
                    <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="mt-0.5">
                        {getChangeIcon(change.type)}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1">
                          {getChangeBadge(change.type)}
                        </div>
                        <p className="text-sm">{change.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {totalPending > 1 && (
            <span className="text-sm text-muted-foreground mr-auto">
              Atualização {currentNumber} de {totalPending}
            </span>
          )}
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            {totalPending > 1 ? 'Próxima atualização' : 'Entendi, continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}