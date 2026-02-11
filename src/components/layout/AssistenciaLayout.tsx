import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Wrench, ClipboardList, Package, Wallet, ShoppingCart, Scissors, ArrowRightLeft } from 'lucide-react';

interface AssistenciaLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Análise de Tratativas', href: '/os/analise-garantia', icon: ClipboardList },
  { name: 'Nova Assistência', href: '/os/assistencia', icon: Wrench },
  { name: 'Estoque - Assistência', href: '/os/pecas', icon: Package },
  { name: 'Retirada de Peças', href: '/os/retirada-pecas', icon: Scissors },
  { name: 'Solicitações de Peças', href: '/os/solicitacoes-pecas', icon: ShoppingCart },
  { name: 'Histórico de Notas', href: '/os/historico-notas', icon: ClipboardList },
  { name: 'Movimentação - Peças', href: '/os/movimentacao-pecas', icon: ArrowRightLeft },
  { name: 'Lotes de Pagamento', href: '/assistencia/lotes-pagamento', icon: Wallet },
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
