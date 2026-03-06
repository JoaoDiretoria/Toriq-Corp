-- Criar tabela para configurações White Label por empresa
CREATE TABLE IF NOT EXISTS public.white_label_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    
    -- Identidade
    title VARCHAR(255) DEFAULT 'Título do Sistema',
    subtitle VARCHAR(255) DEFAULT 'Subtítulo / tagline do cliente',
    subject VARCHAR(255) DEFAULT 'Assunto padrão',
    domain VARCHAR(255) DEFAULT 'https://cliente.seudominio.com',
    
    -- Tipografia e layout
    font_body VARCHAR(255) DEFAULT 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    font_heading VARCHAR(255) DEFAULT 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    base_font_size INTEGER DEFAULT 14,
    font_weight INTEGER DEFAULT 400,
    line_height DECIMAL(3,2) DEFAULT 1.45,
    density DECIMAL(3,2) DEFAULT 1,
    radius INTEGER DEFAULT 14,
    card_shadow DECIMAL(3,2) DEFAULT 0.18,
    
    -- Cores globais
    bg_color VARCHAR(20) DEFAULT '#f6f7fb',
    surface_color VARCHAR(20) DEFAULT '#ffffff',
    border_color VARCHAR(20) DEFAULT '#d5d7dc',
    text_color VARCHAR(20) DEFAULT '#101828',
    muted_color VARCHAR(20) DEFAULT '#5c6779',
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#7c3aed',
    link_color VARCHAR(20) DEFAULT '#2563eb',
    icon_color VARCHAR(20) DEFAULT '#101828',
    badge_bg VARCHAR(20) DEFAULT '#eef2ff',
    
    -- Estados
    success_color VARCHAR(20) DEFAULT '#16a34a',
    warning_color VARCHAR(20) DEFAULT '#f59e0b',
    error_color VARCHAR(20) DEFAULT '#ef4444',
    info_color VARCHAR(20) DEFAULT '#0ea5e9',
    
    -- Botões
    button_bg VARCHAR(20) DEFAULT '#2563eb',
    button_text VARCHAR(20) DEFAULT '#ffffff',
    button_hover VARCHAR(20) DEFAULT '#1d4ed8',
    button_disabled VARCHAR(20) DEFAULT '#aab4c4',
    
    -- Comunicação
    empty_tone VARCHAR(20) DEFAULT 'neutro',
    login_bg VARCHAR(20) DEFAULT '#0b1220',
    about_text TEXT DEFAULT 'Este sistema é uma solução white label configurável para o cliente.',
    email_footer TEXT DEFAULT '© Cliente • Todos os direitos reservados',
    
    -- Arquivos (URLs do Storage)
    logo_url TEXT,
    favicon_url TEXT,
    login_image_url TEXT,
    
    -- Kanban - Colunas
    col_header_bg VARCHAR(20) DEFAULT '#101828',
    col_header_text VARCHAR(20) DEFAULT '#ffffff',
    col_border VARCHAR(20) DEFAULT '#d5d7dc',
    col_shadow VARCHAR(20) DEFAULT '#000000',
    col_width INTEGER DEFAULT 320,
    col_auto_width BOOLEAN DEFAULT false,
    
    -- Kanban - Cards
    card_bg VARCHAR(20) DEFAULT '#ffffff',
    card_border VARCHAR(20) DEFAULT '#d5d7dc',
    card_stripe VARCHAR(20) DEFAULT '#2563eb',
    stripe_mode INTEGER DEFAULT 1,
    card_compact BOOLEAN DEFAULT false,
    blocked_color VARCHAR(20) DEFAULT '#ef4444',
    
    -- Kanban - Campos visíveis
    f_title BOOLEAN DEFAULT true,
    f_subtitle BOOLEAN DEFAULT true,
    f_id BOOLEAN DEFAULT true,
    f_tags BOOLEAN DEFAULT true,
    f_assignee BOOLEAN DEFAULT true,
    f_date BOOLEAN DEFAULT true,
    f_sla BOOLEAN DEFAULT true,
    f_priority BOOLEAN DEFAULT true,
    f_points BOOLEAN DEFAULT false,
    f_labels BOOLEAN DEFAULT true,
    
    -- Kanban - Labels
    label_required BOOLEAN DEFAULT false,
    label_limit INTEGER DEFAULT 3,
    label_palette TEXT DEFAULT 'Bug, Urgente, Cliente',
    
    -- Kanban - Avatares
    avatar_shape VARCHAR(20) DEFAULT '999px',
    avatar_size INTEGER DEFAULT 26,
    avatar_photo BOOLEAN DEFAULT true,
    
    -- Kanban - Ações rápidas
    a_move BOOLEAN DEFAULT true,
    a_done BOOLEAN DEFAULT true,
    a_comment BOOLEAN DEFAULT true,
    a_assign BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint única por empresa
    CONSTRAINT white_label_config_empresa_unique UNIQUE (empresa_id)
);

-- Índice para busca por empresa
CREATE INDEX IF NOT EXISTS idx_white_label_config_empresa_id ON public.white_label_config(empresa_id);

-- Habilitar RLS
ALTER TABLE public.white_label_config ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT
CREATE POLICY "Usuarios podem ver config da sua empresa" ON public.white_label_config
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Policy para INSERT
CREATE POLICY "Usuarios podem criar config da sua empresa" ON public.white_label_config
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Policy para UPDATE
CREATE POLICY "Usuarios podem atualizar config da sua empresa" ON public.white_label_config
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Policy para DELETE
CREATE POLICY "Usuarios podem deletar config da sua empresa" ON public.white_label_config
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_vertical')
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_white_label_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_white_label_config_updated_at ON public.white_label_config;
CREATE TRIGGER trigger_white_label_config_updated_at
    BEFORE UPDATE ON public.white_label_config
    FOR EACH ROW
    EXECUTE FUNCTION update_white_label_config_updated_at();
