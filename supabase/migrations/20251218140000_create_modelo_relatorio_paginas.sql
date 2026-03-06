-- Criar tabela de páginas do modelo de relatório/certificado
CREATE TABLE IF NOT EXISTS public.modelo_relatorio_paginas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.modelo_relatorios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL DEFAULT 1,
  nome TEXT NOT NULL DEFAULT 'Página 1',
  conteudo TEXT NOT NULL DEFAULT '',
  moldura_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca por modelo
CREATE INDEX IF NOT EXISTS idx_modelo_relatorio_paginas_modelo_id ON public.modelo_relatorio_paginas(modelo_id);

-- Habilitar RLS
ALTER TABLE public.modelo_relatorio_paginas ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT - usuários autenticados podem ver páginas de modelos da sua empresa
CREATE POLICY "Usuários podem ver páginas de modelos da sua empresa"
ON public.modelo_relatorio_paginas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modelo_relatorios mr
    JOIN public.profiles p ON p.empresa_id = mr.empresa_id
    WHERE mr.id = modelo_relatorio_paginas.modelo_id
    AND p.id = auth.uid()
  )
);

-- Policy para INSERT - usuários autenticados podem inserir páginas em modelos da sua empresa
CREATE POLICY "Usuários podem inserir páginas em modelos da sua empresa"
ON public.modelo_relatorio_paginas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modelo_relatorios mr
    JOIN public.profiles p ON p.empresa_id = mr.empresa_id
    WHERE mr.id = modelo_relatorio_paginas.modelo_id
    AND p.id = auth.uid()
  )
);

-- Policy para UPDATE - usuários autenticados podem atualizar páginas de modelos da sua empresa
CREATE POLICY "Usuários podem atualizar páginas de modelos da sua empresa"
ON public.modelo_relatorio_paginas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modelo_relatorios mr
    JOIN public.profiles p ON p.empresa_id = mr.empresa_id
    WHERE mr.id = modelo_relatorio_paginas.modelo_id
    AND p.id = auth.uid()
  )
);

-- Policy para DELETE - usuários autenticados podem deletar páginas de modelos da sua empresa
CREATE POLICY "Usuários podem deletar páginas de modelos da sua empresa"
ON public.modelo_relatorio_paginas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modelo_relatorios mr
    JOIN public.profiles p ON p.empresa_id = mr.empresa_id
    WHERE mr.id = modelo_relatorio_paginas.modelo_id
    AND p.id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_modelo_relatorio_paginas_updated_at
  BEFORE UPDATE ON public.modelo_relatorio_paginas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
