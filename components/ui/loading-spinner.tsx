import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "white"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", variant = "primary", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-[2px]",
      md: "h-5 w-5 border-[2px]", 
      lg: "h-6 w-6 border-[3px]"
    }

    const variantClasses = {
      default: "border-gray-300 border-t-blue-600",
      primary: "border-blue-200 border-t-blue-600",
      white: "border-white/30 border-t-white"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full inline-block",
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