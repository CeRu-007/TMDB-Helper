"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Clock, Play, Loader2, Info, Terminal, Activity, Ban } from "lucide-react"
import { useTranslation } from "react-i18next"
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
import { LanguageSelector } from "@/shared/components/ui/language-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

interface ScheduleTabProps {
  item: TMDBItem
}

interface LogEntry {
  type: "stdout" | "stderr" | "info" | "success" | "error"
  message: string
  timestamp: string
}

export function ScheduleTab({ item }: ScheduleTabProps) {
  const { t } = useTranslation("schedule")
  const isCompleted = item.status === "completed"
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
  const [tmdbSeason, setTmdbSeason] = useState(1)
  const [tmdbLanguage, setTmdbLanguage] = useState("zh-CN")
  const [tmdbAutoResponse, setTmdbAutoResponse] = useState("w")
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
        setTmdbSeason(data.data.tmdbSeason || 1)
        setTmdbLanguage(data.data.tmdbLanguage || 'zh-CN')
        setTmdbAutoResponse(data.data.tmdbAutoResponse || 'w')
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
      console.error("[ScheduleTab] Failed to load task:", error)
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
      setCronDescription(t("invalidCron"))
      setNextRunTime("")
    }
  }

  const handleSave = async () => {
    if (!isValidCron) return

    setSaving(true)
    try {
      const method = task ? "PUT" : "POST"
      const body = task
        ? { id: task.id, cron: cronInput, enabled, headless, incremental, autoImport, tmdbSeason, tmdbLanguage, tmdbAutoResponse, fieldCleanup }
        : { itemId: item.id, cron: cronInput, enabled, headless, incremental, autoImport, tmdbSeason, tmdbLanguage, tmdbAutoResponse, fieldCleanup }

      const response = await fetch("/api/schedule/tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success && data.data) {
        setTask(data.data)
        addLog("success", t("configSaved"))
      } else {
        addLog("error", `${t("saveFailed")}: ${data.error}`)
      }
    } catch (error) {
      console.error("[ScheduleTab] Failed to save:", error)
      addLog("error", t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleExecute = async () => {
    setExecuting(true)
    setTerminalLogs([])
    addLog("info", t("startExecution"))

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
        addLog("error", result.error || t("executionFailed"))
      }

      await loadTask()
    } catch (error) {
      console.error("[ScheduleTab] Execution failed:", error)
      addLog("error", t("executionFailed"))
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
    currentTime: new Date(),
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
                  <Label>{t("enableSchedule")}</Label>
                </div>
                <Switch checked={isCompleted ? false : enabled} onCheckedChange={setEnabled} disabled={isCompleted} />
              </div>

              {isCompleted && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-muted-foreground text-xs">
                  <Ban className="h-4 w-4 flex-shrink-0" />
                  <span>{t("completedItemDisabled")}</span>
                </div>
              )}

              {enabled && !isCompleted && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cron">{t("executionTime")}</Label>
                    <Input
                      id="cron"
                      value={cronInput}
                      onChange={(e) => handleCronChange(e.target.value)}
                      placeholder="0 2 * * *"
                      className={!isValidCron ? "border-red-500" : ""}
                    />
                    {!isValidCron && (
                      <p className="text-xs text-red-500">{t("invalidCron")}</p>
                    )}
                    {isValidCron && cronDescription && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        {cronDescription}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("smartRecommend")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecommendationClick(rec.cron)}
                          className="text-xs h-7"
                          title={rec.descriptionKey ? t(rec.descriptionKey, { time: rec.description, day: rec.weekday || '' }) : rec.description}
                        >
                          {rec.labelKey ? t(rec.labelKey) : rec.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {nextRunTime && (
                    <div className="flex items-center justify-between py-3 border-t border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("nextRun")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{nextRunTime}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{cronDescription}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("runMode")}</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!headless ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHeadless(false)}
                        className={`flex-1 h-7 text-xs ${!headless ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        <Terminal className="h-3 w-3 mr-1" />
                        {t("foreground")}
                      </Button>
                      <Button
                        type="button"
                        variant={headless ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHeadless(true)}
                        className={`flex-1 h-7 text-xs ${headless ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        {t("background")}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {headless ? t("backgroundTip") : t("foregroundTip")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="autoImport">{t("autoImportTmdb")}</Label>
                    </div>
                    <Switch id="autoImport" checked={autoImport} onCheckedChange={setAutoImport} />
                  </div>

                  {autoImport && (
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      <div className="flex flex-row items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">{t("season")}</span>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={tmdbSeason}
                            onChange={(e) => setTmdbSeason(parseInt(e.target.value) || 1)}
                            className="w-12 h-7 text-xs"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label className="text-xs">{t("language")}</Label>
                          <LanguageSelector
                            value={tmdbLanguage}
                            onChange={setTmdbLanguage}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label className="text-xs">{t("overview")}</Label>
                          <Select value={tmdbAutoResponse} onValueChange={setTmdbAutoResponse}>
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="w">{t("wait")}</SelectItem>
                              <SelectItem value="y">{t("overwrite")}</SelectItem>
                              <SelectItem value="n">{t("skip")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="incremental">{t("incrementalUpdate")}</Label>
                    </div>
                    <Switch id="incremental" checked={incremental} onCheckedChange={setIncremental} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {incremental ? t("incrementalTip") : t("fullUpdateTip")}
                  </p>

                  <div className="space-y-2">
                    <Label>{t("fieldCleanup")}</Label>
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
          <Button onClick={handleSave} disabled={saving || !isValidCron || isCompleted} className="flex-1 h-8 text-xs">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {t("saveConfig")}
          </Button>
          {task && (
            <Button
              onClick={handleExecute}
              disabled={executing || isCompleted}
              variant="outline"
              className="flex-1 h-8 text-xs"
            >
              {executing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              {t("executeNow")}
            </Button>
          )}
        </div>
      </div>

      <div className="w-1/2 h-full">
        <Card variant="frosted" className="h-full flex flex-col">
          <CardHeader className="py-2 flex-shrink-0">
            <CardTitle className="text-sm flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              {t("executionLogs")}
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
                  <p>{t("waitingForExecution")}</p>
                  <p className="mt-2">{t("clickToExecute")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}