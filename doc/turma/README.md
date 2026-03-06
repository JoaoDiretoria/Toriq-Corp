# Gerenciar Turma — Documentação do Usuário

## O que é?

O **Gerenciar Turma** é a tela central de gestão de uma turma de treinamento no sistema [Toriq](https://toriq.com.br). É nesta tela que todo o ciclo de vida de um treinamento é controlado — desde a inclusão de colaboradores até a emissão de certificados e geração de relatórios finais.

Cada turma de treinamento representa uma sessão específica de capacitação vinculada a uma Norma Regulamentadora (NR), com empresa cliente, instrutor, datas de aula e colaboradores participantes.

---

## Para que serve?

O Gerenciar Turma permite:

- Visualizar todas as informações de uma turma de treinamento
- Controlar a lista de presença com assinatura digital e validação facial
- Gerenciar anexos (fotos, lista de presença, cases de sucesso)
- Aplicar e acompanhar provas (pré-teste e pós-teste)
- Registrar sinistros (ocorrências que resultam em reprovação)
- Coletar avaliações de reação dos participantes
- Emitir e validar certificados individuais
- Gerar relatórios completos para envio à empresa cliente
- Categorizar tecnicamente os espaços confinados (NR 33)
- Finalizar a turma quando todos os requisitos forem atendidos

---

## Quem pode acessar?

| Perfil | Permissões |
|--------|-----------|
| **Empresa SST** | Acesso total (edição e visualização) |
| **Admin Vertical** | Acesso total (edição e visualização) |
| **Instrutor** | Edição (apenas nas turmas em que é o instrutor designado) |
| **Cliente Final** | Somente visualização (read-only) |

---

## Estrutura da Tela

A tela é organizada em **8 abas** (tabs), cada uma com funcionalidades específicas:

| # | Aba | Ícone | Descrição | Visível para |
|---|-----|-------|-----------|-------------|
| 1 | **Geral** | ℹ️ | Informações gerais da turma | Todos |
| 2 | **Lista de Presença** | 👥 | Controle de presença, assinaturas e validação facial | Todos |
| 3 | **Anexos** | 📎 | Galeria de fotos, lista de presença salva, cases de sucesso | Todos |
| 4 | **Provas e Sinistros** | 📋 | Pré-teste, pós-teste, QR Code, sinistros | Todos |
| 5 | **Avaliação de Reação** | ⭐ | Avaliação de satisfação dos participantes | Todos |
| 6 | **Certificados** | 🏆 | Emissão, assinatura e validação de certificados | Exceto Instrutor |
| 7 | **Relatório** | 📄 | Relatórios completos, de presenças e de sinistros | Exceto Instrutor |
| 8 | **Cat. Técnica** | ⚙️ | Categorização técnica (espaços confinados, atividades, responsáveis) | Apenas Empresa SST e Admin |

---

## Cabeçalho da Turma

No topo da tela, sempre visível, você encontra:

- **Código da Turma** (ex: CNC003-NR33)
- **Nome do Treinamento** (ex: NR 33 - Trabalhadores e Vigias)
- **Status** (Em Andamento, Concluído, etc.)
- **Resumo rápido**: Empresa cliente, Data, Instrutor, Quantidade de participantes

---

## Fluxo Completo de uma Turma

O fluxo recomendado para gerenciar uma turma do início ao fim é:

1. **Aba Geral** → Conferir todas as informações da turma (datas, instrutor, empresa cliente, treinamento)
2. **Lista de Presença** → Adicionar os colaboradores à turma
3. **Lista de Presença** → Marcar presença dos colaboradores (assinatura digital + validação facial). **Este passo é diário:** cada dia de aula exige uma marcação de presença separada. Se o treinamento tem 2 dias, marca-se presença no dia 1 e novamente no dia 2. Colaboradores sem presença registrada terão falta no treinamento.
4. **Provas e Sinistros** → Aplicar o **Pré-Teste**
5. *(Fora do sistema)* → Ministrar o treinamento — toda a parte teórica e prática
6. **Provas e Sinistros** → Aplicar o **Pós-Teste**
7. **Provas e Sinistros** → Registrar **sinistros**, se houver ocorrências graves
8. **Lista de Presença** → Registrar **reorientação** dos colaboradores aprovados com nota entre 7 e 9 no pós-teste
9. **Avaliação de Reação** → Coletar a avaliação de satisfação de todos os colaboradores
10. **Anexos** → Adicionar fotos do treinamento à galeria e selecionar cases de sucesso
11. **Lista de Presença** → Gerar o documento da lista de presença
12. **Certificados** → Coletar assinaturas e validar os certificados dos aprovados
13. **Relatório** → Visualizar e baixar o relatório completo do treinamento
14. **Aba Geral** → Finalizar a turma

> **Importante:** A ordem acima é a recomendada, mas o sistema permite navegar livremente entre as abas a qualquer momento.

---

## Documentação Detalhada por Aba

Cada aba possui um tutorial detalhado com passo a passo completo:

- [1. Aba Geral](./01-aba-geral.md)
- [2. Aba Lista de Presença](./02-aba-lista-presenca.md)
- [3. Aba Anexos](./03-aba-anexos.md)
- [4. Aba Provas e Sinistros](./04-aba-provas-sinistros.md)
- [5. Aba Avaliação de Reação](./05-aba-avaliacao-reacao.md)
- [6. Aba Certificados](./06-aba-certificados.md)
- [7. Aba Relatório](./07-aba-relatorio.md)
- [8. Aba Categorização Técnica](./08-aba-categorizacao-tecnica.md)
- [9. Boas Práticas — O que Fazer e NÃO Fazer](./09-boas-praticas.md)

---

## Glossário

| Termo | Significado |
|-------|------------|
| **Turma** | Sessão de treinamento com data, instrutor e colaboradores |
| **Colaborador** | Funcionário da empresa cliente que participa do treinamento |
| **Pré-Teste** | Avaliação aplicada antes do treinamento para medir conhecimento prévio (comparativo de evolução, não reprova) |
| **Pós-Teste** | Avaliação aplicada após o treinamento que define aprovação (≥ 7) ou reprovação (< 7). Reprovados podem refazer |
| **Reorientação** | Revisão das questões erradas no pós-teste para colaboradores aprovados com nota entre 7 e 9 |
| **Sinistro** | Ocorrência grave que resulta em reprovação automática do colaborador |
| **Validação Facial** | Verificação de identidade por reconhecimento facial (quando ativado) |
| **Case de Sucesso** | Depoimento positivo de um colaborador selecionado para destaque |
| **Avaliação de Reação** | Pesquisa de satisfação respondida por todos os colaboradores |
| **Categorização Técnica** | Classificação dos espaços confinados, atividades e responsáveis (NR 33) |
