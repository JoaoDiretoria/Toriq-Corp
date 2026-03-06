-- Criar bucket para anexos de prospecção
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospeccao-anexos', 'prospeccao-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket prospeccao-anexos
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver anexos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar anexos" ON storage.objects;

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prospeccao-anexos');

CREATE POLICY "Usuários autenticados podem ver anexos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'prospeccao-anexos');

CREATE POLICY "Usuários autenticados podem deletar anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'prospeccao-anexos');
