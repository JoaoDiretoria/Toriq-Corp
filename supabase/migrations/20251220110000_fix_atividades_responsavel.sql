-- Remover a constraint de foreign key existente do responsavel_id
ALTER TABLE prospeccao_atividades 
DROP CONSTRAINT IF EXISTS prospeccao_atividades_responsavel_id_fkey;

-- Adicionar nova constraint referenciando colaboradores
ALTER TABLE prospeccao_atividades 
ADD CONSTRAINT prospeccao_atividades_responsavel_id_fkey 
FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL;
