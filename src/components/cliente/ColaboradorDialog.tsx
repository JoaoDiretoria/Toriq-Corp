import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, X, Camera, Upload, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Colaborador } from './ClienteColaboradores';

// Função para comprimir imagem
const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Erro ao comprimir imagem'));
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

// Função para gerar código facial único
const generateCodigoFacial = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const colaboradorSchema = z.object({
  matricula: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  cargo: z.string().optional(),
  setor: z.string().optional(),
  grupo_homogeneo_id: z.string().optional(),
  treinamentos: z.array(z.string()).optional(),
  ativo: z.boolean(),
});

type ColaboradorFormData = z.infer<typeof colaboradorSchema>;

interface ColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
}

export function ColaboradorDialog({
  open,
  onOpenChange,
  colaborador,
}: ColaboradorDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para foto
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [codigoFacial, setCodigoFacial] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para captura de câmera
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: setores } = useQuery({
    queryKey: ['setores', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.empresa_id,
  });

  const { data: cargos } = useQuery({
    queryKey: ['cargos', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome')
        .eq('empresa_id', profile.empresa_id)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.empresa_id,
  });

  // Buscar empresa SST relacionada ao cliente
  const { data: clienteSst } = useQuery({
    queryKey: ['cliente-sst', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return null;
      const { data, error } = await supabase
        .from('clientes_sst')
        .select('empresa_sst_id')
        .eq('cliente_empresa_id', profile.empresa_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const empresaSstId = clienteSst?.empresa_sst_id;

  const { data: gruposHomogeneos } = useQuery({
    queryKey: ['grupos-homogeneos', empresaSstId],
    queryFn: async () => {
      if (!empresaSstId) return [];
      const { data, error } = await supabase
        .from('grupos_homogeneos')
        .select('id, nome')
        .eq('empresa_id', empresaSstId)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaSstId,
  });

  // Buscar treinamentos disponíveis da empresa SST
  const { data: treinamentos } = useQuery({
    queryKey: ['treinamentos-catalogo', empresaSstId],
    queryFn: async () => {
      if (!empresaSstId) return [];
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaSstId)
        .order('norma');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaSstId,
  });

  // Buscar treinamentos vinculados aos grupos homogêneos
  const { data: gruposTreinamentos } = useQuery({
    queryKey: ['grupos-homogeneos-treinamentos', empresaSstId],
    queryFn: async () => {
      if (!empresaSstId) return [];
      const { data, error } = await supabase
        .from('grupos_homogeneos_treinamentos')
        .select('grupo_homogeneo_id, treinamento_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaSstId,
  });

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      matricula: '',
      nome: '',
      cpf: '',
      cargo: '',
      setor: '',
      grupo_homogeneo_id: '',
      treinamentos: [],
      ativo: true,
    },
  });

  useEffect(() => {
    if (colaborador) {
      form.reset({
        matricula: colaborador.matricula || '',
        nome: colaborador.nome,
        cpf: colaborador.cpf || '',
        cargo: colaborador.cargo || '',
        setor: colaborador.setor || '',
        grupo_homogeneo_id: colaborador.grupo_homogeneo_id || '',
        treinamentos: colaborador.treinamentos?.map(t => t.treinamento_id) || [],
        ativo: colaborador.ativo,
      });
      setFotoUrl((colaborador as any).foto_url || null);
      setCodigoFacial((colaborador as any).codigo_facial || null);
    } else {
      form.reset({
        matricula: '',
        nome: '',
        cpf: '',
        cargo: '',
        setor: '',
        grupo_homogeneo_id: '',
        treinamentos: [],
        ativo: true,
      });
      setFotoUrl(null);
      setCodigoFacial(null);
    }
  }, [colaborador, form]);

  // Auto-preencher treinamentos quando grupo homogêneo muda
  const grupoHomogeneoId = form.watch('grupo_homogeneo_id');
  useEffect(() => {
    if (!grupoHomogeneoId || !gruposTreinamentos) return;
    
    const ghTreinamentoIds = gruposTreinamentos
      .filter(gt => gt.grupo_homogeneo_id === grupoHomogeneoId)
      .map(gt => gt.treinamento_id);
    
    if (ghTreinamentoIds.length === 0) return;

    const currentTreinamentos = form.getValues('treinamentos') || [];
    // Mesclar: manter os já selecionados + adicionar os do GH
    const merged = [...new Set([...currentTreinamentos, ...ghTreinamentoIds])];
    
    if (merged.length !== currentTreinamentos.length) {
      form.setValue('treinamentos', merged);
    }
  }, [grupoHomogeneoId, gruposTreinamentos, form]);

  // Função para fazer upload da foto
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.empresa_id) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    setUploadingFoto(true);
    try {
      // Comprimir imagem
      const compressedBlob = await compressImage(file, 400, 0.8);
      
      // Gerar nome único para o arquivo
      const fileName = `${profile.empresa_id}/${colaborador?.id || 'temp'}_${Date.now()}.jpg`;
      
      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('colaborador-fotos')
        .upload(fileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('colaborador-fotos')
        .getPublicUrl(fileName);

      setFotoUrl(urlData.publicUrl);
      
      // Gerar código facial se não existir
      if (!codigoFacial) {
        const novoCodigo = generateCodigoFacial();
        setCodigoFacial(novoCodigo);
      }

      toast({ title: 'Foto enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  // Função para copiar código facial
  const copiarCodigo = () => {
    if (codigoFacial) {
      navigator.clipboard.writeText(codigoFacial);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  // Funções para captura de câmera
  const openCameraDialog = () => {
    setCapturedPreview(null);
    setCameraDialogOpen(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      
      // Aguardar o video element estar disponível
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(console.error);
        };
      }
      setCameraActive(true);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({ title: 'Erro ao acessar câmera', description: 'Verifique as permissões', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const closeCameraDialog = () => {
    stopCamera();
    setCapturedPreview(null);
    setCameraDialogOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPreview(photoData);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPreview(null);
    // O useEffect vai iniciar a câmera automaticamente quando capturedPreview for null
  };

  const confirmCapturedPhoto = async () => {
    if (!capturedPreview || !profile?.empresa_id) return;

    setUploadingFoto(true);

    try {
      // Converter base64 para blob
      const response = await fetch(capturedPreview);
      const blob = await response.blob();

      // Gerar nome único para o arquivo
      const fileName = `${profile.empresa_id}/${colaborador?.id || 'temp'}_${Date.now()}.jpg`;
      
      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('colaborador-fotos')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('colaborador-fotos')
        .getPublicUrl(fileName);

      setFotoUrl(urlData.publicUrl);
      
      // Gerar código facial se não existir
      if (!codigoFacial) {
        const novoCodigo = generateCodigoFacial();
        setCodigoFacial(novoCodigo);
      }

      closeCameraDialog();
      toast({ title: 'Foto salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      toast({ title: 'Erro ao salvar foto', variant: 'destructive' });
    } finally {
      setUploadingFoto(false);
    }
  };

  // Iniciar câmera quando dialog abre
  useEffect(() => {
    if (cameraDialogOpen && !capturedPreview) {
      startCamera();
    }
  }, [cameraDialogOpen, capturedPreview]);

  // Cleanup da câmera ao fechar dialogs
  useEffect(() => {
    if (!open) {
      closeCameraDialog();
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (data: ColaboradorFormData) => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const payload: any = {
        matricula: data.matricula || null,
        nome: data.nome,
        cpf: data.cpf || null,
        cargo: data.cargo || null,
        setor: data.setor || null,
        grupo_homogeneo_id: data.grupo_homogeneo_id || null,
        ativo: data.ativo,
        empresa_id: profile.empresa_id,
        foto_url: fotoUrl,
        codigo_facial: codigoFacial,
      };

      let colaboradorId: string;

      if (colaborador) {
        const { error } = await supabase
          .from('colaboradores')
          .update(payload)
          .eq('id', colaborador.id);
        if (error) throw error;
        colaboradorId = colaborador.id;

        // Remover treinamentos antigos
        await supabase
          .from('colaboradores_treinamentos')
          .delete()
          .eq('colaborador_id', colaboradorId);
      } else {
        const { data: newColaborador, error } = await supabase
          .from('colaboradores')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        colaboradorId = newColaborador.id;
      }

      // Inserir novos treinamentos
      if (data.treinamentos && data.treinamentos.length > 0) {
        const treinamentosToInsert = data.treinamentos.map(treinamentoId => ({
          colaborador_id: colaboradorId,
          treinamento_id: treinamentoId,
        }));
        const { error: treinamentosError } = await supabase
          .from('colaboradores_treinamentos')
          .insert(treinamentosToInsert);
        if (treinamentosError) throw treinamentosError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({
        title: colaborador
          ? 'Colaborador atualizado com sucesso'
          : 'Colaborador cadastrado com sucesso',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar colaborador',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ColaboradorFormData) => {
    mutation.mutate(data);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Seção de Foto */}
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={fotoUrl || undefined} alt="Foto do colaborador" className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Camera className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fotoInputRef}
                  onChange={handleFotoUpload}
                />
                
                {/* Botões de ação */}
                <div className="flex gap-1 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={uploadingFoto}
                    className="flex-1"
                    title="Enviar do arquivo"
                  >
                    {uploadingFoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openCameraDialog}
                    disabled={uploadingFoto}
                    className="flex-1"
                    title="Tirar foto com câmera"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">Foto para Validação Facial</p>
                <p className="text-xs text-muted-foreground">
                  A foto será usada para validar a presença do colaborador em treinamentos via reconhecimento facial.
                </p>
                {codigoFacial && (
                  <div className="mt-3 p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground mb-1">Código de Validação Facial:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold text-primary tracking-wider">{codigoFacial}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copiarCodigo}
                        className="h-7 px-2"
                      >
                        {copiado ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 001234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do colaborador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                          // Aplicar máscara de CPF
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          if (value.length > 9) {
                            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                          } else if (value.length > 6) {
                            value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                          } else if (value.length > 3) {
                            value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                          }
                          field.onChange(value);
                        }}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cargos?.map((cargo) => (
                          <SelectItem key={cargo.id} value={cargo.nome}>
                            {cargo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="setor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {setores?.map((setor) => (
                          <SelectItem key={setor.id} value={setor.nome}>
                            {setor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grupo_homogeneo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>G.H Treinamentos</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gruposHomogeneos?.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id}>
                            {grupo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Treinamentos - Dropdown Multi-seleção */}
            <FormField
              control={form.control}
              name="treinamentos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treinamentos</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          {field.value?.length
                            ? `${field.value.length} treinamento(s) selecionado(s)`
                            : "Selecione os treinamentos"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                      <div 
                        className="max-h-[250px] overflow-y-auto"
                        onWheel={(e) => {
                          e.currentTarget.scrollTop += e.deltaY;
                        }}
                      >
                        <div className="p-2 space-y-1">
                          {treinamentos?.slice().sort((a, b) => {
                            // Extrair número da norma para ordenação numérica
                            const numA = parseInt((a.norma || '').replace(/\D/g, '')) || 0;
                            const numB = parseInt((b.norma || '').replace(/\D/g, '')) || 0;
                            if (numA !== numB) return numA - numB;
                            // Se números iguais, ordenar por nome
                            return (a.nome || '').localeCompare(b.nome || '');
                          }).map((treinamento) => (
                            <div
                              key={treinamento.id}
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                              onClick={() => {
                                const currentValue = field.value || [];
                                if (currentValue.includes(treinamento.id)) {
                                  field.onChange(currentValue.filter((id) => id !== treinamento.id));
                                } else {
                                  field.onChange([...currentValue, treinamento.id]);
                                }
                              }}
                            >
                              <Checkbox
                                checked={field.value?.includes(treinamento.id)}
                                onCheckedChange={() => {}}
                              />
                              <span className="text-sm">
                                {treinamento.norma} - {treinamento.nome}
                              </span>
                            </div>
                          ))}
                          {(!treinamentos || treinamentos.length === 0) && (
                            <p className="text-sm text-muted-foreground p-2">Nenhum treinamento disponível</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {field.value.map((id) => {
                        const t = treinamentos?.find((tr) => tr.id === id);
                        return t ? (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1">
                            {t.norma}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                field.onChange(field.value?.filter((v) => v !== id));
                              }}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Colaborador está ativo na empresa
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Dialog de Câmera */}
    <Dialog open={cameraDialogOpen} onOpenChange={(open) => {
      if (!open) closeCameraDialog();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            Capturar Foto
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Área de preview - câmera ou foto capturada */}
          <div className="aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
            {/* Video element sempre presente para receber o stream */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${capturedPreview ? 'hidden' : ''}`}
            />
            
            {/* Foto capturada sobrepõe o video */}
            {capturedPreview && (
              <img 
                src={capturedPreview} 
                alt="Foto capturada" 
                className="w-full h-full object-cover absolute inset-0"
              />
            )}
            
            {/* Loading state quando não tem stream nem foto */}
            {!cameraActive && !capturedPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center p-4">
                  <Camera className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Iniciando câmera...</p>
                </div>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Dicas */}
          {!capturedPreview && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-800 mb-1">Dicas para uma boa foto:</p>
              <ul className="text-xs text-blue-700 space-y-0.5">
                <li>• Fique em local bem iluminado</li>
                <li>• Centralize o rosto na câmera</li>
                <li>• Remova óculos ou bonés se possível</li>
              </ul>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCameraDialog}
              className="flex-1"
              disabled={uploadingFoto}
            >
              Cancelar
            </Button>
            
            {capturedPreview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                  disabled={uploadingFoto}
                >
                  Tirar Outra
                </Button>
                <Button
                  type="button"
                  onClick={confirmCapturedPhoto}
                  disabled={uploadingFoto}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {uploadingFoto ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-1" /> Usar Foto</>
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraActive}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="h-4 w-4 mr-1" />
                Capturar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
