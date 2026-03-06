-- Tornar cliente_id opcional na tabela grupos_homogeneos
ALTER TABLE grupos_homogeneos ALTER COLUMN cliente_id DROP NOT NULL;
