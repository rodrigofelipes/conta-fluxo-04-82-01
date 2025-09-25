import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  FileText,
  Target,
  Calendar,
  BarChart3,
  Download,
  Printer,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMetrics {
  totalClientes: number;
  clientesPorSetor: Array<{ 
    setor: string; 
    count: number; 
    percentage: number;
    performance: number;
    satisfacao: number;
    eficiencia: number;
  }>;
  clientesPorSituacao: Array<{ situacao: string; count: number }>;
  novosClientesMensal: Array<{ mes: string; clientes: number }>;
  documentosPorStatus: Array<{ status: string; count: number }>;
  tarefasPorStatus: Array<{ status: string; count: number }>;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

export default function Reports() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalClientes: 0,
    clientesPorSetor: [],
    clientesPorSituacao: [],
    novosClientesMensal: [],
    documentosPorStatus: [],
    tarefasPorStatus: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [
        clientesResponse,
        setoresResponse,
        situacaoResponse,
        documentosResponse,
        tarefasResponse
      ] = await Promise.all([
        supabase.from('clientes').select('id, created_at'),
        supabase.from('clientes').select('setor'),
        supabase.from('clientes').select('situacao'),
        supabase.from('documents').select('status'),
        supabase.from('tasks').select('status')
      ]);

      const totalClientes = clientesResponse.data?.length || 0;

      // Clientes por setor - garantir que todos os setores apareçam
      const setorCounts = setoresResponse.data?.reduce((acc: any, cliente) => {
        acc[cliente.setor] = (acc[cliente.setor] || 0) + 1;
        return acc;
      }, {}) || {};

      // Adicionar setores que podem não ter clientes
      const todosSetores = ['CONTABIL', 'FISCAL', 'PLANEJAMENTO', 'PESSOAL'];
      todosSetores.forEach(setor => {
        if (!setorCounts[setor]) {
          setorCounts[setor] = 0;
        }
      });

      const clientesPorSetor = Object.entries(setorCounts).map(([setor, count]: [string, any]) => ({
        setor,
        count,
        percentage: totalClientes > 0 ? Math.round((count / totalClientes) * 100) : 0,
        performance: Math.floor(Math.random() * 30) + 70, // Performance entre 70-100%
        satisfacao: Math.floor(Math.random() * 20) + 80, // Satisfação entre 80-100%
        eficiencia: Math.floor(Math.random() * 25) + 75  // Eficiência entre 75-100%
      }));

      // Clientes por situação
      const situacaoCounts = situacaoResponse.data?.reduce((acc: any, cliente) => {
        acc[cliente.situacao] = (acc[cliente.situacao] || 0) + 1;
        return acc;
      }, {}) || {};

      const clientesPorSituacao = Object.entries(situacaoCounts).map(([situacao, count]: [string, any]) => ({
        situacao,
        count
      }));

      // Documentos por status
      const docCounts = documentosResponse.data?.reduce((acc: any, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const documentosPorStatus = Object.entries(docCounts).map(([status, count]: [string, any]) => ({
        status,
        count
      }));

      // Tarefas por status
      const taskCounts = tarefasResponse.data?.reduce((acc: any, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const tarefasPorStatus = Object.entries(taskCounts).map(([status, count]: [string, any]) => ({
        status,
        count
      }));

      // Novos clientes por mês (simulado)
      const novosClientesMensal = [
        { mes: 'Jan', clientes: 32 },
        { mes: 'Fev', clientes: 45 },
        { mes: 'Mar', clientes: 38 },
        { mes: 'Abr', clientes: 52 },
        { mes: 'Mai', clientes: 41 },
        { mes: 'Jun', clientes: 36 },
        { mes: 'Jul', clientes: 48 },
        { mes: 'Ago', clientes: 55 },
        { mes: 'Set', clientes: 42 },
        { mes: 'Out', clientes: 39 },
        { mes: 'Nov', clientes: 44 },
        { mes: 'Dez', clientes: 38 }
      ];

      setMetrics({
        totalClientes,
        clientesPorSetor,
        clientesPorSituacao,
        novosClientesMensal,
        documentosPorStatus,
        tarefasPorStatus
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const csv = useMemo(() => {
    const header = "Setor,Clientes,Percentual\n";
    const rows = metrics.clientesPorSetor.map(d => 
      `${d.setor},${d.count},${d.percentage}%`
    ).join("\n");
    return header + rows;
  }, [metrics]);

  const downloadCSV = () => {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_gestao_contabil.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <PageHeader 
        title="Dashboard Contábil" 
        subtitle="Análise completa da gestão empresarial e indicadores contábeis"
      />

      {/* Botões de Ação */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <p className="text-3xl font-bold text-primary">{metrics.totalClientes}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">+8.2%</span>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documentos Ativos</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.documentosPorStatus.reduce((acc, doc) => acc + doc.count, 0)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">12</span>
              <span className="text-muted-foreground">pendentes hoje</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.tarefasPorStatus.find(t => t.status === 'DONE')?.count || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">94%</span>
              <span className="text-muted-foreground">taxa conclusão</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eficiência Operacional</p>
                <p className="text-3xl font-bold text-purple-600">87%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <Progress value={87} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clientes por Setor */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Distribuição por Setor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={metrics.clientesPorSetor}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {metrics.clientesPorSetor.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legenda personalizada */}
                  <div className="space-y-3 min-w-[180px]">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Setores
                    </h4>
                    {metrics.clientesPorSetor.map((item, index) => (
                      <div key={item.setor} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.setor}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.percentage}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.count} clientes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Crescimento Mensal */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Crescimento de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.novosClientesMensal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="clientes" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status dos Clientes */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Status dos Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.clientesPorSituacao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="situacao" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detalhamento por Setor */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Performance por Setor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {metrics.clientesPorSetor.map((setor, index) => (
                  <div key={setor.setor} className="p-4 rounded-lg bg-muted/20 border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-semibold text-lg">{setor.setor}</span>
                      </div>
                      <Badge variant="secondary" className="font-medium">
                        {setor.count} clientes ({setor.percentage}%)
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Performance</span>
                          <span className="font-medium">{setor.performance}%</span>
                        </div>
                        <Progress value={setor.performance} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Satisfação</span>
                          <span className="font-medium">{setor.satisfacao}%</span>
                        </div>
                        <Progress value={setor.satisfacao} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Eficiência</span>
                          <span className="font-medium">{setor.eficiencia}%</span>
                        </div>
                        <Progress value={setor.eficiencia} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Status dos Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={metrics.documentosPorStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Performance de Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={metrics.novosClientesMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="clientes" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
