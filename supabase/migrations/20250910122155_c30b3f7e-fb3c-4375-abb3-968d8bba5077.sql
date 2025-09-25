-- Atualizar função user_has_setor_access para dar acesso master ao setor COORDENACAO
CREATE OR REPLACE FUNCTION public.user_has_setor_access(user_id_param uuid, setor_param setor)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Se é master admin, sempre tem acesso
  IF public.is_user_master_admin(user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Se tem setor COORDENACAO, sempre tem acesso a tudo (é como um master admin)
  IF EXISTS (
    SELECT 1 FROM public.admin_setores 
    WHERE user_id = user_id_param AND setor = 'COORDENACAO'::public.setor
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Se o setor solicitado é TODOS, só master admin ou admin com setor TODOS pode acessar
  IF setor_param = 'TODOS'::public.setor THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admin_setores 
      WHERE user_id = user_id_param AND setor = 'TODOS'::public.setor
    );
  ELSE
    -- Para setores específicos, permitir se tem acesso ao setor específico OU setor TODOS
    RETURN EXISTS (
      SELECT 1 FROM public.admin_setores 
      WHERE user_id = user_id_param 
        AND (setor = setor_param OR setor = 'TODOS'::public.setor)
    );
  END IF;
END;
$function$

-- Criar função para verificar se usuário tem privilégios de coordenação
CREATE OR REPLACE FUNCTION public.is_user_coordenacao(user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_setores 
    WHERE user_id = user_id_param AND setor = 'COORDENACAO'::public.setor
  );
$function$

-- Atualizar função find_available_admin_with_setor para priorizar coordenação
CREATE OR REPLACE FUNCTION public.find_available_admin_with_setor(client_id_param uuid, setor_param setor)
 RETURNS TABLE(admin_id uuid, admin_username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  specific_admin_id uuid;
  fallback_admin_id uuid;
  admin_username_result text;
BEGIN
  -- 1. Primeiro tenta buscar admin específico do cliente para o setor
  SELECT public.find_admin_by_client_and_setor(client_id_param, setor_param) INTO specific_admin_id;
  
  IF specific_admin_id IS NOT NULL THEN
    -- Buscar username do admin específico
    SELECT username INTO admin_username_result
    FROM public.profiles
    WHERE user_id = specific_admin_id;
    
    RETURN QUERY SELECT specific_admin_id, admin_username_result;
    RETURN;
  END IF;
  
  -- 2. Se não encontrou, buscar admin disponível, priorizando COORDENACAO
  SELECT asec.user_id, asec.username INTO fallback_admin_id, admin_username_result
  FROM public.admin_setores asec
  JOIN public.user_roles ur ON asec.user_id = ur.user_id
  WHERE (asec.setor = setor_param OR asec.setor = 'TODOS'::public.setor OR asec.setor = 'COORDENACAO'::public.setor)
    AND ur.role = 'admin'::public.app_role
  ORDER BY 
    CASE WHEN asec.setor = 'COORDENACAO' THEN 1 
         WHEN asec.setor = setor_param THEN 2 
         ELSE 3 END,
    asec.created_at
  LIMIT 1;
  
  IF fallback_admin_id IS NOT NULL THEN
    RETURN QUERY SELECT fallback_admin_id, admin_username_result;
  END IF;
  
END;
$function$