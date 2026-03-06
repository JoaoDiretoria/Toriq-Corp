-- Criar tabela de entregas de EPI
CREATE TABLE public.entregas_epi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_nome TEXT NOT NULL,
  colaborador_cargo TEXT NOT NULL,
  tipo_epi TEXT NOT NULL,
  data_entrega DATE NOT NULL,
  validade_meses NUMERIC NOT NULL DEFAULT 12,
  responsavel_entrega TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.entregas_epi ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_entregas_epi_updated_at
  BEFORE UPDATE ON public.entregas_epi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para admin_vertical
CREATE POLICY "Admin vertical pode gerenciar todas as entregas EPI"
  ON public.entregas_epi FOR ALL
  USING (has_role(auth.uid(), 'admin_vertical'))
  WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Políticas RLS para empresa_sst
CREATE POLICY "Empresa SST pode ver entregas EPI da sua empresa"
  ON public.entregas_epi FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Empresa SST pode gerenciar entregas EPI da sua empresa"
  ON public.entregas_epi FOR ALL
  USING (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'empresa_sst') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas RLS para cliente_final (somente leitura)
CREATE POLICY "Cliente final pode ver entregas EPI da sua empresa"
  ON public.entregas_epi FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente_final') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Cliente final pode cadastrar entregas EPI da sua empresa"
  ON public.entregas_epi FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'cliente_final') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Inserir módulo de Gestão de EPI
INSERT INTO public.modulos (nome, descricao, icone, rota)
VALUES ('Gestão de EPI', 'Controle e registro de entregas de Equipamentos de Proteção Individual', 'HardHat', '/modulos/gestao-epi')
ON CONFLICT DO NOTHING;