-- Inserir módulo Gestão de EPI se não existir
INSERT INTO modulos (nome, icone, rota)
SELECT 'Gestão de EPI', 'Shield', '/sst/epi'
WHERE NOT EXISTS (
  SELECT 1 FROM modulos WHERE nome = 'Gestão de EPI'
);
