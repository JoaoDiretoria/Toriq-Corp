import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParceiraInstrutorCadastroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingInstrutor?: any;
  empresaParceiraId: string | null;
  empresaSstId: string | null;
}

interface Treinamento {
  id: string;
  nome: string;
  norma: string;
}

const FORMACOES_ACADEMICAS = [
  'Técnico(a) em Segurança do Trabalho',
  'Engenheiro de Segurança do Trabalho',
  'Engenheiro(a) Eletricista',
  'Engenheiro(a) Mecânico(a)',
  'Eletrotécnico(a)',
  'Enfermeiro(a)',
];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ParceiraInstrutorCadastroDialog({
  open,
  onOpenChange,
  onSuccess,
  editingInstrutor,
  empresaParceiraId,
  empresaSstId,
}: ParceiraInstrutorCadastroDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [treinamentosDisponiveis, setTreinamentosDisponiveis] = useState<Treinamento[]>([]);
  const [formacoesCustom, setFormacoesCustom] = useState<string[]>([]);
  const [novaFormacao, setNovaFormacao] = useState('');
  const [showNovaFormacaoInput, setShowNovaFormacaoInput] = useState(false);

  // Form data - Etapa 1: Informações Pessoais
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [informarVeiculo, setInformarVeiculo] = useState<'sim' | 'nao'>('nao');
  const [veiculo, setVeiculo] = useState('');
  const [placa, setPlaca] = useState('');

  // Form data - Etapa 2: Endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  // Form data - Etapa 3: Informações Profissionais
  const [formacaoAcademica, setFormacaoAcademica] = useState('');
  const [treinamentosSelecionados, setTreinamentosSelecionados] = useState<string[]>([]);

  // Funções de formatação
  const formatCpfValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatTelefoneValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      }
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCepValue = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const fetchInstrutorTreinamentos = async (instrutorId: string) => {
    try {
      const { data, error } = await supabase
        .from('instrutor_treinamentos')
        .select('treinamento_id')
        .eq('instrutor_id', instrutorId);
      
      if (error) throw error;
      
      const treinamentoIds = (data || []).map((item: any) => item.treinamento_id);
      setTreinamentosSelecionados(treinamentoIds);
    } catch (error) {
      console.error('Erro ao carregar treinamentos do instrutor:', error);
    }
  };

  useEffect(() => {
    if (open && empresaSstId) {
      fetchTreinamentos();
    }
  }, [open, empresaSstId]);

  useEffect(() => {
    if (editingInstrutor && open) {
      // Preencher dados para edição
      setNome(editingInstrutor.nome || '');
      setCpf(formatCpfValue(editingInstrutor.cpf_cnpj || ''));
      setEmail(editingInstrutor.email || '');
      setTelefone(formatTelefoneValue(editingInstrutor.telefone || ''));
      setDataNascimento(editingInstrutor.data_nascimento || '');
      setInformarVeiculo(editingInstrutor.veiculo ? 'sim' : 'nao');
      setVeiculo(editingInstrutor.veiculo || '');
      setPlaca(editingInstrutor.placa || '');
      setCep(formatCepValue(editingInstrutor.cep || ''));
      setLogradouro(editingInstrutor.logradouro || '');
      setBairro(editingInstrutor.bairro || '');
      setNumero(editingInstrutor.numero || '');
      setComplemento(editingInstrutor.complemento || '');
      setCidade(editingInstrutor.cidade || '');
      setUf(editingInstrutor.uf || '');
      setFormacaoAcademica(editingInstrutor.formacao_academica || '');
      
      // Carregar treinamentos associados ao instrutor
      fetchInstrutorTreinamentos(editingInstrutor.id);
    } else if (!editingInstrutor && open) {
      resetForm();
    }
  }, [editingInstrutor, open]);

  const resetForm = () => {
    setCurrentStep(1);
    setNome('');
    setCpf('');
    setTelefone('');
    setEmail('');
    setDataNascimento('');
    setInformarVeiculo('nao');
    setVeiculo('');
    setPlaca('');
    setCep('');
    setLogradouro('');
    setBairro('');
    setNumero('');
    setComplemento('');
    setCidade('');
    setUf('');
    setFormacaoAcademica('');
    setTreinamentosSelecionados([]);
    setNovaFormacao('');
    setShowNovaFormacaoInput(false);
  };

  const fetchTreinamentos = async () => {
    if (!empresaSstId) return;

    try {
      // Buscar treinamentos do catálogo da empresa SST vinculada
      const { data, error } = await supabase
        .from('catalogo_treinamentos')
        .select('id, nome, norma')
        .eq('empresa_id', empresaSstId);

      if (error) throw error;
      
      const treinamentos = (data || []).map((item: any) => ({
        id: item.id as string,
        nome: item.nome as string,
        norma: item.norma as string,
      }));
      
      // Ordenar por número da NR
      treinamentos.sort((a, b) => {
        const numA = parseInt(a.norma.replace(/\D/g, '')) || 999;
        const numB = parseInt(b.norma.replace(/\D/g, '')) || 999;
        if (numA !== numB) return numA - numB;
        return a.nome.localeCompare(b.nome);
      });
      
      setTreinamentosDisponiveis(treinamentos);
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
    }
  };

  const buscarCep = async (cepValue: string) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setLogradouro(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setUf(data.uf || '');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const validateStep1 = () => {
    if (!nome.trim()) {
      toast.error('Nome completo é obrigatório');
      return false;
    }
    if (!cpf.trim()) {
      toast.error('CPF é obrigatório');
      return false;
    }
    if (!telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return false;
    }
    if (!email.trim()) {
      toast.error('E-mail é obrigatório');
      return false;
    }
    if (informarVeiculo === 'sim' && !veiculo.trim()) {
      toast.error('Informações do veículo são obrigatórias');
      return false;
    }
    if (informarVeiculo === 'sim' && !placa.trim()) {
      toast.error('Placa do veículo é obrigatória');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!cep.trim()) {
      toast.error('CEP é obrigatório');
      return false;
    }
    if (!logradouro.trim()) {
      toast.error('Logradouro é obrigatório');
      return false;
    }
    if (!bairro.trim()) {
      toast.error('Bairro é obrigatório');
      return false;
    }
    if (!numero.trim()) {
      toast.error('Número é obrigatório');
      return false;
    }
    if (!cidade.trim()) {
      toast.error('Cidade é obrigatória');
      return false;
    }
    if (!uf.trim()) {
      toast.error('UF é obrigatório');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddFormacao = () => {
    if (novaFormacao.trim() && !formacoesCustom.includes(novaFormacao.trim())) {
      setFormacoesCustom([...formacoesCustom, novaFormacao.trim()]);
      setFormacaoAcademica(novaFormacao.trim());
      setNovaFormacao('');
      setShowNovaFormacaoInput(false);
    }
  };

  const handleSave = async () => {
    if (!empresaParceiraId || !empresaSstId) {
      toast.error('Empresa parceira não configurada corretamente');
      return;
    }

    setSaving(true);
    try {
      // Dados do instrutor - vinculado à empresa SST mas com empresa_parceira_id
      const instrutorData = {
        empresa_id: empresaSstId, // Vincula à empresa SST para aparecer no catálogo dela
        empresa_parceira_id: empresaParceiraId, // Identifica que foi criado pela parceira
        nome: nome.trim(),
        cpf_cnpj: cpf.replace(/\D/g, ''),
        email: email.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        data_nascimento: dataNascimento || null,
        veiculo: informarVeiculo === 'sim' ? veiculo.trim() : null,
        placa: informarVeiculo === 'sim' ? placa.trim().toUpperCase() : null,
        cep: cep.replace(/\D/g, '') || null,
        logradouro: logradouro.trim() || null,
        bairro: bairro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        formacao_academica: formacaoAcademica || null,
        ativo: true,
        treinamentos_count: treinamentosSelecionados.length,
      };

      let instrutorId: string;

      if (editingInstrutor) {
        const { error } = await supabase
          .from('instrutores')
          .update(instrutorData)
          .eq('id', editingInstrutor.id);

        if (error) throw error;
        instrutorId = editingInstrutor.id;

        // Smart diff para instrutor_treinamentos: preservar registros existentes e seus anexos
        const { data: treinamentosExistentes } = await supabase
          .from('instrutor_treinamentos')
          .select('id, treinamento_id, documento_url')
          .eq('instrutor_id', instrutorId);

        const idsExistentes = (treinamentosExistentes || []).map((t: any) => t.treinamento_id);
        const idsNovos = treinamentosSelecionados;

        // Deletar apenas os treinamentos que foram REMOVIDOS
        const idsParaRemover = idsExistentes.filter((id: string) => !idsNovos.includes(id));
        if (idsParaRemover.length > 0) {
          const removidos = (treinamentosExistentes || []).filter((t: any) => idsParaRemover.includes(t.treinamento_id));
          const anexosRemovidos = removidos.map((t: any) => t.documento_url).filter(Boolean);
          if (anexosRemovidos.length > 0) {
            const filePaths = anexosRemovidos
              .map((url: string) => { const match = url.match(/\/storage\/v1\/object\/public\/([^?]+)/); return match ? match[1] : null; })
              .filter(Boolean) as string[];
            if (filePaths.length > 0) {
              const bucketFiles: Record<string, string[]> = {};
              filePaths.forEach((path: string) => { const [bucket, ...rest] = path.split('/'); if (!bucketFiles[bucket]) bucketFiles[bucket] = []; bucketFiles[bucket].push(rest.join('/')); });
              for (const [bucket, files] of Object.entries(bucketFiles)) {
                await supabase.storage.from(bucket).remove(files);
              }
            }
          }
          await supabase
            .from('instrutor_treinamentos')
            .delete()
            .eq('instrutor_id', instrutorId)
            .in('treinamento_id', idsParaRemover);
        }

        // Inserir apenas os treinamentos NOVOS
        const idsParaInserir = idsNovos.filter((id: string) => !idsExistentes.includes(id));
        if (idsParaInserir.length > 0) {
          const treinamentosInsert = idsParaInserir.map((treinamentoId: string) => ({
            instrutor_id: instrutorId,
            treinamento_id: treinamentoId,
          }));
          const { error: treinamentosError } = await supabase
            .from('instrutor_treinamentos')
            .insert(treinamentosInsert);
          if (treinamentosError) {
            console.error('Erro ao salvar treinamentos:', treinamentosError);
          }
        }
      } else {
        const { data, error } = await supabase
          .from('instrutores')
          .insert(instrutorData)
          .select('id')
          .single();

        if (error) throw error;
        instrutorId = data.id;
      }

      // Inserir treinamentos selecionados (apenas para NOVO cadastro)
      if (!editingInstrutor && treinamentosSelecionados.length > 0) {
        const treinamentosInsert = treinamentosSelecionados.map(treinamentoId => ({
          instrutor_id: instrutorId,
          treinamento_id: treinamentoId,
        }));

        const { error: treinamentosError } = await supabase
          .from('instrutor_treinamentos')
          .insert(treinamentosInsert);

        if (treinamentosError) {
          console.error('Erro ao salvar treinamentos:', treinamentosError);
        }
      }

      // Inserir formação acadêmica na tabela instrutor_formacoes (se não existir)
      if (formacaoAcademica && !editingInstrutor) {
        const { error: formacaoError } = await supabase
          .from('instrutor_formacoes')
          .insert({
            instrutor_id: instrutorId,
            nome: formacaoAcademica,
          });

        if (formacaoError) {
          console.error('Erro ao salvar formação:', formacaoError);
        }
      }

      toast.success(editingInstrutor ? 'Instrutor atualizado com sucesso!' : 'Instrutor cadastrado com sucesso!');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar instrutor:', error);
      if (error.code === '23505') {
        toast.error('Já existe um instrutor com este CPF');
      } else {
        toast.error('Erro ao salvar instrutor');
      }
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'Informações Pessoais' },
    { number: 2, label: 'Endereço' },
    { number: 3, label: 'Informações Profissionais' },
  ];

  const allFormacoes = [...FORMACOES_ACADEMICAS, ...formacoesCustom];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingInstrutor ? 'Editar Instrutor' : 'Cadastrar Instrutor'}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center py-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                    currentStep >= step.number
                      ? 'bg-primary border-primary text-white'
                      : 'border-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 text-center max-w-[80px]',
                    currentStep >= step.number ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2 mb-5',
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Etapa 1: Informações Pessoais */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                placeholder="Digite o nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfValue(e.target.value))}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefoneValue(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deseja informar o veículo?</Label>
              <RadioGroup
                value={informarVeiculo}
                onValueChange={(value) => setInformarVeiculo(value as 'sim' | 'nao')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="veiculo-sim" />
                  <Label htmlFor="veiculo-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="veiculo-nao" />
                  <Label htmlFor="veiculo-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {informarVeiculo === 'sim' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="veiculo">Veículo *</Label>
                  <Textarea
                    id="veiculo"
                    placeholder="Descreva informações sobre o veículo"
                    value={veiculo}
                    onChange={(e) => setVeiculo(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    placeholder="Digite a placa"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Etapa 2: Endereço */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => {
                      const formatted = formatCepValue(e.target.value);
                      setCep(formatted);
                      if (formatted.replace(/\D/g, '').length === 8) {
                        buscarCep(formatted);
                      }
                    }}
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logradouro">Logradouro *</Label>
                <Input
                  id="logradouro"
                  placeholder="Digite o logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Digite o bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Nº *</Label>
                <Input
                  id="numero"
                  placeholder="Nº"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  placeholder="Digite a cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={loadingCep}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF *</Label>
                <Select value={uf} onValueChange={setUf} disabled={loadingCep}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Informações Profissionais */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Formação Acadêmica</Label>
              <Select value={formacaoAcademica} onValueChange={setFormacaoAcademica}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a formação acadêmica" />
                </SelectTrigger>
                <SelectContent>
                  {allFormacoes.map((formacao) => (
                    <SelectItem key={formacao} value={formacao}>
                      {formacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {!showNovaFormacaoInput ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNovaFormacaoInput(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar outra formação
                </Button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Digite a nova formação"
                    value={novaFormacao}
                    onChange={(e) => setNovaFormacao(e.target.value)}
                  />
                  <Button type="button" size="sm" onClick={handleAddFormacao}>
                    Adicionar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNovaFormacaoInput(false);
                      setNovaFormacao('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Treinamentos que ministra</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !treinamentosSelecionados.includes(value)) {
                    setTreinamentosSelecionados([...treinamentosSelecionados, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione os treinamentos que o instrutor ministra" />
                </SelectTrigger>
                <SelectContent>
                  {treinamentosDisponiveis.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum treinamento cadastrado
                    </SelectItem>
                  ) : (
                    treinamentosDisponiveis
                      .filter(t => !treinamentosSelecionados.includes(t.id))
                      .map((treinamento) => (
                        <SelectItem key={treinamento.id} value={treinamento.id}>
                          {treinamento.norma} - {treinamento.nome}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              
              {/* Lista de treinamentos selecionados */}
              {treinamentosSelecionados.length > 0 && (
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium">Treinamentos selecionados:</p>
                  <div className="flex flex-wrap gap-2">
                    {treinamentosSelecionados.map((treinamentoId) => {
                      const treinamento = treinamentosDisponiveis.find(t => t.id === treinamentoId);
                      return (
                        <div
                          key={treinamentoId}
                          className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-sm"
                        >
                          <span>{treinamento ? `${treinamento.norma} - ${treinamento.nome}` : 'Treinamento'}</span>
                          <button
                            type="button"
                            onClick={() => setTreinamentosSelecionados(prev => prev.filter(id => id !== treinamentoId))}
                            className="hover:text-orange-900"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer com botões */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={saving}
              >
                Voltar
              </Button>
            )}
          </div>

          {currentStep < 3 ? (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
              Avançar
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingInstrutor ? 'Atualizar Informações' : 'Cadastrar Instrutor'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
