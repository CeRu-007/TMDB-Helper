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
import { useTranslation } from "react-i18next"

interface SettingsMenuProps {
  activeSection: string
  onSectionChange: (section: string) => void
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

export function SettingsMenu({ activeSection, onSectionChange }: SettingsMenuProps) {
  const { t } = useTranslation('settings')

  return (
    <div className="sm:w-64 border-b sm:border-r bg-gray-50/50 dark:bg-gray-900/50 max-sm:overflow-visible overflow-x-auto sm:overflow-x-visible">
      <div className="flex flex-col p-2 sm:p-4 gap-1 sm:space-y-1 sm:w-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`
                flex items-center gap-2 sm:gap-3 p-3 sm:p-3 rounded-lg text-left transition-colors w-full
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 ring-1 ring-transparent'
                }
              `}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t(item.labelKey)}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:block">{t(item.descKey)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
