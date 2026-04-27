import React from "react"
import { Button } from "@/shared/components/ui/button"
import { UserAvatar } from "@/shared/components/user-identity-provider"
import { Settings, Plus, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { useUpdateCheck } from "@/lib/hooks/use-update-check"

interface AppHeaderProps {
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  onShowSettingsDialog: (section?: string) => void
  onShowImportDialog: () => void
  onShowExportDialog: () => void
  onShowAddDialog: () => void
}

export function AppHeader({
  sidebarCollapsed,
  onSidebarToggle,
  onShowSettingsDialog,
  onShowImportDialog,
  onShowExportDialog,
  onShowAddDialog
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation("settings")
  const { hasUpdate } = useUpdateCheck()

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
              <Button variant="outline" size="sm" onClick={() => onShowSettingsDialog()} className="flex items-center space-x-2 relative">
                <Settings className="h-4 w-4" />
                <span>{t("settings.settings")}</span>
                {hasUpdate && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
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
                <span>{t("addItem", { ns: "nav.maintenance" })}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}