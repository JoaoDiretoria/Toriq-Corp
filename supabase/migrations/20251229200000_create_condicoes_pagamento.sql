-- Criar tabela de Condições de Pagamento
CREATE TABLE IF NOT EXISTS public.condicoes_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  parcelas INTEGER NOT NULL DEFAULT 1,
  intervalo_dias INTEGER NOT NULL DEFAULT 30,
  entrada_percentual NUMERIC(5,2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_empresa ON public.condicoes_pagamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_ativo ON public.condicoes_pagamento(ativo);

-- Habilitar RLS
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode tudo em condicoes_pagamento" ON public.condicoes_pagamento
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver condições da sua empresa" ON public.condicoes_pagamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = empresa_id
    )
  );

CREATE POLICY "Usuários podem criar condições na sua empresa" ON public.condicoes_pagamento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = empresa_id
    )
  );

CREATE POLICY "Usuários podem atualizar condições da sua empresa" ON public.condicoes_pagamento
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = empresa_id
    )
  );

CREATE POLICY "Usuários podem deletar condições da sua empresa" ON public.condicoes_pagamento
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = empresa_id
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_condicoes_pagamento_updated_at
  BEFORE UPDATE ON public.condicoes_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.condicoes_pagamento IS 'Condições de pagamento disponíveis para vendas';
COMMENT ON COLUMN public.condicoes_pagamento.parcelas IS 'Número de parcelas';
COMMENT ON COLUMN public.condicoes_pagamento.intervalo_dias IS 'Intervalo em dias entre as parcelas';
COMMENT ON COLUMN public.condicoes_pagamento.entrada_percentual IS 'Percentual de entrada (0-100)';

-- Inserir dados iniciais para a empresa Toriq
INSERT INTO public.condicoes_pagamento (empresa_id, nome, descricao, parcelas, intervalo_dias, entrada_percentual, ativo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'À Vista', 'Pagamento à vista', 1, 0, 100, true),
  ('11111111-1111-1111-1111-111111111111', '30 dias', 'Pagamento em 30 dias', 1, 30, 0, true),
  ('11111111-1111-1111-1111-111111111111', '30/60 dias', 'Pagamento em 2x (30 e 60 dias)', 2, 30, 0, true),
  ('11111111-1111-1111-1111-111111111111', '30/60/90 dias', 'Pagamento em 3x (30, 60 e 90 dias)', 3, 30, 0, true),
  ('11111111-1111-1111-1111-111111111111', 'Entrada + 30 dias', 'Entrada de 50% + 1x em 30 dias', 2, 30, 50, true)
ON CONFLICT DO NOTHING;
