import { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Tab {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface TabsNavigationProps {
  tabs: Tab[];
  size?: 'sm' | 'default';
}

export function TabsNavigation({ tabs, size = 'default' }: TabsNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const location = useLocation();

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const element = scrollRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const isSmall = size === 'sm';

  return (
    <div className="relative flex items-center gap-1 min-w-0 max-w-full">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 transition-opacity",
          isSmall ? "h-7 w-7" : "h-7 w-7 sm:h-8 sm:w-8 xl:h-9 xl:w-9",
          !canScrollLeft && "opacity-30 cursor-not-allowed"
        )}
        onClick={handleScrollLeft}
        disabled={!canScrollLeft}
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className={cn(isSmall ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-4 sm:w-4 xl:h-5 xl:w-5")} />
      </Button>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.href || location.pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex items-center gap-1 sm:gap-2 rounded-md sm:rounded-lg transition-colors whitespace-nowrap shrink-0",
                isSmall ? "px-2 py-1 text-[11px]" : "px-2 py-1 text-[11px] sm:px-4 sm:py-2 sm:text-sm xl:px-5 xl:text-base",
                "font-medium",
                isActive
                  ? "bg-[#F7BB05]/10 text-[#F7BB05] font-semibold border border-[#F7BB05]/30"
                  : "bg-[#111111] text-[#E0E0E0] hover:bg-[#212121] border border-[#333]"
              )}
            >
              <Icon className={cn("shrink-0", isSmall ? "h-3 w-3" : "h-3 w-3 sm:h-4 sm:w-4 xl:h-5 xl:w-5")} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 transition-opacity",
          isSmall ? "h-7 w-7" : "h-7 w-7 sm:h-8 sm:w-8 xl:h-9 xl:w-9",
          !canScrollRight && "opacity-30 cursor-not-allowed"
        )}
        onClick={handleScrollRight}
        disabled={!canScrollRight}
        aria-label="Rolar para direita"
      >
        <ChevronRight className={cn(isSmall ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-4 sm:w-4 xl:h-5 xl:w-5")} />
      </Button>
    </div>
  );
}
