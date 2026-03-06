# Trilha 3 — Tratamento de Erros Assíncronos

## Objetivo
Padronizar feedback ao usuário e logs em operações assíncronas (API, uploads, PDF), evitando silenciar erros úteis.

## Checklist
- [ ] Helper único para erro: toast.error + log estruturado (console.error em dev, logger em prod)
- [ ] Remover console.log em produção (manter console.error), alinhado ao esbuild drop
- [ ] Uploads: propagar erro; toast amigável com contexto (arquivo/nome)
- [ ] Fetch externos (ex: CEP): tratar status !=200 e JSON inválido
- [ ] PDF: retornar erro detalhado ao caller; logar com tag do documento
- [ ] Caller de PDF: mostrar mensagem ao usuário quando receber null/erro
- [ ] Dashboard queries: tratamento padronizado sem toasts duplicados
- [ ] Classificar erros: rede vs. validação vs. permissão

## Validação
- [ ] Operações assíncronas exibem feedback consistente
- [ ] Erros relevantes logados; nada silencioso em uploads/PDF
- [ ] Nenhum spam de toasts em sequência

## Owners sugeridos
- Front/UX
