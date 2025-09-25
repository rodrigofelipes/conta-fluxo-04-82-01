-- Adicionar status ENDED para conversas WhatsApp
ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'ENDED';

-- Criar função para encerrar conversa WhatsApp
CREATE OR REPLACE FUNCTION public.end_whatsapp_conversation(conversation_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se quem está chamando é admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can end WhatsApp conversations';
  END IF;
  
  -- Atualizar status da conversa para ENDED
  UPDATE public.whatsapp_conversations 
  SET 
    status = 'ENDED',
    updated_at = now()
  WHERE id = conversation_id_param;
  
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;