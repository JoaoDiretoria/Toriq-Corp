-- Criar bucket 'fotos' para armazenar fotos de colaboradores
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket 'fotos'
-- Permitir upload para usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos');

-- Permitir leitura pública das fotos
CREATE POLICY IF NOT EXISTS "Fotos são públicas para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fotos');

-- Permitir atualização para usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem atualizar fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos');

-- Permitir deleção para usuários autenticados
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem deletar fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos');

-- Corrigir RLS da tabela colaboradores para permitir inserção por instrutores
-- Primeiro, verificar se a policy existe e criar/atualizar

-- Policy para instrutores poderem inserir colaboradores
DROP POLICY IF EXISTS "Instrutores podem inserir colaboradores" ON colaboradores;
CREATE POLICY "Instrutores podem inserir colaboradores"
ON colaboradores FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'instrutor'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('empresa_sst', 'admin_vertical')
  )
);

-- Policy para instrutores poderem atualizar colaboradores das turmas que gerenciam
DROP POLICY IF EXISTS "Instrutores podem atualizar colaboradores" ON colaboradores;
CREATE POLICY "Instrutores podem atualizar colaboradores"
ON colaboradores FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'instrutor'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('empresa_sst', 'admin_vertical')
  )
);
