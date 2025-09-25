-- Fix security issues: Set proper search_path for functions that were flagged

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix the set_updated_at function  
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix the auto_sync_users function
CREATE OR REPLACE FUNCTION public.auto_sync_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role public.app_role;
  user_username text;
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
    
    RAISE NOTICE 'Usuário criado com role: % (created_by_admin: %)', user_role, NEW.raw_user_meta_data->>'created_by_admin';
    
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