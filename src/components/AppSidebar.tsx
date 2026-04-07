import {
  LayoutDashboard, FileText, Package, Layers, Cog, Settings, Clock, History,
  TrendingUp, Kanban, Warehouse, BarChart3, Truck, Wrench, Users, DollarSign, Store, UserCheck, FileOutput,
  Hammer, ChevronDown, Boxes, Bot,
} from "lucide-react";
import { useCrm } from "@/hooks/useCrm";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const crmItems = [
  { title: "Dashboard", url: "/crm", icon: BarChart3 },
  { title: "Movimientos", url: "/crm/movimientos", icon: TrendingUp },
  { title: "Producción", url: "/crm/produccion", icon: Kanban },
  { title: "Logística", url: "/crm/logistica", icon: Truck },
  { title: "Remitos", url: "/crm/remitos", icon: FileOutput },
  { title: "Stock", url: "/crm/stock", icon: Warehouse },
  { title: "Cobros MP", url: "/crm/cobros", icon: DollarSign },
  { title: "Clientes", url: "/crm/clientes", icon: UserCheck },
  { title: "Proveedores", url: "/crm/proveedores", icon: Store },
  { title: "Configuración", url: "/crm/configuracion", icon: Wrench },
  { title: "Asistente IA", url: "/crm/analytics", icon: Bot },
];

const crearItems = [
  { title: "Productos", url: "/productos", icon: Package },
  { title: "Componentes", url: "/componentes", icon: Boxes },
  { title: "Materiales", url: "/materiales", icon: Layers },
  { title: "Procesos", url: "/procesos", icon: Cog },
  { title: "Parámetros", url: "/parametros", icon: Settings },
  { title: "Producción", url: "/produccion", icon: Clock },
];

const presupuestoItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Presupuestos", url: "/presupuestos", icon: FileText },
  { title: "Historial", url: "/historial", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin } = useCrm();

  const crearIsActive = crearItems.some(i => location.pathname === i.url || location.pathname.startsWith(i.url + '/'));
  const [crearOpen, setCrearOpen] = useState(crearIsActive);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">LB</span>
              </div>
              <span className="font-semibold text-foreground text-sm">LaserBeam</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-primary-foreground font-bold text-xs">LB</span>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>CRM / Ventas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/crm"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Presupuestos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {presupuestoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <Collapsible open={crearOpen} onOpenChange={setCrearOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-muted/50 rounded-md flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <Hammer className="h-3 w-3" />
                  <span>Crear</span>
                </div>
                {!collapsed && <ChevronDown className={`h-3 w-3 transition-transform ${crearOpen ? 'rotate-180' : ''}`} />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {crearItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-muted/50"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/usuarios"
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Usuarios</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
