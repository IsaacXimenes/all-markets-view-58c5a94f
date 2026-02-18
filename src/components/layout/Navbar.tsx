import React from 'react';
import { User, Menu, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { useAuthStore } from '@/store/authStore';
import circuitBg from '@/assets/sidebar-circuit-bg.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  className?: string;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export function Navbar({ className, isMobile, onMenuClick }: NavbarProps) {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={cn(
      "bg-[#111111] sticky top-0 z-30 border-b border-[#222222] relative overflow-hidden",
      className
    )}>
      {/* Circuit pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${circuitBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.08,
        }}
      />

      <div className="container flex items-center justify-between h-16 px-4 relative z-10">
        <div className="flex items-center gap-2 lg:gap-4">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onMenuClick}
              className="shrink-0 text-white hover:text-[#F7BB05] hover:bg-white/5"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          )}
          <GlobalSearch />
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-9 w-9 transition-transform duration-200 hover:scale-105 cursor-pointer border border-[#333]">
                  <AvatarFallback className="bg-[#F7BB05]/15 text-[#F7BB05]">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
