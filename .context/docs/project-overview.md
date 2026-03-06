# TORIQ - Sistema Integrado de Gestão SST e Empresarial

## Resumo Executivo

O TORIQ é uma plataforma SaaS multi-tenant robusta que oferece soluções integradas para Segurança e Saúde do Trabalho (SST), gestão empresarial e comercial. Construído sobre tecnologias modernas (React, TypeScript, Supabase), o sistema atende desde pequenas empresas até grandes corporações com necessidades complexas de compliance e gestão.

## Arquitetura do Sistema

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth com RLS
- **Storage**: Supabase Storage para documentos e certificados
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Docker + Nginx

### Arquitetura de Componentes
- **Config**: 7 símbolos - Configurações de módulos e versioning
- **Utils**: 35 símbolos - Utilitários, reconhecimento facial, PDF
- **Services**: 41 símbolos - Integrações externas (IBGE, Google Maps, CBO)
- **Components**: 213 símbolos - Interface do usuário modular
- **Repositories**: 3 símbolos - Camada de dados

## Módulos Principais

### 1. **Gestão de SST**
- Cadastro de clientes e colaboradores
- Gestão de treinamentos e certificações
- Controle de EPIs e equipamentos
- Relatórios de compliance
- Integração com eSocial

### 2. **Toriq Corp (CRM/ERP)**
- Funil comercial configurável
- Gestão de prospecção e vendas
- Sistema de contratos
- Gestão financeira (contas a pagar/receber)
- Relatórios gerenciais

### 3. **Gestão de Treinamentos**
- Catálogo de treinamentos
- Agendamento de turmas
- Sistema de provas e avaliações
- Geração automática de certificados
- Controle de presença com assinatura digital

### 4. **Gestão de Frota**
- Cadastro de veículos
- Controle de manutenções
- Checklists de inspeção
- Gestão de custos
- Controle de documentos

### 5. **Sistema White Label**
- Personalização completa por empresa
- Cores, tipografia e layout
- Logos e identidade visual
- Configuração de módulos ativos

## Características Técnicas

### Multi-Tenancy
- Isolamento completo por empresa via RLS
- Configurações independentes por tenant
- Escalabilidade horizontal

### Segurança
- Row Level Security (RLS) em todas as tabelas
- Controle de acesso baseado em roles
- Auditoria completa de operações
- Compliance com LGPD

### Performance
- Índices otimizados para queries complexas
- Cache de dados frequentes
- Lazy loading de componentes
- Otimização de imagens e assets

### Integrações
- **APIs Governamentais**: Receita Federal (CNPJ), IBGE, CBO
- **Serviços Externos**: Google Maps, sistemas de pagamento
- **Notificações**: Email, push notifications
- **Storage**: Documentos, certificados, fotos

## Banco de Dados

### Estrutura Principal
- **150+ tabelas** organizadas por domínio
- **Relacionamentos complexos** com integridade referencial
- **Triggers automáticos** para auditoria e notificações
- **Views materializadas** para relatórios

### Entidades Críticas
- `empresas` - Multi-tenancy principal
- `profiles` - Usuários e permissões
- `colaboradores` - Funcionários das empresas
- `turmas_treinamento` - Gestão de treinamentos
- `funil_cards` - Oportunidades comerciais
- `contas_receber/pagar` - Gestão financeira

## Fluxos de Negócio

### Onboarding de Empresa
```
Cadastro → Configuração → Módulos → White Label → Ativação
```

### Gestão de Treinamentos
```
Solicitação → Agendamento → Execução → Avaliação → Certificação
```

### Processo Comercial
```
Prospecção → Funil → Fechamento → Contrato → Financeiro
```

## Métricas e KPIs

### Técnicas
- **Uptime**: 99.9%
- **Response Time**: < 200ms (média)
- **Concurrent Users**: 1000+
- **Data Volume**: 10GB+ por empresa

### Negócio
- **Empresas Ativas**: 500+
- **Colaboradores Gerenciados**: 50.000+
- **Treinamentos/Mês**: 2.000+
- **Certificados Emitidos**: 100.000+

## Roadmap Técnico

### Próximas Implementações
- [ ] API GraphQL para integrações
- [ ] Mobile app (React Native)
- [ ] BI/Analytics avançado
- [ ] Inteligência artificial para insights
- [ ] Microserviços para módulos específicos

### Melhorias de Performance
- [ ] Cache distribuído (Redis)
- [ ] CDN para assets estáticos
- [ ] Otimização de queries N+1
- [ ] Compressão de dados históricos

## Compliance e Certificações

### Regulamentações Atendidas
- **NRs (Normas Regulamentadoras)**: NR-1 a NR-37
- **eSocial**: Integração completa
- **LGPD**: Proteção de dados pessoais
- **ISO 45001**: Gestão de SST

### Certificações de Segurança
- **SSL/TLS**: Criptografia end-to-end
- **Backup**: Redundância geográfica
- **Auditoria**: Logs completos de acesso
- **Penetration Testing**: Testes regulares

Este sistema representa uma solução completa e escalável para gestão empresarial com foco em SST, oferecendo flexibilidade, segurança e performance para atender às necessidades de empresas de todos os portes.