-- Adicionar CNPJ à tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Criar tabela comercial_funil para gestão de leads
CREATE TABLE public.comercial_funil (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_lead TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    etapa TEXT NOT NULL DEFAULT 'lead' CHECK (etapa IN ('lead', 'contato', 'proposta', 'fechamento')),
    valor_estimado DECIMAL(12,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela financeiro_contas
CREATE TABLE public.financeiro_contas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
    descricao TEXT NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    vencimento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.comercial_funil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_contas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admin_vertical (acesso total)
CREATE POLICY "Admin vertical pode ver todas as empresas"
ON public.empresas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Admin vertical pode gerenciar empresas"
ON public.empresas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (public.has_role(auth.uid(), 'admin_vertical'));

-- Políticas para profiles (admin pode ver todos)
CREATE POLICY "Admin vertical pode ver todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Admin vertical pode atualizar perfis"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (public.has_role(auth.uid(), 'admin_vertical'));

-- Políticas para empresas_modulos (admin pode gerenciar)
CREATE POLICY "Admin vertical pode ver todos os módulos de empresas"
ON public.empresas_modulos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Admin vertical pode gerenciar módulos de empresas"
ON public.empresas_modulos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (public.has_role(auth.uid(), 'admin_vertical'));

-- Políticas para modulos (admin pode ver todos)
CREATE POLICY "Admin vertical pode ver todos os módulos"
ON public.modulos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

-- Políticas para comercial_funil
CREATE POLICY "Admin vertical pode ver todo o funil comercial"
ON public.comercial_funil FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Admin vertical pode gerenciar funil comercial"
ON public.comercial_funil FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (public.has_role(auth.uid(), 'admin_vertical'));

-- Políticas para financeiro_contas
CREATE POLICY "Admin vertical pode ver todas as contas"
ON public.financeiro_contas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'));

CREATE POLICY "Admin vertical pode gerenciar contas"
ON public.financeiro_contas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_vertical'))
WITH CHECK (public.has_role(auth.uid(), 'admin_vertical'));

-- Triggers para updated_at
CREATE TRIGGER update_comercial_funil_updated_at
BEFORE UPDATE ON public.comercial_funil
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financeiro_contas_updated_at
BEFORE UPDATE ON public.financeiro_contas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();