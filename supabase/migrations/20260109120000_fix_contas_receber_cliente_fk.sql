-- Alterar foreign key de cliente_id para referenciar clientes_sst em vez de empresas
-- Isso permite que contas a receber sejam vinculadas aos clientes da empresa SST

-- Remover a foreign key existente
ALTER TABLE public.contas_receber DROP CONSTRAINT IF EXISTS contas_receber_cliente_id_fkey;

-- Limpar cliente_id de registros que referenciam IDs que não existem em clientes_sst
UPDATE public.contas_receber 
SET cliente_id = NULL 
WHERE cliente_id IS NOT NULL 
  AND cliente_id NOT IN (SELECT id FROM public.clientes_sst);

-- Adicionar nova foreign key referenciando clientes_sst
ALTER TABLE public.contas_receber 
  ADD CONSTRAINT contas_receber_cliente_id_fkey 
  FOREIGN KEY (cliente_id) REFERENCES public.clientes_sst(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.contas_receber.cliente_id IS 'Referência ao cliente da tabela clientes_sst';
