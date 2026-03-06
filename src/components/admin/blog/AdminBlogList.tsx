import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Tags,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminCategoriaDialog } from './AdminCategoriaDialog';
import { AdminAutorDialog } from './AdminAutorDialog';
import { AdminBlogEditor } from './AdminBlogEditor';

interface Blog {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  status: 'rascunho' | 'escrita' | 'revisao' | 'arquivado' | 'publicado';
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
  tempo_leitura: number | null;
  visualizacoes: number;
  autor: {
    id: string;
    nome: string;
    sobrenome: string;
  } | null;
  categoria: {
    id: string;
    nome: string;
    cor: string;
  } | null;
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  escrita: { label: 'Em Escrita', variant: 'outline' },
  revisao: { label: 'Em Revisão', variant: 'default' },
  arquivado: { label: 'Arquivado', variant: 'destructive' },
  publicado: { label: 'Publicado', variant: 'default' },
};

export function AdminBlogList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [autores, setAutores] = useState<Autor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Dialogs
  const [showCategoriaDialog, setShowCategoriaDialog] = useState(false);
  const [showAutorDialog, setShowAutorDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);

  useEffect(() => {
    fetchBlogs();
    fetchCategorias();
    fetchAutores();
  }, [page, search, statusFilter, categoriaFilter]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('blogs')
        .select(`
          *,
          autor:blog_autores(id, nome, sobrenome),
          categoria:blog_categorias(id, nome, cor)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (search) {
        query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoriaFilter !== 'all') {
        query = query.eq('categoria_id', categoriaFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setBlogs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Erro ao buscar blogs:', error);
      toast.error('Erro ao carregar blogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_categorias')
        .select('*')
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchAutores = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_autores')
        .select('*')
        .order('nome');

      if (error) throw error;
      setAutores(data || []);
    } catch (error) {
      console.error('Erro ao buscar autores:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este blog?')) return;

    try {
      const { error } = await (supabase as any)
        .from('blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Blog excluído com sucesso');
      fetchBlogs();
    } catch (error) {
      console.error('Erro ao excluir blog:', error);
      toast.error('Erro ao excluir blog');
    }
  };

  const handleEdit = (blog: Blog) => {
    setSelectedBlog(blog);
    setShowEditor(true);
  };

  const handleNewBlog = () => {
    setSelectedBlog(null);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedBlog(null);
    fetchBlogs();
  };

  if (showEditor) {
    return (
      <AdminBlogEditor
        blog={selectedBlog}
        categorias={categorias}
        autores={autores}
        onClose={handleEditorClose}
        onSave={handleEditorClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blogs</h1>
          <p className="text-muted-foreground">Gerencie o conteúdo do blog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCategoriaDialog(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Categorias
          </Button>
          <Button variant="outline" onClick={() => setShowAutorDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Autores
          </Button>
          <Button onClick={handleNewBlog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Blog
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="escrita">Em Escrita</SelectItem>
            <SelectItem value="revisao">Em Revisão</SelectItem>
            <SelectItem value="publicado">Publicado</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead>Última edição</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </TableCell>
              </TableRow>
            ) : blogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Nenhum blog encontrado</p>
                    <Button variant="outline" size="sm" onClick={handleNewBlog}>
                      Criar primeiro blog
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              blogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{blog.titulo}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {blog.descricao}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {blog.categoria ? (
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: blog.categoria.cor, color: blog.categoria.cor }}
                      >
                        {blog.categoria.nome}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {blog.autor ? (
                      <span>{blog.autor.nome} {blog.autor.sobrenome}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[blog.status]?.variant || 'secondary'}>
                      {statusConfig[blog.status]?.label || blog.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {blog.publicado_em ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(blog.publicado_em), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(blog.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(blog)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {blog.status === 'publicado' && (
                          <DropdownMenuItem onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(blog.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AdminCategoriaDialog
        open={showCategoriaDialog}
        onOpenChange={setShowCategoriaDialog}
        categorias={categorias}
        onRefresh={fetchCategorias}
      />

      <AdminAutorDialog
        open={showAutorDialog}
        onOpenChange={setShowAutorDialog}
        autores={autores}
        onRefresh={fetchAutores}
      />
    </div>
  );
}
