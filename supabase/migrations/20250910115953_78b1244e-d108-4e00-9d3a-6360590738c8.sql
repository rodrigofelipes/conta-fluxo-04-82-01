-- Add CADASTRO to the setor enum (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CADASTRO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'setor')) THEN
        ALTER TYPE public.setor ADD VALUE 'CADASTRO';
    END IF;
END
$$;

-- Create table for WhatsApp messages history (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
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

-- Enable RLS (only if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE n.nspname = 'public' AND c.relname = 'whatsapp_messages' 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create policies for WhatsApp messages (drop first if exists)
DROP POLICY IF EXISTS "Admins can view whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Service role can manage whatsapp messages" ON public.whatsapp_messages;

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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);