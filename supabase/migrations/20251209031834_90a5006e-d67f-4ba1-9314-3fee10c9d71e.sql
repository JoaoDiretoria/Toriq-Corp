-- Criar tabela de configurações da empresa (whitelabel)
CREATE TABLE public.configuracoes_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#3b82f6',
  cor_secundaria TEXT DEFAULT '#1e40af',
  tema TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_configuracoes_empresa_updated_at
  BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para configuracoes_empresa
CREATE POLICY "Admin vertical pode gerenciar configurações"
  ON public.configuracoes_empresa FOR ALL
  USING (has_role(auth.uid(), 'admin_vertical'))
  WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Usuários podem ver configurações da sua empresa"
  ON public.configuracoes_empresa FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Políticas RLS para cliente_final acessar financeiro_contas
CREATE POLICY "Cliente final pode ver suas contas"
  ON public.financeiro_contas FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM profiles WHERE id = auth.uid()
    )
  );