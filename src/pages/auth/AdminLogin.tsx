import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/state/auth";
import { useTheme } from "next-themes";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force light theme on admin login page
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    console.log('AdminLogin useEffect - user:', user);
    if (user) {
      console.log('User role:', user.role);
      if (user.role === "admin") {
        console.log('User is admin, navigating to dashboard');
        navigate("/dashboard", { replace: true });
      } else {
        console.log('User is not admin, showing error and logging out');
        setError("Acesso negado. Apenas administradores podem acessar esta área.");
        // Fazer logout automaticamente se não for admin
        logout();
      }
    }
  }, [user, navigate, logout]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) return setError(res.error || "Erro ao entrar");
    
    // Additional check will be handled by useEffect when user state updates
  };

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden light">
      <div className="absolute inset-0 -z-10 animate-gradient-pan" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <Card className="w-[90%] max-w-[420px] card-elevated">
        <CardHeader>
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" />
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Shield className="size-5 text-primary" />
              ACESSO ADMINISTRATIVO
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground">Área restrita para administradores</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Usuário Admin</Label>
              <Input 
                id="admin-username" 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                placeholder="Digite seu usuário administrativo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha Admin</Label>
              <Input 
                id="admin-password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Digite sua senha administrativa"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="hero-static" type="submit" disabled={loading}>
              {loading ? "Verificando..." : "Entrar como Admin"}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm underline text-muted-foreground">
                Voltar ao login normal
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}