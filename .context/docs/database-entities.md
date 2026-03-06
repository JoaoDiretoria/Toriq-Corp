# Entidades e Relacionamentos do Banco de Dados

## Entidades Principais

### 1. Empresas e Organizações

#### `empresas`
- **Propósito**: Empresas principais do sistema (multi-tenant)
- **Campos principais**: 
  - `id` (UUID, PK)
  - `nome`, `cnpj`, `email`
  - `endereco`, `cidade`, `estado`, `cep`
  - `logo_url` (Storage)
- **Relacionamentos**: 1:N com quase todas as tabelas via `empresa_id`

#### `empresas_parceiras`
- **Propósito**: Empresas terceirizadas/parceiras
- **Relacionamento**: N:N com empresas via `empresa_parceira_vinculo`

#### `clientes_sst`
- **Propósito**: Clientes das empresas de SST
- **Campos específicos**: 
  - `grau_risco`, `cnae`
  - `campos_esocial` (JSONB)
  - `pcmso_data`, `ppra_data`

### 2. Usuários e Perfis

#### `profiles`
- **Propósito**: Perfis de usuários (extends auth.users)
- **Campos principais**:
  - `id` (UUID, FK para auth.users)
  - `empresa_id` (FK para empresas)
  - `role` (admin_vertical, sst, cliente, instrutor, parceira)
  - `setor_id`, `grupo_acesso`
  - `primeiro_acesso` (boolean)

#### `instrutores`
- **Propósito**: Instrutores de treinamentos
- **Campos específicos**:
  - `apto` (boolean)
  - `empresa_parceira_id`
  - `formacoes` (relacionamento com certificados)

### 3. Gestão de Pessoas

#### `colaboradores`
- **Propósito**: Funcionários das empresas clientes
- **Campos principais**:
  - `nome`, `cpf`, `matricula`
  - `setor_id`, `cargo_id`
  - `grupo_homogeneo_id`
  - `comissao` (para vendedores)

#### `setores` e `cargos`
- **Propósito**: Estrutura organizacional
- **Relacionamento**: N:1 com colaboradores

#### `grupos_homogeneos`
- **Propósito**: Grupos de exposição similar (SST)
- **Relacionamento**: 1:N com colaboradores

### 4. Sistema de Treinamentos

#### `catalogo_treinamentos`
- **Propósito**: Catálogo de treinamentos disponíveis
- **Campos**: `nome`, `carga_horaria`, `tipo`, `descricao`

#### `turmas_treinamento`
- **Propósito**: Agendamentos/turmas de treinamentos
- **Relacionamentos**:
  - `cliente_id` → `clientes_sst`
  - `treinamento_id` → `catalogo_treinamentos`
  - `instrutor_id` → `instrutores`

#### `turmas_treinamento_aulas`
- **Propósito**: Aulas individuais das turmas
- **Campos**: `data`, `hora_inicio`, `hora_fim`, `horas`

#### `colaboradores_treinamentos`
- **Propósito**: Vinculação colaborador-treinamento
- **Status**: agendado, em_andamento, concluido, cancelado

#### `provas_treinamento`
- **Propósito**: Sistema de avaliações
- **Campos**: `questoes` (JSONB), `nota_minima`

### 5. CRM/Funil Comercial

#### `funis`
- **Propósito**: Configuração de funis de vendas
- **Campos**: `nome`, `descricao`, `tipo`

#### `funil_etapas`
- **Propósito**: Etapas dos funis
- **Campos**: `nome`, `cor`, `ordem`

#### `funil_cards`
- **Propósito**: Oportunidades/cards nos funis
- **Campos principais**:
  - `titulo`, `descricao`
  - `cliente_id`, `valor`
  - `responsavel_id`
  - `campos_personalizados` (JSONB)

#### `prospeccao`
- **Propósito**: Prospecção de clientes
- **Relacionamento**: Pode gerar `funil_cards`

### 6. Sistema Financeiro

#### `contas_receber`
- **Propósito**: Contas a receber (Kanban)
- **Campos principais**:
  - `numero`, `cliente_nome`, `valor`
  - `data_emissao`, `data_recebimento`
  - `origem` (manual, closer, pos-venda)
  - `closer_card_id` (rastreabilidade)

#### `contas_pagar`
- **Propósito**: Contas a pagar
- **Relacionamento**: `fornecedor_id` → `fornecedores`

#### `plano_receitas` e `plano_despesas`
- **Propósito**: Plano de contas contábil
- **Estrutura**: Hierárquica com códigos

### 7. Gestão de Frota

#### `frota_veiculos`
- **Propósito**: Cadastro de veículos
- **Campos**: `placa`, `marca`, `modelo`, `km_atual`

#### `frota_utilizacoes`
- **Propósito**: Registros de uso
- **Campos**: `km_inicio`, `km_fim`, `motorista`

#### `frota_manutencoes`
- **Propósito**: Manutenções
- **Tipos**: Preventiva, Preditiva, Corretiva

### 8. Gestão de EPIs

#### `cadastro_epis`
- **Propósito**: Catálogo de EPIs
- **Campos**: `nome`, `ca`, `validade_meses`

#### `estoque_epis`
- **Propósito**: Controle de estoque
- **Campos**: `quantidade`, `lote`, `data_fabricacao`

#### `entregas_epis`
- **Propósito**: Entregas aos colaboradores
- **Campos**: `assinatura_base64`, `hash_sha256`

### 9. Sistema White Label

#### `white_label_config`
- **Propósito**: Personalização por empresa
- **Categorias**:
  - **Identidade**: title, subtitle, domain
  - **Tipografia**: fonts, sizes, weights
  - **Cores**: primary, secondary, states
  - **Layout**: radius, shadows, spacing
  - **Kanban**: cards, columns, fields

## Relacionamentos Críticos

### Multi-Tenancy
```
empresas (1) → (N) [todas as tabelas principais via empresa_id]
```

### Hierarquia de Usuários
```
empresas (1) → (N) profiles → (1) setores
profiles → (N) subordinados (via gestor_id)
```

### Fluxo de Treinamentos
```
clientes_sst (1) → (N) solicitacoes_treinamento
solicitacoes_treinamento (1) → (1) turmas_treinamento
turmas_treinamento (1) → (N) turmas_treinamento_aulas
turmas_treinamento (1) → (N) colaboradores_treinamentos
colaboradores_treinamentos (1) → (N) certificados
```

### Fluxo Comercial
```
prospeccao → funil_cards → contratos → contas_receber
```

### Rastreabilidade Financeira
```
funil_cards.id → contas_receber.closer_card_id
contratos.id → contas_receber.contrato_id
```

## Índices Estratégicos

### Performance Crítica
- `empresa_id` em todas as tabelas principais
- `created_at` para ordenação temporal
- `status` para filtros de estado
- Índices compostos para queries complexas

### Exemplos de Índices Compostos
```sql
-- Busca de treinamentos por empresa e status
CREATE INDEX idx_turmas_empresa_status ON turmas_treinamento(empresa_id, status);

-- Busca de contas por empresa e data
CREATE INDEX idx_contas_empresa_data ON contas_receber(empresa_id, data_recebimento);

-- Busca de colaboradores por empresa e setor
CREATE INDEX idx_colaboradores_empresa_setor ON colaboradores(empresa_id, setor_id);
```

## Constraints e Validações

### Constraints Únicas
- `empresas.cnpj` (único global)
- `colaboradores(empresa_id, cpf)` (único por empresa)
- `setores(empresa_id, nome)` (único por empresa)

### Check Constraints
- Status enumerados (ex: 'agendado', 'concluido')
- Valores monetários >= 0
- Datas de validade > data atual

### Foreign Keys com Cascade
- `ON DELETE CASCADE`: Para dados dependentes
- `ON DELETE SET NULL`: Para referências opcionais
- `ON DELETE RESTRICT`: Para dados críticos

## Triggers e Automações

### Triggers de Auditoria
- `audit_log_trigger`: Log automático de mudanças
- `notification_trigger`: Notificações automáticas

### Triggers de Negócio
- `update_updated_at`: Atualização de timestamps
- `generate_numero`: Geração de números sequenciais
- `validate_business_rules`: Validações complexas

### Funções de Negócio
- `get_empresa_sst_pai()`: Hierarquia de empresas
- `generate_contrato_numero()`: Numeração de contratos
- `calculate_training_hours()`: Cálculo de horas

Esta documentação serve como referência completa para entender a estrutura e relacionamentos do banco de dados do sistema TORIQ.