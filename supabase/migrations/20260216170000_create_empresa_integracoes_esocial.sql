-- Migration: Criar tabela de integrações eSocial/Gov.br por empresa
-- Data: 2026-02-16
-- Objetivo: Suportar credenciais e certificado digital por empresa (multi-tenant por empresa_id)

CREATE TABLE IF NOT EXISTS public.empresa_integracoes_esocial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,

  -- Gov.br
  govbr_client_id TEXT,
  govbr_client_secret_enc TEXT, -- valor criptografado no backend
  govbr_redirect_uri TEXT,
  govbr_environment VARCHAR(20) NOT NULL DEFAULT 'staging'
    CHECK (govbr_environment IN ('staging', 'production')),

  -- eSocial
  esocial_cert_base64_enc TEXT, -- valor criptografado no backend
  esocial_cert_password_enc TEXT, -- valor criptografado no backend
  esocial_tipo_inscricao VARCHAR(1) NOT NULL DEFAULT '1'
    CHECK (esocial_tipo_inscricao IN ('1', '2', '3', '4', '5', '6')),
  esocial_nr_inscricao VARCHAR(50),
  esocial_ambiente VARCHAR(1) NOT NULL DEFAULT '2'
    CHECK (esocial_ambiente IN ('1', '2')),

  -- Metadados opcionais
  certificado_alias VARCHAR(255),
  certificado_valido_ate DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT empresa_integracoes_esocial_empresa_unique UNIQUE (empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_empresa_integracoes_esocial_empresa_id
  ON public.empresa_integracoes_esocial(empresa_id);

CREATE INDEX IF NOT EXISTS idx_empresa_integracoes_esocial_updated_at
  ON public.empresa_integracoes_esocial(updated_at DESC);

ALTER TABLE public.empresa_integracoes_esocial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_integracoes_esocial_select" ON public.empresa_integracoes_esocial;
CREATE POLICY "empresa_integracoes_esocial_select"
  ON public.empresa_integracoes_esocial
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin_vertical')
    OR empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "empresa_integracoes_esocial_insert" ON public.empresa_integracoes_esocial;
CREATE POLICY "empresa_integracoes_esocial_insert"
  ON public.empresa_integracoes_esocial
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin_vertical')
    OR empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "empresa_integracoes_esocial_update" ON public.empresa_integracoes_esocial;
CREATE POLICY "empresa_integracoes_esocial_update"
  ON public.empresa_integracoes_esocial
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin_vertical')
    OR empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_vertical')
    OR empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "empresa_integracoes_esocial_delete" ON public.empresa_integracoes_esocial;
CREATE POLICY "empresa_integracoes_esocial_delete"
  ON public.empresa_integracoes_esocial
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin_vertical')
    OR empresa_id IN (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
  );

COMMENT ON TABLE public.empresa_integracoes_esocial IS
  'Configurações de integração Gov.br e eSocial por empresa (multi-tenant por empresa_id).';

COMMENT ON COLUMN public.empresa_integracoes_esocial.govbr_client_secret_enc IS
  'Client secret do Gov.br criptografado pelo backend.';

COMMENT ON COLUMN public.empresa_integracoes_esocial.esocial_cert_base64_enc IS
  'Certificado A1 (.pfx/.p12 em base64) criptografado pelo backend.';

COMMENT ON COLUMN public.empresa_integracoes_esocial.esocial_cert_password_enc IS
  'Senha do certificado eSocial criptografada pelo backend.';
