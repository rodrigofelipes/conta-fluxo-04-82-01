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
    console.log('=== WHATSAPP DELIVERY STATUS CHECK ===');
    console.log('Método da requisição:', req.method);
    console.log('Headers:', req.headers);
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Body recebido:', requestBody);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { messageId, conversationId } = requestBody;
    
    // messageId é opcional para análise geral de padrões
    console.log('Parâmetros recebidos:', { messageId, conversationId });

    // Verificar status da mensagem na API do WhatsApp apenas se messageId for fornecido
    let deliveryStatus = null;
    let apiError = null;

    if (messageId && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      try {
        console.log(`Consultando status da mensagem: ${messageId}`);
        const statusResponse = await fetch(`https://graph.facebook.com/v17.0/${messageId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (statusResponse.ok) {
          deliveryStatus = await statusResponse.json();
          console.log('Status da mensagem:', deliveryStatus);
        } else {
          const errorData = await statusResponse.json();
          apiError = errorData;
          console.log('Erro ao verificar status:', errorData);
        }
      } catch (error) {
        console.error('Erro de rede ao verificar status:', error);
        apiError = { message: error.message };
      }
    } else if (!messageId) {
      console.log('Análise sem messageId - focando em padrões de conversa');
    }

    // Buscar mensagens recentes relacionadas ao número
    let recentMessages = [];
    if (conversationId) {
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!messagesError) {
        recentMessages = messages || [];
        console.log(`Encontradas ${recentMessages.length} mensagens para análise`);
      } else {
        console.error('Erro ao buscar mensagens:', messagesError);
      }
    }

    // Verificar padrões de entrega
    const outboundMessages = recentMessages.filter(msg => msg.direction === 'outbound');
    const inboundMessages = recentMessages.filter(msg => msg.direction === 'inbound');
    
    const lastOutbound = outboundMessages[0];
    const lastInbound = inboundMessages[0];
    
    // Análise de padrões
    const analysis = {
      totalOutbound: outboundMessages.length,
      totalInbound: inboundMessages.length,
      lastOutboundAt: lastOutbound?.created_at,
      lastInboundAt: lastInbound?.created_at,
      responseRate: outboundMessages.length > 0 ? inboundMessages.length / outboundMessages.length : 0,
      avgResponseTime: null,
      deliveryIndicators: [],
      statusBreakdown: {
        pending: recentMessages.filter(m => m.direction === 'outbound' && m.status === 'pending').length,
        sent: recentMessages.filter(m => m.direction === 'outbound' && m.status === 'sent').length,
        delivered: recentMessages.filter(m => m.direction === 'outbound' && m.status === 'delivered').length,
        read: recentMessages.filter(m => m.direction === 'outbound' && m.status === 'read').length,
        failed: recentMessages.filter(m => m.direction === 'outbound' && m.status === 'failed').length
      }
    };

    // Indicadores de entrega baseados em padrões e status
    if (inboundMessages.length > 0) {
      analysis.deliveryIndicators.push('✅ Cliente respondeu recentemente - mensagens chegando');
    }
    
    if (analysis.statusBreakdown.failed > 0) {
      analysis.deliveryIndicators.push(`❌ ${analysis.statusBreakdown.failed} mensagens falharam - verificar API`);
    }
    
    if (analysis.statusBreakdown.pending > 3) {
      analysis.deliveryIndicators.push(`⏳ ${analysis.statusBreakdown.pending} mensagens pendentes - possível delay`);
    }
    
    if (analysis.statusBreakdown.delivered > 0 && inboundMessages.length === 0) {
      analysis.deliveryIndicators.push('📱 Mensagens entregues mas sem resposta - cliente pode estar ocupado');
    }
    
    if (outboundMessages.length > 5 && inboundMessages.length === 0 && analysis.statusBreakdown.sent === 0) {
      analysis.deliveryIndicators.push('🚨 Muitas mensagens sem confirmação de envio - problema de API');
    }
    
    if (analysis.responseRate > 0.5) {
      analysis.deliveryIndicators.push('📈 Alta taxa de resposta - boa entrega');
    } else if (analysis.responseRate < 0.1 && outboundMessages.length > 3) {
      analysis.deliveryIndicators.push('📉 Baixa taxa de resposta - verificar entrega ou engajamento');
    }

    const result = {
      messageId,
      conversationId,
      deliveryStatus,
      apiError,
      analysis,
      recentMessages: recentMessages.slice(0, 5), // Apenas as 5 mais recentes
      timestamp: new Date().toISOString(),
      hasValidConfig: !!(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID)
    };

    console.log('Resultado da verificação:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na verificação de entrega:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});