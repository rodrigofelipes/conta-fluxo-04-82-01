-- Resetar conversa problemática que estava travada no departamento PLANEJAMENTO
UPDATE whatsapp_conversations 
SET status = 'INITIAL', 
    selected_department = NULL, 
    admin_id = NULL, 
    updated_at = now()
WHERE phone_number = '553197810730';