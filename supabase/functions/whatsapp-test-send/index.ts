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
    const { to, message } = await req.json();
    
    console.log('=== TESTE DE ENVIO WHATSAPP ===');
    console.log('Número destino:', to);
    console.log('Mensagem:', message);
    
    // Normalizar número de telefone
    let normalizedNumber = to.replace(/[^\d]/g, '');
    
    // Adicionar código do país se necessário
    if (!normalizedNumber.startsWith('55') && normalizedNumber.length === 11) {
      normalizedNumber = '55' + normalizedNumber;
    }
    
    console.log('Número normalizado:', normalizedNumber);
    
    // Testar diferentes formatos de número
    const testNumbers = [
      normalizedNumber,
      to,
      normalizedNumber.startsWith('55') ? normalizedNumber.substring(2) : normalizedNumber
    ];
    
    const results = [];
    
    for (const testNumber of testNumbers) {
      console.log(`\n=== TESTANDO NÚMERO: ${testNumber} ===`);
      
      const requestBody = {
        messaging_product: 'whatsapp',
        to: testNumber,
        type: 'text',
        text: { body: `TESTE: ${message}` }
      };
      
      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();
        
        console.log(`Resposta para ${testNumber}:`, {
          status: response.status,
          data: responseData
        });
        
        const result = {
          number: testNumber,
          status: response.status,
          success: response.ok,
          response: responseData
        };
        
        if (response.ok) {
          console.log(`✅ SUCESSO para ${testNumber}:`, responseData);
        } else {
          console.log(`❌ ERRO para ${testNumber}:`, responseData);
          
          // Analisar erro específico
          if (responseData.error) {
            const error = responseData.error;
            console.log('Detalhes do erro:', {
              code: error.code,
              type: error.type,
              message: error.message,
              subcode: error.error_subcode,
              details: error.error_user_msg
            });
            
            result.errorDetails = {
              code: error.code,
              type: error.type,
              message: error.message,
              subcode: error.error_subcode,
              userMessage: error.error_user_msg
            };
          }
        }
        
        results.push(result);
        
        // Se conseguiu enviar, parar os testes
        if (response.ok) {
          break;
        }
        
      } catch (error) {
        console.error(`Erro de rede para ${testNumber}:`, error);
        results.push({
          number: testNumber,
          status: 0,
          success: false,
          error: error.message
        });
      }
      
      // Aguardar um pouco entre os testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== RESULTADO FINAL ===');
    console.log('Resultados:', results);
    
    return new Response(JSON.stringify({
      originalNumber: to,
      normalizedNumber,
      results,
      summary: {
        totalTests: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no teste de envio:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});