import React, { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Clock, History, Star } from 'lucide-react';

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
    if (location.pathname.includes('/extendida')) return 'extendida';
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
      case 'extendida':
        navigate('/garantias/extendida');
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
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                  <TabsTrigger value="nova" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nova Garantia</span>
                    <span className="sm:hidden">Nova</span>
                  </TabsTrigger>
                  <TabsTrigger value="em-andamento" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Em Andamento</span>
                    <span className="sm:hidden">Andamento</span>
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Histórico</span>
                    <span className="sm:hidden">Histórico</span>
                  </TabsTrigger>
                  <TabsTrigger value="extendida" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Extendida</span>
                    <span className="sm:hidden">Extendida</span>
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
