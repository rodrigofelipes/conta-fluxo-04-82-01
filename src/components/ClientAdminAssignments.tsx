import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminSelect } from '@/components/AdminSelect';
import { useClientAdminSetores } from '@/hooks/useClientAdminSetores';
import { useContacts } from '@/hooks/useContacts';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Setor, SETORES_OPTIONS } from '@/types/setor';

interface ClientAdminAssignmentsProps {
  clientId?: string;
  showAllClients?: boolean;
}

export function ClientAdminAssignments({ clientId, showAllClients = false }: ClientAdminAssignmentsProps) {
  const { assignments, loading, assignAdmin, removeAssignment, getClientAssignments } = useClientAdminSetores();
  const { contacts } = useContacts();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedSetor, setSelectedSetor] = useState<Setor | ''>('');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');

  const handleAssign = async () => {
    const targetClientId = clientId || selectedClient;
    
    if (!targetClientId || !selectedSetor || !selectedAdmin) {
      toast.error('Selecione cliente, setor e admin');
      return;
    }

    const success = await assignAdmin(targetClientId, selectedSetor as Setor, selectedAdmin);
    if (success) {
      toast.success('Admin atribuído com sucesso!');
      setSelectedClient('');
      setSelectedSetor('');
      setSelectedAdmin('');
    } else {
      toast.error('Erro ao atribuir admin');
    }
  };

  const handleRemove = async (clienteId: string, setor: Setor) => {
    const success = await removeAssignment(clienteId, setor);
    if (success) {
      toast.success('Atribuição removida!');
    } else {
      toast.error('Erro ao remover atribuição');
    }
  };

  const displayAssignments = clientId 
    ? getClientAssignments(clientId)
    : assignments;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atribuições Admin por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atribuições Admin por Setor</CardTitle>
        <CardDescription>
          {clientId 
            ? 'Gerencie qual admin é responsável por este cliente em cada setor'
            : 'Gerencie as atribuições de admin por cliente e setor'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário para nova atribuição */}
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Atribuição
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {!clientId && (
              <div>
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-2 block">Setor</label>
                <Select value={selectedSetor} onValueChange={(value) => setSelectedSetor(value as Setor)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETORES_OPTIONS.map(setor => (
                      <SelectItem key={setor.value} value={setor.value}>
                        {setor.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Admin</label>
              <AdminSelect
                value={selectedAdmin}
                onValueChange={setSelectedAdmin}
                placeholder="Selecionar admin"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleAssign} disabled={!selectedSetor || !selectedAdmin}>
                Atribuir
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de atribuições existentes */}
        <div className="space-y-3">
          <h4 className="font-medium">Atribuições Existentes</h4>
          
          {displayAssignments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma atribuição encontrada
            </div>
          ) : (
            <div className="space-y-2">
              {displayAssignments.map(assignment => (
                <div
                  key={`${assignment.cliente_id}-${assignment.setor}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {!clientId && (
                      <div>
                        <div className="font-medium">{assignment.cliente_nome}</div>
                      </div>
                    )}
                    <Badge variant="outline">
                      {SETORES_OPTIONS.find(s => s.value === assignment.setor)?.label || assignment.setor}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      → {assignment.admin_full_name || assignment.admin_username}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(assignment.cliente_id, assignment.setor as Setor)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}