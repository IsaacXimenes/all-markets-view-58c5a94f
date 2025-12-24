import React, { useState } from 'react';
import { 
  Package, Settings, ChevronRight, ChevronLeft, ChevronDown, Home, Banknote, Users, Database, ShoppingCart, Wrench, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useLocation } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

interface SubNavItem {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  subItems?: SubNavItem[];
}

export function Sidebar({ isCollapsed, onToggle, className }: SidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  
  const navItems: NavItem[] = [
    { title: 'Painel', icon: Home, href: '/' },
    { title: 'Recursos Humanos', icon: Users, href: '/rh', subItems: [
      { title: 'Visão Geral', href: '/rh' },
      { title: 'Feedback', href: '/rh/feedback' },
    ]},
    { title: 'Financeiro', icon: Banknote, href: '/financeiro', subItems: [
      { title: 'Conferência', href: '/financeiro/conferencia' },
      { title: 'Despesas Fixas', href: '/financeiro/despesas-fixas' },
      { title: 'Despesas Variáveis', href: '/financeiro/despesas-variaveis' },
      { title: 'Conferência Notas', href: '/financeiro/conferencia-notas-entrada' },
      { title: 'Notas Assistência', href: '/financeiro/notas-assistencia' },
    ]},
    { title: 'Estoque', icon: Package, href: '/estoque', subItems: [
      { title: 'Visão Geral', href: '/estoque' },
      { title: 'Produtos', href: '/estoque/produtos' },
      { title: 'Pendentes', href: '/estoque/produtos-pendentes' },
      { title: 'Notas de Compra', href: '/estoque/notas-compra' },
      { title: 'Movimentações', href: '/estoque/movimentacoes' },
      { title: 'Solicitações Peças', href: '/estoque/solicitacoes-pecas' },
    ]},
    { title: 'Vendas', icon: ShoppingCart, href: '/vendas', subItems: [
      { title: 'Todas as Vendas', href: '/vendas' },
      { title: 'Nova Venda', href: '/vendas/nova' },
      { title: 'Nova Digital', href: '/vendas/nova-digital' },
      { title: 'Pendentes Digitais', href: '/vendas/pendentes-digitais' },
    ]},
    { title: 'Lista de Reparos (OS)', icon: Wrench, href: '/os', subItems: [
      { title: 'Produtos em Análise', href: '/os/produtos-analise' },
      { title: 'Assistência', href: '/os/assistencia' },
      { title: 'Nova OS', href: '/os/assistencia/nova' },
    ]},
    { title: 'Relatórios', icon: BarChart3, href: '/relatorios' },
    { title: 'Cadastros', icon: Database, href: '/cadastros', subItems: [
      { title: 'Visão Geral', href: '/cadastros' },
      { title: 'Lojas', href: '/cadastros/lojas' },
      { title: 'Clientes', href: '/cadastros/clientes' },
      { title: 'Colaboradores', href: '/cadastros/colaboradores' },
      { title: 'Fornecedores', href: '/cadastros/fornecedores' },
      { title: 'Produtos', href: '/cadastros/produtos' },
      { title: 'Cargos', href: '/cadastros/cargos' },
      { title: 'Origens de Venda', href: '/cadastros/origens-venda' },
      { title: 'Tipos de Desconto', href: '/cadastros/tipos-desconto' },
      { title: 'Modelos Pagamento', href: '/cadastros/modelos-pagamento' },
      { title: 'Contas Financeiras', href: '/cadastros/contas-financeiras' },
    ]},
    { title: 'Configurações', icon: Settings, href: '/settings' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname === href;
  };

  const isActiveModule = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Auto-open menus based on current route
  React.useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && isActiveModule(item.href) && !openMenus.includes(item.title)) {
        setOpenMenus(prev => [...prev, item.title]);
      }
    });
  }, [location.pathname]);

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
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openMenus.includes(item.title);

            if (hasSubItems && !isCollapsed) {
              return (
                <Collapsible key={index} open={isOpen} onOpenChange={() => toggleMenu(item.title)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200 relative w-full text-left",
                        isActive 
                          ? "bg-primary text-primary-foreground font-semibold shadow-md" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                      )}
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm flex-1">{item.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 mt-1 space-y-1">
                    {item.subItems?.map((subItem, subIndex) => (
                      <Link
                        key={subIndex}
                        to={subItem.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-200",
                          isActiveRoute(subItem.href)
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        {subItem.title}
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            // For collapsed sidebar or items without subitems
            const linkHref = hasSubItems 
              ? item.subItems![0].href 
              : item.href;

            return (
              <Link
                key={index}
                to={linkHref}
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
                <item.icon className="h-5 w-5 shrink-0" />
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
