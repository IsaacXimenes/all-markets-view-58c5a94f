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

interface CarouselTabsNavigationProps {
  tabs: Tab[];
  size?: 'sm' | 'default';
}

export function CarouselTabsNavigation({ tabs, size = 'default' }: CarouselTabsNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
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
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [location.pathname]);

  const isSmall = size === 'sm';

  return (
    <div className="relative flex items-center gap-1">
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", isSmall ? "h-7 w-7" : "h-8 w-8")}
          onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.href || (tab.href !== tabs[0]?.href && location.pathname.startsWith(tab.href + '/'));
          return (
            <Link
              key={tab.href}
              to={tab.href}
              ref={isActive ? activeTabRef : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-lg whitespace-nowrap transition-colors",
                isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
                isActive
                  ? "bg-[#F7BB05] text-black font-semibold border border-[#F7BB05]"
                  : "bg-[#111111] text-[#E0E0E0] hover:bg-[#212121] border border-[#333]"
              )}
            >
              <Icon className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", isSmall ? "h-7 w-7" : "h-8 w-8")}
          onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          aria-label="Rolar para direita"
        >
          <ChevronRight className={cn(isSmall ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
      )}
    </div>
  );
}
