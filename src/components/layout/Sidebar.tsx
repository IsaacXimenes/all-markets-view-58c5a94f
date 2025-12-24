import React from 'react';
import { 
  Package, Settings, ChevronRight, ChevronLeft, Home, Banknote, Users, Database, ShoppingCart, Wrench, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
}

export function Sidebar({ isCollapsed, onToggle, className }: SidebarProps) {
  const location = useLocation();
  
  const navItems: NavItem[] = [
    { title: 'Painel', icon: Home, href: '/' },
    { title: 'Recursos Humanos', icon: Users, href: '/rh' },
    { title: 'Financeiro', icon: Banknote, href: '/financeiro/conferencia' },
    { title: 'Estoque', icon: Package, href: '/estoque' },
    { title: 'Vendas', icon: ShoppingCart, href: '/vendas' },
    { title: 'Lista de Reparos (OS)', icon: Wrench, href: '/os/produtos-analise' },
    { title: 'Relatórios', icon: BarChart3, href: '/relatorios' },
    { title: 'Cadastros', icon: Database, href: '/cadastros' },
    { title: 'Configurações', icon: Settings, href: '/settings' },
  ];

  const isActiveModule = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    // Handle modules with specific default routes
    if (href === '/financeiro/conferencia') {
      return location.pathname.startsWith('/financeiro');
    }
    if (href === '/os/produtos-analise') {
      return location.pathname.startsWith('/os');
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground relative transition-all duration-300 ease-in-out flex flex-col border-r border-sidebar-border fixed top-0 left-0 h-screen z-50",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
        <h2 className={cn(
          "font-semibold tracking-tight transition-opacity duration-200",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          Thiago imports
        </h2>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "absolute right-2 text-sidebar-foreground h-8 w-8",
            isCollapsed ? "right-2" : "right-4"
          )}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item, index) => {
            const isActive = isActiveModule(item.href);
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200 relative",
                  isActive 
                    ? "bg-primary text-primary-foreground font-semibold shadow-md" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  isActive && "animate-pulse"
                )} />
                <span className={cn(
                  "text-sm transition-opacity duration-200",
                  isCollapsed ? "opacity-0 w-0" : "opacity-100",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "transition-opacity duration-200 rounded-md bg-sidebar-accent/50 p-2 text-xs text-sidebar-accent-foreground",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          <p className="font-medium">Status da Loja</p>
          <p>Loja aberta</p>
          <p className="text-[10px]">Pedidos: 47 hoje</p>
        </div>
      </div>
    </aside>
  );
}
