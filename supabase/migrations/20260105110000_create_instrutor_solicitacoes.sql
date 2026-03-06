-- =====================================================
-- TABELA DE SOLICITAÇÕES DE CADASTRO DE INSTRUTORES
-- E PERGUNTAS DE SUPORTE
-- =====================================================

-- Tabela principal de solicitações de cadastro
CREATE TABLE IF NOT EXISTS public.instrutor_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Token único para acesso ao formulário
  token VARCHAR(64) UNIQUE NOT NULL,
  
  -- Status da solicitação
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
  
  -- Dados pessoais
  nome VARCHAR(255),
  cpf_cnpj VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(20),
  data_nascimento DATE,
  
  -- Endereço
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Dados profissionais
  formacao_academica TEXT,
  possui_veiculo BOOLEAN DEFAULT false,
  tipo_veiculo VARCHAR(100),
  placa VARCHAR(10),
  
  -- Assinatura digital (URL)
  assinatura_url TEXT,
  
  -- Formações (JSON array)
  formacoes JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enviado_em TIMESTAMPTZ,
  avaliado_em TIMESTAMPTZ,
  avaliado_por UUID REFERENCES public.profiles(id),
  
  -- Motivo de rejeição
  motivo_rejeicao TEXT
);

-- Tabela de perguntas de suporte
CREATE TABLE IF NOT EXISTS public.instrutor_solicitacao_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.instrutor_solicitacoes(id) ON DELETE CASCADE,
  
  -- Campo sobre o qual é a dúvida
  campo VARCHAR(100) NOT NULL,
  
  -- Pergunta do instrutor
  pergunta TEXT NOT NULL,
  
  -- Resposta do suporte
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  respondido_por UUID REFERENCES public.profiles(id),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'respondido')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_empresa ON public.instrutor_solicitacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_token ON public.instrutor_solicitacoes(token);
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacoes_status ON public.instrutor_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_instrutor_solicitacao_perguntas_solicitacao ON public.instrutor_solicitacao_perguntas(solicitacao_id);

-- Habilitar RLS
ALTER TABLE public.instrutor_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrutor_solicitacao_perguntas ENABLE ROW LEVEL SECURITY;

-- Políticas para instrutor_solicitacoes

-- Usuários da empresa podem ver solicitações da empresa
DROP POLICY IF EXISTS "Usuarios podem ver solicitacoes da empresa" ON public.instrutor_solicitacoes;
CREATE POLICY "Usuarios podem ver solicitacoes da empresa"
  ON public.instrutor_solicitacoes FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- Usuários da empresa podem criar solicitações
DROP POLICY IF EXISTS "Usuarios podem criar solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Usuarios podem criar solicitacoes"
  ON public.instrutor_solicitacoes FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- Usuários da empresa podem atualizar solicitações
DROP POLICY IF EXISTS "Usuarios podem atualizar solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Usuarios podem atualizar solicitacoes"
  ON public.instrutor_solicitacoes FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- Usuários da empresa podem deletar solicitações
DROP POLICY IF EXISTS "Usuarios podem deletar solicitacoes" ON public.instrutor_solicitacoes;
CREATE POLICY "Usuarios podem deletar solicitacoes"
  ON public.instrutor_solicitacoes FOR DELETE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- Acesso público via token (para o formulário do instrutor)
DROP POLICY IF EXISTS "Acesso publico via token" ON public.instrutor_solicitacoes;
CREATE POLICY "Acesso publico via token"
  ON public.instrutor_solicitacoes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para instrutor_solicitacao_perguntas

-- Usuários da empresa podem ver perguntas das solicitações da empresa
DROP POLICY IF EXISTS "Usuarios podem ver perguntas" ON public.instrutor_solicitacao_perguntas;
CREATE POLICY "Usuarios podem ver perguntas"
  ON public.instrutor_solicitacao_perguntas FOR SELECT
  USING (solicitacao_id IN (
    SELECT id FROM public.instrutor_solicitacoes 
    WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  ));

-- Acesso público para criar perguntas (via token da solicitação)
DROP POLICY IF EXISTS "Acesso publico para criar perguntas" ON public.instrutor_solicitacao_perguntas;
CREATE POLICY "Acesso publico para criar perguntas"
  ON public.instrutor_solicitacao_perguntas FOR INSERT
  WITH CHECK (true);

-- Usuários da empresa podem atualizar perguntas (responder)
DROP POLICY IF EXISTS "Usuarios podem responder perguntas" ON public.instrutor_solicitacao_perguntas;
CREATE POLICY "Usuarios podem responder perguntas"
  ON public.instrutor_solicitacao_perguntas FOR UPDATE
  USING (solicitacao_id IN (
    SELECT id FROM public.instrutor_solicitacoes 
    WHERE empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  ));

-- Acesso público para ver perguntas (via token)
DROP POLICY IF EXISTS "Acesso publico para ver perguntas" ON public.instrutor_solicitacao_perguntas;
CREATE POLICY "Acesso publico para ver perguntas"
  ON public.instrutor_solicitacao_perguntas FOR SELECT
  USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_instrutor_solicitacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_instrutor_solicitacoes ON public.instrutor_solicitacoes;
CREATE TRIGGER trigger_update_instrutor_solicitacoes
  BEFORE UPDATE ON public.instrutor_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_instrutor_solicitacoes_updated_at();

-- =====================================================
-- POLÍTICAS DE STORAGE PARA UPLOADS PÚBLICOS
-- =====================================================

-- Permitir upload público na pasta solicitacao_* do bucket instrutor-documentos
DROP POLICY IF EXISTS "Permitir upload publico solicitacoes" ON storage.objects;
CREATE POLICY "Permitir upload publico solicitacoes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'instrutor-documentos' 
    AND (storage.foldername(name))[1] LIKE 'solicitacao_%'
  );

-- Permitir leitura pública na pasta solicitacao_*
DROP POLICY IF EXISTS "Permitir leitura publica solicitacoes" ON storage.objects;
CREATE POLICY "Permitir leitura publica solicitacoes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'instrutor-documentos' 
    AND (storage.foldername(name))[1] LIKE 'solicitacao_%'
  );

-- Permitir update público na pasta solicitacao_* (para upsert)
DROP POLICY IF EXISTS "Permitir update publico solicitacoes" ON storage.objects;
CREATE POLICY "Permitir update publico solicitacoes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'instrutor-documentos' 
    AND (storage.foldername(name))[1] LIKE 'solicitacao_%'
  );
