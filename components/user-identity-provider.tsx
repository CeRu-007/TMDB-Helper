"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react"
import { createPortal } from "react-dom"
import ImportDataDialog from "./import-data-dialog"
import ExportDataDialog from "./export-data-dialog"
import { UserManager, UserInfo } from "@/lib/user-manager"
import { useAuth } from "@/components/auth-provider"
import { useIsClient } from "@/hooks/use-is-client"
import { useData } from "@/components/client-data-provider"
import { useTheme } from "next-themes"
import {
  User,
  Settings,
  BarChart3,
  Download,
  Upload,
  Palette,
  HelpCircle,
  Info,
  LogOut,
  Edit3,
  Calendar,
  Database,
  ChevronDown,
  LayoutGrid,
  Sidebar
} from "lucide-react"
import { LayoutPreferencesManager, type LayoutType, LAYOUT_NAMES } from "@/lib/layout-preferences"
import { useToast } from "@/hooks/use-toast"

/**
 * 用户身份提供者组件
 * 管理用户身份识别和会话状态
 */

interface UserContextType {
  userInfo: UserInfo | null
  isLoading: boolean
  isInitialized: boolean
  updateDisplayName: (name: string) => Promise<boolean>
  updateAvatarUrl: (avatarUrl: string) => Promise<boolean>
  resetUser: () => void
  refreshUserInfo: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserIdentityProvider")
  }
  return context
}

export function UserIdentityProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user: authUser } = useAuth()
  const isClient = useIsClient()

  // 初始化用户身份
  const initializeUser = async () => {
    if (!isClient) return

    setIsLoading(true)

    try {
      // 设置管理员用户ID（用于认证系统）
      UserManager.setAdminUserId()

      // 验证现有会话
      const isValidSession = UserManager.validateSession()

      if (isValidSession) {
        // 获取用户信息
        const info = UserManager.getUserInfo()
        // 如果有认证用户信息，使用认证用户的显示名称
        if (authUser) {
          info.displayName = authUser.username
        }
        setUserInfo(info)
        console.log(`[UserIdentity] 用户会话有效: ${info.userId}`)
      } else {
        // 创建新用户会话
        const info = UserManager.getUserInfo()
        // 如果有认证用户信息，使用认证用户的显示名称
        if (authUser) {
          info.displayName = authUser.username
        }
        setUserInfo(info)
        console.log(`[UserIdentity] 创建新用户会话: ${info.userId}`)
      }

      // 调用服务器端API确保用户ID同步
      try {
        const response = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[UserIdentity] 服务器端用户ID同步: ${data.userId}`)
        }
      } catch (apiError) {
        console.warn('[UserIdentity] 服务器端用户ID同步失败:', apiError)
        // 不影响客户端功能，继续执行
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('[UserIdentity] 用户身份初始化失败:', error)
      // 即使出错也要设置为已初始化，避免无限加载
      setIsInitialized(true)
    } finally {
      setIsLoading(false)
    }
  }

  // 当客户端准备好时初始化用户
  useEffect(() => {
    if (isClient) {
      initializeUser()
    }
  }, [isClient])

  // 更新用户显示名称
  const updateDisplayName = async (name: string): Promise<boolean> => {
    if (!isClient || !userInfo) return false

    try {
      const success = UserManager.updateDisplayName(name)

      if (success) {
        // 更新本地状态
        const updatedInfo = UserManager.getUserInfo()
        setUserInfo(updatedInfo)

        // 同步到服务器
        try {
          await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              displayName: name,
              userId: updatedInfo.userId
            }),
          })
        } catch (apiError) {
          console.warn('[UserIdentity] 服务器端用户信息同步失败:', apiError)
        }

        return true
      }

      return false
    } catch (error) {
      console.error('[UserIdentity] 更新用户显示名称失败:', error)
      return false
    }
  }

  // 更新用户头像URL
  const updateAvatarUrl = async (avatarUrl: string): Promise<boolean> => {
    if (!isClient || !userInfo) return false

    try {
      const success = UserManager.updateAvatarUrl(avatarUrl)

      if (success) {
        // 更新本地状态
        const updatedInfo = UserManager.getUserInfo()
        setUserInfo(updatedInfo)

        // 同步到服务器
        try {
          await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              avatarUrl: avatarUrl,
              userId: updatedInfo.userId
            }),
          })
        } catch (apiError) {
          console.warn('[UserIdentity] 服务器端头像信息同步失败:', apiError)
        }

        return true
      }

      return false
    } catch (error) {
      console.error('[UserIdentity] 更新用户头像失败:', error)
      return false
    }
  }

  // 重置用户（清除所有数据）
  const resetUser = () => {
    if (!isClient) return

    try {
      UserManager.clearUserData()
      
      // 调用服务器端API清除会话
      fetch('/api/user', {
        method: 'DELETE',
        credentials: 'include',
      }).catch(error => {
        console.warn('[UserIdentity] 服务器端会话清除失败:', error)
      })

      // 重新初始化
      setTimeout(() => {
        initializeUser()
      }, 100)
    } catch (error) {
      console.error('[UserIdentity] 重置用户失败:', error)
    }
  }

  // 刷新用户信息
  const refreshUserInfo = () => {
    if (!isClient) return

    try {
      const info = UserManager.getUserInfo()
      setUserInfo(info)
    } catch (error) {
      console.error('[UserIdentity] 刷新用户信息失败:', error)
    }
  }

  const contextValue: UserContextType = {
    userInfo,
    isLoading,
    isInitialized,
    updateDisplayName,
    updateAvatarUrl,
    resetUser,
    refreshUserInfo
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * 用户头像组件 - 用于导航栏显示（下拉菜单版本）
 */
export function UserAvatar({
  onShowImportDialog,
  onShowExportDialog,
  onLayoutChange,
  currentLayout
}: {
  onShowImportDialog?: () => void
  onShowExportDialog?: () => void
  onLayoutChange?: (layout: LayoutType) => void
  currentLayout?: LayoutType
} = {}) {
  const { userInfo, isLoading } = useUser()
  const { logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // 键盘导航支持
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDropdown(false)
      } else if (event.key === 'ArrowDown' && !showDropdown) {
        // 按下箭头键时打开菜单
        event.preventDefault()
        setShowDropdown(true)
      }
    }

    if (showDropdown) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDropdown])

  if (isLoading || !userInfo) {
    return (
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        data-user-avatar-button="true"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 transition-colors focus:outline-none"
        title={`${userInfo.displayName} (${userInfo.userId.substring(5, 11)})`}
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        {userInfo.avatarUrl ? (
          <img
            src={userInfo.avatarUrl}
            alt={userInfo.displayName}
            className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
            onError={(e) => {
              // 如果图片加载失败，显示默认头像
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium shadow-sm ring-2 ring-white dark:ring-gray-800 ${userInfo.avatarUrl ? 'hidden' : ''}`}
        >
          {userInfo.displayName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
          {userInfo.displayName}
        </span>
        <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* 桌面端下拉菜单 */}
      {showDropdown && (
        <>
          <div className="hidden md:block">
            <UserDropdownMenu
              ref={dropdownRef}
              onClose={() => setShowDropdown(false)}
              triggerElement={buttonRef.current || undefined}
              onShowImportDialog={onShowImportDialog}
              onShowExportDialog={onShowExportDialog}
              onLayoutChange={onLayoutChange}
              currentLayout={currentLayout}
            />
          </div>

          {/* 移动端抽屉菜单 */}
          <div className="md:hidden">
            <MobileUserDrawer onClose={() => setShowDropdown(false)} />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 用户下拉菜单组件
 */
const UserDropdownMenu = React.forwardRef<HTMLDivElement, {
  onClose: () => void;
  triggerElement?: HTMLElement;
  onShowImportDialog?: () => void;
  onShowExportDialog?: () => void;
  onLayoutChange?: (layout: LayoutType) => void;
  currentLayout?: LayoutType;
}>(
  ({ onClose, triggerElement, onShowImportDialog, onShowExportDialog, onLayoutChange, currentLayout }, ref) => {
    const { toast } = useToast()
    const { userInfo, updateDisplayName, resetUser } = useUser()
    const { items } = useData()
    const { theme, setTheme } = useTheme()
    const { logout } = useAuth()
    const [showProfileEdit, setShowProfileEdit] = useState(false)
    const [showDataStats, setShowDataStats] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [showExportDialog, setShowExportDialog] = useState(false)
    const [isSidebarLayout, setIsSidebarLayout] = useState(false)
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    // 确保组件已挂载（用于Portal）
    useEffect(() => {
      setMounted(true)
    }, [])

    // 检测是否为侧边栏布局并计算菜单位置
    useEffect(() => {
      const detectLayoutAndPosition = () => {
        const sidebarElement = document.querySelector('[data-sidebar-layout]')
        const isInSidebar = !!sidebarElement
        setIsSidebarLayout(isInSidebar)

        // 使用传入的triggerElement或查找按钮元素
        const button = triggerElement || document.querySelector('[data-user-avatar-button]')
        if (button) {
          const rect = button.getBoundingClientRect()
          setMenuPosition({
            top: rect.bottom + 8, // 按钮下方8px
            right: window.innerWidth - rect.right // 右对齐
          })
        }
      }

      detectLayoutAndPosition()

      // 监听DOM变化和窗口大小变化
      const observer = new MutationObserver(detectLayoutAndPosition)
      observer.observe(document.body, { childList: true, subtree: true })

      window.addEventListener('resize', detectLayoutAndPosition)
      window.addEventListener('scroll', detectLayoutAndPosition)

      return () => {
        observer.disconnect()
        window.removeEventListener('resize', detectLayoutAndPosition)
        window.removeEventListener('scroll', detectLayoutAndPosition)
      }
    }, [triggerElement])

    if (!userInfo || !mounted) return null

    const handleExportData = () => {
      if (onShowExportDialog) {
        onShowExportDialog()
      } else {
        setShowExportDialog(true)
      }
      onClose() // 关闭用户下拉菜单
    }

    const handleImportData = () => {
      if (onShowImportDialog) {
        onShowImportDialog()
      } else {
        setShowImportDialog(true)
      }
      onClose() // 关闭用户下拉菜单
    }

    const handleThemeToggle = () => {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    // 处理布局切换
    const handleLayoutToggle = async () => {
      if (!onLayoutChange || !currentLayout) return

      const targetLayout: LayoutType = currentLayout === 'original' ? 'sidebar' : 'original'

      try {
        // 保存布局偏好
        const success = LayoutPreferencesManager.savePreferences({
          layoutType: targetLayout
        })

        if (success) {
          onLayoutChange(targetLayout)

          toast({
            title: "布局已切换",
            description: `已切换到${LAYOUT_NAMES[targetLayout]}`,
            duration: 2000
          })
        } else {
          throw new Error("保存布局偏好失败")
        }
      } catch (error) {
        console.error("Layout change failed:", error)
        toast({
          title: "切换失败",
          description: "布局切换失败，请重试",
          variant: "destructive",
          duration: 3000
        })
      }

      onClose()
    }

    const handleReset = () => {
      if (confirm('确定要重置用户数据吗？这将清除所有本地数据并创建新的用户ID。此操作无法撤销！')) {
        resetUser()
        onClose()
      }
    }

    // 根据布局模式决定定位方式和样式
    const positionStyle = menuPosition ? {
      position: 'fixed' as const,
      top: `${menuPosition.top}px`,
      right: `${menuPosition.right}px`,
      left: 'auto',
      zIndex: 2147483647 // 使用最大z-index值
    } : {
      position: 'absolute' as const,
      right: 0,
      top: '100%',
      marginTop: '8px'
    }

    const containerClasses = "w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border dark:border-gray-700 py-2 animate-in slide-in-from-top-2 duration-200"

    const menuContent = (
      <div
        ref={ref}
        data-dropdown-menu="true"
        data-layout={isSidebarLayout ? "sidebar" : "default"}
        className={containerClasses}
        style={{
          ...positionStyle,
          isolation: 'isolate',
          transform: 'translateZ(0)',
          willChange: 'transform',
          contain: 'layout style paint'
        }}
      >
        {/* 箭头指示器 */}
        <div className="absolute -top-2 right-4 w-4 h-4 bg-white dark:bg-gray-900 border-l border-t dark:border-gray-700 rotate-45"></div>

        {/* 用户信息头部 */}
        <div className="px-4 py-3 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {userInfo.avatarUrl ? (
              <img
                src={userInfo.avatarUrl}
                alt={userInfo.displayName}
                className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
                onError={(e) => {
                  // 如果图片加载失败，显示默认头像
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-lg font-medium shadow-sm ${userInfo.avatarUrl ? 'hidden' : ''}`}>
              {userInfo.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {userInfo.displayName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                ID: {userInfo.userId.substring(5, 11)}
              </p>
            </div>
          </div>
        </div>

        {/* 菜单项 */}
        <div className="py-1">
          {/* 个人资料 */}
          <button
            onClick={() => setShowProfileEdit(!showProfileEdit)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <User className="w-4 h-4 mr-3" />
            个人资料
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showProfileEdit ? 'rotate-180' : ''}`} />
          </button>

          {showProfileEdit && (
            <ProfileEditSection
              userInfo={userInfo}
              updateDisplayName={updateDisplayName}
              onClose={() => setShowProfileEdit(false)}
            />
          )}

          {/* 数据统计 */}
          <button
            onClick={() => setShowDataStats(!showDataStats)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-3" />
            数据统计
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showDataStats ? 'rotate-180' : ''}`} />
          </button>

          {showDataStats && (
            <DataStatsSection
              userInfo={userInfo}
              items={items || []}
            />
          )}
        </div>

        <div className="border-t dark:border-gray-700 py-1">
          {/* 导出数据 */}
          <button
            onClick={handleExportData}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4 mr-3" />
            导出数据
          </button>

          {/* 导入数据 */}
          <button
            onClick={handleImportData}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload className="w-4 h-4 mr-3" />
            导入数据
          </button>

          {/* 主题切换 */}
          <button
            onClick={handleThemeToggle}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Palette className="w-4 h-4 mr-3" />
            切换主题 ({theme === 'dark' ? '深色' : '浅色'})
          </button>

          {/* 布局切换 - 仅当提供了布局切换回调和当前布局时显示 */}
          {onLayoutChange && currentLayout && (
            <button
              onClick={handleLayoutToggle}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {currentLayout === 'original' ? (
                <Sidebar className="w-4 h-4 mr-3" />
              ) : (
                <LayoutGrid className="w-4 h-4 mr-3" />
              )}
              切换到{currentLayout === 'original' ? '侧边栏布局' : '标签页布局'}
            </button>
          )}
        </div>



        <div className="border-t dark:border-gray-700 py-1">
          {/* 登出 */}
          <button
            onClick={() => {
              onClose()
              logout()
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            登出
          </button>

          {/* 重置数据 */}
          <button
            onClick={handleReset}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Database className="w-4 h-4 mr-3" />
            重置数据
          </button>
        </div>
      </div>
    )

    // 在侧边栏布局中使用Portal渲染到body，否则使用正常渲染
    if (isSidebarLayout && typeof window !== 'undefined') {
      return (
        <>
          {createPortal(menuContent, document.body)}
          <ImportDataDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
          <ExportDataDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
        </>
      )
    }

    return (
      <>
        {menuContent}
        <ImportDataDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
        <ExportDataDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      </>
    )
  }
)

UserDropdownMenu.displayName = 'UserDropdownMenu'

/**
 * 移动端用户抽屉菜单
 */
function MobileUserDrawer({ onClose }: { onClose: () => void }) {
  const { userInfo, updateDisplayName, resetUser } = useUser()
  const { items } = useData()
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()

  if (!userInfo) return null

  const handleExportData = async () => {
    try {
      const dataToExport = {
        userInfo,
        items: items || [],
        exportTime: new Date().toISOString(),
        version: "1.0"
      }

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tmdb-helper-data-${userInfo.userId.substring(5, 11)}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch (error) {
      console.error('导出数据失败:', error)
    }
  }

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleReset = () => {
    if (confirm('确定要重置用户数据吗？这将清除所有本地数据并创建新的用户ID。此操作无法撤销！')) {
      resetUser()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100000]" data-user-drawer="true">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉内容 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-xl shadow-xl border-t dark:border-gray-700 animate-in slide-in-from-bottom duration-300">
        {/* 拖拽指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* 用户信息头部 */}
        <div className="px-4 py-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-lg font-medium shadow-sm">
              {userInfo.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                {userInfo.displayName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                ID: {userInfo.userId.substring(5, 11)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 菜单项 */}
        <div className="px-4 py-2 max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {/* 数据统计 */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{items?.length || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">项目数量</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {Math.floor((new Date().getTime() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">使用天数</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 功能按钮 */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 mr-3" />
              导出数据
            </button>

            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Palette className="w-5 h-5 mr-3" />
              切换主题 ({theme === 'dark' ? '深色' : '浅色'})
            </button>



            <div className="border-t dark:border-gray-700 pt-2 mt-2">
              {/* 登出 */}
              <button
                onClick={() => {
                  onClose()
                  logout()
                }}
                className="w-full flex items-center px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mb-2"
              >
                <LogOut className="w-5 h-5 mr-3" />
                登出
              </button>

              {/* 重置数据 */}
              <button
                onClick={handleReset}
                className="w-full flex items-center px-3 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Database className="w-5 h-5 mr-3" />
                重置数据
              </button>
            </div>
          </div>
        </div>

        {/* 底部安全区域 */}
        <div className="h-4 sm:h-6"></div>
      </div>
    </div>
  )
}

/**
 * 个人资料编辑区域
 */
function ProfileEditSection({
  userInfo,
  updateDisplayName,
  onClose
}: {
  userInfo: UserInfo
  updateDisplayName: (name: string) => Promise<boolean>
  onClose: () => void
}) {
  const { updateAvatarUrl } = useUser()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(userInfo.displayName)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [newAvatarUrl, setNewAvatarUrl] = useState(userInfo.avatarUrl || '')

  const handleSave = async () => {
    if (newName.trim() && newName !== userInfo.displayName) {
      const success = await updateDisplayName(newName.trim())
      if (success) {
        setIsEditing(false)
        onClose()
      }
    } else {
      setIsEditing(false)
    }
  }

  const handleAvatarSave = async () => {
    // 验证URL格式
    if (newAvatarUrl.trim() && !isValidUrl(newAvatarUrl.trim())) {
      toast({
        title: "无效的URL",
        description: "请输入有效的图片网络地址",
        variant: "destructive",
      })
      return
    }

    const success = await updateAvatarUrl(newAvatarUrl.trim())
    if (success) {
      setIsEditingAvatar(false)
      toast({
        title: "头像更新成功",
        description: "您的头像已更新",
      })
    } else {
      toast({
        title: "头像更新失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    }
  }

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (_) {
      return false
    }
  }

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-blue-500 mx-4 mb-2 rounded">
      <div className="space-y-3">
        {/* 头像设置区域 */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {userInfo.avatarUrl ? (
              <img
                src={userInfo.avatarUrl}
                alt={userInfo.displayName}
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium shadow-sm ring-2 ring-white dark:ring-gray-800 ${userInfo.avatarUrl ? 'hidden' : ''}`}
            >
              {userInfo.displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {isEditingAvatar ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="输入头像图片网络地址 (http://... 或 https://...)"
                  onKeyPress={(e) => e.key === 'Enter' && handleAvatarSave()}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAvatarSave}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAvatar(false)
                      setNewAvatarUrl(userInfo.avatarUrl || '')
                    }}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    取消
                  </button>
                  {userInfo.avatarUrl && (
                    <button
                      onClick={async () => {
                        const success = await updateAvatarUrl('')
                        if (success) {
                          setIsEditingAvatar(false)
                          setNewAvatarUrl('')
                          toast({
                            title: "头像已移除",
                            description: "已恢复默认头像",
                          })
                        }
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="text-gray-600 dark:text-gray-400">头像</div>
                  <div className="text-gray-500 dark:text-gray-500">
                    {userInfo.avatarUrl ? '自定义头像' : '默认头像'}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingAvatar(true)}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>设置</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 显示名称设置区域 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">显示名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="输入显示名称"
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setNewName(userInfo.displayName)
                  }}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <div className="text-gray-600 dark:text-gray-400">显示名称</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{userInfo.displayName}</div>
                <div className="text-gray-500 dark:text-gray-400">创建于 {new Date(userInfo.createdAt).toLocaleDateString()}</div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center space-x-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>编辑</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 数据统计区域
 */
function DataStatsSection({
  userInfo,
  items
}: {
  userInfo: UserInfo
  items: any[]
}) {
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  const stats = userInfo.stats || {
    loginCount: 1,
    totalUsageTime: 0,
    lastSessionStart: new Date().toISOString(),
    featuresUsed: []
  }

  const formatUsageTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}`
  }

  return (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-green-500 mx-4 mb-2 rounded">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-3 h-3 text-blue-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{items.length}</div>
            <div className="text-gray-500 dark:text-gray-400">项目数量</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-3 h-3 text-green-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{daysSinceCreation}</div>
            <div className="text-gray-500 dark:text-gray-400">使用天数</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <User className="w-3 h-3 text-purple-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{stats.loginCount}</div>
            <div className="text-gray-500 dark:text-gray-400">登录次数</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-3 h-3 text-orange-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{formatUsageTime(stats.totalUsageTime)}</div>
            <div className="text-gray-500 dark:text-gray-400">使用时长</div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div>最后活跃: {new Date(userInfo.lastActiveAt).toLocaleString()}</div>
        {stats.featuresUsed.length > 0 && (
          <div className="mt-1">
            已使用功能: {stats.featuresUsed.slice(0, 3).join(', ')}
            {stats.featuresUsed.length > 3 && ` 等${stats.featuresUsed.length}项`}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 用户资料对话框 - 保持向后兼容
 * @deprecated 请使用 UserDropdownMenu
 */
function UserProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { userInfo, updateDisplayName, resetUser } = useUser()
  const { items } = useData()
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (userInfo && open) {
      setNewName(userInfo.displayName)
    }
  }, [userInfo, open])

  const handleSaveName = async () => {
    if (newName.trim() && userInfo) {
      const success = await updateDisplayName(newName.trim())
      if (success) {
        setIsEditing(false)
      }
    }
  }

  const handleReset = async () => {
    if (confirm('确定要重置用户数据吗？这将清除所有本地数据并创建新的用户ID。此操作无法撤销！')) {
      setIsResetting(true)
      try {
        resetUser()
        onOpenChange(false)
      } catch (error) {
        console.error('重置用户数据失败:', error)
      } finally {
        setIsResetting(false)
      }
    }
  }

  if (!userInfo) return null

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* 对话框 */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border dark:border-gray-700 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              个人资料
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 用户头像和基本信息 */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-medium shadow-lg">
              {userInfo.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="输入显示名称"
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveName}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {userInfo.displayName}
                    </h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      编辑
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {userInfo.userId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 账户信息 */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">账户信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">创建时间:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(userInfo.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">最后活跃:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(userInfo.lastActiveAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">数据项目数:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {items?.length || 0} 个
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 order-2 sm:order-1"
            >
              {isResetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>重置中...</span>
                </>
              ) : (
                <span>重置用户数据</span>
              )}
            </button>

            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 order-1 sm:order-2"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 用户信息显示组件 - 保持向后兼容
 * @deprecated 请使用 UserAvatar 组件
 */
export function UserInfoDisplay() {
  return <UserAvatar />
}
