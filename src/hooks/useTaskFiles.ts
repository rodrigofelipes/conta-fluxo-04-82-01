import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskFile } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

export function useTaskFiles(taskId: string) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_files')
        .select(`
          *,
          uploader:profiles!task_files_uploaded_by_fkey(user_id, full_name, username)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar arquivos:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${taskId}/${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save file metadata
      const { data: fileData, error: fileError } = await supabase
        .from('task_files')
        .insert([{
          task_id: taskId,
          storage_path: uploadData.path,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.data.user.id
        }])
        .select(`
          *,
          uploader:profiles!task_files_uploaded_by_fkey(user_id, full_name, username)
        `)
        .single();

      if (fileError) throw fileError;

      toast({
        title: 'Arquivo enviado',
        description: `Arquivo "${file.name}" foi enviado com sucesso.`
      });

      await fetchFiles();
      return fileData;
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar arquivo',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file: TaskFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado',
        description: `Download de "${file.file_name}" iniciado.`
      });
    } catch (err: any) {
      toast({
        title: 'Erro no download',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-files')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo foi excluído com sucesso.'
      });

      await fetchFiles();
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir arquivo',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchFiles();
    }
  }, [taskId]);

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-files-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_files',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          fetchFiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return {
    files,
    loading,
    uploading,
    error,
    uploadFile,
    downloadFile,
    deleteFile,
    refetch: fetchFiles
  };
}