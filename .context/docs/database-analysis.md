# Análise Completa do Banco de Dados - Sistema TORIQ

## Visão Geral

O sistema TORIQ é uma plataforma multi-tenant robusta construída sobre Supabase (PostgreSQL) que oferece soluções integradas para:

- **Gestão de SST (Segurança e Saúde do Trabalho)**
- **Gestão de Treinamentos**
- **CRM/Funil Comercial (Toriq Corp)**
- **Gestão Financeira**
- **Gestão de Frota**
- **Gestão de EPIs**
- **Sistema White Label**

## Arquitetura do Banco

### Estrutura Multi-Tenant
O sistema utiliza uma arquitetura multi-tenant baseada em `empresa_id`, onde cada empresa tem seus próprios dados isolados através de Row Level Security (RLS).

### Tabelas Principais

#### 1. **Empresas e Usuários**
- `empresas` - Empresas principais do sistema
- `profiles` - Perfis de usuários vinculados ao auth.users do Supabase
- `empresas_parceiras` - Empresas parceiras/terceirizadas
- `clientes_sst` - Clientes das empresas SST

#### 2. **Sistema de Módulos**
- `modulos` - Módulos disponíveis no sistema
- `empresa_modulos` - Módulos ativos por empresa
- `toriq_modules` - Módulos específicos do Toriq (Corp/Train)

#### 3. **Gestão de Treinamentos**
- `catalogo_treinamentos` - Catálogo de treinamentos disponíveis
- `turmas_treinamento` - Turmas/agendamentos de treinamentos
- `turmas_treinamento_aulas` - Aulas individuais das turmas
- `colaboradores_treinamentos` - Vinculação colaborador-treinamento
- `solicitacoes_treinamento` - Solicitações de treinamentos
- `provas_treinamento` - Sistema de provas e avaliações
- `avaliacao_reacao` - Avaliações de reação dos treinamentos
- `certificados_colaboradores` - Certificados emitidos

#### 4. **Gestão de Pessoas**
- `colaboradores` - Colaboradores das empresas clientes
- `colaboradores_temporarios` - Colaboradores temporários
- `instrutores` - Instrutores de treinamentos
- `setores` - Setores das empresas
- `cargos` - Cargos disponíveis
- `grupos_homogeneos` - Grupos homogêneos de exposição

#### 5. **CRM/Funil Comercial (Toriq Corp)**
- `funis` - Configuração de funis de vendas
- `funil_etapas` - Etapas dos funis
- `funil_cards` - Cards/oportunidades nos funis
- `prospeccao` - Prospecção de clientes
- `closer` - Gestão de closers/vendedores
- `pos_venda` - Pós-venda
- `cross_selling` - Cross-selling

#### 6. **Gestão Financeira**
- `contas_receber` - Contas a receber
- `contas_receber_colunas` - Colunas do kanban financeiro
- `contas_pagar` - Contas a pagar
- `fornecedores` - Cadastro de fornecedores
- `contas_bancarias` - Contas bancárias
- `plano_receitas` - Plano de contas (receitas)
- `plano_despesas` - Plano de contas (despesas)
- `condicoes_pagamento` - Condições de pagamento

#### 7. **Gestão de Frota**
- `frota_veiculos` - Cadastro de veículos
- `frota_utilizacoes` - Registros de utilização
- `frota_manutencoes` - Manutenções
- `frota_checklists` - Checklists de inspeção
- `frota_custos` - Custos da frota
- `frota_documentos` - Documentos dos veículos
- `frota_ocorrencias` - Ocorrências/incidentes

#### 8. **Gestão de EPIs**
- `cadastro_epis` - Cadastro de EPIs
- `estoque_epis` - Controle de estoque
- `entregas_epis` - Entregas aos colaboradores
- `equipamentos_sst` - Equipamentos de SST

#### 9. **Sistema White Label**
- `white_label_config` - Configurações de personalização por empresa

#### 10. **Sistema de Contratos**
- `contratos` - Contratos gerados
- `contrato_clausulas` - Cláusulas dos contratos
- `contrato_modulos` - Módulos inclusos nos contratos
- `modelos_contrato` - Modelos de contrato

#### 11. **Sistema de Auditoria e Notificações**
- `audit_log` - Log de auditoria universal
- `notificacoes` - Sistema de notificações
- `tickets_suporte` - Tickets de suporte

## Características Técnicas

### Row Level Security (RLS)
Todas as tabelas implementam RLS para garantir isolamento entre empresas:
```sql
-- Exemplo padrão de policy
CREATE POLICY "Usuarios podem ver dados da sua empresa" 
ON tabela FOR SELECT 
USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));
```

### Triggers e Funções
- **updated_at**: Todas as tabelas principais têm trigger para atualizar `updated_at`
- **Auditoria**: Triggers automáticos para log de mudanças
- **Notificações**: Triggers para envio de notificações automáticas

### Índices de Performance
Índices estratégicos em:
- `empresa_id` (todas as tabelas)
- Chaves estrangeiras
- Campos de data frequentemente consultados
- Campos de status e filtros

### Storage Buckets
- `instrutor-documentos` - Documentos dos instrutores
- `certificados-colaboradores` - Certificados em PDF
- `prospeccao-anexos` - Anexos da prospecção
- `fotos` - Fotos de colaboradores

## Integrações e APIs

### Supabase Edge Functions
- `admin-create-user` - Criação de usuários
- `admin-delete-user` - Exclusão de usuários
- `admin-update-user` - Atualização de usuários
- `cnpj-lookup` - Consulta de CNPJ
- `gerar-contas-recorrentes` - Geração automática de contas

### APIs Externas
- **IBGE**: Consulta de estados e cidades
- **Google Maps**: Cálculo de distâncias
- **CBO**: Classificação Brasileira de Ocupações
- **Receita Federal**: Consulta de CNPJ

## Fluxos de Dados Principais

### 1. Fluxo de Treinamentos
```
Solicitação → Agendamento (Turma) → Execução (Aulas) → Avaliação (Provas) → Certificação
```

### 2. Fluxo Comercial
```
Prospecção → Funil → Closer → Contrato → Pós-venda → Financeiro
```

### 3. Fluxo de EPIs
```
Cadastro EPI → Estoque → Entrega → Controle → Renovação
```

### 4. Fluxo Financeiro
```
Oportunidade → Contrato → Conta a Receber → Cobrança → Recebimento
```

## Segurança e Compliance

### Controle de Acesso
- **Roles**: admin_vertical, sst, cliente, instrutor, parceira
- **Hierarquia**: Sistema de hierarquia com gestores
- **Permissões**: Controle granular por setor/função

### Auditoria
- Log completo de todas as operações
- Rastreabilidade de mudanças
- Backup automático de dados críticos

### LGPD/Privacidade
- Anonimização de dados sensíveis
- Controle de retenção de dados
- Logs de acesso e modificação

## Performance e Escalabilidade

### Otimizações Implementadas
- Índices compostos para queries complexas
- Particionamento por empresa_id
- Cache de queries frequentes
- Compressão de dados históricos

### Monitoramento
- Métricas de performance por query
- Alertas de uso de recursos
- Análise de crescimento de dados

## Considerações para Desenvolvimento

### Padrões Estabelecidos
1. **Nomenclatura**: snake_case para colunas, kebab-case para identificadores
2. **UUIDs**: Chaves primárias sempre UUID v4
3. **Timestamps**: TIMESTAMPTZ com timezone
4. **RLS**: Obrigatório em todas as tabelas de dados

### Boas Práticas
1. **Migrations**: Sempre reversíveis e testadas
2. **Índices**: Criar apenas quando necessário
3. **Constraints**: Validações no banco quando possível
4. **Documentação**: Comentários em tabelas e colunas críticas

## Roadmap Técnico

### Próximas Implementações
- [ ] Particionamento automático por data
- [ ] Cache distribuído (Redis)
- [ ] Réplicas de leitura
- [ ] Backup incremental
- [ ] Métricas avançadas de negócio

### Melhorias de Performance
- [ ] Otimização de queries N+1
- [ ] Índices parciais para dados ativos
- [ ] Compressão de dados históricos
- [ ] Paginação otimizada

Esta análise fornece uma visão completa da arquitetura do banco de dados, servindo como referência para desenvolvimento, manutenção e evolução do sistema TORIQ.