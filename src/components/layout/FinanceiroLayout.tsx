import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { FileCheck, MinusCircle, Wrench, Receipt, Wallet, ArrowDownCircle, Building2, ReceiptText, Clock, Banknote } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface FinanceiroLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Conferência de Contas', href: '/financeiro/conferencia', icon: FileCheck },
  { name: 'Conferências - Fiado', href: '/financeiro/fiado', icon: Wallet },
  { name: 'Notas - Pendentes', href: '/financeiro/notas-pendencias', icon: Clock },
  { name: 'Notas Pendentes - Assistência', href: '/financeiro/notas-assistencia', icon: Wrench },
  { name: 'Central de Despesas', href: '/financeiro/despesas', icon: MinusCircle },
  { name: 'Pagamentos Downgrade', href: '/financeiro/pagamentos-downgrade', icon: ArrowDownCircle },
  { name: 'Teto Bancário', href: '/financeiro/teto-bancario', icon: Building2 },
  { name: 'Extrato por Conta', href: '/financeiro/extrato-contas', icon: ReceiptText },
  { name: 'Extrato Geral', href: '/financeiro/extrato', icon: Receipt }
];

export function FinanceiroLayout({ children, title, icon = Banknote }: FinanceiroLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
