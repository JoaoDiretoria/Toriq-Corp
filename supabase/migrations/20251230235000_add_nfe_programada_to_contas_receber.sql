-- Adicionar colunas para programação de emissão de NFe na tabela contas_receber
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS nfe_data_programada DATE,
ADD COLUMN IF NOT EXISTS nfe_hora_programada TIME;

-- Comentários para documentação
COMMENT ON COLUMN contas_receber.nfe_data_programada IS 'Data programada para emissão automática da NFe';
COMMENT ON COLUMN contas_receber.nfe_hora_programada IS 'Hora programada para emissão automática da NFe';
