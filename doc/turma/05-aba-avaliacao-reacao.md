# Aba Avaliação de Reação — Tutorial de Uso

## Visão Geral

A aba **Avaliação de Reação** permite coletar e visualizar a pesquisa de satisfação de todos os colaboradores no treinamento. É uma ferramenta essencial para medir a qualidade percebida do treinamento, do instrutor e da infraestrutura.

---

## Estrutura da Tela

A aba é dividida em duas seções:

### 1. Resultados Consolidados (Gráficos e Cards)
Exibe automaticamente os resultados agregados das avaliações já respondidas:
- **Gráficos** de satisfação por categoria
- **Cards** com médias e indicadores
- **Resumo geral** do desempenho do treinamento

### 2. Tabela de Colaboradores
Lista todos os colaboradores da turma com status da avaliação.

---

## Tabela de Colaboradores

| Coluna | Descrição |
|--------|-----------|
| **Colaborador** | Nome do participante |
| **Pré-Teste** | Nota do pré-teste |
| **Pós-Teste** | Nota do pós-teste (verde ≥ 7, vermelho < 7) |
| **Reorientado** | "Sim" (verde), "Pendente" (amarelo) ou "N/A" (nota = 10). Aplica-se apenas a aprovados com nota 7-9 no pós-teste |
| **Avaliação** | "Respondida" (verde) ou "Pendente" (amarelo) |
| **Ações** | Botão "Avaliar" para registrar a avaliação |

### Quem aparece na tabela?
Apenas colaboradores **aprovados** no pós-teste (nota ≥ 7). Colaboradores reprovados ou que ainda não fizeram o pós-teste não aparecem.

### Quando o botão "Avaliar" fica habilitado?
O botão **"Avaliar"** só fica habilitado quando:
- O colaborador **não** respondeu a avaliação ainda
- O colaborador tem nota 10 no pós-teste (sem necessidade de reorientação) **OU** já foi reorientado (nota entre 7 e 9)

Se o colaborador está aprovado (nota 7-9) mas ainda não foi reorientado, o botão fica desabilitado com tooltip explicativo.

---

## Passo a Passo: Registrar Avaliação de Reação

1. Acesse a aba **Avaliação de Reação**
2. Na tabela, localize o colaborador com status "Pendente"
3. Clique no botão **"Avaliar"**
4. Um formulário de avaliação será aberto com perguntas sobre:
   - Qualidade do conteúdo do treinamento
   - Desempenho do instrutor
   - Infraestrutura e recursos utilizados
   - Aplicabilidade do conteúdo no trabalho
   - Sugestões e comentários (campo texto livre)
5. Preencha todas as perguntas
6. Clique em **"Enviar Avaliação"**
7. O status mudará para "Respondida" (verde)

---

## Resultados Consolidados

Após as avaliações serem respondidas, a seção de resultados exibe:

- **Gráficos de barras/radar** — Médias por categoria avaliada
- **Cards de resumo** — Indicadores principais (média geral, total de respostas, etc.)
- **Detalhamento** — Distribuição das notas por pergunta

Os resultados são atualizados automaticamente conforme novas avaliações são registradas.

---

## Fluxo Completo

```
1. Colaborador faz pós-teste → Nota ≥ 7 (aprovado)
2. Se nota entre 7 e 9 → Reorientação obrigatória primeiro (revisar questões erradas)
3. Se nota = 10 → Avaliação de reação habilitada diretamente
4. Após reorientação (ou nota = 10) → Avaliação de reação habilitada
5. Instrutor/empresa registra a avaliação
6. Resultados consolidados são atualizados
7. Comentários podem ser selecionados como "Cases de Sucesso" na aba Anexos
```

> **Nota:** Colaboradores reprovados (nota < 7) não participam da avaliação de reação, mas podem refazer o pós-teste.

---

## Dicas

- A avaliação de reação é um requisito importante para a qualidade do treinamento
- Comentários e sugestões preenchidos pelos colaboradores podem ser destacados como **Cases de Sucesso** na aba Anexos
- Os gráficos de resultados são incluídos no relatório final do treinamento
- Colaboradores reprovados não participam da avaliação de reação
- A seção de gráficos só aparece após o carregamento completo dos dados
