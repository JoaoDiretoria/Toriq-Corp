-- Corrigir registros de empresas_parceiras que não têm parceira_empresa_id preenchido
-- Isso acontece quando a empresa parceira foi criada mas o vínculo não foi estabelecido corretamente

-- Atualizar empresas_parceiras que têm responsavel_id mas não têm parceira_empresa_id
-- O responsavel_id aponta para um profile que tem empresa_id
UPDATE public.empresas_parceiras ep
SET parceira_empresa_id = p.empresa_id
FROM public.profiles p
WHERE ep.responsavel_id = p.id
  AND ep.parceira_empresa_id IS NULL
  AND p.empresa_id IS NOT NULL;

-- Também tentar vincular pelo nome da empresa (caso o responsável não tenha sido criado ainda)
-- Buscar empresas do tipo empresa_parceira com o mesmo nome
UPDATE public.empresas_parceiras ep
SET parceira_empresa_id = e.id
FROM public.empresas e
WHERE ep.parceira_empresa_id IS NULL
  AND e.tipo = 'empresa_parceira'
  AND LOWER(TRIM(ep.nome)) = LOWER(TRIM(e.nome));

-- Também vincular pelo CNPJ se disponível
UPDATE public.empresas_parceiras ep
SET parceira_empresa_id = e.id
FROM public.empresas e
WHERE ep.parceira_empresa_id IS NULL
  AND ep.cnpj IS NOT NULL
  AND e.cnpj IS NOT NULL
  AND e.tipo = 'empresa_parceira'
  AND REPLACE(REPLACE(REPLACE(ep.cnpj, '.', ''), '/', ''), '-', '') = REPLACE(REPLACE(REPLACE(e.cnpj, '.', ''), '/', ''), '-', '');
