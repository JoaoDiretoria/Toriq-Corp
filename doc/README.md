# Vertical ON - Sistema de SST

## Visão Geral

O **Vertical ON** é uma plataforma completa de gestão de Saúde e Segurança do Trabalho (SST) desenvolvida para empresas que prestam serviços de SST ou que precisam gerenciar internamente suas obrigações legais e operacionais.

## Principais Características

- **Multi-tenant**: Suporte a múltiplas empresas com isolamento de dados
- **Controle de Acesso Hierárquico**: Administrador, Gestor e Colaborador
- **Módulos Configuráveis**: Cada empresa contrata apenas os módulos que precisa
- **Interface Moderna**: UI responsiva com React, TailwindCSS e shadcn/ui
- **Integração Supabase**: Backend serverless com PostgreSQL e autenticação

## Módulos Disponíveis

| Módulo | Descrição |
|--------|-----------|
| **Perfil da Empresa** | Cadastros básicos, configurações e gestão de usuários |
| **Toriq Corp** | Gestão empresarial com funis, setores, frota e equipamentos |
| **Toriq Train** | Gestão completa de treinamentos e capacitações |
| **Toriq EPI** | Gestão de Equipamentos de Proteção Individual |
| **Saúde Ocupacional** | Gestão de exames e saúde dos colaboradores |
| **Gestão de Terceiros** | Controle de empresas e trabalhadores terceirizados |
| **Gestão de Documentos** | Controle de documentos e normas regulamentadoras |

## Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui + Lucide Icons
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State Management**: React Query + Context API
- **Roteamento**: React Router DOM

## Estrutura do Projeto

```
src/
├── components/
│   ├── admin/          # Componentes administrativos
│   ├── sst/            # Módulos SST
│   │   ├── toriq-corp/ # Módulo Toriq Corp
│   │   ├── toriq-epi/  # Módulo Toriq EPI
│   │   └── ...
│   └── ui/             # Componentes UI reutilizáveis
├── hooks/              # Hooks customizados
├── integrations/       # Integrações (Supabase)
├── pages/              # Páginas da aplicação
└── lib/                # Utilitários
```

## Documentação dos Módulos

### Gestão Empresa Toriq (Admin)
- [Visão Geral](./modulo-gestao-empresa-toriq.md)
- [Páginas Detalhadas](./modulo-gestao-empresa-toriq-paginas.md)

### Toriq Corp (Gestão Empresarial SST)
- [Visão Geral](./modulo-toriq-corp.md)
- [Páginas Detalhadas](./modulo-toriq-corp-paginas.md)

### Toriq Train (Gestão de Treinamentos)
- [Visão Geral](./modulo-gestao-treinamentos.md)
- [Páginas Detalhadas](./modulo-gestao-treinamentos-paginas.md)

### Toriq EPI (Gestão de EPIs)
- [Visão Geral](./modulo-epi.md)
- [Páginas Detalhadas](./modulo-epi-paginas.md)

---

*Documentação atualizada em Janeiro/2026*
