-- =============================================
-- CORREÇÃO DE RECURSÃO INFINITA EM TODAS AS POLÍTICAS RLS
-- Substituir subqueries em profiles por funções SECURITY DEFINER
-- =============================================

-- 1. TABELA clientes_sst
DROP POLICY IF EXISTS "Empresa SST pode ver seus clientes" ON public.clientes_sst;
CREATE POLICY "Empresa SST pode ver seus clientes" ON public.clientes_sst
FOR SELECT USING (empresa_sst_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode gerenciar seus clientes" ON public.clientes_sst;
CREATE POLICY "Empresa SST pode gerenciar seus clientes" ON public.clientes_sst
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_sst_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_sst_id = get_user_empresa_id(auth.uid())
);

-- 2. TABELA comercial_funil
DROP POLICY IF EXISTS "Empresa SST pode ver seu funil comercial" ON public.comercial_funil;
CREATE POLICY "Empresa SST pode ver seu funil comercial" ON public.comercial_funil
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode gerenciar seu funil" ON public.comercial_funil;
CREATE POLICY "Empresa SST pode gerenciar seu funil" ON public.comercial_funil
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- 3. TABELA configuracoes_empresa
DROP POLICY IF EXISTS "Usuários podem ver configurações da sua empresa" ON public.configuracoes_empresa;
CREATE POLICY "Usuários podem ver configurações da sua empresa" ON public.configuracoes_empresa
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 4. TABELA empresas
DROP POLICY IF EXISTS "Empresa SST pode atualizar seus clientes" ON public.empresas;
CREATE POLICY "Empresa SST pode atualizar seus clientes" ON public.empresas
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  tipo = 'cliente_final'::tipo_empresa AND 
  id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
  )
);

-- 5. TABELA empresas_modulos
DROP POLICY IF EXISTS "Usuários podem ver módulos da sua empresa" ON public.empresas_modulos;
CREATE POLICY "Usuários podem ver módulos da sua empresa" ON public.empresas_modulos
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode gerenciar módulos dos seus clientes" ON public.empresas_modulos;
CREATE POLICY "Empresa SST pode gerenciar módulos dos seus clientes" ON public.empresas_modulos
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id IN (
    SELECT cliente_empresa_id FROM clientes_sst 
    WHERE empresa_sst_id = get_user_empresa_id(auth.uid())
  )
);

-- 6. TABELA entregas_epi
DROP POLICY IF EXISTS "Cliente final pode ver entregas EPI da sua empresa" ON public.entregas_epi;
CREATE POLICY "Cliente final pode ver entregas EPI da sua empresa" ON public.entregas_epi
FOR SELECT USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode cadastrar entregas EPI da sua empresa" ON public.entregas_epi;
CREATE POLICY "Cliente final pode cadastrar entregas EPI da sua empresa" ON public.entregas_epi
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Empresa SST pode ver entregas EPI da sua empresa" ON public.entregas_epi;
CREATE POLICY "Empresa SST pode ver entregas EPI da sua empresa" ON public.entregas_epi
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode gerenciar entregas EPI da sua empresa" ON public.entregas_epi;
CREATE POLICY "Empresa SST pode gerenciar entregas EPI da sua empresa" ON public.entregas_epi
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- 7. TABELA financeiro_contas
DROP POLICY IF EXISTS "Cliente final pode ver suas contas" ON public.financeiro_contas;
CREATE POLICY "Cliente final pode ver suas contas" ON public.financeiro_contas
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode ver suas contas" ON public.financeiro_contas;
CREATE POLICY "Empresa SST pode ver suas contas" ON public.financeiro_contas
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Empresa SST pode gerenciar suas contas" ON public.financeiro_contas;
CREATE POLICY "Empresa SST pode gerenciar suas contas" ON public.financeiro_contas
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- 8. TABELA saude_ocupacional
DROP POLICY IF EXISTS "Cliente final pode ver saúde ocupacional da sua empresa" ON public.saude_ocupacional;
CREATE POLICY "Cliente final pode ver saúde ocupacional da sua empresa" ON public.saude_ocupacional
FOR SELECT USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode cadastrar exames da sua empresa" ON public.saude_ocupacional;
CREATE POLICY "Cliente final pode cadastrar exames da sua empresa" ON public.saude_ocupacional
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Empresa SST pode gerenciar saúde ocupacional da sua empresa" ON public.saude_ocupacional;
CREATE POLICY "Empresa SST pode gerenciar saúde ocupacional da sua empresa" ON public.saude_ocupacional
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Empresa SST pode ver saúde ocupacional da sua empresa" ON public.saude_ocupacional;
CREATE POLICY "Empresa SST pode ver saúde ocupacional da sua empresa" ON public.saude_ocupacional
FOR SELECT USING (empresa_id = get_user_empresa_id(auth.uid()));

-- 9. TABELA terceiros
DROP POLICY IF EXISTS "Cliente final pode ver terceiros da sua empresa" ON public.terceiros;
CREATE POLICY "Cliente final pode ver terceiros da sua empresa" ON public.terceiros
FOR SELECT USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode cadastrar terceiros" ON public.terceiros;
CREATE POLICY "Cliente final pode cadastrar terceiros" ON public.terceiros
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode atualizar terceiros" ON public.terceiros;
CREATE POLICY "Cliente final pode atualizar terceiros" ON public.terceiros
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode deletar terceiros" ON public.terceiros;
CREATE POLICY "Cliente final pode deletar terceiros" ON public.terceiros
FOR DELETE USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Empresa SST pode gerenciar terceiros da sua empresa" ON public.terceiros;
CREATE POLICY "Empresa SST pode gerenciar terceiros da sua empresa" ON public.terceiros
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- 10. TABELA treinamentos
DROP POLICY IF EXISTS "Cliente final pode ver treinamentos da sua empresa" ON public.treinamentos;
CREATE POLICY "Cliente final pode ver treinamentos da sua empresa" ON public.treinamentos
FOR SELECT USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode cadastrar treinamentos da sua empresa" ON public.treinamentos;
CREATE POLICY "Cliente final pode cadastrar treinamentos da sua empresa" ON public.treinamentos
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode atualizar treinamentos da sua empresa" ON public.treinamentos;
CREATE POLICY "Cliente final pode atualizar treinamentos da sua empresa" ON public.treinamentos
FOR UPDATE USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Cliente final pode deletar treinamentos da sua empresa" ON public.treinamentos;
CREATE POLICY "Cliente final pode deletar treinamentos da sua empresa" ON public.treinamentos
FOR DELETE USING (
  get_user_role(auth.uid()) = 'cliente_final' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Empresa SST pode gerenciar treinamentos da sua empresa" ON public.treinamentos;
CREATE POLICY "Empresa SST pode gerenciar treinamentos da sua empresa" ON public.treinamentos
FOR ALL USING (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'empresa_sst' AND 
  empresa_id = get_user_empresa_id(auth.uid())
);

-- 11. TABELA storage.objects (ASO files bucket)
DROP POLICY IF EXISTS "Usuários podem ver arquivos ASO da sua empresa" ON storage.objects;
CREATE POLICY "Usuários podem ver arquivos ASO da sua empresa" ON storage.objects
FOR SELECT USING (
  bucket_id = 'aso-files' AND 
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Usuários podem fazer upload de arquivos ASO" ON storage.objects;
CREATE POLICY "Usuários podem fazer upload de arquivos ASO" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'aso-files' AND 
  (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);