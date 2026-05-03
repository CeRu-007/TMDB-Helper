import React, { useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { UserAvatar } from "@/shared/components/user-identity-provider"
import { Settings, Plus, Sun, Moon, PanelLeftClose, PanelLeftOpen, Bell, BarChart3 } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { useTranslation } from "react-i18next"

import { useUIStore } from "@/stores/ui-store"
import { realtimeSyncManager } from "@/lib/data/realtime-sync-manager"

interface AppHeaderProps {
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  onShowSettingsDialog: (section?: string) => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  onShowAddDialog: () => void
  onShowJournalDialog: () => void
  onShowDashboard: () => void
}

export function AppHeader({
  sidebarCollapsed,
  onSidebarToggle,
  onShowSettingsDialog,
  onShowImportDialog,
  onShowExportDialog,
  onShowAddDialog,
  onShowJournalDialog,
  onShowDashboard
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation(["settings", "dashboard"])
  const journalUnreadCount = useUIStore((s) => s.journalUnreadCount)
  const setJournalUnreadCount = useUIStore((s) => s.setJournalUnreadCount)

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/journal?unreadCount=true')
      const data = await response.json()
      if (data.success && data.data) {
        setJournalUnreadCount(data.data.unreadCount)
      }
    } catch {}
  }

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  useEffect(() => {
    const handleJournalUpdate = () => {
      fetchUnreadCount()
    }
    realtimeSyncManager.addEventListener('journal_updated', handleJournalUpdate)
    realtimeSyncManager.addEventListener('journal_read', handleJournalUpdate)
    return () => {
      realtimeSyncManager.removeEventListener('journal_updated', handleJournalUpdate)
      realtimeSyncManager.removeEventListener('journal_read', handleJournalUpdate)
    }
  }, [])

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
      <div className="relative h-16">
        <div className="flex items-center h-full pl-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="mr-3"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div className="group">
            <Image
              src="/tmdb-helper-logo.png"
              alt="TMDB维护助手"
              width={160}
              height={60}
              className="h-14 w-auto object-contain transform group-hover:scale-105 transition duration-300"
              priority
            />
          </div>
        </div>

        <div className={`absolute inset-y-0 right-0 ${sidebarCollapsed ? 'left-16' : 'left-64'} pointer-events-none`}>
          <div className="h-full max-w-7xl w-full mx-auto px-8 pr-9 flex items-center justify-end pointer-events-auto">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onShowDashboard}
                title={t("dashboard:title")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowJournalDialog}
                className="flex items-center relative"
                title={t("journal.title", { ns: "journal" })}
              >
                <Bell className="h-4 w-4" />
                {journalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-0.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 min-w-4 bg-blue-500 text-white text-[9px] font-bold leading-none items-center justify-center">
                      {journalUnreadCount > 99 ? '99+' : journalUnreadCount}
                    </span>
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onShowSettingsDialog()} className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>{t("settings.settings")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center"
                title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <UserAvatar
                onShowImportDialog={onShowImportDialog}
                onShowExportDialog={onShowExportDialog}
              />

              <Button
                onClick={onShowAddDialog}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>{t("addItem", { ns: "nav.maintenance" })}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
