import React, { useState, useRef, useEffect } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, User, Clock } from 'lucide-react';
import { SupportClient, SupportMessage } from '@/hooks/useSupportChat';
import { useAuth } from '@/state/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatInterfaceProps {
  client: SupportClient | null;
  messages: SupportMessage[];
  loading: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  messages,
  loading,
  onSendMessage
}) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Selecione um cliente</h3>
        <p className="text-sm text-center">
          Escolha um cliente da lista para iniciar ou continuar uma conversa
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Cabeçalho do Chat */}
      <CardHeader className="pb-3 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm font-medium">
              {getInitials(client.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{client.nome} {client.telefone && `(${client.telefone})`}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                {client.setor}
              </Badge>
              {client.email && (
                <span className="text-xs">{client.email}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Online</span>
          </div>
        </div>
      </CardHeader>

      {/* Área de Mensagens */}
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-300px)]">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[70%] space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-muted rounded-full" />
                        <div className="h-3 bg-muted rounded w-16" />
                      </div>
                      <div className="h-16 bg-muted rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-3 opacity-50" />
              <h4 className="font-medium mb-2">Inicie a conversa</h4>
              <p className="text-sm">
                Envie a primeira mensagem para {client.nome}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isFromAdmin = message.from_user_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isFromAdmin ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {isFromAdmin 
                              ? getInitials(user?.username || 'A')
                              : getInitials(client.nome)
                            }
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {isFromAdmin ? 'Você' : client.nome}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </div>
                      </div>
                      
                      <div
                        className={`p-3 rounded-lg ${
                          isFromAdmin
                            ? 'bg-primary text-primary-foreground border border-primary/30'
                            : 'bg-card border border-border'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                      </div>
                      
                      {message.viewed_at && isFromAdmin && (
                        <div className="text-xs text-muted-foreground mt-1 text-right">
                          Lida
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Área de Input */}
        <div className="p-4 border-t border-primary/20 bg-background">
          <div className="flex gap-2">
            <Textarea
              placeholder={`Enviar mensagem para ${client.nome}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="lg"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>Digite Enter para enviar, Shift+Enter para nova linha</span>
            <span>{newMessage.length}/1000</span>
          </div>
        </div>
      </CardContent>
    </>
  );
};