# Módulo Toriq EPI - Visão Geral

## Descrição

O **Toriq EPI** é o módulo de gestão completa de Equipamentos de Proteção Individual (EPI). Permite o controle desde o cadastro dos EPIs até a entrega aos colaboradores, com rastreabilidade total e conformidade com as normas regulamentadoras.

## Funcionalidades Principais

### 1. Catálogo de EPIs
- Cadastro completo de EPIs com informações do fabricante
- Classificação por categoria de proteção (A-I conforme NR-6)
- Registro do Certificado de Aprovação (CA)
- Importação/Exportação via CSV

### 2. Controle de Estoque
- Entrada de estoque individual ou por lote
- Controle de múltiplas validades (Fabricante, CA, Operacional)
- Alertas de estoque baixo e vencimento
- Localização física dos itens

### 3. Entregas de EPIs
- Registro de entregas aos colaboradores
- Termo de responsabilidade
- Histórico completo de entregas

### 4. Ficha de EPI
- Ficha individual por colaborador
- Histórico de todos os EPIs recebidos
- Impressão para assinatura

### 5. Devoluções
- Registro de devoluções
- Motivos de devolução/baixa
- Reintegração ao estoque quando aplicável

### 6. Relatórios
- Posição de estoque
- Entregas por colaborador
- EPIs vencidos/vencendo
- Consumo mensal
- Termos de responsabilidade

## Categorias de Proteção (NR-6)

| Categoria | Descrição |
|-----------|-----------|
| A | Proteção da Cabeça |
| B | Proteção dos Olhos e Face |
| C | Proteção Auditiva |
| D | Proteção Respiratória |
| E | Proteção do Tronco |
| F | Proteção dos Membros Superiores |
| G | Proteção dos Membros Inferiores |
| H | Proteção do Corpo Inteiro |
| I | Proteção Contra Quedas com Diferença de Nível |

## Estrutura de Dados

### Tabela: `cadastro_epis`
Armazena o catálogo de EPIs disponíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| empresa_id | UUID | Empresa proprietária |
| nome_modelo | TEXT | Nome/modelo do EPI |
| categoria_protecao | CHAR(1) | Categoria A-I |
| tipo_epi | TEXT | Tipo específico do EPI |
| fabricante | TEXT | Nome do fabricante |
| numero_ca | TEXT | Número do CA |
| validade_ca | DATE | Data de validade do CA |

### Tabela: `estoque_epis`
Controla o estoque de EPIs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| empresa_id | UUID | Empresa proprietária |
| epi_id | UUID | Referência ao cadastro |
| codigo_lote | TEXT | Código do lote |
| quantidade_inicial | INT | Quantidade de entrada |
| quantidade_atual | INT | Quantidade disponível |
| localizacao | TEXT | Localização física |
| data_recebimento | DATE | Data de recebimento |
| validade_fabricante | DATE | Validade do fabricante |
| validade_ca | DATE | Validade do CA |
| validade_operacional | DATE | Validade operacional |
| bloquear_vencido | BOOL | Bloquear uso se vencido |
| tipo_entrada | TEXT | 'individual' ou 'lote' |

## Fluxo de Trabalho

```
┌─────────────────┐
│ Cadastro de EPI │
│   (Catálogo)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entrada Estoque │
│ (Individual/Lote)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Entrega ao   │
│   Colaborador   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────┐
│ Uso   │ │ Devolução │
└───────┘ └─────┬─────┘
                │
                ▼
         ┌──────────────┐
         │ Baixa ou     │
         │ Reintegração │
         └──────────────┘
```

## Regras de Negócio

### Validade com Prioridade
A validade exibida na tabela de estoque segue a prioridade:
1. **Validade do Fabricante** (se informada)
2. **Validade do CA** (se não houver do fabricante)
3. **Validade Operacional** (se não houver as anteriores)

### Alertas de Vencimento
- **Vencido**: Item com data de validade anterior à data atual
- **Próximo do Vencimento**: Item com validade nos próximos 30 dias

### Bloqueio de Vencidos
Quando ativado, impede a entrega de EPIs vencidos aos colaboradores.

## Arquivos do Módulo

```
src/components/sst/toriq-epi/
├── index.ts                 # Exportações do módulo
├── ToriqEPIDashboard.tsx    # Dashboard com KPIs
├── ToriqEPICatalogo.tsx     # Cadastro de EPIs
├── ToriqEPIEstoque.tsx      # Controle de estoque
├── ToriqEPIEntregas.tsx     # Registro de entregas
├── ToriqEPIFicha.tsx        # Ficha individual
├── ToriqEPIDevolucoes.tsx   # Devoluções e baixas
└── ToriqEPIRelatorios.tsx   # Relatórios
```

## Integrações

- **Supabase**: Persistência de dados e autenticação
- **useAuth**: Contexto de autenticação do usuário
- **useEmpresaMode**: Contexto da empresa ativa
- **usePermissoes**: Controle de permissões por tela

---

*Documentação do Módulo Toriq EPI - Vertical ON*
