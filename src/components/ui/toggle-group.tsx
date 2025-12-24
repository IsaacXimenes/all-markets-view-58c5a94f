import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

interface ToggleGroupContextValue extends VariantProps<typeof toggleVariants> {
  value?: string | string[]
  onValueChange?: (value: string) => void
  type?: "single" | "multiple"
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
})

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleVariants> {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, variant, size, children, type = "single", value, defaultValue, onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(defaultValue ?? (type === "multiple" ? [] : ""))
    const currentValue = value ?? internalValue

    const handleValueChange = React.useCallback((itemValue: string) => {
      if (type === "multiple") {
        const currentArray = Array.isArray(currentValue) ? currentValue : []
        const newValue = currentArray.includes(itemValue)
          ? currentArray.filter(v => v !== itemValue)
          : [...currentArray, itemValue]
        setInternalValue(newValue)
        onValueChange?.(newValue)
      } else {
        const newValue = currentValue === itemValue ? "" : itemValue
        setInternalValue(newValue)
        onValueChange?.(newValue)
      }
    }, [currentValue, type, onValueChange])

    return (
      <div
        ref={ref}
        role="group"
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        <ToggleGroupContext.Provider value={{ variant, size, value: currentValue, onValueChange: handleValueChange, type }}>
          {children}
        </ToggleGroupContext.Provider>
      </div>
    )
  }
)

ToggleGroup.displayName = "ToggleGroup"

export interface ToggleGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleVariants> {
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, variant, size, value, onClick, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    
    const isPressed = context.type === "multiple"
      ? Array.isArray(context.value) && context.value.includes(value)
      : context.value === value

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      context.onValueChange?.(value)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isPressed}
        aria-pressed={isPressed}
        data-state={isPressed ? "on" : "off"}
        onClick={handleClick}
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
