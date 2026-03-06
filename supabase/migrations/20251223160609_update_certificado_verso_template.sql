-- Atualizar o verso dos modelos de certificado existentes para incluir as novas variáveis
-- {COLABORADOR_ASSINATURA}, {EMPRESA_SST_NOME}, {EMPRESA_SST_CNPJ}

-- Atualizar páginas de verso que usam o template antigo
UPDATE modelo_relatorio_paginas
SET conteudo = '<div style="box-sizing: border-box; width: 100%; height: 100%; padding: 60px 80px; font-family: Arial, Helvetica, sans-serif; position: relative;">
  <div style="position: absolute; top: 50px; right: 80px; z-index: 2;">
    <div style="max-width: 140px;">{LOGO_EMPRESA}</div>
  </div>
  <div style="position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column;">
    <div style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
      <div style="font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #222; text-transform: uppercase;">Conteúdo Programático</div>
    </div>
    <div style="flex: 1; padding: 20px; overflow: hidden;">
      <div style="font-size: 13px; color: #333; line-height: 1.7;">{TREINAMENTO_CP}</div>
    </div>
    <div style="margin-top: 20px; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
      <div style="min-width: 45%; text-align: center;">
        <div style="min-height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px;">{COLABORADOR_ASSINATURA}</div>
        <div style="width: 220px; border-bottom: 1px solid #333; margin: 0 auto 8px auto;"></div>
        <div style="font-size: 13px; font-weight: 700; color: #222; margin: 0;">{COLABORADOR_NOME}</div>
        <div style="font-size: 11px; color: #555; margin-top: 3px;">CPF: {COLABORADOR_CPF}</div>
      </div>
      <div style="text-align: right; max-width: 280px;">
        <div style="font-size: 12px; color: #333; margin: 0; font-weight: 600;">Validade: {TREINAMENTO_VALIDADE}</div>
        <div style="font-size: 12px; color: #333; margin-top: 8px; font-weight: 600;">{EMPRESA_SST_NOME}</div>
        <div style="font-size: 10px; color: #555; margin-top: 2px;">CNPJ: {EMPRESA_SST_CNPJ}</div>
        <div style="font-size: 10px; color: #555; margin-top: 4px; line-height: 1.4;">{EMPRESA_SST_ENDERECO}</div>
      </div>
    </div>
  </div>
</div>'
WHERE numero = 2 
  AND (nome ILIKE '%verso%' OR nome ILIKE '%back%')
  AND conteudo LIKE '%{EMPRESA_SST_ENDERECO}%'
  AND conteudo NOT LIKE '%{EMPRESA_SST_NOME}%';
