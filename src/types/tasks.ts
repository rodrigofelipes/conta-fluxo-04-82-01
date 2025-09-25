export type TaskStatus = 'aberta' | 'em_andamento' | 'concluida' | 'arquivada';
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  client_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  client?: {
    user_id: string;
    full_name?: string;
    email?: string;
    username?: string;
    whatsapp_e164?: string;
  };
  creator?: {
    user_id: string;
    full_name?: string;
    email?: string;
    username?: string;
  };
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: {
    user_id: string;
    full_name?: string;
    username?: string;
  };
}

export interface TaskFile {
  id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  content_type?: string;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    user_id: string;
    full_name?: string;
    username?: string;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
  client_id: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  client_id?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  arquivada: 'Arquivada'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  aberta: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida: 'bg-green-100 text-green-800',
  arquivada: 'bg-gray-100 text-gray-800'
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa: 'bg-gray-100 text-gray-800',
  media: 'bg-blue-100 text-blue-800',
  alta: 'bg-orange-100 text-orange-800',
  urgente: 'bg-red-100 text-red-800'
};