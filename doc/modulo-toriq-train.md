# Toriq Train - Módulo de Gestão de Treinamentos

## Visão Geral

O **Toriq Train** é o módulo central de gestão de treinamentos do sistema Vertical ON. Permite às empresas de SST gerenciar todo o ciclo de vida dos treinamentos: desde o catálogo de cursos até a emissão de certificados, passando por agendamento, gestão de turmas, provas e avaliações.

## Objetivos do Módulo

- Centralizar a gestão de treinamentos de segurança do trabalho
- Automatizar processos de agendamento e alocação de instrutores
- Controlar validade de treinamentos por colaborador
- Gerar certificados e relatórios automaticamente
- Integrar com empresas parceiras e instrutores externos

## Arquitetura

```
Toriq Train
├── Configuração Base
│   ├── Catálogo de Treinamentos
│   ├── Matriz de Treinamentos
│   ├── Normas Regulamentadoras (NRs)
│   └── Grupos Homogêneos de Exposição
│
├── Recursos Humanos
│   ├── Instrutores (próprios e terceirizados)
│   └── Empresas Parceiras
│
├── Operacional
│   ├── Solicitações de Treinamentos
│   ├── Agenda de Treinamentos
│   ├── Gestão de Turmas
│   └── Gerenciamento de Turma (detalhado)
│
├── Avaliação
│   ├── Provas (Pré e Pós-teste)
│   ├── Avaliação de Reação
│   └── Declaração de Reorientação
│
└── Documentação
    └── Modelo de Relatório/Certificado
```

## Fluxo Principal

```
1. CONFIGURAÇÃO
   └── Cadastrar treinamentos no catálogo
   └── Definir matriz de treinamentos por cargo/função
   └── Cadastrar instrutores e empresas parceiras

2. SOLICITAÇÃO
   └── Cliente solicita treinamento
   └── SST recebe e analisa solicitação

3. AGENDAMENTO
   └── Criar turma na agenda
   └── Definir datas, horários e local
   └── Alocar instrutor (com verificação de disponibilidade)

4. EXECUÇÃO
   └── Aplicar pré-teste (opcional)
   └── Realizar treinamento
   └── Aplicar pós-teste
   └── Coletar avaliação de reação

5. CONCLUSÃO
   └── Registrar presença dos colaboradores
   └── Gerar certificados
   └── Atualizar status de treinamentos dos colaboradores
```

## Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `catalogo_treinamentos` | Catálogo de tipos de treinamentos |
| `matriz_treinamentos` | Matriz de treinamentos por cargo/função |
| `normas_regulamentadoras` | Normas Regulamentadoras (NRs) |
| `grupos_homogeneos` | Grupos Homogêneos de Exposição |
| `instrutores` | Cadastro de instrutores |
| `instrutor_formacoes` | Formações dos instrutores |
| `instrutor_treinamentos` | Treinamentos que o instrutor pode ministrar |
| `instrutor_formacao_treinamento` | Vínculo formação-treinamento com anexos |
| `instrutor_equipamentos` | Equipamentos do instrutor por treinamento |
| `instrutor_datas_indisponiveis` | Datas de indisponibilidade |
| `empresas_parceiras` | Empresas parceiras (fornecedoras de instrutores) |
| `turmas_treinamento` | Turmas de treinamento |
| `turmas_treinamento_aulas` | Aulas/datas de cada turma |
| `turma_colaboradores` | Colaboradores inscritos na turma |
| `colaboradores_temporarios` | Colaboradores pendentes de aprovação |
| `provas_treinamento` | Provas (pré e pós-teste) |
| `provas_questoes` | Questões das provas |
| `provas_alternativas` | Alternativas das questões |
| `provas_respostas` | Respostas dos colaboradores |
| `avaliacoes_reacao` | Avaliações de reação dos treinamentos |
| `declaracoes_reorientacao` | Declarações de reorientação |
| `treinamentos` | Registro de treinamentos realizados (legado) |
| `colaboradores_treinamentos` | Status de treinamento por colaborador |

## Componentes Principais

### Páginas (src/pages/modulos/)
- `CatalogoTreinamentos.tsx` - Gestão do catálogo de treinamentos
- `MatrizTreinamentos.tsx` - Matriz de treinamentos por cargo
- `GestaoTurmas.tsx` - Lista e gestão de turmas
- `GerenciarTurma.tsx` - Gerenciamento detalhado de uma turma
- `GestaoTreinamentos.tsx` - Gestão de treinamentos (legado)
- `Instrutores.tsx` - Gestão de instrutores
- `GruposHomogeneos.tsx` - Grupos homogêneos de exposição
- `AvaliacaoReacao.tsx` - Avaliações de reação

### Componentes SST (src/components/sst/)
- `SSTAgendaTreinamentos.tsx` - Agenda visual de treinamentos
- `SSTSolicitacoesTreinamentos.tsx` - Solicitações de treinamentos
- `SSTProvas.tsx` - Gestão de provas
- `SSTDeclaracaoReorientacao.tsx` - Declarações de reorientação
- `SSTNormasRegulamentadoras.tsx` - Gestão de NRs
- `SSTEmpresasParceiras.tsx` - Empresas parceiras
- `SSTModeloRelatorio.tsx` - Modelos de relatório/certificado
- `InstrutorCadastroDialog.tsx` - Dialog de cadastro de instrutor
- `InstrutorDocumentosDialog.tsx` - Documentos do instrutor
- `InstrutorDatasIndisponiveisDialog.tsx` - Datas indisponíveis

### Componentes Instrutor (src/components/instrutor/)
- `InstrutorInicio.tsx` - Dashboard do instrutor
- `InstrutorGestaoTurmas.tsx` - Turmas do instrutor
- `InstrutorAgendaTreinamentos.tsx` - Agenda do instrutor
- `InstrutorMeuPerfil.tsx` - Perfil e documentos
- `InstrutorSolicitarIndisponibilidade.tsx` - Solicitar indisponibilidade

### Componentes de Turma (src/components/turma/)
- `ColaboradorPendenteCard.tsx` - Card de colaborador pendente
- `ColaboradoresPendentesList.tsx` - Lista de pendentes

## Funcionalidades por Perfil

### Empresa SST
- Acesso completo a todas as funcionalidades
- Gestão de catálogo, matriz, instrutores
- Criação e gerenciamento de turmas
- Emissão de certificados
- Relatórios e dashboards

### Instrutor
- Visualização de turmas atribuídas
- Agenda pessoal de treinamentos
- Gestão de perfil e documentos
- Solicitação de indisponibilidade
- Registro de presença (via app)

### Empresa Parceira
- Gestão de instrutores próprios
- Visualização de turmas dos instrutores
- Controle de indisponibilidades

### Cliente Final
- Solicitação de treinamentos
- Acompanhamento de turmas
- Visualização de certificados
- Cadastro de colaboradores para turmas

## Integrações

- **Google Maps API**: Cálculo de distância entre instrutor e local do treinamento
- **Supabase Storage**: Armazenamento de documentos, fotos e certificados
- **PDF Generation**: Geração de certificados e relatórios (jsPDF + html2canvas)

## Permissões

O módulo utiliza o sistema de permissões padrão:
- Módulo ID: `toriq_train`
- Páginas controladas via `usePermissoes`
- Hierarquia de acesso via `useHierarquia`

## Status de Turma

| Status | Descrição |
|--------|-----------|
| `rascunho` | Turma em criação |
| `agendado` | Turma agendada, aguardando execução |
| `em_andamento` | Treinamento em execução |
| `concluido` | Treinamento finalizado |
| `cancelado` | Turma cancelada |

## Aptidão de Instrutor

Um instrutor é considerado **APTO** quando:
1. Possui pelo menos uma formação cadastrada
2. Todas as formações possuem anexo (certificado)
3. Possui pelo menos um treinamento vinculado
4. Todos os treinamentos possuem anexo (comprovante)

## Importação de Dados

O módulo suporta importação via CSV (delimitador `|`) para:
- Catálogo de Treinamentos
- Matriz de Treinamentos
- Normas Regulamentadoras

Templates padrão disponíveis com dados de NRs comuns.
