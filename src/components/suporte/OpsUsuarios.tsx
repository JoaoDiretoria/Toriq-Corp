import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { opsApi, type OpsUser } from '@/integrations/api/ops';
import { Search, KeyRound, UserCog, LogIn } from 'lucide-react';

export function OpsUsuarios() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<OpsUser[]>([]);
  const [editando, setEditando] = useState<OpsUser | null>(null);
  const [nome, setNome] = useState('');

  const buscar = async () => {
    try { setUsers((await opsApi.users(q)).users); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na busca'); }
  };

  const abrirEdicao = (u: OpsUser) => { setEditando(u); setNome(u.nome); };

  const salvar = async () => {
    if (!editando) return;
    try {
      const atualizado = await opsApi.updateUser(editando.id, { nome });
      setUsers((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u)));
      setEditando(null);
      toast.success('Usuário atualizado.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar'); }
  };

  const resetar = async (u: OpsUser) => {
    try {
      const r = await opsApi.resetSenha(u.id);
      toast.success(r.temp_password ? `Senha temporária: ${r.temp_password}` : 'Senha resetada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha no reset'); }
  };

  const impersonar = async (u: OpsUser) => {
    try {
      await opsApi.impersonate(u.id);
      localStorage.setItem('ops_impersonando', JSON.stringify({ nome: u.nome, email: u.email }));
      toast.success(`Impersonando ${u.nome}. Recarregando...`);
      window.location.href = '/dashboard';
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao impersonar'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Buscar por nome ou email..." value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }} />
        <Button onClick={buscar}><Search className="mr-2 h-4 w-4" />Buscar</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Email</TableHead>
                <TableHead>Role</TableHead><TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.ativo ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)} title="Editar"><UserCog className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resetar(u)} title="Resetar senha"><KeyRound className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => impersonar(u)} title="Impersonar"><LogIn className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Busque para listar usuários.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ops-nome">Nome</Label>
            <Input id="ops-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
