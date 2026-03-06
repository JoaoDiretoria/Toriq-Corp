import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, AlertCircle, Check, Download, X, FileUp, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Colunas suportadas na importação
const CSV_COLUMNS = [
  { key: 'nome', label: 'Nome', required: true, example: 'João da Silva' },
  { key: 'cpf', label: 'CPF', required: false, example: '123.456.789-00' },
  { key: 'matricula', label: 'Matrícula', required: false, example: '001234' },
  { key: 'cargo', label: 'Cargo', required: false, example: 'Eletricista' },
  { key: 'setor', label: 'Setor', required: false, example: 'Manutenção' },
  { key: 'grupo_homogeneo', label: 'Grupo Homogêneo', required: false, example: 'GH-01 Eletricistas' },
  { key: 'data_admissao', label: 'Data Admissão', required: false, example: '2024-01-15' },
  { key: 'data_nascimento', label: 'Data Nascimento', required: false, example: '1990-05-20' },
  { key: 'rg', label: 'RG', required: false, example: '12.345.678-9' },
  { key: 'email', label: 'Email', required: false, example: 'joao@email.com' },
  { key: 'telefone', label: 'Telefone', required: false, example: '(11) 99999-0000' },
  { key: 'sexo', label: 'Sexo', required: false, example: 'M ou F' },
  { key: 'endereco', label: 'Endereço', required: false, example: 'Rua das Flores, 123' },
  { key: 'bairro', label: 'Bairro', required: false, example: 'Centro' },
  { key: 'cidade', label: 'Cidade', required: false, example: 'São Paulo' },
  { key: 'estado', label: 'Estado', required: false, example: 'SP' },
  { key: 'cep', label: 'CEP', required: false, example: '01234-567' },
];

interface CSVRow {
  nome: string;
  cpf?: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  grupo_homogeneo?: string;
  data_admissao?: string;
  data_nascimento?: string;
  rg?: string;
  email?: string;
  telefone?: string;
  sexo?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  isValid: boolean;
  errors: string[];
}

interface ColaboradorImportCSVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColaboradorImportCSV({ open, onOpenChange }: ColaboradorImportCSVProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  // Buscar empresa SST relacionada ao cliente
  const { data: clienteSst } = useQuery({
    queryKey: ['cliente-sst', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return null;
      const { data, error } = await supabase
        .from('clientes_sst')
        .select('empresa_sst_id')
        .eq('cliente_empresa_id', profile.empresa_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!profile?.empresa_id && open,
  });

  const empresaSstId = clienteSst?.empresa_sst_id;

  const gruposHomogeneos: any[] = [];
  const gruposTreinamentos: any[] = [];

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11 || cleaned.length === 0;
  };

  const parseCSVText = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Suportar separador ; e ,
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map((h) => 
      h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
    );
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Parse CSV respeitando aspas
      const values = lines[i].split(separator).map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row: CSVRow = {
        nome: '',
        isValid: true,
        errors: [],
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        const normalizedHeader = header
          .replace('data_de_admissao', 'data_admissao')
          .replace('data_admissão', 'data_admissao')
          .replace('admissao', 'data_admissao')
          .replace('admissão', 'data_admissao')
          .replace('data_de_nascimento', 'data_nascimento')
          .replace('nascimento', 'data_nascimento')
          .replace('grupo_homogeneo', 'grupo_homogeneo')
          .replace('grupo_homogêneo', 'grupo_homogeneo')
          .replace('gh_treinamentos', 'grupo_homogeneo')
          .replace('gh', 'grupo_homogeneo')
          .replace('matricula', 'matricula')
          .replace('matrícula', 'matricula')
          .replace('endereço', 'endereco');

        switch (normalizedHeader) {
          case 'nome': row.nome = value; break;
          case 'cpf': row.cpf = value; break;
          case 'matricula': row.matricula = value; break;
          case 'cargo': row.cargo = value; break;
          case 'setor': row.setor = value; break;
          case 'grupo_homogeneo': row.grupo_homogeneo = value; break;
          case 'data_admissao': row.data_admissao = value; break;
          case 'data_nascimento': row.data_nascimento = value; break;
          case 'rg': row.rg = value; break;
          case 'email': row.email = value; break;
          case 'telefone': row.telefone = value; break;
          case 'sexo': row.sexo = value; break;
          case 'endereco': row.endereco = value; break;
          case 'bairro': row.bairro = value; break;
          case 'cidade': row.cidade = value; break;
          case 'estado': row.estado = value; break;
          case 'cep': row.cep = value; break;
        }
      });

      // Validações
      if (!row.nome) {
        row.isValid = false;
        row.errors.push('Nome é obrigatório');
      }
      if (row.cpf && !validateCPF(row.cpf)) {
        row.isValid = false;
        row.errors.push('CPF inválido');
      }
      if (row.email && !row.email.includes('@')) {
        row.isValid = false;
        row.errors.push('Email inválido');
      }

      rows.push(row);
    }

    return rows;
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({ title: 'Formato inválido', description: 'Selecione um arquivo .csv', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSVText(text);
      if (data.length === 0) {
        toast({ title: 'Arquivo vazio', description: 'O arquivo não contém dados válidos', variant: 'destructive' });
        return;
      }
      setParsedData(data);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const downloadTemplate = () => {
    const headers = CSV_COLUMNS.map(c => c.key).join(',');
    const example = CSV_COLUMNS.map(c => c.example).join(',');
    const csv = `${headers}\n${example}`;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_colaboradores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resolveGrupoHomogeneoId = (nomeGH: string | undefined): string | null => {
    if (!nomeGH || !gruposHomogeneos) return null;
    const normalized = nomeGH.toLowerCase().trim();
    const found = gruposHomogeneos.find(g => 
      g.nome.toLowerCase().trim() === normalized ||
      g.nome.toLowerCase().trim().includes(normalized) ||
      normalized.includes(g.nome.toLowerCase().trim())
    );
    return found?.id || null;
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada');

      const validRows = parsedData.filter((row) => row.isValid);
      const results: string[] = [];

      // Importar em lotes de 50
      for (let i = 0; i < validRows.length; i += 50) {
        const batch = validRows.slice(i, i + 50);
        const payload = batch.map((row) => {
          const ghId = resolveGrupoHomogeneoId(row.grupo_homogeneo);
          return {
            empresa_id: profile.empresa_id,
            nome: row.nome,
            cpf: row.cpf?.replace(/\D/g, '').length === 11 ? row.cpf : null,
            matricula: row.matricula || null,
            cargo: row.cargo || null,
            setor: row.setor || null,
            grupo_homogeneo_id: ghId,
            data_admissao: row.data_admissao || null,
            data_nascimento: row.data_nascimento || null,
            rg: row.rg || null,
            email: row.email || null,
            telefone: row.telefone || null,
            sexo: row.sexo ? (row.sexo.toUpperCase().startsWith('M') ? 'Masculino' : row.sexo.toUpperCase().startsWith('F') ? 'Feminino' : null) : null,
            endereco: row.endereco || null,
            bairro: row.bairro || null,
            cidade: row.cidade || null,
            estado: row.estado || null,
            cep: row.cep || null,
            ativo: true,
          };
        });

        const { data: inserted, error } = await supabase
          .from('colaboradores')
          .insert(payload)
          .select('id, grupo_homogeneo_id');
        if (error) throw error;

        // Auto-associar treinamentos do grupo homogêneo
        if (inserted && gruposTreinamentos) {
          const treinamentosToInsert: { colaborador_id: string; treinamento_id: string }[] = [];
          for (const col of inserted) {
            if (col.grupo_homogeneo_id) {
              const ghTreinamentos = gruposTreinamentos.filter(
                gt => gt.grupo_homogeneo_id === col.grupo_homogeneo_id
              );
              for (const gt of ghTreinamentos) {
                treinamentosToInsert.push({
                  colaborador_id: col.id,
                  treinamento_id: gt.treinamento_id,
                });
              }
            }
          }
          if (treinamentosToInsert.length > 0) {
            await supabase.from('colaboradores_treinamentos').insert(treinamentosToInsert);
          }
        }

        results.push(...(inserted?.map(r => r.id) || []));
      }

      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: `${count} colaborador(es) importado(s) com sucesso!` });
      handleClose();
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao importar', description: err.message || 'Tente novamente', variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setParsedData([]);
    setFileName('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;
  const ghMatchCount = parsedData.filter((r) => r.grupo_homogeneo && resolveGrupoHomogeneoId(r.grupo_homogeneo)).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Colaboradores via CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Faça upload de um arquivo CSV com os dados dos colaboradores.'
              : `Revise os ${parsedData.length} registros antes de importar.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {step === 'upload' ? (
            <>
              {/* Área de drag-and-drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'}
                `}
              >
                <div className={`p-3 rounded-full ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
                  <FileUp className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo CSV ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: .csv (separado por vírgula ou ponto e vírgula)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Botão baixar modelo */}
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Não tem um arquivo pronto?</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Baixar Modelo CSV
                </Button>
              </div>

              {/* Colunas suportadas */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Colunas suportadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS.map((col) => (
                    <TooltipProvider key={col.key} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={col.required ? 'default' : 'outline'}
                            className="text-[11px] cursor-help"
                          >
                            {col.label}
                            {col.required && <span className="text-destructive ml-0.5">*</span>}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Coluna: <strong>{col.key}</strong></p>
                          <p className="text-xs text-muted-foreground">Ex: {col.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Resumo */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">({parsedData.length} linhas)</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    {validCount} válidos
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {invalidCount} com erro
                    </Badge>
                  )}
                  {ghMatchCount > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      {ghMatchCount} com G.H.
                    </Badge>
                  )}
                </div>
              </div>

              {ghMatchCount > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {ghMatchCount} colaborador(es) com Grupo Homogêneo reconhecido terão seus treinamentos associados automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabela de preview */}
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[60px]">Status</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>G.H.</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row, index) => (
                        <TableRow key={index} className={!row.isValid ? 'bg-destructive/5' : ''}>
                          <TableCell>
                            {row.isValid ? (
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              </div>
                            ) : (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 cursor-help">
                                      <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {row.errors.map((e, i) => <p key={i} className="text-xs">{e}</p>)}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{row.nome || <span className="text-destructive">-</span>}</TableCell>
                          <TableCell className="text-xs">{row.cpf || '-'}</TableCell>
                          <TableCell className="text-xs">{row.matricula || '-'}</TableCell>
                          <TableCell className="text-xs">{row.cargo || '-'}</TableCell>
                          <TableCell className="text-xs">{row.setor || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {row.grupo_homogeneo ? (
                              resolveGrupoHomogeneoId(row.grupo_homogeneo) ? (
                                <Badge variant="secondary" className="text-[10px]">{row.grupo_homogeneo}</Badge>
                              ) : (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 cursor-help">
                                        {row.grupo_homogeneo}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Grupo não encontrado no sistema</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">{row.email || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            <X className="h-4 w-4 mr-1.5" />
            Cancelar
          </Button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button
                variant="outline"
                onClick={() => {
                  setParsedData([]);
                  setFileName('');
                  setStep('upload');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Escolher outro arquivo
              </Button>
            )}
            {step === 'preview' && (
              <Button
                onClick={() => importMutation.mutate()}
                disabled={validCount === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {validCount} colaborador(es)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
