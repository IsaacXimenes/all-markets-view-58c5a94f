import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
import { LayoutDashboard, Package, FileText, ArrowRightLeft, Clock, Headphones, Zap } from 'lucide-react';

interface EstoqueLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Dashboard', href: '/estoque', icon: LayoutDashboard },
  { name: 'Aparelhos', href: '/estoque/produtos', icon: Package },
  { name: 'Acessórios', href: '/estoque/acessorios', icon: Headphones },
  { name: 'Aparelhos Pendentes', href: '/estoque/produtos-pendentes', icon: Clock },
  { name: 'Notas - Pendências', href: '/estoque/notas-pendencias', icon: FileText },
  { name: 'Notas Urgência', href: '/estoque/notas-urgencia', icon: Zap },
  { name: 'Movimentações - Aparelhos', href: '/estoque/movimentacoes', icon: ArrowRightLeft },
  { name: 'Movimentações - Acessórios', href: '/estoque/movimentacoes-acessorios', icon: ArrowRightLeft }
];

export function EstoqueLayout({ children, title }: EstoqueLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
