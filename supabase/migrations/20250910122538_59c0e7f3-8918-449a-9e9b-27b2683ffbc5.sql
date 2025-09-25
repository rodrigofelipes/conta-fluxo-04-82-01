-- Atualizar políticas RLS da tabela clientes para incluir acesso do setor COORDENACAO

-- Remover políticas existentes que podem estar limitando acesso
DROP POLICY IF EXISTS "Admins can view clients from their setor" ON public.clientes;
DROP POLICY IF EXISTS "Restricted client data access" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update clients from their setor" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clients from their setor" ON public.clientes;
DROP POLICY IF EXISTS "Admins can insert clients in their setor" ON public.clientes;

-- Criar novas políticas que consideram COORDENACAO como acesso total
CREATE POLICY "Coordenacao and master admins can view all clients" 
ON public.clientes 
FOR SELECT 
USING (
  is_user_master_admin(auth.uid()) 
  OR is_user_coordenacao(auth.uid())
  OR user_has_setor_access(auth.uid(), setor)
);

CREATE POLICY "Coordenacao and master admins can update all clients" 
ON public.clientes 
FOR UPDATE 
USING (
  is_user_master_admin(auth.uid()) 
  OR is_user_coordenacao(auth.uid())
  OR user_has_setor_access(auth.uid(), setor)
);

CREATE POLICY "Coordenacao and master admins can delete all clients" 
ON public.clientes 
FOR DELETE 
USING (
  is_user_master_admin(auth.uid()) 
  OR is_user_coordenacao(auth.uid())
  OR user_has_setor_access(auth.uid(), setor)
);

CREATE POLICY "Coordenacao and master admins can insert clients" 
ON public.clientes 
FOR INSERT 
WITH CHECK (
  is_admin() AND (
    is_user_master_admin(auth.uid()) 
    OR is_user_coordenacao(auth.uid())
    OR user_has_setor_access(auth.uid(), setor)
  )
);