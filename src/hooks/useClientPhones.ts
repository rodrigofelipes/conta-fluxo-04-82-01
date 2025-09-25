import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientPhone {
  id: string;
  cliente_id: string;
  telefone: string;
  departamento: string;
  tipo: string;
  principal: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientPhones = (clienteId?: string) => {
  const [phones, setPhones] = useState<ClientPhone[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPhones = async (force = false) => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('cliente_telefones')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true);
      
      // Força ordenação por updated_at se forçado para evitar cache
      if (force) {
        query = query.order('updated_at', { ascending: false });
      } else {
        query = query.order('principal', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('📱 Telefones carregados para cliente', clienteId, ':', data?.length || 0);
      setPhones(data || []);
    } catch (error) {
      console.error('Erro ao buscar telefones:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar telefones do cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPhone = async (phone: Omit<ClientPhone, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Se for marcado como principal, desmarcar outros
      if (phone.principal) {
        await supabase
          .from('cliente_telefones')
          .update({ principal: false })
          .eq('cliente_id', phone.cliente_id);
      }

      const { data, error } = await supabase
        .from('cliente_telefones')
        .insert([phone])
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar estado local imediatamente
      setPhones(prevPhones => {
        const newPhones = [...prevPhones, data];
        console.log('📱 Telefone adicionado, total:', newPhones.length);
        return newPhones;
      });
      
      toast({
        title: "Sucesso",
        description: "Telefone adicionado com sucesso",
      });
      
      // Forçar refresh para garantir sincronização
      setTimeout(() => {
        fetchPhones(true);
      }, 100);
      
      return data;
    } catch (error) {
      console.error('Erro ao adicionar telefone:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar telefone",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePhone = async (id: string, updates: Partial<ClientPhone>) => {
    try {
      // Se for marcado como principal, desmarcar outros
      if (updates.principal) {
        await supabase
          .from('cliente_telefones')
          .update({ principal: false })
          .eq('cliente_id', clienteId!);
      }

      const { data, error } = await supabase
        .from('cliente_telefones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar estado local imediatamente
      setPhones(prevPhones => {
        const updatedPhones = prevPhones.map(phone => 
          phone.id === id ? { ...phone, ...updates } : phone
        );
        console.log('📱 Telefone atualizado:', id);
        return updatedPhones;
      });
      
      toast({
        title: "Sucesso",
        description: "Telefone atualizado com sucesso",
      });
      
      // Forçar refresh para garantir sincronização
      setTimeout(() => {
        fetchPhones(true);
      }, 100);
      
      return data;
    } catch (error) {
      console.error('Erro ao atualizar telefone:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar telefone",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePhone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cliente_telefones')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar estado local imediatamente  
      setPhones(prevPhones => {
        const filteredPhones = prevPhones.filter(phone => phone.id !== id);
        console.log('📱 Telefone removido:', id, 'restam:', filteredPhones.length);
        return filteredPhones;
      });
      
      toast({
        title: "Sucesso",
        description: "Telefone removido com sucesso",
      });
      
      // Forçar refresh para garantir sincronização
      setTimeout(() => {
        fetchPhones(true);
      }, 100);
    } catch (error) {
      console.error('Erro ao remover telefone:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover telefone",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getPrimaryPhone = () => {
    return phones.find(phone => phone.principal);
  };

  useEffect(() => {
    fetchPhones();
  }, [clienteId]);

  return {
    phones,
    loading,
    addPhone,
    updatePhone,
    deletePhone,
    getPrimaryPhone,
    refetch: (force = false) => fetchPhones(force)
  };
};