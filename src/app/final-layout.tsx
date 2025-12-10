"use client"

import { useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { DataProvider } from "@/components/features/auth/client-data-provider"
import { Toaster } from "@/components/common/toaster"
import { taskScheduler } from "@/lib/data/scheduler"

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
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </ThemeProvider>
  )
} 