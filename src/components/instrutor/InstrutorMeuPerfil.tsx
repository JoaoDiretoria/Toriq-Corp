import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SignaturePad } from '@/components/ui/signature-pad';
import { AlterarSenhaDialog } from '@/components/shared/AlterarSenhaDialog';
import { User, Mail, Phone, Shield, Calendar, Key, UserCircle, MapPin, GraduationCap, Car, Award, BookOpen, Pencil, Upload, Trash2, FileText, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_REGISTRO = [
  { value: 'CREA', label: 'CREA - Conselho Regional de Engenharia' },
  { value: 'MTE', label: 'MTE - Ministério do Trabalho' },
  { value: 'CRM', label: 'CRM - Conselho Regional de Medicina' },
  { value: 'COREN', label: 'COREN - Conselho Regional de Enfermagem' },
  { value: 'CRQ', label: 'CRQ - Conselho Regional de Química' },
  { value: 'CFT', label: 'CFT - Conselho Federal dos Técnicos' },
  { value: 'OUTRO', label: 'Outro' },
];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface InstrutorCompleto {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  uf: string | null;
  formacao_academica: string | null;
  veiculo: string | null;
  placa: string | null;
  treinamentos_count: number;
  assinatura_url: string | null;
  assinatura_tipo: string | null;
}

interface TreinamentoComAnexo { 
  id: string; 
  nome: string; 
  norma: string; 
  anexo_url?: string | null;
}
interface Treinamento { id: string; nome: string; norma: string; }
interface InstrutorFormacao { 
  id: string; 
  nome: string; 
  registro_tipo: string | null;
  registro_numero: string | null;
  registro_estado: string | null;
  anexo_url: string | null;
  treinamentos: TreinamentoComAnexo[]; 
}

const db = supabase as any;

export function InstrutorMeuPerfil() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [instrutor, setInstrutor] = useState<InstrutorCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [instrutorFormacoes, setInstrutorFormacoes] = useState<InstrutorFormacao[]>([]);
  const [treinamentosInstrutor, setTreinamentosInstrutor] = useState<Treinamento[]>([]);
  const [equipamentosInstrutor, setEquipamentosInstrutor] = useState<Record<string, { nome: string; quantidade: number }[]>>({});
  
  // Estados para edição de formação
  const [editingFormacao, setEditingFormacao] = useState<InstrutorFormacao | null>(null);
  const [formacaoDialogOpen, setFormacaoDialogOpen] = useState(false);
  const [savingFormacao, setSavingFormacao] = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [uploadingTreinamentoAnexo, setUploadingTreinamentoAnexo] = useState<string | null>(null);
  const [treinamentoAnexos, setTreinamentoAnexos] = useState<Record<string, string>>({});
  
  // Estados para assinatura
  const [assinaturaDialogOpen, setAssinaturaDialogOpen] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploadingAssinatura, setUploadingAssinatura] = useState(false);
  const [tempAssinaturaUrl, setTempAssinaturaUrl] = useState('');
  
  // Estado para alterar senha
  const [alterarSenhaDialogOpen, setAlterarSenhaDialogOpen] = useState(false);

  useEffect(() => { if (profile) fetchInstrutor(); }, [profile]);

  const fetchInstrutor = async () => {
    if (!profile) return;
    try {
      console.log('Buscando instrutor para user_id:', profile.id);
      const { data, error } = await db.from('instrutores').select('*').eq('user_id', profile.id).single();
      console.log('Instrutor encontrado:', data, 'Erro:', error);
      if (error) throw error;
      setInstrutor(data);
      if (data) { 
        console.log('Instrutor ID:', data.id);
        fetchInstrutorFormacoes(data.id); 
        fetchTreinamentosInstrutor(data.id);
        fetchInstrutorEquipamentos(data.id);
      }
    } catch (error: any) {
      console.error('Erro ao buscar instrutor:', error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchInstrutorFormacoes = async (id: string) => {
    console.log('Buscando formações para instrutor_id:', id);
    const { data: formacoes, error } = await db.from('instrutor_formacoes').select('id, nome, registro_tipo, registro_numero, registro_estado, anexo_url').eq('instrutor_id', id);
    console.log('Formações encontradas:', formacoes, 'Erro:', error);
    
    if (formacoes) {
      // Buscar vínculos formação-treinamento
      const { data: vinculos } = await db
        .from('instrutor_formacao_treinamento')
        .select('formacao_id, treinamento_id, anexo_url, catalogo_treinamentos (id, nome, norma)')
        .eq('instrutor_id', id);
      
      console.log('Vínculos formação-treinamento:', vinculos);
      
      // Mapear formações com seus treinamentos
      const formacoesComTreinamentos = formacoes.map((f: any) => {
        const treinamentosVinculados = (vinculos || [])
          .filter((v: any) => v.formacao_id === f.id)
          .map((v: any) => ({
            id: v.treinamento_id,
            nome: v.catalogo_treinamentos?.nome || '',
            norma: v.catalogo_treinamentos?.norma || '',
            anexo_url: v.anexo_url || null
          }));
        
        return {
          id: f.id,
          nome: f.nome,
          registro_tipo: f.registro_tipo,
          registro_numero: f.registro_numero,
          registro_estado: f.registro_estado,
          anexo_url: f.anexo_url,
          treinamentos: treinamentosVinculados
        };
      });
      
      setInstrutorFormacoes(formacoesComTreinamentos);
    }
  };

  const fetchTreinamentosInstrutor = async (id: string) => {
    console.log('Buscando treinamentos para instrutor_id:', id);
    const { data, error } = await db.from('instrutor_treinamentos').select('*, catalogo_treinamentos (id, nome, norma)').eq('instrutor_id', id);
    console.log('Treinamentos encontrados:', data, 'Erro:', error);
    if (data) {
      const t = data.map((x: any) => ({ id: x.treinamento_id, nome: x.catalogo_treinamentos?.nome || '', norma: x.catalogo_treinamentos?.norma || '' }));
      t.sort((a: any, b: any) => parseInt(a.norma?.replace(/\D/g, '') || '999') - parseInt(b.norma?.replace(/\D/g, '') || '999'));
      setTreinamentosInstrutor(t);
    }
  };

  const fetchInstrutorEquipamentos = async (id: string) => {
    try {
      const { data, error } = await db
        .from('instrutor_equipamentos')
        .select('treinamento_id, equipamento_nome, quantidade, catalogo_treinamentos (id, nome, norma)')
        .eq('instrutor_id', id);

      if (error) throw error;

      // Agrupar por treinamento
      const equipamentosMap: Record<string, { nome: string; quantidade: number; treinamentoNome?: string; treinamentoNorma?: string }[]> = {};
      (data || []).forEach((item: any) => {
        if (!equipamentosMap[item.treinamento_id]) {
          equipamentosMap[item.treinamento_id] = [];
        }
        equipamentosMap[item.treinamento_id].push({
          nome: item.equipamento_nome,
          quantidade: item.quantidade,
          treinamentoNome: item.catalogo_treinamentos?.nome,
          treinamentoNorma: item.catalogo_treinamentos?.norma,
        });
      });
      setEquipamentosInstrutor(equipamentosMap);
    } catch (error) {
      console.error('Erro ao carregar equipamentos do instrutor:', error);
    }
  };

  const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  const formatCpf = (c: string) => c ? c.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
  const formatTel = (t: string) => { if (!t) return ''; const n = t.replace(/\D/g, ''); return n.length === 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); };
  const formatCep = (c: string) => c ? c.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : '';

  // Função para salvar formação editada
  const handleSaveFormacao = async () => {
    if (!editingFormacao || !instrutor) return;
    
    setSavingFormacao(true);
    try {
      const { error } = await db
        .from('instrutor_formacoes')
        .update({
          registro_tipo: editingFormacao.registro_tipo,
          registro_numero: editingFormacao.registro_numero,
          registro_estado: editingFormacao.registro_estado,
          anexo_url: editingFormacao.anexo_url,
        })
        .eq('id', editingFormacao.id);
      
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Formação atualizada com sucesso!" });
      setFormacaoDialogOpen(false);
      setEditingFormacao(null);
      fetchInstrutorFormacoes(instrutor.id);
    } catch (error: any) {
      console.error('Erro ao salvar formação:', error);
      toast({ title: "Erro", description: "Não foi possível salvar a formação.", variant: "destructive" });
    } finally {
      setSavingFormacao(false);
    }
  };

  // Função para upload de anexo da formação
  const handleUploadAnexoFormacao = async (file: File) => {
    if (!editingFormacao || !instrutor) return;
    
    setUploadingAnexo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${instrutor.empresa_id}/instrutores/${instrutor.id}/formacoes/${editingFormacao.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('instrutor-documentos')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('instrutor-documentos')
        .getPublicUrl(fileName);
      
      setEditingFormacao({ ...editingFormacao, anexo_url: urlData.publicUrl });
      toast({ title: "Sucesso", description: "Anexo da formação enviado!" });
    } catch (error: any) {
      console.error('Erro ao enviar anexo:', error);
      toast({ title: "Erro", description: "Não foi possível enviar o anexo.", variant: "destructive" });
    } finally {
      setUploadingAnexo(false);
    }
  };

  // Função para upload de anexo de treinamento
  const handleUploadAnexoTreinamento = async (file: File, treinamentoId: string) => {
    if (!editingFormacao || !instrutor) return;
    
    setUploadingTreinamentoAnexo(treinamentoId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${instrutor.empresa_id}/instrutores/${instrutor.id}/treinamentos/${editingFormacao.id}_${treinamentoId}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('instrutor-documentos')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('instrutor-documentos')
        .getPublicUrl(fileName);
      
      // Atualizar o anexo no banco
      await db
        .from('instrutor_formacao_treinamento')
        .update({ anexo_url: urlData.publicUrl })
        .eq('formacao_id', editingFormacao.id)
        .eq('treinamento_id', treinamentoId)
        .eq('instrutor_id', instrutor.id);
      
      // Atualizar estado local
      setTreinamentoAnexos(prev => ({ ...prev, [treinamentoId]: urlData.publicUrl }));
      
      // Atualizar editingFormacao
      setEditingFormacao({
        ...editingFormacao,
        treinamentos: editingFormacao.treinamentos.map(t => 
          t.id === treinamentoId ? { ...t, anexo_url: urlData.publicUrl } : t
        )
      });
      
      toast({ title: "Sucesso", description: "Anexo do treinamento enviado!" });
    } catch (error: any) {
      console.error('Erro ao enviar anexo:', error);
      toast({ title: "Erro", description: "Não foi possível enviar o anexo.", variant: "destructive" });
    } finally {
      setUploadingTreinamentoAnexo(null);
    }
  };

  // Função para remover anexo de treinamento
  const handleRemoveAnexoTreinamento = async (treinamentoId: string) => {
    if (!editingFormacao || !instrutor) return;
    
    try {
      await db
        .from('instrutor_formacao_treinamento')
        .update({ anexo_url: null })
        .eq('formacao_id', editingFormacao.id)
        .eq('treinamento_id', treinamentoId)
        .eq('instrutor_id', instrutor.id);
      
      setTreinamentoAnexos(prev => {
        const newAnexos = { ...prev };
        delete newAnexos[treinamentoId];
        return newAnexos;
      });
      
      setEditingFormacao({
        ...editingFormacao,
        treinamentos: editingFormacao.treinamentos.map(t => 
          t.id === treinamentoId ? { ...t, anexo_url: null } : t
        )
      });
      
      toast({ title: "Sucesso", description: "Anexo removido!" });
    } catch (error: any) {
      console.error('Erro ao remover anexo:', error);
      toast({ title: "Erro", description: "Não foi possível remover o anexo.", variant: "destructive" });
    }
  };

  // Função para salvar assinatura
  const handleSaveAssinatura = async (assinaturaUrl: string, tipo: 'upload' | 'desenho') => {
    if (!instrutor) return;
    
    setUploadingAssinatura(true);
    try {
      const { error } = await db
        .from('instrutores')
        .update({
          assinatura_url: assinaturaUrl,
          assinatura_tipo: tipo,
        })
        .eq('id', instrutor.id);
      
      if (error) throw error;
      
      setInstrutor({ ...instrutor, assinatura_url: assinaturaUrl, assinatura_tipo: tipo });
      toast({ title: "Sucesso", description: "Assinatura salva com sucesso!" });
      setAssinaturaDialogOpen(false);
      setShowSignaturePad(false);
      setTempAssinaturaUrl('');
    } catch (error: any) {
      console.error('Erro ao salvar assinatura:', error);
      toast({ title: "Erro", description: "Não foi possível salvar a assinatura.", variant: "destructive" });
    } finally {
      setUploadingAssinatura(false);
    }
  };

  // Função para upload de assinatura (imagem)
  const handleUploadAssinatura = async (file: File) => {
    if (!instrutor) return;
    
    setUploadingAssinatura(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `assinatura_${instrutor.id}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('instrutor-assinaturas')
        .upload(fileName, file, { contentType: file.type });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('instrutor-assinaturas')
        .getPublicUrl(fileName);
      
      await handleSaveAssinatura(urlData.publicUrl, 'upload');
    } catch (error: any) {
      console.error('Erro ao enviar assinatura:', error);
      toast({ title: "Erro", description: "Não foi possível enviar a assinatura.", variant: "destructive" });
      setUploadingAssinatura(false);
    }
  };

  // Função para salvar assinatura desenhada
  const handleSaveDrawnSignature = async (signatureData: string) => {
    if (!instrutor) return;
    
    setUploadingAssinatura(true);
    try {
      const response = await fetch(signatureData);
      const blob = await response.blob();
      const fileName = `assinatura_desenho_${instrutor.id}_${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from('instrutor-assinaturas')
        .upload(fileName, blob, { contentType: 'image/png' });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('instrutor-assinaturas')
        .getPublicUrl(fileName);
      
      await handleSaveAssinatura(urlData.publicUrl, 'desenho');
    } catch (error: any) {
      console.error('Erro ao salvar assinatura:', error);
      toast({ title: "Erro", description: "Não foi possível salvar a assinatura.", variant: "destructive" });
      setUploadingAssinatura(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="h-7 w-7 text-primary" />Meu Perfil</h1><p className="text-muted-foreground">Visualize suas informações</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><div className="flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-lg"><User className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Instrutor</p><p className="font-semibold">{instrutor?.nome?.split(' ')[0] || 'N/A'}</p></div></div></CardContent></Card>
        <Card className="border-info/20 bg-info/5"><CardContent className="pt-4"><div className="flex items-center gap-4"><div className="p-3 bg-info/10 rounded-lg"><BookOpen className="h-6 w-6 text-info" /></div><div><p className="text-sm text-info">Treinamentos</p><p className="font-semibold text-info">{treinamentosInstrutor.length}</p></div></div></CardContent></Card>
        <Card className="border-success/20 bg-success/5"><CardContent className="pt-4"><div className="flex items-center gap-4"><div className="p-3 bg-success/10 rounded-lg"><GraduationCap className="h-6 w-6 text-success" /></div><div><p className="text-sm text-success">Formações</p><p className="font-semibold text-success">{instrutorFormacoes.length}</p></div></div></CardContent></Card>
        <Card className="border-warning/20 bg-warning/5"><CardContent className="pt-4"><div className="flex items-center gap-4"><div className="p-3 bg-warning/10 rounded-lg"><MapPin className="h-6 w-6 text-warning" /></div><div><p className="text-sm text-warning">Localização</p><p className="font-semibold text-warning">{instrutor?.cidade ? `${instrutor.cidade}/${instrutor.uf}` : 'N/A'}</p></div></div></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><div className="flex items-center gap-3"><Avatar className="h-12 w-12"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{instrutor?.nome ? getInitials(instrutor.nome) : 'IN'}</AvatarFallback></Avatar><div><CardTitle className="text-lg">{instrutor?.nome || 'Instrutor'}</CardTitle><CardDescription>{instrutor?.email}</CardDescription></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 gap-3">{[{icon: User, label: 'Nome', value: instrutor?.nome}, {icon: Mail, label: 'E-mail', value: instrutor?.email}, {icon: Phone, label: 'Telefone', value: instrutor?.telefone ? formatTel(instrutor.telefone) : null}, {icon: Shield, label: 'CPF', value: instrutor?.cpf_cnpj ? formatCpf(instrutor.cpf_cnpj) : null}].map((item, i) => item.value && <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"><item.icon className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-medium">{item.value}</p></div></div>)}</div><Separator /><Button variant="outline" className="w-full" onClick={() => setAlterarSenhaDialogOpen(true)}><Key className="h-4 w-4 mr-2" />Alterar Senha</Button></CardContent></Card>
        <div className="space-y-6"><Card><CardHeader><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><CardTitle>Endereço</CardTitle></div></CardHeader><CardContent>{instrutor?.logradouro ? <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Endereço</p><p className="font-medium text-sm">{[instrutor.logradouro, instrutor.numero, instrutor.bairro, instrutor.cidade, instrutor.uf].filter(Boolean).join(', ')}</p></div> : <div className="text-center py-4 text-muted-foreground"><MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Não cadastrado</p></div>}</CardContent></Card>{instrutor?.veiculo && <Card><CardHeader><div className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" /><CardTitle>Veículo</CardTitle></div></CardHeader><CardContent><div className="p-3 bg-muted/50 rounded-lg"><p className="font-medium">{instrutor.veiculo}</p>{instrutor.placa && <Badge variant="outline" className="mt-2">{instrutor.placa}</Badge>}</div></CardContent></Card>}</div>
      </div>
      {/* Card de Formações e Treinamentos com edição */}
      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-success" />
              <CardTitle className="text-success">Minhas Formações e Treinamentos</CardTitle>
            </div>
          </div>
          <CardDescription>Formações cadastradas e seus treinamentos vinculados. Clique em uma formação para editar.</CardDescription>
        </CardHeader>
        <CardContent>
          {instrutorFormacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma formação cadastrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {instrutorFormacoes.map(f => (
                <div key={f.id} className="p-4 bg-card border rounded-lg hover:border-success/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-success" />
                      <p className="font-semibold text-success">{f.nome}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingFormacao(f);
                        setFormacaoDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                  
                  {/* Informações de registro */}
                  {(f.registro_tipo || f.registro_numero) && (
                    <div className="ml-7 mb-2 p-2 bg-warning/10 rounded text-sm">
                      <span className="text-warning font-medium">Registro: </span>
                      <span className="text-warning/80">
                        {f.registro_tipo} {f.registro_numero} {f.registro_estado ? `- ${f.registro_estado}` : ''}
                      </span>
                    </div>
                  )}
                  
                  {/* Anexo da formação */}
                  {f.anexo_url && (
                    <div className="ml-7 mb-2">
                      <a href={f.anexo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-info hover:underline">
                        <FileText className="h-4 w-4" />
                        Ver anexo da formação
                      </a>
                    </div>
                  )}
                  
                  {f.treinamentos && f.treinamentos.length > 0 ? (
                    <div className="ml-7">
                      <p className="text-xs text-muted-foreground mb-2">Treinamentos vinculados:</p>
                      <div className="flex flex-wrap gap-2">
                        {f.treinamentos.map((t: any) => (
                          <div key={t.id} className="inline-flex items-center gap-1">
                            <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                              {t.norma} - {t.nome}
                            </Badge>
                            {t.anexo_url && (
                              <a href={t.anexo_url} target="_blank" rel="noopener noreferrer" title="Ver anexo do treinamento">
                                <FileText className="h-3 w-3 text-success hover:text-success/80" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="ml-7 text-xs text-muted-foreground">Nenhum treinamento vinculado</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Equipamentos Próprios */}
      {Object.keys(equipamentosInstrutor).length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Meus Equipamentos</CardTitle>
            </div>
            <CardDescription>Equipamentos próprios cadastrados por treinamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(equipamentosInstrutor).map(([treinamentoId, equipamentos]) => {
                if (equipamentos.length === 0) return null;
                const primeiroEquip = equipamentos[0] as any;
                return (
                  <div key={treinamentoId} className="p-4 bg-card border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {primeiroEquip.treinamentoNorma}
                      </Badge>
                      <span className="font-medium text-warning">{primeiroEquip.treinamentoNome}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {equipamentos.map((eq: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="bg-warning/10 text-warning">
                          {eq.nome} <span className="ml-1 text-warning/70">(x{eq.quantidade})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card de Assinatura Digital */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-secondary" />
              <CardTitle className="text-secondary">Minha Assinatura Digital</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssinaturaDialogOpen(true);
                setShowSignaturePad(false);
              }}
            >
              {instrutor?.assinatura_url ? 'Alterar' : 'Adicionar'}
            </Button>
          </div>
          <CardDescription>Assinatura usada nos certificados emitidos</CardDescription>
        </CardHeader>
        <CardContent>
          {instrutor?.assinatura_url ? (
            <div className="text-center">
              <div className="inline-block p-4 bg-card border rounded-lg">
                <img src={instrutor.assinatura_url} alt="Assinatura" className="max-h-24 object-contain" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ({instrutor.assinatura_tipo === 'desenho' ? 'Assinatura desenhada' : 'Imagem enviada'})
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Pencil className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma assinatura cadastrada</p>
              <p className="text-xs mt-1">Clique em "Adicionar" para cadastrar sua assinatura</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card><CardHeader><div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><CardTitle>Segurança</CardTitle></div></CardHeader><CardContent><div className="flex items-center gap-3 p-4 border rounded-lg"><div className="p-2 bg-success/10 rounded-full"><Mail className="h-5 w-5 text-success" /></div><div><p className="font-medium">E-mail Verificado</p><p className="text-sm text-muted-foreground">{user?.email_confirmed_at ? 'Sim' : 'Pendente'}</p></div></div></CardContent></Card>

      {/* Dialog de Edição de Formação */}
      <Dialog open={formacaoDialogOpen} onOpenChange={setFormacaoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-success" />
              Editar Formação
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-success">
              {editingFormacao?.nome}
            </DialogDescription>
          </DialogHeader>
          
          {editingFormacao && (
            <div className="space-y-5">
              {/* Seção 1: Registro Profissional */}
              <div className="bg-warning/5 rounded-lg p-4 border border-warning/20">
                <h4 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Registro Profissional
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-warning">Tipo de Registro</Label>
                    <Select 
                      value={editingFormacao.registro_tipo || ''} 
                      onValueChange={(value) => setEditingFormacao({ ...editingFormacao, registro_tipo: value })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_REGISTRO.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-warning">Número</Label>
                    <Input 
                      className="bg-white"
                      placeholder="Ex: 123456"
                      value={editingFormacao.registro_numero || ''}
                      onChange={(e) => setEditingFormacao({ ...editingFormacao, registro_numero: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-warning">Estado (UF)</Label>
                    <Select 
                      value={editingFormacao.registro_estado || ''} 
                      onValueChange={(value) => setEditingFormacao({ ...editingFormacao, registro_estado: value })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BR.map(estado => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção 2: Anexo da Formação */}
              <div className="bg-success/5 rounded-lg p-4 border border-success/20">
                <h4 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Anexo da Formação (Certificado/Diploma)
                </h4>
                {editingFormacao.anexo_url ? (
                  <div className="flex items-center gap-3 p-3 bg-card border border-success/30 rounded-lg">
                    <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success">Anexo enviado</p>
                      <a href={editingFormacao.anexo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-success hover:underline">
                        Clique para visualizar
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingFormacao({ ...editingFormacao, anexo_url: null })}
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-3 p-4 bg-card border-2 border-dashed border-success/30 rounded-lg cursor-pointer hover:border-success hover:bg-success/5 transition-colors">
                    {uploadingAnexo ? (
                      <Loader2 className="h-5 w-5 animate-spin text-success" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-success" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-success">Clique para enviar</p>
                          <p className="text-xs text-success/80">PDF, PNG ou JPG</p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAnexoFormacao(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Seção 3: Anexos dos Treinamentos */}
              {editingFormacao.treinamentos && editingFormacao.treinamentos.length > 0 && (
                <div className="bg-info/5 rounded-lg p-4 border border-info/20">
                  <h4 className="text-sm font-semibold text-info mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Anexos dos Treinamentos Vinculados
                    <span className="text-xs font-normal text-info ml-auto">
                      {editingFormacao.treinamentos.length} treinamento(s)
                    </span>
                  </h4>
                  <p className="text-xs text-info mb-3">
                    Envie certificados ou comprovantes para cada treinamento que você ministra.
                  </p>
                  
                  <div className="space-y-2">
                    {editingFormacao.treinamentos.map((treinamento) => (
                      <div 
                        key={treinamento.id} 
                        className="flex items-center gap-3 p-3 bg-card border border-info/20 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              {treinamento.norma}
                            </span>
                            <span className="text-sm text-foreground truncate">{treinamento.nome}</span>
                          </div>
                        </div>
                        
                        {treinamento.anexo_url ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={treinamento.anexo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-info hover:underline flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Ver anexo
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAnexoTreinamento(treinamento.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            {uploadingTreinamentoAnexo === treinamento.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-info" />
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-info hover:text-info/80 bg-info/10 hover:bg-info/20 px-2 py-1 rounded transition-colors">
                                <Upload className="h-3 w-3" />
                                Enviar
                              </div>
                            )}
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg,image/jpg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadAnexoTreinamento(file, treinamento.id);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFormacaoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFormacao} disabled={savingFormacao} className="bg-green-600 hover:bg-green-700">
              {savingFormacao ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Assinatura */}
      <Dialog open={assinaturaDialogOpen} onOpenChange={setAssinaturaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Minha Assinatura Digital</DialogTitle>
            <DialogDescription>Escolha como deseja adicionar sua assinatura</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!showSignaturePad ? (
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="p-6 border-2 border-dashed rounded-lg hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-colors text-center"
                  onClick={() => setShowSignaturePad(true)}
                >
                  <Pencil className="h-8 w-8 mx-auto mb-2 text-secondary" />
                  <p className="font-medium">Desenhar Assinatura</p>
                  <p className="text-xs text-muted-foreground mt-1">Use o mouse ou toque</p>
                </div>
                <label className="p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Enviar Imagem</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG ou JPG (máx. 2MB)</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                          toast({ title: "Erro", description: "Apenas PNG ou JPG", variant: "destructive" });
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ title: "Erro", description: "Máximo 2MB", variant: "destructive" });
                          return;
                        }
                        handleUploadAssinatura(file);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-card">
                <SignaturePad
                  onSave={handleSaveDrawnSignature}
                  onCancel={() => setShowSignaturePad(false)}
                />
              </div>
            )}

            {uploadingAssinatura && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Salvando assinatura...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alterar Senha */}
      <AlterarSenhaDialog 
        open={alterarSenhaDialogOpen} 
        onOpenChange={setAlterarSenhaDialogOpen} 
      />
    </div>
  );
}
