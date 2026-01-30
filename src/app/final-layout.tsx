"use client"

import { useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/shared/components/client-data-provider"
import { Toaster } from "@/shared/components/ui/toaster"
import { taskScheduler } from "@/lib/data/task-scheduler"
import { logger } from "@/lib/utils/logger"

export default function FinalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 初始化任务调度器
  useEffect(() => {
    taskScheduler.initialize()
      .then(() => logger.info('[TaskScheduler] 任务调度器初始化完成'))
      .catch(error => logger.error('[TaskScheduler] 任务调度器初始化失败', error))
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </ThemeProvider>
  )
} 