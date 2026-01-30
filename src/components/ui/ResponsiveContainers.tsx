import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveCardGridProps {
  children: React.ReactNode
  className?: string
  /** Maximum columns on extra-large containers (default: 4) */
  cols?: 2 | 3 | 4 | 5 | 6
}

/**
 * Responsive grid for stats cards using CSS Container Queries.
 * Responds to container width, not viewport width.
 * Works correctly in Mobile Preview and embedded iframes.
 */
export function ResponsiveCardGrid({ 
  children, 
  className,
  cols = 4 
}: ResponsiveCardGridProps) {
  return (
    <div className="responsive-card-container w-full">
      <div className={cn(
        "responsive-card-grid", 
        `responsive-card-grid--cols-${cols}`,
        className
      )}>
        {children}
      </div>
    </div>
  )
}

interface ResponsiveFilterGridProps {
  children: React.ReactNode
  className?: string
  /** Maximum columns on extra-large containers (default: 4) */
  cols?: 2 | 3 | 4 | 5 | 6
}

/**
 * Responsive grid for filter inputs using CSS Container Queries.
 * Responds to container width, not viewport width.
 * Use `col-span-full` class on children that should span full width.
 */
export function ResponsiveFilterGrid({ 
  children, 
  className,
  cols = 4 
}: ResponsiveFilterGridProps) {
  return (
    <div className="responsive-filter-container w-full">
      <div className={cn(
        "responsive-filter-grid",
        `responsive-filter-grid--cols-${cols}`,
        className
      )}>
        {children}
      </div>
    </div>
  )
}

interface ResponsiveTableContainerProps {
  children: React.ReactNode
  className?: string
}

/**
 * Container for tables with always-visible horizontal scroll.
 * Wraps the Table component to ensure scroll works on touch devices.
 */
export function ResponsiveTableContainer({ 
  children, 
  className 
}: ResponsiveTableContainerProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border", className)}>
      <div className="overflow-x-auto scrollbar-visible">
        {children}
      </div>
    </div>
  )
}
