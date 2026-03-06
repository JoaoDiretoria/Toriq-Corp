-- Adicionar coluna placa se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'instrutor_solicitacoes' 
                   AND column_name = 'placa') THEN
        ALTER TABLE public.instrutor_solicitacoes ADD COLUMN placa VARCHAR(10);
    END IF;
END $$;
