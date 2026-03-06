import { useState } from 'react';
import { useImportQueue } from '@/hooks/useImportQueue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImportProgressPopup() {
  const { activeJobs, isMinimized, setIsMinimized, cancelImport } = useImportQueue();
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Se não há jobs ativos, não mostrar nada
  if (activeJobs.length === 0) return null;

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      case 'processing': return 'Processando';
      default: return 'Pendente';
    }
  };

  // Versão minimizada - apenas um botão flutuante
  if (isMinimized) {
    const processingJob = activeJobs.find(j => j.status === 'processing');
    const progress = processingJob 
      ? Math.round((processingJob.processedRows / processingJob.totalRows) * 100)
      : 0;

    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 px-4 shadow-lg bg-primary hover:bg-primary/90 gap-3"
        >
          {processingJob ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex flex-col items-start">
                <span className="text-xs opacity-80">Importando...</span>
                <span className="text-sm font-semibold">{progress}%</span>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>{activeJobs.length} importação(ões)</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  // Versão expandida
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <span className="font-semibold text-sm">Importações em Andamento</span>
          <Badge variant="secondary" className="text-xs">
            {activeJobs.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de Jobs */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {activeJobs.map((job) => {
          const progress = job.totalRows > 0 
            ? Math.round((job.processedRows / job.totalRows) * 100) 
            : 0;
          const isExpanded = expandedJobs.has(job.id);

          return (
            <div
              key={job.id}
              className="border rounded-lg overflow-hidden bg-card"
            >
              {/* Job Header */}
              <div 
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleJobExpanded(job.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {job.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : job.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : job.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className={cn("h-2 w-2 rounded-full", getStatusColor(job.status))} />
                    )}
                    <span className="font-medium text-sm capitalize">{job.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={job.status === 'completed' ? 'default' : 'secondary'}
                      className={cn(
                        "text-xs",
                        job.status === 'completed' && "bg-green-500",
                        job.status === 'failed' && "bg-red-500",
                        job.status === 'processing' && "bg-blue-500"
                      )}
                    >
                      {getStatusLabel(job.status)}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress value={progress} className="h-2" />
                
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{job.processedRows} / {job.totalRows} registros</span>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Job Details (expanded) */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t bg-muted/30">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>Sucesso: {job.successCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span>Erros: {job.errorCount}</span>
                    </div>
                  </div>

                  {/* Erros */}
                  {job.errors.length > 0 && (
                    <div className="bg-red-500/10 rounded p-2 mb-2 max-h-24 overflow-auto">
                      <p className="text-xs font-medium text-red-500 mb-1">Últimos erros:</p>
                      {job.errors.slice(-3).map((err, idx) => (
                        <p key={idx} className="text-xs text-red-400">
                          Linha {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {(job.status === 'pending' || job.status === 'processing') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelImport(job.id);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancelar Importação
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
