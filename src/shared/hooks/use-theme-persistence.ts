"use client"

import { useEffect, useCallback, useRef } from "react"
import { useTheme } from "next-themes"
import { ClientConfigManager } from "@/lib/utils/client-config-manager"
import { safeJsonParse } from "@/lib/utils"
import { logger } from "@/lib/utils/logger"

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  showAnimations: boolean
  showTooltips: boolean
  detailBackdropBlurEnabled?: boolean
  detailBackdropBlurIntensity?: 'light' | 'medium' | 'heavy'
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'system',
  primaryColor: 'blue',
  compactMode: false,
  fontSize: 'medium',
  showAnimations: true,
  showTooltips: true,
  detailBackdropBlurEnabled: true,
  detailBackdropBlurIntensity: 'medium',
}

const APPEARANCE_KEY = "appearance_settings"

/**
 * 统一的主题持久化 Hook
 *
 * 职责：
 * 1. 应用启动时从数据库加载外观设置，同步到 next-themes
 * 2. 监听 next-themes 的主题变化，保存到数据库
 * 3. 提供 applyAppearanceSettings 函数用于应用非主题类的外观设置（字体大小、主色等）
 *
 * 设计原则：next-themes 是主题的唯一来源，数据库是持久化的唯一来源
 */
export function useThemePersistence() {
  const { theme, setTheme } = useTheme()
  const hasLoadedFromServer = useRef(false)
  const isSyncingToServer = useRef(false)
  const lastSyncedTheme = useRef<string | undefined>(undefined)

  // 应用非主题类的外观设置（字体大小、主色、紧凑模式、动画等）
  const applyNonThemeSettings = useCallback((settings: AppearanceSettings) => {
    const root = document.documentElement

    root.setAttribute('data-primary-color', settings.primaryColor)

    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizeMap[settings.fontSize]

    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

    if (!settings.showAnimations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }
  }, [])

  // 从数据库加载外观设置并同步到 next-themes
  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasLoadedFromServer.current) return

    const loadAndSync = async () => {
      try {
        const saved = await ClientConfigManager.getItem(APPEARANCE_KEY)
        if (!saved) {
          hasLoadedFromServer.current = true
          lastSyncedTheme.current = DEFAULT_APPEARANCE.theme
          applyNonThemeSettings(DEFAULT_APPEARANCE)
          return
        }

        const parsed = safeJsonParse<AppearanceSettings>(saved)
        if (!parsed) {
          hasLoadedFromServer.current = true
          lastSyncedTheme.current = DEFAULT_APPEARANCE.theme
          applyNonThemeSettings(DEFAULT_APPEARANCE)
          return
        }

        const merged: AppearanceSettings = { ...DEFAULT_APPEARANCE, ...parsed }

        // 记录即将同步的主题，避免初始化时触发不必要的保存
        lastSyncedTheme.current = merged.theme

        // 同步主题到 next-themes（这会同时更新 localStorage 和 DOM）
        // 只有在 next-themes 已经初始化后才同步，避免 hydration 不匹配
        if (merged.theme !== theme) {
          setTheme(merged.theme)
        }

        // 应用非主题设置
        applyNonThemeSettings(merged)

        hasLoadedFromServer.current = true
      } catch (error) {
        logger.warn('加载外观设置失败:', error)
        hasLoadedFromServer.current = true
        applyNonThemeSettings(DEFAULT_APPEARANCE)
      }
    }

    loadAndSync()
  }, [setTheme, theme, applyNonThemeSettings])

  // 监听 next-themes 的主题变化，保存到数据库
  // 注意：只在用户手动切换主题时保存，避免初始化时的重复保存
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasLoadedFromServer.current) return
    if (isSyncingToServer.current) return
    if (!theme) return

    // 如果这是初始化时同步的主题，跳过保存
    if (theme === lastSyncedTheme.current) {
      lastSyncedTheme.current = undefined
      return
    }

    const syncToServer = async () => {
      isSyncingToServer.current = true
      try {
        const saved = await ClientConfigManager.getItem(APPEARANCE_KEY)
        const parsed = safeJsonParse<AppearanceSettings>(saved) || DEFAULT_APPEARANCE

        // 只有当主题真的变化了才保存
        if (parsed.theme !== theme) {
          const updated = { ...parsed, theme: theme as 'light' | 'dark' | 'system' }
          await ClientConfigManager.setItem(APPEARANCE_KEY, JSON.stringify(updated))
        }
      } catch (error) {
        logger.warn('同步主题到数据库失败:', error)
      } finally {
        isSyncingToServer.current = false
      }
    }

    syncToServer()
  }, [theme])

  // 保存完整外观设置到数据库（供 SettingsDialog 使用）
  const saveAppearanceSettings = useCallback(async (settings: AppearanceSettings) => {
    try {
      await ClientConfigManager.setItem(APPEARANCE_KEY, JSON.stringify(settings))

      // 同步主题到 next-themes
      if (settings.theme !== theme) {
        setTheme(settings.theme)
      }

      // 应用非主题设置
      applyNonThemeSettings(settings)

      return true
    } catch (error) {
      logger.error('保存外观设置失败:', error)
      return false
    }
  }, [theme, setTheme, applyNonThemeSettings])

  return {
    saveAppearanceSettings,
    applyNonThemeSettings,
    hasLoadedFromServer: hasLoadedFromServer.current,
  }
}
