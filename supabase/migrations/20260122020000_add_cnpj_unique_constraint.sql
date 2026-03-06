-- Adicionar constraint UNIQUE para CNPJ na tabela empresas
-- Garante que não existam duas empresas com o mesmo CNPJ

-- Primeiro, verificar e remover duplicatas se existirem (mantém a mais antiga)
DELETE FROM public.empresas a
USING public.empresas b
WHERE a.cnpj = b.cnpj
  AND a.cnpj IS NOT NULL
  AND a.cnpj != ''
  AND a.created_at > b.created_at;

-- Adicionar constraint UNIQUE
ALTER TABLE public.empresas
ADD CONSTRAINT empresas_cnpj_unique UNIQUE (cnpj);

-- Criar índice para melhor performance nas buscas por CNPJ
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);
