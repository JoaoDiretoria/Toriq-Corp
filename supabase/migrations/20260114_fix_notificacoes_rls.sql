-- Migration: Corrigir RLS policies para notificações
-- Data: 2026-01-14

-- Remover policies antigas e criar novas mais simples
DROP POLICY IF EXISTS "Admin Vertical pode ver todas notificações" ON notificacoes;
DROP POLICY IF EXISTS "Usuários veem notificações da sua empresa" ON notificacoes;
DROP POLICY IF EXISTS "Usuários podem criar notificações da sua empresa" ON notificacoes;
DROP POLICY IF EXISTS "Usuários podem atualizar notificações da sua empresa" ON notificacoes;

-- Policy única para SELECT: usuário vê notificações da sua empresa OU admin vê todas
CREATE POLICY "notificacoes_select_policy" ON notificacoes
FOR SELECT TO authenticated
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical'
);

-- Policy para INSERT: qualquer usuário autenticado pode inserir (triggers usam SECURITY DEFINER)
CREATE POLICY "notificacoes_insert_policy" ON notificacoes
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy para UPDATE: usuário pode atualizar notificações da sua empresa
CREATE POLICY "notificacoes_update_policy" ON notificacoes
FOR UPDATE TO authenticated
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_vertical'
);
