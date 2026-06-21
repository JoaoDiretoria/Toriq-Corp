import { useState, useEffect, useCallback, useRef } from 'react';
import {
  vendasEvolutionApi,
  type Instancia,
} from '@/integrations/api/vendasEvolution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2, Plus, QrCode, RefreshCw, RotateCcw, Send, Trash2,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, { label: string; cls: string }> = {
  conectada: { label: 'Conectada', cls: 'bg-green-500/15 text-green-600' },
  conectando: { label: 'Conectando', cls: 'bg-amber-500/15 text-amber-600' },
  criada: { label: 'Criada', cls: 'bg-muted text-muted-foreground' },
  desconectada: { label: 'Desconectada', cls: 'bg-red-500/15 text-red-600' },
};

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_VARIANT[status ?? ''] ?? {
    label: status ?? '—',
    cls: 'bg-muted text-muted-foreground',
  };
  return <Badge className={s.cls}>{s.label}</Badge>;
}

/**
 * Gestão de instâncias Evolution da empresa: criar, conectar (QR), status,
 * enviar teste, excluir. Escopado por empresa pelo backend (cookie de auth).
 */
export function EvolutionInstancias() {
  const [loading, setLoading] = useState(true);
  const [instancias, setInstancias] = useState<Instancia[]>([]);

  // criar
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [dialogCriar, setDialogCriar] = useState(false);

  // qr
  const [qrInst, setQrInst] = useState<Instancia | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // enviar teste
  const [envInst, setEnvInst] = useState<Instancia | null>(null);
  const [envNumero, setEnvNumero] = useState('');
  const [envTexto, setEnvTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fetchInstancias = useCallback(async () => {
    setLoading(true);
    try {
      setInstancias(await vendasEvolutionApi.listInstancias());
    } catch (err) {
      console.error('[EvolutionInstancias] erro ao listar:', err);
      setInstancias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstancias();
  }, [fetchInstancias]);

  // Limpa o polling ao desmontar.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCriar = async () => {
    if (!novoNome.trim()) {
      toast.error('Informe um nome para a instância');
      return;
    }
    setCriando(true);
    try {
      const inst = await vendasEvolutionApi.criarInstancia({
        nome_exibicao: novoNome.trim(),
      });
      toast.success('Instância criada — escaneie o QR para conectar');
      setDialogCriar(false);
      setNovoNome('');
      await fetchInstancias();
      abrirQr(inst);
    } catch (error) {
      toast.error((error as Error)?.message || 'Erro ao criar instância');
    } finally {
      setCriando(false);
    }
  };

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const abrirQr = useCallback(
    async (inst: Instancia) => {
      setQrInst(inst);
      setQrBase64(null);
      setQrCode(null);
      setQrLoading(true);
      try {
        const qr = await vendasEvolutionApi.getQrcode(inst.id);
        setQrBase64(qr.base64);
        setQrCode(qr.code);
      } catch (error) {
        toast.error((error as Error)?.message || 'Erro ao obter o QR code');
      } finally {
        setQrLoading(false);
      }
      // Poll de status até conectar.
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const { status } = await vendasEvolutionApi.getStatus(inst.id);
          if (status === 'conectada') {
            stopPoll();
            toast.success('Instância conectada!');
            setQrInst(null);
            await fetchInstancias();
          }
        } catch {
          /* tolerante: continua tentando */
        }
      }, 3000);
    },
    [fetchInstancias, stopPoll],
  );

  const fecharQr = () => {
    stopPoll();
    setQrInst(null);
  };

  const handleReconectar = async (inst: Instancia) => {
    try {
      await vendasEvolutionApi.reconectar(inst.id);
    } catch (error) {
      toast.error((error as Error)?.message || 'Erro ao reconectar');
      return;
    }
    abrirQr(inst); // mostra o novo QR + faz polling até conectar
  };

  const handleStatus = async (inst: Instancia) => {
    try {
      const { status } = await vendasEvolutionApi.getStatus(inst.id);
      toast.success(`Status: ${status}`);
      await fetchInstancias();
    } catch (error) {
      toast.error((error as Error)?.message || 'Erro ao consultar status');
    }
  };

  const handleExcluir = async (inst: Instancia) => {
    if (!confirm(`Excluir a instância "${inst.nome_exibicao}"?`)) return;
    try {
      await vendasEvolutionApi.deletarInstancia(inst.id);
      toast.success('Instância excluída');
      await fetchInstancias();
    } catch (error) {
      toast.error((error as Error)?.message || 'Erro ao excluir');
    }
  };

  const handleEnviar = async () => {
    if (!envInst) return;
    if (!envNumero.trim() || !envTexto.trim()) {
      toast.error('Informe número e texto');
      return;
    }
    setEnviando(true);
    try {
      const res = await vendasEvolutionApi.enviar(envInst.id, {
        numero: envNumero.trim(),
        texto: envTexto.trim(),
      });
      if (res.enviado) {
        toast.success('Mensagem enviada');
        setEnvInst(null);
        setEnvNumero('');
        setEnvTexto('');
      } else {
        toast.error(res.erro || 'Falha ao enviar');
      }
    } catch (error) {
      toast.error((error as Error)?.message || 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Instâncias de WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Conecte um número via QR code e use no disparo e no SDR.
          </p>
        </div>
        <Button onClick={() => setDialogCriar(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova instância
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : instancias.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma instância ainda. Crie a primeira para conectar um WhatsApp.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {instancias.map((inst) => (
            <Card key={inst.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{inst.nome_exibicao}</CardTitle>
                  <CardDescription>
                    {inst.numero ? `Número: ${inst.numero}` : 'Sem número conectado'}
                  </CardDescription>
                </div>
                <StatusBadge status={inst.status} />
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirQr(inst)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar / QR
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatus(inst)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReconectar(inst)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reconectar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEnvInst(inst);
                    setEnvNumero('');
                    setEnvTexto('');
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar teste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => handleExcluir(inst)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: criar instância */}
      <Dialog open={dialogCriar} onOpenChange={setDialogCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova instância</DialogTitle>
            <DialogDescription>
              Dê um nome amigável. Em seguida você escaneia o QR code para conectar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="evo-novo-nome">Nome de exibição</Label>
            <Input
              id="evo-novo-nome"
              placeholder="Ex.: Vendas SP"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCriar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriar} disabled={criando}>
              {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: QR code */}
      <Dialog open={!!qrInst} onOpenChange={(o) => !o && fecharQr()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar {qrInst?.nome_exibicao}</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie.
              A janela fecha sozinha quando conectar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrLoading ? (
              <Skeleton className="h-56 w-56" />
            ) : qrBase64 ? (
              <img
                src={
                  qrBase64.startsWith('data:')
                    ? qrBase64
                    : `data:image/png;base64,${qrBase64}`
                }
                alt="QR code"
                className="h-56 w-56"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                QR indisponível. Use o código de pareamento abaixo, se houver.
              </p>
            )}
            {qrCode && (
              <p className="font-mono text-sm">
                Código: <span className="font-semibold">{qrCode}</span>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: enviar teste */}
      <Dialog open={!!envInst} onOpenChange={(o) => !o && setEnvInst(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar teste — {envInst?.nome_exibicao}</DialogTitle>
            <DialogDescription>
              Envia uma mensagem de texto pela instância conectada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="evo-env-num">Número (com DDI/DDD)</Label>
              <Input
                id="evo-env-num"
                placeholder="5511999990000"
                value={envNumero}
                onChange={(e) => setEnvNumero(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evo-env-txt">Mensagem</Label>
              <Textarea
                id="evo-env-txt"
                rows={3}
                value={envTexto}
                onChange={(e) => setEnvTexto(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvInst(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
