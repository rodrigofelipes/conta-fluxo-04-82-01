import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Setor } from '@/types/setor';

export interface ClientAdminSetor {
  id: string;
  cliente_id: string;
  setor: Setor;
  admin_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClientAdminSetorWithDetails extends ClientAdminSetor {
  cliente_nome?: string;
  admin_username?: string;
  admin_full_name?: string;
}

export function useClientAdminSetores() {
  const [assignments, setAssignments] = useState<ClientAdminSetorWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('cliente_admin_setores')
        .select(`
          *,
          clientes:cliente_id (nome),
          profiles:admin_id (username, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        cliente_nome: (item as any).clientes?.nome,
        admin_username: (item as any).profiles?.username,
        admin_full_name: (item as any).profiles?.full_name
      })) || [];

      setAssignments(formattedData);
    } catch (error) {
      console.error('Erro ao buscar atribuições:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignAdmin = async (clienteId: string, setor: Setor, adminId: string) => {
    try {
      const { error } = await supabase
        .from('cliente_admin_setores')
        .upsert({
          cliente_id: clienteId,
          setor: setor as any, // Type assertion para suporte aos novos setores
          admin_id: adminId
        });

      if (error) throw error;

      await fetchAssignments();
      return true;
    } catch (error) {
      console.error('Erro ao atribuir admin:', error);
      return false;
    }
  };

  const removeAssignment = async (clienteId: string, setor: Setor) => {
    try {
      const { error } = await supabase
        .from('cliente_admin_setores')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('setor', setor as any); // Type assertion para suporte aos novos setores

      if (error) throw error;

      await fetchAssignments();
      return true;
    } catch (error) {
      console.error('Erro ao remover atribuição:', error);
      return false;
    }
  };

  const getClientAssignments = (clienteId: string) => {
    return assignments.filter(a => a.cliente_id === clienteId);
  };

  return {
    assignments,
    loading,
    assignAdmin,
    removeAssignment,
    getClientAssignments,
    refetch: fetchAssignments
  };
}