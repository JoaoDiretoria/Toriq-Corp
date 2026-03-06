# Análise Completa do Sistema Vertical On - SST

## 1. VISÃO GERAL DO PROJETO

### 1.1 Informações Técnicas
- **Nome**: Vertical On - Sistema de SST (Segurança e Saúde do Trabalho)
- **Stack Tecnológico**:
  - Frontend: React 18.3 + TypeScript + Vite
  - UI Framework: shadcn/ui + Radix UI + Tailwind CSS
  - Backend: Supabase (PostgreSQL + Auth + Storage)
  - State Management: React Query (TanStack Query)
  - Roteamento: React Router v6
  - Formulários: React Hook Form + Zod
  - Ícones: Lucide React
  - Notificações: Sonner + Radix Toast
  - Gráficos: Recharts
  - PDF: jsPDF + html2canvas
  - Drag & Drop: dnd-kit

### 1.2 Estrutura de Diretórios
```
src/
├── pages/                    # Páginas principais (dashboards, módulos)
│   ├── Dashboard.tsx        # Dashboard genérico com redirecionamento
│   ├── AdminDashboard.tsx   # Dashboard Admin Vertical
│   ├── SSTDashboard.tsx     # Dashboard Principal SST
│   ├── ClienteDashboard.tsx # Dashboard Cliente Final
│   ├── ParceiraDashboard.tsx# Dashboard Empresa Parceira
│   ├── InstrutorDashboard.tsx# Dashboard Instrutor
│   ├── Auth.tsx             # Página de autenticação
│   ├── ResetPassword.tsx    # Reset de senha
│   ├── modulos/             # Módulos de negócio
│   ├── public/              # Rotas públicas (prova, presença, cadastro)
│   ├── instrutor/           # Rotas do instrutor
│   ├── certificado/         # Visualização de certificados
│   └── relatorio/           # Visualização de relatórios
├── components/
│   ├── ui/                  # Componentes shadcn/ui (50 itens)
│   ├── admin/               # Componentes Admin Vertical (37 itens)
│   ├── sst/                 # Componentes SST (26 itens)
│   ├── cliente/             # Componentes Cliente Final (11 itens)
│   ├── instrutor/           # Componentes Instrutor (5 itens)
│   ├── parceira/            # Componentes Empresa Parceira (5 itens)
│   ├── avaliacao/           # Componentes Avaliação (2 itens)
│   └── NavLink.tsx
├── hooks/
│   ├── useAuth.tsx          # Autenticação e contexto de usuário
│   ├── usePermissoes.tsx    # Permissões por setor
│   ├── useHierarquia.tsx    # Controle hierárquico (admin/gestor/colaborador)
│   ├── useEmpresaMode.tsx   # Modo empresa para admin acessar como SST
│   └── use-mobile.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts        # Cliente Supabase
│       └── types.ts         # Tipos gerados automaticamente
├── lib/                     # Utilitários
├── templates/               # Templates
└── App.tsx                  # Roteamento principal
```

---

## 2. ARQUITETURA E FLUXOS

### 2.1 Fluxo de Autenticação
```
1. Usuário acessa /auth
2. useAuth() gerencia autenticação via Supabase
3. Após login bem-sucedido:
   - Busca profile do usuário (profiles table)
   - Determina role: admin_vertical | empresa_sst | cliente_final | empresa_parceira | instrutor
   - Busca dados da empresa associada
4. Redirecionamento automático baseado em role:
   - admin_vertical → /admin
   - empresa_sst → /sst
   - cliente_final → /cliente
   - empresa_parceira → /parceira
   - instrutor → /instrutor
```

### 2.2 Controle de Acesso Hierárquico
**Implementado via `useHierarquia.tsx`**

Três níveis de acesso:
1. **Administrador**: Acesso total a todos os dados da empresa
   - Campo `grupo_acesso = 'administrador'` em profiles
   - Pode ver/editar/deletar todos os registros da empresa
   
2. **Gestor**: Acesso aos próprios dados + dados de subordinados (diretos e indiretos)
   - Campo `grupo_acesso = 'gestor'` em profiles
   - Campo `gestor_id` aponta para seu gestor direto
   - Busca subordinados recursivamente via função SQL `get_subordinados()`
   
3. **Colaborador**: Acesso apenas aos próprios dados
   - Campo `grupo_acesso = 'colaborador'` em profiles
   - Restrição máxima de acesso

**Funções SQL relacionadas**:
- `get_subordinados()`: Retorna todos os subordinados diretos e indiretos
- `get_usuarios_visiveis()`: Retorna usuários que o usuário atual pode ver
- `pode_acessar_registro()`: Verifica se usuário pode acessar um registro específico

**RLS Policies**: Aplicam hierarquia no banco de dados automaticamente

### 2.3 Permissões por Setor
**Implementado via `usePermissoes.tsx`**

- Usuários podem ter `setor_id` em profiles
- Cada setor tem permissões específicas em `setor_permissoes` table
- Permissões por página: visualizar, editar, criar
- Mapeamento de seções para módulos/páginas:
  - Perfil Empresa: meu-perfil, usuarios, clientes, informacoes-empresa, configuracoes
  - Toriq Corp: comercial, administrativo, financeiro, tecnico, marketing, configuracoes
  - Toriq Train: solicitacoes, agenda, turmas, provas, reorientacao, avaliacao, NR, etc.

### 2.4 Modo Empresa (Admin Vertical acessando como SST)
**Implementado via `useEmpresaMode.tsx`**

- Admin Vertical pode acessar dashboard de qualquer SST
- Útil para suporte e gerenciamento
- Mantém contexto de empresa diferente do usuário autenticado
- Exibe banner informativo quando ativo

---

## 3. BANCO DE DADOS

### 3.1 Tabelas Principais

#### **Gestão de Usuários e Empresas**
- `profiles`: Usuários do sistema (id, email, nome, role, empresa_id, grupo_acesso, gestor_id, setor_id)
- `empresas`: Empresas (id, nome, tipo, cnpj, endereço, telefone, email)
- `setores`: Setores da empresa (id, empresa_id, nome, descricao, ativo)
- `cargos`: Cargos (id, empresa_id, nome, descricao, ativo)
- `setor_permissoes`: Permissões por setor (setor_id, modulo_id, pagina_id, visualizar, editar, criar)

#### **Gestão de Treinamentos**
- `catalogo_treinamentos`: Catálogo de treinamentos (id, empresa_id, nome, norma, ch_formacao, ch_reciclagem, validade)
- `matriz_treinamentos`: Matriz de treinamentos por norma (id, empresa_id, norma, treinamento_id)
- `turmas_treinamento`: Turmas criadas (id, empresa_id, numero_turma, cliente_id, treinamento_id, instrutor_id, status)
- `turmas_treinamento_aulas`: Aulas das turmas (id, turma_id, data, hora_inicio, hora_fim, horas)
- `colaboradores_treinamentos`: Treinamentos de colaboradores (id, colaborador_id, treinamento_id, status, data_realizacao)
- `colaboradores_treinamentos_datas`: Datas específicas de treinamento (id, colaborador_treinamento_id, data, inicio, fim, horas)
- `solicitacoes_treinamento`: Solicitações de treinamento (id, numero, empresa_id, treinamento_id, colaborador_id, tipo, carga_horaria, status)

#### **Colaboradores e Grupos**
- `colaboradores`: Colaboradores (id, empresa_id, matricula, nome, cpf, cargo, setor, grupo_homogeneo_id, ativo)
- `grupos_homogeneos`: Grupos homogêneos (id, empresa_id, cliente_id, cargo_id, nome, agente_nocivo, ativo)
- `grupos_homogeneos_treinamentos`: Treinamentos obrigatórios por grupo (grupo_homogeneo_id, treinamento_id)

#### **Instrutores**
- `instrutores`: Instrutores (id, empresa_id, empresa_parceira_id, nome, email, cpf_cnpj, telefone, endereço, formacao_academica, ativo)
- `instrutor_formacoes`: Formações do instrutor (id, instrutor_id, nome, documento_url)
- `instrutor_treinamentos`: Treinamentos que instrutor pode ministrar (id, instrutor_id, treinamento_id, documento_url)

#### **Clientes e Parceiros**
- `clientes_sst`: Clientes de SST (id, empresa_sst_id, cliente_empresa_id, nome, cnpj, email, telefone, responsavel_id)
- `empresas_parceiras`: Empresas parceiras (id, empresa_sst_id, parceira_empresa_id, nome, cnpj, email, telefone, tipo_fornecedor)

#### **Saúde e EPI**
- `saude_ocupacional`: Registros de saúde (id, empresa_id, colaborador_nome, tipo_exame, data_exame, aso_arquivo_url, validade_dias)
- `epis`: Equipamentos de proteção (id, empresa_id, colaborador_nome, nome_epi, quantidade, data_entrega, ca_numero, validade_ca)

#### **Normas e Regulamentações**
- `normas_regulamentadoras`: NRs (id, empresa_id, numero, descricao, numero_documento, termo)

#### **Avaliações**
- `avaliacao_reacao`: Avaliações de reação (id, turma_id, data_inicio, data_fim, ativo)
- `avaliacao_reacao_respostas`: Respostas das avaliações (id, avaliacao_id, colaborador_id, pergunta_id, resposta)

#### **Provas**
- `provas_treinamento`: Provas (id, turma_id, nome, descricao, data_aplicacao, ativo)
- `turma_colaborador_presencas`: Presenças em turmas (id, turma_id, colaborador_id, presente, assinatura_url, data_presenca)

#### **Certificados e Relatórios**
- `modelo_relatorio`: Modelos de relatório (id, empresa_id, nome, descricao, ativo)
- `modelo_relatorio_paginas`: Páginas dos modelos (id, modelo_id, numero_pagina, tipo_conteudo, dados_json)
- `informacoes_empresa`: Informações para relatórios (id, empresa_id, logo_url, assinatura_url, dados_json)
- `certificados_colaboradores`: Certificados gerados (id, colaborador_id, turma_id, data_emissao, arquivo_url)

#### **Toriq Corp (Gestão Empresarial)**
- `comercial_funil`: Funil de vendas (id, empresa_id, nome_lead, email, telefone, etapa, valor_estimado)
- `funil_cards`: Cards do funil (id, funil_id, titulo, descricao, etapa, status_negocio, orcamento_treinamento, orcamento_vertical365)
- `funil_card_atividades_movimentacoes`: Atividades e movimentações de cards
- `contas_receber`: Contas a receber (id, empresa_id, numero, cliente_id, valor, data_vencimento, status)
- `contas_pagar`: Contas a pagar (id, empresa_id, numero, fornecedor_id, valor, data_vencimento, status)
- `fornecedores`: Fornecedores (id, empresa_id, nome, cnpj, email, telefone)
- `contas_bancarias`: Contas bancárias (id, empresa_id, banco, agencia, conta, saldo)
- `plano_receitas`: Plano de receitas (id, empresa_id, mes, ano, valor_previsto)
- `plano_despesas`: Plano de despesas (id, empresa_id, mes, ano, valor_previsto)
- `condicoes_pagamento`: Condições de pagamento (id, empresa_id, nome, dias, desconto_percentual)

#### **Configurações**
- `configuracoes_empresa`: Configurações (id, empresa_id, logo_url, cor_primaria, cor_secundaria, tema)
- `empresas_modulos`: Módulos ativos por empresa (empresa_id, modulo_id, ativo)
- `modulos`: Módulos disponíveis (id, nome, descricao, rota)

### 3.2 Enums
```typescript
app_role: 'admin_vertical' | 'empresa_sst' | 'cliente_final' | 'empresa_parceira' | 'instrutor'
tipo_empresa: 'vertical_on' | 'sst' | 'cliente_final' | 'empresa_parceira' | 'lead'
grupo_acesso: 'administrador' | 'gestor' | 'colaborador'
```

### 3.3 Migrations
- **Total**: 130+ migrations
- **Padrão de nomenclatura**: YYYYMMDD_descricao.sql ou UUID-based
- **Últimas principais**:
  - Hierarquia: `20260102_add_gestor_id_hierarquia.sql`, `20260102_add_hierarquia_rls_policies.sql`
  - Orçamento: `20260103_create_orcamento_cliente_table.sql`
  - Toriq Corp: Múltiplas migrations para funil, contas, fornecedores
  - Treinamentos: Turmas, provas, avaliações, certificados

---

## 4. PÁGINAS E COMPONENTES PRINCIPAIS

### 4.1 Dashboards
1. **Dashboard.tsx**: Roteador genérico que redireciona baseado no role
2. **AdminDashboard.tsx**: Dashboard Admin Vertical - gerenciamento de todas as empresas
3. **SSTDashboard.tsx**: Dashboard Principal SST - hub central com sidebar
4. **ClienteDashboard.tsx**: Dashboard Cliente Final
5. **ParceiraDashboard.tsx**: Dashboard Empresa Parceira
6. **InstrutorDashboard.tsx**: Dashboard Instrutor

### 4.2 Módulos de Negócio (em `/pages/modulos/`)
1. **GestaoTreinamentos.tsx**: Gerenciamento de treinamentos
2. **GestaoTurmas.tsx**: Listagem de turmas
3. **GerenciarTurma.tsx**: Detalhes e gerenciamento de uma turma (238KB - arquivo grande)
4. **CatalogoTreinamentos.tsx**: Catálogo de treinamentos (77KB)
5. **MatrizTreinamentos.tsx**: Matriz de treinamentos por norma (55KB)
6. **GruposHomogeneos.tsx**: Gestão de grupos homogêneos
7. **Instrutores.tsx**: Gestão de instrutores (33KB)
8. **AvaliacaoReacao.tsx**: Avaliações de reação (49KB)
9. **GestaoEPI.tsx**: Gestão de EPIs
10. **SaudeOcupacional.tsx**: Gestão de saúde ocupacional
11. **GestaoTerceiros.tsx**: Gestão de terceiros
12. **ColaboradorDetalhes.tsx**: Detalhes de colaborador (45KB)

### 4.3 Componentes SST (em `/components/sst/`)
**Componentes principais**:
- `SSTSidebar.tsx`: Sidebar com navegação (29KB)
- `SSTClientes.tsx`: Gestão de clientes (75KB)
- `SSTConfiguracoes.tsx`: Configurações da empresa (93KB)
- `SSTAgendaTreinamentos.tsx`: Agenda de treinamentos (78KB)
- `SSTUsuarios.tsx`: Gestão de usuários (23KB)
- `SSTMeuPerfil.tsx`: Perfil do usuário (25KB)
- `SSTInformacoesEmpresa.tsx`: Informações da empresa (45KB)
- `SSTProvas.tsx`: Gestão de provas (36KB)
- `SSTSolicitacoesTreinamentos.tsx`: Solicitações de treinamento (28KB)
- `SSTEmpresasParceiras.tsx`: Gestão de parceiras (52KB)
- `SSTNormasRegulamentadoras.tsx`: Gestão de NRs (23KB)
- `SSTModeloRelatorio.tsx`: Modelos de relatório (42KB)

**Dialogs**:
- `InstrutorCadastroDialog.tsx`: Cadastro de instrutor (76KB)
- `ColaboradorDetalhesDialog.tsx`: Detalhes de colaborador (30KB)
- `ClienteDetalhesDialog.tsx`: Detalhes de cliente (17KB)
- `InstrutorDocumentosDialog.tsx`: Documentos do instrutor (27KB)
- `InstrutorDatasIndisponiveisDialog.tsx`: Datas indisponíveis (12KB)

**Toriq Corp** (em `/components/sst/toriq-corp/`):
- `ToriqCorpComercial.tsx`: Gestão comercial com funil Kanban
- `ToriqCorpAdministrativo.tsx`: Gestão administrativa
- `ToriqCorpFinanceiro.tsx`: Gestão financeira
- `ToriqCorpTecnico.tsx`: Gestão técnica
- `ToriqCorpMarketing.tsx`: Gestão de marketing
- `ToriqCorpConfiguracoes.tsx`: Configurações do Toriq Corp
- `FunilKanban.tsx`: Componente Kanban para funil

### 4.4 Rotas Públicas (em `/pages/public/`)
- `ProvaTurma.tsx`: Prova pública para colaboradores
- `CadastroColaboradorTurma.tsx`: Cadastro público de colaborador em turma
- `MarcarPresencaTurma.tsx`: Marcação de presença pública
- `PropostaWeb.tsx`: Visualização de proposta

### 4.5 Rotas do Instrutor (em `/pages/instrutor/`)
- `InstrutorDashboard.tsx`: Dashboard do instrutor
- `InstrutorGerenciarTurma.tsx`: Gerenciamento de turma pelo instrutor

### 4.6 Visualizações (em `/pages/certificado/` e `/pages/relatorio/`)
- `VisualizarCertificado.tsx`: Visualização de certificado
- `VisualizarRelatorio.tsx`: Visualização de relatório

---

## 5. FLUXOS DE NEGÓCIO PRINCIPAIS

### 5.1 Fluxo de Treinamento
```
1. SST cria Catálogo de Treinamentos
   ↓
2. SST cria Matriz de Treinamentos (vincula treinamentos a NRs)
   ↓
3. SST cria Grupos Homogêneos (vincula colaboradores por cargo/agente nocivo)
   ↓
4. SST vincula Treinamentos a Grupos Homogêneos
   ↓
5. SST cria Turma de Treinamento (seleciona treinamento, cliente, instrutor)
   ↓
6. Colaboradores são cadastrados na Turma
   ↓
7. Instrutor marca Presença dos colaboradores
   ↓
8. Prova é aplicada (se necessário)
   ↓
9. Certificado é gerado automaticamente
   ↓
10. Relatório é gerado com dados da turma
```

### 5.2 Fluxo de Solicitação de Treinamento
```
1. Cliente solicita treinamento
   ↓
2. SST recebe solicitação em "Solicitações de Treinamento"
   ↓
3. SST cria Turma baseada na solicitação
   ↓
4. Turma segue fluxo normal de treinamento
```

### 5.3 Fluxo de Avaliação de Reação
```
1. SST cria Avaliação de Reação para uma turma
   ↓
2. Define período de resposta (data_inicio, data_fim)
   ↓
3. Colaboradores acessam link público e respondem
   ↓
4. SST visualiza respostas e gera relatório
```

### 5.4 Fluxo Comercial (Toriq Corp)
```
1. Comercial cria Lead em "Funil"
   ↓
2. Lead é movido entre etapas (Prospecção → Proposta → Negociação → Fechado)
   ↓
3. Card pode ter atividades, movimentações, orçamentos
   ↓
4. Quando fechado, gera Conta a Receber
   ↓
5. Financeiro acompanha pagamento
```

### 5.5 Fluxo de Reorientação
```
1. Colaborador completa treinamento
   ↓
2. Após período de validade, precisa de reorientação
   ↓
3. SST cria Declaração de Reorientação
   ↓
4. Colaborador participa de reorientação
   ↓
5. Certificado de reorientação é gerado
```

---

## 6. FEATURES E FUNCIONALIDADES

### 6.1 Gestão de Usuários
- ✅ Cadastro de usuários por empresa
- ✅ Atribuição de roles (admin_vertical, empresa_sst, cliente_final, empresa_parceira, instrutor)
- ✅ Hierarquia de gestores (grupo_acesso: administrador, gestor, colaborador)
- ✅ Permissões por setor (visualizar, editar, criar)
- ✅ Modo empresa para admin acessar como SST
- ✅ Perfil de usuário com dados pessoais

### 6.2 Gestão de Treinamentos
- ✅ Catálogo de treinamentos com carga horária
- ✅ Matriz de treinamentos por NR
- ✅ Grupos homogêneos com treinamentos obrigatórios
- ✅ Criação de turmas com instrutor
- ✅ Aulas com datas e horários
- ✅ Presença de colaboradores
- ✅ Provas com notas
- ✅ Certificados automáticos
- ✅ Relatórios customizáveis
- ✅ Avaliação de reação

### 6.3 Gestão de Saúde
- ✅ Registro de exames ocupacionais (ASO)
- ✅ Gestão de EPIs com CA
- ✅ Validade de documentos
- ✅ Alertas de vencimento

### 6.4 Gestão Comercial (Toriq Corp)
- ✅ Funil de vendas Kanban
- ✅ Cards com atividades e movimentações
- ✅ Orçamentos de treinamento e vertical365
- ✅ Status de negócio
- ✅ Ações rápidas configuráveis

### 6.5 Gestão Financeira (Toriq Corp)
- ✅ Contas a receber com status
- ✅ Contas a pagar com fornecedores
- ✅ Plano de receitas e despesas
- ✅ Condições de pagamento
- ✅ Contas bancárias
- ✅ Relatórios financeiros

### 6.6 Gestão de Instrutores
- ✅ Cadastro de instrutores
- ✅ Formações e certificações
- ✅ Treinamentos que pode ministrar
- ✅ Documentos (certificados, formações)
- ✅ Datas indisponíveis
- ✅ Dashboard do instrutor

### 6.7 Gestão de Clientes
- ✅ Cadastro de clientes SST
- ✅ Vinculação com empresa cliente
- ✅ Responsável designado
- ✅ Contatos de cliente
- ✅ Categorias de cliente

### 6.8 Relatórios
- ✅ Modelos de relatório customizáveis
- ✅ Páginas com diferentes tipos de conteúdo
- ✅ Geração de PDF
- ✅ Logo e assinatura da empresa
- ✅ Variáveis dinâmicas

### 6.9 Importação/Exportação
- ✅ Importação de CSV (usa pipe `|` como delimitador)
- ✅ Exportação de dados em CSV
- ✅ Importação de NRs
- ✅ Importação de Matriz de Treinamentos

---

## 7. PADRÕES E CONVENÇÕES

### 7.1 Padrão de Componentes
- **shadcn/ui**: Componentes base reutilizáveis
- **Dialog/Modal**: Para operações CRUD
- **Sidebar**: Navegação principal
- **Cards**: Exibição de dados
- **Tables**: Listagem com filtros e paginação
- **Forms**: React Hook Form + Zod para validação

### 7.2 Padrão de Dados
- **CSV**: Usa pipe `|` como delimitador (não vírgula)
- **Datas**: ISO 8601 (YYYY-MM-DD)
- **Timestamps**: ISO 8601 com timezone
- **IDs**: UUID v4

### 7.3 Padrão de Componentes de Data
- **Calendar**: Componente customizado com seletores de mês/ano em português
- **DatePicker**: Usa react-day-picker com Calendar customizado

### 7.4 Padrão de Hooks
- **useAuth()**: Contexto de autenticação
- **usePermissoes()**: Permissões por setor + hierarquia
- **useHierarquia()**: Controle hierárquico
- **useEmpresaMode()**: Modo empresa para admin
- **useQuery/useMutation**: React Query para dados

### 7.5 Padrão de Roteamento
```
/                           # Home/Index
/auth                       # Login
/reset-password             # Reset de senha
/dashboard                  # Roteador genérico
/admin                      # Admin Vertical
/sst                        # SST Principal
/cliente                    # Cliente Final
/parceira                   # Empresa Parceira
/instrutor                  # Instrutor
/modulos/:moduloSlug        # Módulos genéricos
/modulos/gestao-turmas      # Gestão de turmas
/modulos/gestao-turmas/:id  # Gerenciar turma específica
/prova-turma/:turmaId       # Prova pública
/presenca-turma/:turmaId    # Presença pública
/certificado/visualizar     # Visualizar certificado
/relatorio/visualizar       # Visualizar relatório
/proposta/:propostaId       # Proposta pública
```

---

## 8. SEGURANÇA E RLS (Row Level Security)

### 8.1 Políticas RLS Implementadas
- ✅ Usuários veem apenas dados da sua empresa
- ✅ Hierarquia aplicada no banco (admin > gestor > colaborador)
- ✅ Instrutores veem apenas suas turmas
- ✅ Clientes veem apenas seus dados
- ✅ Público pode acessar rotas específicas (prova, presença, proposta)

### 8.2 Funções SQL de Segurança
- `get_user_empresa_id()`: Retorna empresa_id do usuário
- `get_user_role()`: Retorna role do usuário
- `has_role()`: Verifica se usuário tem role específico
- `get_subordinados()`: Retorna subordinados do gestor
- `get_usuarios_visiveis()`: Retorna usuários visíveis
- `pode_acessar_registro()`: Verifica acesso a registro

---

## 9. INTEGRAÇÕES E DEPENDÊNCIAS

### 9.1 Bibliotecas Principais
- **@supabase/supabase-js**: Cliente Supabase
- **@tanstack/react-query**: Gerenciamento de estado assíncrono
- **react-hook-form**: Gerenciamento de formulários
- **zod**: Validação de schemas
- **recharts**: Gráficos
- **jspdf + html2canvas**: Geração de PDF
- **lucide-react**: Ícones
- **sonner**: Notificações toast
- **@dnd-kit**: Drag and drop
- **date-fns**: Manipulação de datas

### 9.2 Variáveis de Ambiente
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## 10. ESTRUTURA DE DADOS IMPORTANTES

### 10.1 Profile (Usuário)
```typescript
{
  id: string;                    // UUID
  email: string;
  nome: string;
  role: app_role;               // admin_vertical | empresa_sst | cliente_final | empresa_parceira | instrutor
  empresa_id: string | null;
  grupo_acesso: 'administrador' | 'gestor' | 'colaborador' | null;
  gestor_id: string | null;     // ID do gestor direto
  setor_id: string | null;      // Setor da empresa
  created_at: string;
  updated_at: string;
}
```

### 10.2 Empresa
```typescript
{
  id: string;
  nome: string;
  tipo: 'vertical_on' | 'sst' | 'cliente_final' | 'empresa_parceira' | 'lead';
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  possui_gestao_treinamentos: boolean | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
```

### 10.3 Turma de Treinamento
```typescript
{
  id: string;
  empresa_id: string;
  numero_turma: number;
  cliente_id: string;
  treinamento_id: string;
  tipo_treinamento: string;
  carga_horaria_total: number;
  instrutor_id: string | null;
  quantidade_participantes: number | null;
  status: string;               // 'planejamento' | 'em_andamento' | 'finalizada' | 'cancelada'
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 11. ESTADO ATUAL DO DESENVOLVIMENTO

### 11.1 Migrations Recentes
- ✅ Hierarquia com grupo_acesso e gestor_id (20260102)
- ✅ RLS policies para hierarquia (20260102)
- ✅ Orçamento de cliente (20260103)
- ✅ Toriq Corp completo (funil, contas, fornecedores)
- ✅ Treinamentos com turmas, provas, certificados
- ✅ Avaliações de reação

### 11.2 Funcionalidades Ativas
- ✅ Autenticação completa
- ✅ Gestão de treinamentos
- ✅ Gestão de saúde ocupacional
- ✅ Gestão de EPIs
- ✅ Gestão comercial (Toriq Corp)
- ✅ Gestão financeira
- ✅ Relatórios
- ✅ Certificados
- ✅ Avaliações

### 11.3 Servidor de Desenvolvimento
- **Porta**: 8080
- **Comando**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`

---

## 12. PRÓXIMOS PASSOS RECOMENDADOS

1. **Testes**: Implementar testes unitários e E2E
2. **Performance**: Otimizar queries e lazy loading
3. **Documentação**: Documentar APIs e fluxos
4. **Monitoramento**: Implementar logs e monitoring
5. **Backup**: Configurar backup automático
6. **Escalabilidade**: Preparar para crescimento

---

## 13. CONTATOS E SUPORTE

- **Repositório Git**: Disponível em OneDrive/Desktop/toriq/vertical-on-sistema-de-sst
- **Supabase Project**: Configurado com migrations automáticas
- **Documentação Adicional**: DOCUMENTACAO_SISTEMA.md, DOCUMENTACAO_SISTEMA_RELATORIOS.md

---

**Última atualização**: 04 de Janeiro de 2026
**Versão do Sistema**: 0.0.0 (em desenvolvimento)
**Stack**: React 18.3 + TypeScript + Vite + Supabase
