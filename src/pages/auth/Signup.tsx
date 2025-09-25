
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/state/auth";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { SETORES_OPTIONS, Setor } from "@/types/setor";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function Signup() {
  const { signup, login, user } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSetores, setSelectedSetores] = useState<Setor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force light theme on signup page
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!validateEmail(email)) {
      setLoading(false);
      return setError("Por favor, digite um e-mail com formato válido");
    }
    
    if (selectedSetores.length === 0) {
      setLoading(false);
      return setError("Por favor, selecione pelo menos um setor");
    }
    
    try {
      // Use Supabase auth signup instead
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: username,
            username,
            telefone,
            setores: selectedSetores
          }
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        setLoading(false);
        return setError(error.message || "Erro ao criar conta");
      }

      console.log('User created successfully:', data);
      
      // Conta criada com sucesso - redirecionar para login
      setLoading(false);
      navigate("/login");
      
    } catch (error) {
      console.error('Unexpected error creating user:', error);
      setLoading(false);
      setError("Erro inesperado ao criar conta");
    }
  };

  const handleSetorChange = (setor: Setor, checked: boolean) => {
    if (checked) {
      setSelectedSetores(prev => [...prev, setor]);
    } else {
      setSelectedSetores(prev => prev.filter(s => s !== setor));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden light">
      <div className="absolute inset-0 -z-10 animate-gradient-pan" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <Card className="w-[90%] max-w-[420px] card-elevated">
        <CardHeader>
          <CardTitle className="text-center">Criar conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input 
                id="telefone" 
                type="tel" 
                placeholder="Ex: 31997810730"
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Setores</Label>
              <div className="grid grid-cols-1 gap-3 p-3 border rounded-md">
                {SETORES_OPTIONS.map((setor) => (
                  <div key={setor.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={setor.value}
                      checked={selectedSetores.includes(setor.value)}
                      onCheckedChange={(checked) => handleSetorChange(setor.value, checked as boolean)}
                    />
                    <Label htmlFor={setor.value} className="text-sm font-normal cursor-pointer">
                      {setor.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="hero" type="submit" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}</Button>
            <div className="text-center text-sm">
              Já tem conta? <Link to="/login" className="underline">Entrar</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
