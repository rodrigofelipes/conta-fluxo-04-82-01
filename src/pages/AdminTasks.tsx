import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TasksPage } from '@/components/tasks/TasksPage';

export default function AdminTasks() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Check if user is admin
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!userRoles || userRoles.role !== 'admin') {
          toast({
            title: 'Acesso negado',
            description: 'Você não tem permissão para acessar esta área.',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, toast]);

  return <TasksPage />;
}