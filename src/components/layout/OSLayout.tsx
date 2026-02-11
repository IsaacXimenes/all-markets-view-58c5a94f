import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
import { Wrench, ClipboardList, Package, ShoppingCart, Scissors, ArrowRightLeft } from 'lucide-react';

interface OSLayoutProps {
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
];

export function OSLayout({ children, title }: OSLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
