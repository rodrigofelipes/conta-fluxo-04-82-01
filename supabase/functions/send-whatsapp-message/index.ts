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
  Deno.env.get('WHATSAPP_DISPLAY_PHONE_NUMBER') || '+553198813479';

// Cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para normalizar número de telefone
function normalizePhoneNumber(phone: string): string {
  // Remove tudo exceto números
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Se tem menos de 10 dígitos, inválido
  if (cleaned.length < 10) {
    throw new Error(`Número muito curto: ${phone} -> ${cleaned}`);
  }
  
  // Se tem 11 dígitos e não começa com 55, adicionar 55
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    return '55' + cleaned;
  }
  
  // Se tem 10 dígitos, adicionar 55
  if (cleaned.length === 10) {
    return '55' + cleaned;
  }
  
  // Se já tem 13 dígitos e começa com 55, usar assim mesmo
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Para outros casos, retornar como está
  return cleaned;
}

// Função para validar token do WhatsApp
async function validateWhatsAppToken(): Promise<{ valid: boolean, error?: string, account?: any }> {
  try {
    if (!WHATSAPP_ACCESS_TOKEN) {
      return { valid: false, error: 'Token não configurado' };
    }

    // Testar token obtendo informações da conta
    const response = await fetch('https://graph.facebook.com/v17.0/me', {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        valid: false, 
        error: `Token inválido: ${data.error?.message || 'Erro desconhecido'}`,
        account: data
      };
    }

    return { valid: true, account: data };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Função para validar configuração do número
async function validatePhoneNumberConfig(): Promise<{ valid: boolean, error?: string, config?: any }> {
  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      return { valid: false, error: 'Configurações não encontradas' };
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        valid: false, 
        error: `Configuração inválida: ${data.error?.message || 'Erro desconhecido'}`,
        config: data
      };
    }

    return { valid: true, config: data };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Função para enviar mensagem WhatsApp com validação completa
async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean, response?: any, error?: string, debug?: any }> {
  const debugInfo: any = {
    originalNumber: to,
    timestamp: new Date().toISOString(),
    tokenValidation: null,
    phoneConfigValidation: null,
    normalizedNumber: null,
    apiRequest: null,
    apiResponse: null
  };

  try {
    console.log('=== INÍCIO PROCESSO ENVIO WHATSAPP ===');
    console.log('Número original:', to);
    console.log('Mensagem:', message);

    // 1. Validar token
    console.log('=== VALIDANDO TOKEN ===');
    const tokenValidation = await validateWhatsAppToken();
    debugInfo.tokenValidation = tokenValidation;
    
    if (!tokenValidation.valid) {
      console.error('❌ Token inválido:', tokenValidation.error);
      return { 
        success: false, 
        error: `Token inválido: ${tokenValidation.error}`,
        debug: debugInfo
      };
    }
    console.log('✅ Token válido:', tokenValidation.account?.name);

    // 2. Validar configuração do número
    console.log('=== VALIDANDO CONFIGURAÇÃO DO NÚMERO ===');
    const phoneConfigValidation = await validatePhoneNumberConfig();
    debugInfo.phoneConfigValidation = phoneConfigValidation;
    
    if (!phoneConfigValidation.valid) {
      console.error('❌ Configuração do número inválida:', phoneConfigValidation.error);
      return { 
        success: false, 
        error: `Configuração inválida: ${phoneConfigValidation.error}`,
        debug: debugInfo
      };
    }
    console.log('✅ Número configurado:', phoneConfigValidation.config?.display_phone_number);
    console.log('✅ Status do número:', phoneConfigValidation.config?.code_verification_status);
    console.log('✅ Qualidade:', phoneConfigValidation.config?.quality_rating);

    // 3. Normalizar número
    console.log('=== NORMALIZANDO NÚMERO ===');
    let normalizedNumber: string;
    try {
      normalizedNumber = normalizePhoneNumber(to);
      debugInfo.normalizedNumber = normalizedNumber;
      console.log('✅ Número normalizado:', normalizedNumber);
    } catch (error) {
      console.error('❌ Erro ao normalizar número:', error.message);
      return { 
        success: false, 
        error: `Número inválido: ${error.message}`,
        debug: debugInfo
      };
    }

    // 4. Preparar requisição
    const requestBody = {
      messaging_product: 'whatsapp',
      to: normalizedNumber,
      type: 'text',
      text: { body: message }
    };
    
    const apiUrl = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    debugInfo.apiRequest = {
      url: apiUrl,
      method: 'POST',
      body: requestBody,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      tokenPrefix: WHATSAPP_ACCESS_TOKEN.substring(0, 20) + '...'
    };

    console.log('=== ENVIANDO REQUISIÇÃO ===');
    console.log('URL:', apiUrl);
    console.log('Phone Number ID:', WHATSAPP_PHONE_NUMBER_ID);
    console.log('Access Token (20 primeiros chars):', WHATSAPP_ACCESS_TOKEN.substring(0, 20) + '...');
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    // 5. Fazer requisição
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    
    debugInfo.apiResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    };
    
    console.log('=== RESPOSTA DA API ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      console.error('❌ ERRO NA API');
      
      // Análise detalhada do erro
      if (responseData.error) {
        const error = responseData.error;
        console.error('Código:', error.code);
        console.error('Tipo:', error.type);
        console.error('Mensagem:', error.message);
        console.error('Sub-código:', error.error_subcode);
        console.error('Título:', error.error_user_title);
        console.error('Detalhes:', error.error_user_msg);
        
        // Interpretação comum de erros
        let errorInterpretation = '';
        switch (error.code) {
          case 100:
            errorInterpretation = 'Parâmetro inválido ou faltando';
            break;
          case 190:
            errorInterpretation = 'Token de acesso inválido ou expirado';
            break;
          case 368:
            errorInterpretation = 'Número de telefone não tem WhatsApp ou não pode receber mensagens';
            break;
          case 131000:
            errorInterpretation = 'Conta WhatsApp Business suspensa ou restrita';
            break;
          default:
            errorInterpretation = 'Erro desconhecido da API';
        }
        console.error('Interpretação:', errorInterpretation);
      }
      
      return { 
        success: false, 
        error: `API Error ${response.status}: ${responseData.error?.message || 'Erro desconhecido'}`,
        response: responseData,
        debug: debugInfo
      };
    }

    // 6. Verificar resposta de sucesso
    if (!responseData.messages || !responseData.messages[0]) {
      console.error('❌ RESPOSTA INESPERADA');
      console.error('Resposta não contém mensagens esperadas');
      return { 
        success: false, 
        error: 'Resposta da API não contém mensagens',
        response: responseData,
        debug: debugInfo
      };
    }

    const messageInfo = responseData.messages[0];
    const contactInfo = responseData.contacts?.[0];
    
    console.log('=== ✅ SUCESSO ===');
    console.log('Message ID:', messageInfo.id);
    console.log('WhatsApp ID do destinatário:', contactInfo?.wa_id);
    console.log('Input original processado:', contactInfo?.input);
    
    // Log final de sucesso
    console.log('=== RESUMO FINAL ===');
    console.log('✅ Token válido');
    console.log('✅ Número configurado corretamente');
    console.log('✅ Número normalizado:', normalizedNumber);
    console.log('✅ API retornou sucesso');
    console.log('✅ Message ID:', messageInfo.id);
    console.log('✅ Entregue para WhatsApp ID:', contactInfo?.wa_id);
    
    return { 
      success: true, 
      response: responseData,
      debug: debugInfo
    };
    
  } catch (error) {
    console.error('=== ❌ ERRO CRÍTICO ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    debugInfo.criticalError = {
      message: error.message,
      stack: error.stack
    };
    
    return { 
      success: false, 
      error: `Erro crítico: ${error.message}`,
      debug: debugInfo
    };
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

    const { to, message, conversationId, adminId } = await req.json();

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'Parâmetros "to" e "message" são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Enviando mensagem WhatsApp:', { to, message });

    // Enviar mensagem
    const result = await sendWhatsAppMessage(to, message);

    if (!result.success) {
      console.error('=== FALHA NO ENVIO ===');
      console.error('Erro:', result.error);
      console.error('Debug Info:', JSON.stringify(result.debug, null, 2));
      
      return new Response(JSON.stringify({ 
        error: 'Falha ao enviar mensagem', 
        details: result.error,
        response: result.response,
        debug: result.debug
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== SUCESSO COMPLETO ===');
    console.log('WhatsApp Response:', result.response);
    console.log('Debug Info:', JSON.stringify(result.debug, null, 2));

    // Se fornecido, registrar mensagem no histórico com wamid e status
    if (conversationId && adminId && result.response?.messages?.[0]?.id) {
      const { error: dbError } = await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        admin_id: adminId,
        from_phone: WHATSAPP_DISPLAY_PHONE_NUMBER, // Número de exibição do WhatsApp Business
        to_phone: to,
        content: message,
        direction: 'outbound',
        message_type: 'text',
        wamid: result.response.messages[0].id,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      
      if (dbError) {
        console.error('Erro ao salvar mensagem no banco:', dbError);
      } else {
        console.log('Mensagem salva no banco com wamid:', result.response.messages[0].id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      whatsapp_response: result.response,
      debug: result.debug,
      message_id: result.response?.messages?.[0]?.id,
      whatsapp_id: result.response?.contacts?.[0]?.wa_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});