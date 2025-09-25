import { useState, useEffect, useMemo, createElement } from "react";
import { useAuth } from "@/state/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Trash2, 
  Upload, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Users,
  FileText,
  Eye,
  EyeOff,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
}

interface Task {
  id: string;
  title: string;
  priority: "BAIXA" | "MEDIA" | "ALTA";
  status: "TODO" | "DOING" | "LATE" | "DONE";
  client: string;
  clientId?: string;
  file?: string;
  viewedAt?: string | null;
  createdAt?: string;
  setorResponsavel?: string;
  adminResponsavel?: string;
}


const priorityColors = {
  ALTA: "destructive",
  MEDIA: "priority-medium", 
  BAIXA: "priority-low"
} as const;

const statusIcons = {
  TODO: Circle,
  DOING: Clock,
  LATE: AlertCircle,
  DONE: CheckCircle2
} as const;

const statusColors = {
  TODO: "text-muted-foreground",
  DOING: "text-yellow-600",
  LATE: "text-red-600",
  DONE: "text-green-600"
} as const;

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'client' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const move = async (id: string, status: Task["status"]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id);
      
      if (error) {
        toast.error('Erro ao atualizar status da tarefa');
        return;
      }
      
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast.success('Status da tarefa atualizado!');
    } catch (error) {
      toast.error('Erro inesperado ao atualizar tarefa');
    }
  };

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<{ title: string; clientId: string; priority: Task["priority"]; file: File | null; dueDate: Date | undefined }>({
    title: "",
    clientId: "",
    priority: "MEDIA",
    file: null,
    dueDate: undefined,
  });
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [openClientFilter, setOpenClientFilter] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
      const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
      const matchesClient = selectedClient === "all" || task.clientId === selectedClient;
      
      return matchesSearch && matchesPriority && matchesStatus && matchesClient;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { ALTA: 3, MEDIA: 2, BAIXA: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'client':
          aValue = a.client.toLowerCase();
          bValue = b.client.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, selectedPriority, selectedStatus, selectedClient, sortBy, sortOrder]);

  // Métricas para dashboard
  const metrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const doing = tasks.filter(t => t.status === 'DOING').length;
    const late = tasks.filter(t => t.status === 'LATE').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const highPriority = tasks.filter(t => t.priority === 'ALTA').length;
    const withFiles = tasks.filter(t => t.file).length;
    const viewed = tasks.filter(t => t.viewedAt).length;
    
    return { total, todo, doing, late, done, highPriority, withFiles, viewed };
  }, [tasks]);

  // Buscar clientes do banco
  const fetchClientes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cnpj, cidade, estado')
        .order('nome');
      
      if (error) {
        console.error('Erro ao buscar clientes:', error);
        toast.error('Erro ao carregar clientes');
        return;
      }
      
      setClientes(data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar clientes');
    }
  };

  // Buscar tarefas do banco
  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar tarefas:', error);
        toast.error('Erro ao carregar tarefas');
        return;
      }
      
      // Buscar nomes dos clientes separadamente
      const clientIds = [...new Set(tasksData?.map(task => task.client_id) || [])];
      const { data: clientsData } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clientIds);
      
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.nome]) || []);
      
      const tasksFormatted: Task[] = (tasksData || []).map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority as Task["priority"],
        status: task.status as Task["status"],
        client: clientsMap.get(task.client_id) || "Cliente desconhecido",
        clientId: task.client_id,
        file: task.file_path ? task.file_path.split('/').pop() : undefined,
        viewedAt: task.viewed_at,
        createdAt: task.created_at,
        setorResponsavel: task.setor_responsavel,
        adminResponsavel: task.admin_responsavel,
      }));
      
      setTasks(tasksFormatted);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar tarefas');
    }
  };

  const addTask = async () => {
    if (!form.title.trim() || !form.clientId.trim() || !user) return;
    
    const selectedClient = clientes.find(c => c.id === form.clientId);
    let filePath: string | undefined;
    
    // Upload file if provided
    if (form.file) {
      try {
        const fileExt = form.file.name.split('.').pop();
        const fileName = `${selectedClient?.nome || 'cliente'}_${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('task-files')
          .upload(`${selectedClient?.nome || 'geral'}/${fileName}`, form.file);
        
        if (error) {
          toast.error('Erro ao fazer upload do arquivo');
          return;
        }
        filePath = data.path;
      } catch (error) {
        toast.error('Erro inesperado ao fazer upload');
        return;
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: form.title.trim(),
          client_id: form.clientId,
          priority: form.priority,
          file_path: filePath,
          created_by: user.id,
          setor_responsavel: user.setor || 'CONTABIL',
          admin_responsavel: user.id
        })
        .select()
        .single();
      
      if (error) {
        toast.error('Erro ao criar tarefa');
        return;
      }
      
      const newTask: Task = {
        id: data.id,
        title: data.title,
        client: selectedClient?.nome || "Cliente desconhecido",
        clientId: data.client_id,
        priority: data.priority as Task["priority"],
        status: data.status as Task["status"],
        file: form.file?.name,
        viewedAt: data.viewed_at,
        createdAt: data.created_at,
        setorResponsavel: data.setor_responsavel,
        adminResponsavel: data.admin_responsavel,
      };
      
      setTasks((prev) => [newTask, ...prev]);
      setForm({ title: "", clientId: "", priority: "MEDIA", file: null, dueDate: undefined });
      setOpenCreate(false);
      toast.success(`Tarefa criada com sucesso! Setor: ${user.setor || 'CONTABIL'}`);
    } catch (error) {
      toast.error('Erro inesperado ao criar tarefa');
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) {
        toast.error('Erro ao excluir tarefa');
        return;
      }
      
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Tarefa excluída com sucesso!');
    } catch (error) {
      toast.error('Erro inesperado ao excluir tarefa');
    }
  };
  const cols: Task["status"][] = ["TODO", "DOING", "LATE", "DONE"];

  // SEO e carregamento de clientes
  useEffect(() => {
    document.title = "Gestão de Tarefas | Admin";
    const metaDesc = "Administração: criar, gerenciar e acompanhar tarefas dos clientes.";
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", metaDesc);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.href);

    // Carregar clientes e tarefas
    fetchClientes();
    fetchTasks();
  }, [user]);

  const allowedTargets = (t: Task): Task["status"][] => {
    return cols.filter((c) => c !== t.status);
  };

  const renderMoveButton = (t: Task, target: Task["status"]) => {
    const labels = { TODO: "Pendente", DOING: "Em Andamento", LATE: "Atrasado", DONE: "Concluída" };
    const label = labels[target];
    
    // Confirmar apenas para CONCLUÍDO
    if (target === "DONE") {
      return (
        <AlertDialog key={target}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs">
              Mover para {label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar mudança de status</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja realmente mover a tarefa "{t.title}" para "{label}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => move(t.id, target)}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    return (
      <Button key={target} size="sm" variant="outline" className="text-xs" onClick={() => move(t.id, target)}>
        Mover para {label}
      </Button>
    );
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const StatusIcon = statusIcons[task.status];
    
    return (
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColors[task.status]}`} />
              <h3 className="font-semibold text-sm leading-tight">{task.title}</h3>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{task.title}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove(task.id)}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <Badge 
                variant={priorityColors[task.priority]}
                className="text-xs"
              >
                {task.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {task.createdAt && new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="truncate">{task.client}</span>
            </div>

            {task.setorResponsavel && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  Setor: {task.setorResponsavel}
                </Badge>
              </div>
            )}

            {task.file && (
              <div className="flex items-center gap-2 text-xs">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="truncate text-muted-foreground">{task.file}</span>
                {task.viewedAt ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Eye className="h-3 w-3" />
                    <span className="text-xs">Visto</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <EyeOff className="h-3 w-3" />
                    <span className="text-xs">Pendente</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-1 flex-wrap">
            {allowedTargets(task).map((status) => renderMoveButton(task, status))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Gestão de Tarefas" 
        subtitle="Organize e acompanhe o progresso das atividades"
      />

      {/* Botões de Ação */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          Grid
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4 mr-2" />
          Lista
        </Button>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Título da Tarefa</Label>
                  <Input
                    id="task-title"
                    placeholder="Digite o título da tarefa..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Cliente</Label>
                  <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientSelect}
                        className="w-full justify-between"
                      >
                        {form.clientId
                          ? clientes.find(cliente => cliente.id === form.clientId)?.nome
                          : "Selecione um cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandList>
                            {clientes.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.nome}
                                onSelect={() => {
                                  setForm({ ...form, clientId: cliente.id });
                                  setOpenClientSelect(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    form.clientId === cliente.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div>
                                  <div className="font-medium">{cliente.nome}</div>
                                  {cliente.cnpj && (
                                    <div className="text-xs text-muted-foreground">
                                      CNPJ: {cliente.cnpj}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="task-priority">Prioridade</Label>
                  <Select value={form.priority} onValueChange={(value: Task["priority"]) => setForm({ ...form, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIXA">Baixa</SelectItem>
                      <SelectItem value="MEDIA">Média</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data de Vencimento (Opcional)</Label>
                  <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.dueDate ? format(form.dueDate, "dd/MM/yyyy") : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.dueDate}
                        onSelect={(date) => {
                          setForm({ ...form, dueDate: date });
                          setOpenDatePicker(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="task-file">Arquivo (Opcional)</Label>
                  <Input
                    id="task-file"
                    type="file"
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button onClick={addTask} disabled={!form.title.trim() || !form.clientId.trim()}>
                  Criar Tarefa
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{metrics.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{metrics.todo}</div>
            <div className="text-xs text-muted-foreground">Pendente</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{metrics.doing}</div>
            <div className="text-xs text-muted-foreground">Em Andamento</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.late}</div>
            <div className="text-xs text-muted-foreground">Atrasado</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.done}</div>
            <div className="text-xs text-muted-foreground">Concluídas</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.highPriority}</div>
            <div className="text-xs text-muted-foreground">Alta Prioridade</div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.viewed}</div>
            <div className="text-xs text-muted-foreground">Visualizadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e busca */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtros */}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="TODO">Pendente</SelectItem>
                <SelectItem value="DOING">Em Andamento</SelectItem>
                <SelectItem value="LATE">Atrasado</SelectItem>
                <SelectItem value="DONE">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={openClientFilter} onOpenChange={setOpenClientFilter}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openClientFilter}
                  className="justify-between"
                >
                  {selectedClient === "all"
                    ? "Todos os clientes"
                    : clientes.find((cliente) => cliente.id === selectedClient)?.nome || "Cliente"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" style={{ zIndex: 50, backgroundColor: 'hsl(var(--popover))' }}>
                <Command>
                  <CommandInput placeholder="Pesquisar cliente..." />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedClient("all");
                          setOpenClientFilter(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedClient === "all" ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        Todos os clientes
                      </CommandItem>
                      {clientes.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={cliente.nome}
                          onSelect={() => {
                            setSelectedClient(cliente.id);
                            setOpenClientFilter(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedClient === cliente.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {cliente.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Ordenação */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Data de criação</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="priority">Prioridade</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tarefas */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Tarefas</TabsTrigger>
          <TabsTrigger value="filtered">Lista Filtrada ({filteredAndSortedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {cols.map((col) => {
                const statusTasks = tasks.filter((t) => t.status === col);
                const statusLabels = { TODO: "Pendente", DOING: "Em Andamento", LATE: "Atrasado", DONE: "Concluída" };
                
                return (
                  <Card key={col} className="card-elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {createElement(statusIcons[col], { 
                          className: `h-5 w-5 ${statusColors[col]}` 
                        })}
                        {statusLabels[col]}
                        <Badge variant="secondary" className="ml-auto">
                          {statusTasks.length}
                        </Badge>
                      </CardTitle>
                      <Progress 
                        value={(statusTasks.length / Math.max(tasks.length, 1)) * 100} 
                        className="h-2"
                      />
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                      {statusTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                      {statusTasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma tarefa
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {cols.map((col) => {
                const statusTasks = tasks.filter((t) => t.status === col);
                const statusLabels = { TODO: "Pendente", DOING: "Em Andamento", LATE: "Atrasado", DONE: "Concluída" };
                
                return (
                  <div key={col} className="space-y-4">
                    {/* Header da seção com design melhorado */}
                    <div className="relative">
                      <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-muted/50 to-muted/20 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
                        <div className={`p-2 rounded-lg ${
                          col === 'TODO' ? 'bg-muted-foreground/10' :
                          col === 'DOING' ? 'bg-yellow-500/10' :
                          col === 'LATE' ? 'bg-red-500/10' :
                          'bg-green-500/10'
                        }`}>
                          {createElement(statusIcons[col], { 
                            className: `h-6 w-6 ${statusColors[col]}` 
                          })}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-foreground">{statusLabels[col]}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {statusTasks.length} {statusTasks.length === 1 ? 'tarefa' : 'tarefas'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="secondary" 
                            className="px-3 py-1 text-sm font-semibold"
                          >
                            {statusTasks.length}
                          </Badge>
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                col === 'TODO' ? 'bg-muted-foreground' :
                                col === 'DOING' ? 'bg-yellow-500' :
                                col === 'LATE' ? 'bg-red-500' :
                                'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min((statusTasks.length / Math.max(tasks.length, 1)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* Linha decorativa */}
                      <div className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full ${
                        col === 'TODO' ? 'bg-muted-foreground/20' :
                        col === 'DOING' ? 'bg-yellow-500/20' :
                        col === 'LATE' ? 'bg-red-500/20' :
                        'bg-green-500/20'
                      }`} />
                    </div>
                    
                    {/* Lista de tarefas com espaçamento melhorado */}
                    <div className="space-y-3 pl-4">
                      {statusTasks.map((task) => (
                        <div key={task.id} className="relative">
                          {/* Linha conectora sutil */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${
                            col === 'TODO' ? 'bg-muted-foreground/10' :
                            col === 'DOING' ? 'bg-yellow-500/10' :
                            col === 'LATE' ? 'bg-red-500/10' :
                            'bg-green-500/10'
                          }`} />
                          <div className="ml-6">
                            <TaskCard task={task} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Mensagem quando não há tarefas */}
              {tasks.length === 0 && (
                <Card className="card-elevated">
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                    <p className="text-muted-foreground">
                      Crie uma nova tarefa para começar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="filtered" className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
          
          {filteredAndSortedTasks.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou criar uma nova tarefa.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
