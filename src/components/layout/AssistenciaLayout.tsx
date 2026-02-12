import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Wrench, ClipboardList, Package, Wallet, ShoppingCart, Scissors, ArrowRightLeft, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMemo } from 'react';

interface AssistenciaLayoutProps {
  children: React.ReactNode;
  title: string;
}

const baseTabs = [
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
  const user = useAuthStore(s => s.user);
  const ehGestor = user?.colaborador?.cargo?.toLowerCase().includes('gestor') || (user?.colaborador as any)?.eh_gestor;

  const tabs = useMemo(() => {
    if (ehGestor) {
      return [...baseTabs, { name: 'Área do Gestor', href: '/os/area-gestor', icon: Shield }];
    }
    return baseTabs;
  }, [ehGestor]);
  return (
    <PageLayout title={title}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
