-- Criar tabela de Atividades do Contas a Receber
CREATE TABLE IF NOT EXISTS public.contas_receber_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  tipo TEXT NOT NULL DEFAULT 'nota',
  descricao TEXT NOT NULL,
  prazo DATE,
  horario TEXT,
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('programada', 'pendente', 'concluida')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de Movimentações do Contas a Receber
CREATE TABLE IF NOT EXISTS public.contas_receber_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  tipo TEXT NOT NULL DEFAULT 'mudanca_coluna' CHECK (tipo IN ('criacao', 'mudanca_coluna', 'edicao', 'pagamento')),
  descricao TEXT NOT NULL,
  coluna_origem_id UUID REFERENCES public.contas_receber_colunas(id),
  coluna_destino_id UUID REFERENCES public.contas_receber_colunas(id),
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_conta ON public.contas_receber_atividades(conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_usuario ON public.contas_receber_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_status ON public.contas_receber_atividades(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_atividades_prazo ON public.contas_receber_atividades(prazo);
CREATE INDEX IF NOT EXISTS idx_contas_receber_movimentacoes_conta ON public.contas_receber_movimentacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_movimentacoes_usuario ON public.contas_receber_movimentacoes(usuario_id);

-- Habilitar RLS
ALTER TABLE public.contas_receber_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contas_receber_atividades
CREATE POLICY "Admin pode tudo em contas_receber_atividades" ON public.contas_receber_atividades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver atividades de contas da sua empresa" ON public.contas_receber_atividades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar atividades em contas da sua empresa" ON public.contas_receber_atividades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar atividades de contas da sua empresa" ON public.contas_receber_atividades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar atividades de contas da sua empresa" ON public.contas_receber_atividades
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

-- Políticas RLS para contas_receber_movimentacoes
CREATE POLICY "Admin pode tudo em contas_receber_movimentacoes" ON public.contas_receber_movimentacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver movimentações de contas da sua empresa" ON public.contas_receber_movimentacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar movimentações em contas da sua empresa" ON public.contas_receber_movimentacoes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contas_receber cr
      JOIN profiles p ON p.empresa_id = cr.empresa_id
      WHERE cr.id = conta_id AND p.id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_contas_receber_atividades_updated_at
  BEFORE UPDATE ON public.contas_receber_atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.contas_receber_atividades IS 'Atividades registradas nas contas a receber';
COMMENT ON TABLE public.contas_receber_movimentacoes IS 'Histórico de movimentações das contas a receber';
COMMENT ON COLUMN public.contas_receber_atividades.tipo IS 'Tipo da atividade: tarefa, email, ligacao, whatsapp, reuniao, visita, nota';
COMMENT ON COLUMN public.contas_receber_atividades.status IS 'Status da atividade: programada, pendente, concluida';
COMMENT ON COLUMN public.contas_receber_movimentacoes.tipo IS 'Tipo da movimentação: criacao, mudanca_coluna, edicao, pagamento';
