"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, Play, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react"
import type { TMDBItem } from "@/types/tmdb-item"
import type { ScheduleTask, ScheduleLog } from "@/types/schedule"
import { getCronDescription, getNextRunTime, getTimeFromCron } from "@/lib/utils/cron-utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/shared/components/ui/drawer"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"

interface ScheduleDrawerProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenDetailSchedule?: () => void
}

export function ScheduleDrawer({ item, open, onOpenChange, onOpenDetailSchedule }: ScheduleDrawerProps) {
  const [task, setTask] = useState<ScheduleTask | null>(null)
  const [latestLog, setLatestLog] = useState<ScheduleLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)

  const loadTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/schedule/tasks?itemId=${item.id}`)
      const data = await response.json()

      if (data.success && data.data) {
        setTask(data.data)

        const logsResponse = await fetch(`/api/schedule/logs?taskId=${data.data.id}&limit=1`)
        const logsData = await logsResponse.json()
        if (logsData.success && logsData.data.length > 0) {
          setLatestLog(logsData.data[0])
        }
      } else {
        setTask(null)
      }
    } catch (error) {
      console.error("[ScheduleDrawer] 加载任务失败:", error)
    } finally {
      setLoading(false)
    }
  }, [item.id])

  useEffect(() => {
    if (open) {
      loadTask()
    }
  }, [open, loadTask])

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!task) return

    try {
      const response = await fetch("/api/schedule/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, enabled }),
      })

      const data = await response.json()
      if (data.success && data.data) {
        setTask(data.data)
      }
    } catch (error) {
      console.error("[ScheduleDrawer] 更新任务失败:", error)
    }
  }

  const handleExecute = async () => {
    if (!task) return

    setExecuting(true)
    try {
      await fetch("/api/schedule/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })

      await loadTask()
    } catch (error) {
      console.error("[ScheduleDrawer] 执行失败:", error)
    } finally {
      setExecuting(false)
    }
  }

  const handleOpenDetail = () => {
    if (onOpenDetailSchedule) {
      onOpenDetailSchedule()
    }
    onOpenChange(false)
  }

  if (loading) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>定时任务</DrawerTitle>
          </DrawerHeader>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            定时任务
          </DrawerTitle>
          <DrawerDescription>
            {item.title}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {!task ? (
            <div className="text-center py-4 text-muted-foreground">
              <p className="mb-2">尚未配置定时任务</p>
              <Button variant="outline" size="sm" onClick={handleOpenDetail}>
                去配置
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label>启用定时任务</Label>
                <Switch
                  checked={task.enabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>

              {task.enabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">执行时间</Label>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        ⚙ {getTimeFromCron(task.cron)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getCronDescription(task.cron)}
                    </p>
                  </div>

                  {task.nextRunAt && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">下次执行</Label>
                      <p className="text-sm">{getNextRunTime(task.cron)}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-muted-foreground">最近执行</Label>
                    <div className="flex items-center space-x-2">
                      {latestLog?.status === "success" && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">成功</span>
                        </>
                      )}
                      {latestLog?.status === "failed" && (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm">失败</span>
                        </>
                      )}
                      {latestLog?.status === "running" && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-sm">执行中</span>
                        </>
                      )}
                      {!latestLog && (
                        <span className="text-sm text-muted-foreground">暂无记录</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DrawerFooter className="flex flex-row gap-2">
          {task && task.enabled && (
            <Button
              onClick={handleExecute}
              disabled={executing}
              className="flex-1"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              立即执行
            </Button>
          )}
          <Button variant="outline" onClick={handleOpenDetail} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            详情配置
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">关闭</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
