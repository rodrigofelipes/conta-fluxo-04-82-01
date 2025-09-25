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
    console.log('=== WHATSAPP DELIVERY MONITOR ===');
    
    // Buscar mensagens outbound das últimas 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentOutbound, error: outboundError } = await supabase
      .from('whatsapp_messages')
      .select(`
        id,
        conversation_id,
        to_phone,
        content,
        created_at,
        whatsapp_conversations!inner(phone_number, client_id, admin_id)
      `)
      .eq('direction', 'outbound')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (outboundError) {
      throw outboundError;
    }

    // Analisar padrões de entrega por conversa
    const conversationStats = new Map();
    
    for (const message of recentOutbound || []) {
      const conversationId = message.conversation_id;
      
      if (!conversationStats.has(conversationId)) {
        // Buscar mensagens inbound da mesma conversa
        const { data: inboundMessages } = await supabase
          .from('whatsapp_messages')
          .select('id, created_at')
          .eq('conversation_id', conversationId)
          .eq('direction', 'inbound')
          .gte('created_at', twentyFourHoursAgo);

        conversationStats.set(conversationId, {
          conversation: message.whatsapp_conversations,
          outboundCount: 0,
          inboundCount: inboundMessages?.length || 0,
          lastOutbound: null,
          lastInbound: inboundMessages?.[0]?.created_at || null,
          messages: []
        });
      }

      const stats = conversationStats.get(conversationId);
      stats.outboundCount++;
      stats.messages.push(message);
      
      if (!stats.lastOutbound || new Date(message.created_at) > new Date(stats.lastOutbound)) {
        stats.lastOutbound = message.created_at;
      }
    }

    // Identificar possíveis problemas
    const alerts = [];
    const healthyConversations = [];
    const problematicConversations = [];

    for (const [conversationId, stats] of conversationStats) {
      const responseRate = stats.outboundCount > 0 ? stats.inboundCount / stats.outboundCount : 0;
      
      // Critérios para problema de entrega
      const manyMessagesNoResponse = stats.outboundCount >= 5 && stats.inboundCount === 0;
      const lowResponseRate = stats.outboundCount >= 3 && responseRate < 0.1;
      const noRecentResponse = stats.lastOutbound && !stats.lastInbound;
      
      if (manyMessagesNoResponse || lowResponseRate || noRecentResponse) {
        problematicConversations.push({
          conversationId,
          phone: stats.conversation.phone_number,
          outboundCount: stats.outboundCount,
          inboundCount: stats.inboundCount,
          responseRate,
          issues: [
            ...(manyMessagesNoResponse ? ['Muitas mensagens sem resposta'] : []),
            ...(lowResponseRate ? ['Taxa de resposta baixa'] : []),
            ...(noRecentResponse ? ['Sem resposta recente'] : [])
          ],
          lastOutbound: stats.lastOutbound,
          lastInbound: stats.lastInbound
        });

        alerts.push({
          type: 'delivery_issue',
          conversationId,
          phone: stats.conversation.phone_number,
          message: `Possível problema de entrega - ${stats.outboundCount} mensagens enviadas, ${stats.inboundCount} recebidas`,
          severity: manyMessagesNoResponse ? 'high' : 'medium'
        });
      } else {
        healthyConversations.push({
          conversationId,
          phone: stats.conversation.phone_number,
          responseRate
        });
      }
    }

    // Estatísticas gerais
    const overallStats = {
      totalConversations: conversationStats.size,
      totalOutbound: recentOutbound?.length || 0,
      totalInbound: Array.from(conversationStats.values()).reduce((sum, stats) => sum + stats.inboundCount, 0),
      problematicCount: problematicConversations.length,
      healthyCount: healthyConversations.length,
      averageResponseRate: conversationStats.size > 0 
        ? Array.from(conversationStats.values()).reduce((sum, stats) => {
            return sum + (stats.outboundCount > 0 ? stats.inboundCount / stats.outboundCount : 0);
          }, 0) / conversationStats.size
        : 0
    };

    const result = {
      timestamp: new Date().toISOString(),
      monitoringPeriod: '24 hours',
      overallStats,
      alerts,
      problematicConversations,
      healthyConversations: healthyConversations.slice(0, 10), // Limitar para não sobrecarregar
      recommendations: []
    };

    // Gerar recomendações
    if (overallStats.averageResponseRate < 0.2) {
      result.recommendations.push('Taxa de resposta geral baixa - verificar configuração do WhatsApp Business');
    }
    
    if (problematicConversations.length > healthyConversations.length) {
      result.recommendations.push('Muitas conversas com problemas - investigar status da conta WhatsApp Business');
    }
    
    if (overallStats.totalOutbound > 0 && overallStats.totalInbound === 0) {
      result.recommendations.push('CRÍTICO: Nenhuma mensagem recebida - possível problema grave de configuração');
    }

    console.log('Monitor result:', {
      totalConversations: result.overallStats.totalConversations,
      alertsCount: result.alerts.length,
      averageResponseRate: result.overallStats.averageResponseRate
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no monitoramento:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});