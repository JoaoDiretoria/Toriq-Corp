# 📋 Fase 9 - Consolidação de Multiple Permissive Policies

**Data:** 20/01/2026  
**Projeto:** `xraggzqaddfiymqgrtha`  
**Status:** 🔄 Em Andamento

---

## 🎯 Objetivo

Consolidar múltiplas policies permissivas em policies únicas para melhorar performance.

**Problema:** Quando uma tabela tem múltiplas policies permissivas para a mesma ação (SELECT, INSERT, UPDATE, DELETE), o PostgreSQL executa TODAS elas para cada query, causando overhead.

**Solução:** Consolidar policies similares em uma única policy com condições OR.

---

## 📊 Análise das Issues

### Resumo
| Métrica | Valor |
|---------|-------|
| **Total de Issues** | 166 |
| **Tabelas Afetadas** | ~50 |
| **Ação Mais Comum** | SELECT |

### Tabelas com Mais Policies Duplicadas

| Tabela | Ação | Policies | Impacto |
|--------|------|----------|---------|
| `catalogo_treinamentos` | SELECT | 9 | Alto |
| `clientes_sst` | SELECT | 7 | Alto |
| `instrutor_formacao_treinamento` | SELECT | 6 | Médio |
| `turmas_treinamento` | SELECT | 6 | Alto |
| `avaliacao_reacao_*` | SELECT | 5 cada | Médio |
| `provas_*` | SELECT | 5 cada | Médio |
| `profiles` | UPDATE | 5 | Alto |

---

## ⚠️ Impactos Potenciais

### 🔴 RISCO ALTO
| Tabela | Risco | Motivo |
|--------|-------|--------|
| `profiles` | Quebrar login | 5 policies de UPDATE |
| `clientes_sst` | Quebrar visualização | 7 policies de SELECT |
| `turmas_treinamento` | Quebrar turmas | 6 policies de SELECT |

### 🟡 RISCO MÉDIO
| Tabela | Risco | Motivo |
|--------|-------|--------|
| `catalogo_treinamentos` | Performance | 9 policies de SELECT |
| `avaliacao_reacao_*` | Formulários públicos | Policies públicas misturadas |

### 🟢 RISCO BAIXO
| Tabela | Risco | Motivo |
|--------|-------|--------|
| `funis` | Apenas admin usa | Policies administrativas |
| `funil_etapas` | Apenas admin usa | Policies administrativas |

---

## 🛠️ Estratégia de Consolidação

### Abordagem Segura
1. **NÃO TOCAR** em tabelas críticas de autenticação (`profiles`)
2. **Focar** em tabelas de leitura (SELECT) primeiro
3. **Consolidar** policies públicas separadamente das autenticadas
4. **Manter** lógica de acesso original

### Padrão de Consolidação

**Antes (múltiplas policies):**
```sql
-- Policy 1: Admin pode ver tudo
CREATE POLICY "Admin pode ver" ON tabela FOR SELECT USING (is_admin());

-- Policy 2: Usuário vê sua empresa
CREATE POLICY "Usuario ve sua empresa" ON tabela FOR SELECT USING (empresa_id = get_empresa());

-- Policy 3: Público pode ver
CREATE POLICY "Publico pode ver" ON tabela FOR SELECT TO anon USING (true);
```

**Depois (consolidada):**
```sql
-- Policy única com OR
CREATE POLICY "select_consolidado" ON tabela FOR SELECT USING (
    is_admin()
    OR empresa_id = get_empresa()
    OR (current_setting('role') = 'anon')
);
```

---

## 📝 Tabelas a Consolidar (Fase 9)

### Lote 1 - Avaliação de Reação (Baixo Risco)
| Tabela | Policies Atuais | Nova Policy |
|--------|-----------------|-------------|
| `avaliacao_reacao_categorias` | 5 SELECT | 1 SELECT consolidada |
| `avaliacao_reacao_itens` | 5 SELECT | 1 SELECT consolidada |
| `avaliacao_reacao_modelos` | 5 SELECT | 1 SELECT consolidada |
| `avaliacao_reacao_opcoes_resposta` | 5 SELECT | 1 SELECT consolidada |

### Lote 2 - Provas (Baixo Risco)
| Tabela | Policies Atuais | Nova Policy |
|--------|-----------------|-------------|
| `provas_alternativas` | 5 SELECT | 1 SELECT consolidada |
| `provas_questoes` | 5 SELECT | 1 SELECT consolidada |
| `provas_treinamento` | 5 SELECT | 1 SELECT consolidada |

### Lote 3 - Funis (Baixo Risco)
| Tabela | Policies Atuais | Nova Policy |
|--------|-----------------|-------------|
| `funis` | 3 DELETE | 1 DELETE consolidada |
| `funil_etapas` | 3 DELETE | 1 DELETE consolidada |

---

## 🔄 Rollback

Se algo quebrar, execute `ROLLBACK_fase9.sql` para restaurar as policies originais.

---

## ✅ Checklist

- [ ] Criar migração `20260120270000_fix_performance_issues_fase9.sql`
- [ ] Criar rollback `ROLLBACK_fase9.sql`
- [ ] Aplicar Lote 1 (avaliacao_reacao)
- [ ] Testar formulários de avaliação
- [ ] Aplicar Lote 2 (provas)
- [ ] Testar provas públicas
- [ ] Aplicar Lote 3 (funis)
- [ ] Testar funis
- [ ] Atualizar documentação

---

*Documento criado em 20/01/2026*
