-- Create treinamentos table
CREATE TABLE public.treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_treinamento TEXT NOT NULL,
  instrutor TEXT NOT NULL,
  data_realizacao DATE NOT NULL,
  validade_meses NUMERIC NOT NULL DEFAULT 12,
  participantes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- Admin vertical pode gerenciar todos os treinamentos
CREATE POLICY "Admin vertical pode gerenciar todos os treinamentos"
ON public.treinamentos
FOR ALL
USING (has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Empresa SST pode gerenciar treinamentos da sua empresa
CREATE POLICY "Empresa SST pode gerenciar treinamentos da sua empresa"
ON public.treinamentos
FOR ALL
USING (
  has_role(auth.uid(), 'empresa_sst') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'empresa_sst') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Cliente final pode ver treinamentos da sua empresa
CREATE POLICY "Cliente final pode ver treinamentos da sua empresa"
ON public.treinamentos
FOR SELECT
USING (
  has_role(auth.uid(), 'cliente_final') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Cliente final pode cadastrar treinamentos da sua empresa
CREATE POLICY "Cliente final pode cadastrar treinamentos da sua empresa"
ON public.treinamentos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'cliente_final') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Cliente final pode atualizar treinamentos da sua empresa
CREATE POLICY "Cliente final pode atualizar treinamentos da sua empresa"
ON public.treinamentos
FOR UPDATE
USING (
  has_role(auth.uid(), 'cliente_final') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Cliente final pode deletar treinamentos da sua empresa
CREATE POLICY "Cliente final pode deletar treinamentos da sua empresa"
ON public.treinamentos
FOR DELETE
USING (
  has_role(auth.uid(), 'cliente_final') AND 
  empresa_id IN (SELECT profiles.empresa_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_treinamentos_updated_at
BEFORE UPDATE ON public.treinamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert module entry
INSERT INTO public.modulos (nome, descricao, icone, rota)
VALUES ('Gestão de Treinamentos', 'Controle e gerenciamento de treinamentos e capacitações', 'GraduationCap', '/modulos/treinamentos');