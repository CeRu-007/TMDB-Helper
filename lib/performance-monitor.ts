/**
 * 性能监控器
 * 监控实时同步系统的性能指标
 */

interface PerformanceMetrics {
  connectionLatency: number
  messageProcessingTime: number
  optimisticUpdateTime: number
  dataLoadTime: number
  errorRate: number
  reconnectionCount: number
  lastUpdated: number
}

interface PerformanceEvent {
  type: 'connection' | 'message' | 'optimistic' | 'data_load' | 'error' | 'reconnection'
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics = {
    connectionLatency: 0,
    messageProcessingTime: 0,
    optimisticUpdateTime: 0,
    dataLoadTime: 0,
    errorRate: 0,
    reconnectionCount: 0,
    lastUpdated: Date.now()
  }
  private events: PerformanceEvent[] = []
  private maxEvents = 1000 // 最多保留1000个事件
  private isMonitoring = false

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * 开始监控
   */
  public startMonitoring(): void {
    this.isMonitoring = true
    console.log('[PerformanceMonitor] 开始性能监控')
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    this.isMonitoring = false
    console.log('[PerformanceMonitor] 停止性能监控')
  }

  /**
   * 记录事件开始
   */
  public startEvent(type: PerformanceEvent['type']): string {
    if (!this.isMonitoring) return ''
    
    const eventId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const event: PerformanceEvent = {
      type,
      startTime: performance.now(),
      success: false
    }
    
    this.events.push(event)
    
    // 限制事件数量
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
    
    return eventId
  }

  /**
   * 记录事件结束
   */
  public endEvent(eventId: string, success: boolean = true, error?: string): void {
    if (!this.isMonitoring || !eventId) return
    
    const event = this.events.find(e => 
      `${e.type}_${e.startTime}_${eventId.split('_')[2]}` === eventId
    )
    
    if (event) {
      event.endTime = performance.now()
      event.duration = event.endTime - event.startTime
      event.success = success
      event.error = error
      
      // 更新指标
      this.updateMetrics(event)
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(event: PerformanceEvent): void {
    if (!event.duration) return
    
    const now = Date.now()
    const timeSinceLastUpdate = now - this.metrics.lastUpdated
    const alpha = Math.min(timeSinceLastUpdate / 10000, 1) // 10秒的衰减因子
    
    switch (event.type) {
      case 'connection':
        this.metrics.connectionLatency = this.exponentialMovingAverage(
          this.metrics.connectionLatency,
          event.duration,
          alpha
        )
        if (!event.success) {
          this.metrics.reconnectionCount++
        }
        break
        
      case 'message':
        this.metrics.messageProcessingTime = this.exponentialMovingAverage(
          this.metrics.messageProcessingTime,
          event.duration,
          alpha
        )
        break
        
      case 'optimistic':
        this.metrics.optimisticUpdateTime = this.exponentialMovingAverage(
          this.metrics.optimisticUpdateTime,
          event.duration,
          alpha
        )
        break
        
      case 'data_load':
        this.metrics.dataLoadTime = this.exponentialMovingAverage(
          this.metrics.dataLoadTime,
          event.duration,
          alpha
        )
        break
        
      case 'error':
        this.updateErrorRate(!event.success)
        break
    }
    
    this.metrics.lastUpdated = now
  }

  /**
   * 指数移动平均
   */
  private exponentialMovingAverage(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current
  }

  /**
   * 更新错误率
   */
  private updateErrorRate(hasError: boolean): void {
    const recentEvents = this.events.slice(-100) // 最近100个事件
    const errorCount = recentEvents.filter(e => !e.success).length
    this.metrics.errorRate = errorCount / recentEvents.length
  }

  /**
   * 获取性能指标
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    metrics: PerformanceMetrics
    recommendations: string[]
    healthScore: number
  } {
    const metrics = this.getMetrics()
    const recommendations: string[] = []
    let healthScore = 100

    // 连接延迟检查
    if (metrics.connectionLatency > 1000) {
      recommendations.push('连接延迟较高，建议检查网络连接')
      healthScore -= 20
    }

    // 消息处理时间检查
    if (metrics.messageProcessingTime > 100) {
      recommendations.push('消息处理时间较长，建议优化数据处理逻辑')
      healthScore -= 15
    }

    // 乐观更新时间检查
    if (metrics.optimisticUpdateTime > 50) {
      recommendations.push('乐观更新响应较慢，建议优化UI更新逻辑')
      healthScore -= 10
    }

    // 数据加载时间检查
    if (metrics.dataLoadTime > 2000) {
      recommendations.push('数据加载时间较长，建议优化数据获取策略')
      healthScore -= 15
    }

    // 错误率检查
    if (metrics.errorRate > 0.1) {
      recommendations.push('错误率较高，建议检查系统稳定性')
      healthScore -= 25
    }

    // 重连次数检查
    if (metrics.reconnectionCount > 5) {
      recommendations.push('频繁重连，建议检查网络稳定性')
      healthScore -= 15
    }

    return {
      metrics,
      recommendations,
      healthScore: Math.max(0, healthScore)
    }
  }

  /**
   * 清理旧事件
   */
  public cleanup(): void {
    const oneHourAgo = performance.now() - 3600000 // 1小时前
    this.events = this.events.filter(event => event.startTime > oneHourAgo)
    console.log(`[PerformanceMonitor] 清理完成，保留 ${this.events.length} 个事件`)
  }

  /**
   * 导出性能数据
   */
  public exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      events: this.events.slice(-100), // 最近100个事件
      exportTime: new Date().toISOString()
    }, null, 2)
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()