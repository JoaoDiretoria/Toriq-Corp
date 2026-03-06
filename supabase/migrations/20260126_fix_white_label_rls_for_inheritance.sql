-- Ajustar RLS de white_label_config para permitir herança de estilos
-- Permite que usuários vejam a configuração da sua empresa SST pai
-- Mantém INSERT/UPDATE/DELETE restritos apenas para a própria empresa

-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Usuarios podem ver config da sua empresa" ON public.white_label_config;

-- Criar nova política de SELECT que permite herança
CREATE POLICY "Usuarios podem ver config da empresa SST pai" 
ON public.white_label_config 
FOR SELECT 
USING (
    -- Admin vertical pode ver todas as configs
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (SELECT auth.uid()) 
        AND role = 'admin_vertical'
    )
    OR
    -- Usuário pode ver a config da sua empresa SST pai
    -- Usa get_empresa_sst_pai para resolver a hierarquia:
    -- - empresa_sst vê sua própria config
    -- - cliente_final vê config da SST via clientes_sst
    -- - empresa_parceira vê config da SST via empresas_parceiras
    -- - vertical_on (Toriq) não vê nenhuma config (tema padrão)
    empresa_id = public.get_empresa_sst_pai(
        (SELECT empresa_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
);

-- Comentário explicativo
COMMENT ON POLICY "Usuarios podem ver config da empresa SST pai" ON public.white_label_config IS
'Permite leitura da configuração White Label da empresa SST pai para herança de estilos. 
Admin vertical vê tudo. Outros usuários veem apenas a config da sua SST pai através da função get_empresa_sst_pai.
INSERT/UPDATE/DELETE permanecem restritos à própria empresa (políticas não alteradas).';
