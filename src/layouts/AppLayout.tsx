import { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, FileText, Users, ClipboardList, MessageSquare, BarChart3, Settings, LogOut, Shield, UserCog, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/state/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useGradientDatabase } from "@/hooks/useGradientDatabase";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/documents", label: "Documentos", icon: FileText },
  { to: "/tasks", label: "Tarefas", icon: ClipboardList, adminOnly: true },
  { to: "/client-tasks", label: "Tarefas", icon: ClipboardList },
  { to: "/support", label: "Suporte", icon: MessageSquare, adminOnly: true },
  { to: "/reports", label: "Relatórios", icon: BarChart3, adminOnly: true },
  { to: "/users", label: "Usuários", icon: Shield, adminOnly: true },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Initialize gradient system
  useGradientDatabase();

  const items = useMemo(() => {
    let filteredNav = nav;
    
    // Filter by role permissions
    if (user?.role === "user") {
      filteredNav = filteredNav.filter((n) => n.to !== "/clients" && n.to !== "/reports" && n.to !== "/tasks");
    } else if (user?.role === "admin") {
      filteredNav = filteredNav.filter((n) => n.to !== "/client-tasks");
    }
    
    // Filter admin-only items
    filteredNav = filteredNav.filter((n) => !n.adminOnly || user?.role === "admin");
    
    return filteredNav;
  }, [user?.role]);
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-app-gradient">
      <aside className="hidden md:flex md:flex-col border-r bg-card/80 backdrop-blur-sm sticky top-0 h-screen">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h1 className="text-xl font-semibold">CONCEPÇÃO</h1>
              <p className="text-sm text-muted-foreground">Contabilidade</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"
                }`
              }
            >
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="mt-auto p-4 border-t bg-card/90">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2">
                {user?.username}
                {user?.role === "admin" && <Shield className="size-3 text-primary" />}
              </p>
              <p className="text-muted-foreground text-xs capitalize">{user?.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="soft" size="sm" onClick={() => { logout(); navigate("/login"); }}>
                <LogOut className="mr-1" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <div>
                <h1 className="text-base font-semibold">CONCEPÇÃO</h1>
                <p className="text-xs text-muted-foreground">Contabilidade</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="soft" size="sm" onClick={() => { logout(); navigate("/login"); }}>
                <LogOut className="mr-1" /> Sair
              </Button>
            </div>
          </div>
          <div className="px-2 pb-2 flex gap-2 overflow-x-auto">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
                <n.icon className="size-4" />
                {n.label}
              </NavLink>
            ))}
          </div>
        </header>
        <div className="p-4 md:p-6"><Outlet /></div>
      </main>
    </div>
  );
}
