# Toriq Train - Documentação Detalhada das Páginas

Este documento detalha cada página/componente do módulo de Gestão de Treinamentos.

---

## Índice

1. [Catálogo de Treinamentos](#1-catálogo-de-treinamentos)
2. [Matriz de Treinamentos](#2-matriz-de-treinamentos)
3. [Solicitações de Treinamentos](#3-solicitações-de-treinamentos)
4. [Agenda de Treinamentos](#4-agenda-de-treinamentos)
5. [Gestão de Turmas](#5-gestão-de-turmas)
6. [Gerenciar Turma](#6-gerenciar-turma)
7. [Provas](#7-provas)
8. [Instrutores](#8-instrutores)
9. [Empresas Parceiras](#9-empresas-parceiras)
10. [Avaliação de Reação](#10-avaliação-de-reação)
11. [Declaração de Reorientação](#11-declaração-de-reorientação)

---

## 1. Catálogo de Treinamentos

### CatalogoTreinamentos.tsx
**Arquivo**: `src/pages/modulos/CatalogoTreinamentos.tsx`

**Descrição**: Cadastro e gestão dos tipos de treinamentos disponíveis na empresa SST.

**Funcionalidades**:
- **CRUD Completo**: Criar, editar, excluir treinamentos
- **Busca**: Filtro por nome ou NR
- **Importação CSV**: Upload de arquivo com delimitador pipe (`|`)
- **Exportação CSV**: Download dos dados cadastrados
- **Templates**: Download de template vazio ou com dados padrão

**Campos do Treinamento**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| norma | string | Número da NR (ex: 10, 35) |
| nome | string | Nome do treinamento |
| ch_formacao | number | Carga horária de formação (horas) |
| ch_reciclagem | number | Carga horária de reciclagem (horas) |
| validade | string | Validade (Anual, Bienal, etc.) |
| conteudo_programatico | text | Conteúdo programático detalhado |
| ch_formacao_obrigatoria | boolean | Se CH formação é obrigatória |
| ch_reciclagem_obrigatoria | boolean | Se CH reciclagem é obrigatória |

**Formato CSV**:
```
Norma|Nome|CH Formação|CH Reciclagem|Validade|Conteúdo Programático|Obrigatório CH Formação?|Obrigatório CH Reciclagem?
10|Básico|40|8|Bienal|Conteúdo...|SIM|NÃO
```

**Treinamentos Padrão Incluídos**:
- NR 5 - CIPA (1, 2, 3, 4)
- NR 6 - Utilização e Conservação de EPI
- NR 10 - Básico, SEP, Áreas Classificadas
- NR 11 - Empilhadeira, Escavadeira, Guindaste
- NR 12 - Máquinas e Equipamentos
- NR 18 - Construção Civil
- NR 33 - Espaços Confinados
- NR 35 - Trabalho em Altura

---

## 2. Matriz de Treinamentos

### MatrizTreinamentos.tsx
**Arquivo**: `src/pages/modulos/MatrizTreinamentos.tsx`

**Descrição**: Vinculação de treinamentos a agentes nocivos e perigos relacionados.

**Funcionalidades**:
- **CRUD Completo**: Criar, editar, excluir vínculos
- **Busca**: Filtro por treinamento ou agente nocivo
- **Importação CSV**: Upload com delimitador pipe (`|`)
- **Exportação CSV**: Download dos dados
- **Seleção de Treinamento**: Lista do catálogo cadastrado

**Campos da Matriz**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| norma | string | NR do treinamento |
| treinamento_id | uuid | ID do treinamento no catálogo |
| treinamento_nome | string | Nome do treinamento |
| agente_nocivo | string | Agente nocivo ou perigo relacionado |

**Formato CSV**:
```
Norma|Treinamento|Agente nocivo / Perigo relacionado
10|Básico|Eletricidade
35|Trabalho em Altura|Queda de altura
```

---

## 3. Solicitações de Treinamentos

### SSTSolicitacoesTreinamentos.tsx
**Arquivo**: `src/components/sst/SSTSolicitacoesTreinamentos.tsx`

**Descrição**: Gestão das solicitações de treinamento recebidas dos clientes.

**Funcionalidades**:
- **Listagem**: Tabela com todas as solicitações
- **Filtros**: Por status (Pendente, Aceito, Recusado)
- **Detalhes**: Visualização completa da solicitação
- **Aceitar**: Cria turma automaticamente na agenda
- **Recusar**: Com motivo obrigatório

**Campos da Solicitação**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| numero_solicitacao | number | Número sequencial |
| nr_treinamento | string | NR do treinamento |
| nome_treinamento | string | Nome do treinamento |
| tipo | string | Inicial, Periódico, Eventual |
| quantidade_participantes | number | Quantidade de participantes |
| datas_treinamento | string | Datas propostas |
| observacoes | text | Observações do cliente |
| status | enum | pendente, aceito, recusado |
| solicitante_empresa_nome | string | Nome da empresa solicitante |

**Status das Solicitações**:
| Status | Cor | Descrição |
|--------|-----|-----------|
| pendente | Amarelo | Aguardando análise |
| aceito | Verde | Aceito e turma criada |
| recusado | Vermelho | Recusado com motivo |

**Fluxo ao Aceitar**:
1. Atualiza status para "aceito"
2. Busca próximo número de turma
3. Busca carga horária do treinamento
4. Cria turma na tabela `turmas_treinamento`
5. Cria aulas na tabela `turmas_treinamento_aulas`
6. Adiciona colaboradores à turma

---

## 4. Agenda de Treinamentos

### SSTAgendaTreinamentos.tsx
**Arquivo**: `src/components/sst/SSTAgendaTreinamentos.tsx`

**Descrição**: Calendário visual para gestão de turmas de treinamento.

**Funcionalidades**:
- **Visualização Calendário**: Mensal com navegação
- **Criação de Turmas**: Dialog completo
- **Edição de Turmas**: Alterar dados da turma
- **Atribuição de Instrutor**: Com cálculo de distância
- **Validação de Turma**: Enviar para Gestão de Turmas
- **Filtros**: Por cliente, treinamento, instrutor

**Campos da Turma**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| numero_turma | number | Número sequencial |
| cliente_id | uuid | Cliente vinculado |
| treinamento_id | uuid | Treinamento do catálogo |
| tipo_treinamento | enum | Inicial, Periódico, Eventual |
| instrutor_id | uuid | Instrutor atribuído |
| quantidade_participantes | number | Quantidade de participantes |
| status | enum | agendado, em_andamento, concluido, cancelado |
| validado | boolean | Se foi validada para gestão |
| aulas | array | Lista de aulas com data/horário |

**Status das Turmas**:
| Status | Cor | Ícone | Descrição |
|--------|-----|-------|-----------|
| agendado | Azul | Calendar | Turma agendada |
| em_andamento | Amarelo | PlayCircle | Em execução |
| concluido | Verde | CheckCircle | Finalizada |
| cancelado | Vermelho | XCircle | Cancelada |

**Atribuição de Instrutor**:
- Lista instrutores disponíveis
- Filtra por treinamentos que pode ministrar
- Calcula distância até o cliente (Google Maps API)
- Mostra equipamentos próprios
- Verifica datas indisponíveis
- Ordenação por distância, equipamentos ou nome

**Campos da Aula**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| data | date | Data da aula |
| hora_inicio | time | Horário de início |
| hora_fim | time | Horário de término |
| horas | number | Duração em horas |

---

## 5. Gestão de Turmas

### GestaoTurmas.tsx
**Arquivo**: `src/pages/modulos/GestaoTurmas.tsx`

**Descrição**: Lista de turmas validadas para gestão completa.

**Funcionalidades**:
- **Listagem**: Tabela com turmas validadas
- **Estatísticas**: Cards com totais por status
- **Filtros**: Por status, busca por texto
- **Navegação**: Acesso à gestão completa da turma

**Cards de Estatísticas**:
- Total de Turmas
- Agendadas
- Em Andamento
- Concluídas

**Colunas da Tabela**:
| Coluna | Descrição |
|--------|-----------|
| Turma | Código ou número da turma |
| Treinamento | Nome e tipo do treinamento |
| Empresa | Cliente vinculado |
| Data | Data início e fim |
| Instrutor | Nome do instrutor |
| Gestão | Se tem instrutor e participantes |
| Status | Status atual |
| Ações | Botão "Gerenciar Turma" |

---

## 6. Gerenciar Turma

### GerenciarTurma.tsx
**Arquivo**: `src/pages/modulos/GerenciarTurma.tsx`

**Descrição**: Gestão completa de uma turma específica. Componente mais complexo do módulo (~7000 linhas).

**Abas Disponíveis**:

### 6.1 Aba Geral
- Informações da turma
- Dados do cliente
- Dados do treinamento
- Instrutor atribuído
- Datas das aulas

### 6.2 Aba Lista de Presença
**Funcionalidades**:
- Adicionar colaboradores (existentes ou novos)
- Marcar presença por aula
- Assinatura digital por aula
- Validação facial com geolocalização
- QR Code para presença pública
- Exportar lista de presença em PDF

**Campos do Colaborador na Turma**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| colaborador_id | uuid | ID do colaborador |
| nome | string | Nome completo |
| cpf | string | CPF |
| matricula | string | Matrícula na empresa |
| foto_url | string | URL da foto |
| presente | boolean | Presença geral |
| presencas | json | Presença por aula |
| assinaturas | json | Assinatura por aula |
| fotoValidacoes | json | Validação facial por aula |

**Validação Facial**:
- Captura foto via câmera
- Compara com foto cadastrada
- Registra similaridade (%)
- Registra geolocalização
- Registra dispositivo e horário

### 6.3 Aba Provas
**Funcionalidades**:
- Visualizar provas vinculadas
- Gerar QR Code para aplicação
- Ver resultados dos colaboradores
- Registrar prova manualmente (instrutor)
- Visualizar gabarito

**Campos de Resultado**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nota_pre_teste | number | Nota do pré-teste |
| nota_pos_teste | number | Nota do pós-teste |
| acertos_pre_teste | number | Quantidade de acertos |
| acertos_pos_teste | number | Quantidade de acertos |
| resultado | enum | aprovado, reprovado, aguardando |
| reorientado | boolean | Se foi reorientado |

### 6.4 Aba Anexos
**Tipos de Anexos**:
- Lista de Presença (PDF gerado)
- Galeria de Fotos
- Cases de Sucesso
- Avaliações
- Relatórios

**Funcionalidades**:
- Upload de arquivos
- Visualização de imagens
- Download de anexos
- Exclusão de anexos
- Edição de descrição/data

### 6.5 Aba Avaliação de Reação
**Funcionalidades**:
- Aplicar avaliação aos colaboradores
- Visualizar respostas
- Marcar como case de sucesso
- Gerar relatório de avaliação

### 6.6 Aba Certificados
**Funcionalidades**:
- Visualizar colaboradores aprovados
- Coletar assinatura para certificado
- Validar certificados em lote
- Download de certificados individuais
- Download de certificados em lote

**Campos do Certificado**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| colaborador_id | uuid | ID do colaborador |
| turma_id | uuid | ID da turma |
| treinamento_id | uuid | ID do treinamento |
| data_emissao | date | Data de emissão |
| data_validade | date | Data de validade |
| assinatura | text | Assinatura do colaborador |
| url | string | URL do PDF |

---

## 7. Provas

### SSTProvas.tsx
**Arquivo**: `src/components/sst/SSTProvas.tsx`

**Descrição**: Gestão de provas para os treinamentos.

**Funcionalidades**:
- **CRUD de Provas**: Criar, editar, excluir
- **Tipos**: Pré-teste e Pós-teste
- **Questões**: Múltipla escolha e V/F
- **Vinculação**: Por treinamento do catálogo
- **Ativação**: Ativar/desativar provas

**Campos da Prova**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| treinamento_id | uuid | Treinamento vinculado |
| tipo | enum | pre_teste, pos_teste |
| nome | string | Nome da prova (opcional) |
| total_questoes | number | Total de questões |
| ativo | boolean | Se está ativa |

**Campos da Questão**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| numero | number | Número da questão |
| tipo_questao | enum | selecao, vf |
| pergunta | text | Texto da pergunta |
| alternativas | array | Lista de alternativas |

**Campos da Alternativa**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| letra | string | A, B, C, D ou V, F |
| texto | string | Texto da alternativa |
| correta | boolean | Se é a correta |

---

## 8. Instrutores

### Instrutores.tsx
**Arquivo**: `src/pages/modulos/Instrutores.tsx`

**Descrição**: Gestão completa de instrutores da empresa SST.

**Funcionalidades**:
- **Listagem**: Tabela com todos os instrutores
- **Busca**: Filtro por nome, CPF, email
- **Filtros**: Por status (ativo/inativo), aptidão
- **Cadastro Completo**: Dialog com múltiplas abas
- **Documentos**: Upload de certificados e formações
- **Datas Indisponíveis**: Agenda de indisponibilidade
- **Histórico de Turmas**: Turmas ministradas
- **Solicitações**: Solicitações do instrutor
- **Suporte**: Canal de comunicação

**Campos do Instrutor**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome completo |
| cpf_cnpj | string | CPF ou CNPJ |
| email | string | E-mail |
| telefone | string | Telefone |
| data_nascimento | date | Data de nascimento |
| veiculo | string | Veículo próprio |
| placa | string | Placa do veículo |
| cep | string | CEP |
| logradouro | string | Endereço |
| bairro | string | Bairro |
| numero | string | Número |
| complemento | string | Complemento |
| cidade | string | Cidade |
| uf | string | Estado |
| formacao_academica | text | Formação acadêmica |
| ativo | boolean | Se está ativo |
| empresa_parceira_id | uuid | Empresa parceira (se terceirizado) |

**Indicadores de Aptidão**:
- Formações cadastradas
- Treinamentos que pode ministrar
- Documentos anexados
- Status de aptidão (apto/inapto)

**Componentes Auxiliares**:
- `InstrutorCadastroDialog.tsx` - Cadastro completo
- `InstrutorDocumentosDialog.tsx` - Upload de documentos
- `InstrutorDatasIndisponiveisDialog.tsx` - Agenda
- `InstrutorSolicitacoesTab.tsx` - Solicitações
- `InstrutorSuporteTab.tsx` - Suporte

---

## 9. Empresas Parceiras

### SSTEmpresasParceiras.tsx
**Arquivo**: `src/components/sst/SSTEmpresasParceiras.tsx`

**Descrição**: Cadastro de empresas parceiras e fornecedores.

**Funcionalidades**:
- **CRUD Completo**: Criar, editar, excluir
- **Busca**: Filtro por nome
- **Filtro por Tipo**: Instrutor, Equipamentos, Outros
- **Vinculação de Responsável**: Criar usuário de acesso
- **Busca de CEP**: Preenchimento automático de endereço

**Campos da Empresa Parceira**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome da empresa |
| cnpj | string | CNPJ |
| responsavel | string | Nome do responsável |
| responsavel_id | uuid | ID do usuário responsável |
| email | string | E-mail |
| telefone | string | Telefone |
| tipo_fornecedor | string | Tipo de fornecimento |
| parceira_empresa_id | uuid | ID da empresa no sistema |

**Tipos de Fornecedor**:
- Instrutor
- Equipamentos
- Locação de Espaço
- Outros

---

## 10. Avaliação de Reação

### AvaliacaoReacao.tsx
**Arquivo**: `src/pages/modulos/AvaliacaoReacao.tsx`

**Descrição**: Criação e gestão de modelos de avaliação de reação.

**Funcionalidades**:
- **CRUD de Modelos**: Criar, editar, excluir
- **Categorias**: Agrupamento de itens
- **Itens**: Perguntas de avaliação
- **Escala de Respostas**: Customizável por categoria
- **Vinculação**: Por treinamento ou geral
- **Campo de Sugestões**: Opcional

**Campos do Modelo**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome do modelo |
| descricao | text | Descrição |
| ativo | boolean | Se está ativo |
| campo_sugestoes | boolean | Se tem campo de sugestões |
| categorias | array | Lista de categorias |
| treinamentos | array | Treinamentos vinculados |

**Campos da Categoria**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome da categoria |
| ordem | number | Ordem de exibição |
| qtd_opcoes_resposta | number | Quantidade de opções |
| opcoes_resposta | array | Opções de resposta |
| itens | array | Itens da categoria |

**Campos da Opção de Resposta**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| valor | number | Valor numérico |
| texto | string | Texto da opção |

**Campos do Item**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| texto | string | Texto do item |
| ordem | number | Ordem de exibição |

**Modos de Vinculação**:
- Todos os treinamentos
- Treinamentos selecionados
- Todos exceto selecionados

---

## 11. Declaração de Reorientação

### SSTDeclaracaoReorientacao.tsx
**Arquivo**: `src/components/sst/SSTDeclaracaoReorientacao.tsx`

**Descrição**: Templates de declaração de reorientação para colaboradores reprovados.

**Funcionalidades**:
- **CRUD de Templates**: Criar, editar, excluir
- **Ativação**: Ativar/desativar templates
- **Texto Rico**: Conteúdo da declaração

**Campos da Declaração**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| texto | text | Conteúdo da declaração |
| ativo | boolean | Se está ativa |

**Uso**:
- Aplicada a colaboradores reprovados no pós-teste
- Colaborador assina digitalmente
- Registrado na turma

---

## Resumo de Arquivos

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| GerenciarTurma.tsx | ~6922 | Gestão completa da turma |
| Instrutores.tsx | ~2071 | Gestão de instrutores |
| CatalogoTreinamentos.tsx | ~1674 | Catálogo de treinamentos |
| MatrizTreinamentos.tsx | ~1446 | Matriz de treinamentos |
| SSTEmpresasParceiras.tsx | ~1332 | Empresas parceiras |
| AvaliacaoReacao.tsx | ~1227 | Modelos de avaliação |
| SSTProvas.tsx | ~987 | Gestão de provas |
| SSTSolicitacoesTreinamentos.tsx | ~766 | Solicitações |
| GestaoTurmas.tsx | ~450 | Lista de turmas validadas |
| SSTDeclaracaoReorientacao.tsx | ~318 | Declarações de reorientação |
| SSTAgendaTreinamentos.tsx | ~2203 | Agenda de treinamentos |

---

## Dependências Principais

- **date-fns**: Manipulação de datas
- **jspdf**: Geração de PDFs
- **html2canvas**: Captura de tela para PDF
- **lucide-react**: Ícones
- **sonner**: Notificações toast
- **Google Maps API**: Cálculo de distâncias
- **FacialRecognitionService**: Validação facial

---

## Rotas Públicas

O módulo possui rotas públicas para acesso sem login:

| Rota | Descrição |
|------|-----------|
| `/prova/:provaId/:turmaId` | Aplicação de prova |
| `/presenca/:turmaId` | Registro de presença |
| `/cadastro-presenca/:turmaId` | Cadastro + presença |
| `/avaliacao-reacao/:turmaId/:colaboradorId` | Avaliação de reação |
