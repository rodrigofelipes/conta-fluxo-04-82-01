import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TaskFilters as TaskFiltersType, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/tasks';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const [clients, setClients] = useState<Array<{ user_id: string; full_name?: string; username?: string }>>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, username')
          .order('full_name');
        
        setClients(data || []);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      }
    };

    fetchClients();
  }, []);

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatus = filters.status || [];
    const newStatus = checked
      ? [...currentStatus, status as any]
      : currentStatus.filter(s => s !== status);
    
    onFiltersChange({
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined
    });
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    const currentPriority = filters.priority || [];
    const newPriority = checked
      ? [...currentPriority, priority as any]
      : currentPriority.filter(p => p !== priority);
    
    onFiltersChange({
      ...filters,
      priority: newPriority.length > 0 ? newPriority : undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Status */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          <div className="space-y-2">
            {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status?.includes(status as any) || false}
                  onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                />
                <Label htmlFor={`status-${status}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Prioridade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Prioridade</Label>
          <div className="space-y-2">
            {Object.entries(TASK_PRIORITY_LABELS).map(([priority, label]) => (
              <div key={priority} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority}`}
                  checked={filters.priority?.includes(priority as any) || false}
                  onCheckedChange={(checked) => handlePriorityChange(priority, checked as boolean)}
                />
                <Label htmlFor={`priority-${priority}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cliente</Label>
          <Select
            value={filters.client_id || ""}
            onValueChange={(value) => onFiltersChange({
              ...filters,
              client_id: value || undefined
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.user_id} value={client.user_id}>
                  {client.full_name || client.username || 'Cliente'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Período de Vencimento */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Período de Vencimento</Label>
          <div className="space-y-2">
            <Input
              type="date"
              placeholder="Data inicial"
              value={filters.due_date_from || ""}
              onChange={(e) => onFiltersChange({
                ...filters,
                due_date_from: e.target.value || undefined
              })}
            />
            <Input
              type="date"
              placeholder="Data final"
              value={filters.due_date_to || ""}
              onChange={(e) => onFiltersChange({
                ...filters,
                due_date_to: e.target.value || undefined
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}