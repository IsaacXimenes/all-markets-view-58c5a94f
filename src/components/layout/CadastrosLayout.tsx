import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { Store, Users, UserCog, Truck, ShoppingCart, Package, Percent, Briefcase, CreditCard, Building2 } from 'lucide-react';

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
    { name: 'Produtos', href: '/cadastros/produtos', icon: Package },
    { name: 'Tipos de Desconto', href: '/cadastros/tipos-desconto', icon: Percent },
    { name: 'Cargos', href: '/cadastros/cargos', icon: Briefcase },
    { name: 'Modelos Pagamento', href: '/cadastros/modelos-pagamento', icon: CreditCard },
    { name: 'Contas Financeiras', href: '/cadastros/contas-financeiras', icon: Building2 },
  ];

  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto pb-1">
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
      </div>
      {children}
    </PageLayout>
  );
}
