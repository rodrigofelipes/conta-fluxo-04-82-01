import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações do WhatsApp Business API
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_DISPLAY_PHONE_NUMBER =
  Deno.env.get('WHATSAPP_DISPLAY_PHONE_NUMBER') || '+5531998813479';

// Cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MENU_MESSAGE = `Por gentileza, informe o número do departamento para o qual você deseja atendimento:

1 - Coordenação
2 - Contábil  
3 - Fiscal
4 - RH - Pessoal
5 - Cadastro / Registro e Legalização
0 - Não sei o departamento`;

// Função para normalizar telefone
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao enviar mensagem WhatsApp:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('Mensagem WhatsApp enviada com sucesso para:', to);
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    const { conversationId } = await req.json();
    
    if (!conversationId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'conversationId is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== REENVIAR MENU ===');
    console.log('Conversation ID:', conversationId);

    // Buscar dados da conversa
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('Conversa não encontrada:', conversationError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Conversa não encontrada' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Conversa encontrada:', conversation.phone_number);

    // Normalizar número
    const normalizedPhone = normalizePhone(conversation.phone_number);
    console.log('Número normalizado:', normalizedPhone);

    // Enviar menu
    const sendResult = await sendWhatsAppMessage(normalizedPhone, MENU_MESSAGE);
    
    if (!sendResult.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Falha ao enviar menu: ${sendResult.error}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar mensagem na tabela whatsapp_messages
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        admin_id: conversation.admin_id,
        from_phone: WHATSAPP_DISPLAY_PHONE_NUMBER,
        to_phone: conversation.phone_number,
        content: `[MENU REENVIADO] ${MENU_MESSAGE}`,
        direction: 'outbound',
        message_type: 'text'
      });

    if (messageError) {
      console.error('Erro ao registrar mensagem:', messageError);
    }

    // Atualizar updated_at da conversa
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Erro ao atualizar conversa:', updateError);
    }

    console.log('✅ Menu reenviado com sucesso');

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: sendResult.messageId,
      message: 'Menu reenviado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no reenvio do menu:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});