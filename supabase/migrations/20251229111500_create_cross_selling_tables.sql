-- Criar tabela de colunas do CS/Cross-selling
CREATE TABLE IF NOT EXISTS public.cross_selling_colunas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  meta_valor NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de cards do CS/Cross-selling
CREATE TABLE IF NOT EXISTS public.cross_selling_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  coluna_id UUID NOT NULL REFERENCES public.cross_selling_colunas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(15,2) DEFAULT 0,
  responsavel_id UUID REFERENCES auth.users(id),
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  cliente_empresa TEXT,
  cliente_id UUID,
  tipo_servico TEXT,
  data_venda TEXT,
  data_implementacao TEXT,
  data_followup TEXT,
  status_satisfacao TEXT DEFAULT 'pendente',
  nota_nps INTEGER,
  ordem INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de atividades do CS/Cross-selling
CREATE TABLE IF NOT EXISTS public.cross_selling_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cross_selling_cards(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  tipo TEXT NOT NULL,
  descricao TEXT,
  prazo TEXT,
  horario TEXT,
  status TEXT NOT NULL DEFAULT 'a_realizar',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de etiquetas do CS/Cross-selling
CREATE TABLE IF NOT EXISTS public.cross_selling_etiquetas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento card-etiquetas
CREATE TABLE IF NOT EXISTS public.cross_selling_card_etiquetas (
  card_id UUID NOT NULL REFERENCES public.cross_selling_cards(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES public.cross_selling_etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, etiqueta_id)
);

-- Habilitar RLS
ALTER TABLE public.cross_selling_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_selling_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_selling_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_selling_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_selling_card_etiquetas ENABLE ROW LEVEL SECURITY;

-- Políticas para cross_selling_colunas
CREATE POLICY "Permitir leitura de colunas cross_selling" ON public.cross_selling_colunas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de colunas cross_selling" ON public.cross_selling_colunas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de colunas cross_selling" ON public.cross_selling_colunas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de colunas cross_selling" ON public.cross_selling_colunas FOR DELETE USING (true);

-- Políticas para cross_selling_cards
CREATE POLICY "Permitir leitura de cards cross_selling" ON public.cross_selling_cards FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de cards cross_selling" ON public.cross_selling_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de cards cross_selling" ON public.cross_selling_cards FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de cards cross_selling" ON public.cross_selling_cards FOR DELETE USING (true);

-- Políticas para cross_selling_atividades
CREATE POLICY "Permitir leitura de atividades cross_selling" ON public.cross_selling_atividades FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de atividades cross_selling" ON public.cross_selling_atividades FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de atividades cross_selling" ON public.cross_selling_atividades FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de atividades cross_selling" ON public.cross_selling_atividades FOR DELETE USING (true);

-- Políticas para cross_selling_etiquetas
CREATE POLICY "Permitir leitura de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de etiquetas cross_selling" ON public.cross_selling_etiquetas FOR DELETE USING (true);

-- Políticas para cross_selling_card_etiquetas
CREATE POLICY "Permitir leitura de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão de card_etiquetas cross_selling" ON public.cross_selling_card_etiquetas FOR DELETE USING (true);
