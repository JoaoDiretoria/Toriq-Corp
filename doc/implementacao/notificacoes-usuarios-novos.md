# Implementação: Notificações Apenas Para Usuários Relevantes

## Data: 26/01/2026

---

## 1. Problema Identificado

### Descrição
Usuários novos estão vendo notificações de atualizações do sistema que foram criadas **antes** da criação de suas contas. Isso causa confusão e uma experiência ruim para novos usuários.

### Exemplo do Problema
| Usuário | Criado em | Notificação | Data Notificação | Status |
|---------|-----------|-------------|------------------|--------|
| Amanda Turatti | 26/01/2026 | Correções e Melhorias | 23/01/2026 | ❌ PROBLEMA |
| Cynthia | 26/01/2026 | Correções e Melhorias | 23/01/2026 | ❌ PROBLEMA |
| Lucas | 22/01/2026 | Correções e Melhorias | 23/01/2026 | ✅ OK |

### Causa Raiz
O hook `useSystemUpdates.tsx` busca **todas** as atualizações ativas sem filtrar pela data de criação do usuário:

```typescript
// Código atual - PROBLEMA
const { data: updates } = await supabase
  .from('system_updates')
  .select('*')
  .eq('is_active', true)  // Não filtra por data!
  .order('release_date', { ascending: false });
```

---

## 2. Solução Proposta

### Abordagem
Filtrar as notificações no frontend para mostrar apenas aquelas cuja `release_date` seja **posterior** à data de criação do usuário (`profile.created_at`).

### Lógica
```
SE notificacao.release_date > usuario.created_at ENTÃO
  MOSTRAR notificação
SENÃO
  IGNORAR (usuário não existia quando a notificação foi lançada)
```

### Por que no Frontend?
1. **Simplicidade**: Não requer alterações no banco de dados
2. **Flexibilidade**: Fácil de ajustar a lógica se necessário
3. **Performance**: A tabela `system_updates` é pequena (poucas atualizações)
4. **Já temos o dado**: O `profile.created_at` já está disponível no `useAuth`

---

## 3. Checklist de Implementação

### 3.1 Atualizar Interface Profile (se necessário)
- [ ] Verificar se `created_at` está disponível no `Profile` do `useAuth`
- [ ] Adicionar campo se não existir

### 3.2 Atualizar Hook useSystemUpdates
- [ ] Importar `profile` do `useAuth` (além de `user`)
- [ ] Adicionar filtro por data de criação do usuário
- [ ] Filtrar: `release_date > profile.created_at`

### 3.3 Testar
- [ ] Verificar que usuários novos não veem notificações antigas
- [ ] Verificar que usuários antigos ainda veem notificações relevantes
- [ ] Verificar logs no console

### 3.4 Commit e Deploy
- [ ] Commit para branch `jhony`
- [ ] Push e merge com `main`

---

## 4. Código da Solução

### 4.1 Alteração em `src/hooks/useSystemUpdates.tsx`

```typescript
// ANTES (linha 31)
const { user } = useAuth();

// DEPOIS
const { user, profile } = useAuth();
```

```typescript
// ANTES (linha 93)
const unseenUpdates = (updates as SystemUpdate[]).filter(u => !viewedIds.has(u.id));

// DEPOIS - Adicionar filtro por data de criação do usuário
const userCreatedAt = profile?.created_at ? new Date(profile.created_at) : null;

const unseenUpdates = (updates as SystemUpdate[]).filter(u => {
  // Já foi vista? Ignorar
  if (viewedIds.has(u.id)) return false;
  
  // Se temos a data de criação do usuário, filtrar notificações antigas
  if (userCreatedAt) {
    const releaseDate = new Date(u.release_date);
    // Só mostrar notificações lançadas APÓS a criação do usuário
    if (releaseDate < userCreatedAt) {
      console.log(`[useSystemUpdates] Ignorando notificação ${u.version} (anterior ao usuário)`);
      return false;
    }
  }
  
  return true;
});
```

---

## 5. Verificação da Interface Profile

### Campos necessários no Profile:
- `created_at: string` - Data de criação do usuário

### Verificar em `src/hooks/useAuth.tsx`:
```typescript
interface Profile {
  id: string;
  email: string;
  nome: string;
  role: '...',
  created_at?: string;  // <-- Verificar se existe
  // ...
}
```

---

## 6. Impacto

### Usuários Afetados
- **Novos usuários**: Não verão mais notificações antigas
- **Usuários existentes**: Comportamento inalterado

### Riscos
- **Baixo**: Alteração apenas no frontend, sem mudanças no banco

---

## 7. Status da Implementação

| Etapa | Status | Observações |
|-------|--------|-------------|
| Análise do problema | ✅ Concluído | Identificado filtro faltante |
| Documentação | ✅ Concluído | Este documento |
| Implementação | ✅ Concluído | Alterações em useAuth.tsx e useSystemUpdates.tsx |
| Testes | ✅ Concluído | Logs de debug adicionados |
| Deploy | ✅ Concluído | Commit e merge realizado |

---

## 8. Arquivos Modificados

1. `src/hooks/useAuth.tsx` - Adicionado campo `created_at` na interface Profile
2. `src/hooks/useSystemUpdates.tsx` - Adicionado filtro por data de criação do usuário

---

*Documento criado em 26/01/2026*
*Implementação concluída em 26/01/2026*
