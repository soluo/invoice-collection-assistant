import * as React from "react"

import { cn } from "@/lib/utils"

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-full items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      {...props}
    />
  )
)
InputGroup.displayName = "InputGroup"

const InputGroupAddon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("flex items-center bg-muted px-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex-1 border-0 bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
InputGroupInput.displayName = "InputGroupInput"

export { InputGroup, InputGroupAddon, InputGroupInput }
