import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GlobalSearch } from '@/components/layout/GlobalSearch';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  return (
    <header className={cn("bg-background/95 backdrop-blur-sm sticky top-0 z-30 border-b", className)}>
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <GlobalSearch />
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationBell />
          
          <Avatar className="h-9 w-9 transition-transform duration-200 hover:scale-105">
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
