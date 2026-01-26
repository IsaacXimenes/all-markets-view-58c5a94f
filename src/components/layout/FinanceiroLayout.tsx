import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { FileCheck, MinusCircle, Wrench, Receipt, Wallet, Package, CreditCard, ArrowDownCircle, Building2, ReceiptText, Clock } from 'lucide-react';

interface FinanceiroLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function FinanceiroLayout({ children, title }: FinanceiroLayoutProps) {
  const location = useLocation();
  
  // Ordem: Conferência ... > Notas ... > Pendências ... > Despesas ... > Lotes ... > Pagamentos ... > Teto ... > Extrato
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

  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </PageLayout>
  );
}
