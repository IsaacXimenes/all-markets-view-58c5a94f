import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Plus, Clock, History, Star, Phone, Shield } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface GarantiasLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Novo Registro de Garantia', href: '/garantias/nova', icon: Plus },
  { name: 'Em Andamento', href: '/garantias/em-andamento', icon: Clock },
  { name: 'Contatos - Ativos', href: '/garantias/contatos-ativos', icon: Phone },
  { name: 'Histórico', href: '/garantias/historico', icon: History },
  { name: 'Garantia Extendida', href: '/garantias/extendida', icon: Star },
];

export function GarantiasLayout({ children, title, icon = Shield }: GarantiasLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
