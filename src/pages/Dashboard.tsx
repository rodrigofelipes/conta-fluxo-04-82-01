import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Clock, 
  UploadCloud, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  TrendingUp,
  Building,
  Bell,
  Plus,
  ExternalLink,
  Activity,
  PieChart,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";


interface DashboardStats {
  totalClients: number;
  totalDocuments: number;
  pendingDocuments: number;
  completedTasks: number;
  pendingTasks: number;
  clientsBySetor: Record<string, number>;
  documentsThisMonth: number;
  tasksThisWeek: number;
  recentActivity: Array<{
    id: string;
    type: 'document' | 'task' | 'client';
    title: string;
    time: string;
    status?: string;
  }>;
}

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  action: () => void;
  variant: "default" | "secondary" | "outline";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    completedTasks: 0,
    pendingTasks: 0,
    clientsBySetor: {},
    documentsThisMonth: 0,
    tasksThisWeek: 0,
    recentActivity: []
  });

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);

      if (user.role === 'admin') {
        // Buscar dados de admin em paralelo
        const [
          clientsRes,
          documentsRes,
          tasksRes,
          recentDocsRes,
          recentTasksRes
        ] = await Promise.all([
          supabase.from('clientes').select('id, setor, created_at'),
          supabase.from('documents').select('id, status, created_at'),
          supabase.from('tasks').select('id, status, created_at, title'),
          supabase.from('documents').select('id, name, created_at, status').order('created_at', { ascending: false }).limit(5),
          supabase.from('tasks').select('id, title, created_at, status').order('created_at', { ascending: false }).limit(5)
        ]);

        // Calcular estatísticas de admin
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const clientsBySetor = (clientsRes.data || []).reduce((acc, client) => {
          acc[client.setor] = (acc[client.setor] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const documentsThisMonth = (documentsRes.data || []).filter(
          doc => new Date(doc.created_at) >= thisMonth
        ).length;

        const tasksThisWeek = (tasksRes.data || []).filter(
          task => new Date(task.created_at) >= thisWeek
        ).length;

        // Atividade recente para admin
        const recentActivity = [
          ...(recentDocsRes.data || []).map(doc => ({
            id: doc.id,
            type: 'document' as const,
            title: `Documento: ${doc.name}`,
            time: new Date(doc.created_at).toLocaleDateString(),
            status: doc.status
          })),
          ...(recentTasksRes.data || []).map(task => ({
            id: task.id,
            type: 'task' as const,
            title: `Tarefa: ${task.title}`,
            time: new Date(task.created_at).toLocaleDateString(),
            status: task.status
          }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

        setStats({
          totalClients: clientsRes.data?.length || 0,
          totalDocuments: documentsRes.data?.length || 0,
          pendingDocuments: (documentsRes.data || []).filter(doc => doc.status === 'PENDENTE').length,
          completedTasks: (tasksRes.data || []).filter(task => task.status === 'DONE').length,
          pendingTasks: (tasksRes.data || []).filter(task => task.status === 'TODO').length,
          clientsBySetor,
          documentsThisMonth,
          tasksThisWeek,
          recentActivity
        });
      } else {
        // Para clientes, dados simplificados
        setStats({
          totalClients: 0,
          totalDocuments: 0,
          pendingDocuments: 0,
          completedTasks: 0,
          pendingTasks: 0,
          clientsBySetor: {},
          documentsThisMonth: 0,
          tasksThisWeek: 0,
          recentActivity: []
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Dashboard | Visão geral do sistema";
    const desc = "Dashboard completo com estatísticas, atividades recentes e ações rápidas para gestão contábil.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const quickActions: QuickAction[] = user?.role === 'admin' ? [
    {
      title: "Novo Cliente",
      description: "Cadastrar novo cliente no sistema",
      icon: Users,
      action: () => navigate('/clients'),
      variant: "default"
    },
    {
      title: "Upload Documento",
      description: "Enviar novo documento",
      icon: UploadCloud,
      action: () => navigate('/documents'),
      variant: "secondary"
    },
    {
      title: "Nova Tarefa",
      description: "Criar tarefa para cliente",
      icon: Plus,
      action: () => navigate('/tasks'),
      variant: "outline"
    },
    {
      title: "Gerenciar Usuários",
      description: "Administrar usuários do sistema",
      icon: Users,
      action: () => navigate('/user-management'),
      variant: "outline"
    }
  ] : [
    {
      title: "Meus Documentos",
      description: "Ver documentos enviados",
      icon: FileText,
      action: () => navigate('/documents'),
      variant: "secondary"
    },
    {
      title: "Minhas Tarefas",
      description: "Acompanhar tarefas pendentes",
      icon: CheckCircle2,
      action: () => navigate('/tasks'),
      variant: "outline"
    },
    {
      title: "Meu Perfil",
      description: "Editar informações pessoais",
      icon: Users,
      action: () => navigate('/settings'),
      variant: "outline"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'text-yellow-600';
      case 'APROVADO': return 'text-green-600';
      case 'REJEITADO': return 'text-red-600';
      case 'TODO': return 'text-blue-600';
      case 'DONE': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText;
      case 'task': return CheckCircle2;
      case 'client': return Users;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Carregando dados..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle={`Bem-vindo, ${user?.name || user?.username}! Aqui está o resumo do seu sistema.`}
      />

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'admin' ? (
          <>
            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Clientes</p>
                    <p className="text-2xl font-bold text-primary">{stats.totalClients}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.entries(stats.clientsBySetor).length} setores ativos
                    </p>
                  </div>
                  <Users className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos</p>
                    <p className="text-2xl font-bold text-primary">{stats.totalDocuments}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {stats.pendingDocuments} pendentes
                      </Badge>
                    </div>
                  </div>
                  <FileText className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tarefas</p>
                    <p className="text-2xl font-bold text-primary">
                      {stats.completedTasks + stats.pendingTasks}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Progress 
                        value={stats.completedTasks + stats.pendingTasks > 0 ? (stats.completedTasks / (stats.completedTasks + stats.pendingTasks)) * 100 : 0} 
                        className="h-2 w-16" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {stats.completedTasks}/{stats.completedTasks + stats.pendingTasks}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Este Mês</p>
                    <p className="text-2xl font-bold text-primary">{stats.documentsThisMonth}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Documentos enviados
                    </p>
                  </div>
                  <TrendingUp className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status do Atendimento</p>
                    <p className="text-2xl font-bold text-primary">Ativo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conta em dia
                    </p>
                  </div>
                  <CheckCircle2 className="size-8 text-green-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos</p>
                    <p className="text-2xl font-bold text-primary">--</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Em processamento
                    </p>
                  </div>
                  <FileText className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suporte</p>
                    <p className="text-2xl font-bold text-primary">24/7</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sempre disponível
                    </p>
                  </div>
                  <Building className="size-8 text-blue-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                    <p className="text-2xl font-bold text-primary">--</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sem pendências
                    </p>
                  </div>
                  <Calendar className="size-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Seção de métricas e ações rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações rápidas */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>
              Acesse rapidamente as funcionalidades mais usadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant}
                    size="sm"
                    onClick={action.action}
                    className="w-full justify-start gap-2 h-auto py-3"
                  >
                    <action.icon className="size-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                          {activity.status && (
                            <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        switch (activity.type) {
                          case 'document': navigate('/documents'); break;
                          case 'task': navigate('/tasks'); break;
                          case 'client': navigate('/clients'); break;
                        }
                      }}>
                        <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas por setor (apenas admin) */}
      {user?.role === 'admin' && Object.entries(stats.clientsBySetor).length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="size-5" />
              Distribuição por Setor
            </CardTitle>
            <CardDescription>
              Quantidade de clientes por setor de atividade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.clientsBySetor).map(([setor, count]) => (
                <div key={setor} className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{count}</p>
                  <p className="text-sm text-muted-foreground">{setor}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas importantes */}
      {stats.pendingDocuments > 0 && (
        <Card className="card-elevated border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Bell className="size-5" />
              Alertas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pendingDocuments > 0 && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-yellow-600" />
                  <span className="text-sm">
                    {stats.pendingDocuments} documento(s) pendente(s) de aprovação
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/documents')}>
                  <ExternalLink className="mr-1 size-3" />
                  Ver
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </main>
  );
}