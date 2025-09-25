import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações do WhatsApp Business API
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== DEBUG WHATSAPP CONFIGURATION ===');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      hasAccessToken: !!WHATSAPP_ACCESS_TOKEN,
      accessTokenLength: WHATSAPP_ACCESS_TOKEN?.length || 0,
      accessTokenPrefix: WHATSAPP_ACCESS_TOKEN?.substring(0, 20) || 'NOT_SET',
      hasPhoneNumberId: !!WHATSAPP_PHONE_NUMBER_ID,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
      environmentVariables: {
        WHATSAPP_ACCESS_TOKEN: WHATSAPP_ACCESS_TOKEN ? 'SET' : 'NOT_SET',
        WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID ? 'SET' : 'NOT_SET'
      }
    };

    console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));

    // Testar conectividade com a API do WhatsApp
    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      console.log('=== TESTANDO CONECTIVIDADE COM API WHATSAPP ===');
      
      try {
        // Verificar o status do número de telefone
        const phoneResponse = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        });

        const phoneData = await phoneResponse.json();
        
        console.log('Phone Number Status Response:', {
          status: phoneResponse.status,
          data: phoneData
        });

        debugInfo.phoneNumberStatus = {
          status: phoneResponse.status,
          statusText: phoneResponse.statusText,
          data: phoneData,
          isValid: phoneResponse.ok
        };

        // Testar permissões do token
        const meResponse = await fetch('https://graph.facebook.com/v17.0/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        });

        const meData = await meResponse.json();
        
        console.log('Token Info Response:', {
          status: meResponse.status,
          data: meData
        });

        debugInfo.tokenInfo = {
          status: meResponse.status,
          statusText: meResponse.statusText,
          data: meData,
          isValid: meResponse.ok
        };

      } catch (apiError) {
        console.error('Erro ao testar API:', apiError);
        debugInfo.apiTestError = apiError.message;
      }
    }

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no debug:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});