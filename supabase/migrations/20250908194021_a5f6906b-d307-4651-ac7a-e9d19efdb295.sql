-- Atualizar função auto_sync_users para processar setores múltiplos
CREATE OR REPLACE FUNCTION public.auto_sync_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role public.app_role;
  user_username text;
  user_setores jsonb;
  setor_item text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Limpar dados relacionados ao usuário deletado
    DELETE FROM public.profiles WHERE user_id = OLD.id;
    DELETE FROM public.user_roles WHERE user_id = OLD.id;
    DELETE FROM public.admin_setores WHERE user_id = OLD.id;
    DELETE FROM public.master_admins WHERE user_id = OLD.id;
    DELETE FROM public.employee_profiles WHERE user_id = OLD.id;
    DELETE FROM public.client_profiles WHERE user_id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    -- CRÍTICO: SEMPRE criar como 'user' quando criado por admin
    -- Verificar se foi criado por admin (tem metadata created_by_admin)
    IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
      user_role := 'user'::public.app_role;
    ELSE
      -- Usuários que se registram normalmente também são 'user'
      user_role := 'user'::public.app_role;
    END IF;
    
    -- Extrair username do metadata ou usar email
    user_username := COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      split_part(NEW.email, '@', 1)
    );
    
    -- Criar profile para novo usuário APENAS se não existir
    INSERT INTO public.profiles (user_id, username, full_name, email, telefone)
    VALUES (
      NEW.id,
      user_username,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', user_username),
      NEW.email,
      NEW.raw_user_meta_data ->> 'telefone'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      telefone = EXCLUDED.telefone,
      updated_at = now();
    
    -- Criar user_role SEMPRE como 'user' para usuários criados por admin
    INSERT INTO public.user_roles (user_id, role, username, telefone, user_type)
    VALUES (
      NEW.id, 
      user_role,
      user_username,
      NEW.raw_user_meta_data ->> 'telefone',
      'employee'::public.user_type
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Processar setores se existirem no metadata
    user_setores := NEW.raw_user_meta_data->'setores';
    IF user_setores IS NOT NULL AND jsonb_typeof(user_setores) = 'array' THEN
      -- Iterar pelos setores selecionados
      FOR setor_item IN SELECT jsonb_array_elements_text(user_setores)
      LOOP
        INSERT INTO public.admin_setores (user_id, setor, username)
        VALUES (
          NEW.id,
          setor_item::public.setor,
          user_username
        )
        ON CONFLICT (user_id, setor) DO NOTHING;
      END LOOP;
    END IF;
    
    RAISE NOTICE 'Usuário criado com role: % e setores: % (created_by_admin: %)', user_role, user_setores, NEW.raw_user_meta_data->>'created_by_admin';
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar dados do usuário (sem alterar role)
    user_username := COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      split_part(NEW.email, '@', 1)
    );
    
    -- Atualizar user_roles
    UPDATE public.user_roles 
    SET 
      username = user_username,
      telefone = NEW.raw_user_meta_data ->> 'telefone'
    WHERE user_id = NEW.id;
    
    -- Atualizar profiles
    UPDATE public.profiles
    SET 
      username = user_username,
      full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', username),
      email = NEW.email,
      telefone = NEW.raw_user_meta_data ->> 'telefone',
      updated_at = now()
    WHERE user_id = NEW.id;
    
    -- Atualizar admin_setores se existe
    UPDATE public.admin_setores 
    SET username = user_username 
    WHERE user_id = NEW.id;
    
    -- Atualizar employee_profiles se existe
    UPDATE public.employee_profiles
    SET 
      full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', full_name),
      email = NEW.email,
      telefone = NEW.raw_user_meta_data ->> 'telefone',
      updated_at = now()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;