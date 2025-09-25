-- Step 1: Create user_type enum
CREATE TYPE public.user_type AS ENUM ('employee', 'client');

-- Step 2: Create employee_profiles table for internal collaborators
CREATE TABLE public.employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create client_profiles table for clients with system access
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'read_only' CHECK (access_level IN ('full', 'limited', 'read_only')),
  last_login TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'SUSPENSO', 'INATIVO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Add user_type to user_roles table
ALTER TABLE public.user_roles ADD COLUMN user_type public.user_type DEFAULT 'employee';

-- Step 5: Add has_system_access to clientes table
ALTER TABLE public.clientes ADD COLUMN has_system_access BOOLEAN DEFAULT false;

-- Step 6: Enable RLS on new tables
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for employee_profiles
CREATE POLICY "Employees can view their own profile" 
ON public.employee_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Employees can update their own profile" 
ON public.employee_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all employee profiles" 
ON public.employee_profiles 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can insert employee profiles" 
ON public.employee_profiles 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update employee profiles" 
ON public.employee_profiles 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Master admins can delete employee profiles" 
ON public.employee_profiles 
FOR DELETE 
USING (is_current_user_master_admin());

-- Step 8: Create RLS policies for client_profiles
CREATE POLICY "Clients can view their own profile" 
ON public.client_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view client profiles from their setor" 
ON public.client_profiles 
FOR SELECT 
USING (is_admin() AND EXISTS (
  SELECT 1 FROM public.clientes c 
  WHERE c.id = client_profiles.client_id 
  AND (is_user_master_admin(auth.uid()) OR user_has_setor_access(auth.uid(), c.setor))
));

CREATE POLICY "Admins can insert client profiles" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (is_admin() AND EXISTS (
  SELECT 1 FROM public.clientes c 
  WHERE c.id = client_profiles.client_id 
  AND (is_user_master_admin(auth.uid()) OR user_has_setor_access(auth.uid(), c.setor))
));

CREATE POLICY "Admins can update client profiles from their setor" 
ON public.client_profiles 
FOR UPDATE 
USING (is_admin() AND EXISTS (
  SELECT 1 FROM public.clientes c 
  WHERE c.id = client_profiles.client_id 
  AND (is_user_master_admin(auth.uid()) OR user_has_setor_access(auth.uid(), c.setor))
));

-- Step 9: Migrate existing data from profiles to employee_profiles
-- Identify employees (users with admin roles or those not matching any client)
INSERT INTO public.employee_profiles (
  user_id, 
  full_name, 
  email, 
  telefone, 
  department,
  position
)
SELECT 
  p.user_id,
  COALESCE(p.full_name, p.username, 'Funcionário'),
  p.email,
  p.telefone,
  CASE 
    WHEN ur.role = 'admin' THEN 
      COALESCE((SELECT setor::text FROM admin_setores WHERE user_id = p.user_id LIMIT 1), 'GERAL')
    ELSE 'GERAL'
  END,
  CASE WHEN ur.role = 'admin' THEN 'Administrador' ELSE 'Funcionário' END
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.clientes c 
  WHERE (c.email = p.email AND c.email IS NOT NULL)
     OR (c.telefone = p.telefone AND c.telefone IS NOT NULL)
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 10: Create client profiles for users that match existing clients
INSERT INTO public.client_profiles (
  user_id,
  client_id,
  access_level
)
SELECT DISTINCT
  p.user_id,
  c.id,
  'limited' -- Default access level for existing clients
FROM public.profiles p
JOIN public.clientes c ON (
  (c.email = p.email AND c.email IS NOT NULL AND p.email IS NOT NULL)
  OR (c.telefone = p.telefone AND c.telefone IS NOT NULL AND p.telefone IS NOT NULL)
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_profiles ep WHERE ep.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 11: Update has_system_access for clients with profiles
UPDATE public.clientes 
SET has_system_access = true 
WHERE id IN (
  SELECT client_id FROM public.client_profiles
);

-- Step 12: Update user_type in user_roles based on new profile tables
UPDATE public.user_roles 
SET user_type = 'employee'
WHERE user_id IN (SELECT user_id FROM public.employee_profiles);

UPDATE public.user_roles 
SET user_type = 'client'
WHERE user_id IN (SELECT user_id FROM public.client_profiles);

-- Step 13: Add triggers for updated_at
CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 14: Create function to get user profile type
CREATE OR REPLACE FUNCTION public.get_user_profile_type(user_id_param UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM employee_profiles WHERE user_id = user_id_param) THEN 'employee'
      WHEN EXISTS (SELECT 1 FROM client_profiles WHERE user_id = user_id_param) THEN 'client'
      ELSE 'unknown'
    END;
$$;

-- Step 15: Create indexes for better performance
CREATE INDEX idx_employee_profiles_user_id ON public.employee_profiles(user_id);
CREATE INDEX idx_employee_profiles_email ON public.employee_profiles(email);
CREATE INDEX idx_employee_profiles_status ON public.employee_profiles(status);
CREATE INDEX idx_client_profiles_user_id ON public.client_profiles(user_id);
CREATE INDEX idx_client_profiles_client_id ON public.client_profiles(client_id);
CREATE INDEX idx_client_profiles_status ON public.client_profiles(status);