-- Atualizar trigger para incluir empresa_id, role e setor_id dos metadados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, empresa_id, setor_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data ->> 'role')::app_role, 'cliente_final'),
    (new.raw_user_meta_data ->> 'empresa_id')::uuid,
    (new.raw_user_meta_data ->> 'setor_id')::uuid
  );
  RETURN new;
END;
$$;
