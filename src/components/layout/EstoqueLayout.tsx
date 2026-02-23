import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { LayoutDashboard, Package, FileText, ArrowRightLeft, Clock, Headphones, Building, RefreshCw, DollarSign } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface EstoqueLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Dashboard', href: '/estoque', icon: LayoutDashboard },
  { name: 'Aparelhos', href: '/estoque/produtos', icon: Package },
  { name: 'Acessórios', href: '/estoque/acessorios', icon: Headphones },
  { name: 'Aparelhos Pendentes', href: '/estoque/produtos-pendentes', icon: Clock },
  { name: 'Pendências - Base de Trocas', href: '/estoque/pendencias-base-trocas', icon: RefreshCw },
  { name: 'Notas de Entrada', href: '/estoque/notas-pendencias', icon: FileText },
  { name: 'Movimentações - Aparelhos', href: '/estoque/movimentacoes', icon: ArrowRightLeft },
  { name: 'Movimentações - Acessórios', href: '/estoque/movimentacoes-acessorios', icon: ArrowRightLeft },
  { name: 'Movimentações - Matriz', href: '/estoque/movimentacoes-matriz', icon: Building },
  { name: 'Valores de Troca', href: '/estoque/valores-troca', icon: DollarSign },
];

export function EstoqueLayout({ children, title, icon = Package }: EstoqueLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
