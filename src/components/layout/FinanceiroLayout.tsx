import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
import { FileCheck, MinusCircle, Wrench, Receipt, Wallet, Package, CreditCard, ArrowDownCircle, Building2, ReceiptText, Clock } from 'lucide-react';

interface FinanceiroLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Conferência de Contas', href: '/financeiro/conferencia', icon: FileCheck },
  { name: 'Conferências - Fiado', href: '/financeiro/fiado', icon: Wallet },
  { name: 'Conferência de Notas', href: '/financeiro/conferencia-notas-entrada', icon: FileCheck },
  { name: 'Notas - Pendências', href: '/financeiro/notas-pendencias', icon: Clock },
  { name: 'Notas Pendentes - Assistência', href: '/financeiro/notas-assistencia', icon: Wrench },
  { name: 'Despesas Fixas', href: '/financeiro/despesas-fixas', icon: MinusCircle },
  { name: 'Despesas Variáveis', href: '/financeiro/despesas-variaveis', icon: MinusCircle },
  { name: 'Lotes de Pagamento', href: '/financeiro/lotes-pagamento', icon: Package },
  { name: 'Execução de Lotes', href: '/financeiro/execucao-lotes', icon: CreditCard },
  { name: 'Pagamentos Downgrade', href: '/financeiro/pagamentos-downgrade', icon: ArrowDownCircle },
  { name: 'Teto Bancário', href: '/financeiro/teto-bancario', icon: Building2 },
  { name: 'Extrato por Conta', href: '/financeiro/extrato-contas', icon: ReceiptText },
  { name: 'Extrato Geral', href: '/financeiro/extrato', icon: Receipt }
];

export function FinanceiroLayout({ children, title }: FinanceiroLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
