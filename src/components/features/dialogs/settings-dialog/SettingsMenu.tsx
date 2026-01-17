/**
 * 设置对话框的左侧导航菜单
 */

import {
  Database,
  Terminal,
  Film,
  Settings,
  Palette,
  Shield,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/common/button"
import { ScrollArea } from "@/components/common/scroll-area"

interface SettingsMenuProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

interface MenuItem {
  id: string
  label: string
  icon: any
  description: string
}

const menuItems: MenuItem[] = [
  {
    id: "model-service",
    label: "模型服务",
    icon: Database,
    description: "模型提供商和配置管理"
  },
  {
    id: "tools",
    label: "工具配置",
    icon: Terminal,
    description: "TMDB-Import工具设置"
  },
  {
    id: "video-thumbnail",
    label: "缩略图设置",
    icon: Film,
    description: "视频缩略图提取设置"
  },
  {
    id: "general",
    label: "通用设置",
    icon: Settings,
    description: "应用程序通用配置"
  },
  {
    id: "appearance",
    label: "外观设置",
    icon: Palette,
    description: "主题和界面设置"
  },
  {
    id: "security",
    label: "账户安全",
    icon: Shield,
    description: "密码修改和安全设置"
  },
  {
    id: "help",
    label: "帮助与支持",
    icon: HelpCircle,
    description: "帮助文档和应用信息"
  }
]

export function SettingsMenu({ activeSection, onSectionChange }: SettingsMenuProps) {
  return (
    <div className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`
                  w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-all
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.description}
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