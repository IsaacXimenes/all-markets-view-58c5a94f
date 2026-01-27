import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
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
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
};
