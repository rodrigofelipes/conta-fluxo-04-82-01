-- Corrigir search_path das funções para evitar warning de segurança
CREATE OR REPLACE FUNCTION public.find_admin_by_client_and_setor(client_id_param uuid, setor_param setor)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id_result uuid;
BEGIN
  -- Buscar admin específico para o cliente e setor
  SELECT admin_id INTO admin_id_result
  FROM public.cliente_admin_setores
  WHERE cliente_id = client_id_param AND setor = setor_param;
  
  RETURN admin_id_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_available_admin_with_setor(client_id_param uuid, setor_param setor)
RETURNS TABLE(admin_id uuid, admin_username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- 2. Se não encontrou, buscar admin disponível do setor
  SELECT asec.user_id, asec.username INTO fallback_admin_id, admin_username_result
  FROM public.admin_setores asec
  JOIN public.user_roles ur ON asec.user_id = ur.user_id
  WHERE (asec.setor = setor_param OR asec.setor = 'TODOS'::public.setor)
    AND ur.role = 'admin'::public.app_role
  ORDER BY 
    CASE WHEN asec.setor = setor_param THEN 1 ELSE 2 END,
    asec.created_at
  LIMIT 1;
  
  IF fallback_admin_id IS NOT NULL THEN
    RETURN QUERY SELECT fallback_admin_id, admin_username_result;
  END IF;
  
END;
$$;