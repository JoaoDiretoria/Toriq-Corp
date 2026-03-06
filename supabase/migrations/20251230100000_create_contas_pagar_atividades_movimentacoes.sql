-- Criar tabela de atividades para contas a pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'nota',
  descricao TEXT NOT NULL,
  prazo DATE,
  horario VARCHAR(10),
  status VARCHAR(20) NOT NULL DEFAULT 'programada',
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de movimentações para contas a pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
  descricao TEXT NOT NULL,
  coluna_origem_id UUID REFERENCES public.contas_pagar_colunas(id) ON DELETE SET NULL,
  coluna_destino_id UUID REFERENCES public.contas_pagar_colunas(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_atividades_conta_id ON public.contas_pagar_atividades(conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_movimentacoes_conta_id ON public.contas_pagar_movimentacoes(conta_id);

-- RLS para contas_pagar_atividades
ALTER TABLE public.contas_pagar_atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contas_pagar_atividades_select" ON public.contas_pagar_atividades;
CREATE POLICY "contas_pagar_atividades_select" ON public.contas_pagar_atividades
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "contas_pagar_atividades_insert" ON public.contas_pagar_atividades;
CREATE POLICY "contas_pagar_atividades_insert" ON public.contas_pagar_atividades
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contas_pagar_atividades_update" ON public.contas_pagar_atividades;
CREATE POLICY "contas_pagar_atividades_update" ON public.contas_pagar_atividades
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "contas_pagar_atividades_delete" ON public.contas_pagar_atividades;
CREATE POLICY "contas_pagar_atividades_delete" ON public.contas_pagar_atividades
  FOR DELETE USING (true);

-- RLS para contas_pagar_movimentacoes
ALTER TABLE public.contas_pagar_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contas_pagar_movimentacoes_select" ON public.contas_pagar_movimentacoes;
CREATE POLICY "contas_pagar_movimentacoes_select" ON public.contas_pagar_movimentacoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "contas_pagar_movimentacoes_insert" ON public.contas_pagar_movimentacoes;
CREATE POLICY "contas_pagar_movimentacoes_insert" ON public.contas_pagar_movimentacoes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contas_pagar_movimentacoes_update" ON public.contas_pagar_movimentacoes;
CREATE POLICY "contas_pagar_movimentacoes_update" ON public.contas_pagar_movimentacoes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "contas_pagar_movimentacoes_delete" ON public.contas_pagar_movimentacoes;
CREATE POLICY "contas_pagar_movimentacoes_delete" ON public.contas_pagar_movimentacoes
  FOR DELETE USING (true);
