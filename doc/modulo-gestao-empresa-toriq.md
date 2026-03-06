# Módulo Gestão Empresa Toriq

## Visão Geral

O **Módulo Gestão Empresa Toriq** é o painel administrativo central da plataforma Vertical ON. Este módulo é exclusivo para usuários com role `admin_vertical` e permite a gestão completa da empresa Toriq, incluindo controle de empresas clientes, usuários, colaboradores, módulos, comercial e financeiro.

---

## Acesso

- **Rota**: `/admin`
- **Role Requerida**: `admin_vertical`
- **Componente Principal**: `AdminDashboard.tsx`

---

## Estrutura do Módulo

O módulo é organizado em seções principais acessíveis através de um sidebar colapsável:

```
Gestão Empresa TORIQ
├── Dashboard
├── Empresas
│   ├── Empresas
│   └── Categoria de Clientes
├── Usuários
├── Colaboradores
├── Serviços
├── Módulos
├── Tarefas
├── Comercial
│   ├── Dashboard
│   ├── Funil - CLOSER
│   ├── Prospecção (SDR)
│   ├── Onboarding
│   └── CS / Cross-selling
├── Financeiro
│   ├── Dashboard
│   ├── Cadastros
│   ├── Contas a Receber
│   ├── Contas a Pagar
│   ├── Fluxo de Caixa
│   └── DRE
└── Estatísticas do Sistema
```

---

## Funcionalidades Principais

### 1. Gestão de Empresas
- Cadastro completo de empresas (SST, Cliente Final, Parceira, Lead)
- Busca automática por CNPJ (integração com API externa)
- Busca automática por CEP (ViaCEP)
- Gestão de contatos por empresa
- Configuração de módulos e telas por empresa
- Modo Empresa: permite acessar o sistema como qualquer empresa SST

### 2. Gestão de Usuários
- CRUD completo de usuários
- Atribuição de roles (Admin Toriq, Empresa SST, Cliente Final)
- Vinculação de usuário a empresa
- Criação via Edge Function para segurança

### 3. Gestão de Colaboradores
- Cadastro completo de colaboradores da Toriq
- Dados pessoais, documentos, endereço
- Dados profissionais (cargo, setor, salário)
- Dados bancários
- Controle de acesso ao sistema
- Upload de foto

### 4. Gestão de Serviços
- Catálogo de serviços oferecidos
- Precificação e descrição

### 5. Gestão de Módulos
- Cadastro de módulos do sistema
- Definição de ícones e rotas
- Ativação/desativação por empresa

### 6. Gestão de Tarefas
- Controle de tarefas internas
- Atribuição e acompanhamento

### 7. Comercial
- **Dashboard**: Visão geral do comercial
- **Funil CLOSER**: Gestão de oportunidades em Kanban
- **Prospecção (SDR)**: Gestão de leads e prospecção
- **Onboarding**: Acompanhamento pós-venda
- **CS / Cross-selling**: Gestão de relacionamento e vendas adicionais

### 8. Financeiro
- **Dashboard**: Visão geral financeira
- **Cadastros**: Categorias, centros de custo, formas de pagamento
- **Contas a Receber**: Gestão de recebíveis
- **Contas a Pagar**: Gestão de pagamentos
- **Fluxo de Caixa**: Projeção e acompanhamento
- **DRE**: Demonstrativo de Resultados

### 9. Estatísticas do Sistema
- Métricas de uso da plataforma
- Dados de empresas e usuários

---

## Arquitetura Técnica

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `AdminDashboard.tsx` | Página principal do módulo |
| `AdminSidebar.tsx` | Navegação lateral com menus colapsáveis |
| `AdminDashboardHome.tsx` | Dashboard inicial com cards de resumo |
| `AdminEmpresas.tsx` | CRUD de empresas |
| `EmpresaDetalhe.tsx` | Detalhes e configuração de empresa |
| `AdminUsuarios.tsx` | CRUD de usuários |
| `AdminColaboradores.tsx` | CRUD de colaboradores |
| `AdminModulos.tsx` | CRUD de módulos |
| `AdminServicos.tsx` | CRUD de serviços |
| `AdminTarefas.tsx` | Gestão de tarefas |

### Componentes Comerciais

| Componente | Descrição |
|------------|-----------|
| `AdminComercialDashboard.tsx` | Dashboard comercial |
| `AdminCloser.tsx` | Funil de vendas (CLOSER) |
| `AdminProspeccao.tsx` | Gestão de prospecção (SDR) |
| `AdminPosVenda.tsx` | Onboarding de clientes |
| `AdminCrossSelling.tsx` | CS e Cross-selling |

### Componentes Financeiros

| Componente | Descrição |
|------------|-----------|
| `AdminFinanceiroDashboard.tsx` | Dashboard financeiro |
| `AdminFinanceiroCadastros.tsx` | Cadastros financeiros |
| `AdminContasReceber.tsx` | Contas a receber |
| `AdminContasPagar.tsx` | Contas a pagar |
| `AdminFluxoCaixa.tsx` | Fluxo de caixa |
| `AdminDRE.tsx` | DRE |

---

## Integrações

### APIs Externas
- **BrasilAPI**: Busca de dados por CNPJ
- **ViaCEP**: Busca de endereço por CEP

### Supabase
- **Tabelas**: `empresas`, `profiles`, `colaboradores`, `modulos`, `empresas_modulos`, `empresas_modulos_telas`
- **Edge Functions**: `admin-create-user` (criação segura de usuários)
- **RLS**: Políticas de segurança por empresa

---

## Fluxos Principais

### Cadastro de Nova Empresa
1. Usuário clica em "Nova Empresa"
2. Digita o CNPJ → Sistema busca dados automaticamente
3. Preenche dados complementares
4. Salva empresa
5. Configura módulos e telas disponíveis
6. Cria usuário administrador da empresa

### Modo Empresa
1. Admin clica no ícone de "Entrar como empresa"
2. Sistema salva contexto no localStorage
3. Redireciona para `/dashboard` como a empresa selecionada
4. Todas as operações são feitas no contexto da empresa
5. Admin pode sair do modo a qualquer momento

---

## Segurança

- Acesso restrito a `admin_vertical`
- Verificação de role no carregamento da página
- Redirecionamento automático para usuários não autorizados
- Logs de acesso registrados via `useAccessLog`

---

## Arquivos Relacionados

```
src/
├── pages/
│   └── AdminDashboard.tsx
├── components/admin/
│   ├── AdminSidebar.tsx
│   ├── AdminDashboardHome.tsx
│   ├── AdminEmpresas.tsx
│   ├── EmpresaDetalhe.tsx
│   ├── AdminUsuarios.tsx
│   ├── AdminColaboradores.tsx
│   ├── AdminModulos.tsx
│   ├── AdminServicos.tsx
│   ├── AdminTarefas.tsx
│   ├── AdminCategoriasClientes.tsx
│   ├── AdminComercialDashboard.tsx
│   ├── AdminCloser.tsx
│   ├── AdminProspeccao.tsx
│   ├── AdminPosVenda.tsx
│   ├── AdminCrossSelling.tsx
│   ├── AdminFinanceiroDashboard.tsx
│   ├── AdminFinanceiroCadastros.tsx
│   ├── AdminContasReceber.tsx
│   ├── AdminContasPagar.tsx
│   ├── AdminFluxoCaixa.tsx
│   ├── AdminDRE.tsx
│   ├── AdminEstatisticas.tsx
│   └── AdminConfiguracoes.tsx
└── hooks/
    ├── useAuth.tsx
    ├── useEmpresaMode.tsx
    └── useAccessLog.tsx
```

---

*Documentação atualizada em Janeiro/2026*
