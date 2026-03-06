import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('import_queue' as any)
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobs: ImportJob[] = (data || []).map((job: any) => ({
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      const { data: job, error } = await supabase
        .from('import_queue' as any)
        .insert({
          empresa_id: empresaId,
          user_id: user.id,
          tipo,
          status: 'pending',
          total_rows: data.length,
          processed_rows: 0,
          success_count: 0,
          error_count: 0,
          data: data,
          errors: [],
        })
        .select()
        .single();

      if (error) throw error;

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
      await supabase
        .from('import_queue' as any)
        .update({ status: 'cancelled' })
        .eq('id', jobId);

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
      const { data: job, error: fetchError } = await supabase
        .from('import_queue' as any)
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !job) {
        setProcessingJobId(null);
        return;
      }

      if (job.status === 'cancelled' || job.status === 'completed' || job.status === 'failed') {
        setProcessingJobId(null);
        return;
      }

      // Atualizar status para processing
      if (job.status === 'pending') {
        await supabase
          .from('import_queue' as any)
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', jobId);
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
          const tipo = row['Tipo (sst ou lead)']?.toString().trim().toLowerCase();

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

          const { data: empresaInserida, error: insertError } = await supabase
            .from('empresas')
            .insert(empresaData as any)
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Inserir contato se houver
          const contatoNome = row['Contato - Nome']?.toString().trim();
          if (contatoNome && empresaInserida?.id) {
            await supabase
              .from('empresa_contatos' as any)
              .insert({
                empresa_id: empresaInserida.id,
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
      await supabase
        .from('import_queue' as any)
        .update({
          processed_rows: newProcessedRows,
          success_count: successCount,
          error_count: errorCount,
          errors: errors,
          status: isComplete ? 'completed' : 'processing',
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', jobId);

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
      
      await supabase
        .from('import_queue' as any)
        .update({ status: 'failed' })
        .eq('id', jobId);
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
