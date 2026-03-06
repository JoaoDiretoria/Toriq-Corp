import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserPlus, CheckCircle, AlertCircle, GraduationCap, Building2, Calendar, Camera, Upload, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TurmaInfo {
  id: string;
  codigo_turma: string;
  treinamento_nome: string;
  treinamento_norma: string;
  cliente_nome: string;
  data_inicio: string | null;
  empresa_sst_id: string;
  cliente_empresa_id: string;
}

export default function CadastroColaboradorTurma() {
  const { turmaId } = useParams<{ turmaId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turma, setTurma] = useState<TurmaInfo | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reconhecimentoFacialAtivo, setReconhecimentoFacialAtivo] = useState(false);
  
  // Form states
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    if (turmaId) {
      fetchTurmaInfo();
    }
  }, [turmaId]);

  const fetchTurmaInfo = async () => {
    try {
      console.log('Buscando turma com ID:', turmaId);
      
      // Buscar turma com joins para pegar todas as informações de uma vez
      const { data: turmaData, error: turmaError } = await (supabase as any)
        .from('turmas_treinamento')
        .select(`
          id,
          codigo_turma,
          cliente_id,
          treinamento_id,
          empresa_id,
          catalogo_treinamentos!turmas_treinamento_treinamento_id_fkey(
            nome,
            norma
          ),
          clientes_sst!turmas_treinamento_cliente_id_fkey(
            nome,
            cliente_empresa_id
          ),
          turmas_treinamento_aulas(
            data
          )
        `)
        .eq('id', turmaId)
        .single();

      console.log('Resultado da busca:', turmaData, 'Erro:', turmaError);

      if (turmaError) {
        console.error('Erro ao buscar turma:', turmaError);
        setTurma(null);
        return;
      }

      if (!turmaData) {
        console.error('Turma não encontrada');
        setTurma(null);
        return;
      }

      // Pegar a primeira data das aulas como data_inicio
      const aulas = turmaData.turmas_treinamento_aulas || [];
      const datasOrdenadas = aulas
        .map((a: any) => a.data)
        .filter((d: any) => d)
        .sort((a: string, b: string) => a.localeCompare(b));
      const dataInicio = datasOrdenadas[0] || null;

      const empresaSstId = turmaData.empresa_id;
      const clienteEmpresaId = turmaData.clientes_sst?.cliente_empresa_id;

      setTurma({
        id: turmaData.id,
        codigo_turma: turmaData.codigo_turma || '',
        treinamento_nome: turmaData.catalogo_treinamentos?.nome || '',
        treinamento_norma: turmaData.catalogo_treinamentos?.norma || '',
        cliente_nome: turmaData.clientes_sst?.nome || '',
        data_inicio: dataInicio,
        empresa_sst_id: empresaSstId,
        cliente_empresa_id: clienteEmpresaId
      });

      // Verificar se reconhecimento facial está ativo para este cliente
      if (empresaSstId && clienteEmpresaId) {
        const { data: configData } = await (supabase as any)
          .from('reconhecimento_facial_config')
          .select('ativo')
          .eq('empresa_sst_id', empresaSstId)
          .eq('cliente_empresa_id', clienteEmpresaId)
          .single();

        if (configData?.ativo) {
          setReconhecimentoFacialAtivo(true);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      setTurma(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 11);
    
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  // Função para redimensionar imagem antes do upload
  const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          
          // Calcular novas dimensões mantendo proporção
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          // Criar canvas e desenhar imagem redimensionada
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível criar contexto do canvas'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Não foi possível converter imagem'));
                return;
              }
              // Criar novo File a partir do blob
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Redimensionar imagem para evitar uploads muito grandes
      const resizedFile = await resizeImage(file, 800, 800, 0.8);
      setFotoFile(resizedFile);
      
      // Preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(resizedFile);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      // Fallback: usar arquivo original se redimensionamento falhar
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error('Por favor, informe seu nome completo');
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      toast.error('Por favor, informe um CPF válido');
      return;
    }

    // Se reconhecimento facial está ativo, foto é obrigatória
    if (reconhecimentoFacialAtivo && !fotoFile) {
      toast.error('Por favor, envie sua foto para o cadastro');
      return;
    }

    setSubmitting(true);
    try {
      let fotoUrl: string | null = null;

      // Upload da foto se existir
      if (fotoFile) {
        setUploadingFoto(true);
        
        // Usar extensão .jpg pois redimensionamos para JPEG
        const fileName = `cadastro_${turmaId}_${cpfLimpo}_${Date.now()}.jpg`;
        const filePath = `colaboradores_temporarios/${fileName}`;

        // Tentar upload com retry
        let uploadError = null;
        let tentativas = 0;
        const maxTentativas = 3;
        
        while (tentativas < maxTentativas) {
          tentativas++;
          const { error } = await supabase.storage
            .from('fotos')
            .upload(filePath, fotoFile, { 
              upsert: true,
              contentType: 'image/jpeg'
            });
          
          if (!error) {
            uploadError = null;
            break;
          }
          
          uploadError = error;
          console.error(`Tentativa ${tentativas}/${maxTentativas} falhou:`, error);
          
          // Aguardar antes de tentar novamente
          if (tentativas < maxTentativas) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (uploadError) {
          console.error('Erro ao fazer upload da foto após todas tentativas:', uploadError);
          toast.error('Erro ao enviar foto. Verifique sua conexão e tente novamente.');
          setSubmitting(false);
          setUploadingFoto(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('fotos')
          .getPublicUrl(filePath);

        fotoUrl = urlData?.publicUrl || null;
        setUploadingFoto(false);
      }
      // Verificar se já existe um cadastro pendente com esse CPF nesta turma
      const { data: existente } = await (supabase as any)
        .from('colaboradores_temporarios')
        .select('id')
        .eq('turma_id', turmaId)
        .eq('cpf', cpfLimpo)
        .eq('status', 'pendente')
        .single();

      if (existente) {
        toast.error('Você já possui um cadastro pendente de aprovação para esta turma');
        setSubmitting(false);
        return;
      }

      // Verificar se já está na turma como colaborador
      const { data: jaColaborador } = await (supabase as any)
        .from('colaboradores')
        .select('id')
        .eq('cpf', cpfLimpo);

      if (jaColaborador && jaColaborador.length > 0) {
        // Verificar se já está na turma
        const { data: jaNaTurma } = await (supabase as any)
          .from('turma_colaboradores')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('colaborador_id', jaColaborador[0].id)
          .single();

        if (jaNaTurma) {
          toast.error('Você já está cadastrado nesta turma');
          setSubmitting(false);
          return;
        }
      }

      // Inserir na tabela de colaboradores temporários
      const { error } = await (supabase as any)
        .from('colaboradores_temporarios')
        .insert({
          turma_id: turmaId,
          nome: nome.trim(),
          cpf: cpfLimpo,
          foto_url: fotoUrl,
          status: 'pendente'
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Cadastro enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar cadastro:', error);
      toast.error('Erro ao enviar cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Turma não encontrada</h2>
            <p className="text-muted-foreground">
              O link de cadastro é inválido ou a turma não existe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Cadastro Enviado!</h2>
            <p className="text-muted-foreground mb-6">
              Seu cadastro foi enviado com sucesso e está aguardando aprovação.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left">
              <p className="text-sm text-muted-foreground mb-1">Turma</p>
              <p className="font-medium">{turma.codigo_turma}</p>
              <p className="text-sm text-muted-foreground mt-3 mb-1">Treinamento</p>
              <p className="font-medium">NR-{turma.treinamento_norma} - {turma.treinamento_nome}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Você será notificado quando seu cadastro for aprovado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header com informações da turma */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="text-center pb-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">
              Cadastro de Colaborador
            </CardTitle>
            <CardDescription>
              Preencha seus dados para participar da turma
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Destaque da Empresa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Empresa</p>
                  <p className="text-lg font-bold text-blue-900">{turma.cliente_nome}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Treinamento:</span>
                <span className="font-medium">NR-{turma.treinamento_norma} - {turma.treinamento_nome}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground ml-6">Turma:</span>
                <span className="font-medium text-primary">{turma.codigo_turma}</span>
              </div>
              {turma.data_inicio && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {format(parseISO(turma.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulário de cadastro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Seus Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            {/* Campo de Foto - só exibir se reconhecimento facial estiver ativo */}
            {reconhecimentoFacialAtivo && (
              <div className="space-y-2">
                <Label>Sua Foto *</Label>
                <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
                  {fotoPreview ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                        <img 
                          src={fotoPreview} 
                          alt="Sua foto" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFotoFile(null);
                          setFotoPreview(null);
                        }}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1.5 hover:bg-destructive/90 shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-muted-foreground/30">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {/* Câmera frontal (selfie) */}
                    <label 
                      htmlFor="foto-selfie"
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Tirar Selfie
                    </label>
                    <input
                      id="foto-selfie"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                    
                    {/* Escolher da galeria */}
                    <label 
                      htmlFor="foto-galeria"
                      className="flex items-center gap-1.5 px-4 py-2 bg-muted text-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-muted/80 transition-colors border"
                    >
                      <Upload className="h-4 w-4" />
                      Galeria
                    </label>
                    <input
                      id="foto-galeria"
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Sua foto será usada para validação de presença no treinamento
                  </p>
                </div>
              </div>
            )}

            <Button 
              className="w-full mt-4" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enviar Cadastro
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Após o envio, seu cadastro será analisado e você será adicionado à turma.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
