import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTaskComments } from '@/hooks/useTaskComments';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { comments, loading, addComment } = useTaskComments(taskId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando comentários...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de comentários */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum comentário ainda.</p>
            <p className="text-sm">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(comment.author?.full_name || comment.author?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {comment.author?.full_name || comment.author?.username || 'Usuário'}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulário para novo comentário */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Escreva seu comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newComment.trim() || submitting}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>
    </div>
  );
}