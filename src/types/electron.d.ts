/**
 * Electron API 类型定义
 * 定义了从主进程暴露到渲染进程的安全 API
 */

export interface ElectronAPI {
  // 应用信息
  getAppDataPath: () => Promise<string>
  getAppVersion: () => Promise<string>

  // 窗口控制
  minimizeWindow: () => void
  maximizeWindow: () => void
  unmaximizeWindow: () => void
  closeWindow: () => void
  isMaximized: () => Promise<boolean>

  // 菜单事件监听
  onMenuImportData: (callback: () => void) => void
  onMenuExportData: (callback: () => void) => void

  // 窗口事件监听
  onWindowResize: (callback: (size: WindowSize) => void) => void
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => void

  // 事件监听器管理
  removeAllListeners: (channel: string) => void

  // 平台信息
  platform: 'win32' | 'darwin' | 'linux'
  isElectron: true
}

/**
 * 窗口尺寸接口
 */
export interface WindowSize {
  width: number
  height: number
}

/**
 * 平台类型
 */
export type Platform = 'win32' | 'darwin' | 'linux'

/**
 * 扩展全局 Window 接口
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI
    isElectronApp?: boolean
  }
}

export {}