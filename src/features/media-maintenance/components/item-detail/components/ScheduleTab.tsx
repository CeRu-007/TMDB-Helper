"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Clock, Play, Loader2, Info, Terminal, Activity } from "lucide-react"
import type { TMDBItem } from "@/types/tmdb-item"
import type { ScheduleTask, ScheduleLog, FieldCleanup } from "@/types/schedule"
import { getCronDescription, getNextRunTime, validateCronExpression, getRecommendations } from "@/lib/utils/cron-utils"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"

interface ScheduleTabProps {
  item: TMDBItem
}

interface LogEntry {
  type: "stdout" | "stderr" | "info" | "success" | "error"
  message: string
  timestamp: string
}

export function ScheduleTab({ item }: ScheduleTabProps) {
  const [task, setTask] = useState<ScheduleTask | null>(null)
  const [logs, setLogs] = useState<ScheduleLog[]>([])
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [cronInput, setCronInput] = useState("")
  const [cronDescription, setCronDescription] = useState("")
  const [nextRunTime, setNextRunTime] = useState("")
  const [isValidCron, setIsValidCron] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [headless, setHeadless] = useState(true)
  const [incremental, setIncremental] = useState(true)
  const [autoImport, setAutoImport] = useState(false)
  const [fieldCleanup, setFieldCleanup] = useState<FieldCleanup>({
    name: false,
    air_date: false,
    runtime: false,
    overview: false,
    backdrop: false,
  })
  const terminalRef = useRef<HTMLDivElement>(null)
  const isUserScrolling = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      { type, message, timestamp: new Date().toLocaleTimeString() },
    ])
  }, [])

  const loadTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/schedule/tasks?itemId=${item.id}`)
      const data = await response.json()

      if (data.success && data.data) {
        setTask(data.data)
        setCronInput(data.data.cron)
        setCronDescription(getCronDescription(data.data.cron))
        setNextRunTime(getNextRunTime(data.data.cron))
        setIsValidCron(validateCronExpression(data.data.cron))
        setEnabled(data.data.enabled)
        setHeadless(data.data.headless)
        setIncremental(data.data.incremental)
        setAutoImport(data.data.autoImport)
        setFieldCleanup(data.data.fieldCleanup)

        const logsResponse = await fetch(`/api/schedule/logs?taskId=${data.data.id}&limit=10`)
        const logsData = await logsResponse.json()
        if (logsData.success) {
          setLogs(logsData.data)
        }
      } else {
        setCronInput("0 2 * * *")
        setCronDescription(getCronDescription("0 2 * * *"))
        setNextRunTime(getNextRunTime("0 2 * * *"))
      }
    } catch (error) {
      console.error("[ScheduleTab] 加载任务失败:", error)
    } finally {
      setLoading(false)
    }
  }, [item.id])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  useEffect(() => {
    if (!terminalRef.current) return

    const handleScroll = () => {
      if (!terminalRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      if (!isAtBottom) {
        isUserScrolling.current = true
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrolling.current = false
        }, 3000)
      } else {
        isUserScrolling.current = false
      }
    }

    const terminal = terminalRef.current
    terminal.addEventListener("scroll", handleScroll)
    return () => {
      terminal.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current && !isUserScrolling.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLogs])

  const handleCronChange = (value: string) => {
    setCronInput(value)
    const valid = validateCronExpression(value)
    setIsValidCron(valid)
    if (valid) {
      setCronDescription(getCronDescription(value))
      setNextRunTime(getNextRunTime(value))
    } else {
      setCronDescription("无效的 Cron 表达式")
      setNextRunTime("")
    }
  }

  const handleSave = async () => {
    if (!isValidCron) return

    setSaving(true)
    try {
      const method = task ? "PUT" : "POST"
      const body = task
        ? { id: task.id, cron: cronInput, enabled, headless, incremental, autoImport, fieldCleanup }
        : { itemId: item.id, cron: cronInput, enabled, headless, incremental, autoImport, fieldCleanup }

      const response = await fetch("/api/schedule/tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success && data.data) {
        setTask(data.data)
        addLog("success", "配置已保存")
      }
    } catch (error) {
      console.error("[ScheduleTab] 保存失败:", error)
      addLog("error", "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleExecute = async () => {
    setExecuting(true)
    setTerminalLogs([])
    addLog("info", "开始执行定时任务...")

    try {
      const response = await fetch("/api/schedule/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })

      const result = await response.json()

      if (result.success) {
        addLog("success", result.message)
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach((log: { type: string; message: string }) => {
            addLog(log.type as LogEntry["type"], log.message)
          })
        }
      } else {
        addLog("error", result.error || "执行失败")
      }

      await loadTask()
    } catch (error) {
      console.error("[ScheduleTab] 执行失败:", error)
      addLog("error", "执行失败")
    } finally {
      setExecuting(false)
    }
  }

  const handleRecommendationClick = (cron: string) => {
    handleCronChange(cron)
  }

  const recommendations = getRecommendations({
    weekday: item.weekday,
    secondWeekday: item.secondWeekday,
    airTime: item.airTime,
    isDailyUpdate: item.isDailyUpdate,
  })

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "stdout":
        return "text-green-400"
      case "stderr":
        return "text-red-400"
      case "success":
        return "text-green-400"
      case "error":
        return "text-red-400"
      default:
        return "text-blue-400"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-row gap-4 h-full min-h-[400px] p-1">
      <div className="w-1/2 flex flex-col h-full overflow-hidden rounded-lg">
        <div className="flex-1 min-h-0 pr-2 pb-2 overflow-hidden rounded-lg">
          <Card variant="frosted" className="h-full overflow-hidden">
            <CardContent className="h-full overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <Label>启用定时任务</Label>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              {enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cron">执行时间 (Cron)</Label>
                    <Input
                      id="cron"
                      value={cronInput}
                      onChange={(e) => handleCronChange(e.target.value)}
                      placeholder="0 2 * * *"
                      className={!isValidCron ? "border-red-500" : ""}
                    />
                    {!isValidCron && (
                      <p className="text-xs text-red-500">无效的 Cron 表达式</p>
                    )}
                    {isValidCron && cronDescription && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        {cronDescription}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>智能推荐</Label>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecommendationClick(rec.cron)}
                          className="text-xs h-7"
                        >
                          {rec.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {nextRunTime && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">下次执行: {nextRunTime}</Badge>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>运行模式</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!headless ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHeadless(false)}
                        className={`flex-1 h-7 text-xs ${!headless ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        <Terminal className="h-3 w-3 mr-1" />
                        前台
                      </Button>
                      <Button
                        type="button"
                        variant={headless ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHeadless(true)}
                        className={`flex-1 h-7 text-xs ${headless ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        后台
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {headless ? "浏览器后台运行，性能更好" : "浏览器窗口可见，适合调试"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="autoImport">自动导入 TMDB</Label>
                    </div>
                    <Switch id="autoImport" checked={autoImport} onCheckedChange={setAutoImport} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="incremental">增量更新</Label>
                    </div>
                    <Switch id="incremental" checked={incremental} onCheckedChange={setIncremental} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {incremental ? "仅处理新集数，保留已有数据" : "全量更新，处理所有集数"}
                  </p>

                  <div className="space-y-2">
                    <Label>字段清理</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cleanup-name"
                          checked={fieldCleanup.name}
                          onCheckedChange={(checked) =>
                            setFieldCleanup({ ...fieldCleanup, name: checked === true })
                          }
                        />
                        <Label htmlFor="cleanup-name" className="text-sm font-normal">name</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cleanup-air_date"
                          checked={fieldCleanup.air_date}
                          onCheckedChange={(checked) =>
                            setFieldCleanup({ ...fieldCleanup, air_date: checked === true })
                          }
                        />
                        <Label htmlFor="cleanup-air_date" className="text-sm font-normal">air_date</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cleanup-runtime"
                          checked={fieldCleanup.runtime}
                          onCheckedChange={(checked) =>
                            setFieldCleanup({ ...fieldCleanup, runtime: checked === true })
                          }
                        />
                        <Label htmlFor="cleanup-runtime" className="text-sm font-normal">runtime</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cleanup-overview"
                          checked={fieldCleanup.overview}
                          onCheckedChange={(checked) =>
                            setFieldCleanup({ ...fieldCleanup, overview: checked === true })
                          }
                        />
                        <Label htmlFor="cleanup-overview" className="text-sm font-normal">overview</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cleanup-backdrop"
                          checked={fieldCleanup.backdrop}
                          onCheckedChange={(checked) =>
                            setFieldCleanup({ ...fieldCleanup, backdrop: checked === true })
                          }
                        />
                        <Label htmlFor="cleanup-backdrop" className="text-sm font-normal">backdrop</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2 px-1 py-2 flex-shrink-0">
          <Button onClick={handleSave} disabled={saving || !isValidCron} className="flex-1 h-8 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            保存配置
          </Button>
          {task && (
            <Button
              onClick={handleExecute}
              disabled={executing}
              variant="outline"
              className="flex-1 h-8 text-xs"
            >
              {executing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              立即执行
            </Button>
          )}
        </div>
      </div>

      <div className="w-1/2 h-full">
        <Card variant="frosted" className="h-full flex flex-col">
          <CardHeader className="py-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              执行日志
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 px-3 pb-3">
            <div
              ref={terminalRef}
              className="bg-gray-900/90 backdrop-blur-md rounded-lg font-mono text-xs h-full overflow-y-auto"
              style={{ lineHeight: "1.6" }}
            >
              {terminalLogs.length > 0 ? (
                <div className="p-3 space-y-1">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className={`flex gap-2 ${getLogColor(log.type)}`}>
                      <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                      <span className="whitespace-pre-wrap break-all">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-gray-400">
                  <p>等待执行任务...</p>
                  <p className="mt-2">点击&quot;立即执行&quot;开始运行定时任务</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}