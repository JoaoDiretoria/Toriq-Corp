-- Migration: Atualizar políticas RLS de setores e cargos para permitir gestão por empresas SST
-- Data: 2026-01-14
-- Descrição: Permite que empresas SST gerenciem setores e cargos de seus clientes

-- Remover políticas antigas de setores
DROP POLICY IF EXISTS "Usuários podem ver setores da própria empresa" ON setores;
DROP POLICY IF EXISTS "Usuários podem criar setores na própria empresa" ON setores;
DROP POLICY IF EXISTS "Usuários podem atualizar setores da própria empresa" ON setores;
DROP POLICY IF EXISTS "Usuários podem deletar setores da própria empresa" ON setores;

-- Remover políticas antigas de cargos
DROP POLICY IF EXISTS "Usuários podem ver cargos da própria empresa" ON cargos;
DROP POLICY IF EXISTS "Usuários podem criar cargos na própria empresa" ON cargos;
DROP POLICY IF EXISTS "Usuários podem atualizar cargos da própria empresa" ON cargos;
DROP POLICY IF EXISTS "Usuários podem deletar cargos da própria empresa" ON cargos;

-- Novas políticas para setores (permite própria empresa OU empresas clientes SST)
CREATE POLICY "setores_select_policy" ON setores FOR SELECT
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "setores_insert_policy" ON setores FOR INSERT
WITH CHECK (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "setores_update_policy" ON setores FOR UPDATE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "setores_delete_policy" ON setores FOR DELETE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

-- Novas políticas para cargos (permite própria empresa OU empresas clientes SST)
CREATE POLICY "cargos_select_policy" ON cargos FOR SELECT
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "cargos_insert_policy" ON cargos FOR INSERT
WITH CHECK (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "cargos_update_policy" ON cargos FOR UPDATE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);

CREATE POLICY "cargos_delete_policy" ON cargos FOR DELETE
USING (
  empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  OR 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    AND cliente_empresa_id IS NOT NULL
  )
);
