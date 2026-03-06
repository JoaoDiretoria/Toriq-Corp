# Sistema de SST - Vertical ON

## Visão Geral

O **Sistema de SST (Saúde e Segurança do Trabalho)** é uma aplicação web completa desenvolvida para gerenciar todos os aspectos relacionados à segurança e saúde ocupacional de empresas. O sistema é multi-tenant, suportando diferentes tipos de usuários e empresas.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Estilização** | TailwindCSS + shadcn/ui |
| **Roteamento** | React Router DOM v6 |
| **Estado/Cache** | TanStack React Query |
| **Backend/BaaS** | Supabase (PostgreSQL + Auth + Storage) |
| **Formulários** | React Hook Form + Zod |
| **Ícones** | Lucide React |
| **PDF** | jsPDF + html2canvas |

---

## Arquitetura do Sistema

### Estrutura de Diretórios

```
src/
├── App.tsx                 # Configuração de rotas e providers
├── main.tsx               # Entry point
├── components/            # Componentes reutilizáveis
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── admin/            # Componentes do Admin Vertical
│   ├── sst/              # Componentes da Empresa SST
│   ├── cliente/          # Componentes do Cliente Final
│   ├── parceira/         # Componentes da Empresa Parceira
│   ├── instrutor/        # Componentes do Instrutor
│   └── avaliacao/        # Componentes de Avaliação
├── pages/                 # Páginas/Telas do sistema
│   ├── modulos/          # Módulos específicos
│   ├── public/           # Páginas públicas (provas, cadastro)
│   ├── instrutor/        # Dashboard do instrutor
│   ├── certificado/      # Visualização de certificados
│   └── relatorio/        # Visualização de relatórios
├── hooks/                 # Custom hooks
│   ├── useAuth.tsx       # Autenticação e contexto de usuário
│   └── useEmpresaMode.tsx # Modo de visualização como empresa
├── integrations/          # Integrações externas
│   └── supabase/         # Cliente e tipos do Supabase
└── lib/                   # Utilitários
```

---

## Tipos de Usuários (Roles)

| Role | Descrição | Dashboard |
|------|-----------|-----------|
| `admin_vertical` | Administrador da Vertical ON | `/admin` |
| `empresa_sst` | Empresa de SST | `/sst` |
| `cliente_final` | Cliente da empresa SST | `/cliente` |
| `empresa_parceira` | Empresa parceira/fornecedora | `/parceira` |
| `instrutor` | Instrutor de treinamentos | `/instrutor` |

---

## Tipos de Empresas

| Tipo | Descrição |
|------|-----------|
| `vertical_on` | Empresa matriz (Vertical ON) |
| `sst` | Empresa de Saúde e Segurança do Trabalho |
| `cliente_final` | Cliente que contrata serviços de SST |
| `empresa_parceira` | Fornecedor/parceiro de serviços |

---

## Rotas do Sistema

### Rotas Públicas
| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | `Index` | Página inicial/landing |
| `/auth` | `Auth` | Login/Cadastro |
| `/reset-password` | `ResetPassword` | Recuperação de senha |
| `/prova-turma/:turmaId` | `ProvaTurma` | Prova pública da turma |
| `/cadastro-turma/:turmaId` | `CadastroColaboradorTurma` | Cadastro de colaborador na turma |
| `/presenca-turma/:turmaId` | `MarcarPresencaTurma` | Marcação de presença |
| `/certificado/visualizar` | `VisualizarCertificado` | Visualização de certificado |
| `/relatorio/visualizar` | `VisualizarRelatorio` | Visualização de relatório |

### Rotas Autenticadas
| Rota | Componente | Acesso |
|------|------------|--------|
| `/dashboard` | `Dashboard` | Geral |
| `/admin` | `AdminDashboard` | admin_vertical |
| `/sst` | `SSTDashboard` | empresa_sst |
| `/cliente` | `ClienteDashboard` | cliente_final |
| `/parceira` | `ParceiraDashboard` | empresa_parceira |
| `/instrutor` | `InstrutorDashboard` | instrutor |
| `/instrutor/turma/:turmaId` | `InstrutorGerenciarTurma` | instrutor |

### Rotas de Módulos
| Rota | Componente | Descrição |
|------|------------|-----------|
| `/modulos/gestao-epi` | `GestaoEPI` | Gestão de EPIs |
| `/modulos/saude-ocupacional` | `SaudeOcupacional` | Saúde Ocupacional |
| `/modulos/treinamentos` | `GestaoTreinamentos` | Gestão de Treinamentos |
| `/modulos/gestao-turmas` | `GestaoTurmas` | Gestão de Turmas |
| `/modulos/gestao-turmas/:turmaId` | `GerenciarTurma` | Gerenciar Turma Específica |
| `/modulos/avaliacao-reacao` | `AvaliacaoReacao` | Avaliação de Reação |
| `/modulos/terceiros` | `GestaoTerceiros` | Gestão de Terceiros |
| `/colaborador/:colaboradorId` | `ColaboradorDetalhes` | Detalhes do Colaborador |

---

## Módulos do Sistema

### 1. Gestão de Clientes (`SSTClientes`)
- Cadastro e gerenciamento de clientes
- Vinculação com empresa SST
- Dados de contato e responsável

### 2. Catálogo de Treinamentos (`CatalogoTreinamentos`)
- Cadastro de treinamentos disponíveis
- Carga horária (formação e reciclagem)
- Validade e normas regulamentadoras

### 3. Matriz de Treinamentos (`MatrizTreinamentos`)
- Vinculação de treinamentos por norma
- Agentes nocivos associados

### 4. Grupos Homogêneos (`GruposHomogeneos`)
- Agrupamento de colaboradores por exposição
- Vinculação com cargos e treinamentos obrigatórios

### 5. Gestão de Turmas (`GestaoTurmas`)
- Criação e gerenciamento de turmas de treinamento
- Agendamento de aulas
- Controle de participantes

### 6. Instrutores (`Instrutores`)
- Cadastro de instrutores
- Formações e certificações
- Treinamentos habilitados
- Datas indisponíveis

### 7. Empresas Parceiras (`SSTEmpresasParceiras`)
- Cadastro de fornecedores
- Tipos de fornecedor
- Vinculação de responsáveis

### 8. Normas Regulamentadoras (`SSTNormasRegulamentadoras`)
- Cadastro de NRs aplicáveis
- Documentação e termos

### 9. Provas (`SSTProvas`)
- Criação de provas por treinamento
- Questões e alternativas
- Aplicação e correção automática

### 10. Avaliação de Reação (`AvaliacaoReacao`)
- Avaliação pós-treinamento
- Perguntas configuráveis
- Respostas dos colaboradores

### 11. Declaração de Reorientação (`SSTDeclaracaoReorientacao`)
- Registro de reorientações
- Assinaturas digitais

### 12. Modelo de Relatório (`SSTModeloRelatorio`)
- Templates de relatórios
- Variáveis dinâmicas
- Geração de PDF

### 13. Gestão de EPI (`GestaoEPI`)
- Controle de EPIs entregues
- Validade de CA
- Histórico por colaborador

### 14. Saúde Ocupacional (`SaudeOcupacional`)
- Exames ocupacionais (ASO)
- Validade e agendamentos

### 15. Gestão de Terceiros (`GestaoTerceiros`)
- Controle de empresas terceirizadas
- Documentação e conformidade

---

## Banco de Dados (Supabase/PostgreSQL)

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `empresas` | Cadastro de todas as empresas |
| `profiles` | Perfis de usuários (vinculado ao auth.users) |
| `clientes_sst` | Clientes vinculados a empresas SST |
| `empresas_parceiras` | Empresas parceiras/fornecedoras |
| `colaboradores` | Colaboradores das empresas |
| `instrutores` | Instrutores de treinamentos |
| `catalogo_treinamentos` | Catálogo de treinamentos |
| `turmas_treinamento` | Turmas de treinamento |
| `turmas_treinamento_aulas` | Aulas das turmas |
| `grupos_homogeneos` | Grupos homogêneos de exposição |
| `matriz_treinamentos` | Matriz de treinamentos por norma |
| `normas_regulamentadoras` | Normas regulamentadoras |
| `modulos` | Módulos disponíveis no sistema |
| `empresas_modulos` | Módulos ativos por empresa |

### Tabelas de Treinamento

| Tabela | Descrição |
|--------|-----------|
| `colaboradores_treinamentos` | Treinamentos dos colaboradores |
| `colaboradores_treinamentos_datas` | Datas dos treinamentos |
| `solicitacoes_treinamento` | Solicitações de treinamento |
| `provas_treinamento` | Provas de treinamento |
| `turma_provas` | Provas aplicadas nas turmas |
| `turma_colaborador_presencas` | Presenças nas turmas |

### Tabelas de Avaliação

| Tabela | Descrição |
|--------|-----------|
| `avaliacao_reacao_perguntas` | Perguntas de avaliação |
| `avaliacao_reacao_respostas` | Respostas das avaliações |
| `reorientacoes_colaborador` | Reorientações registradas |

### Tabelas de Suporte

| Tabela | Descrição |
|--------|-----------|
| `setores` | Setores das empresas |
| `cargos` | Cargos das empresas |
| `epis` | Registros de EPIs |
| `saude_ocupacional` | Exames ocupacionais |
| `terceiros` | Empresas terceirizadas |
| `comercial_funil` | Funil comercial |
| `configuracoes_empresa` | Configurações visuais |

### Tabelas de Instrutor

| Tabela | Descrição |
|--------|-----------|
| `instrutor_formacoes` | Formações do instrutor |
| `instrutor_treinamentos` | Treinamentos habilitados |
| `instrutor_datas_indisponiveis` | Datas bloqueadas |

---

## Fluxos Principais

### 1. Fluxo de Autenticação
```
Login → Verificar Credenciais → Buscar Profile → Buscar Empresa → Redirecionar por Role
```

### 2. Fluxo de Treinamento
```
Criar Turma → Adicionar Colaboradores → Agendar Aulas → Marcar Presenças → Aplicar Prova → Emitir Certificado
```

### 3. Fluxo de Avaliação
```
Configurar Perguntas → Vincular ao Treinamento → Colaborador Responde → Gerar Relatório
```

### 4. Fluxo de Relatório
```
Criar Modelo → Definir Variáveis → Selecionar Turma → Gerar PDF
```

---

## Funcionalidades Especiais

### Modo Empresa (Admin)
O administrador da Vertical ON pode "entrar" em qualquer empresa para visualizar e gerenciar como se fosse o usuário daquela empresa.

### Rotas Públicas de Turma
- Colaboradores podem se cadastrar via link público
- Marcação de presença via QR Code ou link
- Realização de provas sem autenticação

### Geração de Certificados
- Templates personalizáveis por empresa
- Variáveis dinâmicas (nome, data, carga horária)
- Exportação em PDF

### Geração de Relatórios
- Modelos com páginas configuráveis
- Variáveis do sistema
- Preview e exportação

---

## Segurança

- **RLS (Row Level Security)**: Políticas de acesso por empresa/usuário
- **Autenticação**: Supabase Auth com JWT
- **Roles**: Controle de acesso por função
- **Políticas**: Cada tabela possui políticas específicas

---

## Considerações Técnicas

- **Multi-tenant**: Isolamento de dados por `empresa_id`
- **Responsivo**: Interface adaptável para mobile
- **Real-time**: Suporte a atualizações em tempo real (Supabase)
- **Offline-first**: Cache com React Query

---

*Documentação gerada automaticamente em 23/12/2024*
