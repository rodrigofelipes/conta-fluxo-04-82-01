import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/state/auth';

export interface SupportClient {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  setor: string;
  admin_responsavel?: string;
  created_at: string;
  unread_count?: number;
  last_message_at?: string;
  last_message?: string;
}

export interface SupportMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  created_at: string;
  viewed_at?: string;
  from_user_name?: string;
  to_user_name?: string;
  message_type: 'internal';
}

export function useSupportChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<SupportClient[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Buscar clientes do admin
  const fetchClients = async () => {
    if (!user?.id || user.role !== 'admin') return;

    try {
      setLoading(true);
      
      // Buscar clientes onde o admin é responsável
      const { data: clientsData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('admin_responsavel', user.id)
        .order('nome');

      if (error) throw error;

      // Para cada cliente, buscar a última mensagem e contar não lidas
      const clientsWithMessages = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Buscar última mensagem
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('message, created_at')
            .or(`and(from_user_id.eq.${client.id},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${client.id})`)
            .eq('message_type', 'internal')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Contar mensagens não lidas do cliente
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_id', client.id)
            .eq('to_user_id', user.id)
            .eq('message_type', 'internal')
            .is('viewed_at', null);

          return {
            ...client,
            last_message: lastMessage?.message,
            last_message_at: lastMessage?.created_at,
            unread_count: unreadCount || 0
          };
        })
      );

      setClients(clientsWithMessages);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar mensagens entre admin e cliente
  const fetchMessages = async (clientId: string) => {
    if (!user?.id) return;

    try {
      setMessagesLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_user_id.eq.${clientId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${clientId})`)
        .eq('message_type', 'internal')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar nomes dos usuários separadamente
      const messagesWithNames = await Promise.all(
        (data || []).map(async (msg) => {
          const [fromUser, toUser] = await Promise.all([
            supabase.from('profiles').select('username, full_name').eq('user_id', msg.from_user_id).single(),
            supabase.from('profiles').select('username, full_name').eq('user_id', msg.to_user_id).single()
          ]);

          return {
            ...msg,
            message_type: 'internal' as const,
            from_user_name: fromUser.data?.full_name || fromUser.data?.username,
            to_user_name: toUser.data?.full_name || toUser.data?.username,
          };
        })
      );

      setMessages(messagesWithNames);

      // Marcar mensagens como lidas
      await supabase
        .from('messages')
        .update({ viewed_at: new Date().toISOString() })
        .eq('from_user_id', clientId)
        .eq('to_user_id', user.id)
        .eq('message_type', 'internal')
        .is('viewed_at', null);

      // Atualizar contagem não vista na lista de clientes
      setClients(prev => 
        prev.map(client => 
          client.id === clientId 
            ? { ...client, unread_count: 0 }
            : client
        )
      );

    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast({
        title: "Erro", 
        description: "Erro ao carregar mensagens",
        variant: "destructive"
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  // Enviar mensagem
  const sendMessage = async (fromUserId: string, toUserId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          message: content,
          message_type: 'internal'
        })
        .select('*')
        .single();

      if (error) throw error;

      // Buscar nomes dos usuários
      const [fromUser, toUser] = await Promise.all([
        supabase.from('profiles').select('username, full_name').eq('user_id', fromUserId).single(),
        supabase.from('profiles').select('username, full_name').eq('user_id', toUserId).single()
      ]);

      const newMessage = {
        ...data,
        message_type: 'internal' as const,
        from_user_name: fromUser.data?.full_name || fromUser.data?.username,
        to_user_name: toUser.data?.full_name || toUser.data?.username,
      };

      setMessages(prev => [...prev, newMessage]);

      // Atualizar última mensagem na lista de clientes
      setClients(prev => 
        prev.map(client => 
          client.id === toUserId 
            ? { 
                ...client, 
                last_message: content,
                last_message_at: new Date().toISOString()
              }
            : client
        )
      );

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.id]);

  // Configurar realtime para novas mensagens
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `message_type=eq.internal`
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage;
          
          // Se a mensagem é para este admin, adicionar à lista
          if (newMessage.to_user_id === user.id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Atualizar contagem não lida do cliente
            setClients(prev => 
              prev.map(client => 
                client.id === newMessage.from_user_id 
                  ? { 
                      ...client, 
                      unread_count: (client.unread_count || 0) + 1,
                      last_message: newMessage.message,
                      last_message_at: newMessage.created_at
                    }
                  : client
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    clients,
    messages,
    loading,
    messagesLoading,
    fetchClients,
    fetchMessages,
    sendMessage
  };
}