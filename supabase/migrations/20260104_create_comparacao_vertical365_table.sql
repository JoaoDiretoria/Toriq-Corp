-- Tabela para armazenar comparações Vertical 365 x Treinamentos Avulsos
CREATE TABLE IF NOT EXISTS public.funil_card_comparacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.funil_cards(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Dados do Vertical 365
  valor_campo_numerico TEXT DEFAULT '',
  label_treinamentos_inclusos TEXT DEFAULT 'Valor do Treinamento por turma',
  label_sistema_gestao_anual TEXT DEFAULT 'Quantidade de turma',
  label_implantacao TEXT DEFAULT 'Valor total das turmas de treinamento',
  label_total_anual TEXT DEFAULT 'Sistema de Gestão de Treinamentos anual',
  label_valor_mensal TEXT DEFAULT 'Implantação do sistema',
  label_campo_numerico TEXT DEFAULT 'Total Anual',
  label_campo_valor TEXT DEFAULT 'Valor Mensal',
  
  -- Dados dos Treinamentos Avulsos
  campo1_treinamento TEXT DEFAULT '',
  campo2_turmas TEXT DEFAULT '',
  campo4_sistema_gestao TEXT DEFAULT '',
  campo5_implantacao TEXT DEFAULT '',
  label_valor_medio TEXT DEFAULT 'Valor médio de treinamento com C.H 8 horas por turma',
  label_quantidade_turmas TEXT DEFAULT 'Quantidade de turmas',
  label_valor_total_turmas TEXT DEFAULT 'Valor total das turmas de treinamento',
  label_sistema_gestao_mensal TEXT DEFAULT 'Sistema de Gestão de Treinamentos (Mensal)',
  label_sistema_gestao_anual_avulso TEXT DEFAULT 'Valor total do sistema de gestão em 1 ano',
  label_implantacao_avulso TEXT DEFAULT 'Impantação do Sistema (Valor único)',
  label_valor_total_investido TEXT DEFAULT 'Valor total investido durante o ano, de acordo com a necessidade do cliente',
  
  -- Pontos Fortes e Pontos a Desejar
  label_pontos_fortes TEXT DEFAULT 'Pontos fortes do Vertical 365',
  texto_pontos_fortes TEXT DEFAULT '',
  label_pontos_desejar TEXT DEFAULT 'Pontos a desejar do método convencional',
  texto_pontos_desejar TEXT DEFAULT '',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funil_card_comparacoes_card_id ON public.funil_card_comparacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_funil_card_comparacoes_empresa_id ON public.funil_card_comparacoes(empresa_id);

-- RLS
ALTER TABLE public.funil_card_comparacoes ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuarios podem ver comparacoes da sua empresa"
  ON public.funil_card_comparacoes
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para INSERT
CREATE POLICY "Usuarios podem criar comparacoes na sua empresa"
  ON public.funil_card_comparacoes
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para UPDATE
CREATE POLICY "Usuarios podem atualizar comparacoes da sua empresa"
  ON public.funil_card_comparacoes
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy para DELETE
CREATE POLICY "Usuarios podem deletar comparacoes da sua empresa"
  ON public.funil_card_comparacoes
  FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_funil_card_comparacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_funil_card_comparacoes_updated_at
  BEFORE UPDATE ON public.funil_card_comparacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_funil_card_comparacoes_updated_at();
