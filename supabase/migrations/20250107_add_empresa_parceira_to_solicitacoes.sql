-- Adicionar empresa_parceira_id à tabela instrutor_solicitacoes
-- Isso permite que empresas parceiras criem solicitações de cadastro de instrutores

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'instrutor_solicitacoes' 
                   AND column_name = 'empresa_parceira_id') THEN
        ALTER TABLE public.instrutor_solicitacoes 
        ADD COLUMN empresa_parceira_id UUID REFERENCES public.empresas_parceiras(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Criar índice para empresa_parceira_id
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_empresa_parceira 
ON public.instrutor_solicitacoes(empresa_parceira_id);

-- Atualizar políticas RLS para incluir empresas parceiras

-- Política para empresas parceiras verem suas solicitações
DROP POLICY IF EXISTS "Empresas parceiras podem ver suas solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Empresas parceiras podem ver suas solicitacoes"
  ON public.instrutor_solicitacoes FOR SELECT
  USING (
    empresa_parceira_id IN (
      SELECT ep.id FROM public.empresas_parceiras ep
      JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
      WHERE p.id = auth.uid()
    )
  );

-- Política para empresas parceiras criarem solicitações
DROP POLICY IF EXISTS "Empresas parceiras podem criar solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Empresas parceiras podem criar solicitacoes"
  ON public.instrutor_solicitacoes FOR INSERT
  WITH CHECK (
    empresa_parceira_id IN (
      SELECT ep.id FROM public.empresas_parceiras ep
      JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
      WHERE p.id = auth.uid()
    )
    OR empresa_parceira_id IS NULL
  );

-- Política para empresas parceiras atualizarem suas solicitações
DROP POLICY IF EXISTS "Empresas parceiras podem atualizar suas solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Empresas parceiras podem atualizar suas solicitacoes"
  ON public.instrutor_solicitacoes FOR UPDATE
  USING (
    empresa_parceira_id IN (
      SELECT ep.id FROM public.empresas_parceiras ep
      JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
      WHERE p.id = auth.uid()
    )
  );

-- Política para empresas parceiras deletarem suas solicitações
DROP POLICY IF EXISTS "Empresas parceiras podem deletar suas solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Empresas parceiras podem deletar suas solicitacoes"
  ON public.instrutor_solicitacoes FOR DELETE
  USING (
    empresa_parceira_id IN (
      SELECT ep.id FROM public.empresas_parceiras ep
      JOIN public.profiles p ON p.empresa_id = ep.parceira_empresa_id
      WHERE p.id = auth.uid()
    )
  );
