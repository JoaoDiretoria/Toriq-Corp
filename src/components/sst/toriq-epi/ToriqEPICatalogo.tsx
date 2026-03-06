import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Plus, Search, Download, Upload, Pencil, Trash2, Loader2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';

// Categorias de proteção (A-I)
const CATEGORIAS_PROTECAO = [
  { value: 'A', label: 'A — EPI PARA PROTEÇÃO DA CABEÇA' },
  { value: 'B', label: 'B — EPI PARA PROTEÇÃO DOS OLHOS E FACE' },
  { value: 'C', label: 'C — EPI PARA PROTEÇÃO AUDITIVA' },
  { value: 'D', label: 'D — EPI PARA PROTEÇÃO RESPIRATÓRIA' },
  { value: 'E', label: 'E — EPI PARA PROTEÇÃO DO TRONCO' },
  { value: 'F', label: 'F — EPI PARA PROTEÇÃO DOS MEMBROS SUPERIORES' },
  { value: 'G', label: 'G — EPI PARA PROTEÇÃO DOS MEMBROS INFERIORES' },
  { value: 'H', label: 'H — EPI PARA PROTEÇÃO DO CORPO INTEIRO' },
  { value: 'I', label: 'I — EPI PARA PROTEÇÃO CONTRA QUEDAS COM DIFERENÇA DE NÍVEL' },
];

// Tipos de EPI por categoria
const TIPOS_EPI: Record<string, string[]> = {
  'A': [
    'Capacete para proteção contra impactos de objetos sobre o crânio',
    'Capacete para proteção contra choques elétricos',
    'Capacete para proteção do crânio e face contra agentes térmicos',
    'Capuz para proteção do crânio e pescoço contra agentes térmicos',
    'Capuz para proteção do crânio, face e pescoço contra agentes químicos',
    'Capuz para proteção do crânio e pescoço contra agentes abrasivos e escoriantes',
    'Capuz para proteção do crânio e pescoço contra umidade proveniente de operações com utilização de água',
  ],
  'B': [
    'Óculos para proteção dos olhos contra impactos de partículas volantes',
    'Óculos para proteção dos olhos contra luminosidade intensa',
    'Óculos para proteção dos olhos contra radiação ultravioleta',
    'Óculos para proteção dos olhos contra radiação infravermelha',
    'Óculos de tela para proteção limitada dos olhos contra impactos de partículas volantes',
    'Protetor facial para proteção da face contra impactos de partículas volantes',
    'Protetor facial para proteção dos olhos contra luminosidade intensa',
    'Protetor facial para proteção da face contra radiação infravermelha',
    'Protetor facial para proteção da face contra radiação ultravioleta',
    'Protetor facial para proteção da face contra agentes térmicos',
    'Máscara de solda para proteção dos olhos e face contra impactos de partículas volantes, radiação ultravioleta, radiação infravermelha e luminosidade intensa',
  ],
  'C': [
    'Protetor auditivo circum-auricular',
    'Protetor auditivo de inserção',
    'Protetor auditivo semiauricular',
  ],
  'D': [
    'Peça semifacial filtrante PFF1 para proteção contra poeiras e névoas',
    'Peça semifacial filtrante PFF2 para proteção contra poeiras, névoas e fumos',
    'Peça semifacial filtrante PFF3 para proteção contra poeiras, névoas, fumos e radionuclídeos',
    'Peça um quarto facial ou semifacial com filtro para partículas classe P1',
    'Peça um quarto facial, semifacial ou facial inteira com filtro para partículas classe P2',
    'Peça um quarto facial, semifacial ou facial inteira com filtro para partículas classe P3',
    'Peça um quarto facial, semifacial ou facial inteira com filtros químicos para gases e vapores',
    'Peça um quarto facial, semifacial ou facial inteira com filtros combinados (gases, vapores e particulados)',
    'Respirador purificador de ar motorizado sem vedação facial (touca, capuz, protetor facial ou capacete) com filtros para partículas',
    'Respirador purificador de ar motorizado sem vedação facial com filtros químicos',
    'Respirador purificador de ar motorizado sem vedação facial com filtros combinados',
    'Respirador purificador de ar motorizado com vedação facial semifacial',
    'Respirador purificador de ar motorizado com vedação facial facial inteira',
    'Respirador de adução de ar tipo linha de ar comprimido sem vedação facial (capuz, protetor facial ou capacete)',
    'Respirador de adução de ar tipo linha de ar comprimido sem vedação facial para jateamento',
    'Respirador de adução de ar tipo linha de ar comprimido com vedação facial semifacial',
    'Respirador de adução de ar tipo linha de ar comprimido com vedação facial facial inteira',
    'Respirador de adução de ar tipo linha de ar comprimido de demanda com ou sem pressão positiva',
    'Respirador de adução de ar tipo linha de ar comprimido com pressão positiva e cilindro auxiliar para fuga',
    'Respirador de adução de ar tipo máscara autônoma de circuito aberto com pressão positiva',
    'Respirador de adução de ar tipo máscara autônoma de circuito fechado com pressão positiva',
    'Respirador de fuga purificador de ar com bocal e pinça nasal',
    'Respirador de fuga purificador de ar com capuz',
    'Respirador de fuga purificador de ar com peça facial',
    'Respirador de fuga tipo máscara autônoma com peça facial inteira',
  ],
  'E': [
    'Vestimenta para proteção do tronco contra agentes térmicos',
    'Vestimenta para proteção do tronco contra agentes mecânicos',
    'Vestimenta para proteção do tronco contra agentes químicos',
    'Vestimenta para proteção do tronco contra radiação ionizante',
    'Vestimenta para proteção do tronco contra umidade por precipitação pluviométrica',
    'Vestimenta para proteção do tronco contra umidade por operações com utilização de água',
    'Colete à prova de balas de uso permitido para vigilantes armados',
  ],
  'F': [
    'Luvas para proteção contra agentes abrasivos e escoriantes',
    'Luvas para proteção contra agentes cortantes e perfurantes',
    'Luvas para proteção contra choques elétricos',
    'Luvas para proteção contra agentes térmicos',
    'Luvas para proteção contra agentes biológicos',
    'Luvas para proteção contra agentes químicos',
    'Luvas para proteção contra vibrações',
    'Luvas para proteção contra umidade proveniente de operações com utilização de água',
    'Luvas para proteção contra radiação ionizante',
    'Creme protetor de segurança contra agentes químicos',
    'Manga para proteção do braço e antebraço contra choques elétricos',
    'Manga para proteção do braço e antebraço contra agentes abrasivos e escoriantes',
    'Manga para proteção do braço e antebraço contra agentes cortantes e perfurantes',
    'Manga para proteção do braço e antebraço contra umidade proveniente de operações com utilização de água',
    'Manga para proteção do braço e antebraço contra agentes térmicos',
    'Manga para proteção do braço e antebraço contra agentes químicos',
    'Braçadeira para proteção do antebraço contra agentes cortantes',
    'Braçadeira para proteção do antebraço contra agentes escoriantes',
    'Dedeira para proteção dos dedos contra agentes abrasivos e escoriantes',
  ],
  'G': [
    'Calçado para proteção contra impactos de quedas de objetos sobre os artelhos',
    'Calçado para proteção contra choques elétricos',
    'Calçado para proteção contra agentes térmicos',
    'Calçado para proteção contra agentes abrasivos e escoriantes',
    'Calçado para proteção contra agentes cortantes e perfurantes',
    'Calçado para proteção contra umidade proveniente de operações com utilização de água',
    'Calçado para proteção contra agentes químicos',
    'Meia para proteção dos pés contra baixas temperaturas',
    'Perneira para proteção contra agentes abrasivos e escoriantes',
    'Perneira para proteção contra agentes cortantes e perfurantes',
    'Perneira para proteção contra agentes térmicos',
    'Perneira para proteção contra agentes químicos',
    'Perneira para proteção contra umidade proveniente de operações com utilização de água',
    'Calça para proteção das pernas contra agentes abrasivos e escoriantes',
    'Calça para proteção das pernas contra agentes cortantes e perfurantes',
    'Calça para proteção das pernas contra agentes químicos',
    'Calça para proteção das pernas contra agentes térmicos',
    'Calça para proteção das pernas contra umidade proveniente de operações com utilização de água',
    'Calça para proteção das pernas contra umidade proveniente de precipitação pluviométrica',
  ],
  'H': [
    'Macacão para proteção contra agentes térmicos',
    'Macacão para proteção contra agentes químicos',
    'Macacão para proteção contra umidade proveniente de operações com utilização de água',
    'Macacão para proteção contra umidade proveniente de precipitação pluviométrica',
    'Vestimenta de corpo inteiro para proteção contra agentes químicos',
    'Vestimenta de corpo inteiro condutiva para proteção contra choques elétricos',
    'Vestimenta de corpo inteiro para proteção contra umidade proveniente de operações com utilização de água',
    'Vestimenta de corpo inteiro para proteção contra umidade proveniente de precipitação pluviométrica',
  ],
  'I': [
    'Cinturão de segurança com dispositivo trava-queda para proteção contra quedas em movimentação vertical ou horizontal',
    'Cinturão de segurança com talabarte para proteção contra riscos de queda em trabalhos em altura',
    'Cinturão de segurança com talabarte para posicionamento em trabalhos em altura',
  ],
};

interface FormEPI {
  id?: string;
  protecao_para: string;
  tipo_epi: string;
  nome_modelo: string;
  fabricante: string;
  numero_ca: string;
  ativo: string;
}

interface CadastroEPI {
  id: string;
  empresa_id: string;
  protecao_para: string;
  tipo_epi: string;
  nome_modelo: string;
  fabricante: string | null;
  numero_ca: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const initialFormState: FormEPI = {
  protecao_para: '',
  tipo_epi: '',
  nome_modelo: '',
  fabricante: '',
  numero_ca: '',
  ativo: 'true',
};

// Função para obter o label da categoria
const getCategoriaLabel = (value: string): string => {
  const cat = CATEGORIAS_PROTECAO.find(c => c.value === value);
  return cat ? cat.label : value;
};

export function ToriqEPICatalogo() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { empresaMode, isInEmpresaMode } = useEmpresaMode();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState<FormEPI>(initialFormState);
  const [epis, setEpis] = useState<CadastroEPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Empresa ID a ser usada
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : profile?.empresa_id;

  // Lista de EPIs disponíveis baseada na categoria selecionada
  const episDisponiveis = form.protecao_para ? TIPOS_EPI[form.protecao_para] || [] : [];

  // Carregar EPIs (ativos e inativos)
  const loadEpis = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastro_epis')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ativo', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEpis(data || []);
    } catch (error) {
      console.error('Erro ao carregar EPIs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os EPIs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEpis();
  }, [empresaId]);

  // Filtrar EPIs pelo termo de busca (nome, status, fabricante, número CA)
  const filteredEpis = epis.filter(epi => {
    const searchLower = searchTerm.toLowerCase().trim();
    const statusText = epi.ativo ? 'ativo' : 'inativo';
    
    // Se buscar por status, fazer comparação exata
    if (searchLower === 'ativo' || searchLower === 'inativo') {
      return statusText === searchLower;
    }
    
    return (
      epi.nome_modelo.toLowerCase().includes(searchLower) ||
      (epi.fabricante && epi.fabricante.toLowerCase().includes(searchLower)) ||
      (epi.numero_ca && epi.numero_ca.toLowerCase().includes(searchLower))
    );
  });

  const handleOpenDialog = () => {
    setForm(initialFormState);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (epi: CadastroEPI) => {
    setForm({
      id: epi.id,
      protecao_para: epi.protecao_para,
      tipo_epi: epi.tipo_epi,
      nome_modelo: epi.nome_modelo,
      fabricante: epi.fabricante || '',
      numero_ca: epi.numero_ca || '',
      ativo: epi.ativo ? 'true' : 'false',
    });
    setEditingId(epi.id);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleCategoriaChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      protecao_para: value,
      tipo_epi: '',
    }));
  };

  const handleSave = async () => {
    if (!empresaId) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.protecao_para || !form.tipo_epi || !form.nome_modelo) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a categoria de proteção, tipo de EPI e nome/modelo.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Atualizar EPI existente
        const { error } = await supabase
          .from('cadastro_epis')
          .update({
            protecao_para: form.protecao_para,
            tipo_epi: form.tipo_epi,
            nome_modelo: form.nome_modelo,
            fabricante: form.fabricante || null,
            numero_ca: form.numero_ca || null,
            ativo: form.ativo === 'true',
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'EPI atualizado com sucesso.',
        });
      } else {
        // Criar novo EPI
        const { error } = await supabase
          .from('cadastro_epis')
          .insert({
            empresa_id: empresaId,
            protecao_para: form.protecao_para,
            tipo_epi: form.tipo_epi,
            nome_modelo: form.nome_modelo,
            fabricante: form.fabricante || null,
            numero_ca: form.numero_ca || null,
            created_by: profile?.id,
          });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'EPI cadastrado com sucesso.',
        });
      }

      setDialogOpen(false);
      setForm(initialFormState);
      setEditingId(null);
      loadEpis();
    } catch (error) {
      console.error('Erro ao salvar EPI:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o EPI.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('cadastro_epis')
        .update({ ativo: false })
        .eq('id', deletingId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'EPI removido com sucesso.',
      });

      setDeleteDialogOpen(false);
      setDeletingId(null);
      loadEpis();
    } catch (error) {
      console.error('Erro ao deletar EPI:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o EPI.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (epi: CadastroEPI) => {
    try {
      const { error } = await supabase
        .from('cadastro_epis')
        .update({ ativo: !epi.ativo })
        .eq('id', epi.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `EPI ${epi.ativo ? 'inativado' : 'ativado'} com sucesso.`,
      });

      loadEpis();
    } catch (error) {
      console.error('Erro ao alterar status do EPI:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do EPI.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Cadastro de EPI
          </h1>
          <p className="text-muted-foreground">
            Cadastro e gerenciamento de Equipamentos de Proteção Individual
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar EPI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold mb-1">Opções de busca:</p>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Nome/Modelo</strong> do EPI</li>
                  <li>• <strong>Status</strong>: digite "ativo" ou "inativo"</li>
                  <li>• <strong>Fabricante</strong></li>
                  <li>• <strong>Nº C.A.</strong></li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo EPI
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>EPIs Cadastrados</CardTitle>
          <CardDescription>Lista de todos os EPIs disponíveis ({filteredEpis.length} registros)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEpis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum EPI cadastrado ainda.</p>
              <p className="text-sm">Clique em "Novo EPI" para começar.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proteção para</TableHead>
                    <TableHead>EPI</TableHead>
                    <TableHead>Nome / Modelo</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Nº C.A.</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEpis.map((epi) => (
                    <TableRow key={epi.id}>
                      <TableCell className="font-medium">
                        {getCategoriaLabel(epi.protecao_para)}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={epi.tipo_epi}>
                        {epi.tipo_epi}
                      </TableCell>
                      <TableCell>{epi.nome_modelo}</TableCell>
                      <TableCell>{epi.fabricante || '-'}</TableCell>
                      <TableCell>{epi.numero_ca || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={epi.ativo ? 'default' : 'secondary'}
                          className={`cursor-pointer ${epi.ativo ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                          onClick={() => handleToggleStatus(epi)}
                        >
                          {epi.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(epi)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(epi.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição de EPI */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar EPI' : 'Novo EPI'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do Equipamento de Proteção Individual
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Proteção para */}
            <div className="grid gap-2">
              <Label htmlFor="protecao_para">Proteção para</Label>
              <Select
                value={form.protecao_para}
                onValueChange={handleCategoriaChange}
              >
                <SelectTrigger id="protecao_para">
                  <SelectValue placeholder="Selecione a categoria de proteção" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PROTECAO.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de EPI */}
            <div className="grid gap-2">
              <Label htmlFor="tipo_epi">EPI</Label>
              <Select
                value={form.tipo_epi}
                onValueChange={(value) => setForm(prev => ({ ...prev, tipo_epi: value }))}
                disabled={!form.protecao_para}
              >
                <SelectTrigger id="tipo_epi">
                  <SelectValue placeholder={form.protecao_para ? "Selecione o tipo de EPI" : "Selecione primeiro a categoria"} />
                </SelectTrigger>
                <SelectContent>
                  {episDisponiveis.map((epi, index) => (
                    <SelectItem key={index} value={epi}>
                      {epi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome/Modelo */}
            <div className="grid gap-2">
              <Label htmlFor="nome_modelo">Nome / Modelo</Label>
              <Input
                id="nome_modelo"
                placeholder="Ex: Capacete H-700"
                value={form.nome_modelo}
                onChange={(e) => setForm(prev => ({ ...prev, nome_modelo: e.target.value }))}
              />
            </div>

            {/* Fabricante */}
            <div className="grid gap-2">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input
                id="fabricante"
                placeholder="Ex: 3M"
                value={form.fabricante}
                onChange={(e) => setForm(prev => ({ ...prev, fabricante: e.target.value }))}
              />
            </div>

            {/* Nº C.A. */}
            <div className="grid gap-2">
              <Label htmlFor="numero_ca">Nº C.A.</Label>
              <Input
                id="numero_ca"
                placeholder="Ex: 12345"
                value={form.numero_ca}
                onChange={(e) => setForm(prev => ({ ...prev, numero_ca: e.target.value }))}
              />
            </div>

            {/* Status - apenas na edição */}
            {editingId && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.ativo}
                  onValueChange={(value) => setForm(prev => ({ ...prev, ativo: value }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este EPI? Esta ação não pode ser desfeita.
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
