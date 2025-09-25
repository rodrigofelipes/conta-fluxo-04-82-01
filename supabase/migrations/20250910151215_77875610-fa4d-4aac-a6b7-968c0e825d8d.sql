-- Adicionar campos de rastreamento na tabela whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS wamid text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS error_details text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Criar índice para busca rápida por wamid
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wamid ON public.whatsapp_messages(wamid);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.whatsapp_messages.wamid IS 'WhatsApp Message ID para correlação com webhooks';
COMMENT ON COLUMN public.whatsapp_messages.status IS 'Status da mensagem: pending, sent, delivered, read, failed';
COMMENT ON COLUMN public.whatsapp_messages.error_code IS 'Código de erro do WhatsApp API';
COMMENT ON COLUMN public.whatsapp_messages.error_details IS 'Detalhes do erro em JSON';