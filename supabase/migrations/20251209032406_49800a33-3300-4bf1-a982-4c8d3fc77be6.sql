-- Criar bucket para arquivos ASO
INSERT INTO storage.buckets (id, name, public)
VALUES ('aso-files', 'aso-files', false);

-- Políticas de storage para aso-files
CREATE POLICY "Usuários podem ver arquivos ASO da sua empresa"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aso-files' AND
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem fazer upload de arquivos ASO"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aso-files' AND
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin pode gerenciar todos os arquivos ASO"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'aso-files' AND
    has_role(auth.uid(), 'admin_vertical')
  );

-- Criar tabela de saúde ocupacional
CREATE TABLE public.saude_ocupacional (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_nome TEXT NOT NULL,
  tipo_exame TEXT NOT NULL CHECK (tipo_exame IN ('admissional', 'periodico', 'demissional', 'retorno_trabalho')),
  data_exame DATE NOT NULL,
  validade_dias NUMERIC NOT NULL DEFAULT 365,
  aso_arquivo_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saude_ocupacional ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_saude_ocupacional_updated_at
  BEFORE UPDATE ON public.saude_ocupacional
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para admin_vertical
CREATE POLICY "Admin vertical pode gerenciar toda saúde ocupacional"
  ON public.saude_ocupacional FOR ALL
  USING (has_role(auth.uid(), 'admin_vertical'))
  WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Políticas RLS para empresa_sst
CREATE POLICY "Empresa SST pode ver saúde ocupacional da sua empresa"
  ON public.saude_ocupacional FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Empresa SST pode gerenciar saúde ocupacional da sua empresa"
  ON public.saude_ocupacional FOR ALL
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

-- Políticas RLS para cliente_final
CREATE POLICY "Cliente final pode ver saúde ocupacional da sua empresa"
  ON public.saude_ocupacional FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente_final') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Cliente final pode cadastrar exames da sua empresa"
  ON public.saude_ocupacional FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'cliente_final') AND
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Inserir módulo de Saúde Ocupacional
INSERT INTO public.modulos (nome, descricao, icone, rota)
VALUES ('Saúde Ocupacional', 'Gestão de exames ocupacionais e ASOs dos colaboradores', 'Stethoscope', '/modulos/saude-ocupacional')
ON CONFLICT DO NOTHING;