-- Atualizar constraint para aceitar as direções corretas
ALTER TABLE whatsapp_messages 
DROP CONSTRAINT whatsapp_messages_direction_check;

ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_direction_check 
CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'system'::text]));