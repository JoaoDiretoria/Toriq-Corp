import { useState, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, Download, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ExportJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  format: 'csv' | 'excel';
  totalRecords?: number;
  processedRecords?: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
}

interface ExportJobToastProps {
  jobs: ExportJob[];
  onRemoveJob: (id: string) => void;
  onDownload: (job: ExportJob) => void;
}

export function ExportJobToast({ jobs, onRemoveJob, onDownload }: ExportJobToastProps) {
  const [minimized, setMinimized] = useState(false);
  
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const errorJobs = jobs.filter(j => j.status === 'error');
  
  if (jobs.length === 0) return null;
  
  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };
  
  const getFormatIcon = (format: 'csv' | 'excel') => {
    return format === 'excel' 
      ? <FileSpreadsheet className="h-4 w-4 text-green-600" />
      : <FileText className="h-4 w-4 text-blue-600" />;
  };
  
  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-[9999] bg-background border rounded-lg shadow-xl transition-all duration-300",
        minimized ? "w-auto" : "w-80"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {minimized 
              ? `${activeJobs.length > 0 ? `${activeJobs.length} exportando...` : `${completedJobs.length} pronto${completedJobs.length !== 1 ? 's' : ''}`}`
              : 'Exportações'
            }
          </span>
          {activeJobs.length > 0 && minimized && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          {jobs.every(j => j.status === 'completed' || j.status === 'error') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => jobs.forEach(j => onRemoveJob(j.id))}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      {!minimized && (
        <div className="max-h-64 overflow-auto">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="px-3 py-2 border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(job.status)}
                  {getFormatIcon(job.format)}
                  <span className="text-sm font-medium truncate">{job.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {job.status === 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onDownload(job)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemoveJob(job.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {(job.status === 'pending' || job.status === 'processing') && (
                <div className="space-y-1">
                  <Progress value={job.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {job.processedRecords !== undefined && job.totalRecords !== undefined
                      ? `${job.processedRecords.toLocaleString()} de ${job.totalRecords.toLocaleString()} registros`
                      : job.progress < 100 ? 'Processando...' : 'Finalizando...'
                    }
                  </p>
                </div>
              )}
              
              {job.status === 'completed' && (
                <p className="text-xs text-green-600">
                  ✓ Pronto para download ({job.totalRecords?.toLocaleString() || 0} registros)
                </p>
              )}
              
              {job.status === 'error' && (
                <p className="text-xs text-red-600">
                  {job.error || 'Erro ao exportar'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook para gerenciar jobs de exportação
export function useExportJobs() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  
  const addJob = useCallback((job: Omit<ExportJob, 'id' | 'createdAt'>) => {
    const newJob: ExportJob = {
      ...job,
      id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    setJobs(prev => [...prev, newJob]);
    return newJob.id;
  }, []);
  
  const updateJob = useCallback((id: string, updates: Partial<ExportJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ));
  }, []);
  
  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
  }, []);
  
  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed'));
  }, []);
  
  return {
    jobs,
    addJob,
    updateJob,
    removeJob,
    clearCompleted
  };
}
