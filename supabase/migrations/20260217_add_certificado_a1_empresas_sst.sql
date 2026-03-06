-- Migration: Adicionar campos para certificado A1 ICP-Brasil nas empresas SST
-- Data: 2026-02-17
-- Descricao: Permite que cada empresa SST configure seu certificado digital A1 (.pfx)
--            para assinatura de documentos conforme Portaria 211/2019

-- Adicionar campos na tabela empresas
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS certificado_a1_base64 TEXT,
ADD COLUMN IF NOT EXISTS certificado_a1_senha TEXT,
ADD COLUMN IF NOT EXISTS certificado_a1_cn TEXT,
ADD COLUMN IF NOT EXISTS certificado_a1_emissor TEXT,
ADD COLUMN IF NOT EXISTS certificado_a1_validade TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS certificado_a1_serial TEXT,
ADD COLUMN IF NOT EXISTS certificado_a1_atualizado_em TIMESTAMPTZ;

-- Comentarios nos campos
COMMENT ON COLUMN empresas.certificado_a1_base64 IS 'Arquivo .pfx do certificado A1 em base64 (criptografado)';
COMMENT ON COLUMN empresas.certificado_a1_senha IS 'Senha do certificado A1 (criptografada)';
COMMENT ON COLUMN empresas.certificado_a1_cn IS 'Common Name (CN) extraido do certificado';
COMMENT ON COLUMN empresas.certificado_a1_emissor IS 'Autoridade Certificadora que emitiu';
COMMENT ON COLUMN empresas.certificado_a1_validade IS 'Data de expiracao do certificado';
COMMENT ON COLUMN empresas.certificado_a1_serial IS 'Numero serial do certificado';
COMMENT ON COLUMN empresas.certificado_a1_atualizado_em IS 'Data da ultima atualizacao do certificado';

-- Indice para busca rapida por empresas com certificado configurado
CREATE INDEX IF NOT EXISTS idx_empresas_certificado_validade 
ON empresas (certificado_a1_validade) 
WHERE certificado_a1_base64 IS NOT NULL;

-- RLS: Apenas a propria empresa pode ver/editar seu certificado
-- (as politicas existentes de empresas ja devem cobrir isso)

-- Funcao para verificar certificados proximos de expirar (para notificacoes)
CREATE OR REPLACE FUNCTION get_certificados_expirando(dias_antecedencia INTEGER DEFAULT 30)
RETURNS TABLE (
  empresa_id UUID,
  empresa_nome TEXT,
  certificado_cn TEXT,
  validade TIMESTAMPTZ,
  dias_restantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS empresa_id,
    e.nome AS empresa_nome,
    e.certificado_a1_cn AS certificado_cn,
    e.certificado_a1_validade AS validade,
    EXTRACT(DAY FROM (e.certificado_a1_validade - NOW()))::INTEGER AS dias_restantes
  FROM empresas e
  WHERE e.certificado_a1_validade IS NOT NULL
    AND e.certificado_a1_validade <= NOW() + (dias_antecedencia || ' days')::INTERVAL
    AND e.certificado_a1_validade > NOW()
  ORDER BY e.certificado_a1_validade ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissao para a funcao
GRANT EXECUTE ON FUNCTION get_certificados_expirando(INTEGER) TO authenticated;
