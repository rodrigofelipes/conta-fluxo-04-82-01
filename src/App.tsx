import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Tasks from "./pages/Tasks";
import ClientTasks from "./pages/ClientTasks";
import Support from "./pages/Support";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UnifiedUserManagement from "./pages/UnifiedUserManagement";

import Login from "./pages/auth/Login";
import AdminLogin from "./pages/auth/AdminLogin";
import Forgot from "./pages/auth/ForgotPassword";
import TwoFA from "./pages/auth/TwoFA";
import NotFound from "./pages/NotFound";
import { AuthProvider, ProtectedRoute, AdminRoute } from "./state/auth";
import Signup from "./pages/auth/Signup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={["light","dark"]}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot" element={<Forgot />} />
              <Route path="/2fa" element={<TwoFA />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<AdminRoute><ClientDetail /></AdminRoute>} />
                <Route path="documents" element={<Documents />} />
                <Route path="tasks" element={<AdminRoute><Tasks /></AdminRoute>} />
                <Route path="client-tasks" element={<ClientTasks />} />
                <Route path="support" element={<AdminRoute><Support /></AdminRoute>} />
                <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
                <Route path="settings" element={<Settings />} />
                <Route path="users" element={<AdminRoute><UnifiedUserManagement /></AdminRoute>} />
                
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
