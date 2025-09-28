import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, MessageSquare } from 'lucide-react';
import { ClientList } from '@/components/support/ClientList';
import { ChatInterface } from '@/components/support/ChatInterface';
import { useSupportChat, SupportClient, SupportMessageContent } from '@/hooks/useSupportChat';
import { useAuth } from '@/state/auth';
import { differenceInHours } from 'date-fns';

export default function Support() {
  const { user } = useAuth();
  const {
    clients,
    messages,
    loading,
    messagesLoading,
    fetchClients,
    fetchMessages,
    sendMessage
  } = useSupportChat();

  const [selectedClient, setSelectedClient] = useState<SupportClient | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    if (!hasAutoSelected && clients.length > 0) {
      const firstClient = clients[0];
      setSelectedClient(firstClient);
      fetchMessages(firstClient.id);
      setHasAutoSelected(true);
    }
  }, [clients, hasAutoSelected, fetchMessages]);

  const handleClientSelect = async (client: SupportClient) => {
    setSelectedClient(client);
    await fetchMessages(client.id);
  };

  const handleSendMessage = async (content: SupportMessageContent) => {
    if (!selectedClient || !user?.id) return;
    await sendMessage(user.id, selectedClient.id, content);
  };

  const unreadCount = useMemo(
    () => clients.reduce((total, client) => total + (client.unread_count || 0), 0),
    [clients]
  );

  const recentConversations = useMemo(
    () =>
      clients.filter((client) => {
        if (!client.last_message_at) return false;
        return differenceInHours(new Date(), new Date(client.last_message_at)) <= 24;
      }).length,
    [clients]
  );

  return (
    <main className="min-h-screen flex flex-col bg-muted/20">
      <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <PageHeader
          title="Central de Suporte"
          subtitle="Gerencie as conversas com clientes, envie anexos e mensagens de áudio com praticidade."
          className="flex-shrink-0"
        />
      </div>

      <section className="flex-1 min-h-0 px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center gap-3 py-5">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Clientes ativos</p>
                  <p className="text-2xl font-semibold">{clients.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center gap-3 py-5">
                <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mensagens não lidas</p>
                  <p className="text-2xl font-semibold">{unreadCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center gap-3 py-5">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversas recentes (24h)</p>
                  <p className="text-2xl font-semibold">{recentConversations}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center justify-between gap-3 py-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Atualizar dados</p>
                  <p className="text-sm text-muted-foreground">Busque clientes e mensagens mais recentes.</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchClients}
                  className="shrink-0"
                  title="Atualizar lista de clientes"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[360px_1fr]">
            <Card className="flex h-full flex-col overflow-hidden">
              <ClientList
                clients={clients}
                loading={loading}
                selectedClient={selectedClient}
                onClientSelect={handleClientSelect}
              />
            </Card>

            <Card className="flex h-full flex-col overflow-hidden">
              <ChatInterface
                client={selectedClient}
                messages={messages}
                loading={messagesLoading}
                onSendMessage={handleSendMessage}
              />
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
