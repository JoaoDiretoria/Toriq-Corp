-- =====================================================
-- SISTEMA DE AGENDA COM COMPARTILHAMENTO
-- =====================================================

-- Tabela principal de eventos da agenda
CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  dia_inteiro BOOLEAN DEFAULT false,
  local TEXT,
  cor TEXT DEFAULT '#16E17A',
  tipo TEXT DEFAULT 'evento' CHECK (tipo IN ('evento', 'reuniao', 'tarefa', 'lembrete', 'visita', 'outro')),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado', 'concluido')),
  visibilidade TEXT DEFAULT 'privado' CHECK (visibilidade IN ('privado', 'compartilhado', 'empresa')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de compartilhamentos de eventos (colaborador compartilha com outros colaboradores)
CREATE TABLE IF NOT EXISTS public.agenda_compartilhamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.agenda_eventos(id) ON DELETE CASCADE,
  compartilhado_com UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compartilhado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pode_editar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(evento_id, compartilhado_com)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_empresa ON public.agenda_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_criado_por ON public.agenda_eventos(criado_por);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_data_inicio ON public.agenda_eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_compartilhamentos_evento ON public.agenda_compartilhamentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_agenda_compartilhamentos_usuario ON public.agenda_compartilhamentos(compartilhado_com);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_agenda_eventos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_agenda_eventos_updated_at ON public.agenda_eventos;
CREATE TRIGGER set_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION update_agenda_eventos_updated_at();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_compartilhamentos ENABLE ROW LEVEL SECURITY;

-- agenda_eventos: SELECT
CREATE POLICY "agenda_eventos_select" ON public.agenda_eventos
  FOR SELECT USING (
    criado_por = auth.uid()
    OR
    id IN (
      SELECT evento_id FROM public.agenda_compartilhamentos
      WHERE compartilhado_com = auth.uid()
    )
    OR
    (visibilidade = 'empresa' AND empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    ))
    OR
    empresa_id IN (
      SELECT empresa_id FROM public.profiles
      WHERE id = auth.uid() AND (role = 'empresa_sst' OR role = 'admin_vertical' OR role = 'cliente_final')
    )
  );

-- agenda_eventos: INSERT
CREATE POLICY "agenda_eventos_insert" ON public.agenda_eventos
  FOR INSERT WITH CHECK (
    criado_por = auth.uid()
    AND empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- agenda_eventos: UPDATE
CREATE POLICY "agenda_eventos_update" ON public.agenda_eventos
  FOR UPDATE USING (
    criado_por = auth.uid()
    OR
    id IN (
      SELECT evento_id FROM public.agenda_compartilhamentos
      WHERE compartilhado_com = auth.uid() AND pode_editar = true
    )
    OR
    empresa_id IN (
      SELECT empresa_id FROM public.profiles
      WHERE id = auth.uid() AND (role = 'empresa_sst' OR role = 'admin_vertical' OR role = 'cliente_final')
    )
  );

-- agenda_eventos: DELETE
CREATE POLICY "agenda_eventos_delete" ON public.agenda_eventos
  FOR DELETE USING (
    criado_por = auth.uid()
    OR
    empresa_id IN (
      SELECT empresa_id FROM public.profiles
      WHERE id = auth.uid() AND (role = 'empresa_sst' OR role = 'admin_vertical')
    )
  );

-- agenda_compartilhamentos: SELECT
CREATE POLICY "agenda_compartilhamentos_select" ON public.agenda_compartilhamentos
  FOR SELECT USING (
    compartilhado_com = auth.uid()
    OR compartilhado_por = auth.uid()
    OR
    evento_id IN (
      SELECT id FROM public.agenda_eventos WHERE criado_por = auth.uid()
    )
    OR
    evento_id IN (
      SELECT ae.id FROM public.agenda_eventos ae
      JOIN public.profiles p ON p.empresa_id = ae.empresa_id
      WHERE p.id = auth.uid() AND (p.role = 'empresa_sst' OR p.role = 'admin_vertical' OR p.role = 'cliente_final')
    )
  );

-- agenda_compartilhamentos: INSERT
CREATE POLICY "agenda_compartilhamentos_insert" ON public.agenda_compartilhamentos
  FOR INSERT WITH CHECK (
    compartilhado_por = auth.uid()
    AND evento_id IN (
      SELECT id FROM public.agenda_eventos WHERE criado_por = auth.uid()
    )
  );

-- agenda_compartilhamentos: DELETE
CREATE POLICY "agenda_compartilhamentos_delete" ON public.agenda_compartilhamentos
  FOR DELETE USING (
    compartilhado_por = auth.uid()
    OR evento_id IN (
      SELECT id FROM public.agenda_eventos WHERE criado_por = auth.uid()
    )
  );
