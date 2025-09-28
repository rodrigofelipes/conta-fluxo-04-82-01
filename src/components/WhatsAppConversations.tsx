import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Phone, User, Clock, Send, X, RefreshCw } from 'lucide-react';
import { useWhatsAppMessages, WhatsAppConversation } from '@/hooks/useWhatsAppMessages';
import { Textarea } from '@/components/ui/textarea';
import { SETORES_CLIENTE } from '@/types/setor';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONVERSING':
      return <Badge variant="default">Em Conversa</Badge>;
    case 'ENDED':
      return <Badge variant="outline">Encerrada</Badge>;
    default:
      return <Badge variant="secondary">Inicial</Badge>;
  }
};

const getDepartmentLabel = (setor: string) => {
  const department = SETORES_CLIENTE.find(s => s.value === setor);
  return department?.label || setor;
};

interface ConversationDetailProps {
  conversation: WhatsAppConversation;
  onSendMessage: (message: string) => Promise<boolean>;
  onEndConversation: () => Promise<boolean>;
  messages: any[];
  loading: boolean;
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
  onSendMessage,
  onEndConversation,
  messages,
  loading
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    const success = await onSendMessage(newMessage);
    if (success) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleEndConversation = async () => {
    setEnding(true);
    await onEndConversation();
    setEnding(false);
  };


  // Scroll automático para baixo quando mensagens mudam
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {conversation.cliente_nome ? (
            <>
              <span className="font-medium">{conversation.cliente_nome}</span>
              <span className="text-sm text-muted-foreground">({conversation.phone_number})</span>
            </>
          ) : (
            <span className="font-medium">{conversation.phone_number}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(conversation.status)}
          
          {conversation.status === 'CONVERSING' && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    const { data } = await supabase.functions.invoke('whatsapp-debug');
                    console.log('WhatsApp Debug Info:', data);
                    alert('Check console for debug info');
                  } catch (error) {
                    console.error('Debug error:', error);
                  }
                }}
              >
                Debug
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={async () => {
                  try {
                    const testMessage = 'Teste de envio ' + new Date().toLocaleTimeString();
                    console.log('Testando envio para:', conversation.phone_number);
                    
                    const { data } = await supabase.functions.invoke('whatsapp-test-send', {
                      body: {
                        to: conversation.phone_number,
                        message: testMessage
                      }
                    });
                    
                    console.log('Resultado do teste:', data);
                    
                    if (data.summary.successful > 0) {
                      alert(`✅ Teste bem-sucedido! Mensagem enviada com formato: ${data.results.find(r => r.success)?.number}`);
                    } else {
                      alert(`❌ Todos os testes falharam. Verifique o console para detalhes dos erros.`);
                    }
                  } catch (error) {
                    console.error('Erro no teste:', error);
                    alert('Erro no teste - verifique o console');
                  }
                }}
              >
                Teste Envio
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleEndConversation}
                disabled={ending}
              >
                <X className="h-4 w-4 mr-1" />
                {ending ? 'Encerrando...' : 'Encerrar'}
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Carregando mensagens...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">Nenhuma mensagem ainda</div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex animate-fade-in ${
                  message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg transition-all duration-200 ${
                    message.direction === 'outbound'
                      ? 'bg-primary text-primary-foreground'
                      : message.direction === 'system'
                      ? 'bg-muted text-muted-foreground text-sm'
                      : 'bg-muted'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {conversation.status === 'CONVERSING' && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[60px]"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const WhatsAppConversations: React.FC = () => {
  const {
    conversations,
    messages,
    loading,
    fetchMessages,
    sendMessage,
    endConversation
  } = useWhatsAppMessages();

  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const handleConversationClick = async (conversation: WhatsAppConversation) => {
    setMessagesLoading(true);
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
    setMessagesLoading(false);
  };

  // Atualizar conversa selecionada quando a lista de conversas muda
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updatedConversation = conversations.find(c => c.id === selectedConversation.id);
      if (updatedConversation) {
        setSelectedConversation(updatedConversation);
      }
    }
  }, [conversations, selectedConversation]);

  const handleSendMessage = async (message: string) => {
    if (!selectedConversation || !selectedConversation.admin_id) return false;
    
    return await sendMessage(
      selectedConversation.phone_number,
      message,
      selectedConversation.id,
      selectedConversation.admin_id
    );
  };

  const handleEndConversation = async () => {
    if (!selectedConversation || !selectedConversation.admin_id) return false;
    
    const success = await endConversation(selectedConversation.id, selectedConversation.admin_id);
    if (success) {
      setSelectedConversation(null);
    }
    return success;
  };


  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-1/3 border-r border-primary/20">
          <Card className="h-full border-0 rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversas WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">Carregando conversas...</div>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card className="h-full border-0 rounded-none">
            <CardContent className="p-0 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4 opacity-50 mx-auto" />
                <p>Carregando...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Lista de Conversas - Lado Esquerdo */}
      <div className="w-1/3 border-r border-primary/20">
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversas Ativas ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground px-4">
                Nenhuma conversa ativa no momento
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-1 p-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-primary/10 border-primary/30 shadow-sm'
                          : 'hover:bg-muted/50 hover:border-primary/20'
                      }`}
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {conversation.cliente_nome ? (
                              <div className="w-full">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{conversation.cliente_nome}</span>
                                </div>
                                <div className="text-xs text-muted-foreground ml-6">
                                  {conversation.phone_number}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{conversation.phone_number}</span>
                              </div>
                            )}
                          </div>
                          {getStatusBadge(conversation.status)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conversation.updated_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface - Lado Direito */}
      <div className="flex-1">
        <Card className="h-full border-0 rounded-none">
          {selectedConversation ? (
            <ConversationDetail
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
              onEndConversation={handleEndConversation}
              messages={messages}
              loading={messagesLoading}
            />
          ) : (
            <CardContent className="p-0 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4 opacity-50 mx-auto" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p className="text-sm">
                  Escolha uma conversa da lista para visualizar as mensagens
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};