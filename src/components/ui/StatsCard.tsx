import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  className,
  valueClassName,
  onClick,
}: StatsCardProps) {
  const formattedTrend = trend !== undefined ? (trend > 0 ? `+${trend.toFixed(2)}%` : `${trend.toFixed(2)}%`) : null;
  const isTrendPositive = trend !== undefined ? trend > 0 : null;
  
  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-md overflow-hidden",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10">
              <div className="h-5 w-5 text-primary">{icon}</div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold truncate", valueClassName)}>{value}</p>
            
            {(description || trend !== undefined || trendLabel) && (
              <div className="flex items-center text-xs mt-1">
                {trend !== undefined && (
                  <span className={cn(
                    "inline-flex items-center mr-1",
                    isTrendPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {isTrendPositive ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                    {formattedTrend}
                  </span>
                )}
                {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
                {description && (
                  <p className={cn("text-muted-foreground", trend !== undefined ? "ml-2" : "")}>
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
