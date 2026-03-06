-- Migration: Corrigir constraints de exclusão para funis e funil_etapas
-- Data: 2026-01-08
-- Descrição: Adiciona ON DELETE CASCADE/SET NULL nas foreign keys e RLS policies para DELETE

-- 1. Corrigir a constraint etapa_origem_id na tabela funil_card_movimentacoes
ALTER TABLE funil_card_movimentacoes 
DROP CONSTRAINT IF EXISTS funil_card_movimentacoes_etapa_origem_id_fkey;

ALTER TABLE funil_card_movimentacoes 
ADD CONSTRAINT funil_card_movimentacoes_etapa_origem_id_fkey 
FOREIGN KEY (etapa_origem_id) REFERENCES funil_etapas(id) ON DELETE SET NULL;

-- 2. Corrigir a constraint etapa_destino_id na tabela funil_card_movimentacoes
ALTER TABLE funil_card_movimentacoes 
DROP CONSTRAINT IF EXISTS funil_card_movimentacoes_etapa_destino_id_fkey;

ALTER TABLE funil_card_movimentacoes 
ADD CONSTRAINT funil_card_movimentacoes_etapa_destino_id_fkey 
FOREIGN KEY (etapa_destino_id) REFERENCES funil_etapas(id) ON DELETE SET NULL;

-- 3. Garantir que funil_cards tem ON DELETE CASCADE para funil_id
ALTER TABLE funil_cards 
DROP CONSTRAINT IF EXISTS funil_cards_funil_id_fkey;

ALTER TABLE funil_cards 
ADD CONSTRAINT funil_cards_funil_id_fkey 
FOREIGN KEY (funil_id) REFERENCES funis(id) ON DELETE CASCADE;

-- 4. Garantir que funil_cards tem ON DELETE SET NULL para etapa_id
ALTER TABLE funil_cards 
DROP CONSTRAINT IF EXISTS funil_cards_etapa_id_fkey;

ALTER TABLE funil_cards 
ADD CONSTRAINT funil_cards_etapa_id_fkey 
FOREIGN KEY (etapa_id) REFERENCES funil_etapas(id) ON DELETE SET NULL;

-- 5. Garantir que funil_etapas tem ON DELETE CASCADE para funil_id
ALTER TABLE funil_etapas 
DROP CONSTRAINT IF EXISTS funil_etapas_funil_id_fkey;

ALTER TABLE funil_etapas 
ADD CONSTRAINT funil_etapas_funil_id_fkey 
FOREIGN KEY (funil_id) REFERENCES funis(id) ON DELETE CASCADE;

-- 6. Adicionar RLS policy para DELETE na tabela funis (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'funis' 
    AND policyname = 'Usuarios podem excluir funis da sua empresa'
  ) THEN
    CREATE POLICY "Usuarios podem excluir funis da sua empresa"
      ON funis FOR DELETE
      USING (empresa_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- 7. Adicionar RLS policy para DELETE na tabela funil_etapas (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'funil_etapas' 
    AND policyname = 'Usuarios podem excluir etapas de funis da sua empresa'
  ) THEN
    CREATE POLICY "Usuarios podem excluir etapas de funis da sua empresa"
      ON funil_etapas FOR DELETE
      USING (
        funil_id IN (
          SELECT id FROM funis WHERE empresa_id IN (
            SELECT empresa_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- 8. Garantir que admin_vertical pode excluir funis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'funis' 
    AND policyname = 'Admin pode excluir funis'
  ) THEN
    CREATE POLICY "Admin pode excluir funis"
      ON funis FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
      );
  END IF;
END $$;

-- 9. Garantir que admin_vertical pode excluir etapas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'funil_etapas' 
    AND policyname = 'Admin pode excluir etapas'
  ) THEN
    CREATE POLICY "Admin pode excluir etapas"
      ON funil_etapas FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
      );
  END IF;
END $$;
