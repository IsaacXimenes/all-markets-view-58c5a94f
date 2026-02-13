import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function PageLayout({ children, title }: PageLayoutProps) {
  const [isSidebarCollapsed, toggleSidebar] = useSidebarState(false);
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="page-layout-wrapper">
      <div className="min-h-screen flex overflow-x-hidden">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={toggleSidebar}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className={cn(
          "page-main-content flex-1 flex flex-col transition-all duration-300 min-w-0",
          isMobile ? "ml-0" : (isSidebarCollapsed ? "ml-16" : "ml-64 xl:ml-72")
        )}>
          <Navbar 
            isMobile={isMobile}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
          
          <main className="flex-1 transition-all duration-300 overflow-x-hidden">
            <div className="w-full max-w-full p-3 sm:p-4 lg:p-6 xl:p-8 2xl:p-10 animate-fade-in">
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center border border-border">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{title}</h1>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
