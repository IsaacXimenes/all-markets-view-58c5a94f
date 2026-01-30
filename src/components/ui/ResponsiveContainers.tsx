import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveCardGridProps {
  children: React.ReactNode
  className?: string
  /** Maximum columns on extra-large screens (default: 4) */
  cols?: 2 | 3 | 4 | 5 | 6
}

/**
 * Responsive grid for stats cards.
 * Always 1 column on mobile, scales up based on viewport.
 */
export function ResponsiveCardGrid({ 
  children, 
  className,
  cols = 4 
}: ResponsiveCardGridProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
  }

  return (
    <div className={cn("grid gap-3", colClasses[cols], className)}>
      {children}
    </div>
  )
}

interface ResponsiveFilterGridProps {
  children: React.ReactNode
  className?: string
  /** Maximum columns on extra-large screens (default: 4) */
  cols?: 2 | 3 | 4 | 5 | 6
}

/**
 * Responsive grid for filter inputs.
 * Always 1 column on mobile, scales up based on viewport.
 * Use `col-span-full` on children that should span full width.
 */
export function ResponsiveFilterGrid({ 
  children, 
  className,
  cols = 4 
}: ResponsiveFilterGridProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
  }

  return (
    <div className={cn("grid gap-3", colClasses[cols], className)}>
      {children}
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
