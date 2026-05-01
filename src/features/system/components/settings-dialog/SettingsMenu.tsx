/**
 * 设置对话框的左侧导航菜单
 */

import {
  Database,
  Terminal,
  Film,
  Settings,
  Shield,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { useTranslation } from "react-i18next"

interface SettingsMenuProps {
  activeSection: string
  onSectionChange: (section: string) => void
  hasUpdate?: boolean
}

interface MenuItem {
  id: string
  labelKey: string
  descKey: string
  icon: React.ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
  {
    id: "model-service",
    labelKey: "menu.modelService",
    descKey: "menu.modelServiceDesc",
    icon: Database,
  },
  {
    id: "tools",
    labelKey: "menu.tools",
    descKey: "menu.toolsDesc",
    icon: Terminal,
  },
  {
    id: "video-thumbnail",
    labelKey: "menu.videoThumbnail",
    descKey: "menu.videoThumbnailDesc",
    icon: Film,
  },
  {
    id: "general",
    labelKey: "menu.general",
    descKey: "menu.generalDesc",
    icon: Settings,
  },
  {
    id: "security",
    labelKey: "menu.security",
    descKey: "menu.securityDesc",
    icon: Shield,
  },
  {
    id: "help",
    labelKey: "menu.help",
    descKey: "menu.helpDesc",
    icon: HelpCircle,
  }
]

export function SettingsMenu({ activeSection, onSectionChange, hasUpdate }: SettingsMenuProps) {
  const { t } = useTranslation('settings')

  return (
    <div className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const showUpdateBadge = item.id === 'help' && hasUpdate

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`
                  w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 ring-1 ring-transparent'
                  }
                `}
              >
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{t(item.labelKey)}</div>
                    {showUpdateBadge && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t(item.descKey)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
