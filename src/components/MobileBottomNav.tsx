import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Kanban, TrendingUp, Package, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const bottomTabs = [
  { label: "Dashboard", icon: BarChart3, path: "/crm" },
  { label: "Producción", icon: Kanban, path: "/crm/produccion" },
  { label: "Movimientos", icon: TrendingUp, path: "/crm/movimientos" },
  { label: "Productos", icon: Package, path: "/productos" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-14 md:hidden safe-area-bottom">
      {bottomTabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span>Más</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
          </SidebarProvider>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
