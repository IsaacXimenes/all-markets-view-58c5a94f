import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { Store, Users, UserCog, Truck, ShoppingCart, Package, Percent, Briefcase, CreditCard, Building2, Wrench, Headphones, Shield, Palette, MapPinned } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CadastrosLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function CadastrosLayout({ children, title }: CadastrosLayoutProps) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Lojas', href: '/cadastros/lojas', icon: Store },
    { name: 'Clientes', href: '/cadastros/clientes', icon: Users },
    { name: 'Colaboradores', href: '/cadastros/colaboradores', icon: UserCog },
    { name: 'Fornecedores', href: '/cadastros/fornecedores', icon: Truck },
    { name: 'Origens de Venda', href: '/cadastros/origens-venda', icon: ShoppingCart },
    { name: 'Aparelhos', href: '/cadastros/produtos', icon: Package },
    { name: 'Peças', href: '/cadastros/pecas', icon: Wrench },
    { name: 'Acessórios', href: '/cadastros/acessorios', icon: Headphones },
    { name: 'Cores', href: '/cadastros/cores', icon: Palette },
    { name: 'Máquinas', href: '/cadastros/maquinas', icon: CreditCard },
    { name: 'Tipos de Desconto', href: '/cadastros/tipos-desconto', icon: Percent },
    { name: 'Cargos', href: '/cadastros/cargos', icon: Briefcase },
    { name: 'Modelos Pagamento', href: '/cadastros/modelos-pagamento', icon: CreditCard },
    { name: 'Contas Financeiras', href: '/cadastros/contas-financeiras', icon: Building2 },
    { name: 'Planos Garantia', href: '/cadastros/planos-garantia', icon: Shield },
    { name: 'Taxas de Entrega', href: '/cadastros/taxas-entrega', icon: MapPinned },
  ];

  return (
    <PageLayout title={title}>
      <div className="relative mb-6 border-b border-border">
        {/* Gradiente esquerdo para indicar mais conteúdo */}
        <div className="absolute left-0 top-0 bottom-4 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        
        <ScrollArea className="w-full whitespace-nowrap" type="always">
          <nav className="flex gap-1 pb-2 px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
          <ScrollBar 
            orientation="horizontal" 
            className="h-3 bg-muted/40 rounded-full cursor-pointer" 
          />
        </ScrollArea>
        
        {/* Gradiente direito para indicar mais conteúdo */}
        <div className="absolute right-0 top-0 bottom-4 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      </div>
      {children}
    </PageLayout>
  );
}
