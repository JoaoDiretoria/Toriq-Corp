-- Adicionar coluna status_pagamento à tabela contas_pagar (tabelas já existem)
ALTER TABLE public.contas_pagar 
ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'previsto';

ALTER TABLE public.contas_pagar 
DROP CONSTRAINT IF EXISTS contas_pagar_status_check;

ALTER TABLE public.contas_pagar 
ADD CONSTRAINT contas_pagar_status_check CHECK (status_pagamento IN ('previsto', 'realizado', 'vencido'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa_id ON public.contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_coluna_id ON public.contas_pagar(coluna_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor_id ON public.contas_pagar(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON public.contas_pagar(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_colunas_empresa_id ON public.contas_pagar_colunas(empresa_id);

-- Habilitar RLS
ALTER TABLE public.contas_pagar_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Policies para contas_pagar_colunas
CREATE POLICY "Usuários podem ver colunas da sua empresa" ON public.contas_pagar_colunas
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem criar colunas na sua empresa" ON public.contas_pagar_colunas
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem atualizar colunas da sua empresa" ON public.contas_pagar_colunas
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem deletar colunas da sua empresa" ON public.contas_pagar_colunas
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Policies para contas_pagar
CREATE POLICY "Usuários podem ver contas a pagar da sua empresa" ON public.contas_pagar
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem criar contas a pagar na sua empresa" ON public.contas_pagar
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem atualizar contas a pagar da sua empresa" ON public.contas_pagar
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

CREATE POLICY "Usuários podem deletar contas a pagar da sua empresa" ON public.contas_pagar
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_contas_pagar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contas_pagar_updated_at ON public.contas_pagar;
CREATE TRIGGER trigger_contas_pagar_updated_at
    BEFORE UPDATE ON public.contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION update_contas_pagar_updated_at();

DROP TRIGGER IF EXISTS trigger_contas_pagar_colunas_updated_at ON public.contas_pagar_colunas;
CREATE TRIGGER trigger_contas_pagar_colunas_updated_at
    BEFORE UPDATE ON public.contas_pagar_colunas
    FOR EACH ROW
    EXECUTE FUNCTION update_contas_pagar_updated_at();

-- Comentários
COMMENT ON TABLE public.contas_pagar IS 'Tabela de contas a pagar do módulo financeiro';
COMMENT ON TABLE public.contas_pagar_colunas IS 'Colunas do kanban de contas a pagar';
COMMENT ON COLUMN public.contas_pagar.status_pagamento IS 'Status: previsto, realizado ou vencido';
