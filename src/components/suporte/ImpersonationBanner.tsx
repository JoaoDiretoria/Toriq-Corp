import { useEffect, useState } from 'react';
import { opsApi } from '@/integrations/api/ops';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const [info, setInfo] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('ops_impersonando');
    if (raw) { try { setInfo(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  if (!info) return null;

  const sair = async () => {
    try {
      await opsApi.stopImpersonate();
      localStorage.removeItem('ops_impersonando');
      toast.success('Impersonação encerrada.');
      window.location.href = '/ops';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao encerrar');
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <span>Você está impersonando <strong>{info.nome}</strong> ({info.email}).</span>
      <button onClick={sair} className="rounded bg-white/20 px-3 py-1 font-medium hover:bg-white/30">
        Sair da impersonação
      </button>
    </div>
  );
}
