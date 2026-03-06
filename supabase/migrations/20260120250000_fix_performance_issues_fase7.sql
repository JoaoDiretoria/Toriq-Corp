-- ============================================================================
-- FASE 7: Otimização de Performance - auth_rls_initplan
-- Data: 20/01/2026
-- Projeto: xraggzqaddfiymqgrtha
-- ============================================================================
-- IMPACTO:
-- - ~832 policies corrigidas
-- - Substitui auth.uid() por (select auth.uid())
-- - Melhora performance em queries com muitas linhas
-- - SEM IMPACTO em funcionalidade (apenas performance)
-- ============================================================================

-- Função auxiliar para recriar policies com (select auth.uid())
DO $$
DECLARE
    r RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_sql TEXT;
    create_sql TEXT;
    policy_roles TEXT;
BEGIN
    -- Loop em todas as policies que precisam de correção
    FOR r IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
              (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%' AND qual NOT LIKE '%( select auth.uid())%')
              OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%( select auth.uid())%')
          )
    LOOP
        -- Preparar nova expressão USING
        new_qual := r.qual;
        IF new_qual IS NOT NULL THEN
            new_qual := REPLACE(new_qual, 'auth.uid()', '(select auth.uid())');
        END IF;
        
        -- Preparar nova expressão WITH CHECK
        new_with_check := r.with_check;
        IF new_with_check IS NOT NULL THEN
            new_with_check := REPLACE(new_with_check, 'auth.uid()', '(select auth.uid())');
        END IF;
        
        -- Preparar roles
        IF r.roles = '{public}' THEN
            policy_roles := '';
        ELSE
            policy_roles := ' TO ' || array_to_string(r.roles, ', ');
        END IF;
        
        -- Drop policy existente
        drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        EXECUTE drop_sql;
        
        -- Criar nova policy
        IF r.cmd = 'SELECT' THEN
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR SELECT%s USING (%s)',
                r.policyname, r.schemaname, r.tablename,
                CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                policy_roles,
                new_qual
            );
        ELSIF r.cmd = 'INSERT' THEN
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR INSERT%s WITH CHECK (%s)',
                r.policyname, r.schemaname, r.tablename,
                CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                policy_roles,
                COALESCE(new_with_check, 'true')
            );
        ELSIF r.cmd = 'UPDATE' THEN
            IF new_qual IS NOT NULL AND new_with_check IS NOT NULL THEN
                create_sql := format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE%s USING (%s) WITH CHECK (%s)',
                    r.policyname, r.schemaname, r.tablename,
                    CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                    policy_roles,
                    new_qual,
                    new_with_check
                );
            ELSIF new_qual IS NOT NULL THEN
                create_sql := format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE%s USING (%s)',
                    r.policyname, r.schemaname, r.tablename,
                    CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                    policy_roles,
                    new_qual
                );
            ELSE
                create_sql := format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE%s WITH CHECK (%s)',
                    r.policyname, r.schemaname, r.tablename,
                    CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                    policy_roles,
                    new_with_check
                );
            END IF;
        ELSIF r.cmd = 'DELETE' THEN
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR DELETE%s USING (%s)',
                r.policyname, r.schemaname, r.tablename,
                CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                policy_roles,
                new_qual
            );
        ELSIF r.cmd = 'ALL' THEN
            IF new_qual IS NOT NULL AND new_with_check IS NOT NULL THEN
                create_sql := format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR ALL%s USING (%s) WITH CHECK (%s)',
                    r.policyname, r.schemaname, r.tablename,
                    CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                    policy_roles,
                    new_qual,
                    new_with_check
                );
            ELSIF new_qual IS NOT NULL THEN
                create_sql := format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR ALL%s USING (%s)',
                    r.policyname, r.schemaname, r.tablename,
                    CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                    policy_roles,
                    new_qual
                );
            END IF;
        END IF;
        
        -- Executar criação
        IF create_sql IS NOT NULL THEN
            EXECUTE create_sql;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE 'Fase 7 concluída: policies otimizadas com (select auth.uid())';
END $$;

-- ============================================================================
-- RESUMO FASE 7:
-- - ~832 policies atualizadas automaticamente
-- - auth.uid() → (select auth.uid())
-- - Melhora performance em RLS
-- ============================================================================
