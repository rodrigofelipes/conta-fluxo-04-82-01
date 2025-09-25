import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { conversationId, adminId } = await req.json();

    if (!conversationId || !adminId) {
      return new Response(JSON.stringify({ error: 'conversationId e adminId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Encerrando conversa WhatsApp:', { conversationId, adminId });

    // Verificar se o admin tem permissão para encerrar esta conversa
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('admin_id', adminId)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversa não encontrada ou sem permissão' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar status da conversa para ENDED
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({ 
        status: 'ENDED',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Erro ao atualizar conversa:', updateError);
      return new Response(JSON.stringify({ error: 'Erro ao encerrar conversa' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar mensagem de encerramento no histórico
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      admin_id: adminId,
      from_phone: 'SYSTEM',
      to_phone: conversation.phone_number,
      content: 'Conversa encerrada pelo admin',
      direction: 'system',
      message_type: 'system'
    });

    console.log('Conversa WhatsApp encerrada com sucesso');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao encerrar conversa WhatsApp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});