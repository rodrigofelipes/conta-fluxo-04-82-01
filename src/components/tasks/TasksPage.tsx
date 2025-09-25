import { useState } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { CreateTaskDialog } from './CreateTaskDialog';
import { useTasks } from '@/hooks/useTasks';
import { TaskFilters as TaskFiltersType } from '@/types/tasks';

export function TasksPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { tasks, loading, createTask } = useTasks({
    ...filters,
    search: searchQuery
  });

  const handleCreateTask = async (taskData: any) => {
    await createTask(taskData);
    setShowCreateDialog(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Tarefas</h1>
          <p className="text-muted-foreground">
            Crie e acompanhe tarefas para seus clientes
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Pesquisar por título ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          {showFilters && (
            <TaskFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}
        </CardContent>
      </Card>

      <TaskList
        tasks={tasks}
        loading={loading}
      />

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}