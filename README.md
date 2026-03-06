# Toriq Corp

Sistema completo de gestão empresarial com foco em SST (Segurança e Saúde no Trabalho), RH, Treinamentos e CRM.

## Stack Técnico

- **Frontend:** React + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL 17.6)
- **Package Manager:** npm
- **Containerização:** Docker

## Instalação

```sh
# Clone o repositório
git clone https://github.com/JoaoDiretoria/Toriq-Corp.git

# Entre no diretório
cd Toriq-Corp

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Copie .env.example para .env e configure suas credenciais Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

## Estrutura do Projeto

- **234 tabelas** no banco de dados
- **Módulos principais:** Colaboradores, Treinamentos, EPI, Financeiro, CRM, SST, Suporte
- **RLS habilitado** em todas as tabelas
- **Assinatura Digital ICP-Brasil** integrada

## Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento (porta 8080)
- `npm run build` - Build de produção
- `npm run preview` - Preview do build
- `npm run lint` - Executa linter

## Documentação

Consulte a pasta `docs/` para documentação técnica detalhada.
