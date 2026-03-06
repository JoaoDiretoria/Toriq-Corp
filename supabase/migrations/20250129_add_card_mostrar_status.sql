-- Adicionar coluna card_mostrar_status na tabela funis_configuracoes
ALTER TABLE funis_configuracoes 
ADD COLUMN IF NOT EXISTS card_mostrar_status BOOLEAN DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN funis_configuracoes.card_mostrar_status IS 'Exibir status do negócio (Perdido, Em andamento, Aceito, Ganho) na frente do card';
