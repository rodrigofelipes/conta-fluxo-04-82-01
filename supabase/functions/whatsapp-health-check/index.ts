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
    console.log('=== WHATSAPP HEALTH CHECK ===');
    
    const healthReport: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasAccessToken: !!WHATSAPP_ACCESS_TOKEN,
        hasPhoneNumberId: !!WHATSAPP_PHONE_NUMBER_ID,
        tokenLength: WHATSAPP_ACCESS_TOKEN?.length || 0,
        phoneNumberId: WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET'
      },
      tokenValidation: null,
      phoneNumberConfig: null,
      accountStatus: null,
      webhookStatus: null,
      databaseConnectivity: null,
      recentActivity: null,
      recommendations: []
    };

    // 1. Testar conectividade do banco
    try {
      const { data, error, count } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      healthReport.databaseConnectivity = {
        success: !error,
        error: error?.message,
        conversationCount: count
      };
    } catch (error) {
      healthReport.databaseConnectivity = {
        success: false,
        error: error.message
      };
    }

    // 2. Validar token se configurado
    if (WHATSAPP_ACCESS_TOKEN) {
      try {
        const tokenResponse = await fetch('https://graph.facebook.com/v17.0/me', {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        });

        const tokenData = await tokenResponse.json();
        
        healthReport.tokenValidation = {
          valid: tokenResponse.ok,
          account: tokenData,
          error: !tokenResponse.ok ? tokenData.error?.message : null
        };
      } catch (error) {
        healthReport.tokenValidation = {
          valid: false,
          error: error.message
        };
      }
    } else {
      healthReport.recommendations.push('❌ WHATSAPP_ACCESS_TOKEN não configurado');
    }

    // 3. Validar configuração do número se configurado
    if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
      try {
        const phoneResponse = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}`, {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        });

        const phoneData = await phoneResponse.json();
        
        healthReport.phoneNumberConfig = {
          valid: phoneResponse.ok,
          config: phoneData,
          error: !phoneResponse.ok ? phoneData.error?.message : null
        };

        // Verificar status específicos
        if (phoneResponse.ok) {
          const config = phoneData;
          
          if (config.code_verification_status !== 'VERIFIED') {
            healthReport.recommendations.push(`⚠️ Número não verificado: ${config.code_verification_status}`);
          }
          
          if (config.quality_rating === 'RED') {
            healthReport.recommendations.push('🔴 Qualidade do número está VERMELHA - restrita para envios');
          } else if (config.quality_rating === 'YELLOW') {
            healthReport.recommendations.push('🟡 Qualidade do número está AMARELA - limite reduzido');
          }
          
          if (config.throughput?.level !== 'STANDARD') {
            healthReport.recommendations.push(`📊 Throughput não é STANDARD: ${config.throughput?.level}`);
          }
        }
      } catch (error) {
        healthReport.phoneNumberConfig = {
          valid: false,
          error: error.message
        };
      }
    } else {
      if (!WHATSAPP_PHONE_NUMBER_ID) {
        healthReport.recommendations.push('❌ WHATSAPP_PHONE_NUMBER_ID não configurado');
      }
    }

    // 4. Verificar atividade recente
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: outboundMessages, error: outboundError } = await supabase
        .from('whatsapp_messages')
        .select('id, created_at, direction')
        .eq('direction', 'outbound')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      const { data: inboundMessages, error: inboundError } = await supabase
        .from('whatsapp_messages')
        .select('id, created_at, direction')  
        .eq('direction', 'inbound')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (!outboundError && !inboundError) {
        const outboundCount = outboundMessages?.length || 0;
        const inboundCount = inboundMessages?.length || 0;
        
        healthReport.recentActivity = {
          last24Hours: {
            outbound: outboundCount,
            inbound: inboundCount,
            responseRate: outboundCount > 0 ? (inboundCount / outboundCount) : 0,
            lastOutbound: outboundMessages?.[0]?.created_at,
            lastInbound: inboundMessages?.[0]?.created_at
          }
        };

        // Análise da atividade
        if (outboundCount > 0 && inboundCount === 0) {
          healthReport.recommendations.push('⚠️ Mensagens enviadas mas nenhuma recebida nas últimas 24h - possível problema de entrega');
        }
        
        if (outboundCount > 5 && (inboundCount / outboundCount) < 0.1) {
          healthReport.recommendations.push('📉 Taxa de resposta muito baixa - verificar qualidade das mensagens');
        }
        
        if (outboundCount === 0 && inboundCount === 0) {
          healthReport.recommendations.push('💤 Nenhuma atividade WhatsApp nas últimas 24h');
        }
      }
    } catch (error) {
      healthReport.recentActivity = {
        error: error.message
      };
    }

    // 5. Gerar recomendações gerais
    if (healthReport.tokenValidation?.valid === false) {
      healthReport.recommendations.push('🔑 Token de acesso inválido ou expirado - verificar WHATSAPP_ACCESS_TOKEN');
    }
    
    if (healthReport.phoneNumberConfig?.valid === false) {
      healthReport.recommendations.push('📱 Configuração do número inválida - verificar WHATSAPP_PHONE_NUMBER_ID');
    }
    
    if (healthReport.databaseConnectivity?.success === false) {
      healthReport.recommendations.push('🗄️ Problema de conectividade com banco de dados');
    }

    // Determinar status geral
    const hasErrors = 
      !healthReport.tokenValidation?.valid || 
      !healthReport.phoneNumberConfig?.valid || 
      !healthReport.databaseConnectivity?.success;
      
    const overallStatus = hasErrors ? 'UNHEALTHY' : 'HEALTHY';
    
    console.log('Health Check Status:', overallStatus);
    console.log('Recommendations:', healthReport.recommendations);

    return new Response(JSON.stringify({
      status: overallStatus,
      ...healthReport
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no health check:', error);
    return new Response(JSON.stringify({ 
      status: 'ERROR',
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});