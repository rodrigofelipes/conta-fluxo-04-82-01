import React, { useState, useRef, useEffect } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  MessageCircle,
  User,
  Clock,
  Paperclip,
  Mic,
  Loader2,
  FileText,
  Download
} from 'lucide-react';
import {
  SupportClient,
  SupportMessage,
  SupportMessageContent
} from '@/hooks/useSupportChat';
import { useAuth } from '@/state/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  client: SupportClient | null;
  messages: SupportMessage[];
  loading: boolean;
  onSendMessage: (content: SupportMessageContent) => Promise<void>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  messages,
  loading,
  onSendMessage
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState<null | 'file' | 'audio'>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

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
      await onSendMessage({
        type: 'text',
        text: newMessage
      });
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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return null;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAttachmentUpload = async (
    file: File,
    type: 'file' | 'audio',
    options?: { duration?: number }
  ) => {
    if (!client) return;

    setAttachmentUploading(type);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${client.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('support-files')
        .upload(filePath, file, {
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData, error: publicUrlError } = supabase.storage
        .from('support-files')
        .getPublicUrl(filePath);

      if (publicUrlError) throw publicUrlError;

      const payload: SupportMessageContent =
        type === 'file'
          ? {
              type: 'file',
              url: publicUrlData.publicUrl,
              name: file.name,
              size: file.size,
              mimeType: file.type
            }
          : {
              type: 'audio',
              url: publicUrlData.publicUrl,
              mimeType: file.type,
              duration: options?.duration
            };

      await onSendMessage(payload);
      toast({
        title: type === 'file' ? 'Arquivo enviado' : 'Áudio enviado',
        description:
          type === 'file'
            ? 'O arquivo foi enviado com sucesso.'
            : 'A mensagem de áudio foi enviada com sucesso.'
      });
    } catch (error: any) {
      console.error('Erro ao enviar anexo:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o anexo.',
        variant: 'destructive'
      });
    } finally {
      setAttachmentUploading(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      await handleAttachmentUpload(file, 'file');
    }

    event.target.value = '';
  };

  const stopRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const stopRecording = () => {
    stopRecordingTimer();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const startRecording = async () => {
    if (!client) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'Gravação não suportada',
        description: 'Seu navegador não suporta captura de áudio.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });

        if (blob.size === 0) {
          toast({
            title: 'Gravação vazia',
            description: 'Nenhum áudio foi capturado. Tente novamente.',
            variant: 'destructive'
          });
          return;
        }

        const file = new File([blob], `gravacao-${Date.now()}.webm`, {
          type: blob.type
        });

        await handleAttachmentUpload(file, 'audio', {
          duration: recordingDuration
        });

        setRecordingDuration(0);
      });

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Erro ao iniciar gravação de áudio:', error);
      toast({
        title: 'Erro na gravação',
        description:
          error.message || 'Não foi possível iniciar a gravação de áudio. Verifique as permissões.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      stopRecordingTimer();
    };
  }, [isRecording]);

  const renderMessageContent = (message: SupportMessage) => {
    switch (message.content.type) {
      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium break-words">{message.content.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(message.content.size)}</p>
              </div>
            </div>
            <a
              href={message.content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="h-3 w-3" /> Baixar arquivo
            </a>
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4" />
              <span>Mensagem de áudio</span>
              {formatDuration(message.content.duration) && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(message.content.duration)}
                </span>
              )}
            </div>
            <audio controls src={message.content.url} className="w-full" preload="auto" />
          </div>
        );
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content.text}
          </p>
        );
    }
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
                        {renderMessageContent(message)}
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
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attachmentUploading !== null}
              >
                {attachmentUploading === 'file' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending || attachmentUploading === 'file'}
              >
                {attachmentUploading === 'audio' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                )}
              </Button>
            </div>
            <Textarea
              placeholder={`Enviar mensagem para ${client.nome}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none"
              disabled={sending || attachmentUploading !== null}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || attachmentUploading !== null}
              size="lg"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap justify-between items-center mt-2 text-xs text-muted-foreground gap-2">
            <span>Digite Enter para enviar, Shift+Enter para nova linha</span>
            <div className="flex items-center gap-3">
              {isRecording && (
                <span className="text-destructive font-medium">
                  Gravando áudio... {formatDuration(recordingDuration)}
                </span>
              )}
              <span>{newMessage.length}/1000</span>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  );
};