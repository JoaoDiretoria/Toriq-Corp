import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsApi, type AuditRegistro } from '@/integrations/api/ops';

export function OpsAuditoria() {
  const [registros, setRegistros] = useState<AuditRegistro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    opsApi.audit().then((r) => setRegistros(r.registros)).catch((e) =>
      setErro(e instanceof Error ? e.message : 'Falha ao carregar'));
  }, []);

  if (erro) return <div className="text-destructive">{erro}</div>;

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead><TableHead>Operador</TableHead>
              <TableHead>Ação</TableHead><TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead><TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                <TableCell>{r.actor_nome ?? r.actor_id}</TableCell>
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell className="text-muted-foreground">{r.target_user_id ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{r.details ? JSON.stringify(r.details) : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{r.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Sem registros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
