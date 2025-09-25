import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Search, Users, Building, UserCheck, Key, RefreshCw, Edit2, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { AdminSelect } from "@/components/AdminSelect";
import { useAuth, Role, type Setor } from "@/state/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

// Interfaces unificadas
interface UnifiedUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  telefone?: string;
  role: Role;
  created_at: string;
  type: 'system_user';
}

interface UnifiedClient {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cnpj?: string;
  cidade?: string;
  setor: Setor;
  admin_responsavel?: string;
  created_at: string;
  type: 'client';
}

type UnifiedEntity = UnifiedUser | UnifiedClient;

interface EntityStats {
  totalUsers: number;
  totalAdmins: number;
  totalClients: number;
  clientsBySetor: Record<string, number>;
}

export default function UnifiedUserManagement() {
  const { user, login, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [entities, setEntities] = useState<UnifiedEntity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<UnifiedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "users" | "clients">("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [stats, setStats] = useState<EntityStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalClients: 0,
    clientsBySetor: {}
  });
  
  // Estados de dialogs
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  
  // Formulários
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    telefone: "",
    role: "admin" as Role
  });
  
  const [clientForm, setClientForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cnpj: "",
    cidade: "",
    estado: "",
    inscricao_estadual: "",
    regime_tributario: "",
    data_abertura: "",
    setor: "CONTABIL" as Setor,
    admin_responsavel: ""
  });
  
  const [resetForm, setResetForm] = useState({
    username: "",
    newPassword: ""
  });

  // Fetch unificado de dados
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Buscar usuários do sistema
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar clientes
      const { data: clients, error: clientsError } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Buscar roles dos usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Criar mapa de roles
      const roleMap = new Map();
      userRoles?.forEach(ur => {
        roleMap.set(ur.user_id, ur.role);
      });

      // Processar dados dos usuários
      const systemUsers: UnifiedUser[] = profiles?.map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username || 'Sem username',
        full_name: profile.full_name || profile.username || 'Nome não informado',
        email: profile.email || 'Email não informado',
        telefone: profile.telefone,
        role: roleMap.get(profile.user_id) || 'user',
        created_at: profile.created_at,
        type: 'system_user' as const
      })) || [];

      // Processar dados dos clientes
      const clientEntities: UnifiedClient[] = (clients as any)?.map((client: any) => ({
        id: client.id,
        nome: client.nome,
        email: client.email,
        telefone: client.telefone,
        cnpj: client.cnpj,
        cidade: client.cidade,
        setor: client.setor,
        admin_responsavel: client.admin_responsavel,
        created_at: client.created_at,
        type: 'client' as const
      })) || [];

      // Combinar dados
      const allEntities = [...systemUsers, ...clientEntities];
      setEntities(allEntities);

      // Calcular estatísticas
      const newStats: EntityStats = {
        totalUsers: systemUsers.length,
        totalAdmins: systemUsers.filter(u => u.role === 'admin').length,
        totalClients: clientEntities.length,
        clientsBySetor: clientEntities.reduce((acc, client) => {
          acc[client.setor] = (acc[client.setor] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      setStats(newStats);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do sistema",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é master admin
  const checkMasterAdmin = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('master_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      setIsMasterAdmin(!!data);
    } catch (error) {
      console.error('Erro ao verificar master admin:', error);
      setIsMasterAdmin(false);
    }
  };

  // Filtros e busca
  useEffect(() => {
    let filtered = entities;

    // Filtro por tipo
    if (filterType === 'users') {
      filtered = filtered.filter(entity => entity.type === 'system_user');
    } else if (filterType === 'clients') {
      filtered = filtered.filter(entity => entity.type === 'client');
    }

    // Filtro por setor (apenas clientes)
    if (filterSetor !== 'all') {
      filtered = filtered.filter(entity => 
        entity.type === 'client' ? entity.setor === filterSetor : true
      );
    }

    // Busca por termo
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entity => {
        if (entity.type === 'system_user') {
          return (
            entity.username.toLowerCase().includes(term) ||
            entity.full_name.toLowerCase().includes(term) ||
            entity.email.toLowerCase().includes(term) ||
            entity.telefone?.toLowerCase().includes(term)
          );
        } else {
          return (
            entity.nome.toLowerCase().includes(term) ||
            entity.email?.toLowerCase().includes(term) ||
            entity.telefone?.toLowerCase().includes(term) ||
            entity.cnpj?.toLowerCase().includes(term) ||
            entity.cidade?.toLowerCase().includes(term)
          );
        }
      });
    }

    setFilteredEntities(filtered);
  }, [entities, searchTerm, filterType, filterSetor]);

  // Carregar dados na montagem
  useEffect(() => {
    fetchAllData();
    checkMasterAdmin();
  }, [user?.id]);

  // Criar usuário
  const createUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.username) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verificar se pode criar admin
      if (userForm.role === 'admin' && !isMasterAdmin) {
        toast({
          title: "Erro",
          description: "Apenas Master Admin pode criar outros administradores",
          variant: "destructive"
        });
        return;
      }

      // Use edge function to create user without affecting admin session
      const { data, error } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: userForm.email,
          password: userForm.password,
          username: userForm.username,
          fullName: userForm.fullName || userForm.username,
          telefone: userForm.telefone,
          role: userForm.role
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${userForm.username} criado com sucesso! Fazendo login automaticamente...`
      });

      // Login automático com o usuário criado
      try {
        // Primeiro fazer logout do admin atual
        toast({
          title: "Sucesso",
          description: `Usuário ${userForm.username} criado com sucesso! Fazendo logout e login automaticamente...`
        });
        
        // Limpar sessão atual
        await supabase.auth.signOut();
        
        // Aguardar um pouco para garantir que o logout foi processado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fazer login com as credenciais do usuário criado
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userForm.email,
          password: userForm.password,
        });
        
        if (loginError) {
          throw loginError;
        }
        
        // Redirecionar para dashboard
        window.location.href = '/dashboard';
        
      } catch (loginError) {
        console.error('Erro no login automático:', loginError);
        toast({
          title: "Aviso", 
          description: "Usuário criado, mas falha no login automático. Faça login manualmente.",
          variant: "destructive"
        });
        // Redirecionar para login se houve erro
        window.location.href = '/login';
      }

      setUserForm({ email: "", password: "", username: "", fullName: "", telefone: "", role: "admin" });
      setCreateUserOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive"
      });
    }
  };

  // Criar cliente com usuário
  const createClientWithUser = async () => {
    if (!clientForm.nome || !clientForm.cnpj || !clientForm.regime_tributario) {
      toast({
        title: "Erro",
        description: "Nome, CNPJ e Regime Tributário são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Primeiro criar o usuário
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: clientForm.email || `${clientForm.nome.toLowerCase().replace(/\s+/g, '')}@cliente.com`,
          password: 'temp123', // Senha temporária
          username: clientForm.nome.toLowerCase().replace(/\s+/g, ''),
          fullName: clientForm.nome,
          telefone: clientForm.telefone,
          role: 'user'
        }
      });

      if (authError || (authData?.error && !authData?.userExists)) {
        console.error('Erro ao criar usuário:', authError || authData?.error);
        toast({
          title: "Erro",
          description: "Erro ao criar usuário de acesso",
          variant: "destructive"
        });
        return;
      }

      // Aguardar sincronização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Criar cliente usando nova função
      const clientData = {
        nome: clientForm.nome,
        email: clientForm.email || null,
        telefone: clientForm.telefone || null,
        cnpj: clientForm.cnpj,
        regime_tributario: clientForm.regime_tributario,
        cidade: clientForm.cidade || null,
        estado: clientForm.estado || null,
        setor: clientForm.setor,
        admin_responsavel: clientForm.admin_responsavel || user?.id,
        data_abertura: clientForm.data_abertura || null,
        inscricao_estadual: clientForm.inscricao_estadual || null,
        razao_social: clientForm.nome,
        endereco: null,
        cep: null,
        situacao: 'ATIVO'
      };

      const { data, error } = await supabase.rpc('create_client_after_user', {
        client_data: clientData,
        user_id_param: authData?.user?.id || authData?.user?.user?.id
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Cliente ${clientForm.nome} criado com sucesso!`
      });

      setClientForm({ 
        nome: "", 
        email: "", 
        telefone: "", 
        cnpj: "", 
        cidade: "", 
        estado: "", 
        inscricao_estadual: "", 
        regime_tributario: "", 
        data_abertura: "",
        setor: "CONTABIL",
        admin_responsavel: ""
      });
      setCreateClientOpen(false);
      fetchAllData();
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cliente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar role de usuário
  const updateUserRole = async (userId: string, newRole: Role) => {
    try {
      console.log('Updating user role:', { userId, newRole });

      if (newRole === 'admin') {
        if (!isMasterAdmin) {
          toast({
            title: "Permissão negada",
            description: "Apenas Master Admin pode promover usuários a Administrador",
            variant: "destructive"
          });
          return;
        }
      }

      // Primeiro, limpar todos os roles existentes para este usuário
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        throw deleteError;
      }

      // Aguardar um momento para garantir que o delete foi processado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Inserir o novo role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: newRole
        });

      if (insertError) {
        console.error('Error inserting new role:', insertError);
        throw insertError;
      }

      toast({
        title: "Sucesso",
        description: `Role do usuário atualizado para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}`
      });

      fetchAllData();

      if (userId === user?.id) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar role",
        variant: "destructive"
      });
    }
  };


  // Resetar senha
  const resetPassword = async () => {
    if (!resetForm.username || !resetForm.newPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`https://xagbhvhqtgybmzfkcxoa.supabase.co/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username: resetForm.username,
          newPassword: resetForm.newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao resetar senha');
      }

      toast({
        title: "Sucesso",
        description: `Senha do usuário ${resetForm.username} foi alterada`
      });
      
      setResetForm({ username: "", newPassword: "" });
      setResetPasswordOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar senha",
        variant: "destructive"
      });
    }
  };

  // Componente para renderizar entidade
  const renderEntity = (entity: UnifiedEntity) => {
    const isUser = entity.type === 'system_user';
    const isClient = entity.type === 'client';

    return (
      <div key={entity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isUser ? (
                <Users className="h-5 w-5 text-blue-500" />
              ) : (
                <Building className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">
                  {isUser ? entity.full_name : entity.nome}
                </p>
                {isUser && (
                  <Badge variant={entity.role === 'admin' ? 'destructive' : 'secondary'}>
                    {entity.role === 'admin' ? 'Admin' : 'Usuário'}
                  </Badge>
                )}
                {isClient && (
                  <Badge variant="outline" className="text-xs">
                    {entity.setor}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                {isUser && (
                  <>
                    <p>@{entity.username} • {entity.email}</p>
                    {entity.telefone && <p>📱 {entity.telefone}</p>}
                  </>
                )}
                {isClient && (
                  <>
                    <p>🏢 {entity.cnpj} • {entity.cidade}</p>
                    {entity.email && <p>📧 {entity.email}</p>}
                    {entity.telefone && <p>📱 {entity.telefone}</p>}
                  </>
                )}
                <p className="text-xs">
                  Criado em {new Date(entity.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isUser && entity.user_id !== user?.id && isMasterAdmin && (
            <Select
              value={entity.role}
              onValueChange={(newRole: Role) => updateUserRole(entity.user_id, newRole)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isUser && entity.user_id === user?.id && (
            <Badge variant="outline">Você</Badge>
          )}
          {isUser && !isMasterAdmin && entity.user_id !== user?.id && (
            <Badge variant="outline" className="text-xs">
              Apenas Master Admin
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Usuários e Clientes" 
        subtitle="Gerencie usuários do sistema e clientes de forma centralizada" 
      />

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Usuários Sistema</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Shield className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold">{stats.totalAdmins}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Building className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold">{stats.totalClients}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <UserCheck className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Entidades</p>
              <p className="text-2xl font-bold">{stats.totalUsers + stats.totalClients}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles e filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtros e Ações</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAllData} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    Resetar Senha
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resetar Senha de Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="resetUsername">Nome de usuário *</Label>
                      <Input
                        id="resetUsername"
                        value={resetForm.username}
                        onChange={(e) => setResetForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="nome_usuario"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">Nova senha *</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setResetPasswordOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={resetPassword}>
                      Resetar Senha
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, telefone, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtro por tipo */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="users">Usuários Sistema</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro por setor */}
            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os Setores</SelectItem>
                 <SelectItem value="CONTABIL">Contábil</SelectItem>
                 <SelectItem value="FISCAL">Fiscal</SelectItem>
                 <SelectItem value="PESSOAL">Pessoal</SelectItem>
                 <SelectItem value="PLANEJAMENTO">Planejamento</SelectItem>
               </SelectContent>
            </Select>
          </div>

          {/* Botões de criação */}
          <div className="flex gap-2 mb-6">
            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário do Sistema</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="userEmail">Email *</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="usuario@exemplo.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userPassword">Senha *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userUsername">Nome de usuário *</Label>
                    <Input
                      id="userUsername"
                      value={userForm.username}
                      onChange={(e) => setUserForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="nome_usuario"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userFullName">Nome completo</Label>
                    <Input
                      id="userFullName"
                      value={userForm.fullName}
                      onChange={(e) => setUserForm(f => ({ ...f, fullName: e.target.value }))}
                      placeholder="Nome Completo"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userTelefone">Telefone</Label>
                    <Input
                      id="userTelefone"
                      value={userForm.telefone}
                      onChange={(e) => setUserForm(f => ({ ...f, telefone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nível de acesso</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(v) => setUserForm(f => ({ ...f, role: v as Role }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        {isMasterAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createUser}>
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Cliente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="clientNome">Nome/Razão Social *</Label>
                    <Input
                      id="clientNome"
                      value={clientForm.nome}
                      onChange={(e) => setClientForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientCnpj">CNPJ *</Label>
                    <Input
                      id="clientCnpj"
                      value={clientForm.cnpj}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        
                        if (value.length >= 2) {
                          formatted = `${value.slice(0, 2)}.${value.slice(2)}`;
                        }
                        if (value.length >= 5) {
                          formatted = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
                        }
                        if (value.length >= 8) {
                          formatted = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
                        }
                        if (value.length >= 12) {
                          formatted = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12, 14)}`;
                        }
                        
                        setClientForm(f => ({ ...f, cnpj: formatted }));
                      }}
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="clientDataAbertura">Data de Abertura</Label>
                      <Input
                        id="clientDataAbertura"
                        value={clientForm.data_abertura}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2);
                          }
                          if (value.length >= 5) {
                            value = value.slice(0, 5) + '/' + value.slice(5, 9);
                          }
                          
                          setClientForm(f => ({ ...f, data_abertura: value }));
                        }}
                        maxLength={10}
                        placeholder="dd/mm/aaaa"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clientInscricaoEstadual">Inscrição Estadual</Label>
                      <Input
                        id="clientInscricaoEstadual"
                        value={clientForm.inscricao_estadual}
                        onChange={(e) => {
                          let value = e.target.value.toUpperCase();
                          
                          // Se for "ISENTO" completo, mantém como está
                          if (value === "ISENTO") {
                            setClientForm(f => ({ ...f, inscricao_estadual: "ISENTO" }));
                            return;
                          }
                          
                          // Permite digitação progressiva de "ISENTO"
                          const isentoPrefix = "ISENTO";
                          if (isentoPrefix.startsWith(value) && value.length > 0) {
                            setClientForm(f => ({ ...f, inscricao_estadual: value }));
                            return;
                          }
                          
                          const numbers = value.replace(/\D/g, '');
                          setClientForm(f => ({ ...f, inscricao_estadual: numbers }));
                        }}
                        placeholder="Digite os números ou ISENTO"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Regime Tributário *</Label>
                    <Select
                      value={clientForm.regime_tributario}
                      onValueChange={(v) => setClientForm(f => ({ ...f, regime_tributario: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o regime tributário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMPLES NACIONAL">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                        <SelectItem value="MEI">Microempreendedor Individual (MEI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="cliente@exemplo.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientTelefone">Telefone</Label>
                    <Input
                      id="clientTelefone"
                      value={clientForm.telefone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        
                        if (value.length >= 2) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        }
                        if (value.length >= 7) {
                          formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                        }
                        
                        setClientForm(f => ({ ...f, telefone: formatted }));
                      }}
                      maxLength={15}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="clientCidade">Cidade</Label>
                      <Input
                        id="clientCidade"
                        value={clientForm.cidade}
                        onChange={(e) => setClientForm(f => ({ ...f, cidade: e.target.value }))}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clientEstado">Estado</Label>
                      <Input
                        id="clientEstado"
                        value={clientForm.estado}
                        onChange={(e) => setClientForm(f => ({ ...f, estado: e.target.value }))}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                       <Label>Setor *</Label>
                       <Select
                         value={clientForm.setor}
                         onValueChange={(v) => setClientForm(f => ({ ...f, setor: v as Setor }))}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="CONTABIL">Contábil</SelectItem>
                             <SelectItem value="FISCAL">Fiscal</SelectItem>
                             <SelectItem value="PESSOAL">Pessoal</SelectItem>
                             <SelectItem value="PLANEJAMENTO">Planejamento</SelectItem>
                             <SelectItem value="TODOS">Todos os Setores</SelectItem>
                           </SelectContent>
                       </Select>
                     </div>
                     <div className="grid gap-2">
                       <Label>Admin Responsável (Opcional)</Label>
                       <AdminSelect
                         value={clientForm.admin_responsavel}
                         onValueChange={(value) => setClientForm(f => ({ ...f, admin_responsavel: value }))}
                         placeholder="Selecione um admin responsável"
                       />
                     </div>
                   </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateClientOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createClientWithUser}>
                    Criar Cliente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista unificada */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterType !== 'all' || filterSetor !== 'all'
                ? "Nenhum resultado encontrado com os filtros aplicados"
                : "Nenhum dado encontrado"
              }
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Mostrando {filteredEntities.length} de {entities.length} registros
              </p>
              <div className="space-y-2">
                {filteredEntities.map(renderEntity)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}