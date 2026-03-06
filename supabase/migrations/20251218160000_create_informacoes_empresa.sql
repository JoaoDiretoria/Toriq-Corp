-- =====================================================
-- SCRIPT PARA CRIAR/ATUALIZAR TABELA informacoes_empresa
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.informacoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  missao TEXT,
  visao TEXT,
  valores TEXT,
  diretor_tecnico_nome VARCHAR(255),
  diretor_tecnico_formacao VARCHAR(255),
  diretor_tecnico_assinatura_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id)
);

-- 2. Adicionar colunas novas se não existirem
DO $$ 
BEGIN
  -- Adicionar diretor_tecnico_registro_tipo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'informacoes_empresa' 
    AND column_name = 'diretor_tecnico_registro_tipo') THEN
    ALTER TABLE public.informacoes_empresa ADD COLUMN diretor_tecnico_registro_tipo VARCHAR(50);
  END IF;
  
  -- Adicionar diretor_tecnico_registro_numero
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'informacoes_empresa' 
    AND column_name = 'diretor_tecnico_registro_numero') THEN
    ALTER TABLE public.informacoes_empresa ADD COLUMN diretor_tecnico_registro_numero VARCHAR(50);
  END IF;
  
  -- Adicionar diretor_tecnico_registro_estado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'informacoes_empresa' 
    AND column_name = 'diretor_tecnico_registro_estado') THEN
    ALTER TABLE public.informacoes_empresa ADD COLUMN diretor_tecnico_registro_estado VARCHAR(2);
  END IF;
  
  -- Adicionar diretor_tecnico_assinatura_tipo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'informacoes_empresa' 
    AND column_name = 'diretor_tecnico_assinatura_tipo') THEN
    ALTER TABLE public.informacoes_empresa ADD COLUMN diretor_tecnico_assinatura_tipo VARCHAR(20) DEFAULT 'upload';
  END IF;
END $$;

-- 3. Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_informacoes_empresa_empresa_id ON public.informacoes_empresa(empresa_id);

-- 4. Habilitar RLS
ALTER TABLE public.informacoes_empresa ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes e recriar
DROP POLICY IF EXISTS "Usuarios podem ver informacoes da sua empresa" ON public.informacoes_empresa;
DROP POLICY IF EXISTS "Usuarios podem inserir informacoes da sua empresa" ON public.informacoes_empresa;
DROP POLICY IF EXISTS "Usuarios podem atualizar informacoes da sua empresa" ON public.informacoes_empresa;
DROP POLICY IF EXISTS "Usuarios podem deletar informacoes da sua empresa" ON public.informacoes_empresa;

CREATE POLICY "Usuarios podem ver informacoes da sua empresa"
  ON public.informacoes_empresa FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem inserir informacoes da sua empresa"
  ON public.informacoes_empresa FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem atualizar informacoes da sua empresa"
  ON public.informacoes_empresa FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios podem deletar informacoes da sua empresa"
  ON public.informacoes_empresa FOR DELETE
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_informacoes_empresa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_informacoes_empresa_updated_at ON public.informacoes_empresa;
CREATE TRIGGER trigger_update_informacoes_empresa_updated_at
  BEFORE UPDATE ON public.informacoes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_informacoes_empresa_updated_at();

-- 7. Criar bucket de storage para documentos (execute separadamente se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true)
-- ON CONFLICT (id) DO NOTHING;
