import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Admin {
  id: string;
  username: string;
  full_name: string;
  setores?: string[];
  is_master_admin?: boolean;
}

export function useAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      // First, get all admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) {
        console.error('Erro ao buscar roles de admin:', rolesError);
        return;
      }

      const adminUserIds = adminRoles?.map(role => role.user_id) || [];

      if (adminUserIds.length === 0) {
        setAdmins([]);
        return;
      }

      // Then get profiles for those users
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          username,
          full_name
        `)
        .in('user_id', adminUserIds);

      if (error) {
        console.error('Erro ao buscar admins:', error);
        return;
      }

      // Get admin setores
      const { data: setoresData } = await supabase
        .from('admin_setores')
        .select('user_id, setor')
        .in('user_id', adminUserIds);

      // Get master admins
      const { data: masterAdminsData } = await supabase
        .from('master_admins')
        .select('user_id')
        .in('user_id', adminUserIds);

      const masterAdminIds = new Set(masterAdminsData?.map(ma => ma.user_id) || []);
      
      // Group setores by user_id
      const setoresByUser = setoresData?.reduce((acc, item) => {
        if (!acc[item.user_id]) acc[item.user_id] = [];
        acc[item.user_id].push(item.setor);
        return acc;
      }, {} as Record<string, string[]>) || {};

      const adminsList = profilesData?.map(admin => ({
        id: admin.user_id,
        username: admin.username || 'Usuário',
        full_name: admin.full_name || admin.username || 'Usuário',
        setores: setoresByUser[admin.user_id] || [],
        is_master_admin: masterAdminIds.has(admin.user_id)
      })) || [];

      setAdmins(adminsList);
    } catch (error) {
      console.error('Erro ao buscar admins:', error);
    } finally {
      setLoading(false);
    }
  };

  return { admins, loading, refetch: fetchAdmins };
}