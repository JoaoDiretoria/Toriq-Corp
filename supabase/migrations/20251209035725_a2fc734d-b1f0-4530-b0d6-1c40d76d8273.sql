-- Criar tabela terceiros
CREATE TABLE public.terceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  nome_empresa_terceira TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  documentos_entregues TEXT DEFAULT '',
  status_conformidade TEXT NOT NULL DEFAULT 'pendente',
  data_validade_documentos DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.terceiros ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_vertical
CREATE POLICY "Admin vertical pode gerenciar todos os terceiros"
  ON public.terceiros FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_vertical'))
  WITH CHECK (has_role(auth.uid(), 'admin_vertical'));

-- Políticas para empresa_sst
CREATE POLICY "Empresa SST pode gerenciar terceiros da sua empresa"
  ON public.terceiros FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'empresa_sst') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'empresa_sst') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Políticas para cliente_final
CREATE POLICY "Cliente final pode ver terceiros da sua empresa"
  ON public.terceiros FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'cliente_final') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Cliente final pode cadastrar terceiros"
  ON public.terceiros FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'cliente_final') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Cliente final pode atualizar terceiros"
  ON public.terceiros FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'cliente_final') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Cliente final pode deletar terceiros"
  ON public.terceiros FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'cliente_final') 
    AND empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_terceiros_updated_at
  BEFORE UPDATE ON public.terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Registrar módulo
INSERT INTO public.modulos (nome, descricao, icone, rota)
VALUES ('Gestão de Terceiros', 'Gerenciamento de prestadores de serviço e terceiros', 'Users', '/modulos/terceiros');