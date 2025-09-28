import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações do WhatsApp Business API
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_DISPLAY_PHONE_NUMBER =
  Deno.env.get('WHATSAPP_DISPLAY_PHONE_NUMBER') || '+553198813479';

// Cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WELCOME_MESSAGE = `Olá! Você está conectado ao nosso atendimento via WhatsApp. Um de nossos atendentes responderá em breve.`;

// Função para normalizar telefone
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(to: string, message: string, phoneNumberId?: string): Promise<boolean> {
  try {
    const effectivePhoneNumberId = phoneNumberId || WHATSAPP_PHONE_NUMBER_ID;
    const response = await fetch(`https://graph.facebook.com/v17.0/${effectivePhoneNumberId}/messages`, {
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
      console.error('Erro ao enviar mensagem WhatsApp:', await response.text());
      return false;
    }

    console.log('Mensagem WhatsApp enviada com sucesso para:', to, 'via phone_number_id:', effectivePhoneNumberId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

// Função para buscar cliente por telefone
async function findClientByPhone(phone: string) {
  const { data, error } = await supabase.rpc('find_client_by_phone', {
    phone_input: phone
  });

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  return data?.[0] || null;
}

// Função para buscar admin disponível
async function findAvailableAdmin(clientId: string, setor: string) {
  const { data, error } = await supabase.rpc('find_available_admin_with_setor', {
    client_id_param: clientId,
    setor_param: setor
  });

  if (error) {
    console.error('Erro ao buscar admin:', error);
    return null;
  }

  return data?.[0] || null;
}

// Função para gerenciar conversa
async function manageConversation(phoneNumber: string, message: string, webhookData: any) {
  const normalizedPhone = normalizePhone(phoneNumber);
  
  // Extrair o phone_number_id do webhook para responder pelo mesmo número
  const phoneNumberIdFromWebhook: string | undefined = webhookData?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  
  console.log('Gerenciando conversa para:', phoneNumber, 'Mensagem:', message, 'phone_number_id:', phoneNumberIdFromWebhook);

  // Buscar conversa existente
  const { data: existingConversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('normalized_phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Conversa existente:', existingConversation);

  // Se não há conversa ou a conversa foi encerrada, iniciar nova conversa
  if (!existingConversation || existingConversation.status === 'ENDED') {
    console.log('Iniciando nova conversa ou reativando conversa encerrada');
    
    // Buscar cliente pelo telefone
    const client = await findClientByPhone(phoneNumber);
    
    if (!client) {
      console.log('Cliente não encontrado, registrando contato desconhecido');
      
      // Registrar contato desconhecido
      await supabase.rpc('register_unknown_contact', {
        phone_input: phoneNumber,
        message_text: message
      });
      
      await sendWhatsAppMessage(phoneNumber, 'Desculpe, não encontramos seu cadastro em nosso sistema. Um de nossos atendentes entrará em contato em breve.', phoneNumberIdFromWebhook);
      
      // Criar conversa mas marcar como encerrada
      const conversationData = {
        phone_number: phoneNumber,
        normalized_phone: normalizedPhone,
        status: 'ENDED',
        updated_at: new Date().toISOString()
      };

      if (existingConversation) {
        await supabase
          .from('whatsapp_conversations')
          .update(conversationData)
          .eq('id', existingConversation.id);
      } else {
        await supabase
          .from('whatsapp_conversations')
          .insert(conversationData);
      }
      
      return;
    }

    console.log('Cliente encontrado:', client);

    // Buscar admin responsável pelo cliente ou qualquer admin disponível
    let admin = null;
    
    // Primeiro tentar buscar admin responsável pelo cliente
    if (client.admin_responsavel) {
      const { data: responsibleAdmin } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', client.admin_responsavel)
        .single();
      
      if (responsibleAdmin) {
        admin = {
          admin_id: client.admin_responsavel,
          admin_username: responsibleAdmin.username
        };
      }
    }
    
    // Se não encontrou admin responsável, buscar qualquer admin do setor do cliente
    if (!admin) {
      admin = await findAvailableAdmin(client.id, client.setor);
    }
    
    // Se não encontrou admin, usar o primeiro admin disponível ou criar uma conversa sem admin
    if (!admin) {
      console.log('Nenhum admin específico encontrado, mas permitindo conversa');
      // Buscar qualquer admin disponível
      const { data: anyAdmin } = await supabase
        .from('user_roles')
        .select('user_id, username')
        .eq('role', 'admin')
        .limit(1)
        .single();
        
      if (anyAdmin) {
        admin = {
          admin_id: anyAdmin.user_id,
          admin_username: anyAdmin.username
        };
      }
    }

    console.log('Admin encontrado:', admin);

    // Enviar mensagem de boas-vindas
    const welcomeSent = await sendWhatsAppMessage(phoneNumber, WELCOME_MESSAGE, phoneNumberIdFromWebhook);
    
    // Criar ou atualizar conversa
    const conversationData = {
      phone_number: phoneNumber,
      normalized_phone: normalizedPhone,
      client_id: client.id,
      admin_id: admin.admin_id,
      status: 'CONVERSING',
      updated_at: new Date().toISOString()
    };

    let conversationId: string;
    
    if (existingConversation) {
      conversationId = existingConversation.id;
      await supabase
        .from('whatsapp_conversations')
        .update(conversationData)
        .eq('id', existingConversation.id);
    } else {
      const { data: newConversation } = await supabase
        .from('whatsapp_conversations')
        .insert(conversationData)
        .select('id')
        .single();
      conversationId = newConversation?.id;
    }

    // Registrar mensagem de boas-vindas na tabela whatsapp_messages
    if (welcomeSent && conversationId) {
      await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          admin_id: admin.admin_id,
          from_phone: WHATSAPP_DISPLAY_PHONE_NUMBER,
          to_phone: phoneNumber,
          content: WELCOME_MESSAGE,
          direction: 'outbound',
          message_type: 'text'
        });
    }

    // Criar mensagem no sistema interno notificando o admin
    const messageData = {
      from_user_id: client.id,
      to_user_id: admin.admin_id,
      message: `[WhatsApp] Cliente iniciou conversa: ${message}`,
      from_user_name: client.nome,
      to_user_name: admin.admin_username,
      message_type: 'whatsapp'
    };

    await supabase.from('messages').insert(messageData);

    // Registrar primeira mensagem do cliente
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      admin_id: admin.admin_id,
      from_phone: phoneNumber,
      to_phone: phoneNumber,
      content: message,
      direction: 'inbound',
      message_type: 'text'
    });
    
    return;
  }

  // Se a conversa já está ativa, processar mensagem normalmente
  if (existingConversation.status === 'CONVERSING') {
    console.log('Encaminhando mensagem para admin');
    
    if (!existingConversation.client_id || !existingConversation.admin_id) {
      console.error('Conversa sem cliente ou admin atribuído');
      return;
    }

    // Buscar dados do cliente e admin
    const { data: client } = await supabase
      .from('clientes')
      .select('nome')
      .eq('id', existingConversation.client_id)
      .single();

    const { data: admin } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', existingConversation.admin_id)
      .single();

    // Criar mensagem no sistema interno
    const messageData = {
      from_user_id: existingConversation.client_id,
      to_user_id: existingConversation.admin_id,
      message: `[WhatsApp] ${message}`,
      from_user_name: client?.nome || 'Cliente WhatsApp',
      to_user_name: admin?.username || 'Admin',
      message_type: 'whatsapp'
    };

    await supabase.from('messages').insert(messageData);

    // Registrar mensagem WhatsApp
    await supabase.from('whatsapp_messages').insert({
      conversation_id: existingConversation.id,
      admin_id: existingConversation.admin_id,
      from_phone: phoneNumber,
      to_phone: phoneNumber, // Cliente para cliente (inbound)
      content: message,
      direction: 'inbound',
      message_type: 'text'
    });

    console.log('Mensagem encaminhada para o admin via sistema interno');
  }
}

// Processar atualizações de status de mensagens
async function processMessageStatuses(statuses: any[]) {
  console.log('=== PROCESSANDO STATUS DE MENSAGENS ===');
  console.log('Status recebidos:', JSON.stringify(statuses, null, 2));
  
  for (const status of statuses) {
    try {
      const { id: wamid, status: messageStatus, timestamp, recipient_id } = status;
      
      console.log(`Atualizando status da mensagem ${wamid} para ${messageStatus}`);
      
      // Atualizar status da mensagem no banco
      const updateData: any = { status: messageStatus };
      
      // Adicionar timestamp específico baseado do status
      const statusTime = new Date(parseInt(timestamp) * 1000).toISOString();
      
      switch (messageStatus) {
        case 'sent':
          updateData.sent_at = statusTime;
          break;
        case 'delivered':
          updateData.delivered_at = statusTime;
          break;
        case 'read':
          updateData.read_at = statusTime;
          break;
        case 'failed':
          updateData.error_code = status.errors?.[0]?.code;
          updateData.error_details = JSON.stringify(status.errors);
          break;
      }
      
      const { error } = await supabase
        .from('whatsapp_messages')
        .update(updateData)
        .eq('wamid', wamid);
      
      if (error) {
        console.error(`Erro ao atualizar status da mensagem ${wamid}:`, error);
      } else {
        console.log(`Status da mensagem ${wamid} atualizado para ${messageStatus}`);
      }
      
    } catch (error) {
      console.error('Erro ao processar status de mensagem:', error);
    }
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificação do webhook (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Verificação do webhook:', { mode, token, challenge });

      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        console.log('Webhook verificado com sucesso');
        return new Response(challenge, { 
          headers: { 'Content-Type': 'text/plain' } 
        });
      } else {
        console.log('Falha na verificação do webhook');
        return new Response('Verification failed', { status: 403 });
      }
    }

    // Processamento de mensagens (POST request)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Webhook recebido:', JSON.stringify(body, null, 2));

      // Processar diferentes tipos de entrada
      if (body.entry) {
        for (const entry of body.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.value?.messages) {
                const message = change.value.messages[0];
                const phoneNumber = message.from;
                const messageText = message.text?.body || '';
                
                console.log('Nova mensagem:', { phoneNumber, messageText });
                
                // Processar mensagem
                await manageConversation(phoneNumber, messageText, body);
              }
              
              if (change.value?.statuses) {
                await processMessageStatuses(change.value.statuses);
              }
            }
          }
        }
      }

      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});