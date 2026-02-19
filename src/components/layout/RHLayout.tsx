import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Users, MessageSquareWarning, Store, Percent, CreditCard, Wallet, Bike } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface RHLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Geral', href: '/rh', icon: Users },
  { name: 'FeedBack', href: '/rh/feedback', icon: MessageSquareWarning },
  { name: 'Comissão por Loja', href: '/rh/comissao-por-loja', icon: Store },
  { name: 'Salário - Colaborador', href: '/rh/salario-colaborador', icon: Percent },
  { name: 'Vales', href: '/rh/vales', icon: CreditCard },
  { name: 'Adiantamentos', href: '/rh/adiantamentos', icon: Wallet },
  { name: 'Remuneração Motoboy', href: '/rh/motoboy-remuneracao', icon: Bike },
];

export const RHLayout: React.FC<RHLayoutProps> = ({ children, title, icon = Users }) => {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
};
