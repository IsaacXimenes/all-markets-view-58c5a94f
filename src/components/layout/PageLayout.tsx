import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function PageLayout({ children, title }: PageLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isSidebarCollapsed ? "ml-16" : "ml-64")}>
        <Navbar />
        
        <main className="flex-1 transition-all duration-300">
          <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
            <div className="bg-muted/30 rounded-lg p-4 mb-6 text-center border border-border">
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
