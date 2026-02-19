import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useIsMobile } from '@/hooks/use-mobile';
import { LucideIcon } from 'lucide-react';
import circuitBg from '@/assets/sidebar-circuit-bg.png';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: LucideIcon;
}

export function PageLayout({ children, title, icon: Icon }: PageLayoutProps) {
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
              <div 
                className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center border-2 border-[#F7BB05] relative overflow-hidden shimmer-border-container"
                style={{ backgroundColor: '#111111' }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    backgroundImage: `url(${circuitBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.08
                  }}
                />
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 flex-shrink-0" style={{ color: '#F7BB05' }} />}
                  <h1 
                    className="text-xl sm:text-2xl lg:text-3xl font-bold golden-gradient-text"
                  >
                    {title}
                  </h1>
                </div>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
