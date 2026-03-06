-- Criar tabela de contatos dos clientes
CREATE TABLE IF NOT EXISTS cliente_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes_sst(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(50),
  linkedin VARCHAR(500),
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca por cliente
CREATE INDEX IF NOT EXISTS idx_cliente_contatos_cliente_id ON cliente_contatos(cliente_id);

-- Criar índice para busca por contato principal
CREATE INDEX IF NOT EXISTS idx_cliente_contatos_principal ON cliente_contatos(cliente_id, principal) WHERE principal = true;

-- Habilitar RLS
ALTER TABLE cliente_contatos ENABLE ROW LEVEL SECURITY;

-- Política para empresa SST ver contatos dos seus clientes
CREATE POLICY "Empresa SST pode ver contatos dos seus clientes"
  ON cliente_contatos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clientes_sst cs
      WHERE cs.id = cliente_contatos.cliente_id
      AND cs.empresa_sst_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical'
    )
  );

-- Política para empresa SST inserir contatos
CREATE POLICY "Empresa SST pode inserir contatos dos seus clientes"
  ON cliente_contatos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clientes_sst cs
      WHERE cs.id = cliente_contatos.cliente_id
      AND cs.empresa_sst_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical'
    )
  );

-- Política para empresa SST atualizar contatos
CREATE POLICY "Empresa SST pode atualizar contatos dos seus clientes"
  ON cliente_contatos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clientes_sst cs
      WHERE cs.id = cliente_contatos.cliente_id
      AND cs.empresa_sst_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical'
    )
  );

-- Política para empresa SST deletar contatos
CREATE POLICY "Empresa SST pode deletar contatos dos seus clientes"
  ON cliente_contatos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clientes_sst cs
      WHERE cs.id = cliente_contatos.cliente_id
      AND cs.empresa_sst_id IN (
        SELECT empresa_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_vertical'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cliente_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cliente_contatos_updated_at
  BEFORE UPDATE ON cliente_contatos
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_contatos_updated_at();
