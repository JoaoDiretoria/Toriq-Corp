-- Criar tabela de turmas de treinamento (agendamentos)
CREATE TABLE public.turmas_treinamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_turma INTEGER NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes_sst(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.catalogo_treinamentos(id) ON DELETE CASCADE,
  tipo_treinamento TEXT NOT NULL CHECK (tipo_treinamento IN ('Inicial', 'Periódico', 'Eventual')),
  carga_horaria_total INTEGER NOT NULL DEFAULT 0,
  instrutor_id UUID REFERENCES public.instrutores(id) ON DELETE SET NULL,
  quantidade_participantes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'em_andamento', 'concluido', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de aulas das turmas (dias agendados)
CREATE TABLE public.turmas_treinamento_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.turmas_treinamento(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  horas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.turmas_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas_treinamento_aulas ENABLE ROW LEVEL SECURITY;

-- Policies para turmas_treinamento
CREATE POLICY "Usuários podem ver turmas da sua empresa" 
ON public.turmas_treinamento 
FOR SELECT 
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem inserir turmas" 
ON public.turmas_treinamento 
FOR INSERT 
TO authenticated
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem atualizar turmas da sua empresa" 
ON public.turmas_treinamento 
FOR UPDATE 
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem deletar turmas da sua empresa" 
ON public.turmas_treinamento 
FOR DELETE 
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

-- Policies para turmas_treinamento_aulas
CREATE POLICY "Usuários podem ver aulas de turmas da sua empresa" 
ON public.turmas_treinamento_aulas 
FOR SELECT 
TO authenticated
USING (
  turma_id IN (
    SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem inserir aulas" 
ON public.turmas_treinamento_aulas 
FOR INSERT 
TO authenticated
WITH CHECK (
  turma_id IN (
    SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem atualizar aulas" 
ON public.turmas_treinamento_aulas 
FOR UPDATE 
TO authenticated
USING (
  turma_id IN (
    SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

CREATE POLICY "Usuários SST podem deletar aulas" 
ON public.turmas_treinamento_aulas 
FOR DELETE 
TO authenticated
USING (
  turma_id IN (
    SELECT id FROM public.turmas_treinamento WHERE empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_turmas_treinamento_updated_at
  BEFORE UPDATE ON public.turmas_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_turmas_treinamento_empresa_id ON public.turmas_treinamento(empresa_id);
CREATE INDEX idx_turmas_treinamento_cliente_id ON public.turmas_treinamento(cliente_id);
CREATE INDEX idx_turmas_treinamento_treinamento_id ON public.turmas_treinamento(treinamento_id);
CREATE INDEX idx_turmas_treinamento_instrutor_id ON public.turmas_treinamento(instrutor_id);
CREATE INDEX idx_turmas_treinamento_aulas_turma_id ON public.turmas_treinamento_aulas(turma_id);
CREATE INDEX idx_turmas_treinamento_aulas_data ON public.turmas_treinamento_aulas(data);
