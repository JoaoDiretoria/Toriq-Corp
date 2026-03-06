-- Criar bucket para documentos de instrutores
INSERT INTO storage.buckets (id, name, public)
VALUES ('instrutor-documentos', 'instrutor-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualizar arquivos (usuários autenticados da mesma empresa)
CREATE POLICY "Usuários podem ver documentos de instrutores da sua empresa"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'instrutor-documentos' AND
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

-- Política para upload de arquivos
CREATE POLICY "Usuários podem fazer upload de documentos de instrutores"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instrutor-documentos' AND
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

-- Política para atualizar/substituir arquivos
CREATE POLICY "Usuários podem atualizar documentos de instrutores"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'instrutor-documentos' AND
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

-- Política para deletar arquivos
CREATE POLICY "Usuários podem deletar documentos de instrutores"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'instrutor-documentos' AND
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);
