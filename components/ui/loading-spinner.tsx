import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "muted" | "contrast"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", variant = "contrast", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2", 
      lg: "h-8 w-8 border-3"
    }

    const variantClasses = {
      default: "border-gray-300 border-t-gray-600",
      primary: "border-blue-200 border-t-blue-600",
      muted: "border-gray-200 border-t-gray-400",
      contrast: "border-gray-300 border-t-blue-600 drop-shadow-sm"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }