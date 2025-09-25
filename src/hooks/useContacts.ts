import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/state/auth';

export interface Contact {
  id: string;
  nome: string;
  cnpj?: string;
  cidade?: string;
}

export function useContacts() {
  const { user } = useAuth();
  const isClient = user?.role === "user";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    console.log('fetchContacts called with user:', user);
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('User is client:', isClient, 'User role:', user.role);
    
    if (isClient) {
      // Para clientes, buscar admins do setor deles através do cliente
      try {
        // Primeiro, buscar o cliente do usuário atual na tabela clientes
        const { data: clientData, error: clientError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('user_id', user.id)
          .single();
          
        if (clientError || !clientData) {
          console.error('Erro ao buscar dados do cliente:', clientError);
          setContacts([]);
          setLoading(false);
          return;
        }

        // Buscar clientes com o email deste usuário
        console.log('Buscando cliente com email:', clientData.email);
        const { data: clienteInfo, error: clienteError } = await supabase
          .from('clientes')
          .select('setor')
          .eq('email', clientData.email)
          .maybeSingle();
          
        console.log('Resultado busca cliente:', clienteInfo, 'Error:', clienteError);
        if (clienteError) {
          console.error('Erro ao buscar setor do cliente:', clienteError);
          setContacts([]);
          setLoading(false);
          return;
        }

        const setor = clienteInfo?.setor;
        console.log('Setor encontrado:', setor);
        if (!setor) {
          // Se não encontrou setor específico, buscar todos os admins disponíveis
          console.log('Nenhum setor encontrado, buscando todos os admins...');
          const { data: adminRoles, error: adminError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');
          
          console.log('Admin roles encontrados:', adminRoles, 'Error:', adminError);
          if (adminError || !adminRoles?.length) {
            console.log('Nenhum admin encontrado ou erro');
            setContacts([]);
            setLoading(false);
            return;
          }
          
          const { data: adminProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, username, full_name, email')
            .in('user_id', adminRoles.map(r => r.user_id));
            
          console.log('Admin profiles encontrados:', adminProfiles, 'Error:', profileError);
          if (profileError || !adminProfiles?.length) {
            console.log('Nenhum profile de admin encontrado ou erro');
            setContacts([]);
            setLoading(false);
            return;
          }
          
          const adminContacts = adminProfiles.map(profile => ({
            id: profile.user_id,
            nome: profile.full_name || profile.username || 'Suporte',
          }));
          
          console.log('Admin contacts finais:', adminContacts);
          setContacts(adminContacts);
          setLoading(false);
          return;
        }

        // Buscar admins do setor específico
        const { data: adminSetores, error: setorError } = await supabase
          .from('admin_setores')
          .select('user_id')
          .eq('setor', setor);
          
        if (setorError || !adminSetores?.length) {
          console.error('Erro ao buscar admins do setor:', setorError);
          setContacts([]);
          setLoading(false);
          return;
        }
        
        const { data: adminProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, email')
          .in('user_id', adminSetores.map(s => s.user_id));
          
        if (profileError || !adminProfiles?.length) {
          console.error('Erro ao buscar profiles dos admins:', profileError);
          setContacts([]);
          setLoading(false);
          return;
        }
        
        // Para clientes, retornar todos os admins do setor
        const adminContacts = adminProfiles.map(profile => ({
          id: profile.user_id,
          nome: profile.full_name || profile.username || 'Suporte',
        }));
        
        setContacts(adminContacts);
        
      } catch (error) {
        console.error('Erro inesperado:', error);
        setContacts([]);
      }
    } else {
      // Para admins, buscar todos os usuários
      try {
        const { data: userRoles, error: userError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'user');
        
        if (userError) {
          console.error('Erro ao buscar roles de usuário:', userError);
          setLoading(false);
          return;
        }
        
        if (userRoles && userRoles.length > 0) {
          const { data: userProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, username, full_name, email')
            .in('user_id', userRoles.map(r => r.user_id));
            
          if (profileError) {
            console.error('Erro ao buscar profiles de usuário:', profileError);
            setLoading(false);
            return;
          }
          
          const userContacts = userProfiles?.map(profile => ({
            id: profile.user_id,
            nome: profile.full_name || profile.username || profile.email || 'Usuário',
            cnpj: ''
          })) || [];
          
          setContacts(userContacts);
        }
      } catch (error) {
        console.error('Erro inesperado:', error);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user, isClient]);

  return {
    contacts,
    loading,
    isClient,
    refetch: fetchContacts
  };
}