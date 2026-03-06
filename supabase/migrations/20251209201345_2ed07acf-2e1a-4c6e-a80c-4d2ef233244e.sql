-- Create table for Normas Regulamentadoras
CREATE TABLE public.normas_regulamentadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nr text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate NRs per company
CREATE UNIQUE INDEX normas_regulamentadoras_empresa_nr_idx 
ON public.normas_regulamentadoras(empresa_id, nr);

-- Enable RLS
ALTER TABLE public.normas_regulamentadoras ENABLE ROW LEVEL SECURITY;

-- Policies for empresa_sst
CREATE POLICY "Empresa SST pode ver suas NRs"
ON public.normas_regulamentadoras FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa SST pode gerenciar suas NRs"
ON public.normas_regulamentadoras FOR ALL
USING (get_user_role(auth.uid()) = 'empresa_sst' AND empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (get_user_role(auth.uid()) = 'empresa_sst' AND empresa_id = get_user_empresa_id(auth.uid()));

-- Policy for admin_vertical
CREATE POLICY "Admin vertical pode gerenciar todas as NRs"
ON public.normas_regulamentadoras FOR ALL
USING (has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Trigger for updated_at
CREATE TRIGGER update_normas_regulamentadoras_updated_at
  BEFORE UPDATE ON public.normas_regulamentadoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();