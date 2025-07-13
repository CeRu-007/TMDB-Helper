"use client"

/**
 * 布局偏好设置管理器
 * 负责保存和读取用户的布局偏好设置
 */

export type LayoutType = 'original' | 'sidebar'

// 布局显示名称映射
export const LAYOUT_NAMES = {
  original: '标签页布局',
  sidebar: '侧边栏布局'
} as const

export interface LayoutPreferences {
  layoutType: LayoutType
  sidebarCollapsed?: boolean
  lastUpdated: string
}

export class LayoutPreferencesManager {
  private static readonly STORAGE_KEY = "tmdb_helper_layout_preferences"
  
  /**
   * 检查当前环境是否为客户端
   */
  static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  /**
   * 获取布局偏好设置
   */
  static getPreferences(): LayoutPreferences {
    if (!this.isClient()) {
      return this.getDefaultPreferences()
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) {
        return this.getDefaultPreferences()
      }

      const preferences = JSON.parse(data) as LayoutPreferences
      
      // 验证数据完整性
      if (!preferences.layoutType || !preferences.lastUpdated) {
        return this.getDefaultPreferences()
      }

      return preferences
    } catch (error) {
      console.error("Failed to load layout preferences:", error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * 保存布局偏好设置
   */
  static savePreferences(preferences: Partial<LayoutPreferences>): boolean {
    if (!this.isClient()) {
      console.warn("Cannot save layout preferences: not in client environment")
      return false
    }

    try {
      const currentPreferences = this.getPreferences()
      const updatedPreferences: LayoutPreferences = {
        ...currentPreferences,
        ...preferences,
        lastUpdated: new Date().toISOString()
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPreferences))
      return true
    } catch (error) {
      console.error("Failed to save layout preferences:", error)
      return false
    }
  }

  /**
   * 获取默认布局偏好设置
   * 默认使用标签页布局（original）
   */
  static getDefaultPreferences(): LayoutPreferences {
    return {
      layoutType: 'original', // 标签页布局作为默认布局
      sidebarCollapsed: false,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * 切换布局类型
   */
  static toggleLayout(): LayoutType {
    const currentPreferences = this.getPreferences()
    const newLayoutType: LayoutType = currentPreferences.layoutType === 'original' ? 'sidebar' : 'original'
    
    this.savePreferences({ layoutType: newLayoutType })
    return newLayoutType
  }

  /**
   * 设置侧边栏折叠状态
   */
  static setSidebarCollapsed(collapsed: boolean): boolean {
    return this.savePreferences({ sidebarCollapsed: collapsed })
  }

  /**
   * 重置为默认设置
   */
  static resetToDefault(): boolean {
    if (!this.isClient()) {
      return false
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error("Failed to reset layout preferences:", error)
      return false
    }
  }
}
