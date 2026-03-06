-- Migration: Sistema de Notificação de Atualizações
-- Data: 22/01/2026
-- Descrição: Cria tabelas para gerenciar notificações de atualizações do sistema

-- Tabela para armazenar atualizações do sistema (changelog)
CREATE TABLE IF NOT EXISTS system_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    changelog JSONB DEFAULT '[]'::jsonb,
    release_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastrear quais usuários já viram cada atualização
CREATE TABLE IF NOT EXISTS user_update_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    update_id UUID NOT NULL REFERENCES system_updates(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, update_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_updates_release_date ON system_updates(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_system_updates_is_active ON system_updates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_update_views_user_id ON user_update_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_update_views_update_id ON user_update_views(update_id);

-- RLS
ALTER TABLE system_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_update_views ENABLE ROW LEVEL SECURITY;

-- Políticas para system_updates (todos podem ler, apenas admin pode modificar)
DO $$ BEGIN
    CREATE POLICY "system_updates_select_all" ON system_updates
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "system_updates_insert_admin" ON system_updates
        FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "system_updates_update_admin" ON system_updates
        FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para user_update_views (usuário só vê/modifica seus próprios registros)
DO $$ BEGIN
    CREATE POLICY "user_update_views_select_own" ON user_update_views
        FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "user_update_views_insert_own" ON user_update_views
        FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Comentários nas tabelas
COMMENT ON TABLE system_updates IS 'Armazena changelog e notas de atualização do sistema';
COMMENT ON TABLE user_update_views IS 'Rastreia quais usuários já visualizaram cada atualização';
COMMENT ON COLUMN system_updates.changelog IS 'Array JSON com lista de mudanças: [{type: "feature"|"fix"|"improvement"|"breaking", description: "..."}]';

-- Função para registrar automaticamente uma nova versão (se não existir)
-- Usa SECURITY DEFINER para contornar RLS
CREATE OR REPLACE FUNCTION register_app_update(
    p_version VARCHAR(50),
    p_title VARCHAR(255),
    p_description TEXT,
    p_changelog JSONB,
    p_release_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_update_id UUID;
BEGIN
    -- Verifica se a versão já existe
    SELECT id INTO v_update_id
    FROM system_updates
    WHERE version = p_version;
    
    -- Se não existe, cria
    IF v_update_id IS NULL THEN
        INSERT INTO system_updates (version, title, description, changelog, release_date, is_active)
        VALUES (p_version, p_title, p_description, p_changelog, p_release_date, true)
        RETURNING id INTO v_update_id;
        
        -- Desativa versões anteriores
        UPDATE system_updates
        SET is_active = false
        WHERE id != v_update_id;
    END IF;
    
    RETURN v_update_id;
END;
$$;

-- Permite que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION register_app_update TO authenticated;

-- ROLLBACK (se necessário):
-- DROP FUNCTION IF EXISTS register_app_update;
-- DROP TABLE IF EXISTS user_update_views;
-- DROP TABLE IF EXISTS system_updates;
