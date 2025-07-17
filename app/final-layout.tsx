"use client"

import { useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { EnhancedDataProvider } from "@/components/enhanced-client-data-provider"
import { Toaster } from "@/components/ui/toaster"
import { taskScheduler } from "@/lib/scheduler"

export default function FinalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 初始化任务调度器
  useEffect(() => {
    taskScheduler.initialize()
      .then(() => console.log("任务调度器初始化完成"))
      .catch(error => console.error("任务调度器初始化失败:", error))
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <EnhancedDataProvider>
        {children}
        <Toaster />
      </EnhancedDataProvider>
    </ThemeProvider>
  )
} 