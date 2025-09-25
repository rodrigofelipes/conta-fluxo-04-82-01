-- Corrigir constraint da tabela whatsapp_messages para aceitar 'outbound'
ALTER TABLE whatsapp_messages 
DROP CONSTRAINT whatsapp_messages_direction_check;

ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_direction_check 
CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text, 'outbound'::text]));