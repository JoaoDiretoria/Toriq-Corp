import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  User, 
  Check, 
  X, 
  Loader2, 
  Calendar,
  Camera,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColaboradorPendente {
  id: string;
  nome: string;
  cpf: string;
  matricula?: string | null;
  foto_url?: string | null;
  created_at: string;
}

interface ColaboradorPendenteCardProps {
  pendente: ColaboradorPendente;
  turmaId: string;
  turmaClienteId: string;
  turmaTreinamentoId: string;
  onAprovado: () => void;
  onRecusado: () => void;
  reconhecimentoFacialAtivo?: boolean;
}

export function ColaboradorPendenteCard({
  pendente,
  turmaId,
  turmaClienteId,
  turmaTreinamentoId,
  onAprovado,
  onRecusado,
  reconhecimentoFacialAtivo = false
}: ColaboradorPendenteCardProps) {
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [processando, setProcessando] = useState(false);
  const fotoPreview = pendente.foto_url || null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const handleAprovar = async () => {
    setProcessando(true);
    try {
      // Buscar o cliente_empresa_id do cliente SST
      const { data: clienteData, error: clienteError } = await (supabase as any)
        .from('clientes_sst')
        .select('cliente_empresa_id')
        .eq('id', turmaClienteId)
        .single();

      if (clienteError || !clienteData?.cliente_empresa_id) {
        throw new Error('Não foi possível encontrar a empresa do cliente');
      }

      const empresaColaboradorId = clienteData.cliente_empresa_id;

      // Verificar se já existe colaborador com esse CPF na empresa
      const { data: colaboradorExistente } = await (supabase as any)
        .from('colaboradores')
        .select('id')
        .eq('empresa_id', empresaColaboradorId)
        .eq('cpf', pendente.cpf)
        .single();

      let colaboradorId: string;

      if (colaboradorExistente) {
        colaboradorId = colaboradorExistente.id;
        
        // Atualizar foto se não tiver
        if (fotoPreview) {
          await (supabase as any)
            .from('colaboradores')
            .update({ foto_url: fotoPreview })
            .eq('id', colaboradorId);
        }
      } else {
        // Criar novo colaborador
        const { data: novoColaborador, error: erroColaborador } = await (supabase as any)
          .from('colaboradores')
          .insert({
            empresa_id: empresaColaboradorId,
            nome: pendente.nome,
            cpf: pendente.cpf,
            foto_url: fotoPreview,
            ativo: true
          })
          .select('id')
          .single();

        if (erroColaborador) throw erroColaborador;
        colaboradorId = novoColaborador.id;

        // Adicionar treinamento ao colaborador
        await (supabase as any)
          .from('colaboradores_treinamentos')
          .insert({
            colaborador_id: colaboradorId,
            treinamento_id: turmaTreinamentoId,
            status: 'pendente'
          });
      }

      // Verificar se já está na turma
      const { data: jaNaTurma } = await (supabase as any)
        .from('turma_colaboradores')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('colaborador_id', colaboradorId)
        .single();

      if (!jaNaTurma) {
        // Verificar conflito de datas
        const { data: aulasTurmaAtual } = await (supabase as any)
          .from('turmas_treinamento_aulas')
          .select('data')
          .eq('turma_id', turmaId);

        if (aulasTurmaAtual && aulasTurmaAtual.length > 0) {
          const datasTurmaAtual = aulasTurmaAtual.map((a: any) => a.data);
          
          const { data: outrasTurmasColab } = await (supabase as any)
            .from('turma_colaboradores')
            .select('turma_id, turmas_treinamento!turma_colaboradores_turma_id_fkey(id, status, codigo_turma, turmas_treinamento_aulas(data))')
            .eq('colaborador_id', colaboradorId);

          for (const outraTurma of (outrasTurmasColab || [])) {
            if (outraTurma.turmas_treinamento?.status === 'concluido') continue;
            if (outraTurma.turma_id === turmaId) continue;
            
            const aulasOutraTurma = outraTurma.turmas_treinamento?.turmas_treinamento_aulas || [];
            
            for (const aulaOutra of aulasOutraTurma) {
              if (datasTurmaAtual.includes(aulaOutra.data)) {
                const dataConflito = new Date(aulaOutra.data + 'T12:00:00').toLocaleDateString('pt-BR');
                toast.error(`Conflito de agenda! ${pendente.nome} já está na turma "${outraTurma.turmas_treinamento?.codigo_turma || 'outra turma'}" no dia ${dataConflito}.`);
                setProcessando(false);
                return;
              }
            }
          }
        }

        // Adicionar à turma
        await (supabase as any)
          .from('turma_colaboradores')
          .insert({
            turma_id: turmaId,
            colaborador_id: colaboradorId,
            presente: false
          });
      }

      // Remover da tabela de temporários
      await (supabase as any)
        .from('colaboradores_temporarios')
        .delete()
        .eq('id', pendente.id);

      toast.success(`${pendente.nome} foi aprovado e adicionado à turma!`);
      setDetalhesOpen(false);
      onAprovado();
    } catch (error: any) {
      console.error('Erro ao aprovar colaborador:', error);
      toast.error(error.message || 'Erro ao aprovar colaborador');
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusar = async () => {
    setProcessando(true);
    try {
      await (supabase as any)
        .from('colaboradores_temporarios')
        .delete()
        .eq('id', pendente.id);

      toast.success(`Cadastro de ${pendente.nome} foi recusado.`);
      setDetalhesOpen(false);
      onRecusado();
    } catch (error) {
      console.error('Erro ao recusar colaborador:', error);
      toast.error('Erro ao recusar colaborador');
    } finally {
      setProcessando(false);
    }
  };

  const temFoto = !!fotoPreview || !!pendente.foto_url;

  return (
    <>
      {/* Card resumido na lista */}
      <div 
        className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-warning/30 transition-colors cursor-pointer"
        onClick={() => setDetalhesOpen(true)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {pendente.foto_url ? (
              <AvatarImage src={pendente.foto_url} alt={pendente.nome} />
            ) : null}
            <AvatarFallback className="bg-warning/10 text-warning">
              {getInitials(pendente.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-foreground">{pendente.nome}</p>
            <p className="text-xs text-muted-foreground">{formatCPF(pendente.cpf)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reconhecimentoFacialAtivo && !temFoto && (
            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">
              <Camera className="h-3 w-3 mr-1" />
              Sem foto
            </Badge>
          )}
          <Badge variant="outline" className="text-warning border-warning/30">
            Pendente
          </Badge>
        </div>
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-warning" />
              Aprovar Colaborador
            </DialogTitle>
            <DialogDescription>
              Revise os dados do colaborador e aprove ou recuse o cadastro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Foto - exibir foto enviada pelo colaborador (somente leitura) */}
            {reconhecimentoFacialAtivo && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div 
                  className={`w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                    fotoPreview 
                      ? 'border-success/50 bg-success/5' 
                      : 'border-dashed border-warning/50 bg-warning/5'
                  } transition-colors`}
                >
                  {fotoPreview ? (
                    <img src={fotoPreview} alt={pendente.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2">
                      <Camera className="h-8 w-8 text-warning mx-auto" />
                      <span className="text-xs text-warning mt-1 block">Sem foto</span>
                    </div>
                  )}
                </div>
              </div>
              
              {fotoPreview && (
                <p className="text-xs text-success font-medium">
                  ✓ Foto enviada pelo colaborador
                </p>
              )}
            </div>
            )}

            {reconhecimentoFacialAtivo && !fotoPreview && (
              <div className="flex items-center gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                <p className="text-sm text-warning">
                  O colaborador não enviou foto. Você pode aprovar mesmo assim, mas a validação facial não será possível.
                </p>
              </div>
            )}

            {/* Dados */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome Completo</p>
                  <p className="font-medium">{pendente.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{formatCPF(pendente.cpf)}</p>
                </div>
                {pendente.matricula && (
                  <div>
                    <p className="text-xs text-muted-foreground">Matrícula</p>
                    <p className="font-medium">{pendente.matricula}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Data do Cadastro</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(pendente.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleRecusar}
              disabled={processando}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Recusar
                </>
              )}
            </Button>
            <Button
              onClick={handleAprovar}
              disabled={processando}
              className="bg-success hover:bg-success/90"
            >
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
