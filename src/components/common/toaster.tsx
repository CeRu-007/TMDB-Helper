"use client"

import { useToast } from "@/components/common/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/common/toast"
import { AlarmClock, CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, icon, variant, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3">
              {/* 图标槽：优先使用传入的 icon；否则按 variant 映射默认图标 */}
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {icon ? (
                  icon
                ) : variant === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : variant === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : variant === 'destructive' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Info className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle className="text-sm font-semibold tracking-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-[13px] leading-relaxed text-muted-foreground">{description}</ToastDescription>
                )}
                {action && (
                  <div className="pt-1">{action}</div>
                )}
              </div>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
