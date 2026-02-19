import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Users, ShoppingCart, CreditCard, PackageOpen, Wrench, Hammer, Receipt, ListOrdered, Package, Calendar, Archive } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface DadosSistemaAntigoLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Cadastro de Clientes', href: '/dados-sistema-antigo/clientes', icon: Users },
  { name: 'Compras', href: '/dados-sistema-antigo/compras', icon: ShoppingCart },
  { name: 'Compras Pagamentos', href: '/dados-sistema-antigo/compras-pagamentos', icon: CreditCard },
  { name: 'Entradas', href: '/dados-sistema-antigo/entradas', icon: PackageOpen },
  { name: 'Ordem de Serviço', href: '/dados-sistema-antigo/ordem-servico', icon: Wrench },
  { name: 'Reparos', href: '/dados-sistema-antigo/reparos', icon: Hammer },
  { name: 'Vendas', href: '/dados-sistema-antigo/vendas', icon: Receipt },
  { name: 'Vendas Pagamentos', href: '/dados-sistema-antigo/vendas-pagamentos', icon: ListOrdered },
  { name: 'Vendas Produtos', href: '/dados-sistema-antigo/vendas-produtos', icon: Package },
  { name: 'Dados - 2023', href: '/dados-sistema-antigo/dados-2023', icon: Calendar },
];

export function DadosSistemaAntigoLayout({ children, title, icon = Archive }: DadosSistemaAntigoLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
