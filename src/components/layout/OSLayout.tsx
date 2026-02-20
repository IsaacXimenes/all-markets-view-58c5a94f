import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Wrench, Settings, ClipboardCheck, ShoppingCart, History, Scissors, Package, ArrowRightLeft, FileSearch, PackageCheck } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface OSLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Análise de Tratativas', href: '/os/analise-garantia', icon: FileSearch },
  { name: 'Nova Assistência', href: '/os/assistencia', icon: Wrench },
  { name: 'Serviços', href: '/os/oficina', icon: Settings },
  { name: 'Conferência Gestor', href: '/os/conferencia-gestor', icon: ClipboardCheck },
  { name: 'Solicitações de Peças', href: '/os/solicitacoes-pecas', icon: ShoppingCart },
  { name: 'Estoque - Assistência', href: '/os/pecas', icon: Package },
  { name: 'Consignação', href: '/os/consignacao', icon: PackageCheck },
  { name: 'Retirada de Peças', href: '/os/retirada-pecas', icon: Scissors },
  { name: 'Movimentação - Peças', href: '/os/movimentacao-pecas', icon: ArrowRightLeft },
  { name: 'Histórico', href: '/os/historico-assistencia', icon: History },
];

export function OSLayout({ children, title, icon = Wrench }: OSLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
