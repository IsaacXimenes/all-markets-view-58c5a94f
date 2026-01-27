import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
import { Plus, Clock, History, Star, Phone } from 'lucide-react';

interface GarantiasLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Novo Registro de Garantia', href: '/garantias/nova', icon: Plus },
  { name: 'Em Andamento', href: '/garantias/em-andamento', icon: Clock },
  { name: 'Contatos - Ativos', href: '/garantias/contatos-ativos', icon: Phone },
  { name: 'Histórico', href: '/garantias/historico', icon: History },
  { name: 'Garantia Extendida', href: '/garantias/extendida', icon: Star },
];

export function GarantiasLayout({ children, title }: GarantiasLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
