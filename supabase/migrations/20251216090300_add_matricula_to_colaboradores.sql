-- Adicionar campo matricula na tabela colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS matricula VARCHAR(50);

-- Criar índice para busca por matrícula
CREATE INDEX IF NOT EXISTS idx_colaboradores_matricula ON colaboradores(matricula);

-- Comentário para documentação
COMMENT ON COLUMN colaboradores.matricula IS 'Número de matrícula do colaborador na empresa';
