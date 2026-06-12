import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, Shield, Building2, Save, Package, CheckCircle2, Clock, Sparkles, AlertCircle, MessageSquarePlus, Upload, X } from 'lucide-react';

type StatusAtualizacao = 'sem_atualizacoes' | 'em_breve' | 'disponivel';

interface SugestaoForm {
  moduloId: string;
  moduloNome: string;
  nome: string;
  descricao: string;
  arquivos: File[];
}

interface ModuloSistema {
  id: string;
  nome: string;
  descricao: string | null;
  rota: string;
}

interface ModuloComStatus extends ModuloSistema {
  ativo: boolean;
  statusAtualizacao?: StatusAtualizacao;
}

export function SSTMeuPerfil() {
  const { user, profile, empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState(profile?.nome || '');
  const [telefone, setTelefone] = useState('');
  const [modulos, setModulos] = useState<ModuloComStatus[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(true);
  const [sugestaoDialogOpen, setSugestaoDialogOpen] = useState(false);
  const [sugestaoForm, setSugestaoForm] = useState<SugestaoForm>({
    moduloId: '',
    moduloNome: '',
    nome: '',
    descricao: '',
    arquivos: []
  });
  const [enviandoSugestao, setEnviandoSugestao] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const inputBaseStyles =
    'bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 px-4 py-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:placeholder:text-gray-400';

  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;

  const maskPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    let masked = cleaned;
    if (cleaned.length > 0) masked = '(' + cleaned;
    if (cleaned.length > 2) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2);
    if (cleaned.length > 7) masked = '(' + cleaned.slice(0, 2) + ') ' + cleaned.slice(2, 7) + '-' + cleaned.slice(7);
    return masked;
  };

  // Buscar telefone do perfil
  // NOTA (migração): ProfileOut do backend não expõe `telefone` ainda — campo
  // inicializa vazio; o usuário pode digitar e salvar normalmente.
  useEffect(() => {
    // degradação: telefone não disponível via /auth/me; campo inicia vazio
  }, [user?.id]);

  // Buscar logo atual da empresa
  useEffect(() => {
    const fetchLogo = async () => {
      if (!empresaId) return;

      try {
        const data = await api.get<any>(`/empresas/${empresaId}`).catch(() => null);

        if (data?.logo_url) {
          setLogoUrl(data.logo_url);
        }
      } catch (error) {
        console.error('Erro ao buscar logo:', error);
      }
    };

    fetchLogo();
  }, [empresaId]);

  // Função para fazer upload da logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      // Upload para o storage via backend (RustFS)
      const formData = new FormData();
      formData.append('file', file);

      const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const uploadRes = await fetch(`${API_URL}/storage/logos-empresas/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error((err as any).detail || 'Erro ao fazer upload');
      }

      const uploadData: any = await uploadRes.json();
      const publicUrl: string = uploadData.url;
      const key: string = uploadData.key;

      // Atualizar URL na tabela empresas via backend
      await api.put<any>(`/empresas/${empresaId}`, { logo_url: publicUrl });

      setLogoUrl(publicUrl);
      setLogoKey(key);
      toast({
        title: "Logo atualizada",
        description: "A logo da empresa foi atualizada com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload da logo:', error);
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Não foi possível fazer upload da logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  // Função para remover a logo
  const handleRemoveLogo = async () => {
    if (!empresaId) return;

    setUploadingLogo(true);
    try {
      // Remover do storage via backend (apenas se tivermos a key da sessão atual)
      // NOTA (migração): delete do objeto no storage só é possível quando a key é
      // conhecida (upload feito na sessão corrente). Para logos legadas (URL Supabase),
      // o arquivo no storage antigo não é removido — apenas a referência na empresa.
      if (logoKey) {
        await api.del(`/storage/logos-empresas/${logoKey}`).catch((err: any) =>
          console.warn('Erro ao remover arquivo do storage:', err)
        );
      }

      // Atualizar URL na tabela empresas via backend
      await api.put<any>(`/empresas/${empresaId}`, { logo_url: null });

      setLogoUrl(null);
      setLogoKey(null);
      toast({
        title: "Logo removida",
        description: "A logo da empresa foi removida com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      toast({
        title: "Erro ao remover logo",
        description: error.message || "Não foi possível remover a logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    const fetchModulos = async () => {
      if (!empresaId) {
        setLoadingModulos(false);
        return;
      }

      try {
        // Buscar todos os módulos do sistema
        const todosModulos = await api.get<any[]>('/modulos').catch(() => [] as any[]);

        // Buscar módulos ativos da empresa (escopado pelo token; filtrar ativo no cliente)
        const empresaModulos = await api.get<any[]>('/empresas-modulos').catch(() => [] as any[]);
        const modulosAtivos = (empresaModulos || []).filter((m: any) => m.ativo === true);

        const modulosAtivosIds = new Set(modulosAtivos.map((m: any) => m.modulo_id));

        // Combinar módulos com status (ordenar por nome no cliente)
        const modulosOrdenados = (todosModulos || []).slice().sort((a: any, b: any) =>
          (a.nome || '').localeCompare(b.nome || '')
        );

        const modulosComStatus: ModuloComStatus[] = modulosOrdenados.map((modulo: any) => ({
          ...modulo,
          ativo: modulosAtivosIds.has(modulo.id),
          statusAtualizacao: 'sem_atualizacoes' as StatusAtualizacao
        }));

        setModulos(modulosComStatus);
      } catch (error: any) {
        console.error('Erro ao carregar módulos:', error);
        toast({
          title: "Erro ao carregar módulos",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingModulos(false);
      }
    };

    fetchModulos();
  }, [empresaId, toast]);

  const handleContratar = (moduloNome: string) => {
    toast({
      title: "Solicitação enviada",
      description: `Sua solicitação para contratar o módulo "${moduloNome}" foi enviada. Em breve entraremos em contato.`,
    });
  };

  const getStatusAtualizacaoButton = (status: StatusAtualizacao) => {
    switch (status) {
      case 'sem_atualizacoes':
        return (
          <Button variant="ghost" size="sm" className="text-muted-foreground" disabled>
            <Clock className="h-4 w-4 mr-1" />
            Sem atualizações previstas
          </Button>
        );
      case 'em_breve':
        return (
          <Button variant="ghost" size="sm" className="text-amber-600">
            <Sparkles className="h-4 w-4 mr-1" />
            Em breve
          </Button>
        );
      case 'disponivel':
        return (
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
            <AlertCircle className="h-4 w-4 mr-1" />
            Atualização disponível
          </Button>
        );
      default:
        return null;
    }
  };

  const handleOpenSugestaoDialog = (moduloId: string, moduloNome: string) => {
    setSugestaoForm({
      moduloId,
      moduloNome,
      nome: '',
      descricao: '',
      arquivos: []
    });
    setSugestaoDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSugestaoForm(prev => ({
        ...prev,
        arquivos: [...prev.arquivos, ...Array.from(files)]
      }));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSugestaoForm(prev => ({
      ...prev,
      arquivos: prev.arquivos.filter((_, i) => i !== index)
    }));
  };

  const handleEnviarSugestao = async () => {
    if (!sugestaoForm.nome.trim() || !sugestaoForm.descricao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome e a descrição da sugestão.",
        variant: "destructive",
      });
      return;
    }

    setEnviandoSugestao(true);
    try {
      // Simular envio - aqui você pode implementar a lógica real de envio
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Sugestão enviada!",
        description: `Sua sugestão para o módulo "${sugestaoForm.moduloNome}" foi enviada com sucesso. Obrigado pelo feedback!`,
      });

      setSugestaoDialogOpen(false);
      setSugestaoForm({
        moduloId: '',
        moduloNome: '',
        nome: '',
        descricao: '',
        arquivos: []
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar sugestão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnviandoSugestao(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Atualiza nome via /admin/users/{id} (aceita: nome, role, ativo)
      // NOTA (migração): campo `telefone` não está no schema AdminUserUpdateIn do backend;
      // apenas o nome é persistido — telefone fica como dado visual temporário na sessão.
      await api.put<any>(`/admin/users/${user.id}`, { nome });

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case 'admin_vertical':
        return <Badge variant="destructive">Admin Toriq</Badge>;
      case 'cliente_torq':
        return <Badge variant="default">Colaborador</Badge>;
      case 'cliente_final':
        return <Badge variant="secondary">Cliente Final</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Seus dados de cadastro</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className={inputBaseStyles}
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className={cn(inputBaseStyles, 'pl-10 cursor-not-allowed')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="telefone"
                  value={maskPhone(telefone)}
                  onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="(00) 00000-0000"
                  className={cn(inputBaseStyles, 'pl-10')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {getRoleBadge(profile?.role)}
              </div>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>

        {/* Informações da Empresa Vinculada */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Empresa Vinculada</CardTitle>
                <CardDescription>Informações da sua empresa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa ? (
              <>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={empresa.nome}
                    disabled
                    className={cn(inputBaseStyles, 'cursor-not-allowed')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={empresa.tipo === 'sst' ? 'Toriq Corp' : empresa.tipo}
                    disabled
                    className={cn(inputBaseStyles, 'cursor-not-allowed')}
                  />
                </div>

                {/* Upload de Logo */}
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-start gap-4">
                    {/* Preview da logo */}
                    <div className="flex-shrink-0 w-32 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo da empresa" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex flex-col gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                          </>
                        )}
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={uploadingLogo}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG até 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhuma empresa vinculada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Módulos do Sistema */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Módulos Toriq Pro</CardTitle>
              <CardDescription>Módulos disponíveis no sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingModulos ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : modulos.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhum módulo disponível no sistema
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Atualizações</TableHead>
                  <TableHead className="text-center">Sugestão para atualizações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulos.map((modulo) => (
                  <TableRow key={modulo.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{modulo.nome}</p>
                        {modulo.descricao && (
                          <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {modulo.ativo ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Ativo</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContratar(modulo.nome)}
                        >
                          Contratar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {modulo.ativo && getStatusAtualizacaoButton(modulo.statusAtualizacao || 'sem_atualizacoes')}
                    </TableCell>
                    <TableCell className="text-center">
                      {modulo.ativo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSugestaoDialog(modulo.id, modulo.nome)}
                        >
                          <MessageSquarePlus className="h-4 w-4 mr-1" />
                          Enviar sugestão
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Sugestão */}
      <Dialog open={sugestaoDialogOpen} onOpenChange={setSugestaoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Sugestão de Atualização</DialogTitle>
            <DialogDescription>
              Módulo: <strong>{sugestaoForm.moduloNome}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sugestao-nome">Nome da Sugestão *</Label>
              <Input
                id="sugestao-nome"
                placeholder="Ex: Adicionar filtro por data"
                value={sugestaoForm.nome}
                onChange={(e) => setSugestaoForm(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sugestao-descricao">Descrição *</Label>
              <Textarea
                id="sugestao-descricao"
                placeholder="Descreva detalhadamente o que você gostaria que fosse atualizado ou adicionado..."
                rows={4}
                value={sugestaoForm.descricao}
                onChange={(e) => setSugestaoForm(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prints/Imagens (opcional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para fazer upload de imagens</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG até 5MB</span>
                </label>
              </div>
              {sugestaoForm.arquivos.length > 0 && (
                <div className="space-y-2 mt-2">
                  {sugestaoForm.arquivos.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSugestaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarSugestao} disabled={enviandoSugestao}>
              {enviandoSugestao ? 'Enviando...' : 'Enviar Sugestão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
