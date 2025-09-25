-- Primeiro, criar profiles faltantes para todos os usuários sem profile
INSERT INTO public.profiles (user_id, username, full_name, email, telefone)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'username', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)),
  au.email,
  au.raw_user_meta_data ->> 'telefone'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
)
ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  telefone = EXCLUDED.telefone;

-- Segundo, atualizar todos os user_roles com username e telefone NULL
UPDATE public.user_roles ur
SET 
  username = p.username,
  telefone = p.telefone
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND (ur.username IS NULL OR ur.telefone IS NULL);

-- Verificar quantos foram atualizados
SELECT 
  COUNT(*) as usuarios_corrigidos,
  'Usernames atualizados com sucesso' as status
FROM user_roles 
WHERE username IS NOT NULL;