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