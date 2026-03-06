import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  Link as LinkIcon, 
  Copy, 
  QrCode,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  Send,
  RefreshCw,
  User,
  FileText,
  AlertCircle,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Solicitacao {
  id: string;
  empresa_id: string;
  token: string;
  status: string;
  nome: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  formacao_academica: string | null;
  possui_veiculo: boolean;
  tipo_veiculo: string | null;
  placa: string | null;
  assinatura_url: string | null;
  formacoes: any[];
  possui_equipamentos_proprios: boolean;
  equipamentos: Record<string, { nome: string; quantidade: number }[]> | null;
  created_at: string;
  updated_at: string;
  enviado_em: string | null;
  motivo_rejeicao: string | null;
}

interface Pergunta {
  id: string;
  solicitacao_id: string;
  campo: string;
  pergunta: string;
  resposta: string | null;
  status: string;
  created_at: string;
}

const CAMPOS_FORMULARIO: Record<string, string> = {
  'nome': 'Nome Completo',
  'cpf_cnpj': 'CPF',
  'email': 'E-mail',
  'telefone': 'Telefone',
  'data_nascimento': 'Data de Nascimento',
  'endereco': 'Endereço',
  'formacao_academica': 'Formação Acadêmica',
  'veiculo': 'Veículo',
  'formacoes': 'Formações e Treinamentos',
  'assinatura': 'Assinatura Digital',
  'outro': 'Outro',
};

interface InstrutorSolicitacoesTabProps {
  empresaParceiraId?: string | null;
}

export function InstrutorSolicitacoesTab({ empresaParceiraId }: InstrutorSolicitacoesTabProps = {}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [activeTab, setActiveTab] = useState('todas');
  const [empresaSstId, setEmpresaSstId] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [perguntasDialogOpen, setPerguntasDialogOpen] = useState(false);
  
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respondingPerguntaId, setRespondingPerguntaId] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  // Buscar empresa_id da empresa SST quando for empresa parceira
  useEffect(() => {
    const fetchEmpresaSstId = async () => {
      if (empresaParceiraId) {
        const db = supabase as any;
        const { data, error } = await db
          .from('empresas_parceiras')
          .select('empresa_sst_id')
          .eq('id', empresaParceiraId)
          .single();
        if (error) {
          console.error('Erro ao buscar empresa SST:', error);
          return;
        }
        if (data) {
          setEmpresaSstId(data.empresa_sst_id);
        }
      }
    };
    fetchEmpresaSstId();
  }, [empresaParceiraId]);

  const fetchSolicitacoes = async () => {
    if (!profile?.empresa_id && !empresaParceiraId) return;
    
    setLoading(true);
    try {
      const db = supabase as any;
      
      let query = db.from('instrutor_solicitacoes').select('*');
      
      // Se for empresa parceira, filtrar por empresa_parceira_id
      if (empresaParceiraId) {
        query = query.eq('empresa_parceira_id', empresaParceiraId);
      } else {
        query = query.eq('empresa_id', profile.empresa_id).is('empresa_parceira_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitacoes(data || []);
      
      // Buscar perguntas pendentes
      if (data && data.length > 0) {
        const solicitacaoIds = data.map((s: Solicitacao) => s.id);
        const { data: perguntasData } = await db
          .from('instrutor_solicitacao_perguntas')
          .select('*')
          .in('solicitacao_id', solicitacaoIds)
          .order('created_at', { ascending: false });
        
        setPerguntas(perguntasData || []);
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, [profile?.empresa_id, empresaParceiraId]);

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleCreateLink = async () => {
    if (!profile?.empresa_id && !empresaParceiraId) return;
    
    // Para empresa parceira, precisamos do empresa_id da SST
    if (empresaParceiraId && !empresaSstId) {
      toast.error('Aguarde, carregando dados...');
      return;
    }
    
    setCreatingLink(true);
    try {
      const db = supabase as any;
      const token = generateToken();
      
      const insertData: any = {
        empresa_id: empresaParceiraId ? empresaSstId : profile?.empresa_id,
        token: token,
        status: 'rascunho',
      };
      
      // Se for empresa parceira, adicionar empresa_parceira_id
      if (empresaParceiraId) {
        insertData.empresa_parceira_id = empresaParceiraId;
      }
      
      const { error } = await db
        .from('instrutor_solicitacoes')
        .insert(insertData);

      if (error) throw error;
      
      const link = `${window.location.origin}/cadastro-instrutor/${token}`;
      setNewLink(link);
      toast.success('Link de cadastro criado com sucesso!');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast.error('Erro ao criar link de cadastro');
    } finally {
      setCreatingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleApprove = async (solicitacao: Solicitacao) => {
    // Para empresa parceira, usar empresaSstId; caso contrário, usar profile.empresa_id
    const empresaIdParaUsar = empresaParceiraId ? empresaSstId : profile?.empresa_id;
    
    if (!empresaIdParaUsar) {
      toast.error('Erro: ID da empresa não encontrado');
      return;
    }
    
    setProcessing(true);
    try {
      const db = supabase as any;
      
      // ========================================
      // 1. Criar acesso automático para o instrutor
      // ========================================
      let userId: string | null = null;
      const senhaDefault = '123456';
      
      if (solicitacao.email) {
        // Primeiro verificar se já existe um profile com esse email
        const { data: existingProfile } = await db
          .from('profiles')
          .select('id')
          .eq('email', solicitacao.email.trim())
          .maybeSingle();

        if (existingProfile) {
          // Usuário já existe, usar o ID existente
          userId = existingProfile.id;
          console.log('[handleApprove] Usuário já existe, usando ID:', userId);
          
          // Atualizar o profile existente para role instrutor
          await db.from('profiles').update({
            nome: solicitacao.nome,
            role: 'instrutor',
            empresa_id: empresaIdParaUsar,
          }).eq('id', userId);
        } else {
          // Criar novo usuário via Edge Function admin-create-user (evita problema de captcha)
          console.log('[handleApprove] Criando usuário via admin-create-user...');
          
          const { data: adminResponse, error: adminError } = await supabase.functions.invoke('admin-create-user', {
            body: {
              email: solicitacao.email.trim(),
              password: senhaDefault,
              nome: solicitacao.nome,
              role: 'instrutor',
              empresa_id: empresaIdParaUsar,
              send_invite: true,
            }
          });

          console.log('[handleApprove] Resposta admin-create-user:', adminResponse);

          if (adminError) {
            console.error('[handleApprove] Erro na Edge Function:', adminError);
            throw new Error(adminError.message || 'Erro ao criar acesso do instrutor');
          }

          if (adminResponse?.error) {
            console.error('[handleApprove] Erro retornado pela Edge Function:', adminResponse.error);
            throw new Error(adminResponse.error || 'Erro ao criar acesso do instrutor');
          }

          userId = adminResponse?.user?.id || adminResponse?.userId || null;
          console.log('[handleApprove] Novo usuário criado:', userId);

          // Aguardar um pouco para o trigger criar o profile
          await new Promise(resolve => setTimeout(resolve, 500));

          // Criar ou atualizar profile para o instrutor
          if (userId) {
            // Primeiro tentar atualizar (caso trigger tenha criado com role errado)
            const { error: updateError } = await db.from('profiles').update({
              email: solicitacao.email.trim(),
              nome: solicitacao.nome,
              role: 'instrutor',
              empresa_id: empresaIdParaUsar,
            }).eq('id', userId);

            // Se não atualizou nenhuma linha, criar
            if (updateError) {
              console.log('[handleApprove] Criando profile manualmente...');
              const { error: insertError } = await db.from('profiles').insert({
                id: userId,
                email: solicitacao.email.trim(),
                nome: solicitacao.nome,
                role: 'instrutor',
                empresa_id: empresaIdParaUsar,
              });
              
              if (insertError) {
                console.error('Erro ao criar profile:', insertError);
              }
            }
          } else {
            // Se ainda não temos userId, verificar se já existe profile com esse email
            console.log('[handleApprove] userId não obtido, verificando se profile existe...');
            const { data: existingProfileByEmail } = await db
              .from('profiles')
              .select('id')
              .eq('email', solicitacao.email.trim())
              .maybeSingle();
            
            if (existingProfileByEmail) {
              // Profile já existe, usar o ID existente
              userId = existingProfileByEmail.id;
              console.log('[handleApprove] Profile existente encontrado:', userId);
              
              // Atualizar para role instrutor
              await db.from('profiles').update({
                nome: solicitacao.nome,
                role: 'instrutor',
                empresa_id: empresaIdParaUsar,
              }).eq('id', userId);
            } else {
              // Criar profile sem id específico (será gerado automaticamente)
              const { data: newProfile, error: insertError } = await db.from('profiles').insert({
                email: solicitacao.email.trim(),
                nome: solicitacao.nome,
                role: 'instrutor',
                empresa_id: empresaIdParaUsar,
              }).select().single();
              
              if (insertError) {
                console.error('Erro ao criar profile:', insertError);
              } else if (newProfile) {
                userId = newProfile.id;
                console.log('[handleApprove] Profile criado com ID:', userId);
              }
            }
          }
        }
      }
      
      // ========================================
      // 2. Criar o instrutor na tabela principal
      // ========================================
      // Extrair formação acadêmica da primeira formação se não estiver definida
      const formacaoAcademica = solicitacao.formacao_academica || 
        (solicitacao.formacoes && solicitacao.formacoes.length > 0 ? solicitacao.formacoes[0].nome : null);
      
      const instrutorData: any = {
          empresa_id: empresaIdParaUsar,
          user_id: userId,
          nome: solicitacao.nome,
          cpf_cnpj: solicitacao.cpf_cnpj,
          email: solicitacao.email,
          telefone: solicitacao.telefone,
          data_nascimento: solicitacao.data_nascimento,
          cep: solicitacao.cep,
          logradouro: solicitacao.logradouro,
          numero: solicitacao.numero,
          complemento: solicitacao.complemento,
          bairro: solicitacao.bairro,
          cidade: solicitacao.cidade,
          uf: solicitacao.estado,
          veiculo: solicitacao.tipo_veiculo,
          placa: solicitacao.placa,
          assinatura_url: solicitacao.assinatura_url,
          formacao_academica: formacaoAcademica,
          ativo: true,
        };
      
      // Se for empresa parceira, adicionar empresa_parceira_id
      if (empresaParceiraId) {
        instrutorData.empresa_parceira_id = empresaParceiraId;
      }

      const { data: novoInstrutor, error: insertError } = await supabase
        .from('instrutores')
        .insert(instrutorData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar formações e treinamentos
      if (solicitacao.formacoes && solicitacao.formacoes.length > 0) {
        for (const formacao of solicitacao.formacoes) {
          // Inserir formação
          const { data: novaFormacao, error: formacaoError } = await db
            .from('instrutor_formacoes')
            .insert({
              instrutor_id: novoInstrutor.id,
              nome: formacao.nome,
              registro_tipo: formacao.registro_tipo,
              registro_numero: formacao.registro_numero,
              registro_estado: formacao.registro_estado,
              anexo_url: formacao.anexo_url,
            })
            .select()
            .single();

          if (formacaoError) {
            console.error('Erro ao criar formação:', formacaoError);
            continue;
          }

          // Inserir treinamentos vinculados
          if (formacao.treinamentos && formacao.treinamentos.length > 0) {
            for (const treinamento of formacao.treinamentos) {
              // Buscar ou criar treinamento no catálogo
              let treinamentoId = null;
              
              // Buscar por norma E nome para evitar duplicatas
              const { data: existingTreinamentos } = await supabase
                .from('catalogo_treinamentos')
                .select('id')
                .eq('empresa_id', empresaIdParaUsar)
                .eq('norma', treinamento.norma)
                .eq('nome', treinamento.nome)
                .limit(1);

              if (existingTreinamentos && existingTreinamentos.length > 0) {
                treinamentoId = existingTreinamentos[0].id;
              } else {
                // Criar novo treinamento no catálogo
                const { data: novoTreinamento, error: treinamentoError } = await supabase
                  .from('catalogo_treinamentos')
                  .insert({
                    empresa_id: empresaIdParaUsar,
                    nome: treinamento.nome,
                    norma: treinamento.norma,
                  })
                  .select()
                  .single();
                
                if (treinamentoError) {
                  console.error('Erro ao criar treinamento no catálogo:', treinamentoError);
                }
                
                if (novoTreinamento) {
                  treinamentoId = novoTreinamento.id;
                }
              }

              if (treinamentoId) {
                // Vincular treinamento à formação
                const { error: vinculoError } = await db
                  .from('instrutor_formacao_treinamento')
                  .insert({
                    instrutor_id: novoInstrutor.id,
                    formacao_id: novaFormacao.id,
                    treinamento_id: treinamentoId,
                    anexo_url: treinamento.anexo_url,
                  });
                
                if (vinculoError) {
                  console.error('Erro ao vincular treinamento:', vinculoError);
                }
              }
            }
          }
        }
      }

      // Atualizar status da solicitação
      await db
        .from('instrutor_solicitacoes')
        .update({
          status: 'aprovado',
          avaliado_em: new Date().toISOString(),
          avaliado_por: profile.id,
        })
        .eq('id', solicitacao.id);

      if (userId) {
        toast.success(`Instrutor aprovado! Acesso criado com e-mail: ${solicitacao.email} e senha padrão: 123456`);
      } else {
        toast.success('Instrutor aprovado e cadastrado com sucesso!');
      }
      setViewDialogOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSolicitacao || !motivoRejeicao.trim()) return;
    
    setProcessing(true);
    try {
      const db = supabase as any;
      
      await db
        .from('instrutor_solicitacoes')
        .update({
          status: 'rejeitado',
          motivo_rejeicao: motivoRejeicao.trim(),
          avaliado_em: new Date().toISOString(),
          avaliado_por: profile?.id,
        })
        .eq('id', selectedSolicitacao.id);

      toast.success('Solicitação rejeitada. O instrutor poderá corrigir e reenviar.');
      setRejectDialogOpen(false);
      setMotivoRejeicao('');
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  const handleResendWelcomeEmail = async (solicitacao: Solicitacao) => {
    if (!solicitacao.email) {
      toast.error('Solicitação não possui email');
      return;
    }
    
    setResendingEmailId(solicitacao.id);
    try {
      const db = supabase as any;
      
      // Buscar o user_id do profile pelo email
      const { data: profileData, error: profileError } = await db
        .from('profiles')
        .select('id, role')
        .eq('email', solicitacao.email.trim())
        .maybeSingle();
      
      if (profileError || !profileData) {
        toast.error('Usuário não encontrado. O instrutor pode não ter sido criado corretamente.');
        return;
      }
      
      // Chamar Edge Function para reenviar email
      const { data, error } = await supabase.functions.invoke('resend-welcome-email', {
        body: {
          user_id: profileData.id,
          email: solicitacao.email.trim(),
          nome: solicitacao.nome,
          role: profileData.role || 'instrutor'
        }
      });
      
      if (error) {
        console.error('Erro ao reenviar email:', error);
        toast.error('Erro ao reenviar email: ' + error.message);
        return;
      }
      
      if (data?.error) {
        toast.error('Erro: ' + data.error);
        return;
      }
      
      toast.success(`Email reenviado para ${solicitacao.email}! Nova senha temporária gerada.`);
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      toast.error('Erro ao reenviar email');
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleResponderPergunta = async (perguntaId: string) => {
    if (!respostaTexto.trim()) return;
    
    setRespondingPerguntaId(perguntaId);
    try {
      const db = supabase as any;
      
      await db
        .from('instrutor_solicitacao_perguntas')
        .update({
          resposta: respostaTexto.trim(),
          status: 'respondido',
          respondido_em: new Date().toISOString(),
          respondido_por: profile?.id,
        })
        .eq('id', perguntaId);

      toast.success('Resposta enviada!');
      setRespostaTexto('');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro ao responder:', error);
      toast.error('Erro ao enviar resposta');
    } finally {
      setRespondingPerguntaId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600"><Clock className="h-3 w-3 mr-1" />Rascunho</Badge>;
      case 'enviado':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Send className="h-3 w-3 mr-1" />Aguardando Avaliação</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressInfo = (solicitacao: Solicitacao) => {
    let filled = 0;
    const total = 10; // Campos obrigatórios: nome, cpf, telefone, email, cep, logradouro, bairro, numero, cidade/uf, formacoes, assinatura
    
    // Dados pessoais
    if (solicitacao.nome) filled++;
    if (solicitacao.cpf_cnpj) filled++;
    if (solicitacao.telefone) filled++;
    if (solicitacao.email) filled++;
    
    // Endereço
    if (solicitacao.cep && solicitacao.logradouro && solicitacao.bairro && solicitacao.numero && solicitacao.cidade && solicitacao.estado) filled += 2;
    else if (solicitacao.cep || solicitacao.logradouro) filled++;
    
    // Formações
    if (solicitacao.formacoes && solicitacao.formacoes.length > 0) filled += 2;
    
    // Assinatura
    if (solicitacao.assinatura_url) filled += 2;
    
    const percent = Math.min(100, Math.round((filled / total) * 100));
    return { filled, total, percent };
  };

  const filteredSolicitacoes = solicitacoes.filter(s => {
    if (activeTab === 'todas') return true;
    if (activeTab === 'pendentes') return s.status === 'enviado';
    if (activeTab === 'rascunhos') return s.status === 'rascunho';
    if (activeTab === 'aprovados') return s.status === 'aprovado';
    if (activeTab === 'rejeitados') return s.status === 'rejeitado';
    return true;
  });

  const perguntasPendentes = perguntas.filter(p => p.status === 'pendente');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Solicitações de Cadastro</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os links de cadastro e avalie as solicitações de novos instrutores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSolicitacoes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Link de Cadastro
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {perguntasPendentes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    {perguntasPendentes.length} pergunta(s) aguardando resposta
                  </p>
                  <p className="text-sm text-amber-600">
                    Instrutores têm dúvidas sobre o preenchimento do formulário
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => setPerguntasDialogOpen(true)}
              >
                Ver Perguntas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todas">
            Todas ({solicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes ({solicitacoes.filter(s => s.status === 'enviado').length})
          </TabsTrigger>
          <TabsTrigger value="rascunhos">
            Rascunhos ({solicitacoes.filter(s => s.status === 'rascunho').length})
          </TabsTrigger>
          <TabsTrigger value="aprovados">
            Aprovados ({solicitacoes.filter(s => s.status === 'aprovado').length})
          </TabsTrigger>
          <TabsTrigger value="rejeitados">
            Rejeitados ({solicitacoes.filter(s => s.status === 'rejeitado').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredSolicitacoes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma solicitação encontrada</p>
                <p className="text-sm">Gere um link de cadastro para começar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrutor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSolicitacoes.map((solicitacao) => {
                    const progress = getProgressInfo(solicitacao);
                    const solicitacaoPerguntas = perguntas.filter(p => p.solicitacao_id === solicitacao.id);
                    const perguntasPendentesCount = solicitacaoPerguntas.filter(p => p.status === 'pendente').length;
                    
                    return (
                      <TableRow key={solicitacao.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {solicitacao.nome || <span className="text-muted-foreground italic">Não preenchido</span>}
                            </p>
                            {solicitacao.email && (
                              <p className="text-sm text-muted-foreground">{solicitacao.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(solicitacao.status)}
                            {perguntasPendentesCount > 0 && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                {perguntasPendentesCount}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  progress.percent === 100 ? "bg-green-500" : "bg-blue-500"
                                )}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{progress.percent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(solicitacao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {solicitacao.enviado_em 
                            ? format(new Date(solicitacao.enviado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${window.location.origin}/cadastro-instrutor/${solicitacao.token}`)}
                              title="Copiar link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {solicitacao.status === 'aprovado' && solicitacao.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendWelcomeEmail(solicitacao)}
                                disabled={resendingEmailId === solicitacao.id}
                                title="Reenviar email de acesso"
                              >
                                {resendingEmailId === solicitacao.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSolicitacao(solicitacao);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Link */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Gerar Link de Cadastro
            </DialogTitle>
            <DialogDescription>
              Crie um link único para que um novo instrutor preencha seus dados de cadastro.
            </DialogDescription>
          </DialogHeader>
          
          {newLink ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 mb-2">Link criado com sucesso!</p>
                <div className="flex items-center gap-2">
                  <Input value={newLink} readOnly className="flex-1 text-sm" />
                  <Button variant="outline" onClick={() => copyToClipboard(newLink)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie este link para o instrutor. Ele poderá preencher o formulário, salvar e continuar depois.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ao gerar um link, o instrutor poderá:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Preencher todos os dados necessários</li>
                <li>Fazer upload dos documentos comprobatórios</li>
                <li>Salvar e continuar depois</li>
                <li>Enviar para sua avaliação quando estiver pronto</li>
              </ul>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setNewLink('');
            }}>
              {newLink ? 'Fechar' : 'Cancelar'}
            </Button>
            {!newLink && (
              <Button onClick={handleCreateLink} disabled={creatingLink}>
                {creatingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Gerar Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar Solicitação */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes da Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedSolicitacao && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedSolicitacao.status)}
                {selectedSolicitacao.enviado_em && (
                  <span className="text-sm text-muted-foreground">
                    Enviado em {format(new Date(selectedSolicitacao.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>

              {/* Dados Pessoais */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedSolicitacao.nome || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPF</Label>
                    <p className="font-medium">{selectedSolicitacao.cpf_cnpj || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{selectedSolicitacao.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedSolicitacao.telefone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Nascimento</Label>
                    <p className="font-medium">{selectedSolicitacao.data_nascimento ? format(new Date(selectedSolicitacao.data_nascimento), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Veículo</Label>
                    <p className="font-medium">{selectedSolicitacao.possui_veiculo ? (selectedSolicitacao.tipo_veiculo || 'Sim') : 'Não'}</p>
                  </div>
                  {selectedSolicitacao.possui_veiculo && selectedSolicitacao.placa && (
                    <div>
                      <Label className="text-muted-foreground">Placa</Label>
                      <p className="font-medium">{selectedSolicitacao.placa}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Endereço</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">CEP</Label>
                    <p className="font-medium">{selectedSolicitacao.cep || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade/UF</Label>
                    <p className="font-medium">{selectedSolicitacao.cidade ? `${selectedSolicitacao.cidade}/${selectedSolicitacao.estado}` : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Logradouro</Label>
                    <p className="font-medium">
                      {selectedSolicitacao.logradouro 
                        ? `${selectedSolicitacao.logradouro}, ${selectedSolicitacao.numero || 's/n'}${selectedSolicitacao.complemento ? ` - ${selectedSolicitacao.complemento}` : ''} - ${selectedSolicitacao.bairro || ''}`
                        : '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Assinatura */}
              {selectedSolicitacao.assinatura_url && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Assinatura Digital</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img 
                      src={selectedSolicitacao.assinatura_url} 
                      alt="Assinatura" 
                      className="max-h-24 border rounded"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Formações */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Formações e Treinamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSolicitacao.formacoes && selectedSolicitacao.formacoes.length > 0 ? (
                    <div className="space-y-4">
                      {selectedSolicitacao.formacoes.map((formacao: any, index: number) => (
                        <div key={formacao.id || index} className="border rounded-lg p-4 bg-slate-50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-base">{formacao.nome}</p>
                              {formacao.registro_tipo && (
                                <p className="text-sm text-muted-foreground">
                                  {formacao.registro_tipo} {formacao.registro_numero} - {formacao.registro_estado}
                                </p>
                              )}
                            </div>
                            {formacao.anexo_url ? (
                              <a href={formacao.anexo_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                                  <FileText className="h-4 w-4 mr-1" />
                                  Ver Anexo
                                </Button>
                              </a>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Sem anexo
                              </Badge>
                            )}
                          </div>
                          {formacao.treinamentos && formacao.treinamentos.length > 0 && (
                            <div className="border-t pt-3 mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Treinamentos vinculados:</p>
                              <div className="space-y-2">
                                {formacao.treinamentos.map((t: any, tIndex: number) => (
                                  <div key={t.id || tIndex} className="flex items-center justify-between bg-white rounded p-2 border">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {t.norma}
                                      </Badge>
                                      <span className="text-sm">{t.nome}</span>
                                    </div>
                                    {t.anexo_url ? (
                                      <a href={t.anexo_url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 h-7 px-2">
                                          <FileText className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Anexo</span>
                                        </Button>
                                      </a>
                                    ) : (
                                      <span className="text-xs text-amber-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada</p>
                  )}
                </CardContent>
              </Card>

              {/* Equipamentos Próprios */}
              {selectedSolicitacao.possui_equipamentos_proprios && selectedSolicitacao.equipamentos && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Equipamentos Próprios para Treinamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(selectedSolicitacao.equipamentos).map(([treinamentoId, equipamentos]) => {
                        // Buscar nome do treinamento nas formações
                        let treinamentoNome = treinamentoId;
                        selectedSolicitacao.formacoes?.forEach((f: any) => {
                          const t = f.treinamentos?.find((t: any) => t.treinamento_id === treinamentoId || t.id === treinamentoId);
                          if (t) treinamentoNome = `${t.norma || ''} - ${t.nome}`.trim().replace(/^- /, '');
                        });
                        
                        return (
                          <div key={treinamentoId} className="border rounded-lg p-3 bg-slate-50">
                            <p className="font-medium text-sm mb-2">{treinamentoNome}</p>
                            <div className="flex flex-wrap gap-2">
                              {equipamentos.map((equip, idx) => (
                                <Badge key={idx} variant="outline" className="bg-white">
                                  {equip.nome} (x{equip.quantidade})
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

              {/* Perguntas */}
              {perguntas.filter(p => p.solicitacao_id === selectedSolicitacao.id).length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Perguntas do Instrutor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {perguntas
                      .filter(p => p.solicitacao_id === selectedSolicitacao.id)
                      .map((pergunta) => (
                        <div key={pergunta.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {CAMPOS_FORMULARIO[pergunta.campo] || pergunta.campo}
                            </Badge>
                            <Badge variant={pergunta.status === 'respondido' ? 'default' : 'secondary'} className="text-xs">
                              {pergunta.status === 'respondido' ? 'Respondido' : 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{pergunta.pergunta}</p>
                          {pergunta.resposta ? (
                            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                              <strong>Resposta:</strong> {pergunta.resposta}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Digite sua resposta..."
                                value={respondingPerguntaId === pergunta.id ? respostaTexto : ''}
                                onChange={(e) => {
                                  setRespondingPerguntaId(pergunta.id);
                                  setRespostaTexto(e.target.value);
                                }}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleResponderPergunta(pergunta.id)}
                                disabled={respondingPerguntaId === pergunta.id && !respostaTexto.trim()}
                              >
                                {respondingPerguntaId === pergunta.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              {selectedSolicitacao.status === 'enviado' && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialogOpen(true);
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedSolicitacao)}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Aprovar e Cadastrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Rejeitar */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Solicitação
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O instrutor poderá corrigir e reenviar.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label>Motivo da Rejeição *</Label>
            <Textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Descreva o que precisa ser corrigido..."
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setMotivoRejeicao('');
            }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!motivoRejeicao.trim() || processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Perguntas Pendentes */}
      <Dialog open={perguntasDialogOpen} onOpenChange={setPerguntasDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Perguntas Pendentes
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {perguntasPendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pergunta pendente
              </p>
            ) : (
              perguntasPendentes.map((pergunta) => {
                const solicitacao = solicitacoes.find(s => s.id === pergunta.solicitacao_id);
                return (
                  <div key={pergunta.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{solicitacao?.nome || 'Instrutor'}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {CAMPOS_FORMULARIO[pergunta.campo] || pergunta.campo}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pergunta.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm mb-3">{pergunta.pergunta}</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite sua resposta..."
                        value={respondingPerguntaId === pergunta.id ? respostaTexto : ''}
                        onChange={(e) => {
                          setRespondingPerguntaId(pergunta.id);
                          setRespostaTexto(e.target.value);
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleResponderPergunta(pergunta.id)}
                        disabled={respondingPerguntaId === pergunta.id && !respostaTexto.trim()}
                      >
                        {respondingPerguntaId === pergunta.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
