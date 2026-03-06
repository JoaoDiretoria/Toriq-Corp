# Vertical ON - Plataforma de Gestão SST

## Visão Geral

O **Vertical ON** é uma plataforma SaaS completa para gestão de **Segurança e Saúde do Trabalho (SST)**. Desenvolvida para empresas de consultoria em SST, a plataforma oferece ferramentas integradas para gestão empresarial, treinamentos, EPIs e relacionamento com clientes.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui + Radix UI |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Estado | TanStack Query |

---

## Tipos de Usuário

| Role | Descrição |
|------|-----------|
| `admin_vertical` | Administrador da plataforma Vertical ON |
| `empresa_sst` | Empresa de SST (cliente principal) |
| `cliente_final` | Cliente da empresa SST |
| `empresa_parceira` | Fornecedor/Parceiro |
| `instrutor` | Instrutor de treinamentos |

---

## Módulos Principais

### 1. Toriq Corp (Gestão Empresarial)
Gestão completa da empresa SST: comercial, financeiro, administrativo, técnico e marketing.
- Funis de vendas (Kanban)
- Contas a pagar/receber
- Fluxo de caixa e DRE
- Controle de equipamentos e frota
- Contratos e tarefas

### 2. Toriq Train (Gestão de Treinamentos)
Gestão completa do ciclo de treinamentos.
- Solicitações e agenda
- Gestão de turmas
- Provas e avaliações
- Catálogo e matriz de treinamentos
- Instrutores e empresas parceiras
- Certificados e relatórios

### 3. Toriq EPI (Gestão de EPIs)
Controle completo de equipamentos de proteção individual.
- Catálogo e estoque
- Entregas e devoluções
- Ficha de EPI por colaborador
- Relatórios

### 4. Perfil da Empresa
Configurações e gestão da empresa SST.
- Meu perfil e usuários
- Clientes
- Informações da empresa
- Configurações gerais

---

## Controle de Acesso

O sistema implementa controle hierárquico em 3 níveis:

1. **Administrador** - Acesso total à empresa
2. **Gestor** - Acesso próprio + subordinados
3. **Colaborador** - Apenas dados próprios

---

## Funcionalidades Especiais

- **White Label**: Personalização de marca por empresa
- **Modo Empresa**: Admin pode acessar como qualquer empresa SST
- **Funis Dinâmicos**: Kanban configurável por setor
- **Rotas Públicas**: Provas, cadastros e presença sem login
- **Geração de PDFs**: Certificados e relatórios

---

## Estrutura de Arquivos

```
src/
├── components/     # Componentes por domínio
│   ├── admin/      # Painel Admin Vertical
│   ├── sst/        # Componentes SST
│   │   ├── toriq-corp/   # Módulo Gestão Empresarial
│   │   └── toriq-epi/    # Módulo Gestão de EPI
│   ├── cliente/    # Portal do Cliente
│   ├── parceira/   # Portal Empresa Parceira
│   └── instrutor/  # Portal do Instrutor
├── hooks/          # Hooks customizados
├── pages/          # Páginas/Rotas
└── integrations/   # Integração Supabase
```

---

## Documentação dos Módulos

### Toriq Corp (Gestão Empresarial)
- [Visão Geral](./modulo-toriq-corp.md)
- [Páginas Detalhadas](./modulo-toriq-corp-paginas.md)

### Toriq Train (Gestão de Treinamentos)
- [Visão Geral](./modulo-gestao-treinamentos.md)
- [Páginas Detalhadas](./modulo-gestao-treinamentos-paginas.md)

### Toriq EPI (Gestão de EPIs)
- [Visão Geral](./modulo-epi.md) *(em breve)*
- [Páginas Detalhadas](./modulo-epi-paginas.md) *(em breve)*
