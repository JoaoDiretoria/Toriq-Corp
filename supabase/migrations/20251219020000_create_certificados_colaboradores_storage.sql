-- Criar bucket para certificados dos colaboradores
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificados-colaboradores',
  'certificados-colaboradores',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Criar tabela para armazenar referências dos certificados
CREATE TABLE IF NOT EXISTS public.colaboradores_certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID REFERENCES public.catalogo_treinamentos(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES public.turmas_treinamento(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  arquivo_url TEXT,
  arquivo_path TEXT,
  data_emissao DATE,
  data_validade DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_certificados_colaborador 
  ON public.colaboradores_certificados(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_certificados_treinamento 
  ON public.colaboradores_certificados(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_certificados_turma 
  ON public.colaboradores_certificados(turma_id);

-- RLS
ALTER TABLE public.colaboradores_certificados ENABLE ROW LEVEL SECURITY;

-- Políticas para empresa_sst
DROP POLICY IF EXISTS "empresa_sst_select_certificados" ON public.colaboradores_certificados;
CREATE POLICY "empresa_sst_select_certificados" ON public.colaboradores_certificados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.clientes_sst cs ON cs.cliente_empresa_id = c.empresa_id
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND cs.empresa_sst_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND c.empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "empresa_sst_insert_certificados" ON public.colaboradores_certificados;
CREATE POLICY "empresa_sst_insert_certificados" ON public.colaboradores_certificados
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.clientes_sst cs ON cs.cliente_empresa_id = c.empresa_id
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND cs.empresa_sst_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND c.empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "empresa_sst_update_certificados" ON public.colaboradores_certificados;
CREATE POLICY "empresa_sst_update_certificados" ON public.colaboradores_certificados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.clientes_sst cs ON cs.cliente_empresa_id = c.empresa_id
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND cs.empresa_sst_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND c.empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "empresa_sst_delete_certificados" ON public.colaboradores_certificados;
CREATE POLICY "empresa_sst_delete_certificados" ON public.colaboradores_certificados
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.clientes_sst cs ON cs.cliente_empresa_id = c.empresa_id
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND cs.empresa_sst_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaboradores_certificados.colaborador_id
      AND c.empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Políticas de storage para certificados
DROP POLICY IF EXISTS "certificados_colaboradores_select" ON storage.objects;
CREATE POLICY "certificados_colaboradores_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certificados-colaboradores');

DROP POLICY IF EXISTS "certificados_colaboradores_insert" ON storage.objects;
CREATE POLICY "certificados_colaboradores_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificados-colaboradores');

DROP POLICY IF EXISTS "certificados_colaboradores_update" ON storage.objects;
CREATE POLICY "certificados_colaboradores_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificados-colaboradores');

DROP POLICY IF EXISTS "certificados_colaboradores_delete" ON storage.objects;
CREATE POLICY "certificados_colaboradores_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificados-colaboradores');
