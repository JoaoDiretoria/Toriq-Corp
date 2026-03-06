-- Adicionar campos para suportar solicitações de indisponibilidade
-- Status: pendente (solicitação aguardando), aprovado (confirmado), rejeitado (negado)
-- Origem: admin (criado pela empresa), instrutor (solicitado pelo instrutor)

ALTER TABLE instrutor_datas_indisponiveis 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'aprovado',
ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

-- Criar índice para buscar por status
CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_status 
ON instrutor_datas_indisponiveis(status);

-- Criar índice para buscar por origem
CREATE INDEX IF NOT EXISTS idx_instrutor_datas_indisponiveis_origem 
ON instrutor_datas_indisponiveis(origem);

-- Atualizar política de SELECT para incluir instrutores vendo suas próprias solicitações
DROP POLICY IF EXISTS "Usuários podem ver datas indisponíveis de instrutores da mesma empresa" ON instrutor_datas_indisponiveis;

CREATE POLICY "Usuários podem ver datas indisponíveis"
ON instrutor_datas_indisponiveis
FOR SELECT
USING (
  -- Empresas SST/Parceiras podem ver de seus instrutores
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
  OR
  -- Instrutores podem ver suas próprias indisponibilidades
  EXISTS (
    SELECT 1 FROM instrutores i
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND i.user_id = auth.uid()
  )
);

-- Atualizar política de INSERT para permitir instrutores criarem solicitações
DROP POLICY IF EXISTS "Usuários podem cadastrar datas indisponíveis para instrutores da mesma empresa" ON instrutor_datas_indisponiveis;

CREATE POLICY "Usuários podem cadastrar datas indisponíveis"
ON instrutor_datas_indisponiveis
FOR INSERT
WITH CHECK (
  -- Empresas SST/Parceiras podem cadastrar para seus instrutores
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
  OR
  -- Instrutores podem solicitar para si mesmos (status pendente)
  EXISTS (
    SELECT 1 FROM instrutores i
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND i.user_id = auth.uid()
  )
);

-- Atualizar política de UPDATE
DROP POLICY IF EXISTS "Usuários podem atualizar datas indisponíveis de instrutores da mesma empresa" ON instrutor_datas_indisponiveis;

CREATE POLICY "Usuários podem atualizar datas indisponíveis"
ON instrutor_datas_indisponiveis
FOR UPDATE
USING (
  -- Empresas SST/Parceiras podem atualizar (aprovar/rejeitar)
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
  OR
  -- Instrutores podem atualizar suas próprias solicitações pendentes
  EXISTS (
    SELECT 1 FROM instrutores i
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND i.user_id = auth.uid()
    AND instrutor_datas_indisponiveis.status = 'pendente'
  )
);

-- Atualizar política de DELETE
DROP POLICY IF EXISTS "Usuários podem excluir datas indisponíveis de instrutores da mesma empresa" ON instrutor_datas_indisponiveis;

CREATE POLICY "Usuários podem excluir datas indisponíveis"
ON instrutor_datas_indisponiveis
FOR DELETE
USING (
  -- Empresas SST/Parceiras podem excluir
  EXISTS (
    SELECT 1 FROM instrutores i
    JOIN profiles p ON p.empresa_id = i.empresa_id
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND p.id = auth.uid()
  )
  OR
  -- Instrutores podem excluir suas próprias solicitações pendentes
  EXISTS (
    SELECT 1 FROM instrutores i
    WHERE i.id = instrutor_datas_indisponiveis.instrutor_id
    AND i.user_id = auth.uid()
    AND instrutor_datas_indisponiveis.status = 'pendente'
  )
);
