"use client"

import { useEffect } from "react"
import { taskScheduler } from "@/lib/data/scheduler"

export default function ClientLayout({
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

  return <>{children}</>
}
