import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/state/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useThemeWithDatabase } from "@/hooks/useThemeWithDatabase";
import { GradientPicker } from "@/components/GradientPicker";
import { 
  Monitor, 
  Sun, 
  Moon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle
} from "lucide-react";

interface NotificationSettings {
  emailNotifications: boolean;
  taskReminders: boolean;
  clientUpdates: boolean;
  systemAlerts: boolean;
}

export default function Settings() {
  const { theme, setTheme } = useThemeWithDatabase();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    taskReminders: true,
    clientUpdates: false,
    systemAlerts: true
  });
  
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    fullName: user?.name || "",
    telefone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Atualizar perfil
  const updateProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileForm.username,
          full_name: profileForm.fullName,
          telefone: profileForm.telefone
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      fullName: user?.name || "",
      telefone: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  }, [user]);

  const themes = [
    { id: "light", name: "Claro", icon: Sun },
    { id: "dark", name: "Escuro", icon: Moon }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações" 
        subtitle="Gerencie suas preferências e configurações do sistema" 
      />
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="size-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="size-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="size-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Digite seu nome de usuário"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={profileForm.telefone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={updateProfile} disabled={loading}>
                  {loading && <RefreshCw className="mr-2 size-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite a nova senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" disabled={loading}>
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Aparência */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Tema do Sistema
              </CardTitle>
              <CardDescription>
                Escolha o tema que melhor se adapta ao seu estilo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map((themeOption) => (
                  <div
                    key={themeOption.id}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                      theme === themeOption.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setTheme(themeOption.id as "light" | "dark")}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <themeOption.icon className="size-5" />
                      {theme === themeOption.id && (
                        <CheckCircle className="size-4 text-primary" />
                      )}
                    </div>
                    <h3 className="font-medium">{themeOption.name}</h3>
                    <div className="mt-3 flex gap-1">
                      <div className={`w-4 h-4 rounded-full ${
                        themeOption.id === "light" ? "bg-white border" : 
                        themeOption.id === "dark" ? "bg-slate-800" : "bg-black"
                      }`} />
                      <div className="w-4 h-4 rounded-full bg-primary" />
                      <div className="w-4 h-4 rounded-full bg-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Esquema de Cores
              </CardTitle>
              <CardDescription>
                Personalize as cores do sistema de acordo com sua preferência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GradientPicker />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Notificações */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>
                Configure quando e como você quer ser notificado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries({
                emailNotifications: "Notificações por email",
                taskReminders: "Lembretes de tarefas",
                clientUpdates: "Atualizações de clientes",
                systemAlerts: "Alertas do sistema"
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">
                      {key === "emailNotifications" && "Receba notificações importantes por email"}
                      {key === "taskReminders" && "Seja lembrado sobre tarefas pendentes"}
                      {key === "clientUpdates" && "Notificações sobre mudanças nos clientes"}
                      {key === "systemAlerts" && "Alertas críticos do sistema"}
                    </p>
                  </div>
                  <Switch
                    checked={notifications[key as keyof NotificationSettings]}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
