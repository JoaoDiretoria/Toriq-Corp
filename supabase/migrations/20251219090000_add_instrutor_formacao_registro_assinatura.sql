-- =====================================================
-- ADICIONAR CAMPOS DE REGISTRO PROFISSIONAL NAS FORMAÇÕES
-- E ASSINATURA DIGITAL NO INSTRUTOR
-- =====================================================

-- Adicionar campos de registro profissional na tabela instrutor_formacoes
ALTER TABLE public.instrutor_formacoes 
ADD COLUMN IF NOT EXISTS registro_tipo VARCHAR(50),
ADD COLUMN IF NOT EXISTS registro_numero VARCHAR(50),
ADD COLUMN IF NOT EXISTS registro_estado VARCHAR(2),
ADD COLUMN IF NOT EXISTS anexo_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar campos de assinatura digital na tabela instrutores
ALTER TABLE public.instrutores 
ADD COLUMN IF NOT EXISTS assinatura_url TEXT,
ADD COLUMN IF NOT EXISTS assinatura_tipo VARCHAR(20) DEFAULT 'upload';

-- Adicionar campo de anexo nos vínculos formação-treinamento
ALTER TABLE public.instrutor_formacao_treinamento
ADD COLUMN IF NOT EXISTS anexo_url TEXT;

-- Criar bucket para assinaturas dos instrutores se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('instrutor-assinaturas', 'instrutor-assinaturas', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para anexos das formações se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('instrutor-formacoes-anexos', 'instrutor-formacoes-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para assinaturas
DROP POLICY IF EXISTS "Usuarios autenticados podem ver assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados podem fazer upload assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados podem deletar assinaturas" ON storage.objects;

CREATE POLICY "Usuarios autenticados podem ver assinaturas"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'instrutor-assinaturas');

CREATE POLICY "Usuarios autenticados podem fazer upload assinaturas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instrutor-assinaturas');

CREATE POLICY "Usuarios autenticados podem deletar assinaturas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'instrutor-assinaturas');

CREATE POLICY "Usuarios autenticados podem atualizar assinaturas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'instrutor-assinaturas');

-- Políticas de storage para anexos de formações
DROP POLICY IF EXISTS "Usuarios autenticados podem ver anexos formacoes" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados podem fazer upload anexos formacoes" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados podem deletar anexos formacoes" ON storage.objects;

CREATE POLICY "Usuarios autenticados podem ver anexos formacoes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'instrutor-formacoes-anexos');

CREATE POLICY "Usuarios autenticados podem fazer upload anexos formacoes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instrutor-formacoes-anexos');

CREATE POLICY "Usuarios autenticados podem deletar anexos formacoes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'instrutor-formacoes-anexos');

CREATE POLICY "Usuarios autenticados podem atualizar anexos formacoes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'instrutor-formacoes-anexos');

-- Trigger para updated_at em instrutor_formacoes
CREATE OR REPLACE FUNCTION update_instrutor_formacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_instrutor_formacoes ON public.instrutor_formacoes;
CREATE TRIGGER trigger_update_instrutor_formacoes
  BEFORE UPDATE ON public.instrutor_formacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_instrutor_formacoes_updated_at();

-- Políticas para instrutores atualizarem sua própria assinatura
DROP POLICY IF EXISTS "Instrutores podem atualizar sua assinatura" ON public.instrutores;
CREATE POLICY "Instrutores podem atualizar sua assinatura"
  ON public.instrutores FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas para instrutores gerenciarem suas formações
DROP POLICY IF EXISTS "Instrutores podem ver suas formacoes" ON public.instrutor_formacoes;
DROP POLICY IF EXISTS "Instrutores podem inserir suas formacoes" ON public.instrutor_formacoes;
DROP POLICY IF EXISTS "Instrutores podem atualizar suas formacoes" ON public.instrutor_formacoes;
DROP POLICY IF EXISTS "Instrutores podem deletar suas formacoes" ON public.instrutor_formacoes;

CREATE POLICY "Instrutores podem ver suas formacoes"
  ON public.instrutor_formacoes FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem inserir suas formacoes"
  ON public.instrutor_formacoes FOR INSERT
  WITH CHECK (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem atualizar suas formacoes"
  ON public.instrutor_formacoes FOR UPDATE
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem deletar suas formacoes"
  ON public.instrutor_formacoes FOR DELETE
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

-- Políticas para instrutores gerenciarem vínculos formação-treinamento
DROP POLICY IF EXISTS "Instrutores podem ver vinculos formacao treinamento" ON public.instrutor_formacao_treinamento;
DROP POLICY IF EXISTS "Instrutores podem inserir vinculos formacao treinamento" ON public.instrutor_formacao_treinamento;
DROP POLICY IF EXISTS "Instrutores podem atualizar vinculos formacao treinamento" ON public.instrutor_formacao_treinamento;
DROP POLICY IF EXISTS "Instrutores podem deletar vinculos formacao treinamento" ON public.instrutor_formacao_treinamento;

CREATE POLICY "Instrutores podem ver vinculos formacao treinamento"
  ON public.instrutor_formacao_treinamento FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem inserir vinculos formacao treinamento"
  ON public.instrutor_formacao_treinamento FOR INSERT
  WITH CHECK (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem atualizar vinculos formacao treinamento"
  ON public.instrutor_formacao_treinamento FOR UPDATE
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem deletar vinculos formacao treinamento"
  ON public.instrutor_formacao_treinamento FOR DELETE
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));
