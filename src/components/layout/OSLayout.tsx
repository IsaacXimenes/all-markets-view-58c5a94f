import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { Wrench, ClipboardList, Package } from 'lucide-react';

interface OSLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function OSLayout({ children, title }: OSLayoutProps) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Produtos para Análise', href: '/os/produtos-analise', icon: ClipboardList },
    { name: 'Assistência', href: '/os/assistencia', icon: Wrench },
    { name: 'Solicitações de Peças', href: '/os/solicitacoes-pecas', icon: Package },
  ];

  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.href || location.pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
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
