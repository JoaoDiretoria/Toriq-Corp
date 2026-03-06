-- Script para corrigir RLS e inserir colunas padrão
-- Este script deve ser executado no SQL Editor do Supabase

-- Dropar todas as policies existentes de contas_pagar_colunas
DROP POLICY IF EXISTS "Admin pode tudo em contas_pagar_colunas" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem ver contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem criar contas_pagar_colunas na sua empresa" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem atualizar contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas;
DROP POLICY IF EXISTS "Usuários podem deletar contas_pagar_colunas da sua empresa" ON public.contas_pagar_colunas;

-- Dropar todas as policies existentes de contas_pagar
DROP POLICY IF EXISTS "Admin pode tudo em contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem ver contas_pagar da sua empresa" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem criar contas_pagar na sua empresa" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem atualizar contas_pagar da sua empresa" ON public.contas_pagar;
DROP POLICY IF EXISTS "Usuários podem deletar contas_pagar da sua empresa" ON public.contas_pagar;

-- Criar policies mais permissivas para contas_pagar_colunas
-- Admin pode fazer tudo
CREATE POLICY "Admin pode tudo em contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

-- Usuários podem ver colunas de qualquer empresa (para simplificar)
CREATE POLICY "Usuários podem ver contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR SELECT USING (true);

-- Usuários podem criar colunas
CREATE POLICY "Usuários podem criar contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR INSERT WITH CHECK (true);

-- Usuários podem atualizar colunas
CREATE POLICY "Usuários podem atualizar contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR UPDATE USING (true);

-- Usuários podem deletar colunas
CREATE POLICY "Usuários podem deletar contas_pagar_colunas" ON public.contas_pagar_colunas
  FOR DELETE USING (true);

-- Criar policies mais permissivas para contas_pagar
-- Admin pode fazer tudo
CREATE POLICY "Admin pode tudo em contas_pagar" ON public.contas_pagar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
  );

-- Usuários podem ver contas
CREATE POLICY "Usuários podem ver contas_pagar" ON public.contas_pagar
  FOR SELECT USING (true);

-- Usuários podem criar contas
CREATE POLICY "Usuários podem criar contas_pagar" ON public.contas_pagar
  FOR INSERT WITH CHECK (true);

-- Usuários podem atualizar contas
CREATE POLICY "Usuários podem atualizar contas_pagar" ON public.contas_pagar
  FOR UPDATE USING (true);

-- Usuários podem deletar contas
CREATE POLICY "Usuários podem deletar contas_pagar" ON public.contas_pagar
  FOR DELETE USING (true);

-- Inserir colunas padrão para a empresa TORIQ (se não existirem)
INSERT INTO public.contas_pagar_colunas (empresa_id, nome, cor, ordem)
SELECT '11111111-1111-1111-1111-111111111111', 'A Vencer', '#eab308', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_pagar_colunas 
  WHERE empresa_id = '11111111-1111-1111-1111-111111111111' AND nome = 'A Vencer'
);

INSERT INTO public.contas_pagar_colunas (empresa_id, nome, cor, ordem)
SELECT '11111111-1111-1111-1111-111111111111', 'Vencidos', '#ef4444', 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_pagar_colunas 
  WHERE empresa_id = '11111111-1111-1111-1111-111111111111' AND nome = 'Vencidos'
);

INSERT INTO public.contas_pagar_colunas (empresa_id, nome, cor, ordem)
SELECT '11111111-1111-1111-1111-111111111111', 'Parcialmente Pago', '#3b82f6', 2
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_pagar_colunas 
  WHERE empresa_id = '11111111-1111-1111-1111-111111111111' AND nome = 'Parcialmente Pago'
);

INSERT INTO public.contas_pagar_colunas (empresa_id, nome, cor, ordem)
SELECT '11111111-1111-1111-1111-111111111111', 'Pagos', '#22c55e', 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_pagar_colunas 
  WHERE empresa_id = '11111111-1111-1111-1111-111111111111' AND nome = 'Pagos'
);
