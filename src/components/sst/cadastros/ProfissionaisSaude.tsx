import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, FileSpreadsheet, ChevronDown, Loader2, Info } from 'lucide-react';
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

interface ProfissionalSaude {
  id: string;
  especialidade: string;
  nome: string;
  cpf: string;
  conselho: string;
  nr_conselho: string;
  uf_conselho: string;
  certificado_digital_url: string | null;
  senha_certificado: string | null;
  rubrica_url: string | null;
  empresa_id: string;
  created_at: string;
}

const ESPECIALIDADES_SAUDE = [
  'Médico(a)',
  'Enfermeiro(a)',
  'Técnico(a) de Enfermagem',
  'Fonoaudiólogo(a)',
];

const CONSELHOS_SAUDE = [
  { value: 'CRM', label: 'Conselho Regional de Medicina (CRM)' },
  { value: 'CRO', label: 'Conselho Regional de Odontologia (CRO)' },
  { value: 'RMS', label: 'Registro do Ministério da Saúde (RMS)' },
  { value: 'CRFa', label: 'Conselho Regional de Fonoaudiologia (CRFa)' },
];

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ProfissionaisSaude() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [profissionais, setProfissionais] = useState<ProfissionalSaude[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalSaude | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canDraw, setCanDraw] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [savingRubrica, setSavingRubrica] = useState(false);

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
        .from('profissionais_saude')
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
        const fileName = `${empresaId}/profissionais-saude/${Date.now()}.${fileExt}`;
        
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
        .from('profissionais_saude')
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
        description: "O profissional de saúde foi cadastrado com sucesso.",
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
        const fileName = `${empresaId}/profissionais-saude/${Date.now()}.${fileExt}`;
        
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
        .from('profissionais_saude')
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
        .from('profissionais_saude')
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

  const openEditDialog = (profissional: ProfissionalSaude) => {
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

  const openDeleteDialog = (profissional: ProfissionalSaude) => {
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
    link.download = 'profissionais_saude.csv';
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

  const openInfoDialog = (profissional: ProfissionalSaude) => {
    setSelectedProfissional(profissional);
    setCanDraw(false);
    setInfoDialogOpen(true);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#6b7280';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          if (profissional.rubrica_url) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = profissional.rubrica_url;
          }
        }
      }
    }, 100);
  };

  const enableDrawing = () => {
    setCanDraw(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveRubrica = async () => {
    if (!selectedProfissional || !canvasRef.current) return;
    
    setSavingRubrica(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const fileName = `${empresaId}/rubricas/${selectedProfissional.id}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('certificados')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificados')
        .getPublicUrl(fileName);

      const { error } = await (supabase as any)
        .from('profissionais_saude')
        .update({ rubrica_url: publicUrl })
        .eq('id', selectedProfissional.id);

      if (error) throw error;

      toast({
        title: "Rubrica salva",
        description: "A rubrica foi salva com sucesso.",
      });

      setInfoDialogOpen(false);
      fetchProfissionais();
    } catch (error: any) {
      console.error('Erro ao salvar rubrica:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a rubrica.",
        variant: "destructive",
      });
    } finally {
      setSavingRubrica(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profissionais de Saúde</h3>
        <p className="text-muted-foreground text-sm">
          Cadastre os profissionais de saúde da sua empresa.
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
            Novo Profissional Saúde
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
              <TableHead>Profissional</TableHead>
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
                        onClick={() => openInfoDialog(profissional)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Informações
                      </Button>
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
            <DialogTitle>Novo Profissional de Saúde</DialogTitle>
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
                    {ESPECIALIDADES_SAUDE.map((esp) => (
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
                    {CONSELHOS_SAUDE.map((c) => (
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
            <DialogTitle>Editar Profissional de Saúde</DialogTitle>
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
                    {ESPECIALIDADES_SAUDE.map((esp) => (
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
                    {CONSELHOS_SAUDE.map((c) => (
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

      {/* Dialog de Informações - Rubrica */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Rubrica para Documentos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={enableDrawing}
                className="bg-warning hover:bg-warning/90 text-white"
              >
                Habilitar para Assinar
              </Button>
              <Button
                type="button"
                onClick={clearCanvas}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Limpar Assinatura
              </Button>
            </div>

            <Button
              type="button"
              onClick={saveRubrica}
              disabled={savingRubrica}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {savingRubrica && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
