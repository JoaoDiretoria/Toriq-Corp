-- Migration para corrigir valores de nota nas provas
-- A nota deve ser o número de acertos (cada questão vale 1 ponto)
-- Valores antigos estavam em porcentagem (ex: 90 para 9 acertos de 10)

-- Corrigir notas na tabela turma_provas
-- Se a nota for maior que 10, significa que está em porcentagem e precisa ser convertida
UPDATE turma_provas
SET nota = acertos
WHERE nota > 10 AND acertos IS NOT NULL;

-- Para casos onde acertos é null mas nota está em porcentagem
-- Converter de porcentagem para número de acertos
UPDATE turma_provas
SET nota = ROUND(nota / 10),
    acertos = ROUND(nota / 10)
WHERE nota > 10 AND acertos IS NULL AND total_questoes = 10;

-- Corrigir notas na tabela turma_colaboradores
-- Se a nota for maior que 10, converter para número de acertos
UPDATE turma_colaboradores
SET nota_pre_teste = ROUND(nota_pre_teste / 10)
WHERE nota_pre_teste > 10;

UPDATE turma_colaboradores
SET nota_pos_teste = ROUND(nota_pos_teste / 10)
WHERE nota_pos_teste > 10;

-- Atualizar resultado dos colaboradores baseado na nova nota
-- Nota >= 10: Aprovado direto
-- Nota 7-9: Aguardando reorientação (se não reorientado) ou Aprovado (se reorientado)
-- Nota < 7: Reprovado
UPDATE turma_colaboradores
SET resultado = CASE
    WHEN nota_pos_teste >= 10 THEN 'aprovado'
    WHEN nota_pos_teste >= 7 AND nota_pos_teste < 10 AND reorientado = true THEN 'aprovado'
    WHEN nota_pos_teste >= 7 AND nota_pos_teste < 10 AND (reorientado = false OR reorientado IS NULL) THEN 'aguardando'
    WHEN nota_pos_teste < 7 THEN 'reprovado'
    ELSE resultado
END
WHERE nota_pos_teste IS NOT NULL;

-- Adicionar coluna origem se não existir
ALTER TABLE turma_provas ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'qrcode';

-- Atualizar provas sem origem definida
UPDATE turma_provas SET origem = 'qrcode' WHERE origem IS NULL;
