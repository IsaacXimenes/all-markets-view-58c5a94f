import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { FileCheck, Plus, Building2 } from 'lucide-react';

interface FinanceiroLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function FinanceiroLayout({ children, title }: FinanceiroLayoutProps) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Conferência de Contas', href: '/financeiro/conferencia', icon: FileCheck },
    { name: 'Lançar Despesa', href: '/financeiro/lancar-despesa', icon: Plus },
    { name: 'Contas Financeiras', href: '/financeiro/contas', icon: Building2 }
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
