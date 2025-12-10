import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/80 backdrop-blur-sm text-primary-foreground hover:bg-primary/70",
        secondary: "border-transparent bg-secondary/70 backdrop-blur-sm text-secondary-foreground hover:bg-secondary/60",
        destructive: "border-transparent bg-destructive/80 backdrop-blur-sm text-destructive-foreground hover:bg-destructive/70",
        outline: "border-input bg-background/40 backdrop-blur-sm text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
