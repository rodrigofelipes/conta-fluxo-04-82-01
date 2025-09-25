-- Criar tabela para controlar conversas WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id),
  status TEXT NOT NULL DEFAULT 'INITIAL',
  selected_department TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_phone UNIQUE (normalized_phone)
);

-- Índices para performance
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(normalized_phone);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);

-- RLS policies
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage whatsapp conversations"
ON public.whatsapp_conversations
FOR ALL
USING (
  (auth.jwt() ->> 'role'::text) = 'service_role'::text
);

CREATE POLICY "Admins can view whatsapp conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();