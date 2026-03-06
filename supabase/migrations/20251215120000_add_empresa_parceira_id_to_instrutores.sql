-- Adicionar campo empresa_parceira_id na tabela instrutores
-- Este campo vincula o instrutor à empresa parceira que o cadastrou

-- Adicionar coluna empresa_parceira_id
ALTER TABLE public.instrutores 
ADD COLUMN IF NOT EXISTS empresa_parceira_id UUID REFERENCES public.empresas_parceiras(id) ON DELETE SET NULL;

-- Criar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_instrutores_empresa_parceira_id ON public.instrutores(empresa_parceira_id);

-- Adicionar role empresa_parceira ao enum app_role se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'empresa_parceira' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'empresa_parceira';
  END IF;
END$$;

-- Policy para empresa parceira ver seus próprios instrutores
CREATE POLICY "Empresa parceira pode ver seus instrutores" 
ON public.instrutores 
FOR SELECT 
TO authenticated
USING (
  empresa_parceira_id IN (
    SELECT ep.id FROM public.empresas_parceiras ep
    JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
    WHERE p.id = auth.uid()
  )
);

-- Policy para empresa parceira inserir instrutores
CREATE POLICY "Empresa parceira pode inserir instrutores" 
ON public.instrutores 
FOR INSERT 
TO authenticated
WITH CHECK (
  empresa_parceira_id IN (
    SELECT ep.id FROM public.empresas_parceiras ep
    JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
    WHERE p.id = auth.uid()
  )
);

-- Policy para empresa parceira atualizar seus instrutores
CREATE POLICY "Empresa parceira pode atualizar seus instrutores" 
ON public.instrutores 
FOR UPDATE 
TO authenticated
USING (
  empresa_parceira_id IN (
    SELECT ep.id FROM public.empresas_parceiras ep
    JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
    WHERE p.id = auth.uid()
  )
);

-- Policy para empresa parceira deletar seus instrutores
CREATE POLICY "Empresa parceira pode deletar seus instrutores" 
ON public.instrutores 
FOR DELETE 
TO authenticated
USING (
  empresa_parceira_id IN (
    SELECT ep.id FROM public.empresas_parceiras ep
    JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
    WHERE p.id = auth.uid()
  )
);
