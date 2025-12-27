import { Link, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';
import { History, Plus, Smartphone, ClipboardList, Headphones } from 'lucide-react';

interface VendasLayoutProps {
  children: React.ReactNode;
  title: string;
}

// Mock: verificar permissões do usuário logado
const usuarioLogadoId = 'COL-007'; // Simulando usuário com permissão Digital
const temPermissaoDigital = true; // Em produção: verificar via API
const temPermissaoFinalizador = true; // Em produção: verificar via API

export function VendasLayout({ children, title }: VendasLayoutProps) {
  const location = useLocation();
  
  const baseTabs = [
    { name: 'Histórico de Vendas', href: '/vendas', icon: History },
    { name: 'Nova Venda', href: '/vendas/nova', icon: Plus },
    { name: 'Vendas - Acessórios', href: '/vendas/acessorios', icon: Headphones },
  ];

  const digitalTabs = temPermissaoDigital ? [
    { name: 'Nova Venda - Digital', href: '/vendas/nova-digital', icon: Smartphone },
  ] : [];

  const finalizadorTabs = temPermissaoFinalizador ? [
    { name: 'Pendentes Digitais', href: '/vendas/pendentes-digitais', icon: ClipboardList },
  ] : [];

  const tabs = [...baseTabs, ...digitalTabs, ...finalizadorTabs];

  return (
    <PageLayout title={title}>
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
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
