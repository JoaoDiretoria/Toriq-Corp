-- Adicionar campo card_mostrar_prioridade à tabela funis_configuracoes
ALTER TABLE funis_configuracoes 
ADD COLUMN IF NOT EXISTS card_mostrar_prioridade BOOLEAN DEFAULT true;

-- Adicionar campo card_interno_mostrar_prioridade (se necessário)
ALTER TABLE funis_configuracoes 
ADD COLUMN IF NOT EXISTS card_interno_mostrar_prioridade BOOLEAN DEFAULT true;
