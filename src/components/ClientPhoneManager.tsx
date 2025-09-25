import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Phone } from 'lucide-react';
import { useClientPhones, ClientPhone } from '@/hooks/useClientPhones';

interface ClientPhoneManagerProps {
  clienteId: string;
  readonly?: boolean;
}

const DEPARTAMENTOS = [
  'Geral',
  'Vendas',
  'Suporte',
  'Financeiro',
  'Contabilidade',
  'Recursos Humanos',
  'Diretoria'
];

const TIPOS = [
  'Celular',
  'Fixo',
  'WhatsApp',
  'Comercial',
  'Residencial'
];

export const ClientPhoneManager: React.FC<ClientPhoneManagerProps> = ({ 
  clienteId, 
  readonly = false 
}) => {
  const { phones, loading, addPhone, updatePhone, deletePhone } = useClientPhones(clienteId);
  const [isAdding, setIsAdding] = useState(false);
  const [newPhone, setNewPhone] = useState({
    telefone: '',
    departamento: '',
    tipo: 'Celular',
    principal: false
  });

  const handleAddPhone = async () => {
    if (!newPhone.telefone || !newPhone.departamento) return;
    
    try {
      await addPhone({
        cliente_id: clienteId,
        ...newPhone,
        ativo: true
      });
      
      setNewPhone({
        telefone: '',
        departamento: '',
        tipo: 'Celular',
        principal: false
      });
      setIsAdding(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdatePrincipal = async (phoneId: string, isPrincipal: boolean) => {
    await updatePhone(phoneId, { principal: isPrincipal });
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando telefones...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Telefones</Label>
        {!readonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Telefone
          </Button>
        )}
      </div>

      {phones.length === 0 && !isAdding && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Nenhum telefone cadastrado
        </div>
      )}

      <div className="space-y-3">
        {phones.map((phone) => (
          <Card key={phone.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{formatPhoneNumber(phone.telefone)}</div>
                  <div className="text-sm text-muted-foreground">
                    {phone.departamento} • {phone.tipo}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {phone.principal && <Badge variant="default">Principal</Badge>}
                
                {!readonly && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={phone.principal}
                      onCheckedChange={(checked) => 
                        handleUpdatePrincipal(phone.id, checked as boolean)
                      }
                    />
                    <Label className="text-xs">Principal</Label>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePhone(phone.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {isAdding && (
          <Card className="p-4 border-dashed">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={newPhone.telefone}
                    onChange={(e) => setNewPhone(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div>
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Select 
                    value={newPhone.departamento}
                    onValueChange={(value) => setNewPhone(prev => ({ ...prev, departamento: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTAMENTOS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select 
                    value={newPhone.tipo}
                    onValueChange={(value) => setNewPhone(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <Checkbox
                    checked={newPhone.principal}
                    onCheckedChange={(checked) => 
                      setNewPhone(prev => ({ ...prev, principal: checked as boolean }))
                    }
                  />
                  <Label>Telefone principal</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={handleAddPhone}
                  disabled={!newPhone.telefone || !newPhone.departamento}
                >
                  Salvar
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsAdding(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};