-- Migration: Corrigir políticas de storage para o bucket prospeccao-anexos
-- Data: 2026-01-09
-- Descrição: Garante que usuários autenticados possam fazer upload de PDFs de propostas e comparações
-- IMPORTANTE: Execute este SQL diretamente no Supabase Dashboard > SQL Editor

-- Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver anexos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar anexos" ON storage.objects;
DROP POLICY IF EXISTS "prospeccao_anexos_insert" ON storage.objects;
DROP POLICY IF EXISTS "prospeccao_anexos_select" ON storage.objects;
DROP POLICY IF EXISTS "prospeccao_anexos_delete" ON storage.objects;
DROP POLICY IF EXISTS "prospeccao_anexos_update" ON storage.objects;
DROP POLICY IF EXISTS "prospeccao_anexos_public_select" ON storage.objects;

-- Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospeccao-anexos', 
  'prospeccao-anexos', 
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800;

-- Criar políticas específicas para o bucket prospeccao-anexos
CREATE POLICY "prospeccao_anexos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prospeccao-anexos');

CREATE POLICY "prospeccao_anexos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'prospeccao-anexos');

CREATE POLICY "prospeccao_anexos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'prospeccao-anexos');

CREATE POLICY "prospeccao_anexos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'prospeccao-anexos');

-- Permitir acesso público para leitura (URLs assinadas)
CREATE POLICY "prospeccao_anexos_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prospeccao-anexos');
