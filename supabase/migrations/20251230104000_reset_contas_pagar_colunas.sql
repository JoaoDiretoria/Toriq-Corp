-- Resetar colunas de contas a pagar para as novas colunas padrão
-- Primeiro, deletar as colunas antigas
DELETE FROM public.contas_pagar_colunas WHERE empresa_id = '11111111-1111-1111-1111-111111111111';

-- Inserir as novas colunas padrão
INSERT INTO public.contas_pagar_colunas (empresa_id, nome, cor, ordem) VALUES
('11111111-1111-1111-1111-111111111111', 'Nova Conta a Pagar', '#6366f1', 0),
('11111111-1111-1111-1111-111111111111', 'A Vencer', '#3b82f6', 1),
('11111111-1111-1111-1111-111111111111', 'Vence Próxima Semana', '#eab308', 2),
('11111111-1111-1111-1111-111111111111', 'Vence Amanhã', '#f97316', 3),
('11111111-1111-1111-1111-111111111111', 'Vence Hoje', '#ef4444', 4),
('11111111-1111-1111-1111-111111111111', 'Vencidos', '#dc2626', 5),
('11111111-1111-1111-1111-111111111111', 'Pagos', '#22c55e', 6);

-- Atualizar os cards existentes para a primeira coluna (Nova Conta a Pagar)
-- para que sejam reclassificados automaticamente pelo sistema
UPDATE public.contas_pagar 
SET coluna_id = (
  SELECT id FROM public.contas_pagar_colunas 
  WHERE empresa_id = '11111111-1111-1111-1111-111111111111' 
  AND nome = 'Nova Conta a Pagar' 
  LIMIT 1
)
WHERE empresa_id = '11111111-1111-1111-1111-111111111111';
