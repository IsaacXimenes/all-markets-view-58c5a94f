import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { Users, MessageSquareWarning, Store, Percent, CreditCard, Wallet } from 'lucide-react';

interface RHLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Geral', href: '/rh', icon: Users },
  { name: 'FeedBack', href: '/rh/feedback', icon: MessageSquareWarning },
  { name: 'Comissão por Loja', href: '/rh/comissao-por-loja', icon: Store },
  { name: 'Salário - Colaborador', href: '/rh/salario-colaborador', icon: Percent },
  { name: 'Vales', href: '/rh/vales', icon: CreditCard },
  { name: 'Adiantamentos', href: '/rh/adiantamentos', icon: Wallet },
];

export const RHLayout: React.FC<RHLayoutProps> = ({ children, title }) => {
  const location = useLocation();

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
};
