import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/state/auth';

export interface WhatsAppConversation {
  id: string;
  client_id: string | null;
  admin_id: string | null;
  phone_number: string;
  normalized_phone: string;
  status: 'INITIAL' | 'WAITING_DEPARTMENT' | 'CONVERSING' | 'ENDED';
  selected_department: string | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  admin_username?: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  admin_id: string | null;
  from_phone: string;
  to_phone: string;
  content: string;
  direction: 'inbound' | 'outbound' | 'system';
  message_type: string;
  created_at: string;
}

export function useWhatsAppMessages() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar conversas ativas
  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .in('status', ['WAITING_DEPARTMENT', 'CONVERSING'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsData = data || [];

      // Buscar nomes relacionados sem depender de FKs no schema
      const clientIds = Array.from(new Set(conversationsData.map((c: any) => c.client_id).filter(Boolean)));
      const adminIds = Array.from(new Set(conversationsData.map((c: any) => c.admin_id).filter(Boolean)));

      let clientsById = new Map<string, string>();
      let adminsById = new Map<string, string>();

      try {
        const [clientsRes, adminsRes] = await Promise.all([
          clientIds.length
            ? supabase.from('clientes').select('id,nome').in('id', clientIds)
            : Promise.resolve({ data: [] as any[] }),
          adminIds.length
            ? supabase.from('profiles').select('user_id,username').in('user_id', adminIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const clients = (clientsRes as any).data || [];
        const admins = (adminsRes as any).data || [];

        clientsById = new Map(clients.map((c: any) => [c.id, c.nome]));
        adminsById = new Map(admins.map((a: any) => [a.user_id, a.username]));
      } catch (relError) {
        console.warn('Aviso: não foi possível carregar nomes relacionados', relError);
      }

      const formattedData = conversationsData.map((item: any) => ({
        ...item,
        status: item.status as 'INITIAL' | 'WAITING_DEPARTMENT' | 'CONVERSING' | 'ENDED',
        cliente_nome: item.client_id ? clientsById.get(item.client_id) : undefined,
        admin_username: item.admin_id ? adminsById.get(item.admin_id) : undefined,
      }));

      setConversations(formattedData);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas WhatsApp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa
  const fetchMessages = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data?.map(msg => ({
        ...msg,
        direction: msg.direction as 'inbound' | 'outbound' | 'system'
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens",
        variant: "destructive",
      });
    }
  };

  // Enviar mensagem WhatsApp
  const sendMessage = async (to: string, message: string, conversationId?: string, adminId?: string) => {
    try {
      console.log('=== ENVIANDO MENSAGEM WHATSAPP ===');
      console.log('Parâmetros:', { to, message, conversationId, adminId });
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to,
          message,
          conversationId,
          adminId
        }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro da edge function:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Edge function retornou erro:', data);
        throw new Error(data.error || 'Falha ao enviar mensagem');
      }

      console.log('Mensagem enviada com sucesso:', data);

      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso",
      });

      // Não precisa recarregar manual - o realtime vai cuidar disso

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar mensagem: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Encerrar conversa
  const endConversation = async (conversationId: string, adminId: string) => {
    try {
      const { error } = await supabase.functions.invoke('end-whatsapp-conversation', {
        body: {
          conversationId,
          adminId
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conversa encerrada com sucesso",
      });

      // Recarregar conversas
      await fetchConversations();
      
      return true;
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar conversa",
        variant: "destructive",
      });
      return false;
    }
  };

  // Atribuir admin a uma conversa
  const assignAdmin = async (conversationId: string, adminId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-assign-admin', {
        body: {
          conversationId,
          adminId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao atribuir admin');
      }

      toast({
        title: "Sucesso",
        description: "Admin atribuído com sucesso",
      });

      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Erro ao atribuir admin:', error);
      toast({
        title: "Erro", 
        description: "Erro ao atribuir admin",
        variant: "destructive",
      });
      return false;
    }
  };

  // Reenviar menu de departamentos
  const resendMenu = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-resend-menu', {
        body: {
          conversationId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao reenviar menu');
      }

      toast({
        title: "Sucesso",
        description: "Menu reenviado com sucesso",
      });

      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Erro ao reenviar menu:', error);
      toast({
        title: "Erro", 
        description: `Erro ao reenviar menu: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    // Only fetch conversations if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    
    fetchConversations();

    // Configurar realtime para conversas
    const conversationsChannel = supabase
      .channel('whatsapp_conversations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        (payload) => {
          console.log('Conversa atualizada:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    // Configurar realtime para mensagens
    const messagesChannel = supabase
      .channel('whatsapp_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('Nova mensagem recebida:', payload);
          const newMessage = payload.new as WhatsAppMessage;
          
          // Só adicionar se for da conversa atual e não existir ainda
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            
            // Só adicionar se for da conversa atualmente selecionada
            if (currentConversationId && newMessage.conversation_id === currentConversationId) {
              return [...prev, newMessage];
            }
            return prev;
          });
          
          // Atualizar a conversa também para refletir updated_at
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('Mensagem atualizada:', payload);
          const updatedMessage = payload.new as WhatsAppMessage;
          
          // Só atualizar se for da conversa atual
          if (currentConversationId && updatedMessage.conversation_id === currentConversationId) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, currentConversationId]);

  return {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    endConversation,
    assignAdmin,
    resendMenu,
    refetch: fetchConversations
  };
}