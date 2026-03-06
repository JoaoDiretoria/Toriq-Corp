-- =====================================================
-- Migration: Criar tabelas centros_custo e formas_pagamento
-- Data: 2026-01-08
-- Descrição: Cria as tabelas para cadastros financeiros
-- =====================================================

-- =====================================================
-- TABELA: centros_custo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.centros_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('receita', 'despesa', 'ambos')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_centros_custo_empresa_id ON public.centros_custo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_centros_custo_ativo ON public.centros_custo(ativo);

-- Comentário
COMMENT ON TABLE public.centros_custo IS 'Centros de custo para classificação de receitas e despesas';

-- RLS
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver centros de custo da sua empresa"
    ON public.centros_custo FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem inserir centros de custo na sua empresa"
    ON public.centros_custo FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem atualizar centros de custo da sua empresa"
    ON public.centros_custo FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem deletar centros de custo da sua empresa"
    ON public.centros_custo FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- TABELA: formas_pagamento
-- =====================================================
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    taxa_percentual DECIMAL(5,2) DEFAULT 0,
    dias_recebimento INTEGER DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_empresa_id ON public.formas_pagamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ativo ON public.formas_pagamento(ativo);

-- Comentário
COMMENT ON TABLE public.formas_pagamento IS 'Formas de pagamento aceitas pela empresa';

-- RLS
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver formas de pagamento da sua empresa"
    ON public.formas_pagamento FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem inserir formas de pagamento na sua empresa"
    ON public.formas_pagamento FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem atualizar formas de pagamento da sua empresa"
    ON public.formas_pagamento FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem deletar formas de pagamento da sua empresa"
    ON public.formas_pagamento FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
    );
