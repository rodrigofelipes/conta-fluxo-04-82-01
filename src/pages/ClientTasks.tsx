import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from '@/components/tasks/TaskList';
import { useTasks } from '@/hooks/useTasks';

export default function ClientTasks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  console.log('🚀 [ClientTasks] Componente inicializado');
  console.log('🔍 [ClientTasks] Search query atual:', searchQuery);

  const { tasks, loading } = useTasks({
    search: searchQuery
  });

  console.log('📊 [ClientTasks] Estado recebido do useTasks:', {
    tasksCount: tasks.length,
    loading,
    tasks: tasks.map(t => ({ id: t.id, title: t.title, client_id: t.client_id }))
  });

  useEffect(() => {
    console.log('🔐 [ClientTasks] Verificando autenticação...');
    
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log('👤 [ClientTasks] Usuário atual:', {
          userId: user?.id,
          email: user?.email,
          userExists: !!user
        });
        
        if (!user) {
          console.log('❌ [ClientTasks] Usuário não autenticado, redirecionando...');
          navigate('/login');
          return;
        }

        // Check if user is client (not admin)
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        console.log('🏷️ [ClientTasks] Role do usuário:', userRoles);

        if (!userRoles || userRoles.role === 'admin') {
          console.log('⚠️ [ClientTasks] Usuário é admin, redirecionando...');
          toast({
            title: 'Área incorreta',
            description: 'Administradores devem usar a área administrativa.',
            variant: 'destructive'
          });
          navigate('/admin/tasks');
          return;
        }
        
        console.log('✅ [ClientTasks] Autenticação OK, usuário é cliente');
      } catch (error) {
        console.error('❌ [ClientTasks] Erro ao verificar autenticação:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, toast]);

  console.log('🎨 [ClientTasks] Renderizando TaskList com:', { tasksCount: tasks.length, loading });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minhas Tarefas</h1>
        <p className="text-muted-foreground">
          Acompanhe suas tarefas e interaja com os comentários
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisar Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar por título ou descrição..."
              value={searchQuery}
              onChange={(e) => {
                console.log('🔍 [ClientTasks] Search query alterado:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>
      
      <TaskList
        tasks={tasks}
        loading={loading}
      />
    </div>
  );
}