# Aba Certificados — Tutorial de Uso

## Visão Geral

A aba **Certificados** permite visualizar, assinar, validar e baixar os certificados dos colaboradores aprovados no treinamento. Esta aba é visível apenas para perfis **Empresa SST**, **Admin Vertical** e **Cliente Final** (somente leitura). Instrutores não têm acesso a esta aba.

---

## Estrutura da Tela

### Cabeçalho
- **Título** — "Certificados dos Colaboradores"
- **Descrição** — "Visualize e baixe os certificados dos colaboradores aprovados (nota pós-teste ≥ 7)"
- **Botão "Validar os Certificados"** — Inicia o processo de validação em lote

### Tabela de Certificados

| Coluna | Descrição |
|--------|-----------|
| **Colaborador** | Nome, CPF e avatar. Colaboradores com sinistro exibem badge "Sinistro" |
| **Pré-Teste** | Nota do pré-teste |
| **Pós-Teste** | Nota do pós-teste (verde ≥ 7, vermelho < 7) |
| **Status** | Aprovado, Reprovado, Reprovado (Sinistro) ou Aguardando |
| **Assinatura** | Status da assinatura do certificado pelo colaborador |
| **Validado** | Se o certificado PDF foi gerado e validado |
| **Ações** | Botões: Visualizar, Ver Validado, Baixar |

---

## Passo a Passo: Coletar Assinatura do Certificado

A assinatura é a confirmação do colaborador de que recebeu o certificado.

1. Na tabela, localize o colaborador **aprovado** (status verde)
2. Na coluna **Assinatura**, clique no botão **"Assinar"** (ícone de caneta)
3. O colaborador assina digitalmente na tela (pad de assinatura)
4. Clique em **"Salvar Assinatura"**
5. O status mudará para **"Assinado"** (verde com check)

> Se o colaborador já assinou, clique em **"Assinado"** para visualizar ou refazer a assinatura.

---

## Passo a Passo: Validar Certificados

A validação gera o PDF oficial do certificado usando o modelo de certificado vinculado ao treinamento.

### Validação em Lote

1. Clique no botão **"Validar os Certificados"** (ou "Revalidar Certificados" se já validados)
2. No diálogo, escolha o modo de validação:
   - **Todos** — Valida certificados de todos os colaboradores aprovados
   - **Seleção** — Escolha manualmente quais colaboradores validar
   - **Exceto** — Valida todos exceto os selecionados
3. Se escolheu "Seleção" ou "Exceto", marque os colaboradores desejados
4. Clique em **"Validar"**
5. O sistema gerará os PDFs dos certificados
6. Aguarde o processamento (pode levar alguns segundos por certificado)

### Status de Validação

| Status | Significado |
|--------|------------|
| **"Sim"** (badge verde com check) | Certificado validado e PDF disponível |
| **"Pendente PDF"** (badge amarelo) | Validação iniciada mas PDF ainda não gerado |
| **"Não"** (badge cinza) | Certificado ainda não validado |

---

## Passo a Passo: Visualizar Certificado

### Visualizar Preview (antes da validação)
1. Na coluna **Ações**, clique em **"Visualizar"** (botão amarelo)
2. O certificado será aberto em uma nova aba do navegador
3. Este é um preview usando o modelo de certificado vinculado ao treinamento
4. Os dados do colaborador (nome, CPF, treinamento, datas, etc.) são preenchidos automaticamente

### Visualizar Certificado Validado
1. Após a validação, clique em **"Ver Validado"** (botão azul)
2. O PDF oficial do certificado será aberto em nova aba
3. Este é o documento final com todas as informações oficiais

---

## Passo a Passo: Baixar Certificado

1. O certificado deve estar **validado** (status "Sim")
2. Na coluna **Ações**, clique em **"Baixar"** (botão verde)
3. O PDF será baixado automaticamente
4. O nome do arquivo segue o padrão: `certificado_NOME_COLABORADOR.pdf`

> Botões "Ver Validado" e "Baixar" ficam desabilitados (cinza) se o certificado ainda não foi validado.

---

## Regras de Negócio

- **Apenas colaboradores aprovados** (nota pós-teste ≥ 7 e sem sinistro) podem ter certificado
- **Colaboradores com sinistro** são automaticamente reprovados e exibem badge "Sinistro" em vermelho
- **Colaboradores reprovados** exibem "Não aprovado" na coluna de ações
- **Colaboradores sem prova** exibem "Aguardando prova" na coluna de ações
- O **modelo de certificado** é definido no cadastro do treinamento (Catálogo de Treinamentos)
- A **revalidação** pode ser feita a qualquer momento para atualizar os PDFs

---

## Dicas

- Valide os certificados somente após todas as assinaturas serem coletadas
- Use a validação em lote para processar todos os certificados de uma vez
- O certificado validado é o documento oficial — confira os dados antes de enviar ao cliente
- Ao revalidar, os PDFs anteriores são substituídos pelos novos
- A aba atualiza automaticamente quando você volta de outra aba do navegador
