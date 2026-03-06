import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  Eye,
  Image as ImageIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
  Loader2,
  Upload,
  X,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface Blog {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  conteudo: string;
  imagem_capa_url: string | null;
  autor_id: string | null;
  categoria_id: string | null;
  status: string;
  tags: string[];
  tempo_leitura: number | null;
}

interface Categoria {
  id: string;
  nome: string;
  slug: string;
  cor: string;
}

interface Autor {
  id: string;
  nome: string;
  sobrenome: string;
  cargo: string;
}

interface AdminBlogEditorProps {
  blog: Blog | null;
  categorias: Categoria[];
  autores: Autor[];
  onClose: () => void;
  onSave: () => void;
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const calculateReadingTime = (content: string) => {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

export function AdminBlogEditor({ blog, categorias, autores, onClose, onSave }: AdminBlogEditorProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    titulo: blog?.titulo || '',
    slug: blog?.slug || '',
    descricao: blog?.descricao || '',
    conteudo: blog?.conteudo || '',
    imagem_capa_url: blog?.imagem_capa_url || '',
    autor_id: blog?.autor_id || '',
    categoria_id: blog?.categoria_id || '',
    status: blog?.status || 'rascunho',
    tags: blog?.tags || [],
  });

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      titulo: value,
      slug: blog ? prev.slug : generateSlug(value),
    }));
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.conteudo.substring(start, end);
    const newText = formData.conteudo.substring(0, start) + prefix + selectedText + suffix + formData.conteudo.substring(end);
    
    setFormData(prev => ({ ...prev, conteudo: newText }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1200;
          const maxHeight = 800;
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => resolve(blob || file),
            'image/webp',
            0.85
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: File, isCover: boolean = false): Promise<string | null> => {
    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `${Date.now()}-${generateSlug(file.name.split('.')[0])}.webp`;
      const filePath = isCover ? `covers/${fileName}` : `content/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, true);
    if (url) {
      setFormData(prev => ({ ...prev, imagem_capa_url: url }));
      toast.success('Imagem de capa enviada');
    }
  };

  const handleContentImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const url = await uploadImage(file, false);
      if (url) {
        insertMarkdown(`![${file.name}](${url})`, '');
        toast.success('Imagem inserida no conteúdo');
      }
    };
    input.click();
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove),
    }));
  };

  const sendNewsletterNotification = async (blogId: string, titulo: string, slug: string, descricao: string) => {
    try {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          tipo: 'blog',
          referencia_id: blogId,
          titulo,
          url: `${baseUrl}/blog/${slug}`,
          descricao,
        },
      });
      
      if (error) {
        console.error('Erro ao enviar newsletter:', error);
      } else if (data?.total > 0) {
        toast.success(`Newsletter enviada para ${data.total} inscritos!`);
      }
    } catch (err) {
      console.error('Erro ao enviar newsletter:', err);
    }
  };

  const handleSubmit = async (status?: string) => {
    if (!formData.titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const finalStatus = status || formData.status;
      const tempoLeitura = calculateReadingTime(formData.conteudo);
      
      const blogData = {
        titulo: formData.titulo,
        slug: formData.slug || generateSlug(formData.titulo),
        descricao: formData.descricao || null,
        conteudo: formData.conteudo || null,
        imagem_capa_url: formData.imagem_capa_url || null,
        autor_id: formData.autor_id || null,
        categoria_id: formData.categoria_id || null,
        status: finalStatus,
        tags: formData.tags.length > 0 ? formData.tags : null,
        tempo_leitura: tempoLeitura,
        publicado_em: finalStatus === 'publicado' ? new Date().toISOString() : (blog?.status === 'publicado' ? blog.publicado_em : null),
      };

      if (blog) {
        const { error } = await (supabase as any)
          .from('blogs')
          .update(blogData)
          .eq('id', blog.id);

        if (error) throw error;
        
        // Disparar newsletter se está sendo publicado pela primeira vez
        if (finalStatus === 'publicado' && blog.status !== 'publicado') {
          sendNewsletterNotification(blog.id, formData.titulo, formData.slug, formData.descricao);
        }
        
        toast.success('Blog atualizado com sucesso');
      } else {
        const { data: newBlog, error } = await (supabase as any)
          .from('blogs')
          .insert(blogData)
          .select('id')
          .single();

        if (error) throw error;
        
        // Disparar newsletter se publicado diretamente
        if (finalStatus === 'publicado' && newBlog) {
          sendNewsletterNotification(newBlog.id, formData.titulo, blogData.slug, formData.descricao);
        }
        
        toast.success('Blog criado com sucesso');
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar blog:', error);
      if (error.code === '23505') {
        toast.error('Já existe um blog com este slug');
      } else {
        toast.error('Erro ao salvar blog');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {blog ? 'Editar Blog' : 'Novo Blog'}
            </h1>
            <p className="text-muted-foreground">
              {blog ? 'Atualize o conteúdo do blog' : 'Crie um novo post para o blog'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="escrita">Em Escrita</SelectItem>
              <SelectItem value="revisao">Em Revisão</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleSubmit()} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          {formData.status !== 'publicado' && (
            <Button onClick={() => handleSubmit('publicado')} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publicar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Slug */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Digite o título do blog..."
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/blog/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                  placeholder="url-do-blog"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Uma breve descrição do conteúdo..."
              rows={3}
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <div className="border rounded-lg overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('**', '**')}
                  title="Negrito"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('*', '*')}
                  title="Itálico"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('# ')}
                  title="Título 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('## ')}
                  title="Título 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('- ')}
                  title="Lista"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('1. ')}
                  title="Lista Numerada"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('> ')}
                  title="Citação"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('[', '](url)')}
                  title="Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown('`', '`')}
                  title="Código"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleContentImageUpload}
                  disabled={uploading}
                  title="Inserir Imagem"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={formData.conteudo}
                onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                placeholder="Escreva o conteúdo do blog em Markdown..."
                className="min-h-[400px] border-0 rounded-none resize-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Suporta Markdown. Tempo de leitura estimado: {calculateReadingTime(formData.conteudo)} min
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Imagem de Capa</Label>
            <div className="border rounded-lg overflow-hidden">
              {formData.imagem_capa_url ? (
                <div className="relative">
                  <img
                    src={formData.imagem_capa_url}
                    alt="Capa"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData(prev => ({ ...prev, imagem_capa_url: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={formData.categoria_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.cor }}
                      />
                      {cat.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label>Autor</Label>
            <Select
              value={formData.autor_id}
              onValueChange={(v) => setFormData(prev => ({ ...prev, autor_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um autor" />
              </SelectTrigger>
              <SelectContent>
                {autores.map((autor) => (
                  <SelectItem key={autor.id} value={autor.id}>
                    {autor.nome} {autor.sobrenome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag..."
              />
              <Button type="button" variant="outline" onClick={addTag}>
                +
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
