import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { History, Plus, Smartphone, ClipboardList, Headphones, ShieldCheck, FileCheck, ShoppingCart } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface VendasLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

// Mock: verificar permissões do usuário logado
const temPermissaoDigital = true;
const temPermissaoFinalizador = true;
const temPermissaoGestor = true;
const temPermissaoLancamento = true;

const baseTabs = [
  { name: 'Histórico de Vendas', href: '/vendas', icon: History },
  { name: 'Nova Venda', href: '/vendas/nova', icon: Plus },
  { name: 'Venda - Balcão', href: '/vendas/balcao', icon: Headphones },
];

const digitalTabs = temPermissaoDigital ? [
  { name: 'Nova Venda - Digital', href: '/vendas/nova-digital', icon: Smartphone },
] : [];

const finalizadorTabs = temPermissaoFinalizador ? [
  { name: 'Pendentes Digitais', href: '/vendas/pendentes-digitais', icon: ClipboardList },
] : [];

const lancamentoTabs = temPermissaoLancamento ? [
  { name: 'Conferência - Lançamento', href: '/vendas/conferencia-lancamento', icon: FileCheck },
] : [];

const gestorTabs = temPermissaoGestor ? [
  { name: 'Conferência - Gestor', href: '/vendas/conferencia-gestor', icon: ShieldCheck },
] : [];

const tabs = [...baseTabs, ...digitalTabs, ...finalizadorTabs, ...lancamentoTabs, ...gestorTabs];

export function VendasLayout({ children, title, icon = ShoppingCart }: VendasLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
