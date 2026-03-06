import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  Eye,
  Users,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  requisitos: string;
  beneficios: string;
  tipo_contrato: string;
  modalidade: string;
  local: string;
  salario_faixa: string;
  exibir_salario: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

interface Candidatura {
  id: string;
  vaga_id: string | null;
  nome_completo: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  grau_escolaridade: string;
  formacoes: any[];
  cursos: any[];
  experiencias: any[];
  sobre_voce: string;
  diferenciais: string;
  observacoes: string;
  created_at: string;
}

const tiposContrato = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer'];
const modalidades = ['Presencial', 'Remoto', 'Híbrido'];

export function AdminVagas() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVaga, setEditingVaga] = useState<Vaga | null>(null);
  const [candidaturaDialogOpen, setCandidaturaDialogOpen] = useState(false);
  const [selectedCandidatura, setSelectedCandidatura] = useState<Candidatura | null>(null);
  const [activeTab, setActiveTab] = useState<'vagas' | 'candidaturas'>('vagas');

  // Form
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [local, setLocal] = useState('');
  const [salarioFaixa, setSalarioFaixa] = useState('');
  const [exibirSalario, setExibirSalario] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vagasRes, candidaturasRes] = await Promise.all([
        (supabase as any).from('vagas').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('candidaturas').select('*').order('created_at', { ascending: false }),
      ]);

      if (vagasRes.error) throw vagasRes.error;
      if (candidaturasRes.error) throw candidaturasRes.error;

      setVagas(vagasRes.data || []);
      setCandidaturas(candidaturasRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setRequisitos('');
    setBeneficios('');
    setTipoContrato('');
    setModalidade('');
    setLocal('');
    setSalarioFaixa('');
    setExibirSalario(true);
    setEditingVaga(null);
  };

  const openNewVaga = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditVaga = (vaga: Vaga) => {
    setEditingVaga(vaga);
    setTitulo(vaga.titulo);
    setDescricao(vaga.descricao || '');
    setRequisitos(vaga.requisitos || '');
    setBeneficios(vaga.beneficios || '');
    setTipoContrato(vaga.tipo_contrato || '');
    setModalidade(vaga.modalidade || '');
    setLocal(vaga.local || '');
    setSalarioFaixa(vaga.salario_faixa || '');
    setExibirSalario(vaga.exibir_salario !== false);
    setDialogOpen(true);
  };

  const handleSaveVaga = async () => {
    if (!titulo.trim()) {
      toast.error('Informe o título da vaga');
      return;
    }

    setSaving(true);
    try {
      const vagaData = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        requisitos: requisitos.trim() || null,
        beneficios: beneficios.trim() || null,
        tipo_contrato: tipoContrato || null,
        modalidade: modalidade || null,
        local: local.trim() || null,
        salario_faixa: salarioFaixa.trim() || null,
        exibir_salario: exibirSalario,
        updated_at: new Date().toISOString(),
      };

      if (editingVaga) {
        const { error } = await (supabase as any)
          .from('vagas')
          .update(vagaData)
          .eq('id', editingVaga.id);
        if (error) throw error;
        toast.success('Vaga atualizada!');
      } else {
        const { error } = await (supabase as any)
          .from('vagas')
          .insert(vagaData);
        if (error) throw error;
        toast.success('Vaga criada!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar vaga:', error);
      toast.error('Erro ao salvar vaga');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtiva = async (vaga: Vaga) => {
    try {
      const { error } = await (supabase as any)
        .from('vagas')
        .update({ ativa: !vaga.ativa, updated_at: new Date().toISOString() })
        .eq('id', vaga.id);
      if (error) throw error;
      toast.success(vaga.ativa ? 'Vaga desativada' : 'Vaga ativada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDeleteVaga = async (vaga: Vaga) => {
    if (!confirm(`Excluir a vaga "${vaga.titulo}"?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('vagas')
        .delete()
        .eq('id', vaga.id);
      if (error) throw error;
      toast.success('Vaga excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir vaga');
    }
  };

  const handleDeleteCandidatura = async (candidatura: Candidatura) => {
    if (!confirm(`Excluir candidatura de "${candidatura.nome_completo}"?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('candidaturas')
        .delete()
        .eq('id', candidatura.id);
      if (error) throw error;
      toast.success('Candidatura excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir candidatura');
    }
  };

  const getVagaTitulo = (vagaId: string | null) => {
    if (!vagaId) return 'Banco de Talentos';
    const vaga = vagas.find(v => v.id === vagaId);
    return vaga?.titulo || 'Vaga removida';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'vagas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('vagas')}
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Vagas ({vagas.length})
        </Button>
        <Button
          variant={activeTab === 'candidaturas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('candidaturas')}
        >
          <Users className="h-4 w-4 mr-2" />
          Candidaturas ({candidaturas.length})
        </Button>
      </div>

      {activeTab === 'vagas' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Gerencie as vagas publicadas na página "Trabalhe Conosco"
            </p>
            <Button onClick={openNewVaga}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
          </div>

          {vagas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma vaga cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {vagas.map((vaga) => (
                <Card key={vaga.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{vaga.titulo}</h3>
                          <Badge variant={vaga.ativa ? 'default' : 'secondary'}>
                            {vaga.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {vaga.tipo_contrato && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {vaga.tipo_contrato}
                            </span>
                          )}
                          {vaga.modalidade && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> {vaga.modalidade}
                            </span>
                          )}
                          {vaga.local && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {vaga.local}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {candidaturas.filter(c => c.vaga_id === vaga.id).length} candidaturas
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={vaga.ativa}
                          onCheckedChange={() => handleToggleAtiva(vaga)}
                        />
                        <Button variant="ghost" size="sm" onClick={() => openEditVaga(vaga)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVaga(vaga)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'candidaturas' && (
        <>
          <p className="text-sm text-muted-foreground">
            Candidaturas recebidas pelo formulário "Trabalhe Conosco"
          </p>

          {candidaturas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma candidatura recebida</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidaturas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome_completo}</TableCell>
                      <TableCell className="text-sm">{c.email}</TableCell>
                      <TableCell className="text-sm">{c.telefone}</TableCell>
                      <TableCell>
                        <Badge variant={c.vaga_id ? 'default' : 'secondary'} className="text-xs">
                          {getVagaTitulo(c.vaga_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidatura(c);
                              setCandidaturaDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCandidatura(c)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Dialog Nova/Editar Vaga */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVaga ? 'Editar Vaga' : 'Nova Vaga'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Desenvolvedor Full Stack" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Contrato</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposContrato.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select value={modalidade} onValueChange={setModalidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Local</Label>
                <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: São Paulo/SP" />
              </div>
              <div className="space-y-1.5">
                <Label>Faixa Salarial</Label>
                <Input value={salarioFaixa} onChange={(e) => setSalarioFaixa(e.target.value)} placeholder="Ex: R$ 5.000 - R$ 8.000" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={exibirSalario} onCheckedChange={setExibirSalario} />
              <Label className="cursor-pointer" onClick={() => setExibirSalario(!exibirSalario)}>Exibir salário na página pública</Label>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a vaga..." rows={4} />
            </div>

            <div className="space-y-1.5">
              <Label>Requisitos</Label>
              <Textarea value={requisitos} onChange={(e) => setRequisitos(e.target.value)} placeholder="Liste os requisitos..." rows={4} />
            </div>

            <div className="space-y-1.5">
              <Label>Benefícios</Label>
              <Textarea value={beneficios} onChange={(e) => setBeneficios(e.target.value)} placeholder="Liste os benefícios..." rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveVaga} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingVaga ? 'Salvar' : 'Criar Vaga'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes Candidatura */}
      <Dialog open={candidaturaDialogOpen} onOpenChange={setCandidaturaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Candidatura</DialogTitle>
          </DialogHeader>

          {selectedCandidatura && (
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-primary">Dados Pessoais</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedCandidatura.nome_completo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>
                    <p className="font-medium">{selectedCandidatura.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{selectedCandidatura.telefone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data de Nascimento:</span>
                    <p className="font-medium">
                      {selectedCandidatura.data_nascimento
                        ? new Date(selectedCandidatura.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vaga:</span>
                    <p className="font-medium">
                      <Badge variant={selectedCandidatura.vaga_id ? 'default' : 'secondary'}>
                        {getVagaTitulo(selectedCandidatura.vaga_id)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Escolaridade:</span>
                    <p className="font-medium">{selectedCandidatura.grau_escolaridade || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              {(selectedCandidatura.logradouro || selectedCandidatura.cidade) && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Endereço</h4>
                  <p className="text-sm">
                    {[
                      selectedCandidatura.logradouro,
                      selectedCandidatura.numero && `nº ${selectedCandidatura.numero}`,
                      selectedCandidatura.complemento,
                      selectedCandidatura.bairro,
                      selectedCandidatura.cidade && `${selectedCandidatura.cidade}/${selectedCandidatura.estado}`,
                      selectedCandidatura.cep && `CEP: ${selectedCandidatura.cep}`,
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {/* Formações */}
              {selectedCandidatura.formacoes && selectedCandidatura.formacoes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Formação Acadêmica</h4>
                  <div className="space-y-2">
                    {selectedCandidatura.formacoes.map((f: any, i: number) => (
                      <Card key={i} className="border-dashed">
                        <CardContent className="p-3 text-sm">
                          <p className="font-medium">{f.curso || 'Curso não informado'}</p>
                          <p className="text-muted-foreground">{f.instituicao || 'Instituição não informada'}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {f.status && <Badge variant="outline" className="text-xs">{f.status}</Badge>}
                            {f.data_inicio && <span>Início: {new Date(f.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                            {f.data_fim && <span>Fim: {new Date(f.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Cursos */}
              {selectedCandidatura.cursos && selectedCandidatura.cursos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Cursos Complementares</h4>
                  <div className="space-y-2">
                    {selectedCandidatura.cursos.map((c: any, i: number) => (
                      <Card key={i} className="border-dashed">
                        <CardContent className="p-3 text-sm">
                          <p className="font-medium">{c.nome || 'Curso não informado'}</p>
                          <p className="text-muted-foreground">{c.instituicao || 'Instituição não informada'}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {c.carga_horaria && <span>{c.carga_horaria}</span>}
                            {c.data_conclusao && <span>Conclusão: {new Date(c.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sobre Você */}
              {selectedCandidatura.sobre_voce && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Sobre o Candidato</h4>
                  <p className="text-sm whitespace-pre-line">{selectedCandidatura.sobre_voce}</p>
                </div>
              )}

              {/* Experiências */}
              {selectedCandidatura.experiencias && selectedCandidatura.experiencias.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Experiência Profissional</h4>
                  <div className="space-y-2">
                    {selectedCandidatura.experiencias.map((exp: any, i: number) => (
                      <Card key={i} className="border-dashed">
                        <CardContent className="p-3 text-sm">
                          <p className="font-medium">{exp.cargo || 'Cargo não informado'}</p>
                          <p className="text-muted-foreground">{exp.empresa || 'Empresa não informada'}</p>
                          {exp.periodo && <p className="text-xs text-muted-foreground mt-1">{exp.periodo}</p>}
                          {exp.descricao && <p className="text-xs mt-1 whitespace-pre-line">{exp.descricao}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Diferenciais */}
              {selectedCandidatura.diferenciais && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Diferenciais</h4>
                  <p className="text-sm whitespace-pre-line">{selectedCandidatura.diferenciais}</p>
                </div>
              )}

              {/* Observações */}
              {selectedCandidatura.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-primary">Observações</h4>
                  <p className="text-sm whitespace-pre-line">{selectedCandidatura.observacoes}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-right">
                Recebido em {new Date(selectedCandidatura.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
