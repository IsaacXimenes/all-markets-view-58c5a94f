import React from 'react';
import { 
  Package, Settings, ChevronRight, ChevronLeft, Home, Banknote, Users, Database, ShoppingCart, Wrench, BarChart3, Shield, ClipboardCheck, Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Link, useLocation } from 'react-router-dom';
import circuitBg from '@/assets/login_screen_v2_thiago_imports.png';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
}

const navItems: NavItem[] = [
  { title: 'Painel', icon: Home, href: '/' },
  { title: 'Recursos Humanos', icon: Users, href: '/rh' },
  { title: 'Financeiro', icon: Banknote, href: '/financeiro/conferencia' },
  { title: 'Estoque', icon: Package, href: '/estoque' },
  { title: 'Vendas', icon: ShoppingCart, href: '/vendas' },
  { title: 'Garantias', icon: Shield, href: '/garantias/nova' },
  { title: 'Assistência', icon: Wrench, href: '/os/analise-garantia' },
  { title: 'Gestão Administrativa', icon: ClipboardCheck, href: '/gestao-administrativa' },
  { title: 'Relatórios', icon: BarChart3, href: '/relatorios' },
  { title: 'Cadastros', icon: Database, href: '/cadastros' },
  { title: 'Dados - Sistema Antigo', icon: Archive, href: '/dados-sistema-antigo/clientes' },
  { title: 'Configurações', icon: Settings, href: '/settings' },
];

/** Overlay sutil com padrão de circuitos */
function CircuitOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `url(${circuitBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.08,
      }}
    />
  );
}

function SidebarContent({ 
  isCollapsed, 
  onToggle, 
  onNavigate,
  showToggle = true 
}: { 
  isCollapsed: boolean; 
  onToggle: () => void;
  onNavigate?: () => void;
  showToggle?: boolean;
}) {
  const location = useLocation();

  const isActiveModule = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href === '/financeiro/conferencia') return location.pathname.startsWith('/financeiro');
    if (href === '/os/analise-garantia') return location.pathname.startsWith('/os');
    if (href === '/garantias/nova') return location.pathname.startsWith('/garantias');
    if (href === '/gestao-administrativa') return location.pathname.startsWith('/gestao-administrativa');
    if (href === '/dados-sistema-antigo/clientes') return location.pathname.startsWith('/dados-sistema-antigo');
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b border-[#222222] relative z-10">
        <h2 className={cn(
          "font-semibold tracking-tight transition-opacity duration-200 text-white",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          Navegação
        </h2>
        
        {showToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "absolute right-2 text-white hover:text-[#F7BB05] hover:bg-transparent h-8 w-8",
              isCollapsed ? "right-2" : "right-4"
            )}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      {/* Nav items */}
      <ScrollArea className="flex-1 py-4 relative z-10">
        <nav className={cn("grid px-2", isCollapsed ? "gap-1" : "gap-0.5")}>
          {navItems.map((item, index) => {
            const isActive = isActiveModule(item.href);
            return (
              <Link
                key={index}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-md transition-all duration-200 relative",
                  isActive 
                    ? "bg-[#F7BB05]/10 text-[#F7BB05] font-semibold border-l-4 border-[#F7BB05]" 
                    : "text-white hover:bg-[#212121] border-l-4 border-transparent",
                  isCollapsed 
                    ? "justify-center px-0 py-2.5 mx-auto w-10 h-10 border-l-0" 
                    : "gap-3 px-3 py-2"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className={cn(
                    "text-sm",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#222222] relative z-10">
          <div className="rounded-md bg-[#1a1a1a] p-2 text-xs text-[#E0E0E0]">
            <p className="font-medium">Status da Loja</p>
            <p>Loja aberta</p>
            <p className="text-[10px]">Pedidos: 47 hoje</p>
          </div>
        </div>
      )}
    </>
  );
}

export function Sidebar({ isCollapsed, onToggle, className, isMobile, isOpen, onClose }: SidebarProps) {
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="p-0 w-64 bg-[#111111] text-white border-r-0 overflow-hidden relative">
          <CircuitOverlay />
          <SidebarContent 
            isCollapsed={false} 
            onToggle={onToggle}
            onNavigate={onClose}
            showToggle={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn(
      "bg-[#111111] text-white relative transition-all duration-300 ease-in-out flex flex-col border-r border-[#222222] fixed top-0 left-0 h-screen z-50 overflow-hidden",
      isCollapsed ? "w-16" : "w-64 xl:w-72",
      className
    )}>
      <CircuitOverlay />
      <SidebarContent 
        isCollapsed={isCollapsed} 
        onToggle={onToggle}
        showToggle={true}
      />
    </aside>
  );
}
