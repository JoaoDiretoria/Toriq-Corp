import { useState, useEffect, useCallback, useRef } from 'react';
import { prospeccaoApi } from '@/integrations/api/vendasProspeccao';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrapingForm } from './ScrapingForm';
import { JobsTracker, type JobsTrackerHandle } from './JobsTracker';
import { ConfigDialog } from './ConfigDialog';
import {
  Radar,
  Settings2,
  Search,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';

export function Prospeccao() {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [tokenSet, setTokenSet] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [scrapingOpen, setScrapingOpen] = useState(false);

  const trackerRef = useRef<JobsTrackerHandle>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const cfg = await prospeccaoApi.getConfig();
      setTokenSet(!!cfg.apify_token_set);
    } catch (error) {
      console.error('[Prospeccao] erro ao carregar config:', error);
      setTokenSet(false);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleNovaCaptacao = () => {
    if (!tokenSet) {
      setConfigOpen(true);
      return;
    }
    setScrapingOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="h-6 w-6" />
            Prospecção
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture leads automaticamente do Google Maps, Facebook, Instagram e LinkedIn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConfigOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={handleNovaCaptacao} disabled={loadingConfig}>
            <Search className="h-4 w-4 mr-2" />
            Nova Captação
          </Button>
        </div>
      </div>

      {/* Aviso de token não configurado */}
      {loadingConfig ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : (
        !tokenSet && (
          <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Token do Apify não configurado
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Configure seu token do Apify antes de iniciar uma captação de leads.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={() => setConfigOpen(true)}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Configurar agora
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Lista de jobs */}
      <JobsTracker ref={trackerRef} />

      {/* Dialogs */}
      <ConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={fetchConfig}
      />
      <ScrapingForm
        open={scrapingOpen}
        onOpenChange={setScrapingOpen}
        onJobStarted={() => trackerRef.current?.refresh()}
      />
    </div>
  );
}
