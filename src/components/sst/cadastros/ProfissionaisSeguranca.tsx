import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProfissionalSeguranca {
  id: string;
  especialidade: string;
  nome: string;
  cpf: string;
  conselho: string;
  nr_conselho: string;
  uf_conselho: string;
  certificado_digital_url: string | null;
  senha_certificado: string | null;
  empresa_id: string;
  created_at: string;
}

const ESPECIALIDADES_SEGURANCA = [
  'Engenheiro(a)',
  'Técnico(a) de Segurança',
  'Tecnólogo(a) de Segurança',
  'Médico(a) do Trabalho',
  'Arquiteto(a)',
];

const CONSELHOS_SEGURANCA = [
  { value: 'CREA', label: 'CREA' },
  { value: 'MTE', label: 'MTE' },
  { value: 'CRM', label: 'CRM' },
  { value: 'CAU', label: 'CAU' },
  { value: 'TST', label: 'TST' },
  { value: 'CRA', label: 'CRA' },
];

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ProfissionaisSeguranca() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [profissionais, setProfissionais] = useState<ProfissionalSeguranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalSeguranca | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    especialidade: '',
    nome: '',
    cpf: '',
    conselho: '',
    nr_conselho: '',
    uf_conselho: 'AC',
    senha_certificado: '',
  });
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProfissionais();
  }, [empresaId]);

  const fetchProfissionais = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profissionais_seguranca')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;
      setProfissionais(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      especialidade: '',
      nome: '',
      cpf: '',
      conselho: '',
      nr_conselho: '',
      uf_conselho: 'AC',
      senha_certificado: '',
    });
    setCertificadoFile(null);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    setSaving(true);
    try {
      let certificadoUrl = null;

      if (certificadoFile) {
        const fileExt = certificadoFile.name.split('.').pop();
        const fileName = `${empresaId}/profissionais-seguranca/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('certificados')
          .upload(fileName, certificadoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('certificados')
          .getPublicUrl(fileName);

        certificadoUrl = publicUrl;
      }

      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .insert({
          empresa_id: empresaId,
          especialidade: formData.especialidade,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ''),
          conselho: formData.conselho,
          nr_conselho: formData.nr_conselho,
          uf_conselho: formData.uf_conselho,
          certificado_digital_url: certificadoUrl,
          senha_certificado: formData.senha_certificado || null,
        });

      if (error) throw error;

      toast({
        title: "Profissional cadastrado",
        description: "O profissional de segurança foi cadastrado com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
      fetchProfissionais();
    } catch (error: any) {
      console.error('Erro ao cadastrar profissional:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Não foi possível cadastrar o profissional.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !selectedProfissional) return;

    setSaving(true);
    try {
      let certificadoUrl = selectedProfissional.certificado_digital_url;

      if (certificadoFile) {
        const fileExt = certificadoFile.name.split('.').pop();
        const fileName = `${empresaId}/profissionais-seguranca/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('certificados')
          .upload(fileName, certificadoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('certificados')
          .getPublicUrl(fileName);

        certificadoUrl = publicUrl;
      }

      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .update({
          especialidade: formData.especialidade,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ''),
          conselho: formData.conselho,
          nr_conselho: formData.nr_conselho,
          uf_conselho: formData.uf_conselho,
          certificado_digital_url: certificadoUrl,
          senha_certificado: formData.senha_certificado || null,
        })
        .eq('id', selectedProfissional.id);

      if (error) throw error;

      toast({
        title: "Profissional atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedProfissional(null);
      resetForm();
      fetchProfissionais();
    } catch (error: any) {
      console.error('Erro ao atualizar profissional:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar o profissional.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfissional) return;

    try {
      const { error } = await (supabase as any)
        .from('profissionais_seguranca')
        .delete()
        .eq('id', selectedProfissional.id);

      if (error) throw error;

      toast({
        title: "Profissional excluído",
        description: "O profissional foi excluído com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedProfissional(null);
      fetchProfissionais();
    } catch (error: any) {
      console.error('Erro ao excluir profissional:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o profissional.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (profissional: ProfissionalSeguranca) => {
    setSelectedProfissional(profissional);
    setFormData({
      especialidade: profissional.especialidade,
      nome: profissional.nome,
      cpf: formatCPF(profissional.cpf),
      conselho: profissional.conselho,
      nr_conselho: profissional.nr_conselho,
      uf_conselho: profissional.uf_conselho,
      senha_certificado: profissional.senha_certificado || '',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (profissional: ProfissionalSeguranca) => {
    setSelectedProfissional(profissional);
    setDeleteDialogOpen(true);
  };

  const exportToExcel = () => {
    const dataToExport = selectedIds.length > 0 
      ? profissionais.filter(p => selectedIds.includes(p.id))
      : profissionais;

    const headers = ['ID', 'Especialidade', 'Nome', 'CPF', 'Conselho', 'NR Conselho', 'UF Conselho'];
    const rows = dataToExport.map(p => [
      p.id,
      p.especialidade,
      p.nome,
      p.cpf,
      p.conselho,
      p.nr_conselho,
      p.uf_conselho,
    ]);

    const csvContent = [headers.join('|'), ...rows.map(r => r.join('|'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'profissionais_seguranca.csv';
    link.click();

    toast({
      title: "Exportação concluída",
      description: `${dataToExport.length} registro(s) exportado(s).`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProfissionais.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProfissionais.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredProfissionais = profissionais.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.especialidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profissionais de Segurança</h3>
        <p className="text-muted-foreground text-sm">
          Cadastre os profissionais de segurança da sua empresa.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar profissional..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional Segurança
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Ações em Massa
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredProfissionais.length && filteredProfissionais.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Profissionais Segurança</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredProfissionais.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum profissional encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProfissionais.map((profissional) => (
                <TableRow key={profissional.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(profissional.id)}
                      onCheckedChange={() => toggleSelect(profissional.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{profissional.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-primary">{profissional.nome}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(profissional)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(profissional)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Profissional de Segurança</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select
                  value={formData.especialidade}
                  onValueChange={(value) => setFormData({ ...formData, especialidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SEGURANCA.map((esp) => (
                      <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select
                  value={formData.conselho}
                  onValueChange={(value) => setFormData({ ...formData, conselho: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SEGURANCA.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>NR Conselho</Label>
                <Input
                  value={formData.nr_conselho}
                  onChange={(e) => setFormData({ ...formData, nr_conselho: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select
                  value={formData.uf_conselho}
                  onValueChange={(value) => setFormData({ ...formData, uf_conselho: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Certificado Digital</Label>
                <Input
                  type="file"
                  onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                  accept=".pfx,.p12"
                />
              </div>

              <div className="space-y-2">
                <Label>Senha Certificado</Label>
                <Input
                  type="password"
                  value={formData.senha_certificado}
                  onChange={(e) => setFormData({ ...formData, senha_certificado: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Profissional de Segurança</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select
                  value={formData.especialidade}
                  onValueChange={(value) => setFormData({ ...formData, especialidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES_SEGURANCA.map((esp) => (
                      <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label>Conselho</Label>
                <Select
                  value={formData.conselho}
                  onValueChange={(value) => setFormData({ ...formData, conselho: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSELHOS_SEGURANCA.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>NR Conselho</Label>
                <Input
                  value={formData.nr_conselho}
                  onChange={(e) => setFormData({ ...formData, nr_conselho: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>UF Conselho</Label>
                <Select
                  value={formData.uf_conselho}
                  onValueChange={(value) => setFormData({ ...formData, uf_conselho: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Certificado Digital</Label>
                <Input
                  type="file"
                  onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                  accept=".pfx,.p12"
                />
                {selectedProfissional?.certificado_digital_url && (
                  <p className="text-xs text-muted-foreground">Já possui certificado cadastrado</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Senha Certificado</Label>
                <Input
                  type="password"
                  value={formData.senha_certificado}
                  onChange={(e) => setFormData({ ...formData, senha_certificado: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o profissional "{selectedProfissional?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
