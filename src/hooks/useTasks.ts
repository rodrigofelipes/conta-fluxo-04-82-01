import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFilters, CreateTaskData, UpdateTaskData } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      console.log('🚀 [useTasks] Iniciando fetch de tarefas...');
      console.log('🔍 [useTasks] Filtros aplicados:', filters);
      
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tasks_new')
        .select(`
          *
        `)
        .order('updated_at', { ascending: false });

      console.log('📊 [useTasks] Query base criada');

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
        console.log('🏷️ [useTasks] Filtro status aplicado:', filters.status);
      }

      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
        console.log('⚡ [useTasks] Filtro prioridade aplicado:', filters.priority);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
        console.log('👤 [useTasks] Filtro client_id aplicado:', filters.client_id);
      }

      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
        console.log('📅 [useTasks] Filtro due_date_from aplicado:', filters.due_date_from);
      }

      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
        console.log('📅 [useTasks] Filtro due_date_to aplicado:', filters.due_date_to);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        console.log('🔍 [useTasks] Filtro search aplicado:', filters.search);
      }

      console.log('🚀 [useTasks] Executando query...');
      
      // Debug: verificar usuário autenticado
      const { data: user } = await supabase.auth.getUser();
      console.log('🔐 [useTasks] Usuário autenticado:', {
        userId: user.user?.id,
        email: user.user?.email
      });

      // Debug: testar contexto de autenticação com função debug
      try {
        const { data: debugData } = await supabase.rpc('debug_auth_context');
        console.log('🔍 [useTasks] Debug auth context:', debugData);
      } catch (debugError) {
        console.error('❌ [useTasks] Erro no debug auth context:', debugError);
      }

      // Log adicional: verificar sessão antes da query
      const { data: session } = await supabase.auth.getSession();
      console.log('🔑 [useTasks] Sessão atual:', {
        hasSession: !!session.session,
        accessToken: session.session?.access_token ? 'presente' : 'ausente',
        userId: session.session?.user?.id
      });

      const { data, error } = await query;

      console.log('📊 [useTasks] Resultado da query:', {
        data: data ? `${data.length} tarefas encontradas` : 'null',
        error: error ? error.message : 'nenhum erro',
        rawData: data
      });

      // Log adicional: se erro, verificar se é RLS
      if (error) {
        console.error('❌ [useTasks] Detalhes do erro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      }

      if (error) {
        console.error('❌ [useTasks] Erro na query:', error);
        throw error;
      }

      console.log('🔄 [useTasks] Iniciando join com dados dos clientes...');

      // Manually join with profiles data through clientes table
      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
          console.log(`🔍 [useTasks] Processando tarefa ${task.id}:`, {
            title: task.title,
            client_id: task.client_id,
            created_by: task.created_by
          });

          // Get client info from clientes table
          const clientQuery = await supabase
            .from('clientes')
            .select('id, nome, email, telefone')
            .eq('id', task.client_id)
            .single();

          console.log(`👤 [useTasks] Cliente para tarefa ${task.id}:`, {
            clientData: clientQuery.data,
            clientError: clientQuery.error?.message
          });

          // Get creator profile
          const creatorProfile = await supabase
            .from('profiles')
            .select('user_id, full_name, email, username')
            .eq('user_id', task.created_by)
            .single();

          console.log(`👨‍💼 [useTasks] Criador para tarefa ${task.id}:`, {
            creatorData: creatorProfile.data,
            creatorError: creatorProfile.error?.message
          });

          const taskWithProfile = {
            ...task,
            client: clientQuery.data ? {
              user_id: clientQuery.data.id,
              full_name: clientQuery.data.nome,
              email: clientQuery.data.email,
              username: clientQuery.data.nome,
              whatsapp_e164: clientQuery.data.telefone
            } : null,
            creator: creatorProfile.data
          };

          console.log(`✅ [useTasks] Tarefa processada ${task.id}:`, taskWithProfile);
          return taskWithProfile;
        })
      );

      console.log('📊 [useTasks] Todas as tarefas processadas:', tasksWithProfiles);

      setTasks((tasksWithProfiles as any) || []);
      console.log('✅ [useTasks] State atualizado com tarefas');
    } catch (err: any) {
      console.error('❌ [useTasks] Erro geral no fetchTasks:', {
        message: err.message,
        stack: err.stack,
        fullError: err
      });
      
      setError(err.message);
      toast({
        title: 'Erro ao carregar tarefas',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      console.log('🏁 [useTasks] fetchTasks finalizado');
    }
  };

  const createTask = async (taskData: CreateTaskData) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks_new')
        .insert([{
          ...taskData,
          created_by: user.data.user.id
        }])
        .select(`
          *
        `)
        .single();

      if (error) throw error;

      // Get client data from clientes table
      const [clientQuery] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome, email, telefone')
          .eq('id', (data as any).client_id)
          .single()
      ]);

      const taskWithProfile = {
        ...data,
        client: clientQuery.data ? {
          user_id: clientQuery.data.id,
          full_name: clientQuery.data.nome,
          email: clientQuery.data.email,
          username: clientQuery.data.nome
        } : null
      };

      // WhatsApp notifications removed - chat system being rebuilt

      toast({
        title: 'Tarefa criada com sucesso',
        description: `Tarefa "${(data as any).title}" foi criada.`
      });

      await fetchTasks();
      return taskWithProfile;
    } catch (err: any) {
      toast({
        title: 'Erro ao criar tarefa',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const updateTask = async (taskId: string, updateData: UpdateTaskData) => {
    try {
      const { data, error } = await supabase
        .from('tasks_new')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          *
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Tarefa atualizada',
        description: `Tarefa "${(data as any).title}" foi atualizada.`
      });

      await fetchTasks();
      return data;
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks_new')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi excluída com sucesso.'
      });

      await fetchTasks();
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir tarefa',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  useEffect(() => {
    console.log('🔄 [useTasks] useEffect executado. Filtros:', JSON.stringify(filters));
    fetchTasks();
  }, [JSON.stringify(filters)]);

  // Realtime subscription
  useEffect(() => {
    console.log('📡 [useTasks] Configurando realtime subscription...');
    
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks_new'
        },
        (payload) => {
          console.log('🔄 [useTasks] Mudança realtime detectada:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    console.log('✅ [useTasks] Realtime subscription criada');

    return () => {
      console.log('🧹 [useTasks] Limpando realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refetch: () => {
      console.log('🔄 [useTasks] Refetch manual chamado');
      return fetchTasks();
    }
  };
}