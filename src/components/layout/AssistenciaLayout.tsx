import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Wrench, HardHat, ClipboardCheck, ShoppingCart, History } from 'lucide-react';

interface AssistenciaLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Nova Assistência', href: '/os/assistencia', icon: Wrench },
  { name: 'Oficina / Bancada', href: '/os/oficina', icon: HardHat },
  { name: 'Conferência Gestor', href: '/os/conferencia-gestor', icon: ClipboardCheck },
  { name: 'Solicitações de Peças', href: '/os/solicitacoes-pecas', icon: ShoppingCart },
  { name: 'Histórico', href: '/os/historico-assistencia', icon: History },
];

export function AssistenciaLayout({ children, title }: AssistenciaLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
