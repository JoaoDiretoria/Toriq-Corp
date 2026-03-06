# Toriq Train - Documentação Detalhada por Página

## Índice

1. [Dashboard Toriq Training](#1-dashboard-toriq-training)
2. [Catálogo de Treinamentos](#2-catálogo-de-treinamentos)
3. [Matriz de Treinamentos](#3-matriz-de-treinamentos)
4. [Normas Regulamentadoras](#4-normas-regulamentadoras)
5. [Grupos Homogêneos](#5-grupos-homogêneos)
6. [Instrutores](#6-instrutores)
7. [Empresas Parceiras](#7-empresas-parceiras)
8. [Solicitações de Treinamentos](#8-solicitações-de-treinamentos)
9. [Agenda de Treinamentos](#9-agenda-de-treinamentos)
10. [Gestão de Turmas](#10-gestão-de-turmas)
11. [Gerenciar Turma](#11-gerenciar-turma)
12. [Provas](#12-provas)
13. [Avaliação de Reação](#13-avaliação-de-reação)
14. [Declaração de Reorientação](#14-declaração-de-reorientação)
15. [Modelo de Relatório](#15-modelo-de-relatório)

---

## 1. Dashboard Toriq Training

**Arquivo**: `src/components/sst/toriq-training/ToriqTrainingDashboard.tsx`

### Descrição
Dashboard central do módulo Toriq Train com visão geral de métricas e indicadores de treinamentos.

### Funcionalidades
- Resumo de turmas por status (agendadas, em andamento, concluídas)
- Indicadores de treinamentos do mês
- Próximos treinamentos agendados
- Alertas de vencimento de treinamentos
- Gráficos de desempenho

### Métricas Exibidas
- Total de turmas
- Turmas agendadas
- Turmas em andamento
- Turmas concluídas
- Colaboradores treinados no período

---

## 2. Catálogo de Treinamentos

**Arquivo**: `src/pages/modulos/CatalogoTreinamentos.tsx`

### Descrição
Gerenciamento do catálogo de tipos de treinamentos disponíveis na empresa SST.

### Funcionalidades

#### CRUD de Treinamentos
- **Criar**: Adicionar novo tipo de treinamento
- **Visualizar**: Lista com busca e filtros
- **Editar**: Alterar dados do treinamento
- **Excluir**: Remover treinamento (com confirmação)

#### Campos do Treinamento
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `norma` | String | Número da NR (ex: "35", "10") |
| `nome` | String | Nome do treinamento |
| `ch_formacao` | Number | Carga horária formação inicial |
| `ch_reciclagem` | Number | Carga horária reciclagem |
| `validade` | String | Período de validade (Anual, Bienal, etc.) |
| `conteudo_programatico` | Text | Conteúdo programático do curso |
| `ch_formacao_obrigatoria` | Boolean | Se CH formação é obrigatória |
| `ch_reciclagem_obrigatoria` | Boolean | Se CH reciclagem é obrigatória |

#### Importação/Exportação
- **Importar CSV**: Upload de arquivo CSV com delimitador `|`
- **Exportar CSV**: Download dos dados em CSV
- **Template Vazio**: Download de template para preenchimento
- **Template Padrão**: Download com treinamentos padrão das NRs

#### Formato CSV
```
Norma|Nome|CH Formação|CH Reciclagem|Validade|Conteúdo Programático|Obrigatório CH Formação?|Obrigatório CH Reciclagem?
35|Trabalho em Altura|8|8|Bienal|Normas e regulamentos...|SIM|SIM
```

### Tabela do Banco
- `catalogo_treinamentos`

---

## 3. Matriz de Treinamentos

**Arquivo**: `src/pages/modulos/MatrizTreinamentos.tsx`

### Descrição
Define quais treinamentos são obrigatórios para cada cargo/função, vinculando aos agentes nocivos ou perigos relacionados.

### Funcionalidades

#### CRUD de Matriz
- Vincular treinamento a agente nocivo/perigo
- Listar matriz com filtros por NR
- Editar vínculos existentes
- Excluir vínculos

#### Campos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `norma` | String | Número da NR |
| `treinamento_id` | UUID | Referência ao catálogo |
| `agente_nocivo` | String | Agente nocivo ou perigo relacionado |

#### Importação/Exportação
- Importar/Exportar via CSV (delimitador `|`)
- Templates disponíveis

#### Formato CSV
```
Norma|Treinamento|Agente nocivo / Perigo relacionado
35|Trabalho em Altura|Queda em altura
10|Básico|Risco elétrico, choque elétrico
```

### Tabela do Banco
- `matriz_treinamentos`

---

## 4. Normas Regulamentadoras

**Arquivo**: `src/components/sst/SSTNormasRegulamentadoras.tsx`

### Descrição
Cadastro e gestão das Normas Regulamentadoras (NRs) utilizadas no sistema.

### Funcionalidades
- CRUD de NRs
- Importação via CSV
- Vinculação automática com treinamentos

#### Campos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nr` | String | Número da NR (ex: "35") |
| `descricao` | String | Descrição da norma |

### Tabela do Banco
- `normas_regulamentadoras`

---

## 5. Grupos Homogêneos

**Arquivo**: `src/pages/modulos/GruposHomogeneos.tsx`

### Descrição
Gestão de Grupos Homogêneos de Exposição (GHE), agrupando trabalhadores com exposições ocupacionais similares.

### Funcionalidades
- CRUD de grupos homogêneos
- Vinculação de treinamentos obrigatórios por grupo
- Associação de colaboradores aos grupos

### Tabela do Banco
- `grupos_homogeneos`

---

## 6. Instrutores

**Arquivo**: `src/pages/modulos/Instrutores.tsx`

### Descrição
Gestão completa de instrutores próprios e de empresas parceiras.

### Funcionalidades

#### Cadastro de Instrutor
- Dados pessoais (nome, CPF, email, telefone)
- Endereço completo (para cálculo de distância)
- Vinculação com usuário do sistema (opcional)
- Vinculação com empresa parceira (se terceirizado)

#### Gestão de Formações
- Cadastro de formações acadêmicas/profissionais
- Upload de certificados/diplomas
- Vinculação formação → treinamentos habilitados

#### Gestão de Treinamentos
- Treinamentos que o instrutor pode ministrar
- Anexo de comprovantes por treinamento
- Controle de aptidão

#### Equipamentos
- Cadastro de equipamentos próprios por treinamento
- Indicador se possui equipamentos para ministrar

#### Datas Indisponíveis
- Cadastro de períodos de indisponibilidade
- Visualização em calendário
- Considerado no agendamento de turmas

### Indicador de Aptidão
O instrutor é marcado como **APTO** quando:
1. ✅ Possui pelo menos uma formação com anexo
2. ✅ Possui pelo menos um treinamento com anexo
3. ✅ Todos os vínculos possuem documentação

### Componentes Relacionados
- `InstrutorCadastroDialog.tsx` - Dialog de cadastro/edição
- `InstrutorDocumentosDialog.tsx` - Gestão de documentos
- `InstrutorDatasIndisponiveisDialog.tsx` - Gestão de indisponibilidades

### Tabelas do Banco
- `instrutores`
- `instrutor_formacoes`
- `instrutor_treinamentos`
- `instrutor_formacao_treinamento`
- `instrutor_equipamentos`
- `instrutor_datas_indisponiveis`

---

## 7. Empresas Parceiras

**Arquivo**: `src/components/sst/SSTEmpresasParceiras.tsx`

### Descrição
Gestão de empresas parceiras que fornecem instrutores para a empresa SST.

### Funcionalidades
- CRUD de empresas parceiras
- Dados cadastrais (CNPJ, razão social, contato)
- Vinculação de instrutores à parceira
- Controle de contratos e acordos

### Tabela do Banco
- `empresas_parceiras`

---

## 8. Solicitações de Treinamentos

**Arquivo**: `src/components/sst/SSTSolicitacoesTreinamentos.tsx`

### Descrição
Gerenciamento de solicitações de treinamentos recebidas dos clientes.

### Funcionalidades

#### Recebimento de Solicitações
- Visualização de solicitações pendentes
- Detalhes do treinamento solicitado
- Informações do cliente solicitante
- Quantidade de colaboradores

#### Processamento
- Aprovar solicitação → Criar turma
- Recusar solicitação → Informar motivo
- Solicitar mais informações

#### Status de Solicitação
| Status | Descrição |
|--------|-----------|
| `pendente` | Aguardando análise |
| `aprovada` | Aprovada, turma criada |
| `recusada` | Recusada pela SST |
| `cancelada` | Cancelada pelo cliente |

### Tabela do Banco
- `solicitacoes_treinamento`

---

## 9. Agenda de Treinamentos

**Arquivo**: `src/components/sst/SSTAgendaTreinamentos.tsx`

### Descrição
Visualização e gestão da agenda de treinamentos em formato de calendário.

### Funcionalidades

#### Visualização
- Calendário mensal com turmas
- Navegação por mês/ano
- Filtros por status, cliente, treinamento
- Visualização por semana

#### Criação de Turma
- Seleção de cliente
- Seleção de treinamento
- Definição de tipo (Formação/Reciclagem)
- Agendamento de aulas (múltiplas datas)
- Definição de horários por aula
- Quantidade de participantes

#### Atribuição de Instrutor
- Lista de instrutores habilitados para o treinamento
- Verificação de disponibilidade nas datas
- Cálculo de distância até o local (Google Maps API)
- Indicador de equipamentos próprios
- Status de contato com instrutor

#### Validação de Turma
- Turma precisa ser validada para aparecer em "Gestão de Turmas"
- Validação requer: instrutor atribuído, datas definidas

### Estados de Contato com Instrutor
- Irá ministrar o treinamento
- Irá verificar na agenda
- Não consegue atender nessa data
- Consegue atender mas cobra mais caro
- Não respondeu o contato
- Não retornou o contato
- Entrar em contato em outro horário
- Tem que procurar

### Tabelas do Banco
- `turmas_treinamento`
- `turmas_treinamento_aulas`

---

## 10. Gestão de Turmas

**Arquivo**: `src/pages/modulos/GestaoTurmas.tsx`

### Descrição
Lista e gestão de turmas validadas, com visão de status e ações rápidas.

### Funcionalidades

#### Dashboard de Turmas
- Cards com estatísticas:
  - Total de turmas
  - Agendadas
  - Em andamento
  - Concluídas

#### Lista de Turmas
- Tabela com todas as turmas validadas
- Filtros por status
- Busca por treinamento, cliente, instrutor
- Ordenação por data

#### Informações Exibidas
- Código/número da turma
- Treinamento (NR + nome)
- Tipo (Formação/Reciclagem)
- Cliente
- Datas (início - fim)
- Instrutor
- Status de gestão (pendente/completo)
- Status da turma

#### Ações
- Clicar na turma → Abre "Gerenciar Turma"
- Botão "Gerenciar Turma"

### Status Calculado
O status é calculado automaticamente baseado nas datas:
- **Agendado**: Data início no futuro
- **Em Andamento**: Entre data início e fim
- **Concluído**: Após data fim (ou marcado manualmente)
- **Cancelado**: Marcado manualmente

---

## 11. Gerenciar Turma

**Arquivo**: `src/pages/modulos/GerenciarTurma.tsx`

### Descrição
Página completa de gerenciamento de uma turma específica, com todas as funcionalidades operacionais.

### Abas Disponíveis

#### Aba: Geral
- Informações da turma (treinamento, cliente, datas)
- Instrutor atribuído e formação
- Status atual
- Código da turma

#### Aba: Lista de Presença
**Funcionalidades:**
- Lista de colaboradores inscritos
- Registro de presença por aula
- Coleta de assinatura digital
- Validação facial (foto de validação)
- Adicionar colaboradores:
  - Selecionar da empresa cliente
  - Cadastrar novo colaborador
  - QR Code para auto-cadastro
- Colaboradores pendentes de aprovação
- Busca de colaboradores

**Validação Facial:**
- Captura de foto via câmera
- Comparação com foto cadastrada
- Registro de similaridade
- Metadados: dispositivo, localização, horário

**Assinatura Digital:**
- Coleta de assinatura por aula
- Assinatura para certificado

#### Aba: Anexos
**Tipos de Anexos:**
- Lista de presença (PDF gerado)
- Galeria de fotos do treinamento
- Cases de sucesso
- Avaliações
- Relatórios

**Funcionalidades:**
- Upload de arquivos
- Visualização de imagens
- Download de documentos
- Geração automática de lista de presença

#### Aba: Provas e Sinistros
**Provas:**
- QR Code para acesso à prova
- Visualização de gabarito
- Registrar prova manualmente (pelo instrutor)
- Notas de pré-teste e pós-teste
- Resultado (aprovado/reprovado/aguardando)

**Sinistros:**
- Registro de ocorrências durante treinamento
- Tipos de sinistro configuráveis
- Ação tomada (reprovação, advertência, etc.)
- Fotos do sinistro
- Descrição detalhada

#### Aba: Avaliação de Reação
- Visualização de avaliações respondidas
- Marcar como case de sucesso
- Estatísticas de satisfação

#### Aba: Certificados
- Lista de colaboradores aprovados
- Status do certificado (pendente/gerado)
- Assinatura para certificado
- Validação em lote
- Download de certificados
- Visualização de certificado

### Componentes Relacionados
- `ColaboradorPendenteCard.tsx`
- `ColaboradoresPendentesList.tsx`
- `AvaliacaoReacaoForm.tsx`
- `AvaliacaoReacaoResultados.tsx`
- `ReorientacaoViewDialog.tsx`
- `SignaturePad.tsx`
- `SignaturePadSimple.tsx`

### Tabelas do Banco
- `turma_colaboradores`
- `colaboradores_temporarios`
- `turma_anexos`
- `provas_respostas`
- `sinistros_turma`
- `sinistros_turma_fotos`
- `avaliacoes_reacao`
- `certificados`

---

## 12. Provas

**Arquivo**: `src/components/sst/SSTProvas.tsx`

### Descrição
Gestão de provas (pré-teste e pós-teste) para os treinamentos.

### Funcionalidades

#### CRUD de Provas
- Criar prova para treinamento
- Selecionar tipo: Pré-teste e/ou Pós-teste
- Editar questões
- Excluir prova

#### Gestão de Questões
- Adicionar questões (múltipla escolha ou V/F)
- Definir alternativas (A, B, C, D, E)
- Marcar alternativa correta
- Ordenar questões
- Editar/excluir questões

#### Tipos de Questão
| Tipo | Descrição |
|------|-----------|
| `selecao` | Múltipla escolha (A-E) |
| `vf` | Verdadeiro ou Falso |

#### Compartilhamento
- Provas do mesmo treinamento compartilham questões
- Editar uma atualiza todas as relacionadas

### Aplicação da Prova
- Via QR Code (colaborador acessa pelo celular)
- Via instrutor (registro manual)
- Correção automática
- Cálculo de nota

### Tabelas do Banco
- `provas_treinamento`
- `provas_questoes`
- `provas_alternativas`
- `provas_respostas`

---

## 13. Avaliação de Reação

**Arquivo**: `src/pages/modulos/AvaliacaoReacao.tsx`

### Descrição
Gestão e visualização das avaliações de reação dos treinamentos (feedback dos participantes).

### Funcionalidades
- Visualização de avaliações por turma
- Estatísticas de satisfação
- Identificação de cases de sucesso
- Exportação de dados

### Campos Avaliados
- Satisfação geral
- Qualidade do instrutor
- Material didático
- Infraestrutura
- Aplicabilidade do conteúdo
- Sugestões e comentários

### Componentes Relacionados
- `AvaliacaoReacaoForm.tsx` - Formulário de avaliação
- `AvaliacaoReacaoResultados.tsx` - Exibição de resultados

### Tabela do Banco
- `avaliacoes_reacao`

---

## 14. Declaração de Reorientação

**Arquivo**: `src/components/sst/SSTDeclaracaoReorientacao.tsx`

### Descrição
Gestão de declarações de reorientação para colaboradores que não atingiram nota mínima.

### Funcionalidades
- Visualização de colaboradores que precisam de reorientação
- Registro de reorientação realizada
- Upload de declaração assinada
- Coleta de assinatura digital

### Fluxo de Reorientação
1. Colaborador reprova no pós-teste
2. Instrutor realiza reorientação (revisão do conteúdo)
3. Colaborador assina declaração
4. Status atualizado para "reorientado"
5. Colaborador pode ser aprovado

### Componentes Relacionados
- `ReorientacaoViewDialog.tsx` - Visualização de reorientação

### Tabela do Banco
- `declaracoes_reorientacao`

---

## 15. Modelo de Relatório

**Arquivo**: `src/components/sst/SSTModeloRelatorio.tsx`

### Descrição
Configuração de modelos de relatório e certificado para os treinamentos.

### Funcionalidades
- Configuração de template de certificado
- Variáveis dinâmicas
- Preview do certificado
- Configuração de logo e assinaturas

### Variáveis Disponíveis
| Variável | Descrição |
|----------|-----------|
| `{{nome_colaborador}}` | Nome do colaborador |
| `{{cpf}}` | CPF do colaborador |
| `{{treinamento}}` | Nome do treinamento |
| `{{norma}}` | Número da NR |
| `{{carga_horaria}}` | Carga horária |
| `{{data_realizacao}}` | Data do treinamento |
| `{{data_validade}}` | Data de validade |
| `{{instrutor}}` | Nome do instrutor |
| `{{empresa_cliente}}` | Nome da empresa cliente |
| `{{empresa_sst}}` | Nome da empresa SST |

### Componentes Relacionados
- `VariaveisRelatorio.tsx` - Lista de variáveis disponíveis

---

## Painel do Instrutor

### InstrutorInicio.tsx
Dashboard do instrutor com:
- Próximos treinamentos
- Turmas em andamento
- Estatísticas pessoais
- Alertas e notificações

### InstrutorGestaoTurmas.tsx
Lista de turmas do instrutor:
- Turmas atribuídas
- Filtros por status
- Acesso ao gerenciamento

### InstrutorAgendaTreinamentos.tsx
Agenda pessoal do instrutor:
- Visualização de compromissos
- Datas de treinamentos
- Indisponibilidades

### InstrutorMeuPerfil.tsx
Perfil do instrutor:
- Dados pessoais
- Formações e certificados
- Treinamentos habilitados
- Equipamentos
- Alterar senha

### InstrutorSolicitarIndisponibilidade.tsx
Solicitação de indisponibilidade:
- Cadastro de períodos
- Motivo da indisponibilidade
- Aprovação pela empresa parceira/SST

---

## Fluxo Completo de um Treinamento

```
1. CONFIGURAÇÃO INICIAL
   ├── Cadastrar treinamento no catálogo
   ├── Definir na matriz de treinamentos
   ├── Cadastrar instrutor habilitado
   └── Criar prova (pré e pós-teste)

2. SOLICITAÇÃO
   ├── Cliente solicita treinamento
   └── SST aprova e cria turma

3. AGENDAMENTO (Agenda de Treinamentos)
   ├── Definir datas e horários
   ├── Selecionar cliente
   ├── Definir quantidade de participantes
   ├── Atribuir instrutor
   └── Validar turma

4. PRÉ-TREINAMENTO (Gerenciar Turma)
   ├── Adicionar colaboradores
   ├── Aprovar colaboradores pendentes
   └── Gerar QR Code de presença

5. EXECUÇÃO
   ├── Aplicar pré-teste
   ├── Realizar treinamento
   ├── Registrar presença por aula
   ├── Coletar assinaturas
   ├── Validação facial
   ├── Registrar fotos/evidências
   └── Aplicar pós-teste

6. PÓS-TREINAMENTO
   ├── Verificar resultados das provas
   ├── Realizar reorientação (se necessário)
   ├── Coletar avaliação de reação
   ├── Registrar sinistros (se houver)
   └── Gerar lista de presença

7. CONCLUSÃO
   ├── Coletar assinatura para certificado
   ├── Validar certificados
   ├── Gerar certificados PDF
   └── Finalizar turma
```
