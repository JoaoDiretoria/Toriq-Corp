-- Adicionar módulos Toriq Corp e Toriq Train à tabela de módulos
-- Estes módulos são referenciados no código com os nomes exatos abaixo

-- Deletar módulos antigos se existirem (para evitar duplicatas)
DELETE FROM public.modulos WHERE nome IN ('Toriq Corp', 'Gestão de Treinamentos');

-- Inserir os módulos com os nomes corretos que o código espera
INSERT INTO public.modulos (nome, descricao, icone, rota) 
VALUES 
  ('Toriq Corp', 'Gestão empresarial com funil comercial, financeiro e administrativo', 'Briefcase', '/sst'),
  ('Gestão de Treinamentos', 'Gestão completa de treinamentos, turmas, provas e certificados', 'GraduationCap', '/sst');
