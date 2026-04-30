"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCircle2, XCircle, Clock, Trash2, ChevronDown, ChevronRight, Search, Trash, ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import type { TaskJournal } from "@/types/task-journal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Input } from "@/shared/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs"
import { realtimeSyncManager } from "@/lib/data/realtime-sync-manager"
import { useUIStore } from "@/stores/ui-store"

interface TaskJournalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GroupedJournals {
  [itemId: string]: {
    itemTitle: string
    entries: TaskJournal[]
  }
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  } catch {
    return isoString
  }
}

function formatDuration(startAt: string, endAt: string | null): string {
  if (!endAt) return ''
  try {
    const start = new Date(startAt).getTime()
    const end = new Date(endAt).getTime()
    const diff = Math.round((end - start) / 1000)
    if (diff < 60) return `${diff}秒`
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`
    return `${Math.floor(diff / 3600)}时${Math.floor((diff % 3600) / 60)}分`
  } catch {
    return ''
  }
}

export function TaskJournalDialog({ open, onOpenChange }: TaskJournalDialogProps) {
  const { t } = useTranslation("journal")
  const [entries, setEntries] = useState<TaskJournal[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const setJournalUnreadCount = useUIStore((s) => s.setJournalUnreadCount)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("limit", "100")

      const response = await fetch(`/api/journal?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        const loadedEntries = data.data || []
        setEntries(loadedEntries)
        const serverUnread = data.meta?.unreadCount || 0
        setUnreadCount(serverUnread)
        setJournalUnreadCount(serverUnread)

        if (loadedEntries.length > 0 && loadedEntries.some((e: TaskJournal) => !e.read)) {
          markAllAsRead()
        }
      }
    } catch (error) {
      console.error("[TaskJournalDialog] Failed to load entries:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (open) {
      loadEntries()
    }
  }, [open, loadEntries])

  useEffect(() => {
    if (!open) return

    const handleJournalUpdate = () => {
      loadEntries()
    }

    realtimeSyncManager.addEventListener('journal_updated', handleJournalUpdate)
    return () => {
      realtimeSyncManager.removeEventListener('journal_updated', handleJournalUpdate)
    }
  }, [open, loadEntries])

  const markAllAsRead = async () => {
    try {
      await fetch('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      setEntries(prev => prev.map(e => ({ ...e, read: true })))
      setUnreadCount(0)
      setJournalUnreadCount(0)
    } catch (error) {
      console.error("[TaskJournalDialog] Failed to mark all as read:", error)
    }
  }

  const handleDeleteGroup = async (itemId: string) => {
    try {
      await fetch(`/api/journal?itemId=${itemId}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.itemId !== itemId))
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      const response = await fetch('/api/journal?unreadCount=true')
      const data = await response.json()
      if (data.success && data.data) {
        setUnreadCount(data.data.unreadCount)
        setJournalUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error("[TaskJournalDialog] Failed to delete group:", error)
    }
  }

  const handleClearAll = async () => {
    try {
      await fetch('/api/journal?all=true', { method: 'DELETE' })
      setEntries([])
      setExpandedGroups(new Set())
      setUnreadCount(0)
      setJournalUnreadCount(0)
    } catch (error) {
      console.error("[TaskJournalDialog] Failed to clear all:", error)
    }
  }

  const toggleGroup = (itemId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      entry.itemTitle.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      (entry.errorMessage && entry.errorMessage.toLowerCase().includes(q))
    )
  })

  const groupedJournals: GroupedJournals = {}
  for (const entry of filteredEntries) {
    if (!groupedJournals[entry.itemId]) {
      groupedJournals[entry.itemId] = {
        itemTitle: entry.itemTitle,
        entries: [],
      }
    }
    groupedJournals[entry.itemId]!.entries.push(entry)
  }

  const successCount = filteredEntries.filter(e => e.status === 'success').length
  const failedCount = filteredEntries.filter(e => e.status === 'failed').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("title")}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {successCount}
            </span>
            <span className="flex items-center gap-1 ml-2">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              {failedCount}
            </span>
          </div>
          {entries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive h-8"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  {t("clearAll")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("clearAllConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("clearAllConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t("clearAll")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1 flex flex-col min-h-0 px-6">
          <TabsList className="w-full justify-start h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-3">
              {t("all")}
            </TabsTrigger>
            <TabsTrigger value="success" className="text-xs h-6 px-3">
              {t("success")}
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs h-6 px-3">
              {t("failed")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[50vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  {t("loading")}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">{t("empty")}</p>
                </div>
              ) : (
                <div className="space-y-2 pr-3">
                  {Object.entries(groupedJournals).map(([itemId, group]) => {
                    const isExpanded = expandedGroups.has(itemId)
                    const hasUnread = group.entries.some(e => !e.read)
                    const groupSuccessCount = group.entries.filter(e => e.status === 'success').length
                    const groupFailedCount = group.entries.filter(e => e.status === 'failed').length

                    return (
                      <div key={itemId} className="group rounded-lg border bg-card">
                        <div className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
                          <button
                            onClick={() => toggleGroup(itemId)}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm truncate">
                              {group.itemTitle}
                            </span>
                          </button>
                          {hasUnread && (
                            <span className="flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {groupSuccessCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {groupSuccessCount}
                              </Badge>
                            )}
                            {groupFailedCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {groupFailedCount}
                              </Badge>
                            )}
                            <span className="text-[10px]">{t("totalCount", { count: group.entries.length })}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteGroup(itemId)
                            }}
                            title={t("deleteGroup")}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="border-t">
                            {group.entries.map((entry) => (
                              <JournalEntryItem
                                key={entry.id}
                                entry={entry}
                                t={t}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function JournalEntryItem({
  entry,
  t,
}: {
  entry: TaskJournal
  t: TFunction<"journal">
}) {
  const [showDetails, setShowDetails] = useState(false)

  let dataPreview: { csvLength?: number; cleanedLength?: number; episodeCount?: number; autoImport?: boolean } | null = null
  if (entry.dataPreview) {
    try {
      dataPreview = JSON.parse(entry.dataPreview)
    } catch {}
  }

  return (
    <div className={`px-4 py-3 border-b last:border-b-0 ${!entry.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {entry.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entry.content}</span>
            {entry.status === 'failed' && entry.errorMessage && (
              <span className="text-xs text-red-500 truncate max-w-[200px]" title={entry.errorMessage}>
                {entry.errorMessage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(entry.startAt)}
            </span>
            {entry.endAt && (
              <span>{formatDuration(entry.startAt, entry.endAt)}</span>
            )}
            {entry.tmdbUrl && (
              <a
                href={entry.tmdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
                title={t("viewOnTMDB")}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                TMDB
              </a>
            )}
          </div>
          {entry.status === 'failed' && entry.errorMessage && entry.errorMessage.length > 50 && (
            <div className="mt-1.5 text-xs text-red-500/80 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1 break-all">
              {entry.errorMessage}
            </div>
          )}
          {dataPreview && entry.status === 'success' && (
            <div className="mt-1.5">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                {showDetails ? t("hideDetails") : t("showDetails")}
              </button>
              {showDetails && (
                <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
                  {dataPreview.episodeCount !== undefined && (
                    <div>{t("episodeCount")}: {dataPreview.episodeCount}</div>
                  )}
                  {dataPreview.csvLength !== undefined && (
                    <div>{t("csvLength")}: {dataPreview.csvLength}</div>
                  )}
                  {dataPreview.cleanedLength !== undefined && (
                    <div>{t("cleanedLength")}: {dataPreview.cleanedLength}</div>
                  )}
                  {dataPreview.autoImport !== undefined && (
                    <div>{t("autoImport")}: {dataPreview.autoImport ? t("yes") : t("no")}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
