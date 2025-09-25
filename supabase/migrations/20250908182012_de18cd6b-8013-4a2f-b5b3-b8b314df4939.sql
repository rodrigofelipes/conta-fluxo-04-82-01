-- Criar tabela para múltiplos telefones por cliente
CREATE TABLE public.cliente_telefones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  departamento TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Celular',
  principal BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cliente_telefones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view phones from their setor" 
ON public.cliente_telefones 
FOR SELECT 
USING (
  is_user_master_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_telefones.cliente_id 
    AND user_has_setor_access(auth.uid(), c.setor)
  )
);

CREATE POLICY "Admins can insert phones for their setor clients" 
ON public.cliente_telefones 
FOR INSERT 
WITH CHECK (
  is_admin() AND (
    is_user_master_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.clientes c 
      WHERE c.id = cliente_telefones.cliente_id 
      AND user_has_setor_access(auth.uid(), c.setor)
    )
  )
);

CREATE POLICY "Admins can update phones from their setor" 
ON public.cliente_telefones 
FOR UPDATE 
USING (
  is_user_master_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_telefones.cliente_id 
    AND user_has_setor_access(auth.uid(), c.setor)
  )
);

CREATE POLICY "Admins can delete phones from their setor" 
ON public.cliente_telefones 
FOR DELETE 
USING (
  is_user_master_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_telefones.cliente_id 
    AND user_has_setor_access(auth.uid(), c.setor)
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_cliente_telefones_updated_at
  BEFORE UPDATE ON public.cliente_telefones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar telefones existentes
INSERT INTO public.cliente_telefones (cliente_id, telefone, departamento, tipo, principal)
SELECT 
  id,
  telefone,
  'Geral' as departamento,
  'Celular' as tipo,
  true as principal
FROM public.clientes 
WHERE telefone IS NOT NULL AND telefone != '';

-- Índices para performance
CREATE INDEX idx_cliente_telefones_cliente_id ON public.cliente_telefones(cliente_id);
CREATE INDEX idx_cliente_telefones_principal ON public.cliente_telefones(cliente_id, principal) WHERE principal = true;