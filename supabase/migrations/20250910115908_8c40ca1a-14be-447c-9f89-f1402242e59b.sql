-- Add CADASTRO to the setor enum
ALTER TYPE public.setor ADD VALUE 'CADASTRO';

-- Create table for WhatsApp conversations with state management
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id),
  admin_id UUID,
  status TEXT NOT NULL DEFAULT 'INITIAL' CHECK (status IN ('INITIAL', 'WAITING_DEPARTMENT', 'ROUTED', 'FINISHED')),
  selected_department TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for WhatsApp conversations
CREATE POLICY "Admins can view whatsapp conversations" 
ON public.whatsapp_conversations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
));

CREATE POLICY "Service role can manage whatsapp conversations" 
ON public.whatsapp_conversations 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create table for WhatsApp messages history
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'interactive')),
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  admin_id UUID, -- For messages sent by admins
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for WhatsApp messages
CREATE POLICY "Admins can view whatsapp messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
));

CREATE POLICY "Service role can manage whatsapp messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(normalized_phone);
CREATE INDEX idx_whatsapp_conversations_client ON public.whatsapp_conversations(client_id);
CREATE INDEX idx_whatsapp_conversations_admin ON public.whatsapp_conversations(admin_id);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();