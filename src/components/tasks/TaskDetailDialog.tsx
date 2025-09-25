import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Clock, MessageCircle, Paperclip, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { TaskComments } from './TaskComments';
import { TaskFiles } from './TaskFiles';
import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS } from '@/types/tasks';

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('comments');

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'Não definido';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Tarefa: {task.title}</span>
            <Badge className={TASK_STATUS_COLORS[task.status]}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Descrição
                </h3>
                <p className="mt-1 text-sm">
                  {task.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Cliente:</strong> {task.client?.full_name || task.client?.username || 'Cliente'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Vencimento:</strong> {formatDueDate(task.due_date)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Prioridade
                </h3>
                <Badge className={`mt-1 ${TASK_PRIORITY_COLORS[task.priority]}`}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Criado por
                </h3>
                <p className="mt-1 text-sm">
                  {task.creator?.full_name || task.creator?.username || 'Administrador'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Criado em:</strong> {formatDate(task.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Atualizado em:</strong> {formatDate(task.updated_at)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tabs para comentários, arquivos e histórico */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comments" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Comentários
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4">
              <TaskComments taskId={task.id} />
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <TaskFiles taskId={task.id} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="text-center text-muted-foreground py-8">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Histórico de alterações em desenvolvimento</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}