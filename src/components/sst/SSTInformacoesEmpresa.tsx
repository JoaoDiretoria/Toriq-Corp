import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Upload, Trash2, Pencil, Building2, Target, Eye, Heart, User, ImageIcon, FileImage, Frame } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SignaturePad } from '@/components/ui/signature-pad';

// Lista de estados brasileiros
const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Tipos de registro profissional
const TIPOS_REGISTRO = [
  { value: 'CREA', label: 'CREA - Conselho Regional de Engenharia' },
  { value: 'MTE', label: 'MTE - Ministério do Trabalho' },
  { value: 'CRM', label: 'CRM - Conselho Regional de Medicina' },
  { value: 'COREN', label: 'COREN - Conselho Regional de Enfermagem' },
  { value: 'CRQ', label: 'CRQ - Conselho Regional de Química' },
  { value: 'OUTRO', label: 'Outro' },
];

interface InformacoesEmpresa {
  id?: string;
  empresa_id: string;
  missao: string;
  visao: string;
  valores: string;
  diretor_tecnico_nome: string;
  diretor_tecnico_formacao: string;
  diretor_tecnico_registro_tipo: string;
  diretor_tecnico_registro_numero: string;
  diretor_tecnico_registro_estado: string;
  diretor_tecnico_assinatura_url: string;
  diretor_tecnico_assinatura_tipo: 'upload' | 'desenho';
  logo_pequena_url: string;
  logo_grande_url: string;
  moldura_vertical_url: string;
  moldura_horizontal_url: string;
}

export function SSTInformacoesEmpresa() {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<InformacoesEmpresa>({
    empresa_id: '',
    missao: '',
    visao: '',
    valores: '',
    diretor_tecnico_nome: '',
    diretor_tecnico_formacao: '',
    diretor_tecnico_registro_tipo: '',
    diretor_tecnico_registro_numero: '',
    diretor_tecnico_registro_estado: '',
    diretor_tecnico_assinatura_url: '',
    diretor_tecnico_assinatura_tipo: 'upload',
    logo_pequena_url: '',
    logo_grande_url: '',
    moldura_vertical_url: '',
    moldura_horizontal_url: ''
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Usar empresa_id do modo empresa quando ativo, senão usar do contexto de auth
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  useEffect(() => {
    if (empresaId) {
      fetchInformacoes();
    }
  }, [empresaId]);

  const fetchInformacoes = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('informacoes_empresa')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const d = data as any;
        setFormData({
          id: d.id,
          empresa_id: d.empresa_id,
          missao: d.missao || '',
          visao: d.visao || '',
          valores: d.valores || '',
          diretor_tecnico_nome: d.diretor_tecnico_nome || '',
          diretor_tecnico_formacao: d.diretor_tecnico_formacao || '',
          diretor_tecnico_registro_tipo: d.diretor_tecnico_registro_tipo || '',
          diretor_tecnico_registro_numero: d.diretor_tecnico_registro_numero || '',
          diretor_tecnico_registro_estado: d.diretor_tecnico_registro_estado || '',
          diretor_tecnico_assinatura_url: d.diretor_tecnico_assinatura_url || '',
          diretor_tecnico_assinatura_tipo: d.diretor_tecnico_assinatura_tipo || 'upload',
          logo_pequena_url: d.logo_pequena_url || '',
          logo_grande_url: d.logo_grande_url || '',
          moldura_vertical_url: d.moldura_vertical_url || '',
          moldura_horizontal_url: d.moldura_horizontal_url || ''
        });
      } else {
        setFormData(prev => ({ ...prev, empresa_id: empresaId }));
      }
    } catch (error: any) {
      console.error('Erro ao buscar informações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as informações da empresa.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!empresaId) return;

    setSaving(true);
    try {
      const dataToSave = {
        empresa_id: empresaId,
        missao: formData.missao,
        visao: formData.visao,
        valores: formData.valores,
        diretor_tecnico_nome: formData.diretor_tecnico_nome,
        diretor_tecnico_formacao: formData.diretor_tecnico_formacao,
        diretor_tecnico_registro_tipo: formData.diretor_tecnico_registro_tipo,
        diretor_tecnico_registro_numero: formData.diretor_tecnico_registro_numero,
        diretor_tecnico_registro_estado: formData.diretor_tecnico_registro_estado,
        diretor_tecnico_assinatura_url: formData.diretor_tecnico_assinatura_url,
        diretor_tecnico_assinatura_tipo: formData.diretor_tecnico_assinatura_tipo,
        logo_pequena_url: formData.logo_pequena_url,
        logo_grande_url: formData.logo_grande_url,
        moldura_vertical_url: formData.moldura_vertical_url,
        moldura_horizontal_url: formData.moldura_horizontal_url
      };

      if (formData.id) {
        // Update
        const { error } = await (supabase as any)
          .from('informacoes_empresa')
          .update(dataToSave)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await (supabase as any)
          .from('informacoes_empresa')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setFormData(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Informações salvas com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as informações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAssinatura = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaId) return;

    // Validar tipo de arquivo
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos PNG ou JPG são permitidos.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'O arquivo deve ter no máximo 2MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `assinatura_diretor_${empresaId}_${Date.now()}.${fileExt}`;
      const filePath = `assinaturas/${fileName}`;

      // Upload para o storage (usando bucket 'treinamentos' que já existe)
      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        diretor_tecnico_assinatura_url: urlData.publicUrl
      }));

      toast({
        title: 'Sucesso',
        description: 'Assinatura enviada com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a assinatura.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAssinatura = () => {
    setFormData(prev => ({
      ...prev,
      diretor_tecnico_assinatura_url: ''
    }));
  };

  // Função para salvar assinatura desenhada
  const handleSaveSignature = async (signatureData: string) => {
    if (!empresaId) return;

    setUploading(true);
    try {
      // Converter base64 para blob
      const response = await fetch(signatureData);
      const blob = await response.blob();
      
      const fileName = `assinatura_diretor_${empresaId}_${Date.now()}.png`;
      const filePath = `assinaturas/${fileName}`;

      // Upload para o storage (usando bucket 'treinamentos' que já existe)
      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        diretor_tecnico_assinatura_url: urlData.publicUrl,
        diretor_tecnico_assinatura_tipo: 'desenho'
      }));

      setSignatureDialogOpen(false);
      toast({
        title: 'Sucesso',
        description: 'Assinatura salva com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao salvar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a assinatura.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // Função para upload de imagens (logo pequena, logo grande, molduras)
  const handleUploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: 'logo_pequena_url' | 'logo_grande_url' | 'moldura_vertical_url' | 'moldura_horizontal_url'
  ) => {
    const file = event.target.files?.[0];
    if (!file || !empresaId) return;

    // Validar tipo de arquivo
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos PNG, JPG ou WebP são permitidos.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'O arquivo deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingImage(imageType);
    try {
      const fileExt = file.name.split('.').pop();
      const typePrefix = imageType.replace('_url', '');
      const fileName = `${typePrefix}_${empresaId}_${Date.now()}.${fileExt}`;
      const filePath = `empresa-imagens/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('treinamentos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('treinamentos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [imageType]: urlData.publicUrl
      }));

      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(null);
      // Limpar o input
      event.target.value = '';
    }
  };

  // Função para remover imagem
  const handleRemoveImage = (imageType: 'logo_pequena_url' | 'logo_grande_url' | 'moldura_vertical_url' | 'moldura_horizontal_url') => {
    setFormData(prev => ({
      ...prev,
      [imageType]: ''
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="missao-visao-valores" className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-white">
          <TabsTrigger value="missao-visao-valores" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Missão, Visão e Valores
          </TabsTrigger>
          <TabsTrigger value="diretor-tecnico" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Diretor Técnico
          </TabsTrigger>
          <TabsTrigger value="imagens" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Imagens e Molduras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missao-visao-valores" className="space-y-4 mt-4">
          {/* Missão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-600" />
                Missão
              </CardTitle>
              <CardDescription>
                A razão de existir da empresa. O que a empresa faz e para quem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.missao}
                onChange={(e) => setFormData(prev => ({ ...prev, missao: e.target.value }))}
                placeholder="Ex: Promover a segurança e saúde no trabalho através de treinamentos de excelência..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Visão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-green-600" />
                Visão
              </CardTitle>
              <CardDescription>
                Onde a empresa quer chegar. O futuro desejado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.visao}
                onChange={(e) => setFormData(prev => ({ ...prev, visao: e.target.value }))}
                placeholder="Ex: Ser referência nacional em treinamentos de segurança do trabalho até 2030..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-red-600" />
                Valores
              </CardTitle>
              <CardDescription>
                Os princípios que guiam as ações da empresa. Separe cada valor em uma linha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.valores}
                onChange={(e) => setFormData(prev => ({ ...prev, valores: e.target.value }))}
                placeholder="Ex:&#10;Ética e transparência&#10;Compromisso com a segurança&#10;Excelência nos serviços&#10;Respeito às pessoas"
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diretor-tecnico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Diretor Técnico
              </CardTitle>
              <CardDescription>
                Informações do responsável técnico da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="diretor-nome">Nome Completo</Label>
                <Input
                  id="diretor-nome"
                  value={formData.diretor_tecnico_nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, diretor_tecnico_nome: e.target.value }))}
                  placeholder="Ex: João da Silva"
                />
              </div>

              {/* Formação */}
              <div className="space-y-2">
                <Label htmlFor="diretor-formacao">Formação</Label>
                <Input
                  id="diretor-formacao"
                  value={formData.diretor_tecnico_formacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, diretor_tecnico_formacao: e.target.value }))}
                  placeholder="Ex: Engenheiro de Segurança do Trabalho"
                />
              </div>

              {/* Registro Profissional */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Registro Profissional</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registro-tipo" className="text-sm">Tipo de Registro</Label>
                    <Select 
                      value={formData.diretor_tecnico_registro_tipo} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, diretor_tecnico_registro_tipo: v }))}
                    >
                      <SelectTrigger id="registro-tipo">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_REGISTRO.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registro-numero" className="text-sm">Número do Registro</Label>
                    <Input
                      id="registro-numero"
                      value={formData.diretor_tecnico_registro_numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, diretor_tecnico_registro_numero: e.target.value }))}
                      placeholder="Ex: 123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registro-estado" className="text-sm">Estado (UF)</Label>
                    <Select 
                      value={formData.diretor_tecnico_registro_estado} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, diretor_tecnico_registro_estado: v }))}
                    >
                      <SelectTrigger id="registro-estado">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Assinatura */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Assinatura Digital</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja adicionar a assinatura do diretor técnico
                </p>
                
                {/* Preview da assinatura */}
                {formData.diretor_tecnico_assinatura_url ? (
                  <div className="relative inline-block">
                    <div className="border rounded-lg p-4 bg-white inline-block">
                      <img
                        src={formData.diretor_tecnico_assinatura_url}
                        alt="Assinatura do Diretor Técnico"
                        className="max-h-32 max-w-xs object-contain"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {formData.diretor_tecnico_assinatura_tipo === 'desenho' ? '(Assinatura desenhada)' : '(Imagem enviada)'}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={handleRemoveAssinatura}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                    <Pencil className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma assinatura adicionada
                    </p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-3">
                  {/* Botão Desenhar */}
                  <Button
                    variant="outline"
                    onClick={() => setSignatureDialogOpen(true)}
                    disabled={uploading}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {formData.diretor_tecnico_assinatura_url ? 'Redesenhar Assinatura' : 'Desenhar Assinatura'}
                  </Button>

                  {/* Botão Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      handleUploadAssinatura(e);
                      setFormData(prev => ({ ...prev, diretor_tecnico_assinatura_tipo: 'upload' }));
                    }}
                    className="hidden"
                    id="assinatura-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {formData.diretor_tecnico_assinatura_url ? 'Trocar Assinatura' : 'Enviar Assinatura'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imagens" className="mt-4">
          <div className="space-y-6">
            {/* Logo da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileImage className="h-5 w-5 text-green-600" />
                  Logo da Empresa
                </CardTitle>
                <CardDescription>
                  Logo utilizada em cabeçalhos de documentos, certificados e relatórios. Recomendado: 200x80px (PNG ou JPG)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="relative max-w-md">
                  {formData.logo_pequena_url ? (
                    <div className="relative group">
                      <div className="border-2 border-dashed border-green-200 dark:border-green-800 rounded-lg p-6 bg-white dark:bg-gray-900 flex items-center justify-center min-h-[150px]">
                        <img
                          src={formData.logo_pequena_url}
                          alt="Logo da Empresa"
                          className="max-h-32 max-w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage('logo_pequena_url')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-900/50 min-h-[150px] flex flex-col items-center justify-center">
                      <FileImage className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhuma logo enviada</p>
                      <p className="text-xs text-muted-foreground mt-1">Clique no botão abaixo para enviar</p>
                    </div>
                  )}
                </div>
                
                {/* Upload Button */}
                <div className="max-w-md">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => handleUploadImage(e, 'logo_pequena_url')}
                    className="hidden"
                    id="logo-pequena-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logo-pequena-upload')?.click()}
                    disabled={uploadingImage === 'logo_pequena_url'}
                    className="w-full"
                  >
                    {uploadingImage === 'logo_pequena_url' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {formData.logo_pequena_url ? 'Trocar Logo' : 'Enviar Logo'}
                  </Button>
                </div>

                {/* Info */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Dica:</strong> Para gerenciar molduras de certificados, acesse a tela de <strong>Modelo de Certificado</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Botão de Salvar */}
      <div className="flex justify-end mt-6 pt-6 border-t">
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Informações
            </>
          )}
        </Button>
      </div>

      {/* Dialog para desenhar assinatura */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Desenhar Assinatura</DialogTitle>
            <DialogDescription>
              Use o mouse ou o dedo para desenhar a assinatura do diretor técnico
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <SignaturePad
              onSave={handleSaveSignature}
              onCancel={() => setSignatureDialogOpen(false)}
              width={400}
              height={200}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
