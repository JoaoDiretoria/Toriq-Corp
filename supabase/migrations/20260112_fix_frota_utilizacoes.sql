-- Migration: Adicionar colunas para fluxo de saída/retorno em frota_utilizacoes
-- Data: 2026-01-12
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Remover constraint NOT NULL de km_fim para permitir saídas sem retorno
ALTER TABLE frota_utilizacoes ALTER COLUMN km_fim DROP NOT NULL;
ALTER TABLE frota_utilizacoes ALTER COLUMN km_fim SET DEFAULT 0;

-- Adicionar coluna 'codigo' para ID único visível
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);

-- Adicionar colunas para fluxo de saída/retorno
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS data_saida DATE;
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS hora_saida TIME;
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS previsao_retorno TIMESTAMPTZ;
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS data_retorno DATE;
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS hora_retorno TIME;
ALTER TABLE frota_utilizacoes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Em uso';

-- Migrar dados existentes: usar 'data' como data_saida
UPDATE frota_utilizacoes SET data_saida = data WHERE data_saida IS NULL AND data IS NOT NULL;
UPDATE frota_utilizacoes SET status = 'Concluído' WHERE km_fim > 0 AND status = 'Em uso';

-- Criar função para gerar código único de utilização
CREATE OR REPLACE FUNCTION generate_utilizacao_codigo()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN codigo ~ '^USO[0-9]{6}/[0-9]{4}$' 
      THEN CAST(SUBSTRING(codigo FROM 4 FOR 6) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1
  INTO next_num
  FROM frota_utilizacoes;
  
  NEW.codigo := 'USO' || LPAD(next_num::TEXT, 6, '0') || '/' || year_suffix;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar código automaticamente
DROP TRIGGER IF EXISTS trigger_generate_utilizacao_codigo ON frota_utilizacoes;
CREATE TRIGGER trigger_generate_utilizacao_codigo
  BEFORE INSERT ON frota_utilizacoes
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION generate_utilizacao_codigo();
