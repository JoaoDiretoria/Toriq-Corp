-- Vincular módulos Toriq Corp e Toriq Train a todas as empresas SST
-- Isso garante que os módulos apareçam no menu lateral

INSERT INTO public.empresas_modulos (empresa_id, modulo_id, ativo)
SELECT 
  e.id,
  m.id,
  true
FROM public.empresas e
CROSS JOIN public.modulos m
WHERE e.tipo = 'sst'
  AND m.nome IN ('Toriq Corp', 'Gestão de Treinamentos')
  AND NOT EXISTS (
    SELECT 1 FROM public.empresas_modulos em
    WHERE em.empresa_id = e.id AND em.modulo_id = m.id
  );
