-- Corrigir mensagens do WhatsApp que foram salvas incorretamente como 'internal'
UPDATE messages 
SET message_type = 'whatsapp'
WHERE from_user_name LIKE '%(WhatsApp)%' 
AND message_type = 'internal';