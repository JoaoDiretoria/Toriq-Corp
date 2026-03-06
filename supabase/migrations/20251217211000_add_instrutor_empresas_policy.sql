-- Policy para instrutor ver empresas dos clientes das suas turmas
-- Isso permite que o instrutor veja cidade/estado do cliente

CREATE POLICY "Instrutor pode ver empresas dos clientes das suas turmas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT cs.cliente_empresa_id 
    FROM public.clientes_sst cs
    JOIN public.turmas_treinamento t ON cs.id = t.cliente_id
    JOIN public.instrutores i ON t.instrutor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);
