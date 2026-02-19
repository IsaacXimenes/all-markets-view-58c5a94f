import { PageLayout } from '@/components/layout/PageLayout';
import { CarouselTabsNavigation } from '@/components/layout/CarouselTabsNavigation';
import { ClipboardCheck, History, Camera, BarChart3, ListChecks } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface GestaoAdministrativaLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

const tabs = [
  { name: 'Conferência Diária', href: '/gestao-administrativa', icon: ClipboardCheck },
  { name: 'Logs de Auditoria', href: '/gestao-administrativa/logs', icon: History },
  { name: 'Lotes de Stories', href: '/gestao-administrativa/stories', icon: Camera },
  { name: 'Indicadores', href: '/gestao-administrativa/indicadores', icon: BarChart3 },
  { name: 'Atividades Gestores', href: '/gestao-administrativa/atividades', icon: ListChecks },
];

export function GestaoAdministrativaLayout({ children, title, icon = ClipboardCheck }: GestaoAdministrativaLayoutProps) {
  return (
    <PageLayout title={title} icon={icon}>
      <div className="mb-6">
        <CarouselTabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
