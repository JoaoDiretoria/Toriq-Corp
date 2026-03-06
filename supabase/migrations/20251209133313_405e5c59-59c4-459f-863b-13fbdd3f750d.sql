-- Adicionar coluna para indicar se cliente final possui gestão de treinamentos
ALTER TABLE empresas 
ADD COLUMN possui_gestao_treinamentos boolean DEFAULT false;

COMMENT ON COLUMN empresas.possui_gestao_treinamentos IS 
'Indica se a empresa cliente final possui módulo de gestão de treinamentos. Aplicável apenas para tipo cliente_final.';