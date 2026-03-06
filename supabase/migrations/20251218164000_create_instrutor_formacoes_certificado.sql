-- =====================================================
-- TABELA PARA FORMAÇÕES DO CERTIFICADO DO INSTRUTOR
-- Permite múltiplas formações vinculadas a treinamentos
-- =====================================================

-- Criar tabela de formações do certificado
CREATE TABLE IF NOT EXISTS public.instrutor_formacoes_certificado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrutor_id UUID NOT NULL REFERENCES public.instrutores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  -- Dados da formação
  formacao_nome VARCHAR(255) NOT NULL, -- Ex: "Engenheiro de Segurança do Trabalho"
  registro_tipo VARCHAR(50), -- CREA, MTE, CRM, etc.
  registro_numero VARCHAR(50),
  registro_estado VARCHAR(2), -- UF
  -- Configuração de treinamentos
  aplicar_em VARCHAR(20) DEFAULT 'todos', -- 'todos', 'selecionados', 'todos_exceto'
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vínculo entre formação e treinamentos específicos
CREATE TABLE IF NOT EXISTS public.instrutor_formacao_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formacao_certificado_id UUID NOT NULL REFERENCES public.instrutor_formacoes_certificado(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.catalogo_treinamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(formacao_certificado_id, treinamento_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_instrutor_formacoes_certificado_instrutor ON public.instrutor_formacoes_certificado(instrutor_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacoes_certificado_empresa ON public.instrutor_formacoes_certificado(empresa_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_formacao_treinamentos_formacao ON public.instrutor_formacao_treinamentos(formacao_certificado_id);

-- Habilitar RLS
ALTER TABLE public.instrutor_formacoes_certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrutor_formacao_treinamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para instrutor_formacoes_certificado
DROP POLICY IF EXISTS "Usuarios podem ver formacoes certificado da empresa" ON public.instrutor_formacoes_certificado;
DROP POLICY IF EXISTS "Usuarios podem inserir formacoes certificado" ON public.instrutor_formacoes_certificado;
DROP POLICY IF EXISTS "Usuarios podem atualizar formacoes certificado" ON public.instrutor_formacoes_certificado;
DROP POLICY IF EXISTS "Usuarios podem deletar formacoes certificado" ON public.instrutor_formacoes_certificado;
DROP POLICY IF EXISTS "Instrutores podem ver suas formacoes" ON public.instrutor_formacoes_certificado;
DROP POLICY IF EXISTS "Instrutores podem gerenciar suas formacoes" ON public.instrutor_formacoes_certificado;

CREATE POLICY "Usuarios podem ver formacoes certificado da empresa"
  ON public.instrutor_formacoes_certificado FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem inserir formacoes certificado"
  ON public.instrutor_formacoes_certificado FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem atualizar formacoes certificado"
  ON public.instrutor_formacoes_certificado FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem deletar formacoes certificado"
  ON public.instrutor_formacoes_certificado FOR DELETE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- Política para instrutores verem/gerenciarem suas próprias formações
CREATE POLICY "Instrutores podem ver suas formacoes"
  ON public.instrutor_formacoes_certificado FOR SELECT
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

CREATE POLICY "Instrutores podem gerenciar suas formacoes"
  ON public.instrutor_formacoes_certificado FOR ALL
  USING (instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid()));

-- Políticas para instrutor_formacao_treinamentos
DROP POLICY IF EXISTS "Usuarios podem ver vinculo formacao treinamento" ON public.instrutor_formacao_treinamentos;
DROP POLICY IF EXISTS "Usuarios podem gerenciar vinculo formacao treinamento" ON public.instrutor_formacao_treinamentos;

CREATE POLICY "Usuarios podem ver vinculo formacao treinamento"
  ON public.instrutor_formacao_treinamentos FOR SELECT
  USING (formacao_certificado_id IN (
    SELECT id FROM public.instrutor_formacoes_certificado 
    WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    OR instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid())
  ));

CREATE POLICY "Usuarios podem gerenciar vinculo formacao treinamento"
  ON public.instrutor_formacao_treinamentos FOR ALL
  USING (formacao_certificado_id IN (
    SELECT id FROM public.instrutor_formacoes_certificado 
    WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
    OR instrutor_id IN (SELECT id FROM public.instrutores WHERE user_id = auth.uid())
  ));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_instrutor_formacoes_certificado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_instrutor_formacoes_certificado ON public.instrutor_formacoes_certificado;
CREATE TRIGGER trigger_update_instrutor_formacoes_certificado
  BEFORE UPDATE ON public.instrutor_formacoes_certificado
  FOR EACH ROW
  EXECUTE FUNCTION update_instrutor_formacoes_certificado_updated_at();
