import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/state/auth";
import { useTheme } from "next-themes";

export default function Login() {
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force light theme on login page
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    if (!user) return;
    // Temporarily allow all users to login through main login page
    navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) return setError(res.error || "Erro ao entrar");
  };

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden light">
      <div className="absolute inset-0 -z-10 animate-gradient-pan" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <Card className="w-[90%] max-w-[420px] card-elevated">
        <CardHeader>
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" />
            <CardTitle className="text-center">CONCEPÇÃO CONTABILIDADE</CardTitle>
            <p className="text-center text-sm text-muted-foreground">Acesse seu portal</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Email ou Usuário</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Digite seu email ou nome de usuário"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="hero-static" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Link to="/forgot" className="underline">Esqueci minha senha</Link>
                <Link to="/signup" className="underline">Criar conta</Link>
              </div>
              <div className="pt-2 border-t">
                <Link to="/admin-login">
                  <Button variant="outline" size="sm" className="text-xs">
                    Acesso Admin
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
