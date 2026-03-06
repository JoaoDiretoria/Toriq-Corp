-- Criar tabela de plano de receitas
CREATE TABLE IF NOT EXISTS public.plano_receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('receitas_operacionais', 'outras_receitas_operacionais', 'receitas_financeiras', 'receitas_nao_operacionais')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plano_receitas_empresa ON public.plano_receitas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plano_receitas_tipo ON public.plano_receitas(tipo);
CREATE INDEX IF NOT EXISTS idx_plano_receitas_ativo ON public.plano_receitas(ativo);

-- Habilitar RLS
ALTER TABLE public.plano_receitas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin pode tudo em plano_receitas" ON public.plano_receitas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

CREATE POLICY "Usuários podem ver plano_receitas da sua empresa" ON public.plano_receitas
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar plano_receitas na sua empresa" ON public.plano_receitas
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar plano_receitas da sua empresa" ON public.plano_receitas
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar plano_receitas da sua empresa" ON public.plano_receitas
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_plano_receitas_updated_at
  BEFORE UPDATE ON public.plano_receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.plano_receitas IS 'Plano de classificação de receitas para DRE';
COMMENT ON COLUMN public.plano_receitas.tipo IS 'Tipo de receita: receitas_operacionais, outras_receitas_operacionais, receitas_financeiras, receitas_nao_operacionais';
