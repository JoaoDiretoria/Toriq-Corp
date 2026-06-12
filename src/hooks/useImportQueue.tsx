import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/integrations/api/client';
import { toast } from 'sonner';

interface ImportJob {
  id: string;
  tipo: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; error: string }[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface ImportQueueContextType {
  activeJobs: ImportJob[];
  isMinimized: boolean;
  setIsMinimized: (value: boolean) => void;
  startImport: (empresaId: string, tipo: string, data: any[]) => Promise<string | null>;
  cancelImport: (jobId: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
  processNextBatch: (jobId: string) => Promise<void>;
}

const ImportQueueContext = createContext<ImportQueueContextType | null>(null);

export function ImportQueueProvider({ children }: { children: ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<ImportJob[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);

  // Carregar jobs ativos ao iniciar
  const refreshJobs = useCallback(async () => {
    try {
      const all = await api.get<any[]>('/sistema/import-queue').catch(() => [] as any[]);

      // Filtrar apenas pending/processing no cliente (o endpoint retorna todos da empresa)
      const filtered = (all || []).filter((job: any) =>
        job.status === 'pending' || job.status === 'processing'
      );

      const jobs: ImportJob[] = filtered.map((job: any) => ({
        id: job.id,
        tipo: job.tipo,
        status: job.status,
        totalRows: job.total_rows,
        processedRows: job.processed_rows,
        successCount: job.success_count,
        errorCount: job.error_count,
        errors: job.errors || [],
        startedAt: job.started_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
      }));

      setActiveJobs(jobs);

      // Se há jobs pendentes ou em processamento, continuar processando
      const pendingJob = jobs.find(j => j.status === 'pending' || j.status === 'processing');
      if (pendingJob && !processingJobId) {
        processNextBatch(pendingJob.id);
      }
    } catch (error) {
      console.error('Erro ao carregar jobs:', error);
    }
  }, [processingJobId]);

  useEffect(() => {
    refreshJobs();
    
    // Polling a cada 5 segundos para atualizar status
    const interval = setInterval(refreshJobs, 5000);
    return () => clearInterval(interval);
  }, [refreshJobs]);

  // Iniciar nova importação
  const startImport = async (empresaId: string, tipo: string, data: any[]): Promise<string | null> => {
    try {
      // empresa_id e user_id são injetados pelo backend a partir do token
      const job = await api.post<any>('/sistema/import-queue', {
        tipo,
        status: 'pending',
        total_rows: data.length,
        processed_rows: 0,
        success_count: 0,
        error_count: 0,
        data: data,
        errors: [],
      });

      toast.success(`Importação iniciada: ${data.length} registros na fila`);
      setIsMinimized(false);

      await refreshJobs();

      // Iniciar processamento
      if (job) {
        processNextBatch(job.id);
      }

      return job?.id || null;
    } catch (error: any) {
      toast.error('Erro ao iniciar importação: ' + error.message);
      return null;
    }
  };

  // Cancelar importação
  const cancelImport = async (jobId: string) => {
    try {
      await api.put<any>(`/sistema/import-queue/${jobId}`, { status: 'cancelled' });

      toast.info('Importação cancelada');
      await refreshJobs();
    } catch (error: any) {
      toast.error('Erro ao cancelar: ' + error.message);
    }
  };

  // Processar próximo lote
  const processNextBatch = async (jobId: string) => {
    if (processingJobId === jobId) return;

    setProcessingJobId(jobId);

    try {
      // Buscar job atual
      const job = await api.get<any>(`/sistema/import-queue/${jobId}`).catch(() => null);

      if (!job) {
        setProcessingJobId(null);
        return;
      }

      if (job.status === 'cancelled' || job.status === 'completed' || job.status === 'failed') {
        setProcessingJobId(null);
        return;
      }

      // Atualizar status para processing
      if (job.status === 'pending') {
        await api.put<any>(`/sistema/import-queue/${jobId}`, {
          status: 'processing',
          started_at: new Date().toISOString(),
        });
      }

      const dataToProcess = job.data as any[];
      const batchSize = 10; // Processar 10 por vez
      const startIndex = job.processed_rows;
      const endIndex = Math.min(startIndex + batchSize, dataToProcess.length);
      const batch = dataToProcess.slice(startIndex, endIndex);

      let successCount = job.success_count;
      let errorCount = job.error_count;
      const errors = [...(job.errors || [])];

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNumber = startIndex + i + 1;

        try {
          // Preparar dados da empresa
          const razaoSocial = row['Razão Social']?.toString().trim();
          const tipoRaw = row['Tipo (toriqcorp ou lead)']?.toString().trim().toLowerCase();
          // Normalizar: 'toriqcorp' mapeia para 'sst' no backend
          const tipo = tipoRaw === 'toriqcorp' ? 'sst' : tipoRaw;

          if (!razaoSocial || !tipo) {
            throw new Error('Razão Social e Tipo são obrigatórios');
          }

          const empresaData = {
            nome: razaoSocial,
            razao_social: razaoSocial,
            nome_fantasia: row['Nome Fantasia']?.toString().trim() || null,
            tipo: tipo,
            cnpj: row['CNPJ']?.toString().trim() || null,
            email: row['E-mail']?.toString().trim() || null,
            telefone: row['Telefone']?.toString().trim() || null,
            porte: row['Porte (MEI, ME, EPP, MEDIO, GRANDE)']?.toString().trim().toUpperCase() || null,
            cep: row['CEP']?.toString().trim() || null,
            endereco: row['Endereço']?.toString().trim() || null,
            numero: row['Número']?.toString().trim() || null,
            complemento: row['Complemento']?.toString().trim() || null,
            bairro: row['Bairro']?.toString().trim() || null,
            cidade: row['Cidade']?.toString().trim() || null,
            estado: row['Estado (UF)']?.toString().trim().toUpperCase() || null,
            site: row['Site']?.toString().trim() || null,
            linkedin: row['LinkedIn']?.toString().trim() || null,
            instagram: row['Instagram']?.toString().trim() || null,
          };

          const empresaInserida = await api.post<any>('/empresas', empresaData);

          const contatoNome = row['Contato - Nome']?.toString().trim();
          if (contatoNome && empresaInserida?.id) {
            await api.post<any>(`/empresas/${empresaInserida.id}/contatos`, {
              nome: contatoNome,
              cargo: row['Contato - Cargo']?.toString().trim() || null,
              email: row['Contato - E-mail']?.toString().trim() || null,
              telefone: row['Contato - Telefone']?.toString().trim() || null,
              linkedin: row['Contato - LinkedIn']?.toString().trim() || null,
              principal: true,
            });
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push({ row: rowNumber, error: error.message || 'Erro desconhecido' });
        }
      }

      const newProcessedRows = endIndex;
      const isComplete = newProcessedRows >= dataToProcess.length;

      // Atualizar progresso
      await api.put<any>(`/sistema/import-queue/${jobId}`, {
        processed_rows: newProcessedRows,
        success_count: successCount,
        error_count: errorCount,
        errors: errors,
        status: isComplete ? 'completed' : 'processing',
        completed_at: isComplete ? new Date().toISOString() : null,
      });

      await refreshJobs();

      // Continuar processando se não terminou
      if (!isComplete) {
        // Pequeno delay para não sobrecarregar
        setTimeout(() => {
          setProcessingJobId(null);
          processNextBatch(jobId);
        }, 500);
      } else {
        setProcessingJobId(null);
        toast.success(`Importação concluída: ${successCount} sucesso, ${errorCount} erros`);
      }
    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setProcessingJobId(null);

      await api.put<any>(`/sistema/import-queue/${jobId}`, { status: 'failed' }).catch(() => {});
    }
  };

  return (
    <ImportQueueContext.Provider
      value={{
        activeJobs,
        isMinimized,
        setIsMinimized,
        startImport,
        cancelImport,
        refreshJobs,
        processNextBatch,
      }}
    >
      {children}
    </ImportQueueContext.Provider>
  );
}

export function useImportQueue() {
  const context = useContext(ImportQueueContext);
  // Retornar valores padrão se não estiver dentro do provider
  if (!context) {
    return {
      activeJobs: [],
      isMinimized: true,
      setIsMinimized: () => {},
      startImport: async () => null,
      cancelImport: async () => {},
      refreshJobs: async () => {},
      processNextBatch: async () => {},
    } as ImportQueueContextType;
  }
  return context;
}
