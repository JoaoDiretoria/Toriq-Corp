import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaMode } from '@/hooks/useEmpresaMode';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface NRImportCSVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingNRs: string[];
}

interface ParsedNR {
  nr: string;
  descricao?: string;
  valid: boolean;
  error?: string;
}

export const NRImportCSV = ({
  open,
  onOpenChange,
  onSuccess,
  existingNRs,
}: NRImportCSVProps) => {
  const { empresa } = useAuth();
  const { isInEmpresaMode, empresaMode } = useEmpresaMode();
  const { toast } = useToast();
  
  const empresaId = isInEmpresaMode && empresaMode ? empresaMode.empresaId : empresa?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedNR[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    return line.split('|').map(part => part.trim());
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    
    if (lines.length === 0) {
      toast({
        title: 'Erro',
        description: 'Arquivo CSV vazio.',
        variant: 'destructive',
      });
      return;
    }

    // Check header
    const headerValues = parseCSVLine(lines[0].toLowerCase());
    const nrIndex = headerValues.findIndex(h => h === 'nr');
    const descricaoIndex = headerValues.findIndex(h => h === 'descrição' || h === 'descricao');
    
    if (nrIndex === -1) {
      toast({
        title: 'Erro',
        description: 'O arquivo deve conter a coluna "NR".',
        variant: 'destructive',
      });
      return;
    }

    // Parse data rows
    const seenNRs = new Set<string>();
    const parsed: ParsedNR[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const nr = values[nrIndex]?.trim();
      const descricao = descricaoIndex !== -1 ? values[descricaoIndex]?.trim() : undefined;
      
      if (!nr) continue;

      let valid = true;
      let error: string | undefined;

      if (seenNRs.has(nr)) {
        valid = false;
        error = 'Duplicado no arquivo';
      } else if (existingNRs.includes(nr)) {
        valid = false;
        error = 'Já cadastrado';
      }

      seenNRs.add(nr);
      parsed.push({ nr, descricao, valid, error });
    }

    setParsedData(parsed);
  };

  const handleImport = async () => {
    if (!empresa?.id) {
      toast({
        title: 'Erro',
        description: 'Empresa não identificada.',
        variant: 'destructive',
      });
      return;
    }

    const validNRs = parsedData.filter((item) => item.valid);

    if (validNRs.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma NR válida para importar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('normas_regulamentadoras').insert(
        validNRs.map((item) => ({
          empresa_id: empresaId,
          nr: item.nr,
          descricao: item.descricao || null,
          ativo: true,
        }))
      );

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${validNRs.length} NR(s) importada(s) com sucesso.`,
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Erro ao importar NRs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível importar as NRs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setParsedData([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validCount = parsedData.filter((item) => item.valid).length;
  const invalidCount = parsedData.filter((item) => !item.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar NRs via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo CSV</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              O arquivo deve conter uma coluna "NR" com os números das normas. A coluna "Descrição" é opcional.
            </p>
          </div>

          {parsedData.length > 0 && (
            <>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{validCount} válido(s)</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{invalidCount} inválido(s)</span>
                  </div>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NR</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">NR-{item.nr}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descricao || '-'}</TableCell>
                        <TableCell>
                          {item.valid ? (
                            <Badge variant="default">Válido</Badge>
                          ) : (
                            <Badge variant="destructive">{item.error}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || validCount === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importando...' : `Importar ${validCount} NR(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
