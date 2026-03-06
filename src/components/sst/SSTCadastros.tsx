import { SSTClientes } from './SSTClientes';
import { PermissaoBadge } from '@/hooks/useTelaPermissoes';

export function SSTCadastros() {
  return (
    <div className="space-y-6">
      {/* Título padrão */}
      <div>
        <h1 className="text-3xl font-bold">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie os cadastros da sua empresa</p>
      </div>

      {/* Badge de permissões */}
      <PermissaoBadge telaId="cadastros" />

      {/* Conteúdo - Lista de Empresas/Clientes */}
      <SSTClientes />
    </div>
  );
}
