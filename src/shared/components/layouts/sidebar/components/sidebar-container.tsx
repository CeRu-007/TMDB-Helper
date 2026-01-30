import React from "react"
import { SidebarNavigation } from "@/shared/components/layouts/sidebar-navigation"

interface SidebarContainerProps {
  collapsed: boolean
  onMenuSelect: (menuId: string, submenuId?: string) => void
  activeMenu: string
  activeSubmenu: string
}

export function SidebarContainer({
  collapsed,
  onMenuSelect,
  activeMenu,
  activeSubmenu
}: SidebarContainerProps) {
  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 relative z-30 `}>
      <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r dark:border-gray-700 overflow-hidden">
        <SidebarNavigation
          onMenuSelect={onMenuSelect}
          activeMenu={activeMenu}
          activeSubmenu={activeSubmenu}
          collapsed={collapsed}
        />
      </div>
    </div>
  )
}