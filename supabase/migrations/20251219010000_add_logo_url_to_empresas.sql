-- Migration: Adicionar campo logo_url na tabela empresas e criar bucket de storage
-- Data: 2024-12-19

-- Adicionar coluna logo_url na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Comentário na coluna
COMMENT ON COLUMN empresas.logo_url IS 'URL da logo da empresa armazenada no storage';

-- Criar bucket para logos de empresas (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos-empresas',
  'logos-empresas',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública das logos
CREATE POLICY IF NOT EXISTS "Logos são públicas para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos-empresas');

-- Política para permitir upload por usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos-empresas'
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização por usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem atualizar logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos-empresas'
  AND auth.role() = 'authenticated'
);

-- Política para permitir deleção por usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem deletar logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos-empresas'
  AND auth.role() = 'authenticated'
);
