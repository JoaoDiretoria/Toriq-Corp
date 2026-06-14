import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type DatabaseOut } from '@/integrations/api/ops';

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = b / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export function OpsBancoDados() {
  const [data, setData] = useState<DatabaseOut | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    opsApi.database().then(setData).catch((e) =>
      setErro(e instanceof Error ? e.message : 'Falha ao carregar'));
  }, []);

  if (erro) return <div className="text-destructive">{erro}</div>;
  if (!data) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tabelas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.total_tabelas}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pool em uso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.em_uso ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pool disponíveis</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.disponiveis ?? '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overflow</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.pool.overflow ?? '—'}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Tabelas (por nº de linhas)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabela</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead className="text-right">Linhas</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tabelas.map((t) => (
                <TableRow key={`${t.schema_}.${t.nome}`}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{t.schema_}</TableCell>
                  <TableCell className="text-right">{t.linhas.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{fmtBytes(t.tamanho_bytes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
