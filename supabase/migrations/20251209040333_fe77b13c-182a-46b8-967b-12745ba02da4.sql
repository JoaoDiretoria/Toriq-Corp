-- Ativar módulo Gestão de Terceiros para Cliente ABC
INSERT INTO public.empresas_modulos (empresa_id, modulo_id, ativo)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '2353de90-96c9-41f7-aaa8-8c39ce0e6329', true),
  ('22222222-2222-2222-2222-222222222222', '2353de90-96c9-41f7-aaa8-8c39ce0e6329', true)
ON CONFLICT DO NOTHING;