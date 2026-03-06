-- Criar enum para tipos de empresa
CREATE TYPE public.tipo_empresa AS ENUM ('vertical_on', 'sst', 'cliente_final');

-- Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin_vertical', 'empresa_sst', 'cliente_final');

-- Criar tabela de empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo tipo_empresa NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de módulos
CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'Package',
  rota TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento empresas_modulos
CREATE TABLE public.empresas_modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, modulo_id)
);

-- Criar tabela de profiles (usuários)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'cliente_final',
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Policies para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policies para empresas (usuários autenticados podem ver empresas)
CREATE POLICY "Usuários autenticados podem ver empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (true);

-- Policies para modulos (usuários autenticados podem ver módulos)
CREATE POLICY "Usuários autenticados podem ver módulos" 
ON public.modulos 
FOR SELECT 
TO authenticated
USING (true);

-- Policies para empresas_modulos
CREATE POLICY "Usuários podem ver módulos da sua empresa" 
ON public.empresas_modulos 
FOR SELECT 
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    'cliente_final'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO public.empresas (id, nome, tipo) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Vertical ON', 'vertical_on'),
  ('22222222-2222-2222-2222-222222222222', 'SST Solutions', 'sst'),
  ('33333333-3333-3333-3333-333333333333', 'Cliente ABC', 'cliente_final');

INSERT INTO public.modulos (id, nome, descricao, icone, rota) VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', 'Gestão de Documentos', 'Gerencie todos os documentos da sua empresa de forma organizada', 'FileText', '/modulos/documentos'),
  ('bbbb2222-2222-2222-2222-222222222222', 'Treinamentos', 'Controle de treinamentos e certificações dos colaboradores', 'GraduationCap', '/modulos/treinamentos'),
  ('cccc3333-3333-3333-3333-333333333333', 'Relatórios', 'Visualize relatórios e métricas da sua operação', 'BarChart3', '/modulos/relatorios'),
  ('dddd4444-4444-4444-4444-444444444444', 'Agenda', 'Calendário de eventos e compromissos importantes', 'Calendar', '/modulos/agenda'),
  ('eeee5555-5555-5555-5555-555555555555', 'Comunicados', 'Central de comunicados e avisos internos', 'Bell', '/modulos/comunicados');

INSERT INTO public.empresas_modulos (empresa_id, modulo_id) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', 'bbbb2222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', 'cccc3333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', 'dddd4444-4444-4444-4444-444444444444'),
  ('11111111-1111-1111-1111-111111111111', 'eeee5555-5555-5555-5555-555555555555'),
  ('22222222-2222-2222-2222-222222222222', 'aaaa1111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-222222222222'),
  ('22222222-2222-2222-2222-222222222222', 'cccc3333-3333-3333-3333-333333333333'),
  ('33333333-3333-3333-3333-333333333333', 'aaaa1111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'dddd4444-4444-4444-4444-444444444444');