import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { Store, Users, UserCog, Truck, ShoppingCart, Package, Percent, Briefcase, CreditCard, Building2, Wrench, Headphones, Shield, Palette, MapPinned, MessageSquare, ListChecks, History, Database } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface CadastrosLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Lojas', href: '/cadastros/lojas', icon: Store },
  { name: 'Clientes', href: '/cadastros/clientes', icon: Users },
  { name: 'Colaboradores', href: '/cadastros/colaboradores', icon: UserCog },
  { name: 'Fornecedores', href: '/cadastros/fornecedores', icon: Truck },
  { name: 'Origens de Venda', href: '/cadastros/origens-venda', icon: ShoppingCart },
  { name: 'Aparelhos', href: '/cadastros/produtos', icon: Package },
  { name: 'Peças', href: '/cadastros/pecas', icon: Wrench },
  { name: 'Acessórios', href: '/cadastros/acessorios', icon: Headphones },
  { name: 'Cores', href: '/cadastros/cores', icon: Palette },
  { name: 'Máquinas', href: '/cadastros/maquinas', icon: CreditCard },
  { name: 'Tipos de Desconto', href: '/cadastros/tipos-desconto', icon: Percent },
  { name: 'Cargos', href: '/cadastros/cargos', icon: Briefcase },
  { name: 'Modelos Pagamento', href: '/cadastros/modelos-pagamento', icon: CreditCard },
  { name: 'Contas Financeiras', href: '/cadastros/contas-financeiras', icon: Building2 },
  { name: 'Planos Garantia', href: '/cadastros/planos-garantia', icon: Shield },
  { name: 'Taxas de Entrega', href: '/cadastros/taxas-entrega', icon: MapPinned },
  { name: 'Config. WhatsApp', href: '/cadastros/config-whatsapp', icon: MessageSquare },
  { name: 'Atividades', href: '/cadastros/atividades', icon: ListChecks },
  { name: 'Logs de Auditoria', href: '/cadastros/logs-auditoria', icon: History },
];

export function CadastrosLayout({ children, title, icon = Database }: CadastrosLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} size="sm" />
      </div>
      {children}
    </PageLayout>
  );
}
