import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: number | string
  icon: React.ReactNode
  bgClass: string
  iconClass?: string
  textClass?: string
}

export function StatCard({
  title,
  value,
  icon,
  bgClass,
  iconClass = "opacity-80",
  textClass = "text-white",
  className,
  ...props
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "rounded-lg border shadow-sm", 
        bgClass,
        textClass,
        className
      )} 
      {...props}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={iconClass}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
} 