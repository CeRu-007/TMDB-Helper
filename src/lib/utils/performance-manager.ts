/**
 * 性能管理和内存优化工具
 * 提供内存泄漏检测、资源清理和性能监控
 */

import { logger } from '@/lib/utils/logger'

export interface PerformanceMetrics {
  memoryUsage?: MemoryInfo
  renderTime?: number
  apiResponseTime?: number
  componentMountTime?: number
  timestamp: string
}

export interface ResourceCleanup {
  id: string
  type: 'timer' | 'listener' | 'subscription' | 'worker' | 'other'
  cleanup: () => void
  created: string
}

export class PerformanceManager {
  private static instance: PerformanceManager
  private cleanupTasks: Map<string, ResourceCleanup> = new Map()
  private performanceMetrics: PerformanceMetrics[] = []
  private maxMetrics = 100
  private timers: Map<string, number> = new Map()

  private constructor() {
    // 监听页面卸载事件，清理所有资源
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanupAll()
      })
    }
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager()
    }
    return PerformanceManager.instance
  }

  /**
   * 注册需要清理的资源
   */
  registerCleanup(
    id: string,
    type: ResourceCleanup['type'],
    cleanup: () => void
  ): void {
    if (this.cleanupTasks.has(id)) {
      logger.warn('PerformanceManager', `资源 ${id} 已存在，将被覆盖`)
      this.cleanup(id)
    }

    this.cleanupTasks.set(id, {
      id,
      type,
      cleanup,
      created: new Date().toISOString()
    })

    logger.debug('PerformanceManager', `注册清理任务: ${id} (${type})`)
  }

  /**
   * 清理指定资源
   */
  cleanup(id: string): boolean {
    const task = this.cleanupTasks.get(id)
    if (!task) {
      return false
    }

    try {
      task.cleanup()
      this.cleanupTasks.delete(id)
      logger.debug('PerformanceManager', `清理资源: ${id}`)
      return true
    } catch (error) {
      logger.error('PerformanceManager', `清理资源失败: ${id}`, error)
      return false
    }
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): void {
    logger.info('PerformanceManager', `开始清理 ${this.cleanupTasks.size} 个资源`)
    
    let successCount = 0
    let errorCount = 0

    for (const [id, task] of this.cleanupTasks) {
      try {
        task.cleanup()
        successCount++
      } catch (error) {
        errorCount++
        logger.error('PerformanceManager', `清理资源失败: ${id}`, error)
      }
    }

    this.cleanupTasks.clear()
    logger.info('PerformanceManager', `资源清理完成: 成功 ${successCount}, 失败 ${errorCount}`)
  }

  /**
   * 安全的setTimeout，自动注册清理
   */
  setTimeout(callback: () => void, delay: number, id?: string): string {
    const taskId = id || `timeout_${Date.now()}_${Math.random()}`
    
    const timerId = window.setTimeout(() => {
      try {
        callback()
      } finally {
        this.cleanup(taskId)
      }
    }, delay)

    this.registerCleanup(taskId, 'timer', () => {
      clearTimeout(timerId)
    })

    return taskId
  }

  /**
   * 安全的setInterval，自动注册清理
   */
  setInterval(callback: () => void, interval: number, id?: string): string {
    const taskId = id || `interval_${Date.now()}_${Math.random()}`
    
    const timerId = window.setInterval(callback, interval)

    this.registerCleanup(taskId, 'timer', () => {
      clearInterval(timerId)
    })

    return taskId
  }

  /**
   * 安全的事件监听器，自动注册清理
   */
  addEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | Element,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
    id?: string
  ): string {
    const taskId = id || `listener_${type}_${Date.now()}_${Math.random()}`
    
    target.addEventListener(type as string, listener as EventListener, options)

    this.registerCleanup(taskId, 'listener', () => {
      target.removeEventListener(type as string, listener as EventListener, options)
    })

    return taskId
  }

  /**
   * 性能计时开始
   */
  startTiming(label: string): void {
    this.timers.set(label, performance.now())
    logger.debug('PerformanceManager', `开始计时: ${label}`)
  }

  /**
   * 性能计时结束
   */
  endTiming(label: string): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(label)
    
    logger.debug('PerformanceManager', `计时结束: ${label} - ${duration.toFixed(2)}ms`)
    return duration
  }

  /**
   * 记录性能指标
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    }

    // 添加内存使用信息（如果可用）
    if (typeof window !== 'undefined' && 'memory' in performance) {
      fullMetrics.memoryUsage = (performance as any).memory
    }

    this.performanceMetrics.push(fullMetrics)
    
    // 限制指标数量
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics.shift()
    }

    logger.debug('PerformanceManager', '记录性能指标', fullMetrics)
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  /**
   * 内存使用检查
   */
  checkMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return
    }

    const memory = (performance as any).memory
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)

    logger.info('PerformanceManager', `内存使用: ${usedMB}MB / ${totalMB}MB (限制: ${limitMB}MB)`)

    // 内存使用警告
    const usagePercent = (usedMB / limitMB) * 100
    if (usagePercent > 80) {
      logger.warn('PerformanceManager', `内存使用率过高: ${usagePercent.toFixed(1)}%`)
    }
  }

  /**
   * 获取清理任务统计
   */
  getCleanupStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {}
    
    for (const task of this.cleanupTasks.values()) {
      byType[task.type] = (byType[task.type] || 0) + 1
    }

    return {
      total: this.cleanupTasks.size,
      byType
    }
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number,
    id?: string
  ): (...args: Parameters<T>) => void {
    let timeoutId: string | null = null
    
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        this.cleanup(timeoutId)
      }
      
      timeoutId = this.setTimeout(() => {
        func(...args)
        timeoutId = null
      }, delay, id)
    }
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0
    
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        func(...args)
      }
    }
  }
}

// 导出单例实例
export const performanceManager = PerformanceManager.getInstance()

// 便捷方法
export const perf = {
  registerCleanup: (id: string, type: ResourceCleanup['type'], cleanup: () => void) => 
    performanceManager.registerCleanup(id, type, cleanup),
  cleanup: (id: string) => performanceManager.cleanup(id),
  cleanupAll: () => performanceManager.cleanupAll(),
  setTimeout: (callback: () => void, delay: number, id?: string) => 
    performanceManager.setTimeout(callback, delay, id),
  setInterval: (callback: () => void, interval: number, id?: string) => 
    performanceManager.setInterval(callback, interval, id),
  addEventListener: <K extends keyof WindowEventMap>(
    target: Window | Document | Element,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
    id?: string
  ) => performanceManager.addEventListener(target, type, listener, options, id),
  startTiming: (label: string) => performanceManager.startTiming(label),
  endTiming: (label: string) => performanceManager.endTiming(label),
  recordMetrics: (metrics: Partial<PerformanceMetrics>) => performanceManager.recordMetrics(metrics),
  checkMemory: () => performanceManager.checkMemoryUsage(),
  debounce: <T extends (...args: unknown[]) => unknown>(func: T, delay: number, id?: string) => 
    performanceManager.debounce(func, delay, id),
  throttle: <T extends (...args: unknown[]) => unknown>(func: T, delay: number) => 
    performanceManager.throttle(func, delay)
}