# Toriq Train - Módulo de Gestão de Treinamentos

## Visão Geral

O **Toriq Train** é o módulo de gestão de treinamentos da plataforma Vertical ON. Ele permite que empresas de SST gerenciem todo o ciclo de vida dos treinamentos, desde o catálogo até a emissão de certificados, incluindo gestão de instrutores, turmas, provas e avaliações.

---

## Filosofia do Módulo

O módulo segue um fluxo completo de treinamentos:
1. **Catálogo** → Define os tipos de treinamentos disponíveis
2. **Matriz** → Vincula treinamentos a riscos/agentes nocivos
3. **Solicitações** → Clientes solicitam treinamentos
4. **Agenda** → Empresa SST agenda as turmas
5. **Gestão de Turmas** → Controle de presença, provas e certificados
6. **Avaliação** → Feedback dos participantes

---

## Estrutura de Funcionalidades

### Fluxo Principal

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Catálogo     │───▶│     Matriz      │───▶│  Solicitações   │
│  Treinamentos   │    │  Treinamentos   │    │  Treinamentos   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Certificados  │◀───│  Gestão Turmas  │◀───│     Agenda      │
│   e Relatórios  │    │   (Validadas)   │    │  Treinamentos   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Funcionalidades por Área

### 1. Catálogo de Treinamentos
- Cadastro de tipos de treinamento por NR
- Carga horária de formação e reciclagem
- Validade do treinamento
- Conteúdo programático
- Importação/Exportação CSV (delimitador: pipe `|`)

### 2. Matriz de Treinamentos
- Vinculação de treinamentos a agentes nocivos/perigos
- Definição de obrigatoriedade por cargo/função
- Importação/Exportação CSV

### 3. Solicitações de Treinamentos
- Recebimento de solicitações dos clientes
- Visualização de cronograma proposto
- Aceitar/Recusar solicitações
- Criação automática de turma ao aceitar

### 4. Agenda de Treinamentos
- Visualização em calendário mensal
- Criação e edição de turmas
- Atribuição de instrutores com cálculo de distância
- Validação de turmas para gestão
- Status: Agendado, Em Andamento, Concluído, Cancelado

### 5. Gestão de Turmas (Validadas)
- Controle de turmas validadas
- Gerenciamento completo da turma:
  - Lista de presença com assinatura
  - Validação facial de presença
  - Aplicação de provas (pré e pós-teste)
  - Reorientação de reprovados
  - Emissão de certificados
  - Avaliação de reação
  - Anexos e galeria de fotos

### 6. Provas e Avaliações
- Criação de provas por treinamento
- Tipos: Pré-teste e Pós-teste
- Questões de múltipla escolha e V/F
- Aplicação via QR Code
- Correção automática
- Gabarito para instrutor

### 7. Instrutores
- Cadastro completo de instrutores
- Formações e certificações
- Treinamentos que pode ministrar
- Datas indisponíveis
- Equipamentos próprios
- Vinculação com empresas parceiras
- Histórico de turmas

### 8. Empresas Parceiras
- Cadastro de fornecedores/parceiros
- Tipos: Instrutor, Equipamentos, Outros
- Vinculação de instrutores à parceira

### 9. Avaliação de Reação
- Modelos de avaliação personalizáveis
- Categorias e itens configuráveis
- Escala de respostas customizável
- Campo de sugestões/comentários
- Cases de sucesso

### 10. Declaração de Reorientação
- Templates de declaração
- Aplicação para colaboradores reprovados
- Assinatura digital

---

## Arquitetura de Componentes

```
src/
├── components/sst/
│   ├── SSTAgendaTreinamentos.tsx      # Agenda/Calendário de turmas
│   ├── SSTSolicitacoesTreinamentos.tsx # Solicitações recebidas
│   ├── SSTProvas.tsx                   # Gestão de provas
│   ├── SSTDeclaracaoReorientacao.tsx   # Templates de reorientação
│   ├── SSTEmpresasParceiras.tsx        # Empresas parceiras
│   ├── InstrutorCadastroDialog.tsx     # Cadastro de instrutor
│   ├── InstrutorDocumentosDialog.tsx   # Documentos do instrutor
│   ├── InstrutorDatasIndisponiveisDialog.tsx # Agenda do instrutor
│   ├── InstrutorSolicitacoesTab.tsx    # Solicitações do instrutor
│   └── ReorientacaoViewDialog.tsx      # Visualização de reorientação
│
└── pages/modulos/
    ├── CatalogoTreinamentos.tsx        # Catálogo de treinamentos
    ├── MatrizTreinamentos.tsx          # Matriz de treinamentos
    ├── GestaoTurmas.tsx                # Lista de turmas validadas
    ├── GerenciarTurma.tsx              # Gestão completa da turma
    ├── Instrutores.tsx                 # Gestão de instrutores
    ├── AvaliacaoReacao.tsx             # Modelos de avaliação
    └── GestaoTreinamentos.tsx          # Histórico de treinamentos
```

---

## Tabelas do Banco de Dados

### Catálogo e Matriz
| Tabela | Descrição |
|--------|-----------|
| `catalogo_treinamentos` | Tipos de treinamento cadastrados |
| `matriz_treinamentos` | Vinculação treinamento x agente nocivo |
| `normas_regulamentadoras` | NRs cadastradas |

### Turmas e Aulas
| Tabela | Descrição |
|--------|-----------|
| `turmas_treinamento` | Turmas agendadas |
| `turmas_treinamento_aulas` | Aulas de cada turma |
| `turma_colaboradores` | Colaboradores inscritos na turma |
| `turma_colaboradores_presencas` | Presença por aula |
| `turma_anexos` | Anexos da turma |

### Provas
| Tabela | Descrição |
|--------|-----------|
| `provas` | Provas cadastradas |
| `prova_questoes` | Questões de cada prova |
| `prova_alternativas` | Alternativas de cada questão |
| `prova_respostas` | Respostas dos colaboradores |

### Instrutores
| Tabela | Descrição |
|--------|-----------|
| `instrutores` | Cadastro de instrutores |
| `instrutores_formacoes` | Formações do instrutor |
| `instrutores_treinamentos` | Treinamentos que pode ministrar |
| `instrutores_datas_indisponiveis` | Agenda de indisponibilidade |
| `instrutores_equipamentos` | Equipamentos próprios |

### Solicitações
| Tabela | Descrição |
|--------|-----------|
| `solicitacoes_treinamento` | Solicitações dos clientes |
| `solicitacoes_treinamento_aulas` | Cronograma proposto |

### Avaliação
| Tabela | Descrição |
|--------|-----------|
| `avaliacao_reacao_modelos` | Modelos de avaliação |
| `avaliacao_reacao_categorias` | Categorias do modelo |
| `avaliacao_reacao_itens` | Itens de cada categoria |
| `avaliacao_reacao_respostas` | Respostas dos colaboradores |
| `declaracoes_reorientacao` | Templates de reorientação |

### Certificados
| Tabela | Descrição |
|--------|-----------|
| `certificados` | Certificados emitidos |
| `colaboradores_treinamentos` | Histórico de treinamentos do colaborador |

---

## Fluxos Principais

### Fluxo de Solicitação → Turma
```
1. Cliente solicita treinamento (portal do cliente)
2. Empresa SST recebe solicitação
3. SST aceita → Turma criada automaticamente
4. SST atribui instrutor e define datas
5. SST valida turma → Vai para Gestão de Turmas
```

### Fluxo de Execução da Turma
```
1. Instrutor acessa turma
2. Colaboradores registram presença (QR Code ou manual)
3. Validação facial (opcional)
4. Aplicação de pré-teste
5. Execução do treinamento
6. Aplicação de pós-teste
7. Reorientação de reprovados
8. Avaliação de reação
9. Emissão de certificados
```

### Fluxo de Provas
```
1. Criar prova vinculada ao treinamento
2. Adicionar questões (múltipla escolha ou V/F)
3. Gerar QR Code para aplicação
4. Colaborador responde via celular
5. Correção automática
6. Resultado: Aprovado/Reprovado
7. Reprovado → Reorientação
```

---

## Integrações

- **Clientes SST**: Solicitações de treinamento
- **Colaboradores**: Inscrição em turmas, provas, certificados
- **Empresas Parceiras**: Instrutores terceirizados
- **Google Maps API**: Cálculo de distância para instrutores
- **Reconhecimento Facial**: Validação de presença
- **Geração de PDF**: Certificados e listas de presença

---

## Permissões

O acesso ao módulo é controlado por:
1. **Role do usuário**: empresa_sst, instrutor, cliente_final
2. **Módulo ativo** para a empresa
3. **Telas liberadas** por módulo
4. **Hierarquia** (Administrador/Gestor/Colaborador)

### Permissões por Role
| Role | Permissões |
|------|------------|
| empresa_sst | Acesso total ao módulo |
| instrutor | Gestão das turmas atribuídas |
| cliente_final | Solicitações e visualização |

---

## Funcionalidades Especiais

### Cálculo de Distância de Instrutores
- Integração com Google Maps API
- Ordenação por proximidade ao cliente
- Considera cidade/UF do instrutor e cliente

### Validação Facial
- Captura de foto do colaborador
- Comparação com foto cadastrada
- Registro de geolocalização
- Horário de validação

### QR Code
- Geração para presença
- Geração para provas
- Acesso público sem login

### Importação CSV
- Delimitador: pipe (`|`)
- Templates disponíveis
- Validação de dados
- Feedback de erros

---

## Próximos Passos

Para detalhamento de cada página do módulo, consulte:
- [Gestão de Treinamentos - Páginas Detalhadas](./modulo-gestao-treinamentos-paginas.md)
