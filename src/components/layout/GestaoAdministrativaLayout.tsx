import { PageLayout } from '@/components/layout/PageLayout';
import { TabsNavigation } from '@/components/layout/TabsNavigation';
import { ClipboardCheck, History, Camera, BarChart3 } from 'lucide-react';

interface GestaoAdministrativaLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { name: 'Conferência Diária', href: '/gestao-administrativa', icon: ClipboardCheck },
  { name: 'Logs de Auditoria', href: '/gestao-administrativa/logs', icon: History },
  { name: 'Lotes de Stories', href: '/gestao-administrativa/stories', icon: Camera },
  { name: 'Indicadores Stories', href: '/gestao-administrativa/stories/indicadores', icon: BarChart3 },
];

export function GestaoAdministrativaLayout({ children, title }: GestaoAdministrativaLayoutProps) {
  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <TabsNavigation tabs={tabs} />
      </div>
      {children}
    </PageLayout>
  );
}
