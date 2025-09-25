import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, User, Phone, Mail } from 'lucide-react';
import { SupportClient } from '@/hooks/useSupportChat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientListProps {
  clients: SupportClient[];
  loading: boolean;
  selectedClient: SupportClient | null;
  onClientSelect: (client: SupportClient) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  loading,
  selectedClient,
  onClientSelect
}) => {
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.setor.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSetorColor = (setor: string) => {
    const colors = {
      'CONTABILIDADE': 'bg-primary/10 text-primary border-primary/20',
      'FISCAL': 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400', 
      'TRABALHISTA': 'bg-brand-3/10 text-brand-3 border-brand-3/20',
      'JURIDICO': 'bg-destructive/10 text-destructive border-destructive/20',
      'TODOS': 'bg-muted text-muted-foreground border-border'
    };
    return colors[setor as keyof typeof colors] || 'bg-muted text-muted-foreground border-border';
  };

  if (loading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Clientes</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Clientes ({clients.length})
          {clients.some(c => c.unread_count && c.unread_count > 0) && (
            <Badge variant="destructive" className="text-xs">
              {clients.reduce((acc, c) => acc + (c.unread_count || 0), 0)} não lidas
            </Badge>
          )}
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {filteredClients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <User className="mx-auto h-8 w-8 mb-2" />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => onClientSelect(client)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedClient?.id === client.id ? 'bg-primary/5 border border-primary/30' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm font-medium">
                          {getInitials(client.nome)}
                        </AvatarFallback>
                      </Avatar>
                      {client.unread_count && client.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                          {client.unread_count}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {client.nome}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs border ${getSetorColor(client.setor)}`}
                        >
                          {client.setor}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        
                        {client.telefone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.telefone}</span>
                          </div>
                        )}
                      </div>

                      {client.last_message && (
                        <div className="mt-2 pt-2 border-t border-muted">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {client.last_message}
                          </p>
                          {client.last_message_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(client.last_message_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </>
  );
};