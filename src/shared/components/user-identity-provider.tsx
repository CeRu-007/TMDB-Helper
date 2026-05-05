"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react"
import { createPortal } from "react-dom"
import ImportDataDialog from "@/features/data-management/components/import-data-dialog"
import ExportDataDialog from "@/features/data-management/components/export-data-dialog"
import { formatUserDateTime } from "@/lib/utils"
import { useAuth } from "@/shared/components/auth-provider"
import { useIsClient } from "@/lib/hooks/use-is-client"
import { useData } from "@/shared/components/client-data-provider"
import { useTheme } from "next-themes"
import {
  User,
  BarChart3,
  Download,
  Upload,
  Palette,
  LogOut,
  Edit3,
  Calendar,
  Database,
  ChevronDown
} from "lucide-react"

import { useToast } from "@/lib/hooks/use-toast"
import { UserAvatarImage } from "@/shared/components/ui/smart-avatar"
import { Globe, ChevronRight } from "lucide-react"
import { changeLanguage } from "@/lib/i18n"
import { SUPPORTED_LANGUAGES, getLanguageByCode } from "@/lib/i18n/config"
import { useTranslation } from "react-i18next"

/**
 * 用户身份提供者组件
 * 管理用户身份识别和会话状态
 */

interface UserInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  lastActiveAt: string;
  loginCount: number;
  totalUsageTime: number;
}

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

  useEffect(() => {
    if (!isClient) return

    const init = async () => {
      setIsLoading(true)
      try {
        let avatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'
        let createdAt = ''
        let lastActiveAt = ''
        let loginCount = 0
        let totalUsageTime = 0

        try {
          const res = await fetch('/api/auth/user', {
            method: 'GET',
            credentials: 'include',
          })
          const data = await res.json()
          if (data.success && data.user) {
            if (data.user.avatarUrl) {
              avatarUrl = data.user.avatarUrl
            }
            if (data.user.createdAt) {
              createdAt = data.user.createdAt
            }
            if (data.user.lastActiveAt) {
              lastActiveAt = data.user.lastActiveAt
            }
            if (typeof data.user.loginCount === 'number') {
              loginCount = data.user.loginCount
            }
            if (typeof data.user.totalUsageTime === 'number') {
              totalUsageTime = data.user.totalUsageTime
            }
          }
        } catch {}

        if (authUser) {
          setUserInfo({
            userId: authUser.id,
            displayName: authUser.username,
            avatarUrl,
            createdAt: createdAt || new Date().toISOString(),
            lastActiveAt: lastActiveAt || new Date().toISOString(),
            loginCount,
            totalUsageTime,
          })
        }
      } catch {
      } finally {
        setIsInitialized(true)
        setIsLoading(false)
      }
    }
    init()
  }, [isClient, authUser])

  // 更新用户显示名称
  const updateDisplayName = async (name: string): Promise<boolean> => {
    if (!isClient || !userInfo) return false

    try {
      setUserInfo(prev => prev ? { ...prev, displayName: name, lastActiveAt: new Date().toISOString() } : null)

      try {
        await fetch('/api/auth/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            displayName: name,
            userId: userInfo.userId
          }),
        })
      } catch (apiError) {

      }

      return true
    } catch (error) {

      return false
    }
  }

  // 更新用户头像URL
  const updateAvatarUrl = async (avatarUrl: string): Promise<boolean> => {
    if (!isClient || !userInfo) return false

    try {
      setUserInfo(prev => prev ? { ...prev, ...(avatarUrl ? { avatarUrl } : {}), lastActiveAt: new Date().toISOString() } : null)

      try {
        await fetch('/api/auth/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            avatarUrl: avatarUrl,
            userId: userInfo.userId
          }),
        })
      } catch (apiError) {

      }

      return true
    } catch (error) {

      return false
    }
  }

  // 重置用户（清除所有数据）
  const resetUser = () => {
    if (!isClient) return

    try {
      fetch('/api/auth/user', {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => {})

      setTimeout(() => {
        refreshUserInfo()
      }, 100)
    } catch (error) {

    }
  }

  const refreshUserInfo = async () => {
    if (!isClient) return

    try {
      const res = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success && data.user && authUser) {
        setUserInfo({
          userId: authUser.id,
          displayName: authUser.username,
          avatarUrl: data.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
          createdAt: data.user.createdAt || new Date().toISOString(),
          lastActiveAt: data.user.lastActiveAt || new Date().toISOString(),
          loginCount: data.user.loginCount ?? 0,
          totalUsageTime: data.user.totalUsageTime ?? 0,
        })
      }
    } catch (error) {

    }
  }

  useEffect(() => {
    if (!isClient || !userInfo) return

    const USAGE_REPORT_INTERVAL = 5 * 60 * 1000
    let sessionStart = Date.now()

    const reportUsageTime = () => {
      const elapsedMinutes = Math.floor((Date.now() - sessionStart) / (1000 * 60))
      if (elapsedMinutes > 0) {
        fetch('/api/auth/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ usageTime: elapsedMinutes }),
        }).catch(() => {})
        sessionStart = Date.now()
      }
    }

    const intervalId = setInterval(reportUsageTime, USAGE_REPORT_INTERVAL)

    const handleBeforeUnload = () => {
      reportUsageTime()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      reportUsageTime()
    }
  }, [isClient, userInfo])

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
  onShowExportDialog
}: {
  onShowImportDialog?: () => void
  onShowExportDialog?: () => void
} = {}) {
  const { userInfo, isLoading } = useUser()
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
        <UserAvatarImage
          src={userInfo.avatarUrl}
          displayName={userInfo.displayName}
          className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
          {userInfo.displayName}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <UserDropdownMenu
          ref={dropdownRef}
          onClose={() => setShowDropdown(false)}
          triggerElement={buttonRef.current || undefined}
          onShowImportDialog={onShowImportDialog}
          onShowExportDialog={onShowExportDialog}
        />
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
}>(
  ({ onClose, triggerElement, onShowImportDialog, onShowExportDialog }, ref) => {
    const { t } = useTranslation()
    const { toast } = useToast()
    const { userInfo, updateDisplayName, resetUser } = useUser()
    const { items } = useData()
    const { theme, setTheme } = useTheme()
    const { logout } = useAuth()
    const [showProfileEdit, setShowProfileEdit] = useState(false)
    const [showDataStats, setShowDataStats] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [showExportDialog, setShowExportDialog] = useState(false)
    const [showLanguageSelect, setShowLanguageSelect] = useState(false)
    const [currentLanguage, setCurrentLanguage] = useState(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("tmdb_language")
        return stored || "auto"
      }
      return "auto"
    })
    const [isSidebarLayout, setIsSidebarLayout] = useState(false)
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    // 确保组件已挂载（用于Portal）
    useEffect(() => {
      setMounted(true)
    }, [])

    // 初始化语言设置（仅更新状态，不需要改变i18n语言，因为i18n初始化时已自动解析）
    useEffect(() => {
      const stored = localStorage.getItem("tmdb_language")
      if (stored) {
        setCurrentLanguage(stored)
      }
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

    const handleLanguageChange = async (langCode: string) => {
      await changeLanguage(langCode)
      setCurrentLanguage(langCode)
      setShowLanguageSelect(false)
    }

    const getDisplayLanguage = () => {
      if (currentLanguage === "auto") {
        return "自动"
      }
      const lang = getLanguageByCode(currentLanguage)
      return lang?.nativeName || currentLanguage
    }

    const handleReset = () => {
      if (confirm(t('resetConfirm', { ns: 'user' }))) {
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
            <UserAvatarImage
              src={userInfo.avatarUrl}
              displayName={userInfo.displayName}
              className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-800"
              fallbackClassName="text-lg font-medium shadow-sm"
            />
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
            {t("profile", { ns: "user" })}
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
            {t("dataStats", { ns: "user" })}
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
            {t("exportData", { ns: "user" })}
          </button>

          {/* 导入数据 */}
          <button
            onClick={handleImportData}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Upload className="w-4 h-4 mr-3" />
            {t("importData", { ns: "user" })}
          </button>

          {/* 主题切换 */}
          <button
            onClick={handleThemeToggle}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Palette className="w-4 h-4 mr-3" />
            {t("switchTheme", { ns: "user" })} ({theme === 'dark' ? t("switchThemeDark", { ns: "user" }) : t("switchThemeLight", { ns: "user" })})
          </button>

          {/* 语言切换 */}
          <button
            onClick={() => setShowLanguageSelect(!showLanguageSelect)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Globe className="w-4 h-4 mr-3" />
            {t("language", { ns: "settings" })}: {getDisplayLanguage()}
            <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showLanguageSelect ? 'rotate-90' : ''}`} />
          </button>

          {showLanguageSelect && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-blue-500 mx-4 mb-2 rounded">
              <div className="space-y-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors ${
                      currentLanguage === lang.code
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    {currentLanguage === lang.code && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
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
            {t("logout", { ns: "user" })}
          </button>

          {/* 重置数据 */}
          <button
            onClick={handleReset}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Database className="w-4 h-4 mr-3" />
            {t("resetData", { ns: "user" })}
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
  const { t } = useTranslation()
  const { updateAvatarUrl } = useUser()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(userInfo.displayName)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [newAvatarUrl, setNewAvatarUrl] = useState(userInfo.avatarUrl || '')
  const [avatarSaveError, setAvatarSaveError] = useState('')
  const [avatarSaveSuccess, setAvatarSaveSuccess] = useState(false)

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
        title: t("invalidUrl", { ns: "user" }),
        description: t("enterValidImageUrl", { ns: "user" }),
        variant: "destructive",
      })
      return
    }

    const success = await updateAvatarUrl(newAvatarUrl.trim())
    if (success) {
      setIsEditingAvatar(false)
      toast({
        title: t("avatarUpdated", { ns: "user" }),
        description: t("avatarUpdateSuccess", { ns: "user" }),
      })
    } else {
      toast({
        title: t("avatarUpdateFailed", { ns: "user" }),
        description: t("pleaseTryAgain", { ns: "user" }),
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
          <div className="flex-shrink-0 relative">
            <UserAvatarImage
              src={isEditingAvatar && newAvatarUrl ? newAvatarUrl : userInfo.avatarUrl}
              displayName={userInfo.displayName}
              className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800"
              fallbackClassName="text-sm font-medium shadow-sm ring-2 ring-white dark:ring-gray-800"
              onError={() => {
                if (isEditingAvatar) {
                  setAvatarSaveError(t('invalidUrl', { ns: 'user' }))
                }
              }}
              onLoad={() => {
                if (isEditingAvatar) {
                  setAvatarSaveError('')
                }
              }}
            />
            {/* 加载指示器 */}
            {isEditingAvatar && newAvatarUrl && newAvatarUrl !== userInfo.avatarUrl && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isEditingAvatar ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <input
                    type="url"
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder={t('inputAvatarUrl', { ns: 'user' })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAvatarSave()}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    支持 jpg、png、gif 等格式，建议尺寸 200x200 像素
                  </div>
                  {/* 预设头像选择 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 w-full mb-1">快速选择：</div>
                    {[
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Garland',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=Fluffy',
                      'https://api.dicebear.com/7.x/identicon/svg?seed=Midnight'
                    ].map((presetUrl, index) => (
                      <button
                        key={index}
                        onClick={() => setNewAvatarUrl(presetUrl)}
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors overflow-hidden"
                        title={t('clickToUseAvatar', { ns: 'user' })}
                      >
                        <img
                          src={presetUrl}
                          alt={`预设头像 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAvatarSave}
                    disabled={!newAvatarUrl || newAvatarUrl === userInfo.avatarUrl}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAvatar(false)
                      setNewAvatarUrl(userInfo.avatarUrl || '')
                      setAvatarSaveError('')
                      setAvatarSaveSuccess(false)
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
                            title: t("avatarRemoved", { ns: 'user' }),
                            description: t("avatarRestored", { ns: 'user' }),
                          })
                        }
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      title={t('removeAvatar', { ns: 'user' })}
                    >
                      {t('removeAvatar', { ns: 'user' })}
                    </button>
                  )}
                </div>
                {avatarSaveError && (
                  <div className="text-xs text-red-500 mt-1 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{avatarSaveError}</span>
                  </div>
                )}
                {avatarSaveSuccess && (
                  <div className="text-xs text-green-500 mt-1 flex items-center space-x-1">
                    <span>✅</span>
                    <span>头像更新成功！</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="text-gray-600 dark:text-gray-400">{t('avatar', { ns: 'user' })}</div>
                  <div className="text-gray-500 dark:text-gray-500">
                    {userInfo.avatarUrl ? t('customAvatar', { ns: 'user' }) : t('defaultAvatar', { ns: 'user' })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditingAvatar(true)
                    setNewAvatarUrl(userInfo.avatarUrl || '')
                    setAvatarSaveError('')
                    setAvatarSaveSuccess(false)
                  }}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{t('settings', { ns: 'user' })}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 显示名称设置区域 */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t('displayName', { ns: 'user' })}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder={t('enterDisplayName', { ns: 'user' })}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t('save', { ns: 'user' })}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setNewName(userInfo.displayName)
                  }}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  {t('cancel', { ns: 'user' })}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <div className="text-gray-600 dark:text-gray-400">{t('displayName', { ns: 'user' })}</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{userInfo.displayName}</div>
                <div className="text-gray-500 dark:text-gray-400">{t('createdAt', { ns: 'user' })} {formatUserDateTime(userInfo.createdAt)}</div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center space-x-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{t('edit', { ns: 'user' })}</span>
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
  items: unknown[]
}) {
  const { t } = useTranslation()
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  const formatUsageTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}${t("minutes", { ns: "user" })}`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}${t("hours", { ns: "user" })}${remainingMinutes > 0 ? remainingMinutes + t("minutes", { ns: "user" }) : ''}`
  }

  return (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-green-500 mx-4 mb-2 rounded">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-3 h-3 text-blue-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{items.length}</div>
            <div className="text-gray-500 dark:text-gray-400">{t("itemCount", { ns: "user" })}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-3 h-3 text-green-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{daysSinceCreation}</div>
            <div className="text-gray-500 dark:text-gray-400">{t("usageDays", { ns: "user" })}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <User className="w-3 h-3 text-purple-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{userInfo.loginCount}</div>
            <div className="text-gray-500 dark:text-gray-400">{t("loginCount", { ns: "user" })}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-3 h-3 text-orange-500" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{formatUsageTime(userInfo.totalUsageTime)}</div>
            <div className="text-gray-500 dark:text-gray-400">{t("usageTime", { ns: "user" })}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div>{t("lastActive", { ns: "user" })}: {formatUserDateTime(userInfo.lastActiveAt)}</div>
      </div>
    </div>
  )
}


