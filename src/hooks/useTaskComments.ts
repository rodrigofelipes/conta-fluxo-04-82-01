import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskComment } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

export function useTaskComments(taskId: string) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:profiles!task_comments_author_id_fkey(user_id, full_name, username)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar comentários:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (body: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          author_id: user.data.user.id,
          body: body.trim()
        }])
        .select(`
          *,
          author:profiles!task_comments_author_id_fkey(user_id, full_name, username)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado.'
      });

      return data;
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar comentário',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return {
    comments,
    loading,
    error,
    addComment,
    refetch: fetchComments
  };
}