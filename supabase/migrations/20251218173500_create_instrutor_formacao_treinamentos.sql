-- =====================================================
-- RELACIONAMENTO FORMAÇÃO-TREINAMENTO DO INSTRUTOR
-- Vincula cada formação do instrutor aos treinamentos que ela cobre
-- =====================================================

-- Tabela de relacionamento entre formação e treinamentos
CREATE TABLE IF NOT EXISTS public.instrutor_formacao_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrutor_id UUID NOT NULL REFERENCES public.instrutores(id) ON DELETE CASCADE,
  formacao_id UUID NOT NULL REFERENCES public.instrutor_formacoes(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(formacao_id, treinamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_instrutor_formacao_treinamento_instrutor ON public.instrutor_formacao_treinamento(instrutor_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacao_treinamento_formacao ON public.instrutor_formacao_treinamento(formacao_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacao_treinamento_treinamento ON public.instrutor_formacao_treinamento(treinamento_id);

-- Habilitar RLS
ALTER TABLE public.instrutor_formacao_treinamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios podem ver vinculos de formacao-treinamento da empresa"
  ON public.instrutor_formacao_treinamento FOR SELECT
  USING (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem gerenciar vinculos de formacao-treinamento"
  ON public.instrutor_formacao_treinamento FOR ALL
  USING (
    instrutor_id IN (
      SELECT id FROM public.instrutores 
      WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Políticas RLS para instrutor ver seus próprios vínculos
CREATE POLICY "Instrutores podem ver seus vinculos formacao-treinamento"
  ON public.instrutor_formacao_treinamento FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));
