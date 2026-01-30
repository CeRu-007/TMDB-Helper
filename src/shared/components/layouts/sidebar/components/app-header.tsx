import React from "react"
import { Button } from "@/shared/components/ui/button"
import { UserAvatar } from "@/shared/components/user-identity-provider"
import { Settings, Plus, Sun, Moon, BarChart2, AlarmClock, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { Task } from "@/types/tasks"

interface AppHeaderProps {
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  runningTasks: Task[]
  onShowExecutionLogs: () => void
  onShowTasksDialog: () => void
  onShowSettingsDialog: (section?: string) => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  onShowAddDialog: () => void
}

export function AppHeader({
  sidebarCollapsed,
  onSidebarToggle,
  runningTasks,
  onShowExecutionLogs,
  onShowTasksDialog,
  onShowSettingsDialog,
  onShowImportDialog,
  onShowExportDialog,
  onShowAddDialog
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
      <div className="relative h-16">
        {/* Left side: Sidebar toggle and Logo */}
        <div className="flex items-center h-full pl-4">
          {/* Sidebar toggle button */}
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

          {/* Logo */}
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

        {/* Right side action buttons - aligned to main content container's right edge */}
        <div className={`absolute inset-y-0 right-0 ${sidebarCollapsed ? 'left-16' : 'left-64'} pointer-events-none`}>
          <div className="h-full max-w-7xl w-full mx-auto px-8 pr-9 flex items-center justify-end pointer-events-auto">
            {/* Desktop action buttons */}
            <div className="flex items-center space-x-2">
              {runningTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowExecutionLogs}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center space-x-2"
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>执行日志 ({runningTasks.length})</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onShowTasksDialog} className="flex items-center space-x-2">
                <AlarmClock className="h-4 w-4" />
                <span>定时任务</span>
              </Button>

              <Button variant="outline" size="sm" onClick={() => onShowSettingsDialog()} className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>设置</span>
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

            {/* User avatar - displayed in sidebar layout */}
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
                <span>添加词条</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}