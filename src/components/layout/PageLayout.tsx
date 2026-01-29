import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { useSidebarState } from '@/hooks/useSidebarState';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function PageLayout({ children, title }: PageLayoutProps) {
  const [isSidebarCollapsed, toggleSidebar] = useSidebarState(false);
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-64 xl:ml-72"
      )}>
        <Navbar />
        
        <main className="flex-1 transition-all duration-300">
          <div className="w-full max-w-full p-3 sm:p-4 lg:p-6 xl:p-8 2xl:p-10 animate-fade-in">
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center border border-border">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{title}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
