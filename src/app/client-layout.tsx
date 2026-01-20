"use client"

import { useEffect } from "react"
import { taskScheduler } from "@/lib/data/task-scheduler"
import { logger } from "@/shared/lib/utils/logger"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 初始化任务调度器
  useEffect(() => {
    taskScheduler.initialize()
      .then(() => logger.info('TaskScheduler', '任务调度器初始化完成'))
      .catch(error => logger.error('TaskScheduler', '任务调度器初始化失败', error))
  }, [])

  return <>{children}</>
}
