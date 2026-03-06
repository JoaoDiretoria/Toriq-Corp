-- Tabela para armazenar orçamentos de clientes (popup "Orçamento para o Cliente")
CREATE TABLE IF NOT EXISTS public.funil_card_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.funil_cards(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Dados do cliente/destino
  cliente_nome TEXT,
  cidade_destino TEXT,
  estado_destino TEXT,
  km NUMERIC DEFAULT 0,
  
  -- Itens do orçamento por plano (JSON array)
  itens_ouro JSONB DEFAULT '[]'::jsonb,
  itens_prata JSONB DEFAULT '[]'::jsonb,
  itens_bronze JSONB DEFAULT '[]'::jsonb,
  
  -- Totais calculados
  total_ouro NUMERIC DEFAULT 0,
  total_prata NUMERIC DEFAULT 0,
  total_bronze NUMERIC DEFAULT 0,
  
  -- Configurações da calculadora usadas
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funil_card_orcamentos_card_id ON public.funil_card_orcamentos(card_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_orcamentos_empresa_id ON public.funil_card_orcamentos(empresa_id);

-- RLS
ALTER TABLE public.funil_card_orcamentos ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuarios podem ver orcamentos da sua empresa"
  ON public.funil_card_orcamentos
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para INSERT
CREATE POLICY "Usuarios podem criar orcamentos na sua empresa"
  ON public.funil_card_orcamentos
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para UPDATE
CREATE POLICY "Usuarios podem atualizar orcamentos da sua empresa"
  ON public.funil_card_orcamentos
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para DELETE
CREATE POLICY "Usuarios podem deletar orcamentos da sua empresa"
  ON public.funil_card_orcamentos
  FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_funil_card_orcamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_funil_card_orcamentos_updated_at
  BEFORE UPDATE ON public.funil_card_orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_funil_card_orcamentos_updated_at();
