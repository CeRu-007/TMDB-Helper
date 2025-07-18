/**
 * 乐观更新管理器
 * 负责处理乐观更新逻辑，提供即时的UI反馈
 */

import { TMDBItem, ScheduledTask } from './storage'

export type OptimisticOperation = {
  id: string
  type: 'add' | 'update' | 'delete'
  entity: 'item' | 'task'
  data: any
  originalData?: any
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed' | 'retrying'
  retryCount?: number
  maxRetries?: number
  lastError?: string
}

export type OptimisticUpdateListener = (operations: OptimisticOperation[]) => void

class OptimisticUpdateManager {
  private static instance: OptimisticUpdateManager
  private pendingOperations: Map<string, OptimisticOperation> = new Map()
  private listeners: Set<OptimisticUpdateListener> = new Set()
  private operationTimeout = 30000 // 30秒超时（增加到30秒）
  private retryDelays = [1000, 2000, 5000] // 重试延迟：1秒、2秒、5秒
  private maxRetries = 3 // 最大重试次数
  private timeoutHandlers: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {}

  public static getInstance(): OptimisticUpdateManager {
    if (!OptimisticUpdateManager.instance) {
      OptimisticUpdateManager.instance = new OptimisticUpdateManager()
    }
    return OptimisticUpdateManager.instance
  }

  /**
   * 添加乐观更新操作
   */
  public addOperation(operation: Omit<OptimisticOperation, 'id' | 'timestamp' | 'status' | 'retryCount' | 'maxRetries'>): string {
    const operationId = `${operation.type}_${operation.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullOperation: OptimisticOperation = {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: this.maxRetries
    }

    this.pendingOperations.set(operationId, fullOperation)
    console.log(`[OptimisticUpdate] 添加乐观更新操作: ${operationId}`, fullOperation)

    // 设置超时处理
    this.setOperationTimeout(operationId)

    this.notifyListeners()
    return operationId
  }

  /**
   * 设置操作超时
   */
  private setOperationTimeout(operationId: string): void {
    // 清除之前的超时处理器
    const existingTimeout = this.timeoutHandlers.get(operationId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const timeoutHandler = setTimeout(() => {
      if (this.pendingOperations.has(operationId)) {
        console.warn(`[OptimisticUpdate] 操作超时: ${operationId}`)
        this.handleOperationTimeout(operationId)
      }
    }, this.operationTimeout)

    this.timeoutHandlers.set(operationId, timeoutHandler)
  }

  /**
   * 处理操作超时
   */
  private handleOperationTimeout(operationId: string): void {
    const operation = this.pendingOperations.get(operationId)
    if (!operation) return

    const retryCount = operation.retryCount || 0
    const maxRetries = operation.maxRetries || this.maxRetries

    if (retryCount < maxRetries) {
      // 尝试重试
      this.retryOperation(operationId)
    } else {
      // 达到最大重试次数，标记为失败
      this.failOperation(operationId, `操作超时，已重试 ${retryCount} 次`)
    }
  }

  /**
   * 重试操作
   */
  private retryOperation(operationId: string): void {
    const operation = this.pendingOperations.get(operationId)
    if (!operation) return

    const retryCount = (operation.retryCount || 0) + 1
    const retryDelay = this.retryDelays[Math.min(retryCount - 1, this.retryDelays.length - 1)]

    operation.status = 'retrying'
    operation.retryCount = retryCount
    operation.lastError = '操作超时，正在重试...'

    console.log(`[OptimisticUpdate] 重试操作 ${operationId}，第 ${retryCount} 次，延迟 ${retryDelay}ms`)

    this.notifyListeners()

    // 延迟后重新设置为pending状态并重新开始超时计时
    setTimeout(() => {
      if (this.pendingOperations.has(operationId)) {
        operation.status = 'pending'
        this.setOperationTimeout(operationId)
        this.notifyListeners()
      }
    }, retryDelay)
  }

  /**
   * 确认操作成功
   */
  public confirmOperation(operationId: string, actualData?: any): void {
    const operation = this.pendingOperations.get(operationId)
    if (operation) {
      // 清除超时处理器
      const timeoutHandler = this.timeoutHandlers.get(operationId)
      if (timeoutHandler) {
        clearTimeout(timeoutHandler)
        this.timeoutHandlers.delete(operationId)
      }

      operation.status = 'confirmed'
      if (actualData) {
        operation.data = actualData
      }
      console.log(`[OptimisticUpdate] 确认操作成功: ${operationId}`)

      // 延迟移除已确认的操作，给UI一些时间来处理
      setTimeout(() => {
        this.pendingOperations.delete(operationId)
        this.notifyListeners()
      }, 100)
    }
  }

  /**
   * 标记操作失败
   */
  public failOperation(operationId: string, error: string): void {
    const operation = this.pendingOperations.get(operationId)
    if (operation) {
      // 清除超时处理器
      const timeoutHandler = this.timeoutHandlers.get(operationId)
      if (timeoutHandler) {
        clearTimeout(timeoutHandler)
        this.timeoutHandlers.delete(operationId)
      }

      operation.status = 'failed'
      operation.lastError = error
      console.error(`[OptimisticUpdate] 操作失败: ${operationId}, 错误: ${error}`)

      // 失败的操作保留更长时间，以便UI显示错误状态
      setTimeout(() => {
        this.pendingOperations.delete(operationId)
        this.notifyListeners()
      }, 5000) // 增加到5秒，给用户更多时间看到错误信息

      this.notifyListeners()
    }
  }

  /**
   * 获取所有待处理的操作
   */
  public getPendingOperations(): OptimisticOperation[] {
    return Array.from(this.pendingOperations.values())
  }

  /**
   * 获取特定实体的待处理操作
   */
  public getPendingOperationsForEntity(entity: 'item' | 'task', entityId?: string): OptimisticOperation[] {
    return this.getPendingOperations().filter(op => {
      if (op.entity !== entity) return false
      if (entityId && op.data.id !== entityId) return false
      return true
    })
  }

  /**
   * 应用乐观更新到数据集合
   */
  public applyOptimisticUpdates<T extends { id: string }>(
    originalData: T[],
    entity: 'item' | 'task'
  ): T[] {
    let result = [...originalData]
    const operations = this.getPendingOperationsForEntity(entity)

    for (const operation of operations) {
      switch (operation.type) {
        case 'add':
          // 检查是否已存在（避免重复添加）
          if (!result.find(item => item.id === operation.data.id)) {
            result.push(operation.data)
          }
          break

        case 'update':
          const updateIndex = result.findIndex(item => item.id === operation.data.id)
          if (updateIndex !== -1) {
            result[updateIndex] = { ...result[updateIndex], ...operation.data }
          }
          break

        case 'delete':
          result = result.filter(item => item.id !== operation.data.id)
          break
      }
    }

    return result
  }

  /**
   * 添加监听器
   */
  public addListener(listener: OptimisticUpdateListener): void {
    this.listeners.add(listener)
    console.log('[OptimisticUpdate] 添加监听器')
  }

  /**
   * 移除监听器
   */
  public removeListener(listener: OptimisticUpdateListener): void {
    this.listeners.delete(listener)
    console.log('[OptimisticUpdate] 移除监听器')
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const operations = this.getPendingOperations()
    this.listeners.forEach(listener => {
      try {
        listener(operations)
      } catch (error) {
        console.error('[OptimisticUpdate] 监听器执行失败:', error)
      }
    })
  }

  /**
   * 手动重试失败的操作
   */
  public retryFailedOperation(operationId: string): boolean {
    const operation = this.pendingOperations.get(operationId)
    if (!operation || operation.status !== 'failed') {
      return false
    }

    // 重置重试计数并重新开始
    operation.retryCount = 0
    operation.status = 'pending'
    operation.lastError = undefined

    console.log(`[OptimisticUpdate] 手动重试操作: ${operationId}`)

    this.setOperationTimeout(operationId)
    this.notifyListeners()

    return true
  }

  /**
   * 取消操作
   */
  public cancelOperation(operationId: string): boolean {
    const operation = this.pendingOperations.get(operationId)
    if (!operation) {
      return false
    }

    // 清除超时处理器
    const timeoutHandler = this.timeoutHandlers.get(operationId)
    if (timeoutHandler) {
      clearTimeout(timeoutHandler)
      this.timeoutHandlers.delete(operationId)
    }

    this.pendingOperations.delete(operationId)
    console.log(`[OptimisticUpdate] 取消操作: ${operationId}`)

    this.notifyListeners()
    return true
  }

  /**
   * 清理所有操作
   */
  public clear(): void {
    // 清除所有超时处理器
    this.timeoutHandlers.forEach(handler => clearTimeout(handler))
    this.timeoutHandlers.clear()

    this.pendingOperations.clear()
    this.notifyListeners()
    console.log('[OptimisticUpdate] 清理所有待处理操作')
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    total: number
    pending: number
    confirmed: number
    failed: number
    retrying: number
    avgRetryCount: number
  } {
    const operations = this.getPendingOperations()
    const retryingOps = operations.filter(op => op.status === 'retrying')
    const totalRetries = operations.reduce((sum, op) => sum + (op.retryCount || 0), 0)

    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      confirmed: operations.filter(op => op.status === 'confirmed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      retrying: retryingOps.length,
      avgRetryCount: operations.length > 0 ? totalRetries / operations.length : 0
    }
  }

  /**
   * 获取详细的操作信息
   */
  public getOperationDetails(operationId: string): OptimisticOperation | null {
    return this.pendingOperations.get(operationId) || null
  }

  /**
   * 设置超时时间
   */
  public setOperationTimeout(timeout: number): void {
    this.operationTimeout = timeout
    console.log(`[OptimisticUpdate] 更新操作超时时间为: ${timeout}ms`)
  }

  /**
   * 设置重试配置
   */
  public setRetryConfig(maxRetries: number, retryDelays: number[]): void {
    this.maxRetries = maxRetries
    this.retryDelays = retryDelays
    console.log(`[OptimisticUpdate] 更新重试配置: maxRetries=${maxRetries}, delays=${retryDelays}`)
  }
}

export const optimisticUpdateManager = OptimisticUpdateManager.getInstance()