-- ============================================================================
-- ROLLBACK: Reverter Correções de Performance Fase 7
-- Data: 20/01/2026
-- ATENÇÃO: Execute apenas se houver problemas após as correções
-- NOTA: Reverte (select auth.uid()) para auth.uid() - afeta apenas performance
-- ============================================================================

-- Função para reverter policies para auth.uid() direto
DO $$
DECLARE
    r RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_sql TEXT;
    create_sql TEXT;
    policy_roles TEXT;
BEGIN
    -- Loop em todas as policies que foram corrigidas
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
              (qual LIKE '%(select auth.uid())%')
              OR (with_check LIKE '%(select auth.uid())%')
          )
    LOOP
        -- Reverter expressão USING
        new_qual := r.qual;
        IF new_qual IS NOT NULL THEN
            new_qual := REPLACE(new_qual, '(select auth.uid())', 'auth.uid()');
        END IF;
        
        -- Reverter expressão WITH CHECK
        new_with_check := r.with_check;
        IF new_with_check IS NOT NULL THEN
            new_with_check := REPLACE(new_with_check, '(select auth.uid())', 'auth.uid()');
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
        
        -- Criar policy revertida
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
    
    RAISE NOTICE 'Rollback Fase 7 concluído: policies revertidas para auth.uid()';
END $$;

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script APENAS se houver problemas após Fase 7
-- 2. Isso reverte a otimização de performance
-- 3. NÃO afeta funcionalidade, apenas performance
-- ============================================================================
