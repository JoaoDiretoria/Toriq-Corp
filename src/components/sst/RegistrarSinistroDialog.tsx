import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Upload, X, Camera, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColaboradorTurma {
  id: string;
  colaborador_id: string;
  nome: string;
  cpf: string;
}

interface TipoSinistro {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  acao_padrao: string;
}

interface FotoAnexo {
  file: File;
  preview: string;
  descricao: string;
  data_captura: string;
}

interface RegistrarSinistroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  colaboradores: ColaboradorTurma[];
  onSuccess: () => void;
}

export function RegistrarSinistroDialog({
  open,
  onOpenChange,
  turmaId,
  colaboradores,
  onSuccess
}: RegistrarSinistroDialogProps) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [tiposSinistro, setTiposSinistro] = useState<TipoSinistro[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  
  // Form state
  const [colaboradorId, setColaboradorId] = useState('');
  const [tipoSinistroId, setTipoSinistroId] = useState('');
  const [acao, setAcao] = useState('reprovacao');
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState<FotoAnexo[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Carregar tipos de sinistro
  useEffect(() => {
    const fetchTiposSinistro = async () => {
      setLoadingTipos(true);
      try {
        const { data, error } = await supabase
          .from('tipos_sinistro')
          .select('*')
          .eq('ativo', true)
          .order('ordem');

        if (error) throw error;
        setTiposSinistro(data || []);
      } catch (error) {
        console.error('Erro ao carregar tipos de sinistro:', error);
        toast.error('Erro ao carregar tipos de sinistro');
      } finally {
        setLoadingTipos(false);
      }
    };

    if (open) {
      fetchTiposSinistro();
    }
  }, [open]);

  // Limpar form ao fechar
  useEffect(() => {
    if (!open) {
      setColaboradorId('');
      setTipoSinistroId('');
      setAcao('reprovacao');
      setDescricao('');
      setFotos([]);
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotos.length >= 3) {
      toast.error('Máximo de 3 anexos permitidos');
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    const preview = URL.createObjectURL(file);
    const novaFoto: FotoAnexo = {
      file,
      preview,
      descricao: '',
      data_captura: format(new Date(), 'yyyy-MM-dd')
    };

    setFotos(prev => [...prev, novaFoto]);
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos(prev => {
      const newFotos = [...prev];
      URL.revokeObjectURL(newFotos[index].preview);
      newFotos.splice(index, 1);
      return newFotos;
    });
  };

  const handleFotoDescricaoChange = (index: number, value: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index].descricao = value;
      return newFotos;
    });
  };

  const handleFotoDataChange = (index: number, value: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index].data_captura = value;
      return newFotos;
    });
  };

  const uploadFotoToStorage = async (file: File, sinistroId: string, ordem: number): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sinistroId}_${ordem}_${Date.now()}.${fileExt}`;
    const filePath = `sinistros/${turmaId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('turmas')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('turmas')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    // Validações
    if (!colaboradorId) {
      toast.error('Selecione um colaborador');
      return;
    }
    if (!tipoSinistroId) {
      toast.error('Selecione o motivo do sinistro');
      return;
    }
    if (!descricao.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }
    if (descricao.trim().length < 20) {
      toast.error('A descrição deve ter pelo menos 20 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Buscar turma_colaborador_id
      const colaborador = colaboradores.find(c => c.colaborador_id === colaboradorId);
      if (!colaborador) {
        toast.error('Colaborador não encontrado');
        return;
      }

      // Inserir sinistro
      const { data: sinistroData, error: sinistroError } = await supabase
        .from('sinistros_colaborador')
        .insert({
          turma_colaborador_id: colaborador.id,
          turma_id: turmaId,
          tipo_sinistro_id: tipoSinistroId,
          acao: acao,
          descricao: descricao.trim(),
          registrado_por: profile?.id
        })
        .select()
        .single();

      if (sinistroError) throw sinistroError;

      // Upload das fotos
      if (fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          try {
            const fotoUrl = await uploadFotoToStorage(foto.file, sinistroData.id, i);
            
            await supabase
              .from('sinistro_fotos')
              .insert({
                sinistro_id: sinistroData.id,
                foto_url: fotoUrl,
                descricao: foto.descricao || null,
                data_captura: foto.data_captura ? new Date(foto.data_captura).toISOString() : null,
                ordem: i
              });
          } catch (fotoError) {
            console.error('Erro ao fazer upload da foto:', fotoError);
          }
        }
      }

      // Atualizar resultado do colaborador para reprovado
      await supabase
        .from('turma_colaboradores')
        .update({ resultado: 'reprovado' })
        .eq('id', colaborador.id);

      toast.success('Sinistro registrado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao registrar sinistro:', error);
      toast.error('Erro ao registrar sinistro');
    } finally {
      setLoading(false);
    }
  };

  const colaboradorSelecionado = colaboradores.find(c => c.colaborador_id === colaboradorId);
  const tipoSelecionado = tiposSinistro.find(t => t.id === tipoSinistroId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Registrar Sinistro
          </DialogTitle>
          <DialogDescription>
            Registre uma ocorrência que resultará na reprovação do colaborador. Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Colaborador */}
          <div className="space-y-2">
            <Label htmlFor="colaborador">Colaborador *</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.colaborador_id} value={colaborador.colaborador_id}>
                    {colaborador.nome} - {colaborador.cpf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo/Tipo de Sinistro */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            {loadingTipos ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando motivos...
              </div>
            ) : (
              <Select value={tipoSinistroId} onValueChange={setTipoSinistroId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposSinistro.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tipoSelecionado && (
              <p className="text-xs text-muted-foreground mt-1">
                {tipoSelecionado.descricao}
              </p>
            )}
          </div>

          {/* Ação */}
          <div className="space-y-2">
            <Label htmlFor="acao">Ação</Label>
            <Select value={acao} onValueChange={setAcao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reprovacao">Reprovar</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O colaborador será automaticamente reprovado ao registrar o sinistro
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva detalhadamente o ocorrido, incluindo informações que corroboram o sinistro..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 20 caracteres. {descricao.length}/20
            </p>
          </div>

          {/* Anexos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Anexos (até 3 fotos)</Label>
              <span className="text-xs text-muted-foreground">{fotos.length}/3</span>
            </div>
            
            {/* Lista de fotos */}
            {fotos.length > 0 && (
              <div className="space-y-3">
                {fotos.map((foto, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex gap-3">
                      <div className="relative">
                        <img 
                          src={foto.preview} 
                          alt={`Anexo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs">Descrição da imagem</Label>
                          <Input
                            placeholder="Descreva o que a imagem mostra..."
                            value={foto.descricao}
                            onChange={(e) => handleFotoDescricaoChange(index, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data da foto</Label>
                          <Input
                            type="date"
                            value={foto.data_captura}
                            onChange={(e) => handleFotoDataChange(index, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão adicionar foto */}
            {fotos.length < 3 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Adicionar Foto
                </Button>
              </div>
            )}
          </div>

          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Atenção!</p>
                <p>
                  Ao registrar este sinistro, o colaborador <strong>{colaboradorSelecionado?.nome || 'selecionado'}</strong> será 
                  automaticamente <strong>reprovado</strong> nesta turma, independentemente de suas notas nas provas.
                </p>
                <p className="mt-2">
                  Colaboradores reprovados por sinistro <strong>não poderão</strong> ter certificados gerados.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !colaboradorId || !tipoSinistroId || !descricao.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrar Sinistro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
