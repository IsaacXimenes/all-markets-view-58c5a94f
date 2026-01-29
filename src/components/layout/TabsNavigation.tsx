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
    <div className="relative flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 transition-opacity",
          isSmall ? "h-7 w-7" : "h-8 w-8 xl:h-9 xl:w-9",
          !canScrollLeft && "opacity-30 cursor-not-allowed"
        )}
        onClick={handleScrollLeft}
        disabled={!canScrollLeft}
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4 xl:h-5 xl:w-5")} />
      </Button>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-1 overflow-x-auto scrollbar-hide flex-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.href || location.pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap",
                isSmall ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm xl:px-5 xl:text-base",
                "font-medium",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <Icon className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4 xl:h-5 xl:w-5")} />
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
          isSmall ? "h-7 w-7" : "h-8 w-8 xl:h-9 xl:w-9",
          !canScrollRight && "opacity-30 cursor-not-allowed"
        )}
        onClick={handleScrollRight}
        disabled={!canScrollRight}
        aria-label="Rolar para direita"
      >
        <ChevronRight className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4 xl:h-5 xl:w-5")} />
      </Button>
    </div>
  );
}
