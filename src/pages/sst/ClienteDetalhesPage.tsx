import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { ClienteDetalhesContent } from '@/components/sst/ClienteDetalhesDialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  sigla: string | null;
  cnpj: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  email: string | null;
  telefone: string | null;
  cliente_empresa_id: string | null;
  cliente_empresa?: Empresa | null;
}

export default function ClienteDetalhesPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!clienteId || !empresaId) return;

      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('clientes_sst')
          .select(`
            *,
            cliente_empresa:empresas!clientes_sst_cliente_empresa_id_fkey(id, nome, cnpj, razao_social, nome_fantasia, email, telefone, cep, endereco, numero, complemento, bairro, cidade, estado)
          `)
          .eq('id', clienteId)
          .eq('empresa_sst_id', empresaId)
          .single();

        if (error) throw error;
        setCliente(data);
      } catch (error: any) {
        console.error('Erro ao carregar cliente:', error);
        toast({
          title: 'Erro ao carregar cliente',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [clienteId, empresaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      {/* Sidebar + Header + Conteúdo gerenciados pelo ClienteDetalhesContent */}
      <ClienteDetalhesContent cliente={cliente} variant="page" onBack={() => navigate(-1)} />
    </div>
  );
}
