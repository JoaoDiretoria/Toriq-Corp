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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface Pesquisa {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  status: string;
  tipo: string;
  total_votos: number;
  created_at: string;
}

interface Opcao {
  id?: string;
  texto: string;
  ordem: number;
  cor?: string;
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

interface Autor {
  id: string;
  nome: string;
  sobrenome: string;
}

interface AdminPesquisaEditorProps {
  pesquisa: Pesquisa | null;
  onBack: () => void;
}

export function AdminPesquisaEditor({ pesquisa, onBack }: AdminPesquisaEditorProps) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [autores, setAutores] = useState<Autor[]>([]);
  
  // Form state
  const [titulo, setTitulo] = useState(pesquisa?.titulo || '');
  const [slug, setSlug] = useState(pesquisa?.slug || '');
  const [descricao, setDescricao] = useState(pesquisa?.descricao || '');
  const [tipo, setTipo] = useState(pesquisa?.tipo || 'multipla_escolha');
  const [categoriaId, setCategoriaId] = useState('');
  const [autorId, setAutorId] = useState('');
  const [anonima, setAnonima] = useState(true);
  const [permiteMultiplas, setPermiteMultiplas] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[]>([
    { texto: '', ordem: 0 },
    { texto: '', ordem: 1 },
  ]);

  useEffect(() => {
    fetchCategorias();
    fetchAutores();
    if (pesquisa) {
      fetchPesquisaDetails();
    }
  }, [pesquisa]);

  const fetchCategorias = async () => {
    const { data } = await (supabase as any)
      .from('blog_categorias')
      .select('id, nome, cor')
      .order('nome');
    setCategorias(data || []);
  };

  const fetchAutores = async () => {
    const { data } = await (supabase as any)
      .from('blog_autores')
      .select('id, nome, sobrenome')
      .order('nome');
    setAutores(data || []);
  };

  const fetchPesquisaDetails = async () => {
    if (!pesquisa) return;

    // Buscar dados completos da pesquisa
    const { data: pesquisaData } = await (supabase as any)
      .from('pesquisas_opiniao')
      .select('*')
      .eq('id', pesquisa.id)
      .single();

    if (pesquisaData) {
      setCategoriaId(pesquisaData.categoria_id || '');
      setAutorId(pesquisaData.autor_id || '');
      setAnonima(pesquisaData.anonima);
      setPermiteMultiplas(pesquisaData.permite_multiplas_respostas);
    }

    // Buscar opções
    const { data: opcoesData } = await (supabase as any)
      .from('pesquisas_opcoes')
      .select('*')
      .eq('pesquisa_id', pesquisa.id)
      .order('ordem');

    if (opcoesData && opcoesData.length > 0) {
      setOpcoes(opcoesData);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTituloChange = (value: string) => {
    setTitulo(value);
    if (!pesquisa) {
      setSlug(generateSlug(value));
    }
  };

  const addOpcao = () => {
    setOpcoes([...opcoes, { texto: '', ordem: opcoes.length }]);
  };

  const removeOpcao = (index: number) => {
    if (opcoes.length <= 2) {
      toast.error('A pesquisa deve ter pelo menos 2 opções');
      return;
    }
    const newOpcoes = opcoes.filter((_, i) => i !== index);
    setOpcoes(newOpcoes.map((o, i) => ({ ...o, ordem: i })));
  };

  const updateOpcao = (index: number, texto: string) => {
    const newOpcoes = [...opcoes];
    newOpcoes[index].texto = texto;
    setOpcoes(newOpcoes);
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!slug.trim()) {
      toast.error('Slug é obrigatório');
      return;
    }

    // Determinar opções baseado no tipo
    let opcoesParaSalvar: { texto: string; ordem: number }[] = [];
    
    if (tipo === 'sim_nao') {
      opcoesParaSalvar = [
        { texto: 'Sim', ordem: 0 },
        { texto: 'Não', ordem: 1 },
      ];
    } else if (tipo === 'escala') {
      opcoesParaSalvar = [1, 2, 3, 4, 5].map((n, i) => ({
        texto: String(n),
        ordem: i,
      }));
    } else if (tipo === 'multipla_escolha') {
      opcoesParaSalvar = opcoes
        .filter(o => o.texto.trim())
        .map((o, i) => ({ texto: o.texto, ordem: i }));
      
      if (opcoesParaSalvar.length < 2) {
        toast.error('A pesquisa deve ter pelo menos 2 opções');
        return;
      }
    }
    // texto_livre não precisa de opções

    setLoading(true);
    try {
      const pesquisaData = {
        titulo,
        slug,
        descricao,
        tipo,
        categoria_id: categoriaId || null,
        autor_id: autorId || null,
        anonima,
        permite_multiplas_respostas: permiteMultiplas,
      };

      let pesquisaId = pesquisa?.id;

      if (pesquisa) {
        // Atualizar pesquisa existente
        const { error } = await (supabase as any)
          .from('pesquisas_opiniao')
          .update(pesquisaData)
          .eq('id', pesquisa.id);

        if (error) throw error;
      } else {
        // Criar nova pesquisa
        const { data, error } = await (supabase as any)
          .from('pesquisas_opiniao')
          .insert(pesquisaData)
          .select()
          .single();

        if (error) throw error;
        pesquisaId = data.id;
      }

      // Gerenciar opções
      if (tipo !== 'texto_livre' && opcoesParaSalvar.length > 0) {
        // Deletar opções antigas
        await (supabase as any)
          .from('pesquisas_opcoes')
          .delete()
          .eq('pesquisa_id', pesquisaId);

        // Inserir novas opções
        const opcoesData = opcoesParaSalvar.map((o) => ({
          pesquisa_id: pesquisaId,
          texto: o.texto,
          ordem: o.ordem,
        }));

        const { error: opcoesError } = await (supabase as any)
          .from('pesquisas_opcoes')
          .insert(opcoesData);

        if (opcoesError) throw opcoesError;
      }

      toast.success(pesquisa ? 'Pesquisa atualizada!' : 'Pesquisa criada!');
      onBack();
    } catch (error: any) {
      console.error('Erro ao salvar pesquisa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma pesquisa com este slug');
      } else {
        toast.error('Erro ao salvar pesquisa');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {pesquisa ? 'Editar Pesquisa' : 'Nova Pesquisa'}
          </h2>
          <p className="text-muted-foreground">
            {pesquisa ? 'Atualize os dados da pesquisa' : 'Crie uma nova pesquisa de opinião'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  placeholder="Ex: Qual sua opinião sobre..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="minha-pesquisa"
                />
                <p className="text-xs text-muted-foreground">
                  URL: /pesquisas/{slug || 'minha-pesquisa'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o objetivo desta pesquisa..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Pesquisa</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                    <SelectItem value="sim_nao">Sim / Não</SelectItem>
                    <SelectItem value="escala">Escala (1-5)</SelectItem>
                    <SelectItem value="texto_livre">Texto Livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Opções de Resposta */}
          {tipo !== 'texto_livre' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Opções de Resposta</CardTitle>
                <Button variant="outline" size="sm" onClick={addOpcao}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {tipo === 'sim_nao' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">Sim</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">Não</span>
                    </div>
                  </div>
                ) : tipo === 'escala' ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="flex-1 p-3 border rounded-lg bg-muted/50 text-center">
                        <span className="text-sm font-medium">{n}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  opcoes.map((opcao, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <Input
                        value={opcao.texto}
                        onChange={(e) => updateOpcao(index, e.target.value)}
                        placeholder={`Opção ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOpcao(index)}
                        disabled={opcoes.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaId || "none"} onValueChange={(val) => setCategoriaId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                          {cat.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Autor</Label>
                <Select value={autorId || "none"} onValueChange={(val) => setAutorId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {autores.map((autor) => (
                      <SelectItem key={autor.id} value={autor.id}>
                        {autor.nome} {autor.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pesquisa Anônima</Label>
                  <p className="text-xs text-muted-foreground">
                    Não coleta dados pessoais
                  </p>
                </div>
                <Switch checked={anonima} onCheckedChange={setAnonima} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Múltiplas Respostas</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite selecionar várias opções
                  </p>
                </div>
                <Switch 
                  checked={permiteMultiplas} 
                  onCheckedChange={setPermiteMultiplas}
                  disabled={tipo !== 'multipla_escolha'}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacidade e LGPD</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta pesquisa segue as diretrizes da{' '}
                <a 
                  href="https://pt.wikipedia.org/wiki/Lei_Geral_de_Prote%C3%A7%C3%A3o_de_Dados_Pessoais" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LGPD (Lei Geral de Proteção de Dados)
                </a>
                . Os dados são coletados de forma anônima e utilizados apenas para fins estatísticos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
