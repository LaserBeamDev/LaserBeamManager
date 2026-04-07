import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import MaterialesPage from "@/pages/MaterialesPage";
import ProcesosPage from "@/pages/ProcesosPage";
import ComponentesPage from "@/pages/ComponentesPage";
import ParametrosPage from "@/pages/ParametrosPage";
import ProductosPage from "@/pages/ProductosPage";
import PresupuestosListPage from "@/pages/PresupuestosListPage";
import PresupuestoDetailPage from "@/pages/PresupuestoDetailPage";
import ProduccionPage from "@/pages/ProduccionPage";
import HistorialPage from "@/pages/HistorialPage";
import CrmDashboardPage from "@/pages/CrmDashboardPage";
import CrmTransaccionesPage from "@/pages/CrmTransaccionesPage";
import CrmKanbanPage from "@/pages/CrmKanbanPage";
import CrmInventarioPage from "@/pages/CrmInventarioPage";
import CrmLogisticaPage from "@/pages/CrmLogisticaPage";
import CrmConfigPage from "@/pages/CrmConfigPage";
import CrmCobrosPage from "@/pages/CrmCobrosPage";
import CrmClientesPage from "@/pages/CrmClientesPage";
import CrmProveedoresPage from "@/pages/CrmProveedoresPage";
import AuthPage from "@/pages/AuthPage";
import AdminUsuariosPage from "@/pages/AdminUsuariosPage";
import CrmRemitosPage from "@/pages/CrmRemitosPage";
import CrmAnalyticsPage from "@/pages/CrmAnalyticsPage";
import NotFound from "@/pages/NotFound";
import { BudgetProvider } from "@/hooks/useBudgetStore";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <BudgetProvider>
      <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/materiales" element={<MaterialesPage />} />
        <Route path="/procesos" element={<ProcesosPage />} />
        <Route path="/componentes" element={<ComponentesPage />} />
        <Route path="/parametros" element={<ParametrosPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/presupuestos" element={<PresupuestosListPage />} />
        <Route path="/presupuestos/:id" element={<PresupuestoDetailPage />} />
        <Route path="/produccion" element={<ProduccionPage />} />
        <Route path="/historial" element={<HistorialPage />} />
        <Route path="/crm" element={<CrmDashboardPage />} />
        <Route path="/crm/movimientos" element={<CrmTransaccionesPage />} />
        <Route path="/crm/produccion" element={<CrmKanbanPage />} />
        <Route path="/crm/stock" element={<CrmInventarioPage />} />
        <Route path="/crm/logistica" element={<CrmLogisticaPage />} />
        <Route path="/crm/cobros" element={<CrmCobrosPage />} />
        <Route path="/crm/clientes" element={<CrmClientesPage />} />
        <Route path="/crm/proveedores" element={<CrmProveedoresPage />} />
        <Route path="/crm/remitos" element={<CrmRemitosPage />} />
        <Route path="/crm/analytics" element={<CrmAnalyticsPage />} />
        <Route path="/crm/configuracion" element={<CrmConfigPage />} />
        <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
        {/* Redirects for old routes */}
        <Route path="/crm/transacciones" element={<Navigate to="/crm/movimientos" replace />} />
        <Route path="/crm/kanban" element={<Navigate to="/crm/produccion" replace />} />
        <Route path="/crm/inventario" element={<Navigate to="/crm/stock" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </AppLayout>
    </BudgetProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
