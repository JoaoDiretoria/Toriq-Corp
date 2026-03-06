import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Send, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Conteudo {
  id: string;
  titulo: string;
  slug: string;
  descricao: string | null;
  conteudo: string | null;
  imagem_capa_url: string | null;
  status: string;
  agendado_para: string | null;
  total_enviados?: number;
}

interface Props {
  conteudo: Conteudo | null;
  onBack: () => void;
}

export default function AdminNewsletterEditor({ conteudo, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState(conteudo?.titulo || '');
  const [slug, setSlug] = useState(conteudo?.slug || '');
  const [descricao, setDescricao] = useState(conteudo?.descricao || '');
  const [conteudoTexto, setConteudoTexto] = useState(conteudo?.conteudo || '');
  const [imagemCapaUrl, setImagemCapaUrl] = useState(conteudo?.imagem_capa_url || '');
  const [status, setStatus] = useState(conteudo?.status || 'rascunho');
  const [agendadoPara, setAgendadoPara] = useState(
    conteudo?.agendado_para ? conteudo.agendado_para.slice(0, 16) : ''
  );

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  useEffect(() => {
    if (!conteudo && titulo && !slug) {
      setSlug(generateSlug(titulo));
    }
  }, [titulo, conteudo]);

  const handleSave = async (newStatus?: string) => {
    if (!titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!slug.trim()) {
      toast.error('Slug é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const finalStatus = newStatus || status;
      const data = {
        titulo,
        slug,
        descricao: descricao || null,
        conteudo: conteudoTexto || null,
        imagem_capa_url: imagemCapaUrl || null,
        status: finalStatus,
        agendado_para: finalStatus === 'agendado' && agendadoPara ? new Date(agendadoPara).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (conteudo) {
        const { error } = await (supabase as any)
          .from('newsletter_conteudos')
          .update(data)
          .eq('id', conteudo.id);

        if (error) throw error;
        toast.success('Conteúdo atualizado com sucesso');
      } else {
        const { error } = await (supabase as any)
          .from('newsletter_conteudos')
          .insert(data);

        if (error) throw error;
        toast.success('Conteúdo criado com sucesso');
      }

      onBack();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      if (error.code === '23505') {
        toast.error('Já existe um conteúdo com este slug');
      } else {
        toast.error('Erro ao salvar conteúdo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Salvar primeiro
      const data = {
        titulo,
        slug: slug || generateSlug(titulo),
        descricao: descricao || null,
        conteudo: conteudoTexto || null,
        imagem_capa_url: imagemCapaUrl || null,
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let conteudoId = conteudo?.id;

      if (conteudo) {
        const { error } = await (supabase as any)
          .from('newsletter_conteudos')
          .update(data)
          .eq('id', conteudo.id);

        if (error) throw error;
      } else {
        const { data: newData, error } = await (supabase as any)
          .from('newsletter_conteudos')
          .insert(data)
          .select('id')
          .single();

        if (error) throw error;
        conteudoId = newData.id;
      }

      // Enviar newsletter
      const baseUrl = window.location.origin;
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-newsletter', {
        body: {
          tipo: 'newsletter',
          referencia_id: conteudoId,
          titulo,
          url: `${baseUrl}/newsletter`,
          descricao,
        },
      });

      if (sendError) throw sendError;

      // Atualizar total enviados
      await (supabase as any)
        .from('newsletter_conteudos')
        .update({ total_enviados: sendResult?.total || 0 })
        .eq('id', conteudoId);

      toast.success(`Newsletter enviada para ${sendResult?.total || 0} inscritos!`);
      onBack();
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar newsletter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {conteudo ? 'Editar Conteúdo' : 'Novo Conteúdo'}
            </h2>
            <p className="text-muted-foreground">
              {conteudo ? 'Atualize o conteúdo da newsletter' : 'Crie um novo conteúdo para a newsletter'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave()} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          {status !== 'enviado' && (
            <Button onClick={handleSendNow} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Agora
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da newsletter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="slug-da-newsletter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição do conteúdo"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo</Label>
              <Textarea
                id="conteudo"
                value={conteudoTexto}
                onChange={(e) => setConteudoTexto(e.target.value)}
                placeholder="Escreva o conteúdo da newsletter aqui..."
                rows={15}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Suporta Markdown para formatação
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold">Configurações</h3>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === 'agendado' && (
              <div className="space-y-2">
                <Label htmlFor="agendado">Agendar para</Label>
                <Input
                  id="agendado"
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="imagem">URL da Imagem de Capa</Label>
              <Input
                id="imagem"
                value={imagemCapaUrl}
                onChange={(e) => setImagemCapaUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {conteudo?.status === 'enviado' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <Send className="h-4 w-4" />
                <span className="font-medium">Enviado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Este conteúdo já foi enviado para {conteudo.total_enviados || 0} inscritos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
