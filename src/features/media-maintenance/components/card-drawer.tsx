"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Clock, Play, CheckCircle, XCircle, Loader2, X } from "lucide-react"
import type { TMDBItem } from "@/types/tmdb-item"
import type { ScheduleTask, ScheduleLog } from "@/types/schedule"
import { getCronDescription, getNextRunTime, getTimeFromCron } from "@/lib/utils/cron-utils"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"

interface CardDrawerProps {
  item: TMDBItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenDetailSchedule?: () => void
}

function formatExecutionTime(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${month}/${day} ${hours}:${minutes}`
}

export function CardDrawer({ item, open, onOpenChange }: CardDrawerProps) {
  const { t } = useTranslation()
  const [task, setTask] = useState<ScheduleTask | null>(null)
  const [latestLog, setLatestLog] = useState<ScheduleLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
      console.error("[CardDrawer] Load task failed:", error)
    } finally {
      setLoading(false)
    }
  }, [item.id])

  useEffect(() => {
    if (open) {
      loadTask()
    } else {
      setTask(null)
      setLatestLog(null)
      setLoading(true)
    }
  }, [open, loadTask])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (open && containerRef.current) {
        const path = event.composedPath()
        const isInsideDrawer = path.some(el => el === containerRef.current)
        if (!isInsideDrawer) {
          onOpenChange(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onOpenChange])

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
      console.error("[CardDrawer] Update task failed:", error)
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
      console.error("[CardDrawer] Execute failed:", error)
    } finally {
      setExecuting(false)
    }
  }

  if (!open) return null

  return (
    <div
      ref={containerRef}
      className="absolute top-0 right-0 bottom-0 w-72 bg-gray-900/95 backdrop-blur-md z-30 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-100">{t("schedule.scheduleManagement", { ns: "schedule" })}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-100 hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">{t("schedule.noSchedules", { ns: "schedule" })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">{t("schedule.taskEnabled", { ns: "schedule" })}</Label>
              <Switch
                checked={task.enabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>

            {task.enabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400">{t("schedule.executionTime", { ns: "schedule" })}</Label>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                      {getTimeFromCron(task.cron)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {getCronDescription(task.cron)}
                  </p>
                </div>

                {task.nextRunAt && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">{t("schedule.nextRun", { ns: "schedule" })}</Label>
                    <p className="text-xs text-gray-200">{getNextRunTime(task.cron)}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">{t("schedule.recentRun", { ns: "schedule" })}</Label>
                  {latestLog ? (
                    <div className="flex items-center justify-between bg-gray-800/50 rounded-md px-3 py-2">
                      <div className="flex items-center space-x-2">
                        {latestLog.status === "success" && (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            <span className="text-xs text-green-400">{t("schedule.success", { ns: "schedule" })}</span>
                          </>
                        )}
                        {latestLog.status === "failed" && (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-xs text-red-400">{t("schedule.failed", { ns: "schedule" })}</span>
                          </>
                        )}
                        {latestLog.status === "running" && (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span className="text-xs text-blue-400">{t("schedule.running", { ns: "schedule" })}</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatExecutionTime(latestLog.startAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-800/50 rounded-md px-3 py-2">
                      <span className="text-xs text-gray-500">{t("schedule.noLogs", { ns: "schedule" })}</span>
                      <span className="text-xs text-gray-500">--</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {task && task.enabled && (
        <div className="p-3 border-t border-gray-700">
          <Button
            onClick={handleExecute}
            disabled={executing}
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {executing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t("schedule.executeNow", { ns: "schedule" })}
          </Button>
        </div>
      )}
    </div>
  )
}