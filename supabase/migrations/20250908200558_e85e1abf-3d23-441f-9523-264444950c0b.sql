-- Primeiro, remover a constraint existente
ALTER TABLE whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_client_id_fkey;

-- Recriar a constraint com SET NULL ao deletar cliente
-- Isso permite manter o histórico de conversas mesmo após deletar o cliente
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clientes(id) 
ON DELETE SET NULL;