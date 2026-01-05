import React, { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Clock, History } from 'lucide-react';

interface GarantiasLayoutProps {
  children: ReactNode;
  title?: string;
}

export function GarantiasLayout({ children, title }: GarantiasLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const getCurrentTab = () => {
    if (location.pathname.includes('/em-andamento')) return 'em-andamento';
    if (location.pathname.includes('/historico')) return 'historico';
    return 'nova';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'nova':
        navigate('/garantias/nova');
        break;
      case 'em-andamento':
        navigate('/garantias/em-andamento');
        break;
      case 'historico':
        navigate('/garantias/historico');
        break;
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        <Navbar />
        
        <main className="flex-1 transition-all duration-300 overflow-auto">
          <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
            {/* Header com título e tabs */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{title || 'Garantias'}</h1>
                  <p className="text-sm text-muted-foreground">Gerenciamento de garantias e tratativas</p>
                </div>
              </div>
              
              <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="nova" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Garantia
                  </TabsTrigger>
                  <TabsTrigger value="em-andamento" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Em Andamento
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
