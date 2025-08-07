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
    return typeof window !== 'undefined'
  }

  /**
   * 获取布局偏好设置（现在使用服务端存储）
   */
  static async getPreferences(): Promise<LayoutPreferences> {
    if (!this.isClient()) {
      return this.getDefaultPreferences()
    }

    try {
      const response = await fetch('/api/config?key=layout_preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.value) {
          const preferences = JSON.parse(data.value) as LayoutPreferences;

          // 验证数据完整性
          if (!preferences.layoutType || !preferences.lastUpdated) {
            return this.getDefaultPreferences()
          }

          return preferences;
        }
      }

      return this.getDefaultPreferences()
    } catch (error) {
      console.error("Failed to load layout preferences:", error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * 保存布局偏好设置
   */
  static async savePreferences(preferences: Partial<LayoutPreferences>): Promise<boolean> {
    if (!this.isClient()) {
      console.warn("Cannot save layout preferences: not in client environment")
      return false
    }

    try {
      const currentPreferences = await this.getPreferences()
      const updatedPreferences: LayoutPreferences = {
        ...currentPreferences,
        ...preferences,
        lastUpdated: new Date().toISOString()
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key: 'layout_preferences',
          value: JSON.stringify(updatedPreferences)
        })
      });

      return response.ok;
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
  static async toggleLayout(): Promise<LayoutType> {
    const currentPreferences = await this.getPreferences()
    const newLayoutType: LayoutType = currentPreferences.layoutType === 'original' ? 'sidebar' : 'original'

    await this.savePreferences({ layoutType: newLayoutType })
    return newLayoutType
  }

  /**
   * 设置侧边栏折叠状态
   */
  static async setSidebarCollapsed(collapsed: boolean): Promise<boolean> {
    return await this.savePreferences({ sidebarCollapsed: collapsed })
  }

  /**
   * 重置为默认设置
   */
  static async resetToDefault(): Promise<boolean> {
    if (!this.isClient()) {
      return false
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key: 'layout_preferences',
          value: JSON.stringify(this.getDefaultPreferences())
        })
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to reset layout preferences:", error)
      return false
    }
  }
}
