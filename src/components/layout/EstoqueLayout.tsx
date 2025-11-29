import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, FileText, ArrowRightLeft } from 'lucide-react';

interface EstoqueLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function EstoqueLayout({ children, title }: EstoqueLayoutProps) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Dashboard', href: '/estoque', icon: LayoutDashboard },
    { name: 'Produtos', href: '/estoque/produtos', icon: Package },
    { name: 'Notas de Compra', href: '/estoque/notas-compra', icon: FileText },
    { name: 'Movimentações', href: '/estoque/movimentacoes', icon: ArrowRightLeft }
  ];

  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                <Icon className="h-4 w-4" />
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
