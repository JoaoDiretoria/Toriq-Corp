-- Adicionar campo user_id na tabela instrutores para vincular ao auth.users
ALTER TABLE public.instrutores 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_instrutores_user_id ON public.instrutores(user_id);

-- Adicionar role instrutor ao enum app_role se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instrutor' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'instrutor';
  END IF;
END$$;

-- Policy para instrutor ver suas próprias turmas
CREATE POLICY "Instrutor pode ver suas turmas" 
ON public.turmas_treinamento 
FOR SELECT 
TO authenticated
USING (
  instrutor_id IN (
    SELECT id FROM public.instrutores WHERE user_id = auth.uid()
  )
);

-- Policy para instrutor atualizar suas turmas (limitado)
CREATE POLICY "Instrutor pode atualizar suas turmas" 
ON public.turmas_treinamento 
FOR UPDATE 
TO authenticated
USING (
  instrutor_id IN (
    SELECT id FROM public.instrutores WHERE user_id = auth.uid()
  )
);

-- Policy para instrutor ver colaboradores das suas turmas
CREATE POLICY "Instrutor pode ver colaboradores das suas turmas" 
ON public.turma_colaboradores 
FOR SELECT 
TO authenticated
USING (
  turma_id IN (
    SELECT t.id FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor atualizar colaboradores das suas turmas
CREATE POLICY "Instrutor pode atualizar colaboradores das suas turmas" 
ON public.turma_colaboradores 
FOR UPDATE 
TO authenticated
USING (
  turma_id IN (
    SELECT t.id FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor ver aulas das suas turmas
CREATE POLICY "Instrutor pode ver aulas das suas turmas" 
ON public.turmas_treinamento_aulas 
FOR SELECT 
TO authenticated
USING (
  turma_id IN (
    SELECT t.id FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor ver presenças das suas turmas
CREATE POLICY "Instrutor pode ver presenças das suas turmas" 
ON public.turma_colaborador_presencas 
FOR SELECT 
TO authenticated
USING (
  turma_colaborador_id IN (
    SELECT tc.id FROM public.turma_colaboradores tc
    JOIN public.turmas_treinamento t ON tc.turma_id = t.id
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor inserir presenças
CREATE POLICY "Instrutor pode inserir presenças das suas turmas" 
ON public.turma_colaborador_presencas 
FOR INSERT 
TO authenticated
WITH CHECK (
  turma_colaborador_id IN (
    SELECT tc.id FROM public.turma_colaboradores tc
    JOIN public.turmas_treinamento t ON tc.turma_id = t.id
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor atualizar presenças
CREATE POLICY "Instrutor pode atualizar presenças das suas turmas" 
ON public.turma_colaborador_presencas 
FOR UPDATE 
TO authenticated
USING (
  turma_colaborador_id IN (
    SELECT tc.id FROM public.turma_colaboradores tc
    JOIN public.turmas_treinamento t ON tc.turma_id = t.id
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor ver seus próprios dados
CREATE POLICY "Instrutor pode ver seus próprios dados" 
ON public.instrutores 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy para instrutor ver clientes das suas turmas
CREATE POLICY "Instrutor pode ver clientes das suas turmas" 
ON public.clientes_sst 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT t.cliente_id FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor ver treinamentos das suas turmas
CREATE POLICY "Instrutor pode ver treinamentos das suas turmas" 
ON public.catalogo_treinamentos 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT t.treinamento_id FROM public.turmas_treinamento t
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Policy para instrutor ver colaboradores das suas turmas
CREATE POLICY "Instrutor pode ver colaboradores" 
ON public.colaboradores 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT tc.colaborador_id FROM public.turma_colaboradores tc
    JOIN public.turmas_treinamento t ON tc.turma_id = t.id
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);
