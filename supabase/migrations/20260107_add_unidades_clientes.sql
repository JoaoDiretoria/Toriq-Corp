-- Migration: Criar tabela de unidades dos clientes
-- Data: 2026-01-07

-- Criar tabela unidades_clientes
CREATE TABLE IF NOT EXISTS public.unidades_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes_sst(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES public.grupos_clientes(id) ON DELETE SET NULL,
  
  -- Dados de identificação
  tipo_inscricao VARCHAR(1) DEFAULT '1', -- 1-CNPJ, 2-CPF, 3-CAEPF, 4-CNO, 5-CGC, 6-CEI
  numero_inscricao VARCHAR(20),
  nome_referencia VARCHAR(255),
  razao_social VARCHAR(255) NOT NULL,
  
  -- CNAE
  cnae VARCHAR(10),
  cnae_atividade TEXT,
  grau_risco VARCHAR(1),
  
  -- Endereço
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  
  -- Dados adicionais
  codigo_interno VARCHAR(50),
  tipo_local VARCHAR(1), -- 1-Estabelecimento no Brasil, 2-Exterior, 3-Terceiros, 4-Via pública, 5-Área rural, 6-Embarcação, 9-Outros
  email VARCHAR(255),
  
  -- Responsáveis
  medico_pcmso_id UUID REFERENCES public.profissionais_saude(id) ON DELETE SET NULL,
  tecnico_responsavel_id UUID REFERENCES public.profissionais_seguranca(id) ON DELETE SET NULL,
  
  -- Faturamento e Status
  faturamento VARCHAR(20) DEFAULT 'faturar', -- faturar, nao_faturar
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de grupos de clientes (se não existir)
CREATE TABLE IF NOT EXISTS public.grupos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unidades_clientes_empresa_id ON public.unidades_clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_unidades_clientes_cliente_id ON public.unidades_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_unidades_clientes_grupo_id ON public.unidades_clientes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_unidades_clientes_status ON public.unidades_clientes(status);
CREATE INDEX IF NOT EXISTS idx_grupos_clientes_empresa_id ON public.grupos_clientes(empresa_id);

-- Habilitar RLS
ALTER TABLE public.unidades_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para unidades_clientes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades_clientes' AND policyname = 'unidades_clientes_select_policy') THEN
    CREATE POLICY unidades_clientes_select_policy ON public.unidades_clientes
      FOR SELECT USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades_clientes' AND policyname = 'unidades_clientes_insert_policy') THEN
    CREATE POLICY unidades_clientes_insert_policy ON public.unidades_clientes
      FOR INSERT WITH CHECK (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades_clientes' AND policyname = 'unidades_clientes_update_policy') THEN
    CREATE POLICY unidades_clientes_update_policy ON public.unidades_clientes
      FOR UPDATE USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'unidades_clientes' AND policyname = 'unidades_clientes_delete_policy') THEN
    CREATE POLICY unidades_clientes_delete_policy ON public.unidades_clientes
      FOR DELETE USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Políticas RLS para grupos_clientes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos_clientes' AND policyname = 'grupos_clientes_select_policy') THEN
    CREATE POLICY grupos_clientes_select_policy ON public.grupos_clientes
      FOR SELECT USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos_clientes' AND policyname = 'grupos_clientes_insert_policy') THEN
    CREATE POLICY grupos_clientes_insert_policy ON public.grupos_clientes
      FOR INSERT WITH CHECK (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos_clientes' AND policyname = 'grupos_clientes_update_policy') THEN
    CREATE POLICY grupos_clientes_update_policy ON public.grupos_clientes
      FOR UPDATE USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grupos_clientes' AND policyname = 'grupos_clientes_delete_policy') THEN
    CREATE POLICY grupos_clientes_delete_policy ON public.grupos_clientes
      FOR DELETE USING (
        empresa_id IN (
          SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_unidades_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unidades_clientes_updated_at ON public.unidades_clientes;
CREATE TRIGGER trigger_update_unidades_clientes_updated_at
  BEFORE UPDATE ON public.unidades_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_unidades_clientes_updated_at();

DROP TRIGGER IF EXISTS trigger_update_grupos_clientes_updated_at ON public.grupos_clientes;
CREATE TRIGGER trigger_update_grupos_clientes_updated_at
  BEFORE UPDATE ON public.grupos_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_unidades_clientes_updated_at();

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
