import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminSelect } from '@/components/AdminSelect';
import { useAdmins } from '@/hooks/useAdmins';
import { Plus, X } from 'lucide-react';

interface MultipleAdminSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultipleAdminSelect({ value = [], onChange }: MultipleAdminSelectProps) {
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const { admins } = useAdmins();

  const handleAddAdmin = () => {
    if (selectedAdmin && !value.includes(selectedAdmin)) {
      onChange([...value, selectedAdmin]);
      setSelectedAdmin('');
    }
  };

  const handleRemoveAdmin = (adminId: string) => {
    onChange(value.filter(id => id !== adminId));
  };

  const getAdminName = (adminId: string) => {
    const admin = admins.find(a => a.id === adminId);
    if (!admin) return adminId;
    
    const isCoordenacao = admin.setores?.includes('COORDENACAO');
    const isMasterAdmin = admin.is_master_admin;
    
    let suffix = `(${admin.username})`;
    if (isMasterAdmin) {
      suffix += ' [Master Admin]';
    } else if (isCoordenacao) {
      suffix += ' [Coordenação]';
    }
    
    return `${admin.full_name} ${suffix}`;
  };

  const availableAdmins = admins.filter(admin => !value.includes(admin.id));

  return (
    <div className="space-y-3">
      {/* Lista de admins selecionados */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(adminId => (
            <Badge key={adminId} variant="secondary" className="flex items-center gap-2">
              {getAdminName(adminId)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveAdmin(adminId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Seletor para adicionar novo admin */}
      {availableAdmins.length > 0 && (
        <div className="flex gap-2">
          <div className="flex-1">
            <AdminSelect
              value={selectedAdmin}
              onValueChange={setSelectedAdmin}
              placeholder="Selecionar admin responsável"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddAdmin}
            disabled={!selectedAdmin}
            className="px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {value.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Nenhum admin responsável selecionado
        </div>
      )}
    </div>
  );
}