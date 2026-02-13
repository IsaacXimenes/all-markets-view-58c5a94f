import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Wrench, HardHat, ClipboardCheck, ShoppingCart, History, Scissors, Package, ArrowRightLeft, FileSearch } from 'lucide-react';

interface AssistenciaLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Análise de Tratativas', href: '/os/analise-garantia', icon: FileSearch },
  { name: 'Nova Assistência', href: '/os/assistencia', icon: Wrench },
  { name: 'Oficina / Bancada', href: '/os/oficina', icon: HardHat },
  { name: 'Conferência Gestor', href: '/os/conferencia-gestor', icon: ClipboardCheck },
  { name: 'Solicitações de Peças', href: '/os/solicitacoes-pecas', icon: ShoppingCart },
  { name: 'Estoque - Assistência', href: '/os/pecas', icon: Package },
  { name: 'Retirada de Peças', href: '/os/retirada-pecas', icon: Scissors },
  { name: 'Movimentação - Peças', href: '/os/movimentacao-pecas', icon: ArrowRightLeft },
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
