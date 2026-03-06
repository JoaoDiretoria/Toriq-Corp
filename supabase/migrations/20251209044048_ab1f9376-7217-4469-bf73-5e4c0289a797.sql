-- Adicionar coluna responsavel_id referenciando profiles
ALTER TABLE public.clientes_sst 
ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_clientes_sst_responsavel_id ON public.clientes_sst(responsavel_id);