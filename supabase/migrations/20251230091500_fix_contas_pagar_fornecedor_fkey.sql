-- Corrigir foreign key do fornecedor_id para referenciar fornecedores em vez de empresas
ALTER TABLE public.contas_pagar DROP CONSTRAINT IF EXISTS contas_pagar_fornecedor_id_fkey;

ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_fornecedor_id_fkey 
FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
